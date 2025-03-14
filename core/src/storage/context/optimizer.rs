//! Context optimization for memory retrieval

use anyhow::Result;

use crate::storage::TokenCount;
use super::relevance::{ScoredMemory, RelevanceScore};

/// Trait for optimizing context based on token budget
pub trait ContextOptimizer: Send + Sync {
    /// Optimize context based on token budget and relevance threshold
    fn optimize(
        &self,
        scored_memories: &[ScoredMemory],
        max_tokens: TokenCount,
        relevance_threshold: RelevanceScore,
    ) -> Result<Vec<ScoredMemory>>;
}

/// Token budget based context optimizer
pub struct TokenBudgetOptimizer;

impl TokenBudgetOptimizer {
    /// Create a new token budget optimizer
    pub fn new() -> Self {
        Self
    }
}

impl Default for TokenBudgetOptimizer {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextOptimizer for TokenBudgetOptimizer {
    fn optimize(
        &self,
        scored_memories: &[ScoredMemory],
        max_tokens: TokenCount,
        relevance_threshold: RelevanceScore,
    ) -> Result<Vec<ScoredMemory>> {
        let mut optimized_memories = Vec::new();
        let mut total_tokens = TokenCount::from(0);
        
        // Add memories until we reach the token budget or run out of memories
        for memory in scored_memories {
            // Skip memories below the relevance threshold
            if memory.score.as_f64() < relevance_threshold.as_f64() {
                continue;
            }
            
            // Check if adding this memory would exceed the token budget
            let new_total = total_tokens + memory.memory.token_count;
            if new_total.as_usize() > max_tokens.as_usize() {
                // If we've already added some memories, stop here
                if !optimized_memories.is_empty() {
                    break;
                }
                
                // If this is the first memory and it's too large, add it anyway
                // but truncate it to fit the budget
                // In a real implementation, we would truncate the content
                // For now, we'll just add it as is
            }
            
            // Add the memory and update the total tokens
            optimized_memories.push(memory.clone());
            total_tokens = total_tokens + memory.memory.token_count;
        }
        
        Ok(optimized_memories)
    }
}
