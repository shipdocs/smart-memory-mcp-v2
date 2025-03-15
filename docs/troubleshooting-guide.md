# Smart Memory MCP Troubleshooting Guide

This guide provides solutions for common issues you might encounter when using the Smart Memory MCP system. If you're experiencing problems, follow the steps below to diagnose and resolve them.

## Table of Contents

1. [Server Issues](#server-issues)
2. [Connection Problems](#connection-problems)
3. [VS Code Extension Issues](#vs-code-extension-issues)
4. [Memory Storage Issues](#memory-storage-issues)
5. [Performance Problems](#performance-problems)
6. [Update and Installation Issues](#update-and-installation-issues)
7. [Backup and Recovery](#backup-and-recovery)
8. [Common Error Messages](#common-error-messages)
9. [Advanced Troubleshooting](#advanced-troubleshooting)
   - [Diagnostic Mode](#diagnostic-mode)
   - [Log Analysis](#log-analysis)
   - [Database Inspection](#database-inspection)
   - [Network Diagnostics](#network-diagnostics)
   - [Cleanup Orphaned Processes](#cleanup-orphaned-processes)
10. [Getting Help](#getting-help)

## Server Issues

### Server Won't Start

**Symptoms:**
- Error message: "Failed to start server"
- VS Code extension shows "Server not running" status
- Command `smart-memory-mcp status` shows "Server is not running"

**Possible Causes and Solutions:**

1. **Port already in use**
   - **Symptom:** Error message: "Port 50051 is already in use"
   - **Solution:** 
     - Check if another instance of the server is running: `smart-memory-mcp status`
     - If another process is using the port, change the port in your configuration file
     - Alternatively, stop the process using the port: `lsof -i :50051` (Linux/macOS) or `netstat -ano | findstr :50051` (Windows) to find the process, then stop it

2. **Insufficient permissions**
   - **Symptom:** Error message: "Permission denied"
   - **Solution:**
     - Ensure you have write permissions to the data directory
     - On Linux/macOS: `chmod -R 755 ~/.smart-memory`
     - On Windows: Check folder properties and ensure your user has write access

3. **Corrupted data files**
   - **Symptom:** Error message: "Database file is corrupted"
   - **Solution:**
     - Restore from a backup: `smart-memory-mcp restore`
     - If no backup is available, rename or move the database file and let the system create a new one

4. **Missing dependencies**
   - **Symptom:** Error message: "Failed to load library" or similar
   - **Solution:**
     - Reinstall the application: `./install.sh` or `.\install.ps1`
     - Check system requirements and install any missing dependencies

### Server Crashes Frequently

**Symptoms:**
- Server stops unexpectedly
- Log files show error messages before termination
- VS Code extension shows "Server not running" status after being connected

**Possible Causes and Solutions:**

1. **Memory issues**
   - **Symptom:** Error message: "Out of memory" or similar
   - **Solution:**
     - Reduce the `max_memory_size_mb` setting in your configuration
     - Close other memory-intensive applications
     - Consider upgrading your system's RAM

2. **Database corruption**
   - **Symptom:** Error message: "Database error" or "SQLite error"
   - **Solution:**
     - Run database optimization: `smart-memory-mcp optimize`
     - Restore from a backup: `smart-memory-mcp restore`

3. **Conflicting processes**
   - **Symptom:** Server crashes when certain applications are running
   - **Solution:**
     - Identify and close conflicting applications
     - Run the server on a different port

4. **System resource limitations**
   - **Symptom:** Server crashes under heavy load
   - **Solution:**
     - Reduce the `max_connections` setting
     - Implement request throttling in your configuration

## Connection Problems

### VS Code Extension Can't Connect to Server

**Symptoms:**
- VS Code extension shows "Disconnected" status
- Error message: "Failed to connect to server"
- Memory features are unavailable

**Possible Causes and Solutions:**

1. **Server not running**
   - **Solution:**
     - Start the server: `smart-memory-mcp start`
     - Check server status: `smart-memory-mcp status`

2. **Port mismatch**
   - **Solution:**
     - Ensure the port in VS Code settings matches the server port
     - Default port is 50051; check both server and extension configurations

3. **Firewall blocking connection**
   - **Solution:**
     - Add an exception for the Smart Memory MCP server in your firewall
     - Temporarily disable the firewall to test if it's the cause

4. **Network configuration issues**
   - **Solution:**
     - Ensure the server is listening on the correct interface
     - If using a remote server, check network connectivity

### Connection Timeouts

**Symptoms:**
- Operations take a long time and eventually fail
- Error message: "Connection timeout"
- Intermittent connectivity

**Possible Causes and Solutions:**

1. **Server overloaded**
   - **Solution:**
     - Reduce the number of concurrent connections
     - Optimize memory usage settings
     - Restart the server: `smart-memory-mcp restart`

2. **Network latency**
   - **Solution:**
     - If using a remote server, check network quality
     - Increase timeout settings in the configuration

3. **Resource contention**
   - **Solution:**
     - Close other applications using significant system resources
     - Restart the computer if the problem persists

## VS Code Extension Issues

### Extension Not Loading

**Symptoms:**
- Smart Memory icon doesn't appear in VS Code
- No Smart Memory commands available in the command palette
- Error messages in VS Code Developer Tools console

**Possible Causes and Solutions:**

1. **Extension not installed correctly**
   - **Solution:**
     - Reinstall the extension: `code --install-extension smart-memory-mcp.vsix`
     - Check VS Code extensions panel to verify installation

2. **VS Code version incompatibility**
   - **Solution:**
     - Update VS Code to the latest version
     - Check minimum VS Code version requirements

3. **Extension conflicts**
   - **Solution:**
     - Temporarily disable other extensions to identify conflicts
     - Update all extensions to their latest versions

### Memory Bank Commands Not Working

**Symptoms:**
- "Update Memory Bank" command doesn't respond
- Error message when trying to access memory features
- Memory explorer view is empty

**Possible Causes and Solutions:**

1. **Server connection issues**
   - **Solution:**
     - Check server status and connection as described above
     - Restart the extension host: Ctrl+Shift+P > "Developer: Reload Window"

2. **Permission issues**
   - **Solution:**
     - Check file permissions for the memory storage directory
     - Ensure the extension has necessary permissions

3. **Configuration problems**
   - **Solution:**
     - Reset extension settings to defaults
     - Check for syntax errors in settings.json

## Memory Storage Issues

### Memory Not Being Saved

**Symptoms:**
- Updates to memory bank don't persist
- Memory explorer shows outdated or no information
- No error messages, but changes aren't saved

**Possible Causes and Solutions:**

1. **Database write permissions**
   - **Solution:**
     - Check file permissions for the database file
     - Ensure the server process has write access

2. **Disk space issues**
   - **Solution:**
     - Check available disk space
     - Clean up unnecessary files or increase available space

3. **Database locks**
   - **Solution:**
     - Restart the server to release any locks
     - Check for other processes accessing the database

### Memory Corruption

**Symptoms:**
- Garbled or incomplete memory entries
- Error messages when accessing certain memories
- Inconsistent behavior when retrieving memories

**Possible Causes and Solutions:**

1. **Database corruption**
   - **Solution:**
     - Restore from a backup: `smart-memory-mcp restore`
     - Run database repair: `smart-memory-mcp repair`

2. **Concurrent access issues**
   - **Solution:**
     - Ensure only one server instance is accessing the database
     - Implement proper locking mechanisms if using custom integrations

3. **Disk errors**
   - **Solution:**
     - Run disk check utilities on your system
     - Move the database to a different disk if problems persist

## Performance Problems

### Slow Response Times

**Symptoms:**
- Operations take longer than expected
- UI feels sluggish
- High CPU or memory usage

**Possible Causes and Solutions:**

1. **Large memory database**
   - **Solution:**
     - Optimize the database: `smart-memory-mcp optimize`
     - Archive old memories: `smart-memory-mcp archive --older-than 90d`

2. **Resource constraints**
   - **Solution:**
     - Close other resource-intensive applications
     - Increase system resources (RAM, CPU) if possible
     - Adjust server configuration for better performance

3. **Inefficient queries**
   - **Solution:**
     - Update to the latest version for performance improvements
     - Adjust relevance threshold settings for faster searches

### High CPU Usage

**Symptoms:**
- Server process using excessive CPU
- System fan running at high speed
- Overall system slowdown

**Possible Causes and Solutions:**

1. **Indexing or background tasks**
   - **Solution:**
     - Wait for background tasks to complete
     - Schedule intensive operations during off-hours

2. **Infinite loops or bugs**
   - **Solution:**
     - Update to the latest version
     - Check logs for error patterns
     - Restart the server

3. **Configuration issues**
   - **Solution:**
     - Reduce `max_connections` setting
     - Adjust memory optimization parameters

## Update and Installation Issues

### Failed Updates

**Symptoms:**
- Error message during update process
- Version remains unchanged after update
- Partial update leaving system in inconsistent state

**Possible Causes and Solutions:**

1. **Network issues during download**
   - **Solution:**
     - Check internet connection
     - Try updating again
     - Download update package manually and install

2. **Permission issues**
   - **Solution:**
     - Run the update with administrator/sudo privileges
     - Check file permissions in the installation directory

3. **Disk space issues**
   - **Solution:**
     - Free up disk space
     - Check temporary directory has sufficient space

### Installation Problems

**Symptoms:**
- Installation process fails
- Error messages during installation
- Incomplete installation

**Possible Causes and Solutions:**

1. **Missing dependencies**
   - **Solution:**
     - Install required dependencies manually
     - Check system requirements

2. **Conflicting software**
   - **Solution:**
     - Temporarily disable antivirus or security software
     - Check for software using the same ports or resources

3. **Corrupted installation files**
   - **Solution:**
     - Download installation package again
     - Verify checksums if available

## Backup and Recovery

### Backup Failures

**Symptoms:**
- Error message: "Failed to create backup"
- Backup process starts but doesn't complete
- Backup file is empty or corrupted

**Possible Causes and Solutions:**

1. **Disk space issues**
   - **Solution:**
     - Free up disk space
     - Change backup location to a drive with more space

2. **Permission issues**
   - **Solution:**
     - Check permissions for backup directory
     - Run backup command with appropriate privileges

3. **Database in use**
   - **Solution:**
     - Ensure no other processes are accessing the database
     - Stop the server before backing up: `smart-memory-mcp stop`

### Restore Failures

**Symptoms:**
- Error message: "Failed to restore backup"
- Restore process doesn't complete
- Database remains in previous state

**Possible Causes and Solutions:**

1. **Corrupted backup file**
   - **Solution:**
     - Try an older backup
     - Check backup file integrity

2. **Version mismatch**
   - **Solution:**
     - Ensure the backup is compatible with your current version
     - Update or downgrade as needed to match backup version

3. **Permission issues**
   - **Solution:**
     - Check permissions for database directory
     - Run restore command with appropriate privileges

## Common Error Messages

### "Port already in use"

**Cause:** Another process is using the configured port.

**Solutions:**
1. Use the cleanup script to detect and kill orphaned server processes:
   ```bash
   # On Linux/macOS
   ./scripts/cleanup.sh --kill
   
   # On Windows
   .\scripts\cleanup.ps1 -kill
   ```

2. Find the process using the port:
   - Linux/macOS: `lsof -i :50051`
   - Windows: `netstat -ano | findstr :50051`
   
3. Stop the process or change the port in your configuration

### "Database is locked"

**Cause:** Another process has a lock on the database file.

**Solutions:**
1. Stop all instances of the server: `smart-memory-mcp stop`
2. Check for other processes accessing the database
3. If necessary, restart your computer
4. If the problem persists, restore from a backup

### "Failed to initialize tokenizer"

**Cause:** The tokenizer module couldn't be loaded or initialized.

**Solutions:**
1. Reinstall the application
2. Check for missing dependencies
3. Update to the latest version

### "Memory limit exceeded"

**Cause:** The memory usage has exceeded the configured limit.

**Solutions:**
1. Increase the `max_memory_size_mb` setting
2. Archive or delete old memories
3. Optimize the database

## Advanced Troubleshooting

### Diagnostic Mode

Run the server in diagnostic mode to get detailed information:

```bash
smart-memory-mcp start --diagnostic
```

This will:
- Enable verbose logging
- Perform system checks
- Output diagnostic information

### Log Analysis

Examine log files for error patterns:

1. Log files are located in `~/.smart-memory/logs/`
2. Look for ERROR or WARNING level messages
3. Check timestamps to correlate issues with system events

### Database Inspection

Directly inspect the database (for advanced users):

1. Install SQLite tools
2. Open the database: `sqlite3 ~/.smart-memory/memories.db`
3. Run integrity check: `.integrity`
4. Examine schema: `.schema`

### Network Diagnostics

Test network connectivity:

1. Check if server is listening: `netstat -an | grep 50051`
2. Test connection: `telnet localhost 50051`
3. Check firewall settings

### Cleanup Orphaned Processes

If you're experiencing issues with orphaned server processes or ports that remain in use after VS Code is closed:

1. Use the cleanup script to detect and kill orphaned server processes:
   ```bash
   # On Linux/macOS
   ./scripts/cleanup.sh
   
   # On Windows
   .\scripts\cleanup.ps1
   ```

2. To automatically kill orphaned processes:
   ```bash
   # On Linux/macOS
   ./scripts/cleanup.sh --kill
   
   # On Windows
   .\scripts\cleanup.ps1 -kill
   ```

3. To check a different port:
   ```bash
   # On Linux/macOS
   ./scripts/cleanup.sh --port 8080
   
   # On Windows
   .\scripts\cleanup.ps1 -port 8080
   ```

The cleanup script will:
- Check for the presence of a PID file
- Verify if the process in the PID file is still running
- Check for processes using the configured port
- Identify if these processes are Smart Memory MCP servers
- Provide options to kill orphaned processes

## Getting Help

If you've tried the solutions above and still have issues:

1. **Check Documentation:**
   - Review the [official documentation](https://github.com/your-org/smart-memory-mcp/docs)
   - Look for known issues in the [GitHub repository](https://github.com/your-org/smart-memory-mcp/issues)

2. **Community Support:**
   - Post your question on [GitHub Discussions](https://github.com/your-org/smart-memory-mcp/discussions)
   - Join the [Discord community](https://discord.gg/smart-memory-mcp)

3. **Report a Bug:**
   - Submit a detailed bug report on [GitHub Issues](https://github.com/your-org/smart-memory-mcp/issues/new)
   - Include logs, system information, and steps to reproduce

4. **Contact Support:**
   - Email: support@smart-memory-mcp.example.com
   - Include diagnostic information from `smart-memory-mcp diagnose`