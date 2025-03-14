#!/usr/bin/env node

/**
 * Copy installation scripts to the extension directory
 * This script is run during the extension build process
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);

async function main() {
  // Get the root directory of the project
  const rootDir = path.resolve(__dirname, '..');
  const extensionDir = path.join(rootDir, 'extension');
  const extensionScriptsDir = path.join(extensionDir, 'scripts');

  // Create the scripts directory in the extension if it doesn't exist
  if (!fs.existsSync(extensionScriptsDir)) {
    await mkdir(extensionScriptsDir, { recursive: true });
  }

  // Copy the installation scripts
  const scripts = [
    { src: path.join(rootDir, 'scripts', 'install.sh'), dest: path.join(extensionScriptsDir, 'install.sh') },
    { src: path.join(rootDir, 'scripts', 'install.ps1'), dest: path.join(extensionScriptsDir, 'install.ps1') }
  ];

  for (const script of scripts) {
    console.log(`Copying ${script.src} to ${script.dest}...`);
    await copyFile(script.src, script.dest);

    // Make the script executable (except on Windows)
    if (process.platform !== 'win32' && script.dest.endsWith('.sh')) {
      await chmod(script.dest, 0o755);
    }
  }

  console.log('Installation scripts copied successfully!');
}

main().catch(error => {
  console.error('Error copying installation scripts:', error);
  process.exit(1);
});