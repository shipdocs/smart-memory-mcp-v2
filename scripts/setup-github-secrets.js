#!/usr/bin/env node

/**
 * GitHub Actions Secrets Setup Script
 * 
 * This script automates the process of setting up GitHub Actions secrets for the Smart Memory MCP project.
 * It handles:
 * 1. Creating a GitHub Personal Access Token (PAT) for VS Code Marketplace publishing
 * 2. Adding the PAT as a secret to the GitHub repository
 * 
 * Usage:
 *   node scripts/setup-github-secrets.js [options]
 * 
 * Options:
 *   --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
 *   --username <username>  GitHub username
 *   --token <token>        GitHub personal access token with repo scope
 *   --vsce-pat <token>     VS Code Marketplace Personal Access Token
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
  username: '',
  token: '',
  vscePat: '',
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--repo-name':
      options.repoName = args[++i];
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
GitHub Actions Secrets Setup Script

Usage:
  node scripts/setup-github-secrets.js [options]

Options:
  --repo-name <name>     Name of the GitHub repository (default: smart-memory-mcp)
  --username <username>  GitHub username
  --token <token>        GitHub personal access token with repo scope
  --vsce-pat <token>     VS Code Marketplace Personal Access Token
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
        promptForToken();
      });
    } else {
      promptForToken();
    }

    function promptForToken() {
      if (!options.token) {
        rl.question('GitHub personal access token (with repo scope): ', (answer) => {
          options.token = answer.trim();
          promptForVscePat();
        });
      } else {
        promptForVscePat();
      }
    }

    function promptForVscePat() {
      if (!options.vscePat) {
        console.log('\nTo publish to VS Code Marketplace, you need a Personal Access Token (PAT).');
        console.log('You can create one at: https://dev.azure.com/');
        console.log('Make sure it has the "Marketplace (Manage)" scope.\n');
        
        rl.question('VS Code Marketplace PAT: ', (answer) => {
          options.vscePat = answer.trim();
          rl.close();
          resolve();
        });
      } else {
        rl.close();
        resolve();
      }
    }
  });
}

// Create GitHub repository secret
function createGitHubSecret(secretName, secretValue) {
  console.log(`Creating GitHub secret: ${secretName}...`);
  
  // First, we need to get the public key for the repository
  const getPublicKeyOptions = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${options.username}/${options.repoName}/actions/secrets/public-key`,
    method: 'GET',
    headers: {
      'User-Agent': 'Smart-Memory-MCP-Setup',
      'Authorization': `token ${options.token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(getPublicKeyOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const publicKeyData = JSON.parse(responseData);
          
          // Now we need to encrypt the secret using the public key
          // For simplicity, we'll use the GitHub CLI if available
          try {
            // Check if GitHub CLI is installed
            execSync('gh --version', { stdio: 'ignore' });
            
            // Use GitHub CLI to set the secret
            execSync(`echo "${secretValue}" | gh secret set ${secretName} -R ${options.username}/${options.repoName}`, {
              stdio: 'inherit',
              env: {
                ...process.env,
                GITHUB_TOKEN: options.token,
              },
            });
            
            console.log(`Secret ${secretName} created successfully.`);
            resolve();
          } catch (error) {
            console.error('GitHub CLI not available or error setting secret.');
            console.error('Please set the secret manually:');
            console.error(`1. Go to https://github.com/${options.username}/${options.repoName}/settings/secrets/actions`);
            console.error(`2. Click "New repository secret"`);
            console.error(`3. Name: ${secretName}`);
            console.error(`4. Value: [your secret value]`);
            console.error(`5. Click "Add secret"`);
            
            // Ask user to confirm they've set the secret manually
            rl.question('\nHave you set the secret manually? (yes/no): ', (answer) => {
              if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                resolve();
              } else {
                reject(new Error('Secret not set manually.'));
              }
            });
          }
        } else {
          console.error(`Failed to get public key: ${res.statusCode}`);
          console.error(responseData);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error getting public key:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Main function
async function main() {
  try {
    console.log('Smart Memory MCP GitHub Secrets Setup');
    console.log('====================================');
    
    await promptForMissingInfo();
    
    // Create VSCE_PAT secret
    await createGitHubSecret('VSCE_PAT', options.vscePat);
    
    console.log('\nGitHub Actions secrets setup complete!');
    console.log('\nNext steps:');
    console.log('1. Go to your repository on GitHub');
    console.log('2. Navigate to "Actions" tab');
    console.log('3. Verify that the workflows are enabled');
    
  } catch (error) {
    console.error('Error setting up GitHub Actions secrets:', error);
    process.exit(1);
  }
}

main();