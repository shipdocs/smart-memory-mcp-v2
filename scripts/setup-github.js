#!/usr/bin/env node

/**
 * GitHub Repository Setup Script
 * 
 * This script automates the process of setting up a GitHub repository for the Smart Memory MCP project.
 * It handles:
 * 1. Creating a GitHub repository
 * 2. Initializing git in the local directory
 * 3. Adding all files to git
 * 4. Creating an initial commit
 * 5. Adding the GitHub remote
 * 6. Pushing to GitHub
 * 
 * Usage:
 *   node scripts/setup-github.js [options]
 * 
 * Options:
 *   --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
 *   --description <desc>   Description of the repository
 *   --private              Make the repository private (default: public)
 *   --username <username>  GitHub username
 *   --token <token>        GitHub personal access token
 *   --help                 Show help
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  repoName: 'smart-memory-mcp',
  description: 'A Model Context Protocol (MCP) server for Smart Memory integration with VS Code',
  private: false,
  username: '',
  token: '',
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
GitHub Repository Setup Script

Usage:
  node scripts/setup-github.js [options]

Options:
  --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
  --description <desc>   Description of the repository
  --private              Make the repository private (default: public)
  --username <username>  GitHub username
  --token <token>        GitHub personal access token
  --help                 Show help
  `);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for missing information
async function promptForMissingInfo() {
  return new Promise((resolve) => {
    if (!options.username) {
      rl.question('GitHub username: ', (answer) => {
        options.username = answer.trim();
        if (!options.token) {
          rl.question('GitHub personal access token: ', (answer) => {
            options.token = answer.trim();
            rl.close();
            resolve();
          });
        } else {
          rl.close();
          resolve();
        }
      });
    } else if (!options.token) {
      rl.question('GitHub personal access token: ', (answer) => {
        options.token = answer.trim();
        rl.close();
        resolve();
      });
    } else {
      rl.close();
      resolve();
    }
  });
}

// Create GitHub repository
function createGitHubRepo() {
  console.log(`Creating GitHub repository: ${options.repoName}...`);
  
  const data = JSON.stringify({
    name: options.repoName,
    description: options.description,
    private: options.private,
    auto_init: false,
  });
  
  const requestOptions = {
    hostname: 'api.github.com',
    port: 443,
    path: '/user/repos',
    method: 'POST',
    headers: {
      'User-Agent': 'Smart-Memory-MCP-Setup',
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `token ${options.token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('GitHub repository created successfully.');
          resolve(JSON.parse(responseData));
        } else {
          console.error(`Failed to create GitHub repository: ${res.statusCode}`);
          console.error(responseData);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error creating GitHub repository:', error);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Initialize git repository
function initGitRepo() {
  try {
    // Check if git is already initialized
    if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
      console.log('Initializing git repository...');
      execSync('git init', { stdio: 'inherit' });
    } else {
      console.log('Git repository already initialized.');
    }
    
    // Add all files
    console.log('Adding files to git...');
    execSync('git add .', { stdio: 'inherit' });
    
    // Create initial commit
    console.log('Creating initial commit...');
    execSync('git commit -m "Initial commit"', { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error('Error initializing git repository:', error);
    return false;
  }
}

// Add GitHub remote and push
function pushToGitHub() {
  try {
    const remoteUrl = `https://${options.username}:${options.token}@github.com/${options.username}/${options.repoName}.git`;
    
    // Add remote
    console.log('Adding GitHub remote...');
    try {
      execSync('git remote remove origin', { stdio: 'ignore' });
    } catch (e) {
      // Ignore error if remote doesn't exist
    }
    
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
    
    // Push to GitHub
    console.log('Pushing to GitHub...');
    execSync('git push -u origin main', { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Smart Memory MCP GitHub Setup');
    console.log('============================');
    
    await promptForMissingInfo();
    
    // Create GitHub repository
    await createGitHubRepo();
    
    // Initialize git repository
    if (!initGitRepo()) {
      console.error('Failed to initialize git repository. Exiting.');
      process.exit(1);
    }
    
    // Push to GitHub
    if (!pushToGitHub()) {
      console.error('Failed to push to GitHub. Exiting.');
      process.exit(1);
    }
    
    console.log('\nGitHub repository setup complete!');
    console.log(`Repository URL: https://github.com/${options.username}/${options.repoName}`);
    console.log('\nNext steps:');
    console.log('1. Go to your repository on GitHub');
    console.log('2. Navigate to "Settings" > "Actions" > "General"');
    console.log('3. Ensure "Allow all actions and reusable workflows" is selected');
    console.log('4. Click "Save"');
    console.log('5. Go to "Settings" > "Secrets and variables" > "Actions"');
    console.log('6. Add the VSCE_PAT secret for publishing to VS Code Marketplace');
    
  } catch (error) {
    console.error('Error setting up GitHub repository:', error);
    process.exit(1);
  }
}

main();