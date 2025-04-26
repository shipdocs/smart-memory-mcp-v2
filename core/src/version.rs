use std::fmt;
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;
use serde::{Serialize, Deserialize};
use crate::{log_info, log_error, log_warning};
use crate::logging::LogLevel;

/// Version information
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Version {
    /// Major version
    pub major: u32,
    /// Minor version
    pub minor: u32,
    /// Patch version
    pub patch: u32,
    /// Pre-release identifier (e.g., "alpha.1", "beta.2")
    pub pre_release: Option<String>,
    /// Build metadata (e.g., "build.123")
    pub build: Option<String>,
}

impl Version {
    /// Create a new version
    pub fn new(major: u32, minor: u32, patch: u32) -> Self {
        Self {
            major,
            minor,
            patch,
            pre_release: None,
            build: None,
        }
    }
    
    /// Parse a version string
    pub fn parse(version_str: &str) -> Option<Self> {
        // Split the version string into parts
        let parts: Vec<&str> = version_str.split('-').collect();
        let version_parts = parts[0].split('.').collect::<Vec<&str>>();
        
        if version_parts.len() < 3 {
            return None;
        }
        
        // Parse the major, minor, and patch versions
        let major = version_parts[0].parse::<u32>().ok()?;
        let minor = version_parts[1].parse::<u32>().ok()?;
        let patch = version_parts[2].parse::<u32>().ok()?;
        
        // Parse pre-release and build metadata
        let mut pre_release = None;
        let mut build = None;
        
        if parts.len() > 1 {
            let pre_build: Vec<&str> = parts[1].split('+').collect();
            pre_release = Some(pre_build[0].to_string());
            
            if pre_build.len() > 1 {
                build = Some(pre_build[1].to_string());
            }
        }
        
        if parts.len() > 2 && parts[2].starts_with('+') {
            build = Some(parts[2][1..].to_string());
        }
        
        Some(Self {
            major,
            minor,
            patch,
            pre_release,
            build,
        })
    }
    
    /// Compare versions
    pub fn compare(&self, other: &Self) -> std::cmp::Ordering {
        // Compare major, minor, and patch versions
        match self.major.cmp(&other.major) {
            std::cmp::Ordering::Equal => {},
            ord => return ord,
        }
        
        match self.minor.cmp(&other.minor) {
            std::cmp::Ordering::Equal => {},
            ord => return ord,
        }
        
        match self.patch.cmp(&other.patch) {
            std::cmp::Ordering::Equal => {},
            ord => return ord,
        }
        
        // Compare pre-release identifiers
        match (&self.pre_release, &other.pre_release) {
            (None, Some(_)) => return std::cmp::Ordering::Greater,
            (Some(_), None) => return std::cmp::Ordering::Less,
            (Some(a), Some(b)) => return a.cmp(b),
            (None, None) => {},
        }
        
        std::cmp::Ordering::Equal
    }
    
    /// Check if this version is greater than another version
    pub fn is_greater_than(&self, other: &Self) -> bool {
        self.compare(other) == std::cmp::Ordering::Greater
    }
    
    /// Check if this version is less than another version
    pub fn is_less_than(&self, other: &Self) -> bool {
        self.compare(other) == std::cmp::Ordering::Less
    }
    
    /// Check if this version is equal to another version
    pub fn is_equal_to(&self, other: &Self) -> bool {
        self.compare(other) == std::cmp::Ordering::Equal
    }
    
    /// Get the current version from Cargo.toml
    pub fn current() -> Self {
        Self {
            major: env!("CARGO_PKG_VERSION_MAJOR").parse().unwrap_or(0),
            minor: env!("CARGO_PKG_VERSION_MINOR").parse().unwrap_or(0),
            patch: env!("CARGO_PKG_VERSION_PATCH").parse().unwrap_or(0),
            pre_release: None,
            build: None,
        }
    }
    
    /// Read version from a file
    pub fn from_file(path: &Path) -> io::Result<Self> {
        let mut file = File::open(path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        
        Self::parse(&contents).ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidData, "Invalid version format")
        })
    }
    
    /// Check for updates
    pub fn check_for_updates(&self) -> io::Result<Option<Self>> {
        // In a real implementation, this would check a remote server for updates
        // For now, we'll just return None to indicate no updates are available
        Ok(None)
    }
}

impl fmt::Display for Version {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)?;
        
        if let Some(pre_release) = &self.pre_release {
            write!(f, "-{}", pre_release)?;
        }
        
        if let Some(build) = &self.build {
            write!(f, "+{}", build)?;
        }
        
        Ok(())
    }
}

/// Version manager
pub struct VersionManager {
    /// Current version
    current_version: Version,
    /// Latest version
    latest_version: Option<Version>,
    /// Update available
    update_available: bool,
}

impl VersionManager {
    /// Create a new version manager
    pub fn new() -> Self {
        let current_version = Version::current();
        
        Self {
            current_version,
            latest_version: None,
            update_available: false,
        }
    }
    
    /// Check for updates
    pub fn check_for_updates(&mut self) -> io::Result<bool> {
        log_info!("version", &format!("Checking for updates. Current version: {}", self.current_version));
        
        match self.current_version.check_for_updates()? {
            Some(latest_version) => {
                self.latest_version = Some(latest_version.clone());
                self.update_available = latest_version.is_greater_than(&self.current_version);
                
                if self.update_available {
                    log_info!("version", &format!("Update available: {}", latest_version));
                } else {
                    log_info!("version", "No updates available");
                }
                
                Ok(self.update_available)
            }
            None => {
                log_info!("version", "No updates available");
                self.update_available = false;
                Ok(false)
            }
        }
    }
    
    /// Get the current version
    pub fn get_current_version(&self) -> &Version {
        &self.current_version
    }
    
    /// Get the latest version
    pub fn get_latest_version(&self) -> Option<&Version> {
        self.latest_version.as_ref()
    }
    
    /// Check if an update is available
    pub fn is_update_available(&self) -> bool {
        self.update_available
    }
}

/// Initialize the version manager
pub fn init() -> io::Result<VersionManager> {
    let mut manager = VersionManager::new();
    manager.check_for_updates()?;
    Ok(manager)
}