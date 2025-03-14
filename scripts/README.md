# Smart Memory MCP Installation and Maintenance Scripts

This directory contains scripts for installing, building, and maintaining the Smart Memory MCP project.

## Installation Scripts

### For Unix-based Systems (Linux/macOS)

```bash
./scripts/install.sh
```

This script:
1. Detects your platform (Linux or macOS)
2. Installs Rust if not already installed
3. Installs necessary build dependencies
4. Compiles the core and client components from source
5. Sets up the configuration in `~/.smart-memory/`

### For Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

This script:
1. Checks for required build tools (Visual Studio Build Tools)
2. Installs Rust if not already installed
3. Compiles the core and client components from source
4. Sets up the configuration in `%USERPROFILE%\.smart-memory\`

## Cleanup Scripts

### For Unix-based Systems (Linux/macOS)

```bash
./scripts/cleanup.sh
```

This script:
1. Removes build artifacts from `target` directories
2. Cleans up pre-compiled binaries in `extension/bin`
3. Removes `node_modules` directories
4. Deletes `.vsix` files

### For Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cleanup.ps1
```

This script performs the same cleanup operations as the Unix version but for Windows.

## Build Scripts

### Build Extension

```bash
node scripts/build-extension.js
```

This script:
1. Builds the core component for all supported platforms
2. Compiles the TypeScript code for the extension
3. Packages the extension as a VSIX file

### Copy Installation Scripts

```bash
node scripts/copy-install-scripts.js
```

This script copies the installation scripts to the extension directory during the build process.

## Usage in VS Code Extension

The VS Code extension will automatically detect if the Smart Memory MCP binaries are missing and offer to compile them from source using these scripts.

## Requirements

- **Linux/macOS**: Build tools (gcc, make), OpenSSL development libraries
- **Windows**: Visual Studio Build Tools with C++ support
- **All Platforms**: Node.js 14+, Rust toolchain (will be installed if missing)