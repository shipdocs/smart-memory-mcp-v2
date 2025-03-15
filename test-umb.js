const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Function to create a gRPC client and call handleUmbCommand
async function callHandleUmbCommand() {
  try {
    // Load the proto file
    const PROTO_PATH = path.join(__dirname, 'proto/smart_memory.proto');
    
    if (!fs.existsSync(PROTO_PATH)) {
      console.error(`Proto file not found at ${PROTO_PATH}`);
      return;
    }
    
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const smartMemoryService = protoDescriptor.smart_memory.SmartMemoryMcp;
    
    // Create a client
    const client = new smartMemoryService(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );
    
    console.log('Created gRPC client');
    console.log('Calling handleUmbCommand...');
    
    // Create a simple context for the UMB command
    const context = `
# Smart Memory MCP Update - ${new Date().toISOString()}

## Context
- Fixed compilation errors in server_manager.rs
- Updated MCP settings to use correct method names
- Successfully restarted the server

## Decision
- Used Signal::SIGCONT instead of Signal::from(0) to fix compilation errors
- Updated alwaysAllow array to include lowercase method names

## Progress
- Server is now running and responsive
- Fixed permission issues with MCP settings
`;
    
    // Call the handleUmbCommand method
    client.handleUmbCommand({
      current_mode: 'code',
      current_context: context,
      metadata: {
        source: 'test-script',
        timestamp: new Date().toISOString()
      }
    }, (err, response) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      
      console.log('Response:', response);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the function
callHandleUmbCommand();