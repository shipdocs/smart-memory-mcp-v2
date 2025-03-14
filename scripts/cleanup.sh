#!/bin/bash
# Smart Memory MCP Cleanup Script
# This script removes build artifacts and binaries to reduce repository size

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Get the root directory of the project
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Clean up target directories
clean_target_directories() {
  print_message "$BLUE" "Cleaning up target directories..."
  
  # Core target directory
  if [ -d "$ROOT_DIR/core/target" ]; then
    print_message "$YELLOW" "Removing core/target directory..."
    rm -rf "$ROOT_DIR/core/target"
  fi
  
  # Client target directory
  if [ -d "$ROOT_DIR/client/target" ]; then
    print_message "$YELLOW" "Removing client/target directory..."
    rm -rf "$ROOT_DIR/client/target"
  fi
  
  print_message "$GREEN" "Target directories cleaned up successfully!"
}

# Clean up extension binaries
clean_extension_binaries() {
  print_message "$BLUE" "Cleaning up extension binaries..."
  
  # Extension bin directory
  if [ -d "$ROOT_DIR/extension/bin" ]; then
    print_message "$YELLOW" "Removing extension/bin directory..."
    rm -rf "$ROOT_DIR/extension/bin"
    mkdir -p "$ROOT_DIR/extension/bin"
    mkdir -p "$ROOT_DIR/extension/bin/linux"
    mkdir -p "$ROOT_DIR/extension/bin/macos"
    mkdir -p "$ROOT_DIR/extension/bin/windows"
    
    # Create placeholder files to preserve directory structure
    touch "$ROOT_DIR/extension/bin/.gitkeep"
    touch "$ROOT_DIR/extension/bin/linux/.gitkeep"
    touch "$ROOT_DIR/extension/bin/macos/.gitkeep"
    touch "$ROOT_DIR/extension/bin/windows/.gitkeep"
  fi
  
  print_message "$GREEN" "Extension binaries cleaned up successfully!"
}

# Clean up node_modules
clean_node_modules() {
  print_message "$BLUE" "Cleaning up node_modules..."
  
  # Extension node_modules
  if [ -d "$ROOT_DIR/extension/node_modules" ]; then
    print_message "$YELLOW" "Removing extension/node_modules directory..."
    rm -rf "$ROOT_DIR/extension/node_modules"
  fi
  
  print_message "$GREEN" "Node modules cleaned up successfully!"
}

# Clean up VSIX files
clean_vsix_files() {
  print_message "$BLUE" "Cleaning up VSIX files..."
  
  # Find and remove all VSIX files
  find "$ROOT_DIR" -name "*.vsix" -type f -delete
  
  print_message "$GREEN" "VSIX files cleaned up successfully!"
}

# Main cleanup process
main() {
  print_message "$BLUE" "=== Smart Memory MCP Cleanup ==="
  
  # Ask for confirmation
  read -p "This will remove all build artifacts and binaries. Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "$RED" "Cleanup aborted."
    exit 1
  fi
  
  # Clean up target directories
  clean_target_directories
  
  # Clean up extension binaries
  clean_extension_binaries
  
  # Clean up node_modules
  clean_node_modules
  
  # Clean up VSIX files
  clean_vsix_files
  
  print_message "$GREEN" "=== Cleanup Complete ==="
  print_message "$GREEN" "Repository size has been reduced."
  print_message "$YELLOW" "To rebuild the project, run:"
  print_message "$YELLOW" "  npm run build"
}

# Run the cleanup
main