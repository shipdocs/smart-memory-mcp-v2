import * as vscode from 'vscode';
import { McpClient } from '../mcp-client';

// Mock memory data for demonstration
interface Memory {
  id: string;
  content: string;
  contentType: string;
  metadata: { [key: string]: string };
  tokenCount: number;
  createdAt: Date;
}

export class MemoryExplorerProvider implements vscode.TreeDataProvider<MemoryItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MemoryItem | undefined | null | void> = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

  // Memory data
  private memories: Memory[] = [];
  private isLoading: boolean = false;
  private lastError: string | null = null;

  constructor(private client: McpClient) {
    // Refresh the view when created
    this.refresh().catch(error => {
      console.error('Error refreshing memory explorer on initialization:', error);
    });
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this.lastError = null;
    this._onDidChangeTreeData.fire();
    
    try {
      // Check if the client is connected to the server
      const isConnected = await this.client.testConnection().catch(() => false);
      
      if (!isConnected) {
        this.lastError = "Not connected to Smart Memory MCP server";
        this.isLoading = false;
        this._onDidChangeTreeData.fire();
        return;
      }
      
      // Fetch memories from the server
      // Since there's no direct API to list all memories, we'll use the memory bank stats
      // to get some basic information and then fetch details as needed
      const stats = await this.client.getMemoryBankStats(30);
      
      // Clear existing memories
      this.memories = [];
      
      // For each category, fetch some sample memories
      if (stats.category_stats && stats.category_stats.length > 0) {
        for (const categoryStat of stats.category_stats) {
          try {
            // Get context for this category to extract memory IDs
            const context = await this.client.getMemoryBankContext(
              'code', // Default mode
              100, // Small token limit to just get a few memories
              [categoryStat.category],
              0.1 // Low threshold to get more results
            );
            
            // Extract memory IDs from sources
            if (context.sources && context.sources.length > 0) {
              for (const source of context.sources) {
                try {
                  // Retrieve the actual memory content
                  const memory = await this.client.retrieveMemory(source.id);
                  
                  // Add to our list
                  this.memories.push({
                    id: source.id,
                    content: memory.content,
                    contentType: memory.metadata?.content_type || 'text/plain',
                    metadata: memory.metadata || {},
                    tokenCount: memory.token_count,
                    createdAt: new Date(memory.metadata?.timestamp || Date.now())
                  });
                } catch (memoryError) {
                  console.error(`Error retrieving memory ${source.id}:`, memoryError);
                }
              }
            }
          } catch (categoryError) {
            console.error(`Error fetching memories for category ${categoryStat.category}:`, categoryError);
          }
        }
      }
      
      // If we couldn't get any memories, show a message
      if (this.memories.length === 0) {
        this.lastError = "No memories found. Try storing some memories first.";
      }
    } catch (error: any) {
      console.error('Error refreshing memory explorer:', error);
      this.lastError = `Error: ${error.message || 'Unknown error'}`;
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryItem): Promise<MemoryItem[]> {
    // If we're loading, show a loading indicator
    if (this.isLoading && !element) {
      return [
        new MemoryItem(
          'Loading...',
          vscode.TreeItemCollapsibleState.None,
          'loading',
          'Fetching memories from the server'
        )
      ];
    }
    
    // If we have an error, show it
    if (this.lastError && !element) {
      return [
        new MemoryItem(
          this.lastError,
          vscode.TreeItemCollapsibleState.None,
          'error',
          'Error fetching memories'
        )
      ];
    }
    
    if (!element) {
      // If we have no memories, show a message
      if (this.memories.length === 0) {
        return [
          new MemoryItem(
            'No memories found',
            vscode.TreeItemCollapsibleState.None,
            'empty',
            'Try storing some memories first'
          )
        ];
      }
      
      // Root level - return memory categories
      return [
        new MemoryItem(
          'Recent Memories',
          vscode.TreeItemCollapsibleState.Expanded,
          'recent',
          'Recent memories from the current session'
        ),
        new MemoryItem(
          'By Project',
          vscode.TreeItemCollapsibleState.Collapsed,
          'project',
          'Memories organized by project'
        ),
        new MemoryItem(
          'By Language',
          vscode.TreeItemCollapsibleState.Collapsed,
          'language',
          'Memories organized by programming language'
        )
      ];
    } else if (element.contextValue === 'recent') {
      // Return recent memories
      return this.memories
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(memory => this.createMemoryItem(memory));
    } else if (element.contextValue === 'project') {
      // Group memories by project
      const projects = new Set<string>();
      this.memories.forEach(memory => {
        if (memory.metadata.project) {
          projects.add(memory.metadata.project);
        }
      });
      
      return Array.from(projects).map(project =>
        new MemoryItem(
          project,
          vscode.TreeItemCollapsibleState.Collapsed,
          `project:${project}`,
          `Memories for project: ${project}`
        )
      );
    } else if (element.contextValue === 'language') {
      // Group memories by language
      const languages = new Set<string>();
      this.memories.forEach(memory => {
        if (memory.metadata.language) {
          languages.add(memory.metadata.language);
        }
      });
      
      return Array.from(languages).map(language =>
        new MemoryItem(
          language,
          vscode.TreeItemCollapsibleState.Collapsed,
          `language:${language}`,
          `Memories in language: ${language}`
        )
      );
    } else if (element.contextValue.startsWith('project:')) {
      // Return memories for a specific project
      const project = element.contextValue.substring('project:'.length);
      return this.memories
        .filter(memory => memory.metadata.project === project)
        .map(memory => this.createMemoryItem(memory));
    } else if (element.contextValue.startsWith('language:')) {
      // Return memories for a specific language
      const language = element.contextValue.substring('language:'.length);
      return this.memories
        .filter(memory => memory.metadata.language === language)
        .map(memory => this.createMemoryItem(memory));
    }
    
    return [];
  }

  private createMemoryItem(memory: Memory): MemoryItem {
    // Create a preview of the content (first 30 chars)
    const preview = memory.content.length > 30
      ? memory.content.substring(0, 30) + '...'
      : memory.content;
    
    // Format the date
    const date = memory.createdAt.toLocaleString();
    
    // Determine the icon based on content type
    let icon: vscode.ThemeIcon;
    if (memory.contentType.includes('javascript')) {
      icon = new vscode.ThemeIcon('symbol-method');
    } else if (memory.contentType.includes('markdown')) {
      icon = new vscode.ThemeIcon('markdown');
    } else if (memory.contentType.includes('json')) {
      icon = new vscode.ThemeIcon('json');
    } else {
      icon = new vscode.ThemeIcon('symbol-variable');
    }
    
    // Create a command to insert the memory
    const command = {
      command: 'smartMemory.retrieveMemory',
      title: 'Retrieve Memory',
      arguments: [memory.id]
    };
    
    // Create and return the memory item with all properties
    const memoryItem = new MemoryItem(
      preview,
      vscode.TreeItemCollapsibleState.None,
      `memory:${memory.id}`,
      `ID: ${memory.id}\nType: ${memory.contentType}\nTokens: ${memory.tokenCount}\nCreated: ${date}`,
      command,
      icon
    );
    
    return memoryItem;
  }

  // Method to add a new memory to the list
  addMemory(memory: Memory): void {
    this.memories.push(memory);
    this.refresh();
  }
}

export class MemoryItem extends vscode.TreeItem {
  iconPath?: vscode.ThemeIcon;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly tooltip?: string,
    public readonly command?: vscode.Command,
    customIcon?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.command = command;
    this.iconPath = customIcon || new vscode.ThemeIcon('symbol-variable');
  }
}
