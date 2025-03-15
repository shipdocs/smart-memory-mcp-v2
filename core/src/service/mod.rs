//! Service implementation for Smart Memory MCP

mod memory_service;
mod health_service;

pub use memory_service::create_service;
pub use health_service::create_health_service;
