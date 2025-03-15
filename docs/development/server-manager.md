# Smart Memory MCP Server Manager

This package provides solutions to prevent the "Address already in use" issue with the Smart Memory MCP server. The issue occurs when a previous server process doesn't shut down properly, leaving the port occupied but the server unresponsive.

## Two Implementation Options

This package provides two different implementation options:

1. **Node.js Implementation** (`smart-memory-mcp-server-manager.js`): A standalone script that can be used to manage the server process.
2. **Rust Implementation** (`server_manager.rs`): A module that can be integrated directly into the Smart Memory MCP core binary.

## Node.js Implementation

### Features

- Check if a server is already running on the configured port
- Test if the running server is responsive
- Kill old processes and start new ones
- Provide clean shutdown
- Maintain a PID file for tracking the server process
- Log server output to a file

### Integration Steps

1. Copy the `smart-memory-mcp-server-manager.js` file to your project.
2. Make it executable:
   ```bash
   chmod +x smart-memory-mcp-server-manager.js
   ```
3. Update the VSCode extension to use this script instead of directly launching the binary:

```javascript
// In server-manager.js
async startServer() {
  try {
    // Instead of directly spawning the binary
    // this.serverProcess = child_process.spawn(binaryPath, ...);
    
    // Use the server manager script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'smart-memory-mcp-server-manager.js');
    this.serverProcess = child_process.spawn('node', [scriptPath, 'start'], {
      detached: true,
      stdio: 'ignore'
    });
    
    this.serverProcess.unref();
    
    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the server started successfully
    const isRunning = await this.checkServerStatus();
    if (!isRunning) {
      throw new Error('Server failed to start');
    }
    
    this.isRunning = true;
    this.statusBar.updateServerStatus(true);
    return true;
  } catch (error) {
    console.error('Failed to start server:', error);
    this.isRunning = false;
    this.statusBar.updateServerStatus(false);
    throw error;
  }
}

async stopServer() {
  try {
    // Instead of directly killing the process
    // this.serverProcess.kill();
    
    // Use the server manager script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'smart-memory-mcp-server-manager.js');
    child_process.spawnSync('node', [scriptPath, 'stop']);
    
    this.serverProcess = null;
    this.isRunning = false;
    this.statusBar.updateServerStatus(false);
    return true;
  } catch (error) {
    console.error('Failed to stop server:', error);
    throw error;
  }
}
```

### Usage

The script can be used directly from the command line:

```bash
# Start the server
node smart-memory-mcp-server-manager.js start

# Stop the server
node smart-memory-mcp-server-manager.js stop

# Restart the server
node smart-memory-mcp-server-manager.js restart

# Check server status
node smart-memory-mcp-server-manager.js status
```

## Rust Implementation

### Features

- Same features as the Node.js implementation
- Native integration with the Rust binary
- Cross-platform support (Windows, macOS, Linux)
- Command-line interface for server management

### Integration Steps

1. Copy the `server_manager.rs` file to your project's `src` directory.
2. Add the required dependencies to your `Cargo.toml`:

```toml
[dependencies]
dirs = "4.0"
serde_json = "1.0"

# For Unix platforms
[target.'cfg(unix)'.dependencies]
nix = "0.24"

# For Windows platforms
[target.'cfg(windows)'.dependencies]
winapi = { version = "0.3", features = ["processthreadsapi", "handleapi", "winnt"] }
```

3. Modify your `main.rs` to integrate the server manager:

```rust
mod server_manager;

fn main() {
    // Integrate the server manager
    server_manager::integrate_server_manager();
    
    // Continue with normal execution if not a server manager command
    // ...
}
```

### Usage

Once integrated, the binary can be used to manage the server:

```bash
# Start the server
smart-memory-mcp-core start

# Stop the server
smart-memory-mcp-core stop

# Restart the server
smart-memory-mcp-core restart

# Check server status
smart-memory-mcp-core status
```

## Recommended Implementation

For the most robust solution, we recommend:

1. Integrate the Rust implementation into the core binary
2. Update the VSCode extension to use the binary's management commands

This provides a seamless experience with native performance and proper process management.

## Troubleshooting

If you encounter issues with the server not starting:

1. Check the server logs at `~/.smart-memory/server.log`
2. Verify the port configuration in `~/.smart-memory/config.json`
3. Run the status command to check if the server is running and responsive
4. If the server is running but not responsive, try restarting it

## License

This code is provided under the same license as the Smart Memory MCP project.