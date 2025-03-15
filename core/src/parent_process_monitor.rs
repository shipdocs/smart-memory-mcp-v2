use std::env;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

#[cfg(unix)]
use nix::sys::signal::{kill, Signal};
#[cfg(unix)]
use nix::unistd::Pid;

/// Flag to indicate if shutdown has been requested
pub static SHUTDOWN_REQUESTED: AtomicBool = AtomicBool::new(false);

/// Monitor the parent process (VSCode) and initiate shutdown if it terminates
pub fn start_parent_process_monitor() -> Option<thread::JoinHandle<()>> {
    // Check if the VSCODE_PID environment variable is set
    let parent_pid = match env::var("VSCODE_PID") {
        Ok(pid_str) => match pid_str.parse::<u32>() {
            Ok(pid) => pid,
            Err(e) => {
                eprintln!("Failed to parse VSCODE_PID: {}", e);
                return None;
            }
        },
        Err(_) => {
            // Check if there's a PID file
            match read_vscode_pid_file() {
                Some(pid) => pid,
                None => {
                    eprintln!("No parent process ID found, parent process monitoring disabled");
                    return None;
                }
            }
        }
    };

    println!("Starting parent process monitor for VSCode PID: {}", parent_pid);

    // Create a thread to monitor the parent process
    let handle = thread::spawn(move || {
        let check_interval = Duration::from_secs(5);
        loop {
            thread::sleep(check_interval);

            // Check if the parent process is still running
            if !is_process_running(parent_pid) {
                println!("Parent process (VSCode) has terminated, initiating shutdown");
                SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                break;
            }
        }
    });

    Some(handle)
}

/// Read the VSCode PID from the PID file
fn read_vscode_pid_file() -> Option<u32> {
    let home_dir = match env::var("HOME") {
        Ok(dir) => dir,
        Err(_) => match env::var("USERPROFILE") {
            // Windows
            Ok(dir) => dir,
            Err(_) => return None,
        },
    };

    let pid_file_path = Path::new(&home_dir).join(".smart-memory").join("vscode.pid");

    if !pid_file_path.exists() {
        return None;
    }

    match fs::read_to_string(&pid_file_path) {
        Ok(content) => match content.trim().parse::<u32>() {
            Ok(pid) => Some(pid),
            Err(e) => {
                eprintln!("Failed to parse VSCode PID from file: {}", e);
                None
            }
        },
        Err(e) => {
            eprintln!("Failed to read VSCode PID file: {}", e);
            None
        }
    }
}

/// Check if a process is running
#[cfg(unix)]
fn is_process_running(pid: u32) -> bool {
    // On Unix, we can use the kill command with signal 0 to check if a process exists
    match kill(Pid::from_raw(pid as i32), None) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[cfg(windows)]
fn is_process_running(pid: u32) -> bool {
    use std::process::Command;

    // On Windows, we can use tasklist to check if a process exists
    let output = Command::new("tasklist")
        .args(&["/FI", &format!("PID eq {}", pid), "/NH"])
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.contains(&pid.to_string())
        }
        Err(_) => false,
    }
}

/// Check if shutdown has been requested
pub fn is_shutdown_requested() -> bool {
    SHUTDOWN_REQUESTED.load(Ordering::SeqCst)
}

/// Request shutdown
pub fn request_shutdown() {
    SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
}

/// Wait for shutdown to be requested
pub fn wait_for_shutdown_request(shutdown_requested: Arc<AtomicBool>) {
    while !shutdown_requested.load(Ordering::SeqCst) && !SHUTDOWN_REQUESTED.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(100));
    }
}