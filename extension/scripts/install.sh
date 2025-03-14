#!/bin/bash
# Smart Memory MCP Installation Script
# This script handles the installation of Smart Memory MCP components
# by compiling them from source rather than using pre-compiled binaries.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform
detect_platform() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macos"
  else
    echo "unknown"
  fi
}

# Print colored message
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Install Rust if not already installed
install_rust() {
  if ! command_exists rustc; then
    print_message "$YELLOW" "Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    print_message "$GREEN" "Rust installed successfully!"
  else
    print_message "$GREEN" "Rust is already installed."
  fi
}

# Check and install build dependencies
install_dependencies() {
  local platform=$(detect_platform)
  
  print_message "$BLUE" "Checking dependencies for $platform..."
  
  if [[ "$platform" == "linux" ]]; then
    if command_exists apt-get; then
      print_message "$YELLOW" "Installing build dependencies with apt..."
      sudo apt-get update
      sudo apt-get install -y build-essential pkg-config libssl-dev
    elif command_exists dnf; then
      print_message "$YELLOW" "Installing build dependencies with dnf..."
      sudo dnf install -y gcc gcc-c++ openssl-devel
    elif command_exists pacman; then
      print_message "$YELLOW" "Installing build dependencies with pacman..."
      sudo pacman -S --needed base-devel openssl
    else
      print_message "$RED" "Unsupported package manager. Please install build dependencies manually."
      exit 1
    fi
  elif [[ "$platform" == "macos" ]]; then
    if ! command_exists brew; then
      print_message "$YELLOW" "Homebrew not found. Installing Homebrew..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    print_message "$YELLOW" "Installing build dependencies with brew..."
    brew install openssl@3
  else
    print_message "$RED" "Unsupported platform: $platform"
    exit 1
  fi
  
  print_message "$GREEN" "Dependencies installed successfully!"
}

# Build the core component
build_core() {
  print_message "$BLUE" "Building Smart Memory MCP Core..."
  
  cd "$(dirname "$0")/../core"
  cargo build --release
  
  print_message "$GREEN" "Core built successfully!"
}

# Build the client component
build_client() {
  print_message "$BLUE" "Building Smart Memory MCP Client..."
  
  cd "$(dirname "$0")/../client"
  cargo build --release
  
  print_message "$GREEN" "Client built successfully!"
}

# Setup configuration
setup_config() {
  local platform=$(detect_platform)
  local config_dir="$HOME/.smart-memory"
  local bin_dir="$config_dir/bin"
  
  print_message "$BLUE" "Setting up configuration..."
  
  # Create config directory
  mkdir -p "$config_dir"
  mkdir -p "$bin_dir"
  
  # Copy binaries
  cp "$(dirname "$0")/../core/target/release/smart-memory-mcp-core" "$bin_dir/"
  cp "$(dirname "$0")/../client/target/release/smart-memory-mcp-client" "$bin_dir/"
  
  # Make binaries executable
  chmod +x "$bin_dir/smart-memory-mcp-core"
  chmod +x "$bin_dir/smart-memory-mcp-client"
  
  # Create default config if it doesn't exist
  if [ ! -f "$config_dir/config.json" ]; then
    cat > "$config_dir/config.json" << EOF
{
  "core": {
    "binaryPath": "$bin_dir/smart-memory-mcp-core",
    "dataPath": "$config_dir/data",
    "logPath": "$config_dir/logs"
  },
  "client": {
    "binaryPath": "$bin_dir/smart-memory-mcp-client",
    "serverUrl": "http://localhost:3000"
  }
}
EOF
  fi
  
  # Create data and logs directories
  mkdir -p "$config_dir/data"
  mkdir -p "$config_dir/logs"
  
  print_message "$GREEN" "Configuration set up successfully!"
}

# Main installation process
main() {
  print_message "$BLUE" "=== Smart Memory MCP Installation ==="
  
  # Check platform
  local platform=$(detect_platform)
  if [[ "$platform" == "unknown" ]]; then
    print_message "$RED" "Unsupported platform. This script supports Linux and macOS only."
    exit 1
  fi
  
  print_message "$BLUE" "Detected platform: $platform"
  
  # Install Rust
  install_rust
  
  # Install dependencies
  install_dependencies
  
  # Build components
  build_core
  build_client
  
  # Setup configuration
  setup_config
  
  print_message "$GREEN" "=== Installation Complete ==="
  print_message "$GREEN" "Smart Memory MCP has been installed successfully!"
  print_message "$BLUE" "Binaries location: $HOME/.smart-memory/bin"
  print_message "$BLUE" "Configuration: $HOME/.smart-memory/config.json"
  print_message "$YELLOW" "To use with VS Code, install the Smart Memory MCP extension."
}

# Run the installation
main