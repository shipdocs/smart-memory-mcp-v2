import * as vscode from 'vscode';
import { McpClient } from './mcp-client';
import { MemoryExplorerProvider } from './views/memory-explorer';
import { MemoryMetricsProvider } from './views/memory-metrics';
import { StatusBarManager } from './status-bar';
import { ServerManager } from './server-manager';

export function registerCommands(
  context: vscode.ExtensionContext,
  client: McpClient,
  memoryExplorerProvider: MemoryExplorerProvider,
  memoryMetricsProvider: MemoryMetricsProvider,
  statusBarManager: StatusBarManager,
  serverManager: ServerManager
) {
  // Store memory command
  const storeMemoryCommand = vscode.commands.registerCommand('smartMemory.storeMemory', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
      vscode.window.showErrorMessage('No text selected');
      return;
    }

    try {
      // Get metadata from the current document
      const metadata: { [key: string]: string } = {
        source: 'vscode',
        file: editor.document.fileName,
        language: editor.document.languageId
      };

      // Add project name if available
      if (vscode.workspace.name) {
        metadata.project = vscode.workspace.name;
      }

      // Store the memory
      const result = await client.storeMemory(text, 'text/plain', metadata);
      
      vscode.window.showInformationMessage(`Memory stored with ID: ${result.memory_id} (${result.token_count} tokens)`);
      
      // Refresh the memory explorer
      memoryExplorerProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to store memory: ${error}`);
    }
  });

  // Retrieve memory command
  const retrieveMemoryCommand = vscode.commands.registerCommand('smartMemory.retrieveMemory', async () => {
    try {
      // In a real implementation, we would fetch a list of memories from the server
      // For now, we'll use a mock list
      const memories = [
        { id: 'mem_123', label: 'Code snippet: Hello World', description: 'Simple example' },
        { id: 'mem_456', label: 'Architecture: MVC Pattern', description: 'Design pattern' },
        { id: 'mem_789', label: 'Debug: Connection error', description: 'Error handling' }
      ];
      
      // Show quick pick to select a memory
      const selectedMemory = await vscode.window.showQuickPick(
        memories.map(mem => ({
          label: mem.label,
          description: mem.description,
          detail: mem.id
        })),
        { placeHolder: 'Select a memory to retrieve' }
      );
      
      if (selectedMemory) {
        // Retrieve the memory content
        const memoryId = selectedMemory.detail!;
        const result = await client.retrieveMemory(memoryId);
        
        // Insert into editor if active
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, result.content);
          });
          
          vscode.window.showInformationMessage(`Memory inserted (${result.token_count} tokens)`);
        } else {
          // Show in a new document if no editor is active
          const document = await vscode.workspace.openTextDocument({
            content: result.content,
            language: 'plaintext'
          });
          
          await vscode.window.showTextDocument(document);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to retrieve memory: ${error}`);
    }
  });

  // Optimize memory command
  const optimizeMemoryCommand = vscode.commands.registerCommand('smartMemory.optimizeMemory', async () => {
    try {
      // Show optimization strategy options
      const strategies = [
        { label: 'Balanced', description: 'Default optimization strategy' },
        { label: 'Aggressive', description: 'Maximum token reduction' },
        { label: 'Conservative', description: 'Minimal content changes' }
      ];
      
      const selectedStrategy = await vscode.window.showQuickPick(strategies, {
        placeHolder: 'Select optimization strategy'
      });
      
      if (selectedStrategy) {
        // In a real implementation, we would fetch memory IDs from the server
        // For now, we'll use mock IDs
        const memoryIds = ['mem_123', 'mem_456', 'mem_789'];
        
        // Convert strategy label to enum value
        const strategyValue = selectedStrategy.label.toUpperCase() as 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE';
        
        // Call optimize API
        const result = await client.optimizeMemory(memoryIds, strategyValue);
        
        vscode.window.showInformationMessage(
          `Optimization complete: ${result.tokens_saved} tokens saved (${result.optimization_ratio * 100}% reduction)`
        );
        
        // Refresh the memory explorer
        memoryExplorerProvider.refresh();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to optimize memories: ${error}`);
    }
  });

  // Get context command
  const getContextCommand = vscode.commands.registerCommand('smartMemory.getContext', async () => {
    try {
      // Get the current mode from VS Code settings or use 'code' as default
      const currentMode = vscode.workspace.getConfiguration('smartMemory').get<string>('currentMode') || 'code';
      const maxTokens = vscode.workspace.getConfiguration('smartMemory').get<number>('maxTokens') || 2000;
      const relevanceThreshold = vscode.workspace.getConfiguration('smartMemory').get<number>('relevanceThreshold') || 0.5;
      
      // Get context for the current mode
      const result = await client.getContext(currentMode, maxTokens, relevanceThreshold);
      
      // Show the context in a new editor
      const document = await vscode.workspace.openTextDocument({
        content: result.context,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
      
      vscode.window.showInformationMessage(`Context retrieved with ${result.token_count} tokens and relevance score ${result.relevance_score.toFixed(2)}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get context: ${error}`);
    }
  });

  // Switch mode command
  const switchModeCommand = vscode.commands.registerCommand('smartMemory.switchMode', async () => {
    try {
      // Show a quick pick of available modes
      const modes = ['code', 'architect', 'debug', 'test', 'ask'];
      const selectedMode = await vscode.window.showQuickPick(modes, {
        placeHolder: 'Select a mode to switch to'
      });
      
      if (selectedMode) {
        // Ask if context should be preserved
        const preserveContext = await vscode.window.showQuickPick(
          [
            { label: 'Yes', description: 'Preserve relevant context when switching modes' },
            { label: 'No', description: 'Start with a clean context in the new mode' }
          ],
          { placeHolder: 'Preserve context?' }
        );
        
        if (preserveContext) {
          // Call the server to switch modes
          const result = await client.switchMode(
            selectedMode,
            preserveContext.label === 'Yes'
          );
          
          if (result.success) {
            // Update the current mode in VS Code settings
            await vscode.workspace.getConfiguration('smartMemory').update('currentMode', selectedMode, true);
            
            // Update the status bar
            statusBarManager.updateMode(selectedMode);
            
            const preservedMsg = result.preserved_tokens > 0
              ? ` (preserved ${result.preserved_tokens} tokens)`
              : '';
              
            vscode.window.showInformationMessage(
              `Switched from ${result.previous_mode} to ${selectedMode} mode${preservedMsg}`
            );
          } else {
            vscode.window.showErrorMessage(`Failed to switch to ${selectedMode} mode`);
          }
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to switch mode: ${error}`);
    }
  });

  // Show metrics command
  const showMetricsCommand = vscode.commands.registerCommand('smartMemory.showMetrics', async () => {
    // Refresh the metrics view
    memoryMetricsProvider.refresh();
    
    // Focus the metrics view
    vscode.commands.executeCommand('smartMemoryMetrics.focus');
  });

  // UMB command
  const umbCommand = vscode.commands.registerCommand('smartMemory.updateMemoryBank', async () => {
    try {
      // Get the current mode from VS Code settings or use 'code' as default
      const currentMode = vscode.workspace.getConfiguration('smartMemory').get<string>('currentMode') || 'code';
      
      // Get the current context from the active editor
      let currentContext = '';
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        currentContext = editor.document.getText();
      } else {
        // If no editor is active, ask the user for context
        currentContext = await vscode.window.showInputBox({
          prompt: 'Enter context for UMB command',
          placeHolder: 'Current session context...'
        }) || '';
      }
      
      if (!currentContext) {
        vscode.window.showErrorMessage('No context provided for UMB command');
        return;
      }
      
      // Add metadata
      const metadata: { [key: string]: string } = {
        source: 'vscode',
        timestamp: new Date().toISOString()
      };
      
      // Add project name if available
      if (vscode.workspace.name) {
        metadata.project = vscode.workspace.name;
      }
      
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Updating Memory Bank",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "Processing context..." });
        
        // Call the UMB command handler
        const result = await client.handleUmbCommand(currentMode, currentContext, metadata);
        
        if (result.success) {
          progress.report({ message: `Stored ${result.stored_memories} memories with ${result.total_tokens} tokens` });
        } else {
          vscode.window.showErrorMessage(`Failed to update memory bank: ${result.message}`);
        }
      });
      
      vscode.window.showInformationMessage('Memory Bank updated successfully');
      
      // Refresh the memory explorer
      memoryExplorerProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to handle UMB command: ${error}`);
    }
  });

  // Start server command
  const startServerCommand = vscode.commands.registerCommand('smartMemory.startServer', async () => {
    try {
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Starting Smart Memory MCP Server",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "Initializing server..." });
        
        // Check if the server is already running
        const isRunning = await serverManager.checkServerStatus();
        if (isRunning) {
          vscode.window.showInformationMessage('Smart Memory MCP server is already running');
          return;
        }
        
        // Start the server
        progress.report({ message: "Starting server..." });
        const success = await serverManager.startServer();
        
        if (success) {
          progress.report({ message: "Server started successfully" });
          vscode.window.showInformationMessage('Smart Memory MCP server started successfully');
        } else {
          vscode.window.showErrorMessage('Failed to start Smart Memory MCP server');
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start server: ${error}`);
    }
  });

  // Stop server command
  const stopServerCommand = vscode.commands.registerCommand('smartMemory.stopServer', async () => {
    try {
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Stopping Smart Memory MCP Server",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "Stopping server..." });
        
        const success = await serverManager.stopServer();
        
        if (success) {
          progress.report({ message: "Server stopped successfully" });
          vscode.window.showInformationMessage('Smart Memory MCP server stopped successfully');
        } else {
          vscode.window.showErrorMessage('Failed to stop Smart Memory MCP server');
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop server: ${error}`);
    }
  });

  // Restart server command
  const restartServerCommand = vscode.commands.registerCommand('smartMemory.restartServer', async () => {
    try {
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Restarting Smart Memory MCP Server",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "Stopping server..." });
        
        // Stop the server
        await serverManager.stopServer();
        
        progress.report({ message: "Starting server..." });
        
        // Start the server
        const success = await serverManager.startServer();
        
        if (success) {
          progress.report({ message: "Server restarted successfully" });
          vscode.window.showInformationMessage('Smart Memory MCP server restarted successfully');
        } else {
          vscode.window.showErrorMessage('Failed to restart Smart Memory MCP server');
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restart server: ${error}`);
    }
  });

  // Register all commands
  context.subscriptions.push(
    storeMemoryCommand,
    retrieveMemoryCommand,
    optimizeMemoryCommand,
    getContextCommand,
    switchModeCommand,
    showMetricsCommand,
    umbCommand,
    startServerCommand,
    stopServerCommand,
    restartServerCommand
  );
}
