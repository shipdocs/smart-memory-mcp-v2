# Building the VSIX File Locally

This guide explains how to build the Smart Memory MCP VS Code extension (VSIX file) locally.

## Getting the VSIX File

You have two main options for obtaining the VSIX file:

1. **Download from GitHub Releases**: The easiest way is to download the pre-built VSIX file from the [GitHub Releases page](https://github.com/shipdocs/smart-memory-mcp-v2/releases).

2. **Build locally**: Follow the instructions below to build the VSIX file yourself.

## Prerequisites for Local Building

Before building the extension, ensure you have the following installed:

- **Node.js** (v18 or later) and **npm**
- **Rust** (stable) and **Cargo**
- **Protocol Buffers Compiler** (`protoc`)
- **VS Code Extension Manager** (`vsce`)

### Installing Prerequisites

1. **Node.js and npm**: Download and install from [nodejs.org](https://nodejs.org/)

2. **Rust and Cargo**: Install using [rustup](https://rustup.rs/)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   # or on Windows, download and run rustup-init.exe
   ```

3. **Protocol Buffers Compiler**:
   - Ubuntu/Debian: `sudo apt-get install -y protobuf-compiler`
   - macOS: `brew install protobuf`
   - Windows: `choco install protoc`

4. **VS Code Extension Manager**:
   ```bash
   npm install -g @vscode/vsce
   ```

## Building the VSIX File

You can build the VSIX file using either the automated build script or by following the manual steps.

### Option 1: Using the Automated Build Script (Recommended)

The project includes a build script that handles the entire process:

```bash
# From the project root
node scripts/build-extension.js
```

This script:
1. Builds the core in release mode for your platform
2. Compiles the TypeScript code for the extension
3. Packages everything into a VSIX file

The resulting VSIX file will be located in the `extension` directory.

### Option 2: Manual Build Process

If you prefer to build manually or need more control over the process:

1. **Build the core**:
   ```bash
   # From the project root
   cd core
   cargo build --release
   ```

2. **Copy the core binary to the extension directory**:
   ```bash
   # Create the bin directory if it doesn't exist
   mkdir -p extension/bin

   # For Linux/macOS
   cp core/target/release/smart-memory-mcp-core extension/bin/
   chmod +x extension/bin/smart-memory-mcp-core

   # For Windows
   copy core\target\release\smart-memory-mcp-core.exe extension\bin\
   ```

3. **Build the extension**:
   ```bash
   cd extension
   npm install
   npm run compile
   ```

4. **Package the extension**:
   ```bash
   cd extension
   vsce package
   ```

The resulting VSIX file will be in the `extension` directory with a name like `smart-memory-mcp-extension-0.1.0.vsix`.

## Cross-Platform Building

To build for all platforms (Windows, macOS, and Linux), you can use the cross-platform build script:

```bash
# From the project root
node scripts/build-cross-platform.js
```

This requires appropriate Rust cross-compilation targets to be installed:

```bash
rustup target add x86_64-pc-windows-gnu
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-apple-darwin
```

Note that cross-compilation may require additional system dependencies depending on your host OS.

## Installing the Built Extension

To install the extension you've built:

```bash
code --install-extension extension/smart-memory-mcp-extension-0.1.0.vsix
```

Or open VS Code, go to the Extensions view (Ctrl+Shift+X), click the "..." menu, and select "Install from VSIX...".

## Automated Builds with GitHub Actions

The project uses GitHub Actions to automatically build the extension for all platforms. This is useful for:

1. **Continuous Integration**: Every pull request is automatically built and tested
2. **Releases**: When a new tag is pushed, a release is created with the VSIX file

### GitHub Workflows

The main workflows related to building the extension are:

1. **VSIX Build and Release Workflow** (`.github/workflows/vsix-release.yml`):
   - Dedicated workflow for building and releasing the VSIX file
   - Builds the core and extension
   - Packages the VSIX file
   - Creates a GitHub release
   - Publishes to VS Code Marketplace (if configured)

2. **CI Workflow** (`.github/workflows/ci.yml`):
   - Builds and tests the project on Windows, macOS, and Linux
   - Runs linting and security checks
   - Ensures code quality

### Creating a Release

You have two options for creating a release:

#### Option 1: Using Tags (Recommended)

1. Update the version in `extension/package.json`
2. Commit the changes
3. Create and push a tag:
   ```bash
   git tag v1.0.0  # Replace with your version
   git push origin v1.0.0
   ```

#### Option 2: Manual Trigger

1. Go to the Actions tab in your GitHub repository
2. Select the "VSIX Build and Release" workflow
3. Click "Run workflow"
4. Choose whether to create a draft release or publish immediately
5. Click "Run workflow"

The GitHub Actions workflow will automatically build the VSIX and create a release.

## Troubleshooting

### Common Issues

1. **Missing `vsce` command**:
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Missing Protocol Buffers Compiler**:
   - Error message: `Could not find protoc. If protoc is installed, try setting the PROTOC environment variable to the path of the protoc binary.`
   - Solution: Install protoc as described in the prerequisites section
   - Alternatively, set the PROTOC environment variable: `export PROTOC=/path/to/protoc`

3. **Build errors in the core**:
   - Ensure Rust is properly installed: `rustc --version`
   - Update Rust: `rustup update`
   - Check for missing dependencies (platform-specific)

4. **TypeScript compilation errors**:
   - Ensure Node.js is properly installed: `node --version`
   - Update npm dependencies: `cd extension && npm install`

5. **Permission issues when running the core binary**:
   - Ensure the binary is executable: `chmod +x extension/bin/smart-memory-mcp-core`

### Getting Help

If you encounter issues not covered here, please:
1. Check the project's GitHub issues
2. Open a new issue with detailed information about your problem
