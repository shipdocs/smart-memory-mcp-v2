import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { ServerDiscovery } from './server-discovery';
import { StatusBarManager } from './status-bar';

/**
 * ServerManager class handles the lifecycle of the server process
 */
export class ServerManager {
  private context: vscode.ExtensionContext;
  private serverDiscovery: ServerDiscovery;
  private statusBar: StatusBarManager;
  private serverProcess: child_process.ChildProcess | null = null;
  private isRunning: boolean = false;

  constructor(context: vscode.ExtensionContext, statusBar: StatusBarManager) {
    this.context = context;
    this.serverDiscovery = new ServerDiscovery(context);
    this.statusBar = statusBar;
  }

  /**
   * Check if the server is running
   */
  async checkServerStatus(): Promise<boolean> {
    // If we have a server process, check if it's still running
    if (this.serverProcess) {
      // Check if the process is still running
      if (this.serverProcess.exitCode === null) {
        this.isRunning = true;
        this.statusBar.updateServerStatus(true);
        return true;
      } else {
        this.isRunning = false;
        this.serverProcess = null;
        this.statusBar.updateServerStatus(false);
        return false;
      }
    }

    // Try to connect to the server
    try {
      // First, check if port 50051 is in use
      const isPortInUse = await this.isPortInUse(50051);
      if (isPortInUse) {
        console.log('Port 50051 is in use, assuming server is running');
        this.isRunning = true;
        this.statusBar.updateServerStatus(true);
        return true;
      }

      // Use the McpClient to check if the server is running
      // This is done by the Roo-Code extension, so we just need to check
      // if the server is configured in the MCP settings
      const homeDir = require('os').homedir();
      const platform = require('os').platform();
      let mcpSettingsPath;
      
      // Determine the path based on the operating system
      if (platform === 'darwin') {
        // macOS
        mcpSettingsPath = path.join(
          homeDir,
          'Library',
          'Application Support',
          'Code',
          'User',
          'globalStorage',
          'rooveterinaryinc.roo-cline',
          'settings',
          'cline_mcp_settings.json'
        );
      } else if (platform === 'linux') {
        // Linux
        mcpSettingsPath = path.join(
          homeDir,
          '.config',
          'Code',
          'User',
          'globalStorage',
          'rooveterinaryinc.roo-cline',
          'settings',
          'cline_mcp_settings.json'
        );
      } else if (platform === 'win32') {
        // Windows
        mcpSettingsPath = path.join(
          homeDir,
          'AppData',
          'Roaming',
          'Code',
          'User',
          'globalStorage',
          'rooveterinaryinc.roo-cline',
          'settings',
          'cline_mcp_settings.json'
        );
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Check if the MCP settings file exists
      const fs = require('fs');
      if (fs.existsSync(mcpSettingsPath)) {
        // Read the MCP settings file
        const mcpSettings = JSON.parse(fs.readFileSync(mcpSettingsPath, 'utf8'));
        
        // Check if the smart-memory server is configured and not disabled
        if (mcpSettings.mcpServers &&
            mcpSettings.mcpServers['smart-memory'] &&
            !mcpSettings.mcpServers['smart-memory'].disabled) {
          
          // The server is configured, but we need to check if it's actually running
          // We'll use the process list to check for the server process
          const processes = await this.getRunningProcesses();
          const serverProcessName = path.basename(mcpSettings.mcpServers['smart-memory'].command);
          
          // Check if the server process is running
          const isRunning = processes.some(process =>
            process.toLowerCase().includes(serverProcessName.toLowerCase())
          );
          
          this.isRunning = isRunning;
          this.statusBar.updateServerStatus(isRunning);
          return isRunning;
        }
      }

      this.isRunning = false;
      this.statusBar.updateServerStatus(false);
      return false;
    } catch (error) {
      console.error('Error checking server status:', error);
      this.isRunning = false;
      this.statusBar.updateServerStatus(false);
      return false;
    }
  }

  /**
   * Check if a port is in use
   */
  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const tester = net.createServer()
        .once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .once('listening', () => {
          tester.once('close', () => {
            resolve(false);
          }).close();
        })
        .listen(port);
    });
  }

  /**
   * Get a list of running processes
   */
  private async getRunningProcesses(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const platform = require('os').platform();
      let command;
      
      if (platform === 'win32') {
        command = 'tasklist';
      } else {
        command = 'ps -e';
      }
      
      child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        resolve(stdout.split('\n'));
      });
    });
  }

  /**
   * Start the server
   */
  async startServer(): Promise<boolean> {
    try {
      // Create output channel for server logs
      const outputChannel = vscode.window.createOutputChannel('Smart Memory MCP Server');
      outputChannel.show();
      
      // Configure the MCP settings first
      await this.serverDiscovery.configureMcpSettings();
      
      // Use the server manager script
      const scriptPath = path.join(this.context.extensionPath, 'scripts', 'smart-memory-mcp-server-manager.js');
      outputChannel.appendLine(`Using server manager script: ${scriptPath}`);
      
      // Execute the script with the start command
      const result = child_process.spawnSync('node', [scriptPath, 'start'], {
        encoding: 'utf8'
      });
      
      if (result.error) {
        throw result.error;
      }
      
      // Log the output
      if (result.stdout) {
        outputChannel.appendLine(result.stdout);
      }
      
      if (result.stderr) {
        outputChannel.appendLine(result.stderr);
      }
      
      // Check if the server is running
      const isRunning = await this.checkServerStatus();
      if (isRunning) {
        this.isRunning = true;
        this.statusBar.updateServerStatus(true);
        vscode.window.showInformationMessage('Smart Memory MCP server started successfully');
        return true;
      } else {
        throw new Error('Server failed to start');
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      this.isRunning = false;
      this.statusBar.updateServerStatus(false);
      vscode.window.showErrorMessage(`Failed to start Smart Memory MCP server: ${error}`);
      return false;
    }
  }

  /**
   * Stop the server
   */
  async stopServer(): Promise<boolean> {
    try {
      // Create output channel for server logs
      const outputChannel = vscode.window.createOutputChannel('Smart Memory MCP Server');
      outputChannel.show();
      
      // Use the server manager script
      const scriptPath = path.join(this.context.extensionPath, 'scripts', 'smart-memory-mcp-server-manager.js');
      outputChannel.appendLine(`Using server manager script: ${scriptPath}`);
      
      // Execute the script with the stop command
      const result = child_process.spawnSync('node', [scriptPath, 'stop'], {
        encoding: 'utf8'
      });
      
      if (result.error) {
        throw result.error;
      }
      
      // Log the output
      if (result.stdout) {
        outputChannel.appendLine(result.stdout);
      }
      
      if (result.stderr) {
        outputChannel.appendLine(result.stderr);
      }
      
      this.serverProcess = null;
      this.isRunning = false;
      this.statusBar.updateServerStatus(false);
      vscode.window.showInformationMessage('Smart Memory MCP server stopped successfully');
      return true;
    } catch (error) {
      console.error('Failed to stop server:', error);
      vscode.window.showErrorMessage(`Failed to stop Smart Memory MCP server: ${error}`);
      return false;
    }
  }

  /**
   * Restart the server
   */
  async restartServer(): Promise<boolean> {
    try {
      // Create output channel for server logs
      const outputChannel = vscode.window.createOutputChannel('Smart Memory MCP Server');
      outputChannel.show();
      
      // Use the server manager script
      const scriptPath = path.join(this.context.extensionPath, 'scripts', 'smart-memory-mcp-server-manager.js');
      outputChannel.appendLine(`Using server manager script: ${scriptPath}`);
      
      // Execute the script with the restart command
      const result = child_process.spawnSync('node', [scriptPath, 'restart'], {
        encoding: 'utf8'
      });
      
      if (result.error) {
        throw result.error;
      }
      
      // Log the output
      if (result.stdout) {
        outputChannel.appendLine(result.stdout);
      }
      
      if (result.stderr) {
        outputChannel.appendLine(result.stderr);
      }
      
      // Check if the server is running
      const isRunning = await this.checkServerStatus();
      if (isRunning) {
        this.isRunning = true;
        this.statusBar.updateServerStatus(true);
        vscode.window.showInformationMessage('Smart Memory MCP server restarted successfully');
        return true;
      } else {
        throw new Error('Server failed to restart');
      }
    } catch (error) {
      console.error('Failed to restart server:', error);
      vscode.window.showErrorMessage(`Failed to restart Smart Memory MCP server: ${error}`);
      return false;
    }
  }
}