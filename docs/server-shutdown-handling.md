# Server Shutdown Handling

This document describes the improved server shutdown handling mechanism implemented in the Smart Memory MCP project.

## Problem

When VS Code is closed, the Smart Memory MCP server was not being properly shut down, leading to:

1. The server process continuing to run in the background
2. The port (50051) remaining in use
3. Subsequent VS Code sessions failing to start a new server due to the port being in use

## Solution

We've implemented a robust server shutdown mechanism with multiple layers of protection:

### 1. VS Code Extension Deactivation

When the VS Code extension is deactivated (e.g., when VS Code is closed), the `deactivate` function in `extension.ts` now:

- Attempts to gracefully stop the server using the `smartMemory.stopServer` command
- Waits for the server to shut down
- Checks if the port is still in use and forcefully kills any process using it as a last resort

### 2. Improved Server Manager

The `ServerManager` class in `server-manager.ts` now has an enhanced `stopServer` method that:

- Checks if the server is actually running before attempting to stop it
- Verifies the server has stopped by checking if the port is free
- Forcefully kills any process using the port if the graceful shutdown fails

### 3. Robust Process Killing

The `killServer` function in `smart-memory-mcp-server-manager.js` now:

- First attempts to terminate the process gracefully with SIGTERM
- Waits to see if the process exits
- If not, forcefully kills the process with SIGKILL (or taskkill /F on Windows)
- Verifies the process is actually dead
- Checks if the port is free and attempts to kill any process still using it

### 4. Parent Process Monitoring

The server process now monitors its parent process (VS Code) and automatically shuts down when the parent process exits:

- On Windows, we use a dedicated shutdown handler process that monitors the VS Code process
- On Unix systems, we use signal handlers to catch termination signals
- The server checks for the VSCODE_PID environment variable to monitor the parent process

### 5. PID File Management

Improved PID file management ensures:

- PID files are properly cleaned up when the server stops
- Stale PID files are detected and removed
- The PID file is used to track the server process across sessions

## Implementation Details

### Core Server (Rust)

- Added global shutdown flag to track shutdown status
- Improved signal handling for SIGTERM and SIGINT
- Added parent process monitoring
- Enhanced PID file management

### Server Manager (JavaScript)

- Made process killing asynchronous with proper Promise handling
- Added port checking to verify server shutdown
- Implemented forceful process killing as a fallback
- Added logging for better debugging

### VS Code Extension

- Enhanced deactivation handling
- Added port checking and forceful process killing
- Improved error handling and logging

## Testing

To test the shutdown handling:

1. Start VS Code with the Smart Memory MCP extension
2. Verify the server starts correctly
3. Close VS Code
4. Check if any server process is still running (`ps aux | grep smart-memory` on Unix, Task Manager on Windows)
5. Check if port 50051 is still in use (`lsof -i :50051` on Unix, `netstat -ano | findstr :50051` on Windows)
6. Start VS Code again and verify a new server starts without errors

## Future Improvements

- Add a watchdog process to monitor the server and restart it if it crashes
- Implement graceful shutdown with timeout for long-running operations
- Add telemetry to track server lifecycle events