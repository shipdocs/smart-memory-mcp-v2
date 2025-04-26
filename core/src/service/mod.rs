//! Service implementation for Smart Memory MCP

mod memory_service;
mod health_service;

use std::sync::Arc;
use crate::storage::MemoryStore;

pub use memory_service::{create_service, create_service_with_store};
pub use health_service::create_health_service;

/// Create a new memory store instance
pub fn create_memory_store() -> Arc<MemoryStore> {
    memory_service::create_memory_store()
}
