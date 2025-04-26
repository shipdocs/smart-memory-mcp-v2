use tonic::transport::Server;
use anyhow::Result;
use tokio::signal;
use std::env;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

mod service;
mod storage;
mod server_manager;
mod logging;
mod crash_recovery;
mod version;
mod parent_process_monitor;
mod proto {
    tonic::include_proto!("smart_memory");
}

use crate::logging::LogLevel;
use crash_recovery::CrashRecoveryManager;
use version::VersionManager;
use parent_process_monitor::{start_parent_process_monitor, is_shutdown_requested, wait_for_shutdown_request};

#[tokio::main]
async fn main() -> Result<()> {
    // Get data directory
    let data_dir = env::var("DATA_DIR").unwrap_or_else(|_| {
        let home_dir = dirs::home_dir().unwrap_or_else(|| Path::new(".").to_path_buf());
        home_dir.join(".smart-memory").to_string_lossy().to_string()
    });
    let data_path = PathBuf::from(&data_dir);
    
    // Create backup directory
    let backup_dir = data_path.join("backups");
    if !backup_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&backup_dir) {
            eprintln!("Failed to create backup directory: {}", e);
        }
    }
    
    // Initialize logging system
    let log_dir = env::var("LOG_DIR").unwrap_or_else(|_| {
        data_path.join("logs").to_string_lossy().to_string()
    });
    
    let console_level = env::var("RUST_LOG")
        .map(|level| LogLevel::from_str(&level).unwrap_or(LogLevel::Info))
        .unwrap_or(LogLevel::Info);
        
    let file_level = env::var("FILE_LOG_LEVEL")
        .map(|level| LogLevel::from_str(&level).unwrap_or(LogLevel::Debug))
        .unwrap_or(LogLevel::Debug);
        
    if let Err(e) = logging::Logger::init(&log_dir, console_level, file_level) {
        eprintln!("Failed to initialize logging system: {}", e);
        // Continue anyway, we'll use standard output
    }
    
    // Initialize crash recovery system
    let mut recovery_manager = match CrashRecoveryManager::new(&data_path) {
        Ok(manager) => {
            log_info!("main", "Crash recovery system initialized");
            manager
        }
        Err(e) => {
            log_error!("main", &format!("Failed to initialize crash recovery system: {}", e));
            log_warning!("main", "Continuing without crash recovery");
            // Create a dummy manager that will be ignored
            CrashRecoveryManager::new(Path::new(".")).unwrap()
        }
    };
    
    // Initialize version manager
    let version_manager = match version::init() {
        Ok(manager) => {
            log_info!("main", &format!("Version manager initialized. Current version: {}", manager.get_current_version()));
            
            // Check for updates
            if manager.is_update_available() {
                if let Some(latest_version) = manager.get_latest_version() {
                    log_info!("main", &format!("Update available: {}", latest_version));
                }
            }
            
            manager
        }
        Err(e) => {
            log_error!("main", &format!("Failed to initialize version manager: {}", e));
            log_warning!("main", "Continuing without version management");
            // Create a dummy manager
            VersionManager::new()
        }
    };
    
    // Check for previous crashes
    if let Some(crash_state) = recovery_manager.check_previous_crash() {
        log_warning!("main", &format!(
            "Detected previous crash. Last crash: {}, Reason: {}",
            crash_state.last_crash.map(|ts| ts.to_string()).unwrap_or_else(|| "Unknown".to_string()),
            crash_state.last_crash_reason.as_deref().unwrap_or("Unknown")
        ));
        
        // Perform recovery actions
        if let Err(e) = recovery_manager.perform_recovery() {
            log_error!("main", &format!("Failed to perform crash recovery: {}", e));
        }
    }
    
    // Register shutdown hook
    recovery_manager.register_shutdown_hook();
    
    // Update recovery state
    if let Err(e) = recovery_manager.update_state("starting") {
        log_error!("main", &format!("Failed to update crash recovery state: {}", e));
    }
    
    // Check if this is a server manager command
    server_manager::integrate_server_manager();
    
    log_info!("main", "Starting Smart Memory MCP server...");
    
    let start_time = std::time::Instant::now();
    log_debug!("main", &format!("[{}ms] Initializing server...", start_time.elapsed().as_millis()));

    // Get port from environment or use default
    let port = env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(50051);
        
    let addr = format!("0.0.0.0:{}", port).parse()
        .map_err(|e| {
            log_error!("main", &format!("Failed to parse address: {}", e));
            anyhow::anyhow!("Failed to parse address: {}", e)
        })?;

    // Update recovery state with port
    let db_path = data_path.join("memories.db").to_string_lossy().to_string();
    let config_path = data_path.join("config.json").to_string_lossy().to_string();
    if let Err(e) = recovery_manager.set_paths(&db_path, &config_path, port) {
        log_error!("main", &format!("Failed to update crash recovery paths: {}", e));
    }
    
    // Initialize backup manager and create automatic backup
    let db_path_buf = data_path.join("memories.db");
    if db_path_buf.exists() {
        match storage::BackupManager::new(&backup_dir) {
            Ok(backup_manager) => {
                log_info!("main", "Backup manager initialized");
                
                // Create automatic backup
                match backup_manager.create_auto_backup(&db_path_buf) {
                    Ok(backup_path) => {
                        log_info!("main", &format!("Created automatic backup: {}", backup_path.display()));
                    }
                    Err(e) => {
                        log_warning!("main", &format!("Failed to create automatic backup: {}", e));
                    }
                }
            }
            Err(e) => {
                log_warning!("main", &format!("Failed to initialize backup manager: {}", e));
            }
        }
    } else {
        log_info!("main", "No database file found, skipping automatic backup");
    }

    log_debug!("main", &format!("[{}ms] Creating services...", start_time.elapsed().as_millis()));
    
    // Create the memory store first
    let memory_store = service::create_memory_store();
    log_info!("main", &format!("[{}ms] Memory store created successfully", start_time.elapsed().as_millis()));

    // Create the main service with the shared memory store
    let memory_service = service::create_service_with_store(memory_store.clone());
    log_info!("main", &format!("[{}ms] Memory service created successfully", start_time.elapsed().as_millis()));
    
    // Create the health check service with the shared memory store
    let health_service = service::create_health_service(Some(memory_store));
    log_info!("main", &format!("[{}ms] Health service created successfully", start_time.elapsed().as_millis()));
    
    log_debug!("main", &format!("[{}ms] Configuring server on {}...", start_time.elapsed().as_millis(), addr));
    let reflection_service = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(proto::FILE_DESCRIPTOR_SET)
        .build()
        .unwrap();

    let server = Server::builder()
        .accept_http1(true)
        .tcp_keepalive(Some(std::time::Duration::from_secs(60)))
        .tcp_nodelay(true)
        .add_service(memory_service)
        .add_service(health_service)
        .add_service(reflection_service);
    
    log_info!("main", &format!("[{}ms] Server configured, starting to serve...", start_time.elapsed().as_millis()));
    
    // Update recovery state
    if let Err(e) = recovery_manager.update_state("running") {
        log_error!("main", &format!("Failed to update crash recovery state: {}", e));
    }
    
    // Start parent process monitor
    log_info!("main", "Starting parent process monitor...");
    let parent_monitor_handle = start_parent_process_monitor();
    if parent_monitor_handle.is_some() {
        log_info!("main", "Parent process monitor started successfully");
    } else {
        log_warning!("main", "Failed to start parent process monitor, VSCode process monitoring disabled");
    }
    
    // Create a shared shutdown flag
    let shutdown_requested = Arc::new(AtomicBool::new(false));
    let shutdown_flag = shutdown_requested.clone();
    
    tokio::select! {
        result = server.serve(addr) => {
            match result {
                Ok(_) => {
                    log_info!("main", &format!("[{}ms] Server stopped gracefully", start_time.elapsed().as_millis()));
                    // Update recovery state
                    if let Err(e) = recovery_manager.update_state("stopped") {
                        log_error!("main", &format!("Failed to update crash recovery state: {}", e));
                    }
                }
                Err(e) => {
                    log_error!("main", &format!("[{}ms] Server error: {}", start_time.elapsed().as_millis(), e));
                    log_error!("main", &format!("[{}ms] Error details: {:?}", start_time.elapsed().as_millis(), e));
                    
                    // Record crash
                    if let Err(re) = recovery_manager.record_crash(&format!("Server error: {}", e)) {
                        log_error!("main", &format!("Failed to record crash: {}", re));
                    }
                    
                    return Err(anyhow::anyhow!("Server error: {}", e));
                }
            }
        }
        _ = signal::ctrl_c() => {
            log_info!("main", &format!("[{}ms] Received interrupt signal, shutting down...", start_time.elapsed().as_millis()));
            
            // Update recovery state
            if let Err(e) = recovery_manager.update_state("shutdown") {
                log_error!("main", &format!("Failed to update crash recovery state: {}", e));
            }
            
            // Set shutdown flag
            shutdown_flag.store(true, Ordering::SeqCst);
        }
        _ = async {
            // Wait for parent process monitor to request shutdown
            wait_for_shutdown_request(shutdown_flag.clone());
            Ok::<_, anyhow::Error>(())
        } => {
            log_info!("main", &format!("[{}ms] Parent process (VSCode) terminated, shutting down...", start_time.elapsed().as_millis()));
            
            // Update recovery state
            if let Err(e) = recovery_manager.update_state("parent_shutdown") {
                log_error!("main", &format!("Failed to update crash recovery state: {}", e));
            }
        }
    }
    
    // Wait for parent monitor thread to finish if it was started
    if let Some(handle) = parent_monitor_handle {
        if let Err(e) = handle.join() {
            log_error!("main", &format!("Failed to join parent monitor thread: {:?}", e));
        }
    }

    Ok(())
}
