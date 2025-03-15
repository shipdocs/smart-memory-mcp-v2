use tonic::transport::Server;
use anyhow::Result;
use tokio::signal;

mod service;
mod storage;
mod server_manager;
mod proto {
    tonic::include_proto!("smart_memory");
}

#[tokio::main]
async fn main() -> Result<()> {
    // Check if this is a server manager command
    server_manager::integrate_server_manager();
    
    println!("Starting Smart Memory MCP server...");
    
    let start_time = std::time::Instant::now();
    println!("[{}ms] Initializing server...", start_time.elapsed().as_millis());

    let addr = "0.0.0.0:50051".parse()
        .map_err(|e| anyhow::anyhow!("Failed to parse address: {}", e))?;

    println!("[{}ms] Creating service...", start_time.elapsed().as_millis());
    let service = service::create_service();
    println!("[{}ms] Service created successfully", start_time.elapsed().as_millis());
    
    println!("[{}ms] Configuring server on {}...", start_time.elapsed().as_millis(), addr);
    let server = Server::builder()
        .accept_http1(true)
        .tcp_keepalive(Some(std::time::Duration::from_secs(60)))
        .tcp_nodelay(true)
        .add_service(service);
    
    println!("[{}ms] Server configured, starting to serve...", start_time.elapsed().as_millis());
    
    tokio::select! {
        result = server.serve(addr) => {
            match result {
                Ok(_) => {
                    println!("[{}ms] Server stopped gracefully", start_time.elapsed().as_millis());
                }
                Err(e) => {
                    eprintln!("[{}ms] Server error: {}", start_time.elapsed().as_millis(), e);
                    eprintln!("[{}ms] Error details: {:?}", start_time.elapsed().as_millis(), e);
                    return Err(anyhow::anyhow!("Server error: {}", e));
                }
            }
        }
        _ = signal::ctrl_c() => {
            println!("[{}ms] Received interrupt signal, shutting down...", start_time.elapsed().as_millis());
        }
    }

    Ok(())
}
