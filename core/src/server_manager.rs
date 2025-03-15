use std::env;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

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
                        return Some(pid);
                    } else {
                        // Clean up stale PID file
                        let _ = fs::remove_file(&self.pid_file);
                    }
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
        // Ensure log directory exists
        if let Some(log_dir) = self.log_file.parent() {
            fs::create_dir_all(log_dir)?;
        }
        
        // Open log file
        let log_file = File::create(&self.log_file)?;
        
        // Start the server process
        let mut command = Command::new(&self.binary_path);
        
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
        
        Ok(pid)
    }
    
    /// Stop the server
    pub fn stop_server(&self, pid: u32) -> bool {
        if Self::kill_process(pid) {
            // Clean up PID file
            if self.pid_file.exists() {
                let _ = fs::remove_file(&self.pid_file);
            }
            true
        } else {
            false
        }
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

/// Main entry point for the server manager
pub fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("status");
    
    let manager = ServerManager::new()?;
    
    match command {
        "--daemon" => {
            // This is a daemon process, just return
            Ok(())
        },
        "start" => {
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
                let pid = manager.start_server()?;
                println!("Started server with PID {}", pid);
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
            let pid = manager.restart_server()?;
            println!("Restarted server with PID {}", pid);
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