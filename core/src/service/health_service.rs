use std::process;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use anyhow::Result;
use tonic::{Request, Response, Status};

use crate::proto::health_check_response::ServingStatus;
use crate::proto::health_check_server::{HealthCheck, HealthCheckServer};
use crate::proto::{
    ComponentStatus, HealthCheckRequest, HealthCheckResponse, StatusRequest, StatusResponse,
};
use crate::storage::MemoryStore;

/// Health check service implementation
pub struct HealthCheckService {
    /// Start time of the server
    start_time: Instant,
    /// Memory store reference
    memory_store: Option<Arc<MemoryStore>>,
    /// Version of the server
    version: String,
    /// Process ID
    pid: u32,
}

impl HealthCheckService {
    /// Create a new health check service
    pub fn new(memory_store: Option<Arc<MemoryStore>>) -> Self {
        Self {
            start_time: Instant::now(),
            memory_store,
            version: env!("CARGO_PKG_VERSION").to_string(),
            pid: process::id(),
        }
    }

    /// Get the uptime of the server in seconds
    fn uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }

    /// Get the memory usage of the process in MB
    fn memory_usage_mb(&self) -> u32 {
        // This is a mock implementation
        // In a real implementation, we would use a crate like sysinfo to get the memory usage
        100
    }

    /// Get the total number of memories
    fn total_memories(&self) -> u32 {
        if let Some(store) = &self.memory_store {
            match store.get_all_ids() {
                Ok(ids) => ids.len() as u32,
                Err(_) => 0,
            }
        } else {
            0
        }
    }

    /// Get the total number of tokens
    fn total_tokens(&self) -> u32 {
        if let Some(store) = &self.memory_store {
            match store.get_total_tokens() {
                Ok(tokens) => tokens.as_usize() as u32,
                Err(_) => 0,
            }
        } else {
            0
        }
    }

    /// Get system information
    fn system_info(&self) -> std::collections::HashMap<String, String> {
        let mut info = std::collections::HashMap::new();

        // Add basic system information
        info.insert("pid".to_string(), self.pid.to_string());
        info.insert("os".to_string(), std::env::consts::OS.to_string());
        info.insert("arch".to_string(), std::env::consts::ARCH.to_string());

        // Add Rust version
        info.insert(
            "rust_version".to_string(),
            env!("CARGO_PKG_RUST_VERSION").to_string(),
        );

        // Add environment variables
        if let Ok(db_path) = std::env::var("DB_PATH") {
            info.insert("db_path".to_string(), db_path);
        }

        if let Ok(config_path) = std::env::var("CONFIG_PATH") {
            info.insert("config_path".to_string(), config_path);
        }

        if let Ok(log_dir) = std::env::var("LOG_DIR") {
            info.insert("log_dir".to_string(), log_dir);
        }

        if let Ok(port) = std::env::var("PORT") {
            info.insert("port".to_string(), port);
        }

        info
    }

    /// Get component statuses
    fn component_statuses(&self) -> Vec<ComponentStatus> {
        let mut statuses = Vec::new();

        // Add memory store status
        statuses.push(ComponentStatus {
            name: "memory_store".to_string(),
            status: if self.memory_store.is_some() {
                "running".to_string()
            } else {
                "not_running".to_string()
            },
            version: self.version.clone(),
            last_updated: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        });

        // Add database status
        if let Some(store) = &self.memory_store {
            let db_status = match store.check_connection() {
                Ok(true) => "connected".to_string(),
                Ok(false) => "disconnected".to_string(),
                Err(_) => "error".to_string(),
            };

            statuses.push(ComponentStatus {
                name: "database".to_string(),
                status: db_status,
                version: "1.0.0".to_string(), // Mock version
                last_updated: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
            });
        }

        statuses
    }
}

#[tonic::async_trait]
impl HealthCheck for HealthCheckService {
    async fn check(
        &self,
        _request: Request<HealthCheckRequest>,
    ) -> Result<Response<HealthCheckResponse>, Status> {
        // Check if the memory store is available
        let status = if let Some(store) = &self.memory_store {
            match store.check_connection() {
                Ok(true) => ServingStatus::Serving,
                Ok(false) => ServingStatus::NotServing,
                Err(_) => ServingStatus::ServiceUnknown,
            }
        } else {
            ServingStatus::Unknown
        };

        // Create the response
        let response = HealthCheckResponse {
            status: status as i32,
            message: format!(
                "Smart Memory MCP v{} is {}",
                self.version,
                status.as_str_name()
            ),
        };

        Ok(Response::new(response))
    }

    async fn get_status(
        &self,
        _request: Request<StatusRequest>,
    ) -> Result<Response<StatusResponse>, Status> {
        // Create the response
        let response = StatusResponse {
            version: self.version.clone(),
            uptime_seconds: self.uptime_seconds(),
            memory_usage_mb: self.memory_usage_mb(),
            total_memories: self.total_memories(),
            total_tokens: self.total_tokens(),
            system_info: self.system_info(),
            components: self.component_statuses(),
        };

        Ok(Response::new(response))
    }
}

/// Create a health check service
pub fn create_health_service(
    memory_store: Option<Arc<MemoryStore>>,
) -> HealthCheckServer<HealthCheckService> {
    let service = HealthCheckService::new(memory_store);
    HealthCheckServer::new(service)
}
