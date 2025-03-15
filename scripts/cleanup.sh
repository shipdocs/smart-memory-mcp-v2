#!/bin/bash

# Cleanup Orphaned MCP Servers - Shell Script Wrapper
# This script is a wrapper around the cleanup-orphaned-servers.js script

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to use this script."
    exit 1
fi

# Run the cleanup script
node "$SCRIPT_DIR/cleanup-orphaned-servers.js" "$@"