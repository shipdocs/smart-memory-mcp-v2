use std::env;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Server manager for Smart Memory MCP
/// 
/// This module provides functionality to:
/// 1. Check if a server is already running on the configured port
/// 2. Test if the running server is responsive
/// 3. Kill old processes and start new ones
/// 4. Provide clean shutdown
pub struct ServerManager {
    port: u16,
    host: String,
    pid_file: PathBuf,
    log_file: PathBuf,
    binary_path: PathBuf,
    db_path: PathBuf,
    config_path: PathBuf,
}

impl ServerManager {
    /// Create a new server manager with default settings
    pub fn new() -> io::Result<Self> {
        let home_dir = dirs::home_dir().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "Home directory not found")
        })?;
        
        let smart_memory_dir = home_dir.join(".smart-memory");
        
        // Create directory if it doesn't exist
        if !smart_memory_dir.exists() {
            fs::create_dir_all(&smart_memory_dir)?;
        }
        
        // Get binary path from current executable
        let binary_path = env::current_exe()?;
        
        // Get port from config file if available
        let config_path = smart_memory_dir.join("config.json");
        let port = if config_path.exists() {
            Self::get_port_from_config(&config_path).unwrap_or(50051)
        } else {
            50051
        };
        
        Ok(Self {
            port,
            host: "127.0.0.1".to_string(),
            pid_file: smart_memory_dir.join("server.pid"),
            log_file: smart_memory_dir.join("server.log"),
            binary_path,
            db_path: smart_memory_dir.join("memories.db"),
            config_path,
        })
    }
    
    /// Get port from config file
    fn get_port_from_config(config_path: &Path) -> Option<u16> {
        if let Ok(mut file) = File::open(config_path) {
            let mut contents = String::new();
            if file.read_to_string(&mut contents).is_ok() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                    if let Some(server) = json.get("server") {
                        if let Some(port) = server.get("port") {
                            if let Some(port) = port.as_u64() {
                                return Some(port as u16);
                            }
                        }
                    }
                }
            }
        }
        None
    }
    
    /// Check if server is already running
    pub fn is_server_running(&self) -> Option<u32> {
        // Check PID file first
        if self.pid_file.exists() {
            if let Ok(pid_str) = fs::read_to_string(&self.pid_file) {
                if let Ok(pid) = pid_str.trim().parse::<u32>() {
                    // Check if process is running
                    if Self::is_process_running(pid) {
                        // Verify this process is actually our server by checking if it's listening on our port
                        if self.is_process_listening_on_port(pid) {
                            return Some(pid);
                        }
                    }
                    // Clean up stale PID file if process is not running or not listening on our port
                    let _ = self.cleanup_pid_file();
                }
            }
        }
        
        // Check if port is in use
        if let Some(pid) = self.find_process_using_port() {
            // Save PID to file for future reference
            let _ = fs::write(&self.pid_file, pid.to_string());
            return Some(pid);
        }
        
        None
    }
    
    /// Check if a process is listening on our port
    fn is_process_listening_on_port(&self, pid: u32) -> bool {
        #[cfg(unix)]
        {
            // Use lsof to check if the process is listening on our port
            let output = Command::new("lsof")
                .args(&["-i", &format!(":{}", self.port), "-a", "-p", &pid.to_string()])
                .output();
                
            match output {
                Ok(output) => output.status.success() && !output.stdout.is_empty(),
                Err(_) => false
            }
        }
        
        #[cfg(windows)]
        {
            // Use netstat to check if the process is listening on our port
            let output = Command::new("netstat")
                .args(&["-ano", "-p", "TCP"])
                .output();
                
            match output {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    stdout.lines().any(|line| {
                        line.contains(&format!(":{}", self.port)) &&
                        line.contains("LISTENING") &&
                        line.split_whitespace().last().map_or(false, |s| s == pid.to_string())
                    })
                },
                Err(_) => false
            }
        }
    }
    
    /// Clean up the PID file
    pub fn cleanup_pid_file(&self) -> io::Result<()> {
        if self.pid_file.exists() {
            fs::remove_file(&self.pid_file)?;
        }
        Ok(())
    }
    
    /// Test if server is responsive
    pub fn test_server_connection(&self) -> bool {
        let addr = format!("{}:{}", self.host, self.port);
        if let Ok(addr) = addr.parse::<SocketAddr>() {
            match TcpStream::connect_timeout(&addr, Duration::from_secs(1)) {
                Ok(_) => return true,
                Err(_) => return false,
            }
        }
        false
    }
    
    /// Start the server
    pub fn start_server(&self) -> io::Result<u32> {
        // Check if server is already running
        if let Some(pid) = self.is_server_running() {
            println!("Server is already running with PID {}", pid);
            return Ok(pid);
        }
        
        // Check if port is in use by another process
        let addr = format!("{}:{}", self.host, self.port);
        if let Ok(addr) = addr.parse::<SocketAddr>() {
            match TcpStream::connect_timeout(&addr, Duration::from_millis(100)) {
                Ok(_) => {
                    return Err(io::Error::new(
                        io::ErrorKind::AddrInUse,
                        format!("Port {} is already in use by another process", self.port)
                    ));
                },
                Err(e) if e.kind() != io::ErrorKind::ConnectionRefused => {
                    return Err(e);
                },
                _ => {}
            }
        }
        
        // Ensure log directory exists
        if let Some(log_dir) = self.log_file.parent() {
            fs::create_dir_all(log_dir)?;
        }
        
        // Open log file
        let log_file = File::create(&self.log_file)?;
        
        // Start the server process
        let mut command = Command::new(&self.binary_path);
        
        // Pass VS Code PID for Windows parent process monitoring
        if cfg!(windows) {
            if let Ok(vscode_pid) = env::var("VSCODE_PID") {
                command.env("VSCODE_PID", vscode_pid);
            } else {
                // Try to find VS Code process
                if let Some(vscode_pid) = self.find_vscode_process() {
                    command.env("VSCODE_PID", vscode_pid.to_string());
                }
            }
        }
        
        command
            .env("RUST_LOG", "info")
            .env("DB_PATH", &self.db_path)
            .env("CONFIG_PATH", &self.config_path)
            .stdin(Stdio::null())
            .stdout(Stdio::from(log_file.try_clone()?))
            .stderr(Stdio::from(log_file));
        
        // Add --daemon flag to indicate this is a daemon process
        command.arg("--daemon");
        
        // Start the process
        let child = command.spawn()?;
        let pid = child.id();
        
        // Save PID to file
        fs::write(&self.pid_file, pid.to_string())?;
        
        // Wait a bit to ensure the server started
        thread::sleep(Duration::from_millis(500));
        
        // Verify the server is actually running
        if !Self::is_process_running(pid) {
            // Clean up PID file
            let _ = self.cleanup_pid_file();
            return Err(io::Error::new(
                io::ErrorKind::Other,
                "Server process failed to start"
            ));
        }
        
        // Verify the server is listening on the port
        let mut retries = 5;
        while retries > 0 {
            if self.test_server_connection() {
                return Ok(pid);
            }
            thread::sleep(Duration::from_millis(500));
            retries -= 1;
        }
        
        // If we get here, the server is running but not listening on the port
        if Self::kill_process(pid) {
            let _ = self.cleanup_pid_file();
        }
        
        Err(io::Error::new(
            io::ErrorKind::Other,
            "Server started but failed to listen on the port"
        ))
    }
    
    /// Stop the server
    pub fn stop_server(&self, pid: u32) -> bool {
        if Self::kill_process(pid) {
            // Clean up PID file
            let _ = self.cleanup_pid_file();
            
            // Wait for the port to be released
            let mut retries = 5;
            while retries > 0 {
                let addr = format!("{}:{}", self.host, self.port);
                if let Ok(addr) = addr.parse::<SocketAddr>() {
                    match TcpStream::connect_timeout(&addr, Duration::from_millis(100)) {
                        Err(e) if e.kind() == io::ErrorKind::ConnectionRefused => return true,
                        _ => {
                            thread::sleep(Duration::from_millis(500));
                            retries -= 1;
                        }
                    }
                } else {
                    return true;
                }
            }
            
            true
        } else {
            false
        }
    }
    
    /// Find VS Code process ID
    #[cfg(windows)]
    fn find_vscode_process(&self) -> Option<u32> {
        let output = Command::new("tasklist")
            .args(&["/FI", "IMAGENAME eq Code.exe", "/NH", "/FO", "CSV"])
            .output()
            .ok()?;
            
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                if let Some(pid_str) = parts[1].strip_prefix("\"").and_then(|s| s.strip_suffix("\"")) {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        return Some(pid);
                    }
                }
            }
        }
        
        None
    }
    
    #[cfg(unix)]
    fn find_vscode_process(&self) -> Option<u32> {
        let output = Command::new("ps")
            .args(&["-e", "-o", "pid,comm"])
            .output()
            .ok()?;
            
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains("code") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let Ok(pid) = parts[0].parse::<u32>() {
                        return Some(pid);
                    }
                }
            }
        }
        
        None
    }
    
    /// Restart the server
    pub fn restart_server(&self) -> io::Result<u32> {
        if let Some(pid) = self.is_server_running() {
            self.stop_server(pid);
            // Wait for the server to stop
            thread::sleep(Duration::from_secs(1));
        }
        
        self.start_server()
    }
    
    /// Check if a process is running
    #[cfg(unix)]
    fn is_process_running(pid: u32) -> bool {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;
        
        // Send signal 0 to process to check if it exists
        // We use SIGCONT which doesn't terminate the process but checks if it's alive
        signal::kill(Pid::from_raw(pid as i32), Signal::SIGCONT).is_ok()
    }
    
    #[cfg(windows)]
    fn is_process_running(pid: u32) -> bool {
        use winapi::um::handleapi::CloseHandle;
        use winapi::um::processthreadsapi::{GetExitCodeProcess, OpenProcess};
        use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, STILL_ACTIVE};
        
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_INFORMATION, 0, pid);
            if handle.is_null() {
                return false;
            }
            
            let mut exit_code = 0;
            let result = GetExitCodeProcess(handle, &mut exit_code) != 0 && exit_code == STILL_ACTIVE;
            CloseHandle(handle);
            result
        }
    }
    
    /// Kill a process
    #[cfg(unix)]
    fn kill_process(pid: u32) -> bool {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;
        
        let pid = Pid::from_raw(pid as i32);
        
        // Try SIGTERM first
        if signal::kill(pid, Signal::SIGTERM).is_ok() {
            // Wait a bit and check if it's really dead
            thread::sleep(Duration::from_secs(1));
            
            if signal::kill(pid, Signal::SIGCONT).is_ok() {
                // Process is still running, try SIGKILL
                signal::kill(pid, Signal::SIGKILL).is_ok()
            } else {
                // Process is dead
                true
            }
        } else {
            false
        }
    }
    
    #[cfg(windows)]
    fn kill_process(pid: u32) -> bool {
        use winapi::um::handleapi::CloseHandle;
        use winapi::um::processthreadsapi::OpenProcess;
        use winapi::um::winnt::PROCESS_TERMINATE;
        use winapi::um::processthreadsapi::TerminateProcess;
        
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if handle.is_null() {
                return false;
            }
            
            let result = TerminateProcess(handle, 1) != 0;
            CloseHandle(handle);
            result
        }
    }
    
    /// Find process using the port
    #[cfg(unix)]
    fn find_process_using_port(&self) -> Option<u32> {
        // Use lsof command to find process using the port
        let output = Command::new("lsof")
            .args(&["-i", &format!(":{}", self.port), "-t"])
            .output()
            .ok()?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.trim().parse::<u32>().ok()
        } else {
            None
        }
    }
    
    #[cfg(windows)]
    fn find_process_using_port(&self) -> Option<u32> {
        // Use netstat command to find process using the port
        let output = Command::new("netstat")
            .args(&["-ano"])
            .output()
            .ok()?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            // Parse netstat output to find PID
            for line in stdout.lines() {
                if line.contains(&format!(":{}", self.port)) && line.contains("LISTENING") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if let Some(pid_str) = parts.last() {
                        return pid_str.parse::<u32>().ok();
                    }
                }
            }
        }
        
        None
    }
}

/// Global shutdown flag
static SHUTDOWN_REQUESTED: AtomicBool = AtomicBool::new(false);

/// Register signal handlers for clean shutdown
pub fn register_signal_handlers() {
    // Register signal handlers for clean shutdown
    #[cfg(unix)]
    {
        use signal_hook::consts::{SIGINT, SIGTERM};
        use signal_hook::iterator::Signals;
        
        // Handle SIGTERM and SIGINT
        let mut signals = Signals::new(&[SIGTERM, SIGINT]).expect("Failed to register signal handlers");
        
        thread::spawn(move || {
            for sig in signals.forever() {
                println!("Received signal {:?}, initiating shutdown...", sig);
                SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                
                // Clean up resources
                if let Ok(manager) = ServerManager::new() {
                    if let Some(pid) = manager.is_server_running() {
                        if manager.stop_server(pid) {
                            println!("Successfully stopped server with PID {}", pid);
                        }
                    }
                    
                    // Remove PID file
                    if let Err(e) = manager.cleanup_pid_file() {
                        eprintln!("Error cleaning up PID file: {}", e);
                    }
                }
                
                // Exit the process
                std::process::exit(0);
            }
        });
    }
    
    // For Windows, we'll use a different approach with the shutdown handler process
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        use winapi::um::consoleapi::SetConsoleCtrlHandler;
        use winapi::um::wincon::CTRL_CLOSE_EVENT;
        
        unsafe {
            // Define the handler function
            extern "system" fn handler(_: u32) -> i32 {
                println!("Received shutdown signal, initiating shutdown...");
                SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                
                // Clean up resources
                if let Ok(manager) = ServerManager::new() {
                    if let Some(pid) = manager.is_server_running() {
                        if manager.stop_server(pid) {
                            println!("Successfully stopped server with PID {}", pid);
                        }
                    }
                    
                    // Remove PID file
                    if let Err(e) = manager.cleanup_pid_file() {
                        eprintln!("Error cleaning up PID file: {}", e);
                    }
                }
                
                // Return true to indicate we've handled the event
                1
            }
            
            // Register the handler
            SetConsoleCtrlHandler(Some(handler), 1);
        }
        
        // Also check for parent process termination
        if let Ok(parent_pid_str) = env::var("VSCODE_PID") {
            if let Ok(parent_pid) = parent_pid_str.parse::<u32>() {
                println!("Monitoring parent process PID: {}", parent_pid);
                
                // Spawn a thread to monitor the parent process
                thread::spawn(move || {
                    loop {
                        thread::sleep(Duration::from_secs(5));
                        
                        // Check if parent process is still running
                        if !ServerManager::is_process_running(parent_pid) {
                            println!("Parent process terminated, initiating shutdown...");
                            SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                            
                            // Clean up resources
                            if let Ok(manager) = ServerManager::new() {
                                if let Some(server_pid) = manager.is_server_running() {
                                    if manager.stop_server(server_pid) {
                                        println!("Successfully stopped server with PID {}", server_pid);
                                    }
                                }
                                
                                // Remove PID file
                                if let Err(e) = manager.cleanup_pid_file() {
                                    eprintln!("Error cleaning up PID file: {}", e);
                                }
                            }
                            
                            // Exit the process
                            std::process::exit(0);
                        }
                    }
                });
            }
        }
    }
}

/// Check if shutdown has been requested
pub fn is_shutdown_requested() -> bool {
    SHUTDOWN_REQUESTED.load(Ordering::SeqCst)
}

/// Main entry point for the server manager
pub fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("status");
    
    let manager = ServerManager::new()?;
    
    match command {
        "--daemon" => {
            // This is a daemon process, register signal handlers for clean shutdown
            register_signal_handlers();
            
            // Create a PID file if it doesn't exist
            if !manager.pid_file.exists() {
                let pid = std::process::id();
                fs::write(&manager.pid_file, pid.to_string())?;
                println!("Created PID file with PID {}", pid);
            }
            
            // Log startup information
            println!("Smart Memory MCP server started in daemon mode");
            println!("PID: {}", std::process::id());
            println!("Port: {}", manager.port);
            println!("Host: {}", manager.host);
            println!("DB Path: {}", manager.db_path.display());
            println!("Config Path: {}", manager.config_path.display());
            println!("Log File: {}", manager.log_file.display());
            println!("PID File: {}", manager.pid_file.display());
            
            // Just return and let the process run
            Ok(())
        },
        "start" => {
            // Check if port is in use by another application
            let addr = format!("{}:{}", manager.host, manager.port);
            if let Ok(addr) = addr.parse::<SocketAddr>() {
                match TcpStream::connect_timeout(&addr, Duration::from_millis(100)) {
                    Ok(_) => {
                        // Port is in use, check if it's our server
                        if let Some(pid) = manager.is_server_running() {
                            println!("Server is already running with PID {}", pid);
                            
                            // Test if it's responsive
                            if !manager.test_server_connection() {
                                println!("Server is not responsive, restarting...");
                                manager.stop_server(pid);
                                thread::sleep(Duration::from_secs(1));
                                let new_pid = manager.start_server()?;
                                println!("Started server with PID {}", new_pid);
                            }
                        } else {
                            // Port is in use by another application
                            return Err(io::Error::new(
                                io::ErrorKind::AddrInUse,
                                format!("Port {} is already in use by another application", manager.port)
                            ));
                        }
                    },
                    Err(e) if e.kind() == io::ErrorKind::ConnectionRefused => {
                        // Port is not in use, start the server
                        let pid = manager.start_server()?;
                        println!("Started server with PID {}", pid);
                    },
                    Err(e) => return Err(e),
                }
            } else {
                // Invalid address
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    format!("Invalid address: {}", addr)
                ));
            }
            
            Ok(())
        },
        "stop" => {
            if let Some(pid) = manager.is_server_running() {
                if manager.stop_server(pid) {
                    println!("Stopped server with PID {}", pid);
                } else {
                    println!("Failed to stop server with PID {}", pid);
                }
            } else {
                println!("Server is not running");
            }
            Ok(())
        },
        "restart" => {
            if let Some(pid) = manager.is_server_running() {
                println!("Stopping server with PID {}", pid);
                if !manager.stop_server(pid) {
                    println!("Warning: Failed to stop server cleanly, forcing restart");
                }
                
                // Wait for the server to stop and port to be released
                let mut retries = 10;
                while retries > 0 {
                    let addr = format!("{}:{}", manager.host, manager.port);
                    if let Ok(addr) = addr.parse::<SocketAddr>() {
                        match TcpStream::connect_timeout(&addr, Duration::from_millis(100)) {
                            Err(e) if e.kind() == io::ErrorKind::ConnectionRefused => break,
                            _ => {
                                thread::sleep(Duration::from_millis(500));
                                retries -= 1;
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
            
            // Start a new server
            let pid = manager.start_server()?;
            println!("Started server with PID {}", pid);
            Ok(())
        },
        "status" | _ => {
            if let Some(pid) = manager.is_server_running() {
                let responsive = manager.test_server_connection();
                println!("Server is running with PID {} and is {}", pid, 
                         if responsive { "responsive" } else { "not responsive" });
            } else {
                println!("Server is not running");
            }
            Ok(())
        }
    }
}

// Add this to your main.rs to integrate the server manager
pub fn integrate_server_manager() {
    let args: Vec<String> = env::args().collect();
    
    // Check if this is a server manager command
    if args.len() > 1 {
        let command = &args[1];
        if ["start", "stop", "restart", "status"].contains(&command.as_str()) {
            if let Err(err) = main() {
                eprintln!("Server manager error: {}", err);
                std::process::exit(1);
            }
            std::process::exit(0);
        }
    }
    
    // If we're here, it's not a server manager command, so continue with normal execution
}