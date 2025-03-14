//! Relevance scoring for memories

use std::collections::{HashMap, HashSet};
use anyhow::Result;

use crate::storage::{Memory, MemoryId, TokenCount};

/// Relevance score for a memory
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct RelevanceScore(pub f64);

impl RelevanceScore {
    /// Create a new relevance score
    pub fn new(score: f64) -> Self {
        Self(score.max(0.0).min(1.0))
    }

    /// Get the score as a f64
    pub fn as_f64(&self) -> f64 {
        self.0
    }
}

/// A scored memory with its relevance score
#[derive(Debug, Clone)]
pub struct ScoredMemory {
    /// The memory
    pub memory: Memory,
    /// The relevance score
    pub score: RelevanceScore,
}

/// Trait for scoring the relevance of memories
pub trait RelevanceScorer: Send + Sync {
    /// Score the relevance of memories for a given mode and query
    fn score_memories(
        &self,
        memories: &[Memory],
        mode: &str,
        query: Option<&str>,
    ) -> Result<Vec<ScoredMemory>>;
}

/// TF-IDF based relevance scorer
pub struct TfIdfScorer {
    /// Mode weights for different metadata fields
    mode_weights: HashMap<String, HashMap<String, f64>>,
}

impl TfIdfScorer {
    /// Create a new TF-IDF relevance scorer
    pub fn new() -> Self {
        let mut mode_weights = HashMap::new();
        
        // Define weights for the "code" mode
        let mut code_weights = HashMap::new();
        code_weights.insert("language".to_string(), 0.8);
        code_weights.insert("file".to_string(), 0.6);
        code_weights.insert("project".to_string(), 0.5);
        code_weights.insert("source".to_string(), 0.3);
        mode_weights.insert("code".to_string(), code_weights);
        
        // Define weights for the "architect" mode
        let mut architect_weights = HashMap::new();
        architect_weights.insert("project".to_string(), 0.8);
        architect_weights.insert("design".to_string(), 0.7);
        architect_weights.insert("architecture".to_string(), 0.7);
        architect_weights.insert("source".to_string(), 0.3);
        mode_weights.insert("architect".to_string(), architect_weights);
        
        // Define weights for the "debug" mode
        let mut debug_weights = HashMap::new();
        debug_weights.insert("error".to_string(), 0.9);
        debug_weights.insert("language".to_string(), 0.7);
        debug_weights.insert("file".to_string(), 0.6);
        debug_weights.insert("project".to_string(), 0.5);
        mode_weights.insert("debug".to_string(), debug_weights);
        
        Self { mode_weights }
    }
    
    /// Calculate the TF-IDF score for a memory
    fn calculate_tf_idf(
        &self,
        memory: &Memory,
        mode: &str,
        query: Option<&str>,
        document_frequencies: &HashMap<String, usize>,
        total_documents: usize,
    ) -> RelevanceScore {
        // Get the mode weights
        let default_weights = HashMap::new();
        let code_weights = self.mode_weights.get("code").unwrap_or(&default_weights);
        let mode_weights = self.mode_weights.get(mode).unwrap_or(code_weights);
        
        // Calculate the metadata score
        let metadata_score = memory.metadata.iter()
            .map(|(key, value)| {
                let weight = mode_weights.get(key).copied().unwrap_or(0.1);
                weight
            })
            .sum::<f64>() / mode_weights.len().max(1) as f64;
        
        // Calculate the content score using TF-IDF
        let content_score = if let Some(query) = query {
            // Tokenize the query and content
            let query_lowercase = query.to_lowercase();
            let query_terms: HashSet<_> = query_lowercase
                .split_whitespace()
                .collect();
            
            let content_lowercase = memory.content.to_lowercase();
            let content_terms: Vec<_> = content_lowercase
                .split_whitespace()
                .collect();
            
            // Calculate term frequencies in the content
            let mut term_frequencies = HashMap::new();
            for term in &content_terms {
                *term_frequencies.entry(*term).or_insert(0) += 1;
            }
            
            // Calculate TF-IDF score for each query term
            let mut tf_idf_sum = 0.0;
            for term in &query_terms {
                let tf = *term_frequencies.get(*term).unwrap_or(&0) as f64 / content_terms.len().max(1) as f64;
                let df = document_frequencies.get(*term).copied().unwrap_or(1) as f64;
                let idf = (total_documents as f64 / df).ln();
                tf_idf_sum += tf * idf;
            }
            
            // Normalize by the number of query terms
            tf_idf_sum / query_terms.len().max(1) as f64
        } else {
            // If no query, use a simple recency score
            let now = chrono::Utc::now();
            let age = now.signed_duration_since(memory.last_accessed).num_seconds() as f64;
            let recency_score = 1.0 / (1.0 + age / (24.0 * 60.0 * 60.0)); // Decay over 24 hours
            recency_score
        };
        
        // Combine the scores (70% content, 30% metadata)
        let combined_score = 0.7 * content_score + 0.3 * metadata_score;
        
        RelevanceScore::new(combined_score)
    }
    
    /// Build document frequencies for all terms in the memories
    fn build_document_frequencies(&self, memories: &[Memory]) -> HashMap<String, usize> {
        let mut document_frequencies = HashMap::new();
        let mut document_terms = Vec::new();
        
        // Collect unique terms for each document
        for memory in memories {
            let terms: HashSet<String> = memory.content.to_lowercase()
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            
            document_terms.push(terms);
        }
        
        // Count document frequencies
        for terms in &document_terms {
            for term in terms {
                *document_frequencies.entry(term.to_string()).or_insert(0) += 1;
            }
        }
        
        document_frequencies
    }
}

impl Default for TfIdfScorer {
    fn default() -> Self {
        Self::new()
    }
}

impl RelevanceScorer for TfIdfScorer {
    fn score_memories(
        &self,
        memories: &[Memory],
        mode: &str,
        query: Option<&str>,
    ) -> Result<Vec<ScoredMemory>> {
        // Build document frequencies
        let document_frequencies = self.build_document_frequencies(memories);
        let total_documents = memories.len();
        
        // Score each memory
        let mut scored_memories = memories.iter()
            .map(|memory| {
                let score = self.calculate_tf_idf(
                    memory,
                    mode,
                    query,
                    &document_frequencies,
                    total_documents,
                );
                
                ScoredMemory {
                    memory: memory.clone(),
                    score,
                }
            })
            .collect::<Vec<_>>();
        
        // Sort by score in descending order
        scored_memories.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(scored_memories)
    }
}
