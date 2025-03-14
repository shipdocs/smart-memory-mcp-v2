//! Repository for memory storage

use std::path::Path;
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};
use rusqlite::{Connection, params};
use chrono::{DateTime, Utc};
use serde_json;

use super::schema::{MemoryEntity, MemoryMetadata};
use crate::storage::{Memory, MemoryId, Tokenizer, TokenCount};

/// Repository for memory storage
pub trait MemoryRepository: Send + Sync + std::fmt::Debug {
    /// Store a memory
    fn store(&self, memory: &Memory) -> Result<()>;
    
    /// Retrieve a memory by ID
    fn retrieve(&self, id: &MemoryId) -> Result<Option<Memory>>;
    
    /// Update a memory's last accessed time
    fn touch(&self, id: &MemoryId) -> Result<()>;
    
    /// Get all memory IDs
    fn get_all_ids(&self) -> Result<Vec<MemoryId>>;
    
    /// Get the total number of tokens across all memories
    fn total_tokens(&self) -> Result<TokenCount>;
}

/// SQLite implementation of the memory repository
#[derive(Debug)]
pub struct SqliteMemoryRepository {
    /// The database connection
    connection: Arc<Mutex<Connection>>,
    /// The tokenizer used for counting tokens
    tokenizer: Tokenizer,
}

impl SqliteMemoryRepository {
    /// Create a new SQLite memory repository
    pub fn new(db_path: &Path, tokenizer: Tokenizer) -> Result<Self> {
        // Create the database directory if it doesn't exist
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Open the database connection
        let connection = Connection::open(db_path)
            .context("Failed to open SQLite database")?;
        
        // Create the memories table if it doesn't exist
        connection.execute(
            "CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                category TEXT,
                mode TEXT,
                metadata_json TEXT NOT NULL,
                token_count INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                last_accessed TEXT NOT NULL
            )",
            [],
        ).context("Failed to create memories table")?;
        
        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
            tokenizer,
        })
    }
    
    /// Convert a Memory to a MemoryEntity
    fn memory_to_entity(memory: &Memory) -> Result<MemoryEntity> {
        let metadata = MemoryMetadata::from(memory.metadata.clone());
        let metadata_json = serde_json::to_string(&metadata)
            .context("Failed to serialize memory metadata")?;
        
        Ok(MemoryEntity {
            id: memory.id.as_str().to_string(),
            content: memory.content.clone(),
            content_type: memory.content_type.clone(),
            category: memory.category.clone(),
            mode: memory.mode.clone(),
            metadata_json,
            token_count: memory.token_count.as_usize(),
            created_at: memory.created_at,
            last_accessed: memory.last_accessed,
        })
    }
    
    /// Convert a MemoryEntity to a Memory
    fn entity_to_memory(&self, entity: MemoryEntity) -> Result<Memory> {
        let metadata: MemoryMetadata = serde_json::from_str(&entity.metadata_json)
            .context("Failed to deserialize memory metadata")?;
        
        Ok(Memory {
            id: MemoryId::from(entity.id),
            content: entity.content,
            content_type: entity.content_type,
            category: entity.category,
            mode: entity.mode,
            metadata: metadata.into(),
            token_count: TokenCount::from(entity.token_count),
            created_at: entity.created_at,
            last_accessed: entity.last_accessed,
        })
    }
}

impl MemoryRepository for SqliteMemoryRepository {
    fn store(&self, memory: &Memory) -> Result<()> {
        let entity = Self::memory_to_entity(memory)?;
        
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "INSERT OR REPLACE INTO memories (
                id, content, content_type, category, mode, metadata_json, token_count, created_at, last_accessed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                entity.id,
                entity.content,
                entity.content_type,
                entity.category,
                entity.mode,
                entity.metadata_json,
                entity.token_count,
                entity.created_at.to_rfc3339(),
                entity.last_accessed.to_rfc3339(),
            ],
        ).context("Failed to store memory")?;
        
        Ok(())
    }
    
    fn retrieve(&self, id: &MemoryId) -> Result<Option<Memory>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, content, content_type, category, mode, metadata_json, token_count, created_at, last_accessed
             FROM memories
             WHERE id = ?"
        ).context("Failed to prepare retrieve statement")?;
        
        let mut rows = stmt.query(params![id.as_str()])?;
        
        if let Some(row) = rows.next()? {
            let entity = MemoryEntity {
                id: row.get(0)?,
                content: row.get(1)?,
                content_type: row.get(2)?,
                category: row.get(3)?,
                mode: row.get(4)?,
                metadata_json: row.get(5)?,
                token_count: row.get(6)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .context("Failed to parse created_at")?
                    .with_timezone(&Utc),
                last_accessed: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .context("Failed to parse last_accessed")?
                    .with_timezone(&Utc),
            };
            
            let memory = self.entity_to_memory(entity)?;
            Ok(Some(memory))
        } else {
            Ok(None)
        }
    }
    
    fn touch(&self, id: &MemoryId) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "UPDATE memories SET last_accessed = ? WHERE id = ?",
            params![now, id.as_str()],
        ).context("Failed to update last_accessed")?;
        
        Ok(())
    }
    
    fn get_all_ids(&self) -> Result<Vec<MemoryId>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare("SELECT id FROM memories")
            .context("Failed to prepare get_all_ids statement")?;
        
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        
        let mut ids = Vec::new();
        for id_result in rows {
            let id = id_result?;
            ids.push(MemoryId::from(id));
        }
        
        Ok(ids)
    }
    
    fn total_tokens(&self) -> Result<TokenCount> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare("SELECT SUM(token_count) FROM memories")
            .context("Failed to prepare total_tokens statement")?;
        
        let total: i64 = stmt.query_row([], |row| row.get(0))
            .unwrap_or(0);
        
        Ok(TokenCount::from(total as usize))
    }
}
