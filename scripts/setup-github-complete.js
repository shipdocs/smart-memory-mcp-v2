#!/usr/bin/env node

/**
 * Complete GitHub Setup Script
 * 
 * This script automates the complete GitHub setup process for the Smart Memory MCP project.
 * It handles:
 * 1. Creating a GitHub repository
 * 2. Initializing git in the local directory
 * 3. Adding all files to git
 * 4. Creating an initial commit
 * 5. Adding the GitHub remote
 * 6. Pushing to GitHub
 * 7. Setting up GitHub Actions secrets
 * 
 * Usage:
 *   node scripts/setup-github-complete.js [options]
 * 
 * Options:
 *   --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
 *   --description <desc>   Description of the repository
 *   --private              Make the repository private (default: public)
 *   --username <username>  GitHub username
 *   --token <token>        GitHub personal access token
 *   --vsce-pat <token>     VS Code Marketplace Personal Access Token
 *   --help                 Show help
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  repoName: 'smart-memory-mcp',
  description: 'A Model Context Protocol (MCP) server for Smart Memory integration with VS Code',
  private: false,
  username: '',
  token: '',
  vscePat: '',
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--repo-name':
      options.repoName = args[++i];
      break;
    case '--description':
      options.description = args[++i];
      break;
    case '--private':
      options.private = true;
      break;
    case '--username':
      options.username = args[++i];
      break;
    case '--token':
      options.token = args[++i];
      break;
    case '--vsce-pat':
      options.vscePat = args[++i];
      break;
    case '--help':
      showHelp();
      process.exit(0);
      break;
    default:
      console.error(`Unknown option: ${args[i]}`);
      showHelp();
      process.exit(1);
  }
}

function showHelp() {
  console.log(`
Complete GitHub Setup Script

Usage:
  node scripts/setup-github-complete.js [options]

Options:
  --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
  --description <desc>   Description of the repository
  --private              Make the repository private (default: public)
  --username <username>  GitHub username
  --token <token>        GitHub personal access token
  --vsce-pat <token>     VS Code Marketplace Personal Access Token
  --help                 Show help
  `);
}

// Main function
async function main() {
  try {
    console.log('Smart Memory MCP Complete GitHub Setup');
    console.log('=====================================');
    
    // Step 1: Run the repository setup script
    console.log('\n[Step 1/2] Setting up GitHub repository...\n');
    
    const repoSetupArgs = [];
    if (options.repoName) repoSetupArgs.push('--repo-name', options.repoName);
    if (options.description) repoSetupArgs.push('--description', options.description);
    if (options.private) repoSetupArgs.push('--private');
    if (options.username) repoSetupArgs.push('--username', options.username);
    if (options.token) repoSetupArgs.push('--token', options.token);
    
    const repoSetupScript = path.join(__dirname, 'setup-github.js');
    if (!fs.existsSync(repoSetupScript)) {
      console.error(`Error: Repository setup script not found at ${repoSetupScript}`);
      process.exit(1);
    }
    
    try {
      execSync(`node ${repoSetupScript} ${repoSetupArgs.join(' ')}`, {
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('Error running repository setup script:', error);
      process.exit(1);
    }
    
    // Step 2: Run the secrets setup script
    console.log('\n[Step 2/2] Setting up GitHub Actions secrets...\n');
    
    const secretsSetupArgs = [];
    if (options.repoName) secretsSetupArgs.push('--repo-name', options.repoName);
    if (options.username) secretsSetupArgs.push('--username', options.username);
    if (options.token) secretsSetupArgs.push('--token', options.token);
    if (options.vscePat) secretsSetupArgs.push('--vsce-pat', options.vscePat);
    
    const secretsSetupScript = path.join(__dirname, 'setup-github-secrets.js');
    if (!fs.existsSync(secretsSetupScript)) {
      console.error(`Error: Secrets setup script not found at ${secretsSetupScript}`);
      process.exit(1);
    }
    
    try {
      execSync(`node ${secretsSetupScript} ${secretsSetupArgs.join(' ')}`, {
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('Error running secrets setup script:', error);
      process.exit(1);
    }
    
    console.log('\nComplete GitHub setup finished successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to your repository on GitHub');
    console.log('2. Navigate to "Actions" tab');
    console.log('3. Verify that the workflows are enabled');
    console.log('4. Make changes to your code and push to trigger the CI/CD workflows');
    
  } catch (error) {
    console.error('Error during complete GitHub setup:', error);
    process.exit(1);
  }
}

main();