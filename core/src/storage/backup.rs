use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::{log_info, log_error, log_warning};
use crate::logging::LogLevel;

/// Backup metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    /// Timestamp of the backup (seconds since UNIX epoch)
    pub timestamp: u64,
    /// Description of the backup
    pub description: String,
    /// Size of the backup in bytes
    pub size: u64,
    /// Version of the application that created the backup
    pub version: String,
    /// Type of backup (auto, manual, pre-update, etc.)
    pub backup_type: String,
}

/// Backup manager
pub struct BackupManager {
    /// Backup directory
    backup_dir: PathBuf,
    /// Maximum number of backups to keep
    max_backups: usize,
}

impl BackupManager {
    /// Create a new backup manager
    pub fn new(backup_dir: &Path) -> io::Result<Self> {
        // Create backup directory if it doesn't exist
        if !backup_dir.exists() {
            fs::create_dir_all(backup_dir)?;
        }
        
        Ok(Self {
            backup_dir: backup_dir.to_path_buf(),
            max_backups: 10, // Default to keeping 10 backups
        })
    }
    
    /// Set the maximum number of backups to keep
    pub fn set_max_backups(&mut self, max_backups: usize) {
        self.max_backups = max_backups;
    }
    
    /// Create a backup
    pub fn create_backup(&self, source_path: &Path, description: &str) -> io::Result<PathBuf> {
        // Generate a unique backup ID based on timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        // Create backup filename
        let backup_filename = format!("backup_{}.db", timestamp);
        let backup_path = self.backup_dir.join(&backup_filename);
        
        // Copy the source file to the backup location
        self.copy_file(source_path, &backup_path)?;
        
        // Create metadata
        let metadata = BackupMetadata {
            timestamp,
            description: description.to_string(),
            size: fs::metadata(&backup_path)?.len(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            backup_type: "manual".to_string(),
        };
        
        // Save metadata
        self.save_metadata(&backup_filename, &metadata)?;
        
        // Rotate old backups
        self.rotate_backups()?;
        
        log_info!("backup", &format!("Created backup: {}", backup_path.display()));
        
        Ok(backup_path)
    }
    
    /// Create an automatic backup
    pub fn create_auto_backup(&self, source_path: &Path) -> io::Result<PathBuf> {
        // Generate a unique backup ID based on timestamp
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        // Create backup filename
        let backup_filename = format!("backup_{}.db", timestamp);
        let backup_path = self.backup_dir.join(&backup_filename);
        
        // Copy the source file to the backup location
        self.copy_file(source_path, &backup_path)?;
        
        // Create metadata
        let metadata = BackupMetadata {
            timestamp,
            description: "Automatic backup".to_string(),
            size: fs::metadata(&backup_path)?.len(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            backup_type: "auto".to_string(),
        };
        
        // Save metadata
        self.save_metadata(&backup_filename, &metadata)?;
        
        // Rotate old backups
        self.rotate_backups()?;
        
        log_info!("backup", &format!("Created automatic backup: {}", backup_path.display()));
        
        Ok(backup_path)
    }
    
    /// Restore a backup
    pub fn restore_backup(&self, backup_path: &Path, target_path: &Path) -> io::Result<()> {
        // Check if backup exists
        if !backup_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Backup not found: {}", backup_path.display())
            ));
        }
        
        // Create a backup of the current file before restoring
        if target_path.exists() {
            let pre_restore_desc = format!("Pre-restore backup of {}", target_path.display());
            match self.create_backup(target_path, &pre_restore_desc) {
                Ok(path) => log_info!("backup", &format!("Created pre-restore backup: {}", path.display())),
                Err(e) => log_warning!("backup", &format!("Failed to create pre-restore backup: {}", e)),
            }
        }
        
        // Remove the target file before restoring
        if target_path.exists() {
            log_info!("backup", &format!("Removing target file before restore: {}", target_path.display()));
            fs::remove_file(target_path)?;
        }
        
        // Copy the backup file to the target location
        log_info!("backup", &format!("Copying backup file {} to target {}", backup_path.display(), target_path.display()));
        self.copy_file(backup_path, target_path)?;
        
        // Verify the content was restored correctly
        let mut restored_content = Vec::new();
        let mut file = File::open(target_path)?;
        file.read_to_end(&mut restored_content)?;
        
        let mut original_content = Vec::new();
        let mut orig_file = File::open(backup_path)?;
        orig_file.read_to_end(&mut original_content)?;
        
        if restored_content != original_content {
            log_error!("backup", "Restored content does not match original backup content");
            return Err(io::Error::new(io::ErrorKind::Other, "Restored content mismatch"));
        }
        
        log_info!("backup", &format!("Restored backup from {} to {}", 
            backup_path.display(), target_path.display()));
        
        Ok(())
    }
    
    /// List available backups
    pub fn list_backups(&self) -> io::Result<Vec<(PathBuf, BackupMetadata)>> {
        let mut backups = Vec::new();
        
        // Read backup directory
        for entry in fs::read_dir(&self.backup_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // Check if it's a backup file
            if path.is_file() && path.extension().map_or(false, |ext| ext == "db") {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                
                // Try to read metadata
                match self.read_metadata(&filename) {
                    Ok(metadata) => {
                        backups.push((path, metadata));
                    },
                    Err(e) => {
                        log_warning!("backup", &format!("Failed to read metadata for {}: {}", path.display(), e));
                    }
                }
            }
        }
        
        // Sort backups by timestamp (newest first)
        backups.sort_by(|(_, a), (_, b)| b.timestamp.cmp(&a.timestamp));
        
        Ok(backups)
    }
    
    /// Delete a backup
    pub fn delete_backup(&self, backup_path: &Path) -> io::Result<()> {
        // Check if backup exists
        if !backup_path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Backup not found: {}", backup_path.display())
            ));
        }
        
        // Delete the backup file
        fs::remove_file(backup_path)?;
        
        // Delete the metadata file
        let filename = backup_path.file_name().unwrap().to_string_lossy().to_string();
        let metadata_path = self.backup_dir.join(format!("{}.meta", filename));
        if metadata_path.exists() {
            fs::remove_file(metadata_path)?;
        }
        
        log_info!("backup", &format!("Deleted backup: {}", backup_path.display()));
        
        Ok(())
    }
    
    /// Rotate old backups
    fn rotate_backups(&self) -> io::Result<()> {
        // List all backups
        let mut backups = self.list_backups()?;
        
        // Sort backups by timestamp (newest first)
        backups.sort_by(|(_, a), (_, b)| b.timestamp.cmp(&a.timestamp));
        
        log_info!("backup", &format!("Backups before rotation: {}", backups.len()));
        log_info!("backup", &format!("Max backups allowed: {}", self.max_backups));
        
        // If we have more backups than the maximum, delete the oldest ones
        if backups.len() > self.max_backups {
            let to_delete = backups.len() - self.max_backups;
            log_info!("backup", &format!("Deleting {} old backups", to_delete));
            for (path, _) in backups.iter().rev().take(to_delete) {
                log_info!("backup", &format!("Deleting old backup: {}", path.display()));
                if let Err(e) = self.delete_backup(path) {
                    log_warning!("backup", &format!("Failed to delete old backup {}: {}", path.display(), e));
                }
            }
        }
        
        Ok(())
    }
    
    /// Copy a file
    fn copy_file(&self, source: &Path, destination: &Path) -> io::Result<()> {
        // Open source file
        let mut source_file = File::open(source)?;
        
        // Create destination file
        let mut dest_file = File::create(destination)?;
        
        // Copy data
        let mut buffer = Vec::new();
        source_file.read_to_end(&mut buffer)?;
        dest_file.write_all(&buffer)?;
        
        Ok(())
    }
    
    /// Save metadata
    fn save_metadata(&self, backup_filename: &str, metadata: &BackupMetadata) -> io::Result<()> {
        let metadata_path = self.backup_dir.join(format!("{}.meta", backup_filename));
        let metadata_json = serde_json::to_string_pretty(metadata)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        
        let mut file = File::create(metadata_path)?;
        file.write_all(metadata_json.as_bytes())?;
        
        Ok(())
    }
    
    /// Read metadata
    fn read_metadata(&self, backup_filename: &str) -> io::Result<BackupMetadata> {
        let metadata_path = self.backup_dir.join(format!("{}.meta", backup_filename));
        
        // If metadata file doesn't exist, try to extract information from the filename
        if !metadata_path.exists() {
            if let Some(timestamp_str) = backup_filename
                .strip_prefix("backup_")
                .and_then(|s| s.strip_suffix(".db"))
            {
                if let Ok(timestamp) = timestamp_str.parse::<u64>() {
                    let backup_path = self.backup_dir.join(backup_filename);
                    let size = if backup_path.exists() {
                        fs::metadata(&backup_path)?.len()
                    } else {
                        0
                    };
                    
                    return Ok(BackupMetadata {
                        timestamp,
                        description: "Unknown (metadata missing)".to_string(),
                        size,
                        version: "unknown".to_string(),
                        backup_type: "unknown".to_string(),
                    });
                }
            }
            
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Metadata file not found: {}", metadata_path.display())
            ));
        }
        
        // Read metadata file
        let mut file = File::open(metadata_path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        
        // Parse JSON
        let metadata = serde_json::from_str(&contents)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
        
        Ok(metadata)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::tempdir;
    
    #[test]
    fn test_create_and_restore_backup() -> io::Result<()> {
        // Create temporary directories
        let temp_dir = tempdir()?;
        let backup_dir = temp_dir.path().join("backups");
        let data_dir = temp_dir.path().join("data");
        
        fs::create_dir_all(&backup_dir)?;
        fs::create_dir_all(&data_dir)?;
        
        // Create a test database file
        let db_path = data_dir.join("test.db");
        let test_content = b"This is test database content";
        let mut file = File::create(&db_path)?;
        file.write_all(test_content)?;
        
        // Create backup manager
        let backup_manager = BackupManager::new(&backup_dir)?;
        
        // Create a backup
        let backup_path = backup_manager.create_backup(&db_path, "Test backup")?;
        
        // Verify backup exists
        assert!(backup_path.exists());
        
        // Modify the original file
        let mut file = File::create(&db_path)?;
        file.write_all(b"Modified content")?;
        
        // Restore the backup
        backup_manager.restore_backup(&backup_path, &db_path)?;
        
        // Verify the content was restored
        let mut restored_content = Vec::new();
        let mut file = File::open(&db_path)?;
        file.read_to_end(&mut restored_content)?;
        
        assert_eq!(restored_content, test_content);
        
        Ok(())
    }
    
    #[test]
    fn test_list_and_rotate_backups() -> io::Result<()> {
        // Create temporary directories
        let temp_dir = tempdir()?;
        let backup_dir = temp_dir.path().join("backups");
        let data_dir = temp_dir.path().join("data");
        
        fs::create_dir_all(&backup_dir)?;
        fs::create_dir_all(&data_dir)?;
        
        // Create a test database file
        let db_path = data_dir.join("test.db");
        let mut file = File::create(&db_path)?;
        file.write_all(b"Test content")?;
        
        // Create backup manager with max 3 backups
        let mut backup_manager = BackupManager::new(&backup_dir)?;
        backup_manager.set_max_backups(3);
        
        // Create 5 backups
        for i in 1..=5 {
            backup_manager.create_backup(&db_path, &format!("Backup {}", i))?;
            
            // Add a small delay to ensure different timestamps
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        
        // List backups
        let backups = backup_manager.list_backups()?;
        
        // Should only have 3 backups (the newest ones)
        assert_eq!(backups.len(), 3);
        
        // Verify they are sorted by timestamp (newest first)
        for i in 0..backups.len() - 1 {
            assert!(backups[i].1.timestamp > backups[i + 1].1.timestamp);
        }
        
        Ok(())
    }
}
