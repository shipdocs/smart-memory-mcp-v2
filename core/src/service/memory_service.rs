use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use tonic::{Request, Response, Status};
use anyhow::{Result, Context as AnyhowContext};

use crate::proto::smart_memory_mcp_server::{SmartMemoryMcp, SmartMemoryMcpServer};
use crate::proto::{
    StoreRequest, StoreResponse, RetrieveRequest, RetrieveResponse,
    OptimizeRequest, OptimizeResponse, ContextRequest, ContextResponse,
    UpdateContextRequest, UpdateContextResponse, PredictRequest, PredictResponse,
    SwitchModeRequest, SwitchModeResponse, AnalyzeModeRequest, AnalyzeModeResponse,
    MetricsRequest, MetricsResponse, UsageRequest, UsageResponse,
    ContextSource, OptimizationStrategy, Priority,
    // Memory Bank messages
    MemoryBankStoreRequest, MemoryBankStoreResponse,
    MemoryBankContextRequest, MemoryBankContextResponse,
    MemoryBankOptimizeRequest, MemoryBankOptimizeResponse,
    MemoryBankStatsRequest, MemoryBankStatsResponse,
    MemoryBankSource, MemoryBankCategoryStats,
    // UMB command messages
    UmbCommandRequest, UmbCommandResponse,
};
use crate::storage::{
    MemoryStore, Tokenizer, TokenizerType, MemoryId, TokenCount,
    RelevanceScorer, TfIdfScorer, ContextOptimizer, TokenBudgetOptimizer,
    MemoryBankConfig,
};

pub struct SmartMemoryService {
    pub memory_store: Arc<MemoryStore>,
    relevance_scorer: Arc<dyn RelevanceScorer>,
    context_optimizer: Arc<dyn ContextOptimizer>,
    memory_bank_config: MemoryBankConfig,
}

impl std::fmt::Debug for SmartMemoryService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SmartMemoryService")
            .field("memory_store", &self.memory_store)
            .field("relevance_scorer", &"<dyn RelevanceScorer>")
            .field("context_optimizer", &"<dyn ContextOptimizer>")
            .field("memory_bank_config", &self.memory_bank_config)
            .finish()
    }
}

impl SmartMemoryService {
    pub fn new() -> Result<Self> {
        println!("Initializing SmartMemoryService...");
        
        // Create the tokenizer
        println!("Creating tokenizer...");
        let tokenizer = Tokenizer::new(TokenizerType::Simple)
            .map_err(|e| anyhow::anyhow!("Failed to create tokenizer: {}", e))?;
        println!("Tokenizer created successfully");
        
        // Create the memory store
        println!("Creating memory store...");
        let memory_store = Arc::new(MemoryStore::new_in_memory(tokenizer));
        println!("Memory store created successfully");
        
        // Create the relevance scorer
        println!("Creating relevance scorer...");
        let relevance_scorer = Arc::new(TfIdfScorer::new());
        println!("Relevance scorer created successfully");
        
        // Create the context optimizer
        println!("Creating context optimizer...");
        let context_optimizer = Arc::new(TokenBudgetOptimizer::new());
        println!("Context optimizer created successfully");
        
        // Create the memory bank config
        println!("Creating memory bank config...");
        let memory_bank_config = MemoryBankConfig::default();
        println!("Memory bank config created successfully");
        
        println!("SmartMemoryService initialization complete");
        
        Ok(Self {
            memory_store,
            relevance_scorer,
            context_optimizer,
            memory_bank_config,
        })
    }
    
    pub fn new_with_sqlite(db_path: &Path) -> Result<Self> {
        // Create the tokenizer
        let tokenizer = Tokenizer::new(TokenizerType::Simple)?;
        
        // Create the memory store with SQLite storage
        let memory_store = MemoryStore::new_sqlite(db_path, tokenizer.clone())
            .context("Failed to create SQLite memory store")?;
        
        // Create the relevance scorer
        let relevance_scorer = Arc::new(TfIdfScorer::new());
        
        // Create the context optimizer
        let context_optimizer = Arc::new(TokenBudgetOptimizer::new());
        
        // Create the memory bank config
        let memory_bank_config = MemoryBankConfig::default();
        
        Ok(Self {
            memory_store: Arc::new(memory_store),
            relevance_scorer,
            context_optimizer,
            memory_bank_config,
        })
    }
    
    /// Create a new SmartMemoryService with SQLite storage and a custom memory bank config
    pub fn new_with_config(db_path: &Path, config_path: &Path) -> Result<Self> {
        // Create the tokenizer
        let tokenizer = Tokenizer::new(TokenizerType::Simple)?;
        
        // Create the memory store with SQLite storage
        let memory_store = MemoryStore::new_sqlite(db_path, tokenizer.clone())
            .context("Failed to create SQLite memory store")?;
        
        // Create the relevance scorer
        let relevance_scorer = Arc::new(TfIdfScorer::new());
        
        // Create the context optimizer
        let context_optimizer = Arc::new(TokenBudgetOptimizer::new());
        
        // Load the memory bank config from file
        let memory_bank_config = match MemoryBankConfig::from_file(config_path) {
            Ok(config) => {
                println!("Loaded memory bank config from {}", config_path.display());
                config
            }
            Err(e) => {
                println!("Failed to load memory bank config: {}", e);
                println!("Using default memory bank config");
                let default_config = MemoryBankConfig::default();
                
                // Try to save the default config to the file
                if let Err(save_err) = default_config.to_file(config_path) {
                    println!("Failed to save default config: {}", save_err);
                } else {
                    println!("Saved default config to {}", config_path.display());
                }
                
                default_config
            }
        };
        
        Ok(Self {
            memory_store: Arc::new(memory_store),
            relevance_scorer,
            context_optimizer,
            memory_bank_config,
        })
    }
}

#[tonic::async_trait]
impl SmartMemoryMcp for SmartMemoryService {
    async fn store_memory(
        &self,
        request: Request<StoreRequest>,
    ) -> Result<Response<StoreResponse>, Status> {
        let req = request.into_inner();
        
        // Store the memory
        let memory = self.memory_store.store(
            req.content,
            req.content_type,
            None, // No category for regular memories
            None, // No mode for regular memories
            req.metadata,
        ).map_err(|e| Status::internal(format!("Failed to store memory: {}", e)))?;
        
        // Calculate compression ratio (mock for now)
        let compression_ratio = if req.compress { 0.8 } else { 1.0 };
        
        // Create the response
        let response = StoreResponse {
            memory_id: memory.id.as_str().to_string(),
            token_count: memory.token_count.as_usize() as u32,
            compression_ratio,
        };
        
        Ok(Response::new(response))
    }

    async fn retrieve_memory(
        &self,
        request: Request<RetrieveRequest>,
    ) -> Result<Response<RetrieveResponse>, Status> {
        let req = request.into_inner();
        let memory_id = MemoryId::from(req.memory_id);
        
        // Retrieve the memory
        match self.memory_store.retrieve(&memory_id)
            .map_err(|e| Status::internal(format!("Failed to retrieve memory: {}", e)))?
        {
            Some(memory) => {
                // Create the response
                let response = RetrieveResponse {
                    content: memory.content,
                    metadata: if req.include_metadata { memory.metadata } else { HashMap::new() },
                    token_count: memory.token_count.as_usize() as u32,
                };
                
                Ok(Response::new(response))
            },
            None => {
                Err(Status::not_found(format!("Memory with ID {} not found", memory_id.as_str())))
            }
        }
    }

    async fn optimize_memory(
        &self,
        request: Request<OptimizeRequest>,
    ) -> Result<Response<OptimizeResponse>, Status> {
        let req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would apply optimization strategies
        let response = OptimizeResponse {
            tokens_saved: 100,
            optimization_ratio: match req.strategy() {
                OptimizationStrategy::Balanced => 0.3,
                OptimizationStrategy::Aggressive => 0.5,
                OptimizationStrategy::Conservative => 0.1,
            },
            optimized_ids: req.memory_ids,
        };
        
        Ok(Response::new(response))
    }

    async fn get_context(
        &self,
        request: Request<ContextRequest>,
    ) -> Result<Response<ContextResponse>, Status> {
        let req = request.into_inner();
        
        // Get all memories
        let memory_ids = self.memory_store.get_all_ids()
            .map_err(|e| Status::internal(format!("Failed to get memory IDs: {}", e)))?;
        
        let mut memories = Vec::new();
        for id in memory_ids {
            if let Some(memory) = self.memory_store.retrieve(&id)
                .map_err(|e| Status::internal(format!("Failed to retrieve memory: {}", e)))?
            {
                memories.push(memory);
            }
        }
        
        // Score memories for relevance
        let scored_memories = self.relevance_scorer.score_memories(
            &memories,
            &req.mode,
            None, // No query for now
        ).map_err(|e| Status::internal(format!("Failed to score memories: {}", e)))?;
        
        // Optimize context based on token budget and relevance threshold
        let max_tokens = TokenCount::from(req.max_tokens as usize);
        let relevance_threshold = crate::storage::RelevanceScore::new(req.relevance_threshold.into());
        
        let optimized_memories = self.context_optimizer.optimize(
            &scored_memories,
            max_tokens,
            relevance_threshold,
        ).map_err(|e| Status::internal(format!("Failed to optimize context: {}", e)))?;
        
        // Build the context from the optimized memories
        let mut context = String::new();
        let mut sources = Vec::new();
        let mut total_tokens = 0;
        
        for scored_memory in &optimized_memories {
            // Add the memory content to the context
            context.push_str(&scored_memory.memory.content);
            context.push_str("\n\n");
            
            // Add the memory as a source
            sources.push(ContextSource {
                source_id: scored_memory.memory.id.as_str().to_string(),
                source_type: scored_memory.memory.content_type.clone(),
                relevance: scored_memory.score.as_f64() as f32,
            });
            
            // Add the memory tokens to the total
            total_tokens += scored_memory.memory.token_count.as_usize();
        }
        
        // Create the response
        let response = ContextResponse {
            context,
            token_count: total_tokens as u32,
            relevance_score: optimized_memories.first()
              .map(|m| m.score.as_f64() as f32)
              .unwrap_or(0.0),
            sources,
        };
        
        Ok(Response::new(response))
    }

    async fn update_context(
        &self,
        request: Request<UpdateContextRequest>,
    ) -> Result<Response<UpdateContextResponse>, Status> {
        let req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would update the context for the specified mode
        let response = UpdateContextResponse {
            success: true,
            new_token_count: 15,
            affected_modes: vec![req.mode, "architect".to_string()],
        };
        
        Ok(Response::new(response))
    }

    async fn predict_context(
        &self,
        request: Request<PredictRequest>,
    ) -> Result<Response<PredictResponse>, Status> {
        let req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would predict context based on user activity
        let response = PredictResponse {
            predicted_context: format!(
                "This is predicted context for {} mode based on '{}'",
                req.current_mode, req.user_activity
            ),
            confidence: 0.85,
            estimated_tokens: 12,
        };
        
        Ok(Response::new(response))
    }

    async fn switch_mode(
        &self,
        request: Request<SwitchModeRequest>,
    ) -> Result<Response<SwitchModeResponse>, Status> {
        let req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would handle mode switching
        let response = SwitchModeResponse {
            success: true,
            preserved_tokens: if req.preserve_context { 50 } else { 0 },
            previous_mode: "code".to_string(),
        };
        
        Ok(Response::new(response))
    }

    async fn analyze_mode(
        &self,
        request: Request<AnalyzeModeRequest>,
    ) -> Result<Response<AnalyzeModeResponse>, Status> {
        let req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would analyze mode effectiveness
        let response = AnalyzeModeResponse {
            effectiveness_score: 0.78,
            average_tokens: 1200,
            metrics: vec![],
        };
        
        Ok(Response::new(response))
    }

    async fn get_metrics(
        &self,
        request: Request<MetricsRequest>,
    ) -> Result<Response<MetricsResponse>, Status> {
        let _req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would retrieve metrics
        let response = MetricsResponse {
            metrics: vec![],
            usage: None,
            trends: vec![],
        };
        
        Ok(Response::new(response))
    }

    async fn track_usage(
        &self,
        request: Request<UsageRequest>,
    ) -> Result<Response<UsageResponse>, Status> {
        let _req = request.into_inner();
        
        // For now, just return a mock response
        // In a real implementation, we would track usage
        let response = UsageResponse {
            recorded: true,
            session_tokens: 2500,
            daily_tokens: 10000,
        };
        
        Ok(Response::new(response))
    }

    // Memory Bank operations
    async fn store_memory_bank(
        &self,
        request: Request<MemoryBankStoreRequest>,
    ) -> Result<Response<MemoryBankStoreResponse>, Status> {
        let req = request.into_inner();
        
        // Extract category and mode from request
        let category = if req.category.is_empty() { None } else { Some(req.category) };
        let mode = if req.mode.is_empty() { None } else { Some(req.mode) };
        
        // Add date to metadata if provided
        let mut metadata = req.metadata;
        if !req.date.is_empty() {
            metadata.insert("date".to_string(), req.date);
        }
        
        // Store the memory
        let memory = self.memory_store.store(
            req.content,
            "text/markdown".to_string(), // Default content type for memory bank
            category.clone(),
            mode,
            metadata,
        ).map_err(|e| Status::internal(format!("Failed to store memory bank entry: {}", e)))?;
        
        // Create the response
        let response = MemoryBankStoreResponse {
            memory_id: memory.id.as_str().to_string(),
            token_count: memory.token_count.as_usize() as u32,
            category: category.unwrap_or_default(),
            success: true,
        };
        
        Ok(Response::new(response))
    }

    async fn get_memory_bank_context(
        &self,
        request: Request<MemoryBankContextRequest>,
    ) -> Result<Response<MemoryBankContextResponse>, Status> {
        let req = request.into_inner();
        
        // Get all memories
        let memory_ids = self.memory_store.get_all_ids()
            .map_err(|e| Status::internal(format!("Failed to get memory IDs: {}", e)))?;
        
        let mut memories = Vec::new();
        for id in memory_ids {
            if let Some(memory) = self.memory_store.retrieve(&id)
                .map_err(|e| Status::internal(format!("Failed to retrieve memory: {}", e)))?
            {
                // Filter by category if categories are specified
                if !req.categories.is_empty() {
                    if let Some(category) = &memory.category {
                        if !req.categories.contains(category) {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
                
                // Filter by date if specified
                if !req.date.is_empty() {
                    if let Some(date) = memory.metadata.get("date") {
                        if date != &req.date {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
                
                memories.push(memory);
            }
        }
        
        // Score memories for relevance
        let scored_memories = self.relevance_scorer.score_memories(
            &memories,
            &req.mode,
            None, // No query for now
        ).map_err(|e| Status::internal(format!("Failed to score memories: {}", e)))?;
        
        // Optimize context based on token budget and relevance threshold
        let max_tokens = crate::storage::TokenCount::from(req.max_tokens as usize);
        let relevance_threshold = crate::storage::RelevanceScore::new(req.relevance_threshold.into());
        
        let optimized_memories = self.context_optimizer.optimize(
            &scored_memories,
            max_tokens,
            relevance_threshold,
        ).map_err(|e| Status::internal(format!("Failed to optimize context: {}", e)))?;
        
        // Build the context from the optimized memories
        let mut context = String::new();
        let mut sources = Vec::new();
        let mut total_tokens = 0;
        
        for scored_memory in &optimized_memories {
            // Add the memory content to the context
            context.push_str(&scored_memory.memory.content);
            context.push_str("\n\n");
            
            // Add the memory as a source
            sources.push(MemoryBankSource {
                id: scored_memory.memory.id.as_str().to_string(),
                category: scored_memory.memory.category.clone().unwrap_or_default(),
                relevance: scored_memory.score.as_f64() as f32,
            });
            
            // Add the memory tokens to the total
            total_tokens += scored_memory.memory.token_count.as_usize();
        }
        
        // Create the response
        let response = MemoryBankContextResponse {
            context,
            token_count: total_tokens as u32,
            relevance_score: optimized_memories.first()
                .map(|m| m.score.as_f64() as f32)
                .unwrap_or(0.0),
            sources,
        };
        
        Ok(Response::new(response))
    }

    async fn optimize_memory_bank(
        &self,
        request: Request<MemoryBankOptimizeRequest>,
    ) -> Result<Response<MemoryBankOptimizeResponse>, Status> {
        let req = request.into_inner();
        
        // Get all memories
        let memory_ids = self.memory_store.get_all_ids()
            .map_err(|e| Status::internal(format!("Failed to get memory IDs: {}", e)))?;
        
        let mut memories = Vec::new();
        for id in memory_ids {
            if let Some(memory) = self.memory_store.retrieve(&id)
                .map_err(|e| Status::internal(format!("Failed to retrieve memory: {}", e)))?
            {
                // Filter by category if categories are specified
                if !req.categories.is_empty() {
                    if let Some(category) = &memory.category {
                        if !req.categories.contains(category) {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
                
                memories.push(memory);
            }
        }
        
        // Calculate total tokens before optimization
        let tokens_before: usize = memories.iter()
            .map(|m| m.token_count.as_usize())
            .sum();
        
        // For now, just return a mock response with realistic values
        // In a real implementation, we would apply optimization strategies
        let tokens_after = match req.strategy.as_str() {
            "aggressive" => (tokens_before as f32 * 0.5) as usize,
            "conservative" => (tokens_before as f32 * 0.9) as usize,
            _ => (tokens_before as f32 * 0.7) as usize, // balanced
        };
        
        let tokens_saved = tokens_before - tokens_after;
        
        // Create the response
        let response = MemoryBankOptimizeResponse {
            tokens_before: tokens_before as u32,
            tokens_after: tokens_after as u32,
            tokens_saved: tokens_saved as u32,
            optimized_memories: memories.len() as u32,
        };
        
        Ok(Response::new(response))
    }

    async fn get_memory_bank_stats(
        &self,
        request: Request<MemoryBankStatsRequest>,
    ) -> Result<Response<MemoryBankStatsResponse>, Status> {
        let req = request.into_inner();
        
        // Get all memories
        let memory_ids = self.memory_store.get_all_ids()
            .map_err(|e| Status::internal(format!("Failed to get memory IDs: {}", e)))?;
        
        let mut memories = Vec::new();
        for id in memory_ids {
            if let Some(memory) = self.memory_store.retrieve(&id)
                .map_err(|e| Status::internal(format!("Failed to retrieve memory: {}", e)))?
            {
                memories.push(memory);
            }
        }
        
        // Calculate statistics
        let total_memories = memories.len() as u32;
        let total_tokens: usize = memories.iter()
            .map(|m| m.token_count.as_usize())
            .sum();
        
        // Group memories by category
        let mut tokens_by_category = std::collections::HashMap::new();
        let mut memories_by_category = std::collections::HashMap::new();
        let mut category_stats = Vec::new();
        
        // Process each memory
        for memory in &memories {
            let category = memory.category.clone().unwrap_or_else(|| "uncategorized".to_string());
            
            // Update tokens by category
            let token_count = memory.token_count.as_usize() as u32;
            *tokens_by_category.entry(category.clone()).or_insert(0) += token_count;
            
            // Update memories by category
            *memories_by_category.entry(category.clone()).or_insert(0) += 1;
        }
        
        // Create category stats
        for (category, memory_count) in &memories_by_category {
            let token_count = *tokens_by_category.get(category).unwrap_or(&0);
            
            // Calculate average relevance (mock for now)
            let average_relevance = 0.75;
            
            // Get last updated date (mock for now)
            let last_updated = chrono::Utc::now().format("%Y-%m-%d").to_string();
            
            category_stats.push(MemoryBankCategoryStats {
                category: category.clone(),
                memory_count: *memory_count,
                token_count,
                average_relevance,
                last_updated,
            });
        }
        
        // Create the response
        let response = MemoryBankStatsResponse {
            total_memories,
            total_tokens: total_tokens as u32,
            tokens_by_category,
            memories_by_category,
            category_stats,
        };
        
        Ok(Response::new(response))
    }

    async fn handle_umb_command(
        &self,
        request: Request<UmbCommandRequest>,
    ) -> Result<Response<UmbCommandResponse>, Status> {
        let req = request.into_inner();
        
        println!("Received UMB command for mode: {}", req.current_mode);
        
        // Get the current mode from the request
        let mode = req.current_mode;
        
        // Get the current context from the request
        let context = req.current_context;
        
        // Get the metadata from the request
        let metadata = req.metadata;
        
        // Store the context in different categories based on the memory bank config
        let mut stored_memories = 0;
        let mut total_tokens = 0;
        let mut categories = Vec::new();
        
        // Get the default categories from the memory bank config
        let default_categories = vec![
            "context".to_string(),
            "decision".to_string(),
            "progress".to_string(),
        ];
        
        // Store the context in each category
        for category in default_categories {
            // Store the memory
            match self.memory_store.store(
                context.clone(),
                "text/markdown".to_string(),
                Some(category.clone()),
                Some(mode.clone()),
                metadata.clone(),
            ) {
                Ok(memory) => {
                    stored_memories += 1;
                    total_tokens += memory.token_count.as_usize();
                    categories.push(category);
                },
                Err(e) => {
                    println!("Failed to store memory in category {}: {}", category, e);
                }
            }
        }
        
        // Create the response
        let response = UmbCommandResponse {
            success: stored_memories > 0,
            stored_memories,
            total_tokens: total_tokens as u32,
            categories,
            message: format!("Stored {} memories with {} tokens", stored_memories, total_tokens),
        };
        
        Ok(Response::new(response))
    }
}

/// Create a new memory store instance
pub fn create_memory_store() -> Arc<MemoryStore> {
    let tokenizer = Tokenizer::new(TokenizerType::Simple)
        .expect("Failed to create tokenizer");
    Arc::new(MemoryStore::new_in_memory(tokenizer))
}

/// Create a new service with a shared memory store
pub fn create_service_with_store(memory_store: Arc<MemoryStore>) -> SmartMemoryMcpServer<SmartMemoryService> {
    let service = SmartMemoryService {
        memory_store,
        relevance_scorer: Arc::new(TfIdfScorer::new()),
        context_optimizer: Arc::new(TokenBudgetOptimizer::new()),
        memory_bank_config: MemoryBankConfig::default(),
    };
    
    SmartMemoryMcpServer::new(service)
}

pub fn create_service() -> SmartMemoryMcpServer<SmartMemoryService> {
    // Check if DB_PATH environment variable is set
    let memory_store = if let Ok(db_path) = std::env::var("DB_PATH") {
        println!("Using SQLite database at {}", db_path);
        
        let tokenizer = Tokenizer::new(TokenizerType::Simple)
            .expect("Failed to create tokenizer");
            
        Arc::new(MemoryStore::new_sqlite(Path::new(&db_path), tokenizer)
            .expect("Failed to create SQLite memory store"))
    } else {
        create_memory_store()
    };
    
    create_service_with_store(memory_store)
}
