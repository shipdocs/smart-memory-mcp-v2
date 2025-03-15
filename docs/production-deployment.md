# Smart Memory MCP Production Deployment Guide

This guide provides comprehensive instructions for deploying the Smart Memory MCP system in a production environment. It covers system requirements, installation, configuration, security considerations, monitoring, and maintenance procedures.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Security Considerations](#security-considerations)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Backup and Recovery](#backup-and-recovery)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Multi-User Deployment](#multi-user-deployment)
10. [Performance Tuning](#performance-tuning)

## System Requirements

### Hardware Requirements

- **CPU**: 2+ cores recommended
- **RAM**: Minimum 2GB, 4GB+ recommended
- **Disk Space**: Minimum 1GB for installation, plus additional space for memory storage
- **Network**: Stable internet connection for update checks

### Software Requirements

- **Operating System**:
  - Windows 10/11 or Windows Server 2019/2022
  - macOS 11.0 (Big Sur) or later
  - Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+, or other modern distributions)
- **Dependencies**:
  - Visual Studio Code 1.60 or later
  - Node.js 14.0 or later
  - Rust 1.60 or later (for building from source)

## Installation

### Production Installation

For production environments, we recommend using the pre-built binaries:

1. Download the latest release from the [GitHub Releases page](https://github.com/your-org/smart-memory-mcp/releases).
2. Extract the archive to a suitable location.
3. Run the installation script:
   ```bash
   # For Linux/macOS
   ./install.sh --production
   
   # For Windows
   .\install.ps1 -Production
   ```
4. Verify the installation:
   ```bash
   smart-memory-mcp status
   ```

### Building from Source

If you need to build from source:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/smart-memory-mcp.git
   cd smart-memory-mcp
   ```
2. Build the project:
   ```bash
   cargo build --release
   ```
3. Install the built binaries:
   ```bash
   cargo install --path .
   ```

## Configuration

### Server Configuration

The server configuration is stored in `~/.smart-memory/config.json`. Key configuration options include:

```json
{
  "server": {
    "port": 50051,
    "host": "127.0.0.1",
    "max_connections": 10,
    "timeout_seconds": 30
  },
  "storage": {
    "db_path": "~/.smart-memory/memories.db",
    "max_memory_size_mb": 1024,
    "backup_enabled": true,
    "backup_interval_hours": 24
  },
  "logging": {
    "console_level": "info",
    "file_level": "debug",
    "max_file_size_mb": 10,
    "max_files": 5
  },
  "security": {
    "enable_encryption": true,
    "encryption_key_file": "~/.smart-memory/encryption.key"
  }
}
```

### VS Code Extension Configuration

The VS Code extension configuration is stored in the VS Code settings. You can configure it through the VS Code settings UI or by editing the `settings.json` file:

```json
{
  "smartMemory.server.autoStart": true,
  "smartMemory.server.port": 50051,
  "smartMemory.memory.maxTokens": 8000,
  "smartMemory.memory.relevanceThreshold": 0.5,
  "smartMemory.backup.enabled": true,
  "smartMemory.backup.interval": "daily"
}
```

## Security Considerations

### Network Security

By default, the server listens only on localhost (127.0.0.1), which restricts access to the local machine. If you need to allow remote connections:

1. Update the `host` setting in the server configuration to `"0.0.0.0"` to listen on all interfaces.
2. Implement proper firewall rules to restrict access to trusted IP addresses.
3. Consider setting up a reverse proxy with TLS termination for secure remote access.

### Data Security

- **Encryption**: Enable encryption in the configuration to protect sensitive data.
- **Access Control**: Restrict file system permissions for the Smart Memory data directory.
- **Credentials**: Do not store sensitive credentials in memory contexts.

### Secure Installation

- Verify the integrity of downloaded binaries using the provided checksums.
- Use a dedicated service account with minimal privileges for running the server.
- Regularly update to the latest version to receive security patches.

## Monitoring and Logging

### Log Files

Log files are stored in `~/.smart-memory/logs/` by default. The logging system includes:

- Automatic log rotation to prevent disk space issues
- Multiple severity levels (trace, debug, info, warning, error, critical)
- Structured logging with timestamps and component information
- JSON metadata support for machine parsing

### Health Checks

The server provides a health check endpoint that can be used to monitor its status:

```bash
curl http://localhost:50051/health
```

The response includes:

- Server status (serving/not serving)
- Uptime
- Memory usage
- Database status
- Component health information

### Performance Metrics

Performance metrics are available through the `/metrics` endpoint:

```bash
curl http://localhost:50051/metrics
```

Key metrics include:

- Request latency
- Memory usage
- Database size
- Token usage
- Error rates

## Backup and Recovery

### Automatic Backups

The system performs automatic backups based on the configured interval. To manually create a backup:

```bash
smart-memory-mcp backup "Manual backup description"
```

### Listing Backups

To list available backups:

```bash
smart-memory-mcp restore
```

### Restoring from Backup

To restore from a backup:

```bash
smart-memory-mcp restore <backup-id>
```

### Backup Rotation

Old backups are automatically rotated based on the `max_files` configuration. You can adjust this setting to retain more or fewer backups.

## Maintenance Procedures

### Updating

To update to the latest version:

```bash
# For Linux/macOS
./update.sh

# For Windows
.\update.ps1
```

### Database Optimization

Periodically optimize the database to improve performance:

```bash
smart-memory-mcp optimize
```

### Log Management

Clean up old logs:

```bash
smart-memory-mcp cleanup-logs --older-than 30d
```

## Troubleshooting

### Common Issues

#### Server Won't Start

- Check if another process is using the configured port
- Verify file permissions for the data directory
- Check the logs for specific error messages

#### Connection Issues

- Ensure the server is running (`smart-memory-mcp status`)
- Verify the port configuration matches between server and client
- Check firewall settings

#### Performance Problems

- Optimize the database
- Increase the `max_memory_size_mb` setting if resources allow
- Check for disk space issues

### Crash Recovery

The system includes a crash recovery mechanism that:

1. Detects when the server has crashed
2. Performs database integrity checks
3. Attempts to restart the server
4. Enters safe mode if repeated crashes occur

To manually recover from a crash:

```bash
smart-memory-mcp recover
```

## Multi-User Deployment

### Shared Server Setup

For multi-user environments:

1. Set up the server on a shared machine
2. Configure the host to allow remote connections
3. Set up user authentication
4. Configure client machines to connect to the shared server

### User Isolation

To maintain isolation between users:

1. Create separate database files for each user
2. Configure different ports for each user's server instance
3. Implement access controls at the file system level

## Performance Tuning

### Memory Optimization

Adjust the following settings based on your hardware:

- `max_memory_size_mb`: Increase for better performance on machines with more RAM
- `max_connections`: Adjust based on expected concurrent users

### Database Tuning

For large deployments:

- Consider using an external database server
- Implement database sharding for very large datasets
- Optimize indexes for common query patterns

### Network Optimization

- Use connection pooling for multiple clients
- Consider compression for remote connections
- Implement request batching for high-throughput scenarios