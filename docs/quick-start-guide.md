# Smart Memory MCP Quick Start Guide

This guide provides a quick overview of how to get started with Smart Memory MCP.

## Installation

### Prerequisites

- VS Code 1.60 or later
- Roo-Code Extension

### Option 1: Automatic Setup (Recommended)

1. **Get the VSIX file**:
   - Download from GitHub releases or build from source

2. **Install the VSIX**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Click "..." → "Install from VSIX..."
   - Select the downloaded VSIX file

3. **Run the Setup**:
   - Restart VS Code
   - When prompted, select "Automatic Setup"
   - Wait for the setup to complete (2-5 minutes)

That's it! The automatic setup will:
- Install Rust if needed
- Clone and build the core components
- Configure all necessary settings

## Basic Usage

### Starting the Server

The server will start automatically if you enabled auto-start. Otherwise:

1. Open the command palette (Ctrl+Shift+P)
2. Type "Smart Memory: Start Server"
3. Press Enter

### Using the Memory Bank

To store the current context in the memory bank:

1. Type `UMB` in a conversation with Roo
2. Wait for the confirmation message

### Viewing Memories

To view stored memories:

1. Click the Smart Memory icon in the activity bar
2. Browse memories by category and date

## Key Commands

- **UMB**: Update Memory Bank (in chat)
- **Smart Memory: Start Server**: Start the server
- **Smart Memory: Stop Server**: Stop the server
- **Smart Memory: Run Setup**: Run the setup wizard
- **Smart Memory: Store Selection as Memory**: Store selected text

## Troubleshooting

If you encounter issues:

1. Check the server status in the status bar
2. Try restarting the server
3. Run the setup wizard again

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting-guide.md).

## Next Steps

- [Cross-Platform Usage Guide](cross-platform-usage.md): Using Smart Memory MCP on different computers
- [Server Management](usage/server-management.md): Managing the server
- [UMB Command](usage/umb-command.md): Using the Update Memory Bank command