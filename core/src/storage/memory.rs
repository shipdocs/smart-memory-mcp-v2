//! Memory storage implementation

use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};
use uuid::Uuid;

use super::tokenizer::{Tokenizer, TokenCount, TokenizerType};
use super::db::{MemoryRepository, SqliteMemoryRepository};

/// Unique identifier for a memory
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct MemoryId(String);

impl MemoryId {
    /// Create a new random memory ID
    pub fn new() -> Self {
        Self(format!("mem_{}", Uuid::new_v4().to_string().split('-').next().unwrap()))
    }

    /// Get the string representation of the memory ID
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<String> for MemoryId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for MemoryId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

/// A memory entry with content and metadata
#[derive(Debug, Clone)]
pub struct Memory {
    /// Unique identifier for the memory
    pub id: MemoryId,
    /// The content of the memory
    pub content: String,
    /// The content type (e.g., "text/plain", "text/markdown")
    pub content_type: String,
    /// The category of the memory (e.g., "context", "decision", "progress")
    pub category: Option<String>,
    /// The mode associated with the memory (e.g., "code", "architect")
    pub mode: Option<String>,
    /// Additional metadata for the memory
    pub metadata: HashMap<String, String>,
    /// The number of tokens in the memory
    pub token_count: TokenCount,
    /// When the memory was created
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// When the memory was last accessed
    pub last_accessed: chrono::DateTime<chrono::Utc>,
}

impl Memory {
    /// Create a new memory with the given content and metadata
    pub fn new(
        content: String,
        content_type: String,
        category: Option<String>,
        mode: Option<String>,
        metadata: HashMap<String, String>,
        tokenizer: &Tokenizer,
    ) -> Self {
        let id = MemoryId::new();
        let token_count = tokenizer.count_tokens(&content);
        let now = chrono::Utc::now();
        
        Self {
            id,
            content,
            content_type,
            category,
            mode,
            metadata,
            token_count,
            created_at: now,
            last_accessed: now,
        }
    }

    /// Update the last accessed time
    pub fn touch(&mut self) {
        self.last_accessed = chrono::Utc::now();
    }
}

/// Storage for memories
#[derive(Debug, Clone)]
pub struct MemoryStore {
    /// The memory repository
    repository: Arc<dyn MemoryRepository>,
    /// The tokenizer used for counting tokens
    tokenizer: Tokenizer,
    /// In-memory cache of memories
    cache: Arc<Mutex<HashMap<MemoryId, Memory>>>,
}

impl MemoryStore {
    /// Create a new memory store with in-memory storage
    pub fn new_in_memory(tokenizer: Tokenizer) -> Self {
        // Create an in-memory repository
        let repository = Arc::new(InMemoryRepository::new(tokenizer.clone()));
        
        Self {
            repository,
            tokenizer,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    /// Create a new memory store with SQLite storage
    pub fn new_sqlite(db_path: &Path, tokenizer: Tokenizer) -> Result<Self> {
        // Create a SQLite repository
        let repository = SqliteMemoryRepository::new(db_path, tokenizer.clone())
            .context("Failed to create SQLite repository")?;
        
        Ok(Self {
            repository: Arc::new(repository),
            tokenizer,
            cache: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    /// Store a new memory and return its ID
    pub fn store(
        &self,
        content: String,
        content_type: String,
        category: Option<String>,
        mode: Option<String>,
        metadata: HashMap<String, String>,
    ) -> Result<Memory> {
        let memory = Memory::new(content, content_type, category, mode, metadata, &self.tokenizer);
        
        // Store the memory in the repository
        self.repository.store(&memory)?;
        
        // Update the cache
        let mut cache = self.cache.lock().unwrap();
        cache.insert(memory.id.clone(), memory.clone());
        
        Ok(memory)
    }

    /// Retrieve a memory by ID
    pub fn retrieve(&self, id: &MemoryId) -> Result<Option<Memory>> {
        // Check the cache first
        {
            let mut cache = self.cache.lock().unwrap();
            if let Some(memory) = cache.get_mut(id) {
                // Update the last accessed time
                memory.touch();
                
                // Update the repository
                self.repository.touch(id)?;
                
                return Ok(Some(memory.clone()));
            }
        }
        
        // If not in cache, retrieve from the repository
        match self.repository.retrieve(id)? {
            Some(memory) => {
                // Update the cache
                let mut cache = self.cache.lock().unwrap();
                cache.insert(memory.id.clone(), memory.clone());
                
                Ok(Some(memory))
            }
            None => Ok(None),
        }
    }

    /// Get all memory IDs
    pub fn get_all_ids(&self) -> Result<Vec<MemoryId>> {
        self.repository.get_all_ids()
    }

    /// Get the total number of tokens across all memories
    pub fn total_tokens(&self) -> Result<TokenCount> {
        self.repository.total_tokens()
    }
}

/// In-memory implementation of the memory repository
#[derive(Debug)]
struct InMemoryRepository {
    /// The memories stored by ID
    memories: Arc<Mutex<HashMap<MemoryId, Memory>>>,
    /// The tokenizer used for counting tokens
    tokenizer: Tokenizer,
}

impl InMemoryRepository {
    /// Create a new in-memory repository
    fn new(tokenizer: Tokenizer) -> Self {
        Self {
            memories: Arc::new(Mutex::new(HashMap::new())),
            tokenizer,
        }
    }
}

impl MemoryRepository for InMemoryRepository {
    fn store(&self, memory: &Memory) -> Result<()> {
        let mut memories = self.memories.lock().unwrap();
        memories.insert(memory.id.clone(), memory.clone());
        Ok(())
    }
    
    fn retrieve(&self, id: &MemoryId) -> Result<Option<Memory>> {
        let memories = self.memories.lock().unwrap();
        Ok(memories.get(id).cloned())
    }
    
    fn touch(&self, id: &MemoryId) -> Result<()> {
        let mut memories = self.memories.lock().unwrap();
        if let Some(memory) = memories.get_mut(id) {
            memory.touch();
        }
        Ok(())
    }
    
    fn get_all_ids(&self) -> Result<Vec<MemoryId>> {
        let memories = self.memories.lock().unwrap();
        Ok(memories.keys().cloned().collect())
    }
    
    fn total_tokens(&self) -> Result<TokenCount> {
        let memories = self.memories.lock().unwrap();
        Ok(memories.values().map(|m| m.token_count).sum())
    }
}
