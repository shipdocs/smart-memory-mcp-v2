// This is a partial fix for the version.rs file to address the whitespace issue

// Replace the from_file method with this version
pub fn from_file(path: &Path) -> io::Result<Self> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    
    // Trim whitespace to handle files with trailing newlines
    let version_str = contents.trim();
    
    Self::parse(version_str)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "Invalid version format"))
}
