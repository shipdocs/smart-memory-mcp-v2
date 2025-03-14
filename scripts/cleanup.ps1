# Smart Memory MCP Cleanup Script for Windows
# This script removes build artifacts and binaries to reduce repository size

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

# Get the root directory of the project
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

# Clean up target directories
function Clean-TargetDirectories {
    Write-Blue "Cleaning up target directories..."
    
    # Core target directory
    $coreTargetDir = Join-Path $rootDir "core\target"
    if (Test-Path $coreTargetDir) {
        Write-Yellow "Removing core\target directory..."
        Remove-Item -Path $coreTargetDir -Recurse -Force
    }
    
    # Client target directory
    $clientTargetDir = Join-Path $rootDir "client\target"
    if (Test-Path $clientTargetDir) {
        Write-Yellow "Removing client\target directory..."
        Remove-Item -Path $clientTargetDir -Recurse -Force
    }
    
    Write-Green "Target directories cleaned up successfully!"
}

# Clean up extension binaries
function Clean-ExtensionBinaries {
    Write-Blue "Cleaning up extension binaries..."
    
    # Extension bin directory
    $extensionBinDir = Join-Path $rootDir "extension\bin"
    if (Test-Path $extensionBinDir) {
        Write-Yellow "Removing extension\bin directory..."
        Remove-Item -Path $extensionBinDir -Recurse -Force
        
        # Create directory structure
        New-Item -ItemType Directory -Force -Path $extensionBinDir | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $extensionBinDir "linux") | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $extensionBinDir "macos") | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $extensionBinDir "windows") | Out-Null
        
        # Create placeholder files to preserve directory structure
        New-Item -ItemType File -Force -Path (Join-Path $extensionBinDir ".gitkeep") | Out-Null
        New-Item -ItemType File -Force -Path (Join-Path $extensionBinDir "linux\.gitkeep") | Out-Null
        New-Item -ItemType File -Force -Path (Join-Path $extensionBinDir "macos\.gitkeep") | Out-Null
        New-Item -ItemType File -Force -Path (Join-Path $extensionBinDir "windows\.gitkeep") | Out-Null
    }
    
    Write-Green "Extension binaries cleaned up successfully!"
}

# Clean up node_modules
function Clean-NodeModules {
    Write-Blue "Cleaning up node_modules..."
    
    # Extension node_modules
    $extensionNodeModulesDir = Join-Path $rootDir "extension\node_modules"
    if (Test-Path $extensionNodeModulesDir) {
        Write-Yellow "Removing extension\node_modules directory..."
        Remove-Item -Path $extensionNodeModulesDir -Recurse -Force
    }
    
    Write-Green "Node modules cleaned up successfully!"
}

# Clean up VSIX files
function Clean-VsixFiles {
    Write-Blue "Cleaning up VSIX files..."
    
    # Find and remove all VSIX files
    Get-ChildItem -Path $rootDir -Filter "*.vsix" -Recurse | ForEach-Object {
        Write-Yellow "Removing $($_.FullName)..."
        Remove-Item -Path $_.FullName -Force
    }
    
    Write-Green "VSIX files cleaned up successfully!"
}

# Main cleanup process
function Cleanup-SmartMemoryMCP {
    Write-Blue "=== Smart Memory MCP Cleanup ==="
    
    # Ask for confirmation
    $confirmation = Read-Host "This will remove all build artifacts and binaries. Continue? (y/n)"
    if ($confirmation -ne "y") {
        Write-Red "Cleanup aborted."
        return
    }
    
    # Clean up target directories
    Clean-TargetDirectories
    
    # Clean up extension binaries
    Clean-ExtensionBinaries
    
    # Clean up node_modules
    Clean-NodeModules
    
    # Clean up VSIX files
    Clean-VsixFiles
    
    Write-Green "=== Cleanup Complete ==="
    Write-Green "Repository size has been reduced."
    Write-Yellow "To rebuild the project, run:"
    Write-Yellow "  npm run build"
}

# Run the cleanup
Cleanup-SmartMemoryMCP