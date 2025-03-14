# Smart Memory MCP Setup Wizard

The Smart Memory MCP extension includes a setup wizard that guides you through the process of setting up the server. This document describes how to use the setup wizard.

## Running the Setup Wizard

To run the setup wizard, use the **Smart Memory: Run Setup** command from the VS Code command palette (Ctrl+Shift+P or Cmd+Shift+P).

The setup wizard will guide you through the following steps:

## Step 1: Server Binary

The wizard will check if the server binary exists. If it doesn't, you'll be presented with the following options:

- **Download Binary**: Download a pre-built binary for your platform
- **Build from Source**: Build the binary from source code
- **Specify Path**: Specify the path to an existing binary

### Download Binary

If you choose to download the binary, the wizard will download a pre-built binary for your platform and extract it to the appropriate location.

### Build from Source

If you choose to build from source, the wizard will:

1. Ask you to select the source directory
2. Open a terminal and run the build command
3. Wait for you to confirm that the build is complete
4. Update the custom binary path setting

### Specify Path

If you choose to specify the path, the wizard will:

1. Open a file picker dialog
2. Allow you to select the server binary
3. Update the custom binary path setting

## Step 2: Data Directory

The wizard will ask you where you want to store the Smart Memory MCP data:

- **Use Default**: Use the default data directory (`~/.smart-memory`)
- **Specify Path**: Specify a custom data directory

If you choose to specify a custom path, the wizard will:

1. Open a folder picker dialog
2. Allow you to select a directory
3. Update the custom data path setting

## Step 3: MCP Settings

The wizard will configure the MCP settings for both VS Code and the Claude desktop app (if installed). This includes:

- Setting up the server configuration
- Creating a default configuration file
- Registering the server with the MCP system

## Step 4: Auto-Start

The wizard will ask if you want the server to start automatically when VS Code starts:

- **Yes**: Enable auto-start
- **No**: Disable auto-start

## Step 5: Start Server

Finally, the wizard will ask if you want to start the server now:

- **Start Server**: Start the server
- **Skip**: Don't start the server

## Completion

Once the setup is complete, you'll see a success message. Some changes may require restarting VS Code to take effect.

## Running the Setup Wizard Again

You can run the setup wizard again at any time to reconfigure the server. This can be useful if:

- You want to change the data directory
- You want to use a different server binary
- You want to change the auto-start setting
- You're having issues with the server

## Troubleshooting

If you encounter issues during setup, check the VS Code output panel for error messages (View > Output, then select "Smart Memory MCP" from the dropdown).

Common issues include:

- Permission denied when trying to execute the server binary
- Port already in use by another process
- Insufficient disk space
- Network issues when downloading the binary

If you continue to have issues, try running the setup wizard again with different options.