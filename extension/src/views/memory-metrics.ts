import * as vscode from 'vscode';
import { McpClient } from '../mcp-client';

// Mock metrics data for demonstration
interface Metric {
  name: string;
  value: string;
  unit: string;
  change: number;
}

interface UsageStats {
  total_tokens: number;
  total_memories: number;
  tokens_by_mode: { [key: string]: number };
}

interface Trend {
  name: string;
  values: number[];
  labels: string[];
}

export class MemoryMetricsProvider implements vscode.TreeDataProvider<MetricItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MetricItem | undefined | null | void> = new vscode.EventEmitter<MetricItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MetricItem | undefined | null | void> = this._onDidChangeTreeData.event;

  // Metrics data
  private metrics: Metric[] = [];
  private usageStats: UsageStats | null = null;
  private trends: Trend[] = [];
  private isLoading: boolean = false;
  private lastError: string | null = null;

  constructor(private client: McpClient) {
    this.fetchMetrics();
  }

  refresh(): void {
    this.fetchMetrics();
    this._onDidChangeTreeData.fire();
  }

  private async fetchMetrics(): Promise<void> {
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
      
      // Fetch metrics from the server
      const result = await this.client.getMetrics(7);
      this.metrics = result.metrics;
      this.usageStats = result.usage;
      this.trends = result.trends;
      
      // If we have no metrics, show a message
      if (!this.metrics.length && !this.usageStats && !this.trends.length) {
        this.lastError = "No metrics available. Try using the memory bank first.";
      }
    } catch (error: any) {
      console.error('Failed to fetch metrics:', error);
      this.lastError = `Error: ${error.message || 'Unknown error'}`;
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(element: MetricItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MetricItem): Promise<MetricItem[]> {
    // If we're loading, show a loading indicator
    if (this.isLoading && !element) {
      return [
        new MetricItem(
          'Loading...',
          vscode.TreeItemCollapsibleState.None,
          'loading',
          'Fetching metrics from the server'
        )
      ];
    }
    
    // If we have an error, show it
    if (this.lastError && !element) {
      return [
        new MetricItem(
          this.lastError,
          vscode.TreeItemCollapsibleState.None,
          'error',
          'Error fetching metrics'
        )
      ];
    }
    
    if (!element) {
      // If we have no metrics, show a message
      if (!this.metrics.length && !this.usageStats && !this.trends.length) {
        return [
          new MetricItem(
            'No metrics available',
            vscode.TreeItemCollapsibleState.None,
            'empty',
            'Try using the memory bank first'
          )
        ];
      }
      
      // Root level - return metrics categories
      return [
        new MetricItem(
          'Token Usage',
          vscode.TreeItemCollapsibleState.Expanded,
          'tokens',
          'Token usage statistics'
        ),
        new MetricItem(
          'Memory Statistics',
          vscode.TreeItemCollapsibleState.Collapsed,
          'memory',
          'Memory usage statistics'
        ),
        new MetricItem(
          'Mode Effectiveness',
          vscode.TreeItemCollapsibleState.Collapsed,
          'mode',
          'Mode effectiveness metrics'
        )
      ];
    } else if (element.contextValue === 'tokens') {
      // Token usage metrics
      const items: MetricItem[] = [];
      
      if (this.usageStats) {
        items.push(
          new MetricItem(
            `Total Tokens: ${this.usageStats.total_tokens}`,
            vscode.TreeItemCollapsibleState.None,
            'metric',
            'Total number of tokens used'
          )
        );
        
        // Add token usage by mode
        Object.entries(this.usageStats.tokens_by_mode).forEach(([mode, tokens]) => {
          items.push(
            new MetricItem(
              `${mode}: ${tokens} tokens`,
              vscode.TreeItemCollapsibleState.None,
              'metric',
              `Number of tokens used in ${mode} mode`
            )
          );
        });
      }
      
      // Add trend data if available
      const tokenTrend = this.trends.find(t => t.name === 'Token Usage');
      if (tokenTrend) {
        items.push(
          new MetricItem(
            'Token Usage Trend',
            vscode.TreeItemCollapsibleState.None,
            'trend',
            `Trend: ${tokenTrend.values.join(', ')} (${tokenTrend.labels.join(', ')})`
          )
        );
      }
      
      return items;
    } else if (element.contextValue === 'memory') {
      // Memory statistics
      const items: MetricItem[] = [];
      
      if (this.usageStats) {
        items.push(
          new MetricItem(
            `Total Memories: ${this.usageStats.total_memories}`,
            vscode.TreeItemCollapsibleState.None,
            'metric',
            'Total number of stored memories'
          )
        );
      }
      
      // Add memory-related metrics
      this.metrics
        .filter(m => m.name.toLowerCase().includes('memory'))
        .forEach(metric => {
          const changeIndicator = metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '';
          const changePercent = Math.abs(metric.change * 100).toFixed(1);
          
          items.push(
            new MetricItem(
              `${metric.name}: ${metric.value} ${metric.unit} ${changeIndicator}${changePercent}%`,
              vscode.TreeItemCollapsibleState.None,
              'metric',
              `${metric.name} (${metric.change >= 0 ? 'increased' : 'decreased'} by ${changePercent}%)`
            )
          );
        });
      
      return items;
    } else if (element.contextValue === 'mode') {
      // Mode effectiveness metrics
      const items: MetricItem[] = [];
      
      // Add mode-related metrics
      this.metrics
        .filter(m => m.name.toLowerCase().includes('mode') || m.name.toLowerCase().includes('effectiveness'))
        .forEach(metric => {
          const changeIndicator = metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '';
          const changePercent = Math.abs(metric.change * 100).toFixed(1);
          
          items.push(
            new MetricItem(
              `${metric.name}: ${metric.value} ${metric.unit} ${changeIndicator}${changePercent}%`,
              vscode.TreeItemCollapsibleState.None,
              'metric',
              `${metric.name} (${metric.change >= 0 ? 'increased' : 'decreased'} by ${changePercent}%)`
            )
          );
        });
      
      return items;
    }
    
    return [];
  }
}

export class MetricItem extends vscode.TreeItem {
  iconPath?: vscode.ThemeIcon;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly tooltip?: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = tooltip;
    this.command = command;
    
    // Set icon based on context value
    if (contextValue === 'tokens') {
      this.iconPath = new vscode.ThemeIcon('symbol-numeric');
    } else if (contextValue === 'memory') {
      this.iconPath = new vscode.ThemeIcon('database');
    } else if (contextValue === 'mode') {
      this.iconPath = new vscode.ThemeIcon('symbol-enum');
    } else if (contextValue === 'metric') {
      this.iconPath = new vscode.ThemeIcon('dashboard');
    } else if (contextValue === 'trend') {
      this.iconPath = new vscode.ThemeIcon('graph');
    } else if (contextValue === 'loading') {
      this.iconPath = new vscode.ThemeIcon('loading~spin');
    } else if (contextValue === 'error') {
      this.iconPath = new vscode.ThemeIcon('error');
    } else if (contextValue === 'empty') {
      this.iconPath = new vscode.ThemeIcon('info');
    } else {
      this.iconPath = new vscode.ThemeIcon('graph');
    }
  }
}
