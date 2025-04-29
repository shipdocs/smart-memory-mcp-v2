// This is a partial fix for the logging.rs file to address the deadlock issue

// Replace the init function with this version
pub fn init(log_dir: &Path, console_level: LogLevel, file_level: LogLevel) -> io::Result<()> {
    // Create log directory if it doesn't exist
    fs::create_dir_all(log_dir)?;

    // Create log file
    let log_file_path = log_dir.join(format!("smart-memory-{}.log", Local::now().format("%Y%m%d-%H%M%S")));
    let file = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(&log_file_path)?;

    // Update logger configuration - use a separate scope to ensure the lock is released
    {
        let mut logger = LOGGER.lock().unwrap();
        logger.log_file = Some(Mutex::new(file));
        logger.console_level = console_level;
        logger.file_level = file_level;
    } // lock is dropped here

    // Log initialization (safe - no lock held)
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
