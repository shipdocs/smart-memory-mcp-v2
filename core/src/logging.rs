use chrono::{DateTime, Local, Utc};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::sync::Mutex;
use std::time::SystemTime;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "TRACE",
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warning => "WARNING",
            LogLevel::Error => "ERROR",
            LogLevel::Critical => "CRITICAL",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "TRACE" => Some(LogLevel::Trace),
            "DEBUG" => Some(LogLevel::Debug),
            "INFO" => Some(LogLevel::Info),
            "WARNING" => Some(LogLevel::Warning),
            "ERROR" => Some(LogLevel::Error),
            "CRITICAL" => Some(LogLevel::Critical),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub module: String,
    pub message: String,
    pub metadata: Option<serde_json::Value>,
}

impl LogEntry {
    pub fn new(
        level: LogLevel,
        module: &str,
        message: &str,
        metadata: Option<serde_json::Value>,
    ) -> Self {
        let now: DateTime<Utc> = SystemTime::now().into();
        Self {
            timestamp: now.to_rfc3339(),
            level,
            module: module.to_string(),
            message: message.to_string(),
            metadata,
        }
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn to_formatted_string(&self) -> String {
        let local_time: DateTime<Local> = DateTime::parse_from_rfc3339(&self.timestamp)
            .map(|dt| dt.with_timezone(&Local::now().timezone()))
            .unwrap_or_else(|_| Local::now());

        let time_str = local_time.format("%Y-%m-%d %H:%M:%S%.3f").to_string();
        let metadata_str = match &self.metadata {
            Some(data) => format!(" | {}", serde_json::to_string(data).unwrap_or_default()),
            None => String::new(),
        };

        format!(
            "[{}] [{}] [{}] {}{}",
            time_str,
            self.level.as_str(),
            self.module,
            self.message,
            metadata_str
        )
    }
}

pub struct Logger {
    log_file: Option<Mutex<File>>,
    console_level: LogLevel,
    file_level: LogLevel,
    max_file_size: u64,
    max_files: usize,
}

lazy_static! {
    static ref LOGGER: Mutex<Logger> = Mutex::new(Logger::new());
}

impl Logger {
    pub fn new() -> Self {
        Self {
            log_file: None,
            console_level: LogLevel::Info,
            file_level: LogLevel::Debug,
            max_file_size: 10 * 1024 * 1024, // 10 MB
            max_files: 5,
        }
    }

    pub fn init(
        log_dir: &str,
        console_level: LogLevel,
        file_level: LogLevel,
    ) -> std::io::Result<()> {
        let log_path = Path::new(log_dir);

        // Create log directory if it doesn't exist
        if !log_path.exists() {
            fs::create_dir_all(log_path)?;
        }

        let log_file_path = log_path.join("smart-memory-mcp.log");
        let file = File::options()
            .create(true)
            .append(true)
            .open(&log_file_path)?;

        let mut logger = LOGGER.lock().unwrap();
        logger.log_file = Some(Mutex::new(file));
        logger.console_level = console_level;
        logger.file_level = file_level;

        // Log initialization
        log(
            LogLevel::Info,
            "logging",
            &format!(
                "Logging initialized. Console level: {}, File level: {}",
                console_level.as_str(),
                file_level.as_str()
            ),
            None,
        );

        Ok(())
    }

    fn rotate_logs(&self, log_dir: &str) -> std::io::Result<()> {
        let log_path = Path::new(log_dir);
        let log_file_path = log_path.join("smart-memory-mcp.log");

        // Check if log file exists and needs rotation
        if let Ok(metadata) = fs::metadata(&log_file_path) {
            if metadata.len() > self.max_file_size {
                // Rotate existing log files
                for i in (1..self.max_files).rev() {
                    let old_path = log_path.join(format!("smart-memory-mcp.{}.log", i));
                    let new_path = log_path.join(format!("smart-memory-mcp.{}.log", i + 1));

                    if old_path.exists() {
                        if i + 1 >= self.max_files {
                            // Remove the oldest log file if we've reached the maximum
                            fs::remove_file(&old_path)?;
                        } else {
                            // Rename the file to the next number
                            fs::rename(&old_path, &new_path)?;
                        }
                    }
                }

                // Rename the current log file to .1
                let backup_path = log_path.join("smart-memory-mcp.1.log");
                fs::rename(&log_file_path, &backup_path)?;

                // Create a new log file
                let file = File::options()
                    .create(true)
                    .append(true)
                    .open(&log_file_path)?;

                let mut logger = LOGGER.lock().unwrap();
                logger.log_file = Some(Mutex::new(file));

                // Log rotation
                log(
                    LogLevel::Info,
                    "logging",
                    &format!(
                        "Log file rotated. Previous log saved to {}",
                        backup_path.display()
                    ),
                    None,
                );
            }
        }

        Ok(())
    }

    fn write_to_log(&self, entry: &LogEntry) -> std::io::Result<()> {
        if let Some(file_mutex) = &self.log_file {
            if entry.level >= self.file_level {
                let mut file = file_mutex.lock().unwrap();
                writeln!(file, "{}", entry.to_formatted_string())?;
                file.flush()?;
            }
        }

        if entry.level >= self.console_level {
            eprintln!("{}", entry.to_formatted_string());
        }

        Ok(())
    }
}

pub fn log(level: LogLevel, module: &str, message: &str, metadata: Option<serde_json::Value>) {
    let entry = LogEntry::new(level, module, message, metadata);

    if let Ok(logger) = LOGGER.lock() {
        if let Err(e) = logger.write_to_log(&entry) {
            eprintln!("Failed to write to log: {}", e);
        }
    }
}

// Convenience macros for logging
#[macro_export]
macro_rules! log_trace {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Trace, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Trace,
            $module,
            $message,
            Some($metadata),
        )
    };
}

#[macro_export]
macro_rules! log_debug {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Debug, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Debug,
            $module,
            $message,
            Some($metadata),
        )
    };
}

#[macro_export]
macro_rules! log_info {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Info, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Info,
            $module,
            $message,
            Some($metadata),
        )
    };
}

#[macro_export]
macro_rules! log_warning {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Warning, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Warning,
            $module,
            $message,
            Some($metadata),
        )
    };
}

#[macro_export]
macro_rules! log_error {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Error, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Error,
            $module,
            $message,
            Some($metadata),
        )
    };
}

#[macro_export]
macro_rules! log_critical {
    ($module:expr, $message:expr) => {
        $crate::logging::log($crate::logging::LogLevel::Critical, $module, $message, None)
    };
    ($module:expr, $message:expr, $metadata:expr) => {
        $crate::logging::log(
            $crate::logging::LogLevel::Critical,
            $module,
            $message,
            Some($metadata),
        )
    };
}
