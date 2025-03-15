import * as vscode from 'vscode';
import * as grpcWeb from 'grpc-web';
import * as path from 'path';
import * as fs from 'fs';
import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';

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
  private protoPath: string;
  private grpcService: any;
  private initPromise: Promise<void>;

  constructor(serverAddress: string) {
    this.serverAddress = serverAddress;
    // Fix the path to point to the correct proto file location
    this.protoPath = path.join(__dirname, '../../../proto/smart_memory.proto');
    this.initPromise = this.initClient();
  }

  private async initClient(): Promise<void> {
    try {
      // Check if the proto file exists
      if (!fs.existsSync(this.protoPath)) {
        throw new Error(`Proto file not found at ${this.protoPath}`);
      }

      // Load the proto file
      const packageDefinition = await protoLoader.load(this.protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });
      
      // Create the gRPC service
      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
      this.grpcService = protoDescriptor.smart_memory?.SmartMemoryMcp;
      
      if (!this.grpcService) {
        throw new Error('SmartMemoryMcp service not found in proto file');
      }
      
      // Create the gRPC client
      this.client = new this.grpcService(
        this.serverAddress,
        grpc.credentials.createInsecure()
      );
      
      // Test the connection
      try {
        // Try to connect to the server using a simple health check
        await new Promise<void>((resolve, reject) => {
          const deadline = new Date();
          deadline.setSeconds(deadline.getSeconds() + 5); // 5 second timeout
          
          this.client.waitForReady(deadline, (error: Error | null) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        
        console.log(`Successfully connected to server at ${this.serverAddress}`);
        this.connected = true;
      } catch (connectionError) {
        console.warn(`Could not connect to server: ${connectionError}`);
        throw new Error(`Could not connect to Smart Memory MCP server at ${this.serverAddress}. Please ensure the server is running.`);
      }
      
      console.log(`Connected to Smart Memory MCP server at ${this.serverAddress}`);
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      this.connected = false;
      throw error;
    }
  }

  private initMockClient() {
    console.error('Mock client implementation has been removed.');
    console.error('Please ensure the Smart Memory MCP server is running.');
    this.connected = false;
    throw new Error('Mock client implementation has been removed. Please ensure the Smart Memory MCP server is running.');
  }

  async testConnection(): Promise<boolean> {
    try {
      // Wait for initialization to complete
      await this.initPromise;
      
      if (!this.connected) {
        throw new Error('Client not initialized. Please ensure the Smart Memory MCP server is running.');
      }

      // Try to get context as a simple test
      await this.getContext('code', 10, 0.5);
      console.log('Connection test successful');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.connected = false;
      throw new Error(`Connection test failed: ${error}. Please ensure the Smart Memory MCP server is running.`);
    }
  }

  async storeMemory(
    content: string,
    contentType: string = 'text/plain',
    metadata: { [key: string]: string } = {},
    compress: boolean = true
  ): Promise<StoreResponse> {
    // Wait for initialization to complete
    await this.initPromise;
    
    if (!this.connected) {
      throw new Error('Client not initialized. Please ensure the Smart Memory MCP server is running.');
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
    // Wait for initialization to complete
    await this.initPromise;
    
    if (!this.connected) {
      throw new Error('Client not initialized. Please ensure the Smart Memory MCP server is running.');
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
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
    // Wait for initialization to complete
    await this.initPromise;
    
    if (!this.connected) {
      throw new Error('Client not initialized. Please ensure the Smart Memory MCP server is running to update the Memory Bank.');
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
            console.error('Error updating Memory Bank:', error);
            reject(new Error(`Failed to update Memory Bank: ${error}. Please ensure the Smart Memory MCP server is running.`));
          } else {
            console.log('Memory Bank updated successfully:', response);
            resolve(response);
          }
        }
      );
    });
  }
  
  // Server management methods
  async isServerRunning(): Promise<boolean> {
    try {
      // Wait for initialization to complete
      await this.initPromise;
      
      if (!this.connected) {
        return false;
      }
    } catch (error) {
      console.error('Error checking server status:', error);
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
    try {
      // Wait for initialization to complete
      await this.initPromise;
      
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
    } catch (error) {
      console.error('Error starting server:', error);
      return false;
    }
  }
}
