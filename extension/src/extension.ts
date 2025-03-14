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
  
  // Auto-start the server if configured
  const autoStartServer = vscode.workspace.getConfiguration('smartMemory').get<boolean>('autoStartServer');
  if (autoStartServer && !isServerRunning) {
    try {
      log('Auto-starting server...');
      await serverManager.startServer();
    } catch (error) {
      log(`Failed to auto-start server: ${error}`);
      vscode.window.showErrorMessage(`Failed to auto-start server: ${error}`);
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

  log('Extension activation completed');
}

export function deactivate() {
  // Clean up resources
  log('Smart Memory MCP extension is now deactivated');
  outputChannel.dispose();
}
