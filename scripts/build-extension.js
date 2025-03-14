#!/usr/bin/env node

/**
 * Build script for Smart Memory MCP Extension
 * 
 * This script:
 * 1. Builds the core in release mode
 * 2. Compiles the extension
 * 3. Packages the extension as a VSIX file
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
// Ensure the bin directory exists
if (!fs.existsSync(extensionBinDir)) {
    fs.mkdirSync(extensionBinDir, { recursive: true });
}

// Create scripts directory in the extension
const extensionScriptsDir = path.join(extensionDir, 'scripts');
if (!fs.existsSync(extensionScriptsDir)) {
    fs.mkdirSync(extensionScriptsDir, { recursive: true });
}

// Create config directory in the extension
const extensionConfigDir = path.join(extensionDir, 'config');
if (!fs.existsSync(extensionConfigDir)) {
    fs.mkdirSync(extensionConfigDir, { recursive: true });
}

// Create roo-modes directory in the extension config directory
const extensionRooModesDir = path.join(extensionConfigDir, 'roo-modes');
if (!fs.existsSync(extensionRooModesDir)) {
    fs.mkdirSync(extensionRooModesDir, { recursive: true });
}

// Copy the install-roo-modes.js script to the extension scripts directory
const installRooModesScript = path.join(rootDir, 'scripts', 'install-roo-modes.js');
const targetInstallRooModesScript = path.join(extensionScriptsDir, 'install-roo-modes.js');
console.log(`Copying install-roo-modes.js script to ${targetInstallRooModesScript}...`);
try {
    fs.copyFileSync(installRooModesScript, targetInstallRooModesScript);
    // Make the script executable
    fs.chmodSync(targetInstallRooModesScript, 0o755);
    console.log('install-roo-modes.js script copied successfully');
} catch (error) {
    console.error('Failed to copy install-roo-modes.js script:', error);
    process.exit(1);
}

// Copy the installation scripts to the extension scripts directory
console.log('Copying installation scripts...');
try {
    // Run the copy-install-scripts.js script
    execSync('node scripts/copy-install-scripts.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('Installation scripts copied successfully');
} catch (error) {
    console.error('Failed to copy installation scripts:', error);
    
    // Fallback to manual copy if the script fails
    try {
        const installScripts = [
            { src: path.join(rootDir, 'scripts', 'install.sh'), dest: path.join(extensionScriptsDir, 'install.sh') },
            { src: path.join(rootDir, 'scripts', 'install.ps1'), dest: path.join(extensionScriptsDir, 'install.ps1') }
        ];
        
        for (const script of installScripts) {
            console.log(`Manually copying ${script.src} to ${script.dest}...`);
            fs.copyFileSync(script.src, script.dest);
            
            // Make the script executable (except on Windows)
            if (os.platform() !== 'win32' && script.dest.endsWith('.sh')) {
                fs.chmodSync(script.dest, 0o755);
            }
        }
        
        console.log('Installation scripts manually copied successfully');
    } catch (fallbackError) {
        console.error('Failed to manually copy installation scripts:', fallbackError);
        // Continue with the build process even if copying scripts fails
        console.log('Continuing with build process...');
    }
}

// Copy the .clinerules-* files from config/roo-modes to the extension config/roo-modes directory
const rooModesDir = path.join(rootDir, 'config', 'roo-modes');
console.log(`Copying .clinerules-* files from ${rooModesDir} to ${extensionRooModesDir}...`);
try {
    const files = fs.readdirSync(rooModesDir);
    const clinerules = files.filter(file => file.startsWith('.clinerules-'));
    
    for (const file of clinerules) {
        const source = path.join(rooModesDir, file);
        const destination = path.join(extensionRooModesDir, file);
        fs.copyFileSync(source, destination);
        console.log(`Copied ${file} to ${destination}`);
    }
    
    // Also copy .roomodes if it exists
    const roomodesSource = path.join(rooModesDir, '.roomodes');
    if (fs.existsSync(roomodesSource)) {
        const roomodesDestination = path.join(extensionRooModesDir, '.roomodes');
        fs.copyFileSync(roomodesSource, roomodesDestination);
        console.log(`Copied .roomodes to ${roomodesDestination}`);
    }
    
    console.log('.clinerules-* files copied successfully');
} catch (error) {
    console.error('Failed to copy .clinerules-* files:', error);
    process.exit(1);
}

// Build the core for all platforms
console.log('Building Smart Memory MCP core for all platforms...');
try {
    // Run the cross-platform build script
    execSync('node scripts/build-cross-platform.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('Smart Memory MCP core built successfully for all platforms');
} catch (error) {
    console.error('Failed to build Smart Memory MCP core for all platforms:', error);
    console.log('Falling back to building for current platform only...');
    
    try {
        // Fallback to building for current platform only
        execSync('cargo build --release', { cwd: coreDir, stdio: 'inherit' });
        
        // Copy the core binary to the extension bin directory
        const binaryName = os.platform() === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core';
        const sourceBinaryPath = path.join(coreDir, 'target', 'release', binaryName);
        const targetBinaryPath = path.join(extensionBinDir, binaryName);
        
        console.log(`Copying core binary from ${sourceBinaryPath} to ${targetBinaryPath}...`);
        fs.copyFileSync(sourceBinaryPath, targetBinaryPath);
        
        // Make the binary executable
        fs.chmodSync(targetBinaryPath, 0o755);
        console.log('Core binary copied successfully');
    } catch (fallbackError) {
        console.error('Failed to build Smart Memory MCP core:', fallbackError);
        process.exit(1);
    }
}

// Build the extension
console.log('Building Smart Memory MCP extension...');
try {
    execSync('npm run compile', { cwd: extensionDir, stdio: 'inherit' });
    console.log('Smart Memory MCP extension built successfully');
} catch (error) {
    console.error('Failed to build Smart Memory MCP extension:', error);
    process.exit(1);
}

// Package the extension
console.log('Packaging Smart Memory MCP extension...');
try {
    // Check if vsce is installed
    try {
        execSync('vsce --version', { stdio: 'ignore' });
    } catch (error) {
        console.log('Installing vsce...');
        execSync('npm install -g @vscode/vsce', { stdio: 'inherit' });
    }
    
    execSync('vsce package', { cwd: extensionDir, stdio: 'inherit' });
    console.log('Smart Memory MCP extension packaged successfully');
} catch (error) {
    console.error('Failed to package Smart Memory MCP extension:', error);
    process.exit(1);
}

console.log('Build complete!');
console.log('You can now install the extension by running:');
console.log('code --install-extension extension/smart-memory-mcp-extension-0.1.0.vsix');