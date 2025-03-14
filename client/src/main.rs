use anyhow::Result;
use tonic::Request;

mod proto {
    tonic::include_proto!("smart_memory");
}

use proto::smart_memory_mcp_client::SmartMemoryMcpClient;
use proto::{ContextRequest, StoreRequest, SwitchModeRequest};

#[tokio::main]
async fn main() -> Result<()> {
    // Create a channel to the server
    let channel = tonic::transport::Channel::from_static("http://127.0.0.1:50051")
        .connect()
        .await?;

    // Create a client
    let mut client = SmartMemoryMcpClient::new(channel);

    println!("Connected to Smart Memory MCP server");

    // Store multiple memories with different content types
    let memories = vec![
        ("Example Rust code:\nfn main() {\n    println!(\"Hello, World!\");\n}", "text/rust", "code"),
        ("System design: Using gRPC for efficient client-server communication", "text/markdown", "architect"),
        ("Debug log: Connection refused on port 8080", "text/plain", "debug"),
    ];

    println!("\nStoring different types of memories...");
    for (content, content_type, mode) in memories {
        let mut metadata = std::collections::HashMap::new();
        metadata.insert("source".to_string(), "test-client".to_string());
        metadata.insert("mode".to_string(), mode.to_string());
        metadata.insert("project".to_string(), "smart-memory-mcp".to_string());

        let store_request = Request::new(StoreRequest {
            content: content.to_string(),
            content_type: content_type.to_string(),
            metadata,
            compress: true,
        });

        let response = client.store_memory(store_request).await?;
        println!("Stored memory ({}) with ID: {}", content_type, response.get_ref().memory_id);
    }

    // Test GetContext with different modes
    let modes = vec!["code", "architect", "debug"];
    
    println!("\nTesting context retrieval for different modes...");
    for mode in modes {
        let context_request = Request::new(ContextRequest {
            mode: mode.to_string(),
            max_tokens: 1000,
            relevance_threshold: 0.5,
        });

        println!("\nRetrieving context for '{}' mode...", mode);
        let response = client.get_context(context_request).await?;
        let context = response.get_ref();
        println!("Context for '{}' mode:", mode);
        println!("- Content length: {}", context.context.len());
        println!("- Token count: {}", context.token_count);
        println!("- Relevance score: {}", context.relevance_score);
        println!("- Number of sources: {}", context.sources.len());
    }

    // Test mode switching
    println!("\nTesting mode switching...");
    let switch_request = Request::new(SwitchModeRequest {
        target_mode: "debug".to_string(),
        preserve_context: true,
    });

    println!("Switching to debug mode...");
    let response = client.switch_mode(switch_request).await?;
    println!("Mode switch response: {:?}", response.get_ref());

    // Verify the mode switch by getting context in the new mode
    let context_request = Request::new(ContextRequest {
        mode: "debug".to_string(),
        max_tokens: 1000,
        relevance_threshold: 0.5,
    });

    println!("\nVerifying context after mode switch...");
    let response = client.get_context(context_request).await?;
    let context = response.get_ref();
    println!("Context in debug mode after switch:");
    println!("- Content length: {}", context.context.len());
    println!("- Token count: {}", context.token_count);
    println!("- Relevance score: {}", context.relevance_score);
    println!("- Number of sources: {}", context.sources.len());

    println!("\nAll tests completed successfully!");
    Ok(())
}
