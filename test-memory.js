#!/usr/bin/env node

/**
 * Test script for Smart Memory MCP with Memory Bank functionality
 * 
 * This script demonstrates how to use the Smart Memory MCP system
 * with the Memory Bank functionality for persistent context across sessions.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG_DIR = '.smart-memory';
const CONFIG_FILE = 'config.json';
const DB_FILE = 'memories.db';

// Create config directory if it doesn't exist
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR);
  console.log(`Created directory: ${CONFIG_DIR}`);
}

// Create default config file if it doesn't exist
const configPath = path.join(CONFIG_DIR, CONFIG_FILE);
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
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log(`Created default config file: ${configPath}`);
}

// Start the MCP server
console.log('Starting Smart Memory MCP server...');
const serverProcess = spawn('cargo', ['run', '--release'], {
  cwd: path.join(__dirname, 'core'),
  env: {
    ...process.env,
    RUST_LOG: 'info',
    DB_PATH: path.join(__dirname, CONFIG_DIR, DB_FILE),
    CONFIG_PATH: path.join(__dirname, CONFIG_DIR, CONFIG_FILE)
  }
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log(`[Server] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data.toString().trim()}`);
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Wait for server to start
setTimeout(() => {
  console.log('\n=== Smart Memory MCP Test Menu ===');
  showMenu();
}, 2000);

// Show menu options
function showMenu() {
  console.log('\nOptions:');
  console.log('1. Store memory in context category');
  console.log('2. Store memory in decision category');
  console.log('3. Store memory in progress category');
  console.log('4. Get context for code mode');
  console.log('5. Get context for architect mode');
  console.log('6. Optimize memory bank');
  console.log('7. Get memory bank stats');
  console.log('8. Exit');
  
  rl.question('\nEnter option: ', (answer) => {
    handleOption(answer);
  });
}

// Handle user option
function handleOption(option) {
  switch (option) {
    case '1':
      storeMemory('context');
      break;
    case '2':
      storeMemory('decision');
      break;
    case '3':
      storeMemory('progress');
      break;
    case '4':
      getContext('code');
      break;
    case '5':
      getContext('architect');
      break;
    case '6':
      optimizeMemory();
      break;
    case '7':
      getStats();
      break;
    case '8':
      exit();
      break;
    default:
      console.log('Invalid option');
      showMenu();
      break;
  }
}

// Store memory in a category
function storeMemory(category) {
  rl.question(`Enter content for ${category}: `, (content) => {
    console.log(`Storing memory in ${category} category...`);
    
    // In a real implementation, this would use the gRPC client
    // For this demo, we'll just simulate the response
    setTimeout(() => {
      console.log(`Memory stored successfully in ${category} category`);
      console.log(`Memory ID: mem_${Math.random().toString(36).substring(2, 10)}`);
      console.log(`Token count: ${Math.floor(content.length / 4)}`);
      showMenu();
    }, 500);
  });
}

// Get context for a mode
function getContext(mode) {
  console.log(`Getting context for ${mode} mode...`);
  
  // In a real implementation, this would use the gRPC client
  // For this demo, we'll just simulate the response
  setTimeout(() => {
    console.log(`\nContext for ${mode} mode:`);
    console.log('-------------------');
    
    if (mode === 'code') {
      console.log('This is a sample context for code mode.');
      console.log('It includes information about the current implementation tasks.');
      console.log('- Implement memory bank functionality');
      console.log('- Add support for categories');
      console.log('- Optimize token usage');
    } else {
      console.log('This is a sample context for architect mode.');
      console.log('It includes information about the system design.');
      console.log('- Memory bank architecture');
      console.log('- Category organization');
      console.log('- Token budget management');
    }
    
    console.log('-------------------');
    console.log('Token count: 150');
    console.log('Relevance score: 0.85');
    showMenu();
  }, 500);
}

// Optimize memory
function optimizeMemory() {
  rl.question('Enter optimization strategy (balanced, aggressive, conservative): ', (strategy) => {
    if (!['balanced', 'aggressive', 'conservative'].includes(strategy)) {
      strategy = 'balanced';
    }
    
    console.log(`Optimizing memory bank with ${strategy} strategy...`);
    
    // In a real implementation, this would use the gRPC client
    // For this demo, we'll just simulate the response
    setTimeout(() => {
      const tokensBefore = 5000;
      const tokensAfter = strategy === 'aggressive' ? 2500 : 
                         strategy === 'conservative' ? 4500 : 3500;
      
      console.log('\nOptimization results:');
      console.log('-------------------');
      console.log(`Tokens before: ${tokensBefore}`);
      console.log(`Tokens after: ${tokensAfter}`);
      console.log(`Tokens saved: ${tokensBefore - tokensAfter}`);
      console.log(`Optimized memories: 25`);
      console.log('-------------------');
      showMenu();
    }, 500);
  });
}

// Get memory bank stats
function getStats() {
  console.log('Getting memory bank stats...');
  
  // In a real implementation, this would use the gRPC client
  // For this demo, we'll just simulate the response
  setTimeout(() => {
    console.log('\nMemory Bank Stats:');
    console.log('-------------------');
    console.log('Total memories: 50');
    console.log('Total tokens: 10000');
    console.log('\nTokens by category:');
    console.log('- context: 5000');
    console.log('- decision: 2000');
    console.log('- progress: 3000');
    console.log('\nMemories by category:');
    console.log('- context: 25');
    console.log('- decision: 10');
    console.log('- progress: 15');
    console.log('-------------------');
    showMenu();
  }, 500);
}

// Exit the application
function exit() {
  console.log('Shutting down server...');
  serverProcess.kill();
  rl.close();
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  exit();
});