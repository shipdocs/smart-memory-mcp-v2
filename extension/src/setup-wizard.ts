import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ServerDiscovery } from './server-discovery';
import { ServerManager } from './server-manager';

/**
 * SetupWizard class provides a user-friendly setup experience
 */
export class SetupWizard {
  private context: vscode.ExtensionContext;
  private serverDiscovery: ServerDiscovery;
  private serverManager: ServerManager | null = null;

  constructor(context: vscode.ExtensionContext, serverManager?: ServerManager) {
    this.context = context;
    this.serverDiscovery = new ServerDiscovery(context);
    this.serverManager = serverManager || null;
  }

  /**
   * Run the setup wizard
   */
  async run(): Promise<boolean> {
    try {
      // Show welcome message
      const welcomeMessage = 'Welcome to Smart Memory MCP Setup Wizard!';
      const startOption = 'Start Setup';
      const skipOption = 'Skip Setup';
      
      const startResult = await vscode.window.showInformationMessage(
        welcomeMessage,
        startOption,
        skipOption
      );
      
      if (startResult !== startOption) {
        return false;
      }

      // Show progress notification
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Setting up Smart Memory MCP",
        cancellable: true
      }, async (progress, token) => {
        // Step 1: Check for server binary
        progress.report({ message: "Checking for server binary...", increment: 10 });
        if (token.isCancellationRequested) return false;
        
        const binaryPath = await this.serverDiscovery.getServerPath();
        
        if (!binaryPath) {
          // Binary not found, ask user what to do
          const downloadOption = 'Download Binary';
          const buildOption = 'Build from Source';
          const specifyOption = 'Specify Path';
          
          const binaryResult = await vscode.window.showWarningMessage(
            'Server binary not found. How would you like to proceed?',
            downloadOption,
            buildOption,
            specifyOption
          );
          
          if (binaryResult === downloadOption) {
            // Download binary
            progress.report({ message: "Downloading server binary...", increment: 10 });
            if (token.isCancellationRequested) return false;
            
            const extractedPath = await this.serverDiscovery.ensureServerBinary();
            if (!extractedPath) {
              vscode.window.showErrorMessage('Failed to download server binary');
              return false;
            }
          } else if (binaryResult === buildOption) {
            // Build from source
            progress.report({ message: "Building server from source...", increment: 10 });
            if (token.isCancellationRequested) return false;
            
            // Ask for source directory
            const sourceDirResult = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Select Source Directory',
              title: 'Select Smart Memory MCP Source Directory'
            });
            
            if (!sourceDirResult || sourceDirResult.length === 0) {
              return false;
            }
            
            const sourceDir = sourceDirResult[0].fsPath;
            
            // Build the binary
            try {
              const terminal = vscode.window.createTerminal('Smart Memory MCP Build');
              terminal.sendText(`cd "${sourceDir}" && cargo build --release`);
              terminal.show();
              
              // Wait for user to confirm build is complete
              const buildCompleteOption = 'Build Complete';
              const buildFailedOption = 'Build Failed';
              
              const buildResult = await vscode.window.showInformationMessage(
                'Please wait for the build to complete and then select an option below.',
                buildCompleteOption,
                buildFailedOption
              );
              
              if (buildResult !== buildCompleteOption) {
                return false;
              }
              
              // Update the custom binary path
              const binaryName = os.platform() === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core';
              const builtBinaryPath = path.join(sourceDir, 'target', 'release', binaryName);
              
              await vscode.workspace.getConfiguration('smartMemory').update(
                'customBinaryPath',
                builtBinaryPath,
                vscode.ConfigurationTarget.Global
              );
            } catch (error) {
              vscode.window.showErrorMessage(`Failed to build server: ${error}`);
              return false;
            }
          } else if (binaryResult === specifyOption) {
            // Specify path
            progress.report({ message: "Specifying server binary path...", increment: 10 });
            if (token.isCancellationRequested) return false;
            
            const fileFilters = os.platform() === 'win32' 
              ? { 'Executables': ['exe'] } 
              : { 'Executables': ['*'] };
            
            const binaryPathResult = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              openLabel: 'Select Server Binary',
              title: 'Select Smart Memory MCP Server Binary',
              filters: fileFilters
            });
            
            if (!binaryPathResult || binaryPathResult.length === 0) {
              return false;
            }
            
            const customBinaryPath = binaryPathResult[0].fsPath;
            
            // Update the custom binary path
            await vscode.workspace.getConfiguration('smartMemory').update(
              'customBinaryPath',
              customBinaryPath,
              vscode.ConfigurationTarget.Global
            );
          } else {
            return false;
          }
        }
        
        // Step 2: Configure data directory
        progress.report({ message: "Configuring data directory...", increment: 20 });
        if (token.isCancellationRequested) return false;
        
        const useDefaultOption = 'Use Default';
        const specifyDataOption = 'Specify Path';
        
        const dataResult = await vscode.window.showInformationMessage(
          'Where would you like to store Smart Memory MCP data?',
          useDefaultOption,
          specifyDataOption
        );
        
        if (dataResult === specifyDataOption) {
          const dataDirResult = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Data Directory',
            title: 'Select Smart Memory MCP Data Directory'
          });
          
          if (dataDirResult && dataDirResult.length > 0) {
            const customDataPath = dataDirResult[0].fsPath;
            
            // Update the custom data path
            await vscode.workspace.getConfiguration('smartMemory').update(
              'customDataPath',
              customDataPath,
              vscode.ConfigurationTarget.Global
            );
          }
        }
        
        // Step 3: Configure MCP settings
        progress.report({ message: "Configuring MCP settings...", increment: 30 });
        if (token.isCancellationRequested) return false;
        
        await this.serverDiscovery.configureMcpSettings();
        
        // Step 4: Configure auto-start
        progress.report({ message: "Configuring auto-start...", increment: 20 });
        if (token.isCancellationRequested) return false;
        
        const enableAutoStartOption = 'Yes';
        const disableAutoStartOption = 'No';
        
        const autoStartResult = await vscode.window.showInformationMessage(
          'Would you like the server to start automatically when VS Code starts?',
          enableAutoStartOption,
          disableAutoStartOption
        );
        
        await vscode.workspace.getConfiguration('smartMemory').update(
          'autoStartServer',
          autoStartResult === enableAutoStartOption,
          vscode.ConfigurationTarget.Global
        );
        
        // Step 5: Start the server
        progress.report({ message: "Starting server...", increment: 10 });
        if (token.isCancellationRequested) return false;
        
        const startServerOption = 'Start Server';
        const skipStartOption = 'Skip';
        
        const startServerResult = await vscode.window.showInformationMessage(
          'Would you like to start the server now?',
          startServerOption,
          skipStartOption
        );
        
        if (startServerResult === startServerOption) {
          if (!this.serverManager) {
            vscode.window.showWarningMessage('Server manager not available. Please start the server manually.');
          } else {
            await this.serverManager.startServer();
          }
        }
        
        // Setup complete
        progress.report({ message: "Setup complete!", increment: 10 });
        
        vscode.window.showInformationMessage('Smart Memory MCP setup completed successfully!');
        return true;
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Setup failed: ${error}`);
      return false;
    }
  }
}