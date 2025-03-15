#!/usr/bin/env node

/**
 * Smart Memory MCP Server Manager
 * 
 * This script provides a more robust way to manage the Smart Memory MCP server:
 * 1. Checks if a server is already running on the configured port
 * 2. Tests if the running server is responsive
 * 3. If not responsive, kills the old process and starts a new one
 * 4. If no server is running, starts a new one
 * 5. Provides a clean shutdown mechanism
 * 
 * Usage:
 *   node smart-memory-mcp-server-manager.js start
 *   node smart-memory-mcp-server-manager.js stop
 *   node smart-memory-mcp-server-manager.js restart
 *   node smart-memory-mcp-server-manager.js status
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// Configuration
const DEFAULT_PORT = 50051;
const DEFAULT_HOST = '127.0.0.1';
const PID_FILE = path.join(os.homedir(), '.smart-memory', 'server.pid');
const LOG_FILE = path.join(os.homedir(), '.smart-memory', 'server.log');
const CONFIG_PATH = path.join(os.homedir(), '.smart-memory', 'config.json');
const DB_PATH = path.join(os.homedir(), '.smart-memory', 'memories.db');

// Get the binary path
function getBinaryPath() {
  // Check for custom path in environment variable
  if (process.env.SMART_MEMORY_BINARY) {
    return process.env.SMART_MEMORY_BINARY;
  }

  // Default paths based on platform
  const platform = os.platform();
  const extensionDir = path.join(
    os.homedir(),
    platform === 'win32' 
      ? 'AppData\\Roaming\\Code\\extensions' 
      : platform === 'darwin'
        ? 'Library/Application Support/Code/extensions'
        : '.vscode/extensions'
  );

  // Find the extension directory
  const extensionPattern = 'smart-memory-mcp.smart-memory-mcp-extension-*';
  let extensionMatch;
  try {
    const extensions = fs.readdirSync(extensionDir);
    extensionMatch = extensions.find(dir => dir.match(extensionPattern));
  } catch (err) {
    console.error(`Error finding extension directory: ${err.message}`);
    return null;
  }

  if (!extensionMatch) {
    console.error('Smart Memory MCP extension not found');
    return null;
  }

  // Construct binary path
  const binaryName = platform === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core';
  const binaryPath = path.join(extensionDir, extensionMatch, 'bin', binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.error(`Binary not found at ${binaryPath}`);
    return null;
  }

  return binaryPath;
}

// Get server port from config
function getServerPort() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (config.server && config.server.port) {
        return config.server.port;
      }
    }
  } catch (err) {
    console.error(`Error reading config: ${err.message}`);
  }
  return DEFAULT_PORT;
}

// Check if the server is already running
function isServerRunning() {
  // Check if PID file exists
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      
      // Check if process is running
      try {
        // 0 signal just tests if the process exists
        process.kill(pid, 0);
        return pid;
      } catch (e) {
        // Process doesn't exist, clean up PID file
        fs.unlinkSync(PID_FILE);
        return false;
      }
    } catch (err) {
      console.error(`Error reading PID file: ${err.message}`);
      return false;
    }
  }
  
  // Check if port is in use
  const port = getServerPort();
  try {
    // Try to find process using the port
    const platform = os.platform();
    let cmd;
    
    if (platform === 'win32') {
      cmd = `netstat -ano | findstr :${port}`;
    } else {
      cmd = `lsof -i :${port} -t`;
    }
    
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    if (output) {
      // Extract PID from output
      let pid;
      if (platform === 'win32') {
        // Parse netstat output to get PID
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes(`LISTENING`)) {
            const parts = line.trim().split(/\s+/);
            pid = parseInt(parts[parts.length - 1]);
            break;
          }
        }
      } else {
        // lsof output is just the PID
        pid = parseInt(output);
      }
      
      if (pid) {
        // Save PID to file for future reference
        fs.writeFileSync(PID_FILE, pid.toString());
        return pid;
      }
    }
  } catch (err) {
    // Command failed or no process found
    return false;
  }
  
  return false;
}

// Test if server is responsive
function testServerConnection(port = DEFAULT_PORT) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
    
    socket.connect(port, DEFAULT_HOST);
  });
}

// Kill the server process
function killServer(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Terminated server process with PID ${pid}`);
    
    // Wait a bit and check if it's really dead
    setTimeout(() => {
      try {
        process.kill(pid, 0);
        // If we get here, process is still running, force kill
        console.log(`Process ${pid} still running, force killing...`);
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        // Process is dead, which is what we want
      }
    }, 1000);
    
    // Clean up PID file
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    
    return true;
  } catch (err) {
    console.error(`Error killing process ${pid}: ${err.message}`);
    return false;
  }
}

// Start the server
function startServer() {
  const binaryPath = getBinaryPath();
  if (!binaryPath) {
    console.error('Cannot start server: binary not found');
    return false;
  }
  
  // Ensure log directory exists
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Open log file
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  
  // Start the server process
  const serverProcess = spawn(binaryPath, [], {
    env: {
      ...process.env,
      RUST_LOG: 'info',
      DB_PATH: DB_PATH,
      CONFIG_PATH: CONFIG_PATH
    },
    detached: true, // Run in the background
    stdio: ['ignore', logStream, logStream]
  });
  
  // Save PID to file
  fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
  
  // Unref the process to allow the script to exit
  serverProcess.unref();
  
  console.log(`Started server with PID ${serverProcess.pid}`);
  return serverProcess.pid;
}

// Main function
async function main() {
  const command = process.argv[2] || 'status';
  
  switch (command) {
    case 'start': {
      const runningPid = isServerRunning();
      if (runningPid) {
        console.log(`Server is already running with PID ${runningPid}`);
        
        // Test if it's responsive
        const port = getServerPort();
        const responsive = await testServerConnection(port);
        if (!responsive) {
          console.log('Server is not responsive, restarting...');
          killServer(runningPid);
          setTimeout(() => {
            startServer();
          }, 1000);
        }
      } else {
        startServer();
      }
      break;
    }
    
    case 'stop': {
      const runningPid = isServerRunning();
      if (runningPid) {
        killServer(runningPid);
      } else {
        console.log('Server is not running');
      }
      break;
    }
    
    case 'restart': {
      const runningPid = isServerRunning();
      if (runningPid) {
        killServer(runningPid);
        setTimeout(() => {
          startServer();
        }, 1000);
      } else {
        startServer();
      }
      break;
    }
    
    case 'status': {
      const runningPid = isServerRunning();
      if (runningPid) {
        const port = getServerPort();
        const responsive = await testServerConnection(port);
        console.log(`Server is running with PID ${runningPid} and is ${responsive ? 'responsive' : 'not responsive'}`);
      } else {
        console.log('Server is not running');
      }
      break;
    }
    
    default:
      console.log('Usage: node smart-memory-mcp-server-manager.js [start|stop|restart|status]');
  }
}

// Run the main function
main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});