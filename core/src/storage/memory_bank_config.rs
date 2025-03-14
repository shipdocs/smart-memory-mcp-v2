//! Memory Bank configuration module
//! 
//! This module provides functionality for configuring the memory bank categories,
//! token budgets, and other settings.

use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};

use super::TokenCount;

/// Priority level for memory bank categories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    /// Low priority
    Low,
    /// Medium priority
    Medium,
    /// High priority
    High,
    /// Critical priority
    Critical,
}

/// Configuration for a memory bank category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryConfig {
    /// Maximum number of tokens for this category
    pub max_tokens: usize,
    /// Priority level for this category
    pub priority: Priority,
}

/// Configuration for memory bank update triggers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTriggersConfig {
    /// Whether to automatically update the memory bank
    pub auto_update: bool,
    /// Whether to support the UMB command
    pub umb_command: bool,
}

/// Configuration for memory bank token budget
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBudgetConfig {
    /// Total token budget across all categories
    pub total: usize,
    /// Whether to enforce token budgets per category
    pub per_category: bool,
}

/// Configuration for memory bank relevance scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelevanceConfig {
    /// Minimum relevance threshold for including memories
    pub threshold: f64,
    /// Whether to boost the relevance of recent memories
    pub boost_recent: bool,
}

/// Memory Bank configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryBankConfig {
    /// Configuration for each category
    pub categories: HashMap<String, CategoryConfig>,
    /// Configuration for update triggers
    pub update_triggers: UpdateTriggersConfig,
    /// Configuration for token budget
    pub token_budget: TokenBudgetConfig,
    /// Configuration for relevance scoring
    pub relevance: RelevanceConfig,
}

impl Default for MemoryBankConfig {
    fn default() -> Self {
        let mut categories = HashMap::new();
        
        // Add default categories
        categories.insert("context".to_string(), CategoryConfig {
            max_tokens: 10000,
            priority: Priority::High,
        });
        
        categories.insert("decision".to_string(), CategoryConfig {
            max_tokens: 5000,
            priority: Priority::Medium,
        });
        
        categories.insert("progress".to_string(), CategoryConfig {
            max_tokens: 8000,
            priority: Priority::High,
        });
        
        categories.insert("product".to_string(), CategoryConfig {
            max_tokens: 10000,
            priority: Priority::Medium,
        });
        
        categories.insert("pattern".to_string(), CategoryConfig {
            max_tokens: 5000,
            priority: Priority::Low,
        });
        
        Self {
            categories,
            update_triggers: UpdateTriggersConfig {
                auto_update: true,
                umb_command: true,
            },
            token_budget: TokenBudgetConfig {
                total: 50000,
                per_category: true,
            },
            relevance: RelevanceConfig {
                threshold: 0.7,
                boost_recent: true,
            },
        }
    }
}

impl MemoryBankConfig {
    /// Load configuration from a JSON file
    pub fn from_file(path: &Path) -> Result<Self> {
        let mut file = File::open(path)
            .with_context(|| format!("Failed to open config file: {}", path.display()))?;
        
        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .with_context(|| format!("Failed to read config file: {}", path.display()))?;
        
        let config = serde_json::from_str(&contents)
            .with_context(|| format!("Failed to parse config file: {}", path.display()))?;
        
        Ok(config)
    }
    
    /// Save configuration to a JSON file
    pub fn to_file(&self, path: &Path) -> Result<()> {
        let contents = serde_json::to_string_pretty(self)
            .context("Failed to serialize config")?;
        
        std::fs::write(path, contents)
            .with_context(|| format!("Failed to write config file: {}", path.display()))?;
        
        Ok(())
    }
    
    /// Get the maximum tokens for a category
    pub fn get_max_tokens(&self, category: &str) -> TokenCount {
        let max_tokens = self.categories
            .get(category)
            .map(|c| c.max_tokens)
            .unwrap_or(1000);
        
        TokenCount::from(max_tokens)
    }
    
    /// Get the priority for a category
    pub fn get_priority(&self, category: &str) -> Priority {
        self.categories
            .get(category)
            .map(|c| c.priority)
            .unwrap_or(Priority::Medium)
    }
}