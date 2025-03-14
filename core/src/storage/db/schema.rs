//! Database schema for memories

use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

/// Memory entity for database storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntity {
    /// Unique identifier for the memory
    pub id: String,
    /// The content of the memory
    pub content: String,
    /// The content type (e.g., "text/plain", "text/markdown")
    pub content_type: String,
    /// The category of the memory (e.g., "context", "decision", "progress")
    pub category: Option<String>,
    /// The mode associated with the memory (e.g., "code", "architect")
    pub mode: Option<String>,
    /// Additional metadata for the memory (JSON)
    pub metadata_json: String,
    /// The number of tokens in the memory
    pub token_count: usize,
    /// When the memory was created
    pub created_at: DateTime<Utc>,
    /// When the memory was last accessed
    pub last_accessed: DateTime<Utc>,
}

/// Memory metadata for database storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetadata {
    /// Key-value pairs of metadata
    pub values: std::collections::HashMap<String, String>,
}

impl From<std::collections::HashMap<String, String>> for MemoryMetadata {
    fn from(values: std::collections::HashMap<String, String>) -> Self {
        Self { values }
    }
}

impl From<MemoryMetadata> for std::collections::HashMap<String, String> {
    fn from(metadata: MemoryMetadata) -> Self {
        metadata.values
    }
}
