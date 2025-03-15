import * as vscode from 'vscode';
import { McpClient } from './mcp-client';
import { registerCommands } from './commands';
import { MemoryExplorerProvider } from './views/memory-explorer';
import { MemoryMetricsProvider } from './views/memory-metrics';
import { StatusBarManager } from './status-bar';
import { ServerDiscovery } from './server-discovery';
import { ServerManager } from './server-manager';
import { SetupWizard } from './setup-wizard';
import { setupExtension } from './setup';
import { registerVersionCommands, initializeVersionChecking } from './version';

// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('Smart Memory MCP');

function log(message: string) {
  console.log(message);
  outputChannel.appendLine(message);
}

export async function activate(context: vscode.ExtensionContext) {
  log('Smart Memory MCP extension is now active');

  // Create status bar manager first (needed for server status updates)
  const serverAddress = vscode.workspace.getConfiguration('smartMemory').get<string>('serverAddress') || 'localhost:50051';
  log(`Server address: ${serverAddress}`);
  
  const client = new McpClient(serverAddress);
  const statusBarManager = new StatusBarManager(client);
  context.subscriptions.push(statusBarManager);

  // Create server discovery and manager
  const serverDiscovery = new ServerDiscovery(context);
  const serverManager = new ServerManager(context, statusBarManager);
  
  // Run setup wizard on first activation
  const firstActivation = context.globalState.get('firstActivation', true);
  if (firstActivation) {
    log('First activation detected, running setup...');
    try {
      // Configure MCP settings first to ensure basic functionality
      await serverDiscovery.configureMcpSettings();
      
      // Run the setup wizard
      const setupWizard = new SetupWizard(context, serverManager);
      await setupWizard.run();
      
      // Mark first activation as complete
      await context.globalState.update('firstActivation', false);
      log('First-time setup completed successfully');
    } catch (error) {
      log(`Failed to run first-time setup: ${error}`);
      vscode.window.showErrorMessage(`Failed to run first-time setup: ${error}`);
    }
  }

  // Check if the server is running
  const isServerRunning = await serverManager.checkServerStatus();
  log(`Server status check - running: ${isServerRunning}`);
  
  // Check if port is in use but not by our server
  const isPortInUse = await serverManager.isPortInUse(50051);
  
  if (isPortInUse && !isServerRunning) {
    // Port is in use but not by our server - try to connect to it
    log('Port 50051 is in use but not by our server, attempting to connect...');
    try {
      await client.testConnection();
      log('Successfully connected to existing Smart Memory MCP server');
      vscode.window.showInformationMessage('Connected to existing Smart Memory MCP server');
      statusBarManager.updateServerStatus(true);
    } catch (error) {
      // Cannot connect to the server on the port
      log(`Failed to connect to existing server: ${error}`);
      
      // Ask user if they want to kill the process using the port and start a new server
      const killOption = 'Kill Process & Start Server';
      const ignoreOption = 'Ignore';
      const result = await vscode.window.showErrorMessage(
        'Port 50051 is in use but not by a responsive Smart Memory MCP server.',
        killOption,
        ignoreOption
      );
      
      if (result === killOption) {
        try {
          // Try to kill the process using the port
          await serverManager.killProcessUsingPort(50051);
          log('Killed process using port 50051');
          
          // Start our server
          log('Starting our server after killing process...');
          await serverManager.startServer();
        } catch (startError) {
          log(`Failed to start server after killing process: ${startError}`);
          vscode.window.showErrorMessage(`Failed to start server: ${startError}`);
        }
      }
    }
  } else if (!isServerRunning) {
    // Auto-start the server if configured
    const autoStartServer = vscode.workspace.getConfiguration('smartMemory').get<boolean>('autoStartServer');
    if (autoStartServer) {
      try {
        log('Auto-starting server...');
        await serverManager.startServer();
      } catch (error) {
        log(`Failed to auto-start server: ${error}`);
        vscode.window.showErrorMessage(`Failed to auto-start server: ${error}`);
      }
    }
  }

  try {
    // Test connection to the server
    log('Testing connection to server...');
    await client.testConnection();
    log('Successfully connected to Smart Memory MCP server');
    vscode.window.showInformationMessage('Connected to Smart Memory MCP server');
  } catch (error) {
    log(`Failed to connect to server: ${error}`);
    vscode.window.showWarningMessage(`Failed to connect to Smart Memory MCP server: ${error}`);
    
    // If connection fails, offer to start the server
    const startServerOption = 'Start Server';
    const setupOption = 'Run Setup';
    const result = await vscode.window.showErrorMessage(
      'Failed to connect to Smart Memory MCP server.',
      startServerOption,
      setupOption
    );
    
    if (result === startServerOption) {
      try {
        await serverManager.startServer();
      } catch (startError) {
        log(`Failed to start server: ${startError}`);
        vscode.window.showErrorMessage(`Failed to start server: ${startError}`);
      }
    } else if (result === setupOption) {
      const setupWizard = new SetupWizard(context, serverManager);
      const success = await setupWizard.run();
      
      if (success) {
        vscode.window.showInformationMessage('Setup complete. Some changes may require restarting VS Code.');
      }
      return;
    }
  }

  // Register views
  log('Registering tree view providers...');
  const memoryExplorerProvider = new MemoryExplorerProvider(client);
  const memoryMetricsProvider = new MemoryMetricsProvider(client);

  try {
    // Register tree data providers
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('smartMemoryExplorer', memoryExplorerProvider),
      vscode.window.registerTreeDataProvider('smartMemoryMetrics', memoryMetricsProvider)
    );
    
    // Also create tree views with the same providers
    const explorerView = vscode.window.createTreeView('smartMemoryExplorer', {
      treeDataProvider: memoryExplorerProvider,
      showCollapseAll: true
    });

    const metricsView = vscode.window.createTreeView('smartMemoryMetrics', {
      treeDataProvider: memoryMetricsProvider,
      showCollapseAll: true
    });

    context.subscriptions.push(explorerView, metricsView);
    log('Tree views registered successfully');
  } catch (error) {
    log(`Failed to register tree views: ${error}`);
    vscode.window.showErrorMessage(`Failed to initialize views: ${error}`);
  }

  // Register commands
  log('Registering commands...');
  registerCommands(context, client, memoryExplorerProvider, memoryMetricsProvider, statusBarManager, serverManager);
  
  // Register version commands
  log('Registering version commands...');
  registerVersionCommands(context);
  
  // Register a command to run setup wizard
  context.subscriptions.push(
    vscode.commands.registerCommand('smartMemory.runSetup', async () => {
      log('Running setup wizard...');
      const setupWizard = new SetupWizard(context, serverManager);
      const success = await setupWizard.run();
      
      if (success) {
        log('Setup completed successfully');
        vscode.window.showInformationMessage('Setup complete. Some changes may require restarting VS Code.');
      }
    })
  );
  
  // Set up a timer to periodically check if the server is running
  const checkServerInterval = vscode.workspace.getConfiguration('smartMemory').get<number>('checkServerInterval') || 30000;
  const serverCheckInterval = setInterval(async () => {
    await serverManager.checkServerStatus();
  }, checkServerInterval);
  
  // Make sure to clear the interval when the extension is deactivated
  context.subscriptions.push({
    dispose: () => {
      clearInterval(serverCheckInterval);
    }
  });

  // Initialize version checking
  log('Initializing version checking...');
  await initializeVersionChecking(context);

  log('Extension activation completed');
}

export async function deactivate() {
  // Clean up resources
  log('Smart Memory MCP extension is now deactivated');
  
  // Stop the server if it's running
  try {
    // We need to access the serverManager instance from the activate function
    // Since we don't have direct access, we'll use the command API
    await vscode.commands.executeCommand('smartMemory.stopServer');
    log('Successfully stopped Smart Memory MCP server during deactivation');
    
    // Give the server some time to shut down properly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the port is still in use
    const net = require('net');
    const testSocket = new net.Socket();
    
    try {
      // Try to connect to the port
      await new Promise((resolve, reject) => {
        testSocket.once('error', (err: { code: string }) => {
          if (err.code === 'ECONNREFUSED') {
            // Port is free, which is good
            log('Port 50051 is free, server successfully shut down');
            resolve(true);
          } else {
            reject(err);
          }
        });
        
        testSocket.once('connect', () => {
          // Port is still in use
          testSocket.end();
          log('Port 50051 is still in use after server stop command, attempting forceful shutdown');
          
          // Try to forcefully kill the process using the port
          try {
            const { execSync } = require('child_process');
            if (process.platform === 'win32') {
              // Windows
              execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :50051 ^| findstr LISTENING') do taskkill /F /PID %a`);
            } else {
              // Unix-like
              execSync(`lsof -i :50051 -t | xargs kill -9`);
            }
            log('Forcefully killed process using port 50051');
            
            // Run the cleanup script if available
            try {
              const path = require('path');
              const fs = require('fs');
              const cleanupScriptPath = path.join(__dirname, '..', 'scripts', process.platform === 'win32' ? 'cleanup.ps1' : 'cleanup.sh');
              
              if (fs.existsSync(cleanupScriptPath)) {
                log(`Running cleanup script: ${cleanupScriptPath}`);
                if (process.platform === 'win32') {
                  execSync(`powershell -ExecutionPolicy Bypass -File "${cleanupScriptPath}" -kill`);
                } else {
                  execSync(`bash "${cleanupScriptPath}" --kill`);
                }
                log('Cleanup script executed successfully');
              } else {
                log('Cleanup script not found, skipping additional cleanup');
              }
            } catch (cleanupError) {
              log(`Failed to run cleanup script: ${cleanupError}`);
            }
          } catch (killError) {
            log(`Failed to forcefully kill process: ${killError}`);
          }
          
          resolve(false);
        });
        
        // Set a timeout for the connection attempt
        testSocket.setTimeout(2000, () => {
          testSocket.destroy();
          log('Connection attempt timed out, assuming server is not running');
          resolve(true);
        });
        
        testSocket.connect(50051, 'localhost');
      });
    } catch (socketError) {
      log(`Error checking port: ${socketError}`);
    } finally {
      testSocket.destroy();
    }
    
    // Store the VSCode process ID in the environment for parent process monitoring
    // This will help the server detect when VSCode is closed
    try {
      const fs = require('fs');
      const path = require('path');
      const homeDir = require('os').homedir();
      const smartMemoryDir = path.join(homeDir, '.smart-memory');
      
      // Create the directory if it doesn't exist
      if (!fs.existsSync(smartMemoryDir)) {
        fs.mkdirSync(smartMemoryDir, { recursive: true });
      }
      
      // Write the VSCode PID to a file
      const vscodePidFile = path.join(smartMemoryDir, 'vscode.pid');
      fs.writeFileSync(vscodePidFile, process.pid.toString());
      log(`Stored VSCode PID (${process.pid}) in ${vscodePidFile}`);
    } catch (pidError) {
      log(`Failed to store VSCode PID: ${pidError}`);
    }
  } catch (error) {
    log(`Failed to stop server during deactivation: ${error}`);
  }
  
  outputChannel.dispose();
}
