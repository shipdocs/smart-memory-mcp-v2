# Smart Memory MCP Server Shutdown Handling

This document explains how the Smart Memory MCP server handles shutdown and cleanup processes, ensuring data integrity and resource release during normal and abnormal termination scenarios.

## Table of Contents

1. [Overview](#overview)
2. [Normal Shutdown Process](#normal-shutdown-process)
3. [Abnormal Termination Handling](#abnormal-termination-handling)
4. [Parent Process Monitoring](#parent-process-monitoring)
5. [Resource Cleanup](#resource-cleanup)
6. [Data Integrity Protection](#data-integrity-protection)
7. [Crash Recovery](#crash-recovery)
8. [Configuration Options](#configuration-options)
9. [Best Practices](#best-practices)

## Overview

The Smart Memory MCP server implements robust shutdown handling to ensure:

- Clean release of system resources
- Protection of data integrity
- Proper handling of in-flight operations
- Automatic recovery from crashes
- Graceful termination in response to signals

This is particularly important for a memory management system where data loss or corruption could impact user experience and productivity.

## Normal Shutdown Process

### Shutdown Sequence

When the server receives a shutdown command (`smart-memory-mcp stop`), the following sequence occurs:

1. **Signal Reception**: The server receives a SIGTERM (Linux/macOS) or equivalent Windows signal
2. **Request Handling Pause**: New requests are rejected with a "shutting down" status
3. **In-flight Operation Completion**: The server waits for in-progress operations to complete (with a configurable timeout)
4. **Database Finalization**: All database transactions are committed and connections closed
5. **Memory Flush**: Any in-memory data is persisted to disk
6. **Resource Release**: System resources (file handles, network sockets) are released
7. **PID File Cleanup**: The process ID file is removed
8. **Exit**: The process terminates with a success code

### Shutdown Command

To initiate a normal shutdown:

```bash
smart-memory-mcp stop
```

This command:
1. Identifies the running server process
2. Sends the appropriate termination signal
3. Waits for the process to exit
4. Verifies the port is released
5. Reports success or failure

### Shutdown Timeout

The server includes a configurable shutdown timeout to prevent hanging:

```json
{
  "server": {
    "shutdown_timeout_seconds": 30
  }
}
```

If in-flight operations don't complete within this timeout, the server will force termination.

## Abnormal Termination Handling

### Signal Handling

The server registers handlers for the following signals:

- **SIGINT** (Ctrl+C): Initiates graceful shutdown
- **SIGTERM**: Initiates graceful shutdown
- **SIGHUP** (Linux/macOS): Reloads configuration without shutdown
- **SIGQUIT** (Linux/macOS): Dumps diagnostic information and continues

### Crash Detection

The server implements a crash detection mechanism:

1. A crash recovery manager monitors the server process
2. If the process terminates unexpectedly, the recovery manager:
   - Logs the crash details
   - Performs database integrity checks
   - Attempts to restart the server (if configured)
   - Notifies the user via the VS Code extension

### Watchdog Process

A watchdog process monitors the server's health:

1. Periodically checks if the server is responsive
2. If unresponsive, logs the issue and attempts recovery
3. After multiple failures, enters safe mode to prevent data corruption

## Parent Process Monitoring

### VS Code Integration

When launched from VS Code, the server monitors the parent VS Code process:

1. The VS Code process ID is passed to the server at startup
2. The server periodically checks if the parent process is still running
3. If the parent process terminates, the server initiates shutdown

This prevents orphaned server processes when VS Code closes.

### Implementation Details

#### Windows Implementation

```rust
// Windows parent process monitoring
if let Ok(parent_pid_str) = env::var("VSCODE_PID") {
    if let Ok(parent_pid) = parent_pid_str.parse::<u32>() {
        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(5));
                if !is_process_running(parent_pid) {
                    log_info!("server", "Parent process terminated, initiating shutdown");
                    // Initiate shutdown
                    SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                    break;
                }
            }
        });
    }
}
```

#### Linux/macOS Implementation

```rust
// Unix parent process monitoring
if let Ok(parent_pid_str) = env::var("VSCODE_PID") {
    if let Ok(parent_pid) = parent_pid_str.parse::<i32>() {
        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(5));
                if kill(Pid::from_raw(parent_pid), None).is_err() {
                    log_info!("server", "Parent process terminated, initiating shutdown");
                    // Initiate shutdown
                    SHUTDOWN_REQUESTED.store(true, Ordering::SeqCst);
                    break;
                }
            }
        });
    }
}
```

## Resource Cleanup

### File Handles

The server tracks all open file handles and ensures they are properly closed during shutdown:

1. Database connections
2. Log files
3. Configuration files
4. Temporary files

### Network Resources

Network resources are properly released:

1. The gRPC server is shut down gracefully
2. All active connections are closed with proper status codes
3. The listening socket is released

### Temporary Files

Any temporary files created during operation are cleaned up:

1. Temporary backup files
2. Export/import buffers
3. Diagnostic dumps

## Data Integrity Protection

### Transaction Management

All database operations use transactions to ensure consistency:

1. In-flight transactions are either committed or rolled back during shutdown
2. The database is left in a consistent state
3. Write-ahead logging (WAL) ensures recoverability

### Automatic Backups

Before potentially destructive operations, automatic backups are created:

1. Before major version upgrades
2. Before database schema changes
3. Before bulk operations

### Journal Files

SQLite journal files are properly managed:

1. Journal files are retained until successful shutdown
2. During crash recovery, journal files are used to recover uncommitted transactions
3. After successful recovery, journal files are cleaned up

## Crash Recovery

### Recovery Process

The crash recovery system follows these steps:

1. **Detection**: Identify that a crash occurred (via PID file presence but process absence)
2. **Logging**: Record crash details for diagnostics
3. **Database Check**: Verify database integrity
4. **Repair**: Attempt automatic repair if corruption is detected
5. **Restart**: Restart the server process
6. **Notification**: Notify the user of the crash and recovery status

### Recovery Configuration

Recovery behavior can be configured:

```json
{
  "recovery": {
    "enabled": true,
    "max_restart_attempts": 3,
    "restart_delay_seconds": 5,
    "auto_repair": true
  }
}
```

## Configuration Options

### Shutdown-Related Configuration

The following configuration options affect shutdown behavior:

| Option | Description | Default |
|--------|-------------|---------|
| `server.shutdown_timeout_seconds` | Maximum time to wait for graceful shutdown | 30 |
| `server.force_kill_timeout_seconds` | Time after which to force kill if shutdown fails | 10 |
| `recovery.enabled` | Enable crash recovery | true |
| `recovery.max_restart_attempts` | Maximum number of automatic restart attempts | 3 |
| `recovery.restart_delay_seconds` | Delay between restart attempts | 5 |
| `recovery.auto_repair` | Attempt automatic database repair | true |
| `monitoring.parent_process_check_interval_seconds` | Interval for checking parent process | 5 |

### Example Configuration

```json
{
  "server": {
    "shutdown_timeout_seconds": 30,
    "force_kill_timeout_seconds": 10
  },
  "recovery": {
    "enabled": true,
    "max_restart_attempts": 3,
    "restart_delay_seconds": 5,
    "auto_repair": true
  },
  "monitoring": {
    "parent_process_check_interval_seconds": 5
  }
}
```

## Best Practices

### For Developers

1. **Always use the provided commands** for starting and stopping the server
2. **Don't kill the process directly** unless absolutely necessary
3. **Check logs after abnormal termination** for diagnostic information
4. **Configure automatic backups** to prevent data loss
5. **Test shutdown handling** during development

### For Users

1. **Use the VS Code extension controls** to start and stop the server
2. **Allow the server to shut down gracefully** when closing VS Code
3. **Check the status bar indicator** for server status
4. **Review logs** if you encounter issues
5. **Configure recovery options** based on your needs

### For System Administrators

1. **Monitor server logs** for crash patterns
2. **Configure appropriate resource limits** to prevent OOM kills
3. **Set up external monitoring** for production deployments
4. **Implement regular backups** beyond the automatic ones
5. **Test recovery procedures** periodically