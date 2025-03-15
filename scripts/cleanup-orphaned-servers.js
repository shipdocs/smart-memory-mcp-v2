#!/usr/bin/env node

/**
 * Cleanup Orphaned MCP Servers
 * 
 * This script checks for orphaned Smart Memory MCP server processes
 * and terminates them to free up the port.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const DEFAULT_PORT = 50051;
const HOME_DIR = os.homedir();
const SMART_MEMORY_DIR = path.join(HOME_DIR, '.smart-memory');
const PID_FILE = path.join(SMART_MEMORY_DIR, 'server.pid');

/**
 * Check if a process is running
 * @param {number} pid - Process ID
 * @returns {boolean} - True if process is running
 */
function isProcessRunning(pid) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf8' });
      return output.includes(pid.toString());
    } else {
      // Unix-like (Linux, macOS)
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
      return true;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Find processes using a specific port
 * @param {number} port - Port number
 * @returns {number[]} - Array of process IDs
 */
function findProcessesUsingPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.split('\n').filter(line => line.includes('LISTENING'));
      
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return parseInt(parts[parts.length - 1], 10);
      }).filter(pid => !isNaN(pid));
    } else {
      // Unix-like (Linux, macOS)
      try {
        const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf8' });
        return output.split('\n')
          .filter(line => line.trim())
          .map(line => parseInt(line.trim(), 10))
          .filter(pid => !isNaN(pid));
      } catch (error) {
        // lsof might not be installed, try netstat
        const output = execSync(`netstat -nlp 2>/dev/null | grep :${port}`, { encoding: 'utf8' });
        return output.split('\n')
          .filter(line => line.includes('LISTEN'))
          .map(line => {
            const match = line.match(/(\d+)\/\w+/);
            return match ? parseInt(match[1], 10) : NaN;
          })
          .filter(pid => !isNaN(pid));
      }
    }
  } catch (error) {
    return [];
  }
}

/**
 * Kill a process
 * @param {number} pid - Process ID
 * @returns {boolean} - True if process was killed
 */
function killProcess(pid) {
  try {
    if (process.platform === 'win32') {
      // Windows
      execSync(`taskkill /F /PID ${pid}`);
    } else {
      // Unix-like (Linux, macOS)
      execSync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a process is a Smart Memory MCP server
 * @param {number} pid - Process ID
 * @returns {boolean} - True if process is a Smart Memory MCP server
 */
function isMcpServerProcess(pid) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const output = execSync(`wmic process where ProcessId=${pid} get CommandLine`, { encoding: 'utf8' });
      return output.includes('smart-memory-mcp') || output.includes('smart_memory_mcp');
    } else {
      // Unix-like (Linux, macOS)
      try {
        const output = execSync(`ps -p ${pid} -o command`, { encoding: 'utf8' });
        return output.includes('smart-memory-mcp') || output.includes('smart_memory_mcp');
      } catch (error) {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('Checking for orphaned Smart Memory MCP server processes...');
  
  // Check PID file
  let pidFromFile = null;
  if (fs.existsSync(PID_FILE)) {
    try {
      pidFromFile = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      console.log(`Found PID file with PID: ${pidFromFile}`);
      
      if (isProcessRunning(pidFromFile)) {
        if (isMcpServerProcess(pidFromFile)) {
          console.log(`Found running MCP server with PID: ${pidFromFile}`);
          
          const shouldKill = process.argv.includes('--force') || 
            process.argv.includes('-f') ||
            process.argv.includes('--kill');
            
          if (shouldKill) {
            console.log(`Killing process with PID: ${pidFromFile}`);
            if (killProcess(pidFromFile)) {
              console.log(`Successfully killed process with PID: ${pidFromFile}`);
              try {
                fs.unlinkSync(PID_FILE);
                console.log('Removed PID file');
              } catch (error) {
                console.error(`Failed to remove PID file: ${error.message}`);
              }
            } else {
              console.error(`Failed to kill process with PID: ${pidFromFile}`);
            }
          } else {
            console.log('Use --kill or -f to terminate this process');
          }
        } else {
          console.log(`Process with PID ${pidFromFile} is running but is not an MCP server`);
          console.log('Removing stale PID file');
          try {
            fs.unlinkSync(PID_FILE);
            console.log('Removed PID file');
          } catch (error) {
            console.error(`Failed to remove PID file: ${error.message}`);
          }
        }
      } else {
        console.log(`Process with PID ${pidFromFile} is not running`);
        console.log('Removing stale PID file');
        try {
          fs.unlinkSync(PID_FILE);
          console.log('Removed PID file');
        } catch (error) {
          console.error(`Failed to remove PID file: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error reading PID file: ${error.message}`);
    }
  } else {
    console.log('No PID file found');
  }
  
  // Check for processes using the port
  const port = process.argv.includes('--port') ? 
    parseInt(process.argv[process.argv.indexOf('--port') + 1], 10) : 
    DEFAULT_PORT;
    
  console.log(`Checking for processes using port ${port}...`);
  const pids = findProcessesUsingPort(port);
  
  if (pids.length === 0) {
    console.log(`No processes found using port ${port}`);
  } else {
    console.log(`Found ${pids.length} process(es) using port ${port}:`);
    
    for (const pid of pids) {
      if (isMcpServerProcess(pid)) {
        console.log(`  PID ${pid}: Smart Memory MCP server`);
        
        const shouldKill = process.argv.includes('--force') || 
          process.argv.includes('-f') ||
          process.argv.includes('--kill');
          
        if (shouldKill) {
          console.log(`  Killing process with PID: ${pid}`);
          if (killProcess(pid)) {
            console.log(`  Successfully killed process with PID: ${pid}`);
          } else {
            console.error(`  Failed to kill process with PID: ${pid}`);
          }
        } else {
          console.log('  Use --kill or -f to terminate this process');
        }
      } else {
        console.log(`  PID ${pid}: Other process (not an MCP server)`);
      }
    }
  }
}

// Run the main function
main();

// Usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node cleanup-orphaned-servers.js [options]

Options:
  --kill, -f, --force   Kill orphaned MCP server processes
  --port <number>       Specify port to check (default: ${DEFAULT_PORT})
  --help, -h            Show this help message
  
Examples:
  node cleanup-orphaned-servers.js             # Check for orphaned processes
  node cleanup-orphaned-servers.js --kill      # Kill orphaned processes
  node cleanup-orphaned-servers.js --port 8080 # Check a different port
  `);
}