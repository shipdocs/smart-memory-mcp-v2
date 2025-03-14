#!/usr/bin/env node

/**
 * Cross-platform build script for Smart Memory MCP Core
 * 
 * This script builds the core binary for multiple platforms:
 * - Windows (x86_64-pc-windows-gnu)
 * - Linux (x86_64-unknown-linux-gnu)
 * - macOS (x86_64-apple-darwin)
 * 
 * Prerequisites:
 * - Rust with cross-compilation targets installed
 * - For Windows: MinGW-w64
 * - For macOS: macOS SDK (when building on non-macOS)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '..');
const coreDir = path.join(rootDir, 'core');
const extensionDir = path.join(rootDir, 'extension');
const extensionBinDir = path.join(extensionDir, 'bin');

// Create platform-specific directories
const platformDirs = {
  windows: path.join(extensionBinDir, 'windows'),
  linux: path.join(extensionBinDir, 'linux'),
  macos: path.join(extensionBinDir, 'macos')
};

// Ensure the bin directories exist
Object.values(platformDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define the targets and their corresponding binary names
const targets = [
  {
    name: 'windows',
    target: 'x86_64-pc-windows-gnu',
    binaryName: 'smart-memory-mcp-core.exe',
    dir: platformDirs.windows
  },
  {
    name: 'linux',
    target: 'x86_64-unknown-linux-gnu',
    binaryName: 'smart-memory-mcp-core',
    dir: platformDirs.linux
  },
  {
    name: 'macos',
    target: 'x86_64-apple-darwin',
    binaryName: 'smart-memory-mcp-core',
    dir: platformDirs.macos
  }
];

// Check if the required Rust targets are installed
console.log('Checking Rust targets...');
try {
  const rustupOutput = execSync('rustup target list --installed').toString();
  const installedTargets = rustupOutput.split('\n');
  
  for (const target of targets) {
    if (!installedTargets.includes(target.target)) {
      console.log(`Installing Rust target ${target.target}...`);
      execSync(`rustup target add ${target.target}`, { stdio: 'inherit' });
    }
  }
} catch (error) {
  console.error('Failed to check or install Rust targets:', error);
  process.exit(1);
}

// Build for each target
for (const target of targets) {
  console.log(`Building for ${target.name} (${target.target})...`);
  try {
    // Build the binary
    execSync(`cargo build --release --target ${target.target}`, { 
      cwd: coreDir, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Copy the binary to the extension bin directory
    const sourceBinaryPath = path.join(coreDir, 'target', target.target, 'release', target.binaryName);
    const targetBinaryPath = path.join(target.dir, target.binaryName);
    
    console.log(`Copying ${sourceBinaryPath} to ${targetBinaryPath}...`);
    fs.copyFileSync(sourceBinaryPath, targetBinaryPath);
    
    // Make the binary executable (not needed for Windows)
    if (target.name !== 'windows') {
      fs.chmodSync(targetBinaryPath, 0o755);
    }
    
    console.log(`Successfully built and copied binary for ${target.name}`);
  } catch (error) {
    console.error(`Failed to build for ${target.name}:`, error);
    // Continue with other targets instead of exiting
    console.log(`Skipping ${target.name} build`);
  }
}

// Also build for the current platform as a fallback
const currentPlatform = os.platform();
let nativeBinaryName;
let nativeTargetDir;

if (currentPlatform === 'win32') {
  nativeBinaryName = 'smart-memory-mcp-core.exe';
  nativeTargetDir = platformDirs.windows;
} else if (currentPlatform === 'darwin') {
  nativeBinaryName = 'smart-memory-mcp-core';
  nativeTargetDir = platformDirs.macos;
} else {
  nativeBinaryName = 'smart-memory-mcp-core';
  nativeTargetDir = platformDirs.linux;
}

console.log(`Building for current platform (${currentPlatform})...`);
try {
  execSync('cargo build --release', { cwd: coreDir, stdio: 'inherit' });
  
  // Copy the binary to the extension bin directory
  const sourceBinaryPath = path.join(coreDir, 'target', 'release', nativeBinaryName);
  const targetBinaryPath = path.join(extensionBinDir, nativeBinaryName);
  
  console.log(`Copying ${sourceBinaryPath} to ${targetBinaryPath}...`);
  fs.copyFileSync(sourceBinaryPath, targetBinaryPath);
  
  // Make the binary executable (not needed for Windows)
  if (currentPlatform !== 'win32') {
    fs.chmodSync(targetBinaryPath, 0o755);
  }
  
  console.log(`Successfully built and copied binary for current platform`);
} catch (error) {
  console.error('Failed to build for current platform:', error);
  process.exit(1);
}

console.log('Cross-platform build complete!');