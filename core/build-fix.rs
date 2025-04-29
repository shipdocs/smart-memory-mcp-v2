fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = std::env::var("OUT_DIR")?;
    
    // More graceful error handling for missing protoc
    let compile_result = tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .out_dir(&out_dir)
        .file_descriptor_set_path("src/proto/smart_memory.bin")
        .compile(&["../proto/smart_memory.proto"], &["../proto"]);

    if let Err(err) = compile_result {
        eprintln!("Error: failed to compile protobuf definitions: {}", err);
        eprintln!("Hint: make sure `protoc` (Protocol Buffers compiler) is installed and in PATH.");
        eprintln!("See https://grpc.io/docs/protoc-installation/ for installation instructions.");
        return Err(err.into());
    }
    
    Ok(())
}
