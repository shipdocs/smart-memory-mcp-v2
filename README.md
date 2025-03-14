# Smart Memory MCP

Smart Memory MCP is an intelligent memory management system for Roo-Code that provides persistent context across sessions. It integrates with Roo-Code as an MCP server to enhance the AI assistant's memory capabilities.

## Features

- **Memory Bank**: Store and retrieve memories in different categories (context, decision, progress, etc.)
- **Accurate Token Counting**: Precisely measure token usage for optimal context management
- **Context Relevance Scoring**: Prioritize the most relevant memories based on the current mode
- **Memory Optimization**: Automatically optimize memory usage to stay within token budgets
- **Persistent Context**: Maintain context across sessions for improved continuity
- **Enhanced Server Management**: Start, stop, and restart the server directly from VS Code
- **Setup Wizard**: User-friendly setup process with guided configuration
- **Server Status Indicator**: Visual indicator of server status in the VS Code status bar

## Installation

### Prerequisites

- [VS Code](https://code.visualstudio.com/)
- [Roo-Code Extension](https://marketplace.visualstudio.com/items?itemName=rooveterinaryinc.roo-cline)

For source-based installation (recommended):
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/)
- Platform-specific build tools:
  - **Linux**: gcc, make, OpenSSL development libraries
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools with C++ support

### Option 1: Install from VS Code Extension Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "Smart Memory MCP"
4. Click "Install"
5. Restart VS Code

The extension will automatically detect if you need to compile the Smart Memory MCP components from source and guide you through the process.

### Option 2: Component-Based Installation

This new approach compiles the components from source for optimal performance on your platform:

1. Install the extension from the marketplace or VSIX file
2. When prompted, choose to compile from source
3. The extension will run the appropriate installation script for your platform:
   - **Linux/macOS**: `scripts/install.sh`
   - **Windows**: `scripts/install.ps1`

This approach provides:
- Platform-optimized builds
- Reduced extension size
- Better performance
- Customization options

For more details, see [Component-Based Deployment](docs/architecture/component-based-deployment.md).

### Option 3: Manual Build from Source

1. Clone the repository:
   ```
   git clone https://github.com/example/smart-memory-mcp.git
   cd smart-memory-mcp
   ```

2. Run the installation script for your platform:
   ```bash
   # Linux/macOS
   ./scripts/install.sh
   
   # Windows (PowerShell)
   powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
   ```

3. Build and install the extension:
   ```
   node scripts/build-extension.js
   code --install-extension extension/smart-memory-mcp-extension-0.1.0.vsix
   ```

4. Restart VS Code

For more information about the installation scripts, see [Installation Scripts](scripts/README.md).

## Usage

Once installed, the Smart Memory MCP system will be automatically configured for Roo-Code. You can use the following features:

### Memory Bank

The Memory Bank allows you to store and retrieve memories in different categories:

- **Context**: Current session state and focus
- **Decision**: Technical decisions and rationale
- **Progress**: Work progress and tasks
- **Product**: Project overview and knowledge
- **Pattern**: System patterns and standards

### UMB Command

The UMB (Update Memory Bank) command allows you to manually trigger an update to the memory bank. Simply type "UMB" in the chat with Roo-Code, and it will store the current context in the memory bank.

This is useful when you want to make sure important information is saved to the memory bank for future reference. The UMB command will store the current context in multiple categories (context, decision, progress) to ensure it's available in different modes.

### Commands

- **Smart Memory: Store Selection as Memory**: Store selected text as a memory
- **Smart Memory: Retrieve Memory**: Retrieve a specific memory
- **Smart Memory: Optimize Memory Usage**: Manually optimize memory usage
- **Smart Memory: Get Context for Current Mode**: Get context for the current mode
- **Smart Memory: Switch Mode**: Switch to a different mode
- **Smart Memory: Show Usage Metrics**: Show memory usage metrics
- **Smart Memory: Run Setup**: Run the setup wizard to configure the system
- **Smart Memory: Start Server**: Start the Smart Memory MCP server
- **Smart Memory: Stop Server**: Stop the Smart Memory MCP server
- **Smart Memory: Restart Server**: Restart the Smart Memory MCP server

### Views

- **Memory Explorer**: Browse memories by category and date
- **Memory Metrics**: View memory usage statistics

### Server Management

The Smart Memory MCP extension includes a robust server management system:

- **Start, Stop, Restart**: Control the server directly from VS Code
- **Setup Wizard**: User-friendly setup process with guided configuration
- **Status Indicator**: Visual indicator of server status in the VS Code status bar
- **Auto-Start**: Automatically start the server when VS Code starts
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

For more details, see:
- [Server Management](docs/usage/server-management.md)
- [Setup Wizard](docs/usage/setup-wizard.md)
- [Server Management Architecture](docs/architecture/server-management.md)

## Configuration

### VS Code Settings

The Smart Memory MCP system can be configured through the VS Code settings:

- **Smart Memory MCP > Server Address**: Address of the Smart Memory MCP server (default: localhost:50051)
- **Smart Memory MCP > Auto Optimize**: Automatically optimize memory usage (default: true)
- **Smart Memory MCP > Max Tokens**: Maximum number of tokens to use for context (default: 2000)
- **Smart Memory MCP > Auto Start Server**: Automatically start the server when VS Code starts (default: true)
- **Smart Memory MCP > Check Server Interval**: How often to check if the server is running, in milliseconds (default: 30000)
- **Smart Memory MCP > Custom Binary Path**: Path to a custom server binary
- **Smart Memory MCP > Custom Data Path**: Path to a custom data directory

### Roo Mode Configuration

The Smart Memory MCP project includes custom configuration files for Roo-Code that enhance its capabilities with Smart Memory MCP-specific knowledge and behaviors:

1. Install the configuration files using the provided script:
   ```bash
   # From the root of your Smart Memory MCP project
   node scripts/install-roo-modes.js
   ```

   Or manually copy the files:
   ```bash
   # From the root of your Smart Memory MCP project
   cp config/roo-modes/.clinerules-* .
   cp config/roo-modes/.roomodes .
   ```

2. These files provide:
   - **UMB Command Integration**: Seamless integration with the Smart Memory MCP server
   - **Mode-Specific Behaviors**: Tailored behaviors for each mode (Code, Architect, Ask, Debug, Test)
   - **Memory Bank Management**: Smart features for managing memory bank files
   - **Project-Specific Knowledge**: Built-in understanding of Smart Memory MCP concepts

For more details, see [Roo Mode Configuration](docs/usage/roo-mode-configuration.md).

## Troubleshooting

If you encounter issues with the Smart Memory MCP system:

1. Check the server status in the VS Code status bar
2. Try restarting the server using the "Smart Memory: Restart Server" command
3. Run the "Smart Memory: Run Setup" command to reconfigure the system
4. Check the VS Code output panel for error messages
5. Verify that the Roo-Code extension is installed and activated
6. Check if the server binary exists and is executable
7. Check if the data directory exists and is writable
8. Check if the port is already in use by another process
9. Restart VS Code

For more detailed troubleshooting information, see [Server Management](docs/usage/server-management.md).

## Development

### Project Structure

- **core/**: Rust implementation of the Smart Memory MCP server
- **extension/**: VS Code extension for the Smart Memory MCP system
- **client/**: Client library for interacting with the Smart Memory MCP server
- **docs/**: Documentation for the Smart Memory MCP system
- **scripts/**: Build, installation, and maintenance scripts
- **config/**: Configuration templates and defaults

### Component-Based Architecture

The Smart Memory MCP project now uses a component-based architecture that:

1. Compiles components from source for optimal performance
2. Reduces repository size by eliminating pre-compiled binaries
3. Provides platform-specific optimizations
4. Enables flexible deployment options

For more details, see [Component-Based Deployment](docs/architecture/component-based-deployment.md).

### Building

To build the project:

```bash
# Full build including extension packaging
node scripts/build-extension.js

# Build core component only
cd core && cargo build --release

# Build client component only
cd client && cargo build --release
```

### Cleanup

To clean up build artifacts and reduce repository size:

```bash
# Linux/macOS
./scripts/cleanup.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File .\scripts\cleanup.ps1
```

### Installation Scripts

The project includes installation scripts that handle:

- Platform detection
- Dependency installation
- Source compilation
- Configuration setup

For more information, see [Installation Scripts](scripts/README.md).

### Testing

To test the Smart Memory MCP system:

```bash
# Basic functionality test
node test-memory.js

# Run Rust tests
cd core && cargo test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
