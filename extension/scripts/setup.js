#!/usr/bin/env node

/**
 * Smart Memory MCP Setup Script
 * 
 * This script handles the automatic setup of Smart Memory MCP:
 * 1. Checks if Rust is installed, installs it if not
 * 2. Clones the core repository
 * 3. Builds the core components
 * 4. Sets up configuration
 */

const { spawn, spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vscode = require('vscode'); // Will be provided by extension context

// Configuration
const CONFIG_DIR = path.join(os.homedir(), '.smart-memory');
const CORE_REPO = 'https://github.com/your-org/smart-memory-mcp-core.git';
const CORE_DIR = path.join(CONFIG_DIR, 'core');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'setup.log');

// Logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logMessage);
  
  // Also log to console if available
  console.log(message);
}

// Check if Rust is installed
function hasRust() {
  try {
    const result = spawnSync('rustc', ['--version']);
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

// Install Rust
async function installRust() {
  log('Rust not found. Installing Rust...');
  
  return new Promise((resolve, reject) => {
    let command, args;
    
    if (process.platform === 'win32') {
      // Windows installation
      log('Detected Windows platform');
      // Download rustup-init.exe
      const rustupInitPath = path.join(os.tmpdir(), 'rustup-init.exe');
      execSync(`curl -o ${rustupInitPath} https://win.rustup.rs/x86_64`);
      command = rustupInitPath;
      args = ['-y'];
    } else {
      // Unix-like installation (macOS, Linux)
      log(`Detected ${process.platform} platform`);
      command = 'sh';
      args = ['-c', 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'];
    }
    
    const installProcess = spawn(command, args, {
      stdio: 'inherit'
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        log('Rust installed successfully');
        resolve();
      } else {
        const error = new Error(`Rust installation failed with code ${code}`);
        log(error.message);
        reject(error);
      }
    });
  });
}

// Clone core repository
async function cloneCore() {
  log('Cloning core repository...');
  
  // Check if directory already exists
  if (fs.existsSync(CORE_DIR)) {
    log('Core directory already exists, pulling latest changes');
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', ['pull'], {
        cwd: CORE_DIR,
        stdio: 'inherit'
      });
      
      gitProcess.on('close', (code) => {
        if (code === 0) {
          log('Successfully updated core repository');
          resolve();
        } else {
          const error = new Error(`Git pull failed with code ${code}`);
          log(error.message);
          reject(error);
        }
      });
    });
  } else {
    // Clone the repository
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', ['clone', CORE_REPO, CORE_DIR], {
        stdio: 'inherit'
      });
      
      gitProcess.on('close', (code) => {
        if (code === 0) {
          log('Successfully cloned core repository');
          resolve();
        } else {
          const error = new Error(`Git clone failed with code ${code}`);
          log(error.message);
          reject(error);
        }
      });
    });
  }
}

// Build core components
async function buildCore() {
  log('Building core components...');
  
  return new Promise((resolve, reject) => {
    // Set up environment variables
    const env = {
      ...process.env,
      // Add Cargo bin to PATH if needed
      PATH: `${path.join(os.homedir(), '.cargo', 'bin')}${path.delimiter}${process.env.PATH}`
    };
    
    const cargoProcess = spawn('cargo', ['build', '--release'], {
      cwd: CORE_DIR,
      env,
      stdio: 'inherit'
    });
    
    cargoProcess.on('close', (code) => {
      if (code === 0) {
        log('Successfully built core components');
        resolve();
      } else {
        const error = new Error(`Cargo build failed with code ${code}`);
        log(error.message);
        reject(error);
      }
    });
  });
}

// Setup configuration
async function setupConfig() {
  log('Setting up configuration...');
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  // Create default config.json if it doesn't exist
  const configPath = path.join(CONFIG_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      memory_bank: {
        categories: {
          context: { max_tokens: 10000, priority: "high" },
          decision: { max_tokens: 5000, priority: "medium" },
          progress: { max_tokens: 8000, priority: "high" },
          product: { max_tokens: 10000, priority: "medium" },
          pattern: { max_tokens: 5000, priority: "low" }
        },
        update_triggers: {
          auto_update: true,
          umb_command: true
        },
        token_budget: {
          total: 50000,
          per_category: true
        },
        relevance: {
          threshold: 0.7,
          boost_recent: true
        }
      },
      server: {
        port: 50051,
        host: "127.0.0.1",
        binary_path: path.join(CORE_DIR, 'target', 'release', 
          process.platform === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core')
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    log('Created default configuration');
  }
  
  // Update VS Code settings
  try {
    const mcpSettingsPath = path.join(
      os.homedir(),
      process.platform === 'win32'
        ? 'AppData\\Roaming\\Code\\User\\globalStorage\\rooveterinaryinc.roo-cline\\settings\\cline_mcp_settings.json'
        : process.platform === 'darwin'
          ? 'Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json'
          : '.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json'
    );
    
    // Create directory if it doesn't exist
    const mcpSettingsDir = path.dirname(mcpSettingsPath);
    if (!fs.existsSync(mcpSettingsDir)) {
      fs.mkdirSync(mcpSettingsDir, { recursive: true });
    }
    
    // Read existing settings or create new ones
    let mcpSettings = { mcpServers: {} };
    if (fs.existsSync(mcpSettingsPath)) {
      try {
        mcpSettings = JSON.parse(fs.readFileSync(mcpSettingsPath, 'utf8'));
      } catch (error) {
        log(`Error reading MCP settings: ${error.message}`);
      }
    }
    
    // Add or update smart-memory server
    mcpSettings.mcpServers = mcpSettings.mcpServers || {};
    mcpSettings.mcpServers['smart-memory'] = {
      command: process.platform === 'win32' ? '' : 'node',
      args: [path.join(CORE_DIR, 'target', 'release', 
        process.platform === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core')],
      env: {
        RUST_LOG: 'info',
        DB_PATH: path.join(CONFIG_DIR, 'memories.db'),
        CONFIG_PATH: path.join(CONFIG_DIR, 'config.json')
      },
      disabled: false,
      timeout: 60,
      alwaysAllow: ['UMB']
    };
    
    // Write updated settings
    fs.writeFileSync(mcpSettingsPath, JSON.stringify(mcpSettings, null, 2));
    log('Updated VS Code MCP settings');
  } catch (error) {
    log(`Error updating VS Code settings: ${error.message}`);
    throw error;
  }
}

// Main setup function
async function setup() {
  try {
    log('Starting Smart Memory MCP setup...');
    
    // Create config directory
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Check and install Rust if needed
    if (!hasRust()) {
      await installRust();
    } else {
      log('Rust is already installed');
    }
    
    // Clone and build core
    await cloneCore();
    await buildCore();
    
    // Setup configuration
    await setupConfig();
    
    log('Setup completed successfully!');
    return true;
  } catch (error) {
    log(`Setup failed: ${error.message}`);
    return false;
  }
}

// Export setup function for use in extension
module.exports = {
  setup,
  hasRust,
  installRust,
  cloneCore,
  buildCore,
  setupConfig
};

// Run setup if script is executed directly
if (require.main === module) {
  setup().then((success) => {
    process.exit(success ? 0 : 1);
  });
}