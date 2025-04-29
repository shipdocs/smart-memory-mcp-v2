//! Service implementation for Smart Memory MCP

mod health_service;
mod memory_service;

use crate::storage::MemoryStore;
use std::sync::Arc;

pub use health_service::create_health_service;
pub use memory_service::{create_service, create_service_with_store};

/// Create a new memory store instance
pub fn create_memory_store() -> Arc<MemoryStore> {
    memory_service::create_memory_store()
}
