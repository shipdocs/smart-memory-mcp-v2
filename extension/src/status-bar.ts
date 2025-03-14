import * as vscode from 'vscode';
import { McpClient } from './mcp-client';

export class StatusBarManager {
  private modeStatusBarItem: vscode.StatusBarItem;
  private tokenStatusBarItem: vscode.StatusBarItem;
  private serverStatusBarItem: vscode.StatusBarItem;
  private client: McpClient;

  constructor(client: McpClient) {
    this.client = client;

    // Create status bar items
    this.modeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.modeStatusBarItem.command = 'smartMemory.switchMode';
    
    this.tokenStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.tokenStatusBarItem.command = 'smartMemory.showMetrics';
    
    this.serverStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.serverStatusBarItem.command = 'smartMemory.startServer';

    // Initialize status bar items
    this.updateMode(vscode.workspace.getConfiguration('smartMemory').get<string>('currentMode') || 'code');
    this.updateTokenCount(0);
    this.updateServerStatus(false);

    // Show status bar items
    this.modeStatusBarItem.show();
    this.tokenStatusBarItem.show();
    this.serverStatusBarItem.show();
  }

  updateMode(mode: string) {
    this.modeStatusBarItem.text = `$(brain) ${mode}`;
    this.modeStatusBarItem.tooltip = `Smart Memory: Current mode is ${mode}`;
  }

  updateTokenCount(tokenCount: number) {
    this.tokenStatusBarItem.text = `$(symbol-numeric) ${tokenCount} tokens`;
    this.tokenStatusBarItem.tooltip = `Smart Memory: ${tokenCount} tokens used`;
  }
  
  updateServerStatus(isRunning: boolean) {
    if (isRunning) {
      this.serverStatusBarItem.text = `$(check) Server`;
      this.serverStatusBarItem.tooltip = `Smart Memory MCP server is running`;
    } else {
      this.serverStatusBarItem.text = `$(error) Server`;
      this.serverStatusBarItem.tooltip = `Smart Memory MCP server is not running. Click to start.`;
    }
  }

  dispose() {
    this.modeStatusBarItem.dispose();
    this.tokenStatusBarItem.dispose();
    this.serverStatusBarItem.dispose();
  }
}
