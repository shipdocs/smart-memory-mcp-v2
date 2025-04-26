fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = std::env::var("OUT_DIR")?;
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .out_dir(&out_dir)
        .file_descriptor_set_path("src/proto/smart_memory.bin")
        .compile(&["../proto/smart_memory.proto"], &["../proto"])?;
    Ok(())
}
