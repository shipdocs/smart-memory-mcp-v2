// This is a partial fix for the backup.rs file to address the memory usage issue

// Replace the copy_file method with this version
fn copy_file(&self, source: &Path, destination: &Path) -> io::Result<()> {
    // Open source file
    let mut source_file = File::open(source)?;
    
    // Create destination file
    let mut dest_file = File::create(destination)?;
    
    // Stream copy in chunks instead of loading the entire file into memory
    std::io::copy(&mut source_file, &mut dest_file)?;
    
    Ok(())
}
