#!/usr/bin/env node

/**
 * Integration Test for Smart Memory MCP Server Manager
 * 
 * This script tests the functionality of the server manager by:
 * 1. Starting the server
 * 2. Verifying it's running and responsive
 * 3. Stopping the server
 * 4. Verifying it's stopped
 * 5. Testing the restart functionality
 * 6. Testing handling of zombie processes
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const SERVER_MANAGER = path.join(__dirname, 'smart-memory-mcp-server-manager.js');
const PORT = 50051;
const HOST = '127.0.0.1';
const TIMEOUT = 2000; // 2 seconds

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper function to run server manager commands
function runCommand(command) {
  console.log(`${colors.blue}Running command: node ${SERVER_MANAGER} ${command}${colors.reset}`);
  try {
    const output = execSync(`node ${SERVER_MANAGER} ${command}`, { encoding: 'utf8' });
    console.log(output.trim());
    return output.trim();
  } catch (error) {
    console.error(`${colors.red}Command failed: ${error.message}${colors.reset}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return null;
  }
}

// Helper function to test server connection
function testConnection() {
  return new Promise((resolve) => {
    console.log(`${colors.blue}Testing connection to ${HOST}:${PORT}...${colors.reset}`);
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`${colors.yellow}Connection timed out${colors.reset}`);
      resolve(false);
    }, TIMEOUT);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      console.log(`${colors.green}Connection successful${colors.reset}`);
      resolve(true);
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`${colors.yellow}Connection failed: ${err.message}${colors.reset}`);
      resolve(false);
    });
    
    socket.connect(PORT, HOST);
  });
}

// Helper function to create a zombie process
async function createZombieProcess() {
  console.log(`${colors.magenta}Creating a zombie process...${colors.reset}`);
  
  // Find the binary path
  const homeDir = os.homedir();
  const extensionDir = path.join(homeDir, '.vscode', 'extensions');
  const extensions = fs.readdirSync(extensionDir);
  const extensionMatch = extensions.find(dir => dir.match(/smart-memory-mcp\.smart-memory-mcp-extension-*/));
  
  if (!extensionMatch) {
    console.error(`${colors.red}Smart Memory MCP extension not found${colors.reset}`);
    return false;
  }
  
  const binaryName = os.platform() === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core';
  const binaryPath = path.join(extensionDir, extensionMatch, 'bin', binaryName);
  
  if (!fs.existsSync(binaryPath)) {
    console.error(`${colors.red}Binary not found at ${binaryPath}${colors.reset}`);
    return false;
  }
  
  // Start the process directly
  const configPath = path.join(homeDir, '.smart-memory', 'config.json');
  const dbPath = path.join(homeDir, '.smart-memory', 'memories.db');
  
  const process = spawn(binaryPath, [], {
    env: {
      ...process.env,
      RUST_LOG: 'info',
      DB_PATH: dbPath,
      CONFIG_PATH: configPath
    },
    detached: true,
    stdio: 'ignore'
  });
  
  process.unref();
  
  console.log(`${colors.magenta}Zombie process started with PID ${process.pid}${colors.reset}`);
  
  // Wait for the process to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify it's running
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log(`${colors.green}Zombie process is running and responsive${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}Zombie process is not responsive${colors.reset}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.cyan}=== Smart Memory MCP Server Manager Integration Test ===${colors.reset}`);
  
  // Test 1: Check initial status
  console.log(`\n${colors.cyan}Test 1: Checking initial status${colors.reset}`);
  runCommand('status');
  
  // Test 2: Start the server
  console.log(`\n${colors.cyan}Test 2: Starting the server${colors.reset}`);
  runCommand('start');
  
  // Wait for the server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Verify server is running and responsive
  console.log(`\n${colors.cyan}Test 3: Verifying server is running and responsive${colors.reset}`);
  const isRunning = await testConnection();
  
  if (!isRunning) {
    console.error(`${colors.red}Test failed: Server is not running or not responsive${colors.reset}`);
    return;
  }
  
  // Test 4: Stop the server
  console.log(`\n${colors.cyan}Test 4: Stopping the server${colors.reset}`);
  runCommand('stop');
  
  // Wait for the server to stop
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 5: Verify server is stopped
  console.log(`\n${colors.cyan}Test 5: Verifying server is stopped${colors.reset}`);
  const isStopped = !(await testConnection());
  
  if (!isStopped) {
    console.error(`${colors.red}Test failed: Server is still running${colors.reset}`);
    return;
  }
  
  // Test 6: Restart the server
  console.log(`\n${colors.cyan}Test 6: Restarting the server${colors.reset}`);
  runCommand('restart');
  
  // Wait for the server to restart
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 7: Verify server is running again
  console.log(`\n${colors.cyan}Test 7: Verifying server is running again${colors.reset}`);
  const isRunningAgain = await testConnection();
  
  if (!isRunningAgain) {
    console.error(`${colors.red}Test failed: Server did not restart properly${colors.reset}`);
    return;
  }
  
  // Test 8: Stop the server again
  console.log(`\n${colors.cyan}Test 8: Stopping the server again${colors.reset}`);
  runCommand('stop');
  
  // Wait for the server to stop
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 9: Create a zombie process
  console.log(`\n${colors.cyan}Test 9: Creating a zombie process${colors.reset}`);
  const zombieCreated = await createZombieProcess();
  
  if (!zombieCreated) {
    console.log(`${colors.yellow}Skipping zombie process test${colors.reset}`);
  } else {
    // Test 10: Start the server with zombie process running
    console.log(`\n${colors.cyan}Test 10: Starting the server with zombie process running${colors.reset}`);
    runCommand('start');
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 11: Verify server is running and responsive
    console.log(`\n${colors.cyan}Test 11: Verifying server is running and responsive${colors.reset}`);
    const isRunningAfterZombie = await testConnection();
    
    if (!isRunningAfterZombie) {
      console.error(`${colors.red}Test failed: Server did not handle zombie process properly${colors.reset}`);
      return;
    }
    
    // Test 12: Stop the server one last time
    console.log(`\n${colors.cyan}Test 12: Stopping the server one last time${colors.reset}`);
    runCommand('stop');
  }
  
  console.log(`\n${colors.green}All tests completed successfully!${colors.reset}`);
}

// Run the tests
runTests().catch(err => {
  console.error(`${colors.red}Test error: ${err.message}${colors.reset}`);
  process.exit(1);
});