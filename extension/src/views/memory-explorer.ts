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

  // Mock memory data
  private memories: Memory[] = [
    {
      id: 'mem_123',
      content: 'console.log("Hello, World!");',
      contentType: 'text/javascript',
      metadata: { source: 'vscode', language: 'javascript', project: 'demo' },
      tokenCount: 8,
      createdAt: new Date(Date.now() - 3600000) // 1 hour ago
    },
    {
      id: 'mem_456',
      content: 'function add(a, b) { return a + b; }',
      contentType: 'text/javascript',
      metadata: { source: 'vscode', language: 'javascript', project: 'demo' },
      tokenCount: 12,
      createdAt: new Date(Date.now() - 7200000) // 2 hours ago
    },
    {
      id: 'mem_789',
      content: '# Smart Memory MCP\n\nA system for optimizing memory usage.',
      contentType: 'text/markdown',
      metadata: { source: 'vscode', language: 'markdown', project: 'smart-memory-mcp' },
      tokenCount: 15,
      createdAt: new Date(Date.now() - 86400000) // 1 day ago
    }
  ];

  constructor(private client: McpClient) {}

  refresh(): void {
    // In a real implementation, we would fetch the latest memories from the server
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoryItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryItem): Promise<MemoryItem[]> {
    if (!element) {
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
