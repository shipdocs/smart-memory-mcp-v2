# Cleanup Orphaned MCP Servers - PowerShell Script Wrapper
# This script is a wrapper around the cleanup-orphaned-servers.js script

# Get the directory of this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Node.js is installed
try {
    $null = Get-Command node -ErrorAction Stop
} catch {
    Write-Error "Error: Node.js is not installed. Please install Node.js to use this script."
    exit 1
}

# Run the cleanup script
& node "$ScriptDir\cleanup-orphaned-servers.js" $args