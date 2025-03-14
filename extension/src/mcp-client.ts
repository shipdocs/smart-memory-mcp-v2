import * as vscode from 'vscode';
import * as grpc from 'grpc-web';
import * as path from 'path';

// Define the types for our gRPC service
interface StoreRequest {
  content: string;
  content_type: string;
  metadata: { [key: string]: string };
  compress: boolean;
}

// Memory Bank types
interface MemoryBankStoreRequest {
  content: string;
  category: string;
  mode: string;
  metadata: { [key: string]: string };
  date: string;
}

interface MemoryBankStoreResponse {
  memory_id: string;
  token_count: number;
  category: string;
  success: boolean;
}

interface MemoryBankContextRequest {
  mode: string;
  max_tokens: number;
  categories: string[];
  relevance_threshold: number;
  date: string;
}

interface MemoryBankContextResponse {
  context: string;
  token_count: number;
  relevance_score: number;
  sources: MemoryBankSource[];
}

interface MemoryBankSource {
  id: string;
  category: string;
  relevance: number;
}

interface MemoryBankOptimizeRequest {
  categories: string[];
  target_tokens: number;
  strategy: string;
}

interface MemoryBankOptimizeResponse {
  tokens_before: number;
  tokens_after: number;
  tokens_saved: number;
  optimized_memories: number;
}

interface MemoryBankStatsRequest {
  days: number;
  categories: string[];
}

interface MemoryBankStatsResponse {
  total_memories: number;
  total_tokens: number;
  tokens_by_category: { [key: string]: number };
  memories_by_category: { [key: string]: number };
  category_stats: MemoryBankCategoryStats[];
}

interface MemoryBankCategoryStats {
  category: string;
  memory_count: number;
  token_count: number;
  average_relevance: number;
  last_updated: string;
}

// UMB command types
interface UmbCommandRequest {
  current_mode: string;
  current_context: string;
  metadata: { [key: string]: string };
}

interface UmbCommandResponse {
  success: boolean;
  stored_memories: number;
  total_tokens: number;
  categories: string[];
  message: string;
}

interface StoreResponse {
  memory_id: string;
  token_count: number;
  compression_ratio: number;
}

interface RetrieveRequest {
  memory_id: string;
  include_metadata: boolean;
}

interface RetrieveResponse {
  content: string;
  metadata: { [key: string]: string };
  token_count: number;
}

interface OptimizeRequest {
  memory_ids: string[];
  strategy: number; // OptimizationStrategy enum
  priority: number; // Priority enum
}

interface OptimizeResponse {
  tokens_saved: number;
  optimization_ratio: number;
  optimized_ids: string[];
}

interface ContextRequest {
  mode: string;
  max_tokens: number;
  relevance_threshold: number;
}

interface ContextResponse {
  context: string;
  token_count: number;
  relevance_score: number;
  sources: ContextSource[];
}

interface ContextSource {
  source_id: string;
  source_type: string;
  relevance: number;
}

interface SwitchModeRequest {
  new_mode: string;
  preserve_context: boolean;
}

interface SwitchModeResponse {
  success: boolean;
  preserved_tokens: number;
  previous_mode: string;
}

interface MetricsRequest {
  time_period_days: number;
  modes: string[];
}

interface MetricsResponse {
  metrics: Metric[];
  usage: UsageStats | null;
  trends: Trend[];
}

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

export class McpClient {
  private client: any;
  private serverAddress: string;
  private connected: boolean = false;

  constructor(serverAddress: string) {
    this.serverAddress = serverAddress;
    this.initClient();
  }

  private initClient() {
    try {
      // In a real implementation, we would use the generated gRPC-Web client
      // For now, we'll simulate the client with a simple object
      this.client = {
        storeMemory: this.createRpcMethod('StoreMemory'),
        retrieveMemory: this.createRpcMethod('RetrieveMemory'),
        optimizeMemory: this.createRpcMethod('OptimizeMemory'),
        getContext: this.createRpcMethod('GetContext'),
        updateContext: this.createRpcMethod('UpdateContext'),
        predictContext: this.createRpcMethod('PredictContext'),
        switchMode: this.createRpcMethod('SwitchMode'),
        analyzeMode: this.createRpcMethod('AnalyzeMode'),
        getMetrics: this.createRpcMethod('GetMetrics'),
        trackUsage: this.createRpcMethod('TrackUsage'),
        
        // Memory Bank methods
        storeMemoryBank: this.createRpcMethod('StoreMemoryBank'),
        getMemoryBankContext: this.createRpcMethod('GetMemoryBankContext'),
        optimizeMemoryBank: this.createRpcMethod('OptimizeMemoryBank'),
        getMemoryBankStats: this.createRpcMethod('GetMemoryBankStats'),
        
        // UMB command handler
        handleUmbCommand: this.createRpcMethod('HandleUmbCommand'),
        
        // Server management
        isServerRunning: this.createRpcMethod('IsServerRunning'),
        startServer: this.createRpcMethod('StartServer')
      };

      this.connected = true;
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      this.connected = false;
    }
  }

  private createRpcMethod(methodName: string) {
    return (request: any, callback: (error: Error | null, response: any) => void) => {
      // In a real implementation, this would make an actual gRPC-Web call
      // For now, we'll simulate the response based on the method name
      
      // Simulate network delay
      setTimeout(() => {
        try {
          let response: any;
          
          switch (methodName) {
            case 'IsServerRunning':
              response = {
                running: true
              };
              break;
              
            case 'StartServer':
              response = {
                success: true
              };
              break;
            case 'StoreMemory':
              response = {
                memory_id: `mem_${Math.random().toString(36).substring(2, 10)}`,
                token_count: Math.floor(request.content.length / 4),
                compression_ratio: request.compress ? 0.8 : 1.0
              };
              break;
              
            case 'RetrieveMemory':
              response = {
                content: 'Sample memory content',
                metadata: { source: 'vscode', language: 'typescript' },
                token_count: 10
              };
              break;
              
            case 'OptimizeMemory':
              response = {
                tokens_saved: 50,
                optimization_ratio: 0.3,
                optimized_ids: request.memory_ids
              };
              break;
              
            case 'GetContext':
              response = {
                context: `Context for ${request.mode} mode with ${request.max_tokens} tokens`,
                token_count: Math.min(request.max_tokens, 500),
                relevance_score: 0.75,
                sources: [
                  { source_id: 'mem_123', source_type: 'text/plain', relevance: 0.8 },
                  { source_id: 'mem_456', source_type: 'text/markdown', relevance: 0.7 }
                ]
              };
              break;
              
            case 'SwitchMode':
              response = {
                success: true,
                preserved_tokens: request.preserve_context ? 50 : 0,
                previous_mode: 'code'
              };
              break;
              
            case 'GetMetrics':
              response = {
                metrics: [
                  { name: 'Total Tokens', value: '1500', unit: 'tokens', change: 0.05 },
                  { name: 'Memory Count', value: '25', unit: 'memories', change: 0.1 }
                ],
                usage: {
                  total_tokens: 1500,
                  total_memories: 25,
                  tokens_by_mode: { code: 800, architect: 400, debug: 300 }
                },
                trends: [
                  {
                    name: 'Token Usage',
                    values: [100, 150, 200, 180, 250],
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                  }
                ]
              };
              break;
            
            // Memory Bank methods
            case 'StoreMemoryBank':
              response = {
                memory_id: `mem_${Math.random().toString(36).substring(2, 10)}`,
                token_count: Math.floor(request.content.length / 4),
                category: request.category || 'context',
                success: true
              };
              break;
              
            case 'GetMemoryBankContext':
              response = {
                context: `Memory Bank context for ${request.mode} mode with categories: ${request.categories.join(', ')}`,
                token_count: Math.min(request.max_tokens, 500),
                relevance_score: 0.85,
                sources: [
                  { id: 'mem_123', category: 'context', relevance: 0.9 },
                  { id: 'mem_456', category: 'decision', relevance: 0.8 },
                  { id: 'mem_789', category: 'progress', relevance: 0.7 }
                ]
              };
              break;
              
            case 'OptimizeMemoryBank':
              const tokensBefore = 5000;
              const tokensAfter = request.strategy === 'aggressive' ? 2500 :
                                 request.strategy === 'conservative' ? 4500 : 3500;
              response = {
                tokens_before: tokensBefore,
                tokens_after: tokensAfter,
                tokens_saved: tokensBefore - tokensAfter,
                optimized_memories: 25
              };
              break;
              
            case 'GetMemoryBankStats':
              response = {
                total_memories: 50,
                total_tokens: 10000,
                tokens_by_category: {
                  context: 5000,
                  decision: 2000,
                  progress: 3000
                },
                memories_by_category: {
                  context: 25,
                  decision: 10,
                  progress: 15
                },
                category_stats: [
                  {
                    category: 'context',
                    memory_count: 25,
                    token_count: 5000,
                    average_relevance: 0.8,
                    last_updated: new Date().toISOString().split('T')[0]
                  },
                  {
                    category: 'decision',
                    memory_count: 10,
                    token_count: 2000,
                    average_relevance: 0.7,
                    last_updated: new Date().toISOString().split('T')[0]
                  },
                  {
                    category: 'progress',
                    memory_count: 15,
                    token_count: 3000,
                    average_relevance: 0.75,
                    last_updated: new Date().toISOString().split('T')[0]
                  }
                ]
              };
              break;
              
            default:
              response = { success: true };
          }
          
          callback(null, response);
        } catch (error) {
          callback(error as Error, null);
        }
      }, 100);
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    try {
      // Try to get context as a simple test
      await this.getContext('code', 10, 0.5);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  async storeMemory(
    content: string,
    contentType: string = 'text/plain',
    metadata: { [key: string]: string } = {},
    compress: boolean = true
  ): Promise<StoreResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.storeMemory(
        {
          content,
          content_type: contentType,
          metadata,
          compress
        },
        (error: Error | null, response: StoreResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async retrieveMemory(
    memoryId: string,
    includeMetadata: boolean = true
  ): Promise<RetrieveResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.retrieveMemory(
        {
          memory_id: memoryId,
          include_metadata: includeMetadata
        },
        (error: Error | null, response: RetrieveResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async optimizeMemory(
    memoryIds: string[],
    strategy: 'BALANCED' | 'AGGRESSIVE' | 'CONSERVATIVE' = 'BALANCED',
    priority: 'NORMAL' | 'HIGH' | 'LOW' = 'NORMAL'
  ): Promise<OptimizeResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    // Convert strategy and priority to enum values
    const strategyEnum = { 'BALANCED': 0, 'AGGRESSIVE': 1, 'CONSERVATIVE': 2 }[strategy];
    const priorityEnum = { 'NORMAL': 0, 'HIGH': 1, 'LOW': 2 }[priority];

    return new Promise((resolve, reject) => {
      this.client.optimizeMemory(
        {
          memory_ids: memoryIds,
          strategy: strategyEnum,
          priority: priorityEnum
        },
        (error: Error | null, response: OptimizeResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getContext(
    mode: string,
    maxTokens: number = 1000,
    relevanceThreshold: number = 0.5
  ): Promise<ContextResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.getContext(
        {
          mode,
          max_tokens: maxTokens,
          relevance_threshold: relevanceThreshold
        },
        (error: Error | null, response: ContextResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async switchMode(
    newMode: string,
    preserveContext: boolean = true
  ): Promise<SwitchModeResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.switchMode(
        {
          new_mode: newMode,
          preserve_context: preserveContext
        },
        (error: Error | null, response: SwitchModeResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getMetrics(
    timePeriodDays: number = 7,
    modes: string[] = []
  ): Promise<MetricsResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.getMetrics(
        {
          time_period_days: timePeriodDays,
          modes
        },
        (error: Error | null, response: MetricsResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  // Memory Bank methods
  async storeMemoryBank(
    content: string,
    category: string,
    mode: string = '',
    metadata: { [key: string]: string } = {},
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<MemoryBankStoreResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.storeMemoryBank(
        {
          content,
          category,
          mode,
          metadata,
          date
        },
        (error: Error | null, response: MemoryBankStoreResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getMemoryBankContext(
    mode: string,
    maxTokens: number = 1000,
    categories: string[] = [],
    relevanceThreshold: number = 0.5,
    date: string = ''
  ): Promise<MemoryBankContextResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.getMemoryBankContext(
        {
          mode,
          max_tokens: maxTokens,
          categories,
          relevance_threshold: relevanceThreshold,
          date
        },
        (error: Error | null, response: MemoryBankContextResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async optimizeMemoryBank(
    categories: string[] = [],
    targetTokens: number = 0,
    strategy: 'balanced' | 'aggressive' | 'conservative' = 'balanced'
  ): Promise<MemoryBankOptimizeResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.optimizeMemoryBank(
        {
          categories,
          target_tokens: targetTokens,
          strategy
        },
        (error: Error | null, response: MemoryBankOptimizeResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getMemoryBankStats(
    days: number = 30,
    categories: string[] = []
  ): Promise<MemoryBankStatsResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.getMemoryBankStats(
        {
          days,
          categories
        },
        (error: Error | null, response: MemoryBankStatsResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  // UMB command handler
  async handleUmbCommand(
    currentMode: string,
    currentContext: string,
    metadata: { [key: string]: string } = {}
  ): Promise<UmbCommandResponse> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.handleUmbCommand(
        {
          current_mode: currentMode,
          current_context: currentContext,
          metadata
        },
        (error: Error | null, response: UmbCommandResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }
  
  // Server management methods
  async isServerRunning(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    return new Promise((resolve, reject) => {
      this.client.isServerRunning(
        {},
        (error: Error | null, response: { running: boolean }) => {
          if (error) {
            console.error('Error checking server status:', error);
            resolve(false);
          } else {
            resolve(response.running);
          }
        }
      );
    });
  }
  
  async startServer(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client.startServer(
        {},
        (error: Error | null, response: { success: boolean }) => {
          if (error) {
            console.error('Error starting server:', error);
            resolve(false);
          } else {
            resolve(response.success);
          }
        }
      );
    });
  }
}
