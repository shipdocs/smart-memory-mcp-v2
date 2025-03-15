# Using Smart Memory MCP on Different Computers

This guide explains how to install and use Smart Memory MCP on a new computer.

## Installation Options

Smart Memory MCP offers two installation methods:

1. **Automatic Setup** (Recommended)
2. **Manual Setup**

Both methods are available through the setup wizard that runs when you first install the extension.

## Prerequisites

- **VS Code**: Version 1.60 or later
- **Git**: For cloning the repository
- **Rust**: Will be automatically installed if not present (requires internet connection)

## Installation Steps

### 1. Get the Extension

Since the extension is not yet available on the VS Code marketplace, you need to:

1. **Download the VSIX file**:
   - From the project's GitHub releases page
   - Or build it from source (see below)

2. **Install the VSIX file**:
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X)
   - Click the "..." menu (top-right)
   - Select "Install from VSIX..."
   - Navigate to the downloaded VSIX file

### 2. Building from Source

If you don't have the VSIX file, you can build it from source:

```bash
# Clone the repository
git clone https://github.com/your-org/smart-memory-mcp.git
cd smart-memory-mcp

# Build the extension
cd extension
npm install
npm run build
npx vsce package
```

This will create a `.vsix` file in the extension directory that you can install.

### 3. First-Time Setup

When you first install the extension, the setup wizard will run automatically. If it doesn't, you can run it manually:

1. Open the command palette (Ctrl+Shift+P)
2. Type "Smart Memory: Run Setup"
3. Select "Smart Memory: Run Setup Wizard"

### 4. Choose Setup Method

The setup wizard will offer two options:

#### Option A: Automatic Setup (Recommended)

This option will:
- Check if Rust is installed and install it if needed
- Clone the core repository
- Build the core components
- Configure all necessary settings

Simply select "Automatic Setup" and follow the prompts. The process takes 2-5 minutes depending on your system.

#### Option B: Manual Setup

This option gives you more control over the installation process:

1. **Server Binary**: Choose to download, build from source, or specify a path
2. **Data Directory**: Choose where to store Smart Memory MCP data
3. **MCP Settings**: Configure the MCP server settings
4. **Auto-Start**: Choose whether to start the server automatically
5. **Start Server**: Choose whether to start the server now

## Project-Specific Configuration

For each project where you want to use Smart Memory MCP:

1. Create a `.smart-memory` directory in your project root
2. Create a `config.json` file with your project-specific settings:

```json
{
  "memory_bank": {
    "categories": {
      "context": { "max_tokens": 10000, "priority": "high" },
      "decision": { "max_tokens": 5000, "priority": "medium" },
      "progress": { "max_tokens": 8000, "priority": "high" }
    },
    "update_triggers": {
      "auto_update": true,
      "umb_command": true
    }
  }
}
```

## Using Smart Memory MCP

### Starting the Server

- The server will start automatically if you enabled auto-start
- Otherwise, use the command "Smart Memory: Start Server"

### Basic Commands

- **Update Memory Bank**: Type `UMB` in a conversation with Roo
- **View Memories**: Open the Memory Explorer view in VS Code
- **Check Server Status**: Look for the Smart Memory indicator in the status bar

## Troubleshooting

If you encounter issues:

1. **Server Won't Start**:
   - Check if port 50051 is in use
   - Run "Smart Memory: Stop Server" and try again
   - Check the logs in the Output panel (select "Smart Memory MCP")

2. **Extension Not Loading**:
   - Verify the VSIX file was installed correctly
   - Try reinstalling the extension
   - Check VS Code logs

3. **Memory Bank Not Working**:
   - Ensure the server is running
   - Check if the UMB command is registered
   - Verify your configuration files

For more detailed troubleshooting, see the [Troubleshooting Guide](./troubleshooting-guide.md).

## Transferring Memories Between Computers

To transfer your memories between computers:

1. **Export Memories**:
   - Locate your memories database (default: `~/.smart-memory/memories.db`)
   - Copy this file to your new computer

2. **Import Memories**:
   - Place the copied database file in the same location on the new computer
   - Restart the server

## Platform-Specific Notes

### Windows

- Ensure you have Visual C++ Build Tools installed if building from source
- Use Windows Terminal or PowerShell for better command execution

### macOS

- You may need to grant permission for the binary to run
- Use `xattr -d com.apple.quarantine /path/to/binary` if Gatekeeper blocks execution

### Linux

- Ensure you have build-essential and libssl-dev installed
- Check file permissions with `chmod +x /path/to/binary`