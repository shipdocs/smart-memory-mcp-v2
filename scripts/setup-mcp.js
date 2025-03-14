#!/usr/bin/env node

/**
 * Setup script for Smart Memory MCP
 * 
 * This script adds the Smart Memory MCP server configuration to the Roo-Code MCP settings file.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the path to the Smart Memory MCP installation
const smartMemoryPath = path.resolve(__dirname, '..');

// Get the path to the Roo-Code MCP settings file
const homeDir = os.homedir();
let mcpSettingsPath;

// Determine the path based on the operating system
const platform = os.platform();
if (platform === 'darwin') {
  // macOS
  mcpSettingsPath = path.join(
    homeDir,
    'Library',
    'Application Support',
    'Code',
    'User',
    'globalStorage',
    'rooveterinaryinc.roo-cline',
    'settings',
    'cline_mcp_settings.json'
  );
} else if (platform === 'linux') {
  // Linux
  mcpSettingsPath = path.join(
    homeDir,
    '.config',
    'Code',
    'User',
    'globalStorage',
    'rooveterinaryinc.roo-cline',
    'settings',
    'cline_mcp_settings.json'
  );
} else if (platform === 'win32') {
  // Windows
  mcpSettingsPath = path.join(
    homeDir,
    'AppData',
    'Roaming',
    'Code',
    'User',
    'globalStorage',
    'rooveterinaryinc.roo-cline',
    'settings',
    'cline_mcp_settings.json'
  );
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

// Check if the MCP settings file exists
if (!fs.existsSync(mcpSettingsPath)) {
  console.error(`MCP settings file not found at ${mcpSettingsPath}`);
  console.error('Please make sure Roo-Code is installed and has been run at least once.');
  process.exit(1);
}

// Read the current MCP settings
let mcpSettings;
try {
  const mcpSettingsContent = fs.readFileSync(mcpSettingsPath, 'utf8');
  mcpSettings = JSON.parse(mcpSettingsContent);
} catch (error) {
  console.error(`Error reading MCP settings file: ${error.message}`);
  process.exit(1);
}

// Make sure the mcpServers object exists
if (!mcpSettings.mcpServers) {
  mcpSettings.mcpServers = {};
}

// Add or update the Smart Memory MCP server configuration
mcpSettings.mcpServers['smart-memory'] = {
  command: path.join(smartMemoryPath, 'core', 'target', 'release', 'smart-memory-mcp-core'),
  args: [],
  env: {
    RUST_LOG: 'info',
    DB_PATH: '{workspace}/.smart-memory/memories.db',
    CONFIG_PATH: '{workspace}/.smart-memory/config.json'
  },
  disabled: false,
  timeout: 60,
  alwaysAllow: ['UMB'] // Register the UMB command with Roo-Code
};

// Write the updated MCP settings back to the file
try {
  fs.writeFileSync(mcpSettingsPath, JSON.stringify(mcpSettings, null, 2));
  console.log(`Smart Memory MCP server configuration added to ${mcpSettingsPath}`);
} catch (error) {
  console.error(`Error writing MCP settings file: ${error.message}`);
  process.exit(1);
}

// Check if the Claude desktop app is installed
let claudeDesktopConfigPath;

// Determine the path based on the operating system
if (platform === 'darwin') {
  // macOS
  claudeDesktopConfigPath = path.join(
    homeDir,
    'Library',
    'Application Support',
    'Claude',
    'claude_desktop_config.json'
  );
} else if (platform === 'linux') {
  // Linux
  claudeDesktopConfigPath = path.join(
    homeDir,
    '.config',
    'Claude',
    'claude_desktop_config.json'
  );
} else if (platform === 'win32') {
  // Windows
  claudeDesktopConfigPath = path.join(
    homeDir,
    'AppData',
    'Roaming',
    'Claude',
    'claude_desktop_config.json'
  );
} else {
  // Skip Claude desktop app configuration for unsupported platforms
  claudeDesktopConfigPath = null;
}

if (claudeDesktopConfigPath && fs.existsSync(claudeDesktopConfigPath)) {
  console.log('Claude desktop app detected. Adding Smart Memory MCP server configuration...');
  
  // Read the current Claude desktop config
  let claudeConfig;
  try {
    const claudeConfigContent = fs.readFileSync(claudeDesktopConfigPath, 'utf8');
    claudeConfig = JSON.parse(claudeConfigContent);
  } catch (error) {
    console.error(`Error reading Claude desktop config file: ${error.message}`);
    console.log('Skipping Claude desktop app configuration.');
    process.exit(0);
  }
  
  // Make sure the mcpServers object exists
  if (!claudeConfig.mcpServers) {
    claudeConfig.mcpServers = {};
  }
  
  // Add or update the Smart Memory MCP server configuration
  claudeConfig.mcpServers['smart-memory'] = {
    command: path.join(smartMemoryPath, 'core', 'target', 'release', 'smart-memory-mcp-core'),
    args: [],
    env: {
      RUST_LOG: 'info',
      DB_PATH: '{workspace}/.smart-memory/memories.db',
      CONFIG_PATH: '{workspace}/.smart-memory/config.json'
    },
    disabled: false,
    timeout: 60,
    alwaysAllow: ['UMB'] // Register the UMB command with Claude desktop app
  };
  
  // Write the updated Claude desktop config back to the file
  try {
    fs.writeFileSync(claudeDesktopConfigPath, JSON.stringify(claudeConfig, null, 2));
    console.log(`Smart Memory MCP server configuration added to ${claudeDesktopConfigPath}`);
  } catch (error) {
    console.error(`Error writing Claude desktop config file: ${error.message}`);
  }
}

console.log('Setup complete!');
console.log('Please restart Roo-Code to apply the changes.');