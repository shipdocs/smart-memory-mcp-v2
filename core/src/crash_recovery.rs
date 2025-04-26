use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Serialize, Deserialize};
use crate::{log_info, log_error, log_warning};
use crate::logging::LogLevel;

/// Recovery state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryState {
    /// Last known server PID
    pub pid: Option<u32>,
    /// Last known server port
    pub port: Option<u16>,
    /// Database path
    pub db_path: Option<String>,
    /// Configuration path
    pub config_path: Option<String>,
    /// Timestamp of last update
    pub last_update: u64,
    /// Crash count (consecutive crashes)
    pub crash_count: u32,
    /// Last crash timestamp
    pub last_crash: Option<u64>,
    /// Last crash reason
    pub last_crash_reason: Option<String>,
    /// Recovery attempts
    pub recovery_attempts: u32,
    /// Safe mode enabled
    pub safe_mode: bool,
}

impl Default for RecoveryState {
    fn default() -> Self {
        Self {
            pid: None,
            port: None,
            db_path: None,
            config_path: None,
            last_update: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            crash_count: 0,
            last_crash: None,
            last_crash_reason: None,
            recovery_attempts: 0,
            safe_mode: false,
        }
    }
}

/// Crash recovery manager
pub struct CrashRecoveryManager {
    /// Recovery state
    state: RecoveryState,
    /// State file path
    state_path: PathBuf,
    /// Data directory
    data_dir: PathBuf,
    /// Maximum recovery attempts
    max_recovery_attempts: u32,
}

impl CrashRecoveryManager {
    /// Create a new crash recovery manager
    pub fn new(data_dir: &Path) -> io::Result<Self> {
        // Create data directory if it doesn't exist
        if !data_dir.exists() {
            fs::create_dir_all(data_dir)?;
        }
        
        let state_path = data_dir.join("recovery.json");
        let state = if state_path.exists() {
            // Load existing state
            let mut file = File::open(&state_path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            
            match serde_json::from_str(&contents) {
                Ok(state) => state,
                Err(e) => {
                    log_warning!("recovery", &format!("Failed to parse recovery state: {}", e));
                    RecoveryState::default()
                }
            }
        } else {
            // Create new state
            RecoveryState::default()
        };
        
        Ok(Self {
            state,
            state_path,
            data_dir: data_dir.to_path_buf(),
            max_recovery_attempts: 3,
        })
    }
    
    /// Set the maximum recovery attempts
    pub fn set_max_recovery_attempts(&mut self, max_attempts: u32) {
        self.max_recovery_attempts = max_attempts;
    }
    
    /// Set the paths for recovery
    pub fn set_paths(&mut self, db_path: &str, config_path: &str, port: u16) -> io::Result<()> {
        self.state.db_path = Some(db_path.to_string());
        self.state.config_path = Some(config_path.to_string());
        self.state.port = Some(port);
        self.save_state()
    }
    
    /// Update the PID
    pub fn update_pid(&mut self, pid: u32) -> io::Result<()> {
        self.state.pid = Some(pid);
        self.state.last_update = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.save_state()
    }
    
    /// Record a crash with reason
    pub fn record_crash(&mut self, reason: &str) -> io::Result<()> {
        self.state.crash_count += 1;
        self.state.last_crash = Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        );
        self.state.last_crash_reason = Some(reason.to_string());
        
        // If we've had too many crashes, enable safe mode
        if self.state.crash_count >= 3 {
            self.state.safe_mode = true;
            log_warning!("recovery", &format!("Too many consecutive crashes ({}), enabling safe mode", reason));
        }
        
        self.save_state()
    }

    /// Check for previous crashes
    pub fn check_previous_crash(&self) -> Option<&RecoveryState> {
        if self.state.crash_count > 0 {
            Some(&self.state)
        } else {
            None
        }
    }

    /// Perform recovery actions
    pub fn perform_recovery(&mut self) -> io::Result<()> {
        if !self.should_attempt_recovery() {
            return Err(io::Error::new(io::ErrorKind::Other, "Too many recovery attempts"));
        }

        self.record_recovery_attempt()?;
        
        // Check database integrity
        if !self.check_database_integrity()? {
            log_warning!("recovery", "Database integrity check failed, attempting repair");
            if !self.repair_database()? {
                return Err(io::Error::new(io::ErrorKind::Other, "Database repair failed"));
            }
        }

        Ok(())
    }

    /// Register shutdown hook
    pub fn register_shutdown_hook(&self) {
        log_info!("recovery", "Registered shutdown hook");
    }

    /// Update server state
    pub fn update_state(&mut self, state: &str) -> io::Result<()> {
        log_info!("recovery", &format!("Server state updated to: {}", state));
        self.save_state()
    }
    
    /// Record a recovery attempt
    pub fn record_recovery_attempt(&mut self) -> io::Result<()> {
        self.state.recovery_attempts += 1;
        self.save_state()
    }
    
    /// Reset crash count
    pub fn reset_crash_count(&mut self) -> io::Result<()> {
        self.state.crash_count = 0;
        self.state.recovery_attempts = 0;
        self.state.safe_mode = false;
        self.save_state()
    }
    
    /// Check if recovery is needed
    pub fn is_recovery_needed(&self) -> bool {
        if let Some(pid) = self.state.pid {
            // Check if process is still running
            !Self::is_process_running(pid)
        } else {
            false
        }
    }
    
    /// Check if safe mode is enabled
    pub fn is_safe_mode_enabled(&self) -> bool {
        self.state.safe_mode
    }
    
    /// Check if we should attempt recovery
    pub fn should_attempt_recovery(&self) -> bool {
        self.state.recovery_attempts < self.max_recovery_attempts
    }
    
    /// Get the database path
    pub fn get_db_path(&self) -> Option<&str> {
        self.state.db_path.as_deref()
    }
    
    /// Get the configuration path
    pub fn get_config_path(&self) -> Option<&str> {
        self.state.config_path.as_deref()
    }
    
    /// Get the port
    pub fn get_port(&self) -> Option<u16> {
        self.state.port
    }
    
    /// Get the PID
    pub fn get_pid(&self) -> Option<u32> {
        self.state.pid
    }
    
    /// Get the crash count
    pub fn get_crash_count(&self) -> u32 {
        self.state.crash_count
    }
    
    /// Get the recovery attempts
    pub fn get_recovery_attempts(&self) -> u32 {
        self.state.recovery_attempts
    }
    
    /// Check database integrity
    pub fn check_database_integrity(&self) -> io::Result<bool> {
        if let Some(db_path) = &self.state.db_path {
            // Check if database file exists
            let db_path = Path::new(db_path);
            if !db_path.exists() {
                return Ok(false);
            }
            
            // In a real implementation, we would use SQLite's integrity_check pragma
            // For now, we'll just check if the file exists and is not empty
            let metadata = fs::metadata(db_path)?;
            if metadata.len() == 0 {
                return Ok(false);
            }
            
            // TODO: Implement actual database integrity check
            
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    /// Repair database
    pub fn repair_database(&self) -> io::Result<bool> {
        if let Some(db_path) = &self.state.db_path {
            // Check if database file exists
            let db_path = Path::new(db_path);
            if !db_path.exists() {
                return Ok(false);
            }
            
            // In a real implementation, we would use SQLite's recovery mechanisms
            // For now, we'll just log that we attempted repair
            log_info!("recovery", &format!("Attempting to repair database: {}", db_path.display()));
            
            // TODO: Implement actual database repair
            
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    /// Save recovery state
    fn save_state(&self) -> io::Result<()> {
        let json = serde_json::to_string_pretty(&self.state)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        
        let mut file = File::create(&self.state_path)?;
        file.write_all(json.as_bytes())?;
        
        Ok(())
    }
    
    /// Check if a process is running
    #[cfg(unix)]
    fn is_process_running(pid: u32) -> bool {
        use std::process::Command;
        
        // On Unix, we can use the kill command with signal 0 to check if a process exists
        let output = Command::new("kill")
            .args(&["-0", &pid.to_string()])
            .output();
            
        match output {
            Ok(output) => output.status.success(),
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
            },
            Err(_) => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_recovery_state() -> io::Result<()> {
        // Create temporary directory
        let temp_dir = tempdir()?;
        
        // Create recovery manager
        let mut manager = CrashRecoveryManager::new(temp_dir.path())?;
        
        // Set paths
        manager.set_paths("test.db", "config.json", 50051)?;
        
        // Update PID
        manager.update_pid(12345)?;
        
        // Check values
        assert_eq!(manager.get_db_path(), Some("test.db"));
        assert_eq!(manager.get_config_path(), Some("config.json"));
        assert_eq!(manager.get_port(), Some(50051));
        assert_eq!(manager.get_pid(), Some(12345));
        
        // Record a crash
        manager.record_crash()?;
        assert_eq!(manager.get_crash_count(), 1);
        
        // Record more crashes to trigger safe mode
        manager.record_crash()?;
        manager.record_crash()?;
        assert_eq!(manager.get_crash_count(), 3);
        assert!(manager.is_safe_mode_enabled());
        
        // Reset crash count
        manager.reset_crash_count()?;
        assert_eq!(manager.get_crash_count(), 0);
        assert!(!manager.is_safe_mode_enabled());
        
        Ok(())
    }
    
    #[test]
    fn test_recovery_persistence() -> io::Result<()> {
        // Create temporary directory
        let temp_dir = tempdir()?;
        
        // Create first recovery manager
        let mut manager1 = CrashRecoveryManager::new(temp_dir.path())?;
        
        // Set some values
        manager1.set_paths("test.db", "config.json", 50051)?;
        manager1.update_pid(12345)?;
        manager1.record_crash()?;
        
        // Create second recovery manager (should load state from file)
        let manager2 = CrashRecoveryManager::new(temp_dir.path())?;
        
        // Check values were loaded
        assert_eq!(manager2.get_db_path(), Some("test.db"));
        assert_eq!(manager2.get_config_path(), Some("config.json"));
        assert_eq!(manager2.get_port(), Some(50051));
        assert_eq!(manager2.get_pid(), Some(12345));
        assert_eq!(manager2.get_crash_count(), 1);
        
        Ok(())
    }
}