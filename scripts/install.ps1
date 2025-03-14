# Smart Memory MCP Installation Script for Windows
# This script handles the installation of Smart Memory MCP components
# by compiling them from source rather than using pre-compiled binaries.

# Ensure script stops on errors
$ErrorActionPreference = "Stop"

# Color codes for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Red($message) {
    Write-ColorOutput Red $message
}

function Write-Green($message) {
    Write-ColorOutput Green $message
}

function Write-Yellow($message) {
    Write-ColorOutput Yellow $message
}

function Write-Blue($message) {
    Write-ColorOutput Blue $message
}

# Check if a command exists
function Test-Command($command) {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $command) {
            return $true
        }
    }
    catch {
        return $false
    }
    finally {
        $ErrorActionPreference = $oldPreference
    }
}

# Install Rust if not already installed
function Install-Rust {
    if (-not (Test-Command "rustc")) {
        Write-Yellow "Rust not found. Installing Rust..."
        Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
        Start-Process -FilePath "$env:TEMP\rustup-init.exe" -ArgumentList "-y" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Green "Rust installed successfully!"
    }
    else {
        Write-Green "Rust is already installed."
    }
}

# Check and install build dependencies
function Install-Dependencies {
    Write-Blue "Checking dependencies for Windows..."
    
    # Check for Visual Studio Build Tools
    if (-not (Test-Path "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0") -and 
        -not (Test-Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0") -and
        -not (Test-Path "HKLM:\SOFTWARE\Microsoft\VisualStudio\2017") -and
        -not (Test-Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\2017") -and
        -not (Test-Path "HKLM:\SOFTWARE\Microsoft\VisualStudio\2019") -and
        -not (Test-Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\2019") -and
        -not (Test-Path "HKLM:\SOFTWARE\Microsoft\VisualStudio\2022") -and
        -not (Test-Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\2022")) {
        
        Write-Yellow "Visual Studio Build Tools not found. Please install Visual Studio Build Tools."
        Write-Yellow "Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
        Write-Yellow "Make sure to select 'C++ build tools' during installation."
        
        $installTools = Read-Host "Would you like to open the download page? (y/n)"
        if ($installTools -eq "y") {
            Start-Process "https://visualstudio.microsoft.com/visual-cpp-build-tools/"
        }
        
        Write-Red "Please run this script again after installing Visual Studio Build Tools."
        exit 1
    }
    
    Write-Green "Dependencies checked successfully!"
}

# Build the core component
function Build-Core {
    Write-Blue "Building Smart Memory MCP Core..."
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $coreDir = Join-Path (Split-Path -Parent $scriptDir) "core"
    
    Push-Location $coreDir
    & cargo build --release
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to build core component."
        exit 1
    }
    Pop-Location
    
    Write-Green "Core built successfully!"
}

# Build the client component
function Build-Client {
    Write-Blue "Building Smart Memory MCP Client..."
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $clientDir = Join-Path (Split-Path -Parent $scriptDir) "client"
    
    Push-Location $clientDir
    & cargo build --release
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Failed to build client component."
        exit 1
    }
    Pop-Location
    
    Write-Green "Client built successfully!"
}

# Setup configuration
function Setup-Config {
    Write-Blue "Setting up configuration..."
    
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootDir = Split-Path -Parent $scriptDir
    
    $configDir = Join-Path $env:USERPROFILE ".smart-memory"
    $binDir = Join-Path $configDir "bin"
    
    # Create config directory
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    
    # Copy binaries
    $coreSource = Join-Path $rootDir "core\target\release\smart-memory-mcp-core.exe"
    $clientSource = Join-Path $rootDir "client\target\release\smart-memory-mcp-client.exe"
    
    $coreTarget = Join-Path $binDir "smart-memory-mcp-core.exe"
    $clientTarget = Join-Path $binDir "smart-memory-mcp-client.exe"
    
    Copy-Item -Path $coreSource -Destination $coreTarget -Force
    Copy-Item -Path $clientSource -Destination $clientTarget -Force
    
    # Create default config if it doesn't exist
    $configFile = Join-Path $configDir "config.json"
    if (-not (Test-Path $configFile)) {
        $configContent = @{
            core = @{
                binaryPath = $coreTarget
                dataPath = Join-Path $configDir "data"
                logPath = Join-Path $configDir "logs"
            }
            client = @{
                binaryPath = $clientTarget
                serverUrl = "http://localhost:3000"
            }
        } | ConvertTo-Json -Depth 4
        
        Set-Content -Path $configFile -Value $configContent
    }
    
    # Create data and logs directories
    New-Item -ItemType Directory -Force -Path (Join-Path $configDir "data") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $configDir "logs") | Out-Null
    
    Write-Green "Configuration set up successfully!"
}

# Main installation process
function Install-SmartMemoryMCP {
    Write-Blue "=== Smart Memory MCP Installation ==="
    
    # Install Rust
    Install-Rust
    
    # Install dependencies
    Install-Dependencies
    
    # Build components
    Build-Core
    Build-Client
    
    # Setup configuration
    Setup-Config
    
    Write-Green "=== Installation Complete ==="
    Write-Green "Smart Memory MCP has been installed successfully!"
    Write-Blue "Binaries location: $env:USERPROFILE\.smart-memory\bin"
    Write-Blue "Configuration: $env:USERPROFILE\.smart-memory\config.json"
    Write-Yellow "To use with VS Code, install the Smart Memory MCP extension."
}

# Run the installation
Install-SmartMemoryMCP