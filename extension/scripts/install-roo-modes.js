#!/usr/bin/env node

/**
 * This script installs the Roo modes configuration files to the current workspace.
 * It copies the .clinerules-* files from the config/roo-modes directory to the workspace root.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Copy a file from source to destination
 * @param {string} source Source file path
 * @param {string} destination Destination file path
 */
async function copyFileWithLog(source, destination) {
  try {
    await copyFile(source, destination);
    console.log(`✅ Copied ${path.basename(source)} to ${destination}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${path.basename(source)}: ${error.message}`);
  }
}

/**
 * Install Roo modes to the specified workspace
 * @param {string} workspacePath Path to the workspace root
 */
async function installRooModes(workspacePath) {
  console.log(`Installing Roo modes to ${workspacePath}...`);

  // Get the path to the config/roo-modes directory
  const extensionPath = path.resolve(__dirname, '..');
  const rooModesPath = path.join(extensionPath, 'config', 'roo-modes');

  try {
    // Check if the roo-modes directory exists
    const rooModesStat = await stat(rooModesPath);
    if (!rooModesStat.isDirectory()) {
      console.error(`❌ ${rooModesPath} is not a directory`);
      return;
    }

    // Get all .clinerules-* files
    const files = await readdir(rooModesPath);
    const clinerules = files.filter(file => file.startsWith('.clinerules-'));

    if (clinerules.length === 0) {
      console.warn('⚠️ No .clinerules-* files found in config/roo-modes');
      return;
    }

    // Copy each file to the workspace root
    for (const file of clinerules) {
      const source = path.join(rooModesPath, file);
      const destination = path.join(workspacePath, file);
      await copyFileWithLog(source, destination);
    }

    // Also copy .roomodes if it exists
    const roomodesSource = path.join(rooModesPath, '.roomodes');
    try {
      await stat(roomodesSource);
      const roomodesDestination = path.join(workspacePath, '.roomodes');
      await copyFileWithLog(roomodesSource, roomodesDestination);
    } catch (error) {
      // .roomodes doesn't exist, that's fine
    }

    console.log('✅ Roo modes installation complete');
  } catch (error) {
    console.error(`❌ Failed to install Roo modes: ${error.message}`);
  }
}

// If this script is run directly, install to the current directory
if (require.main === module) {
  const workspacePath = process.argv[2] || process.cwd();
  installRooModes(workspacePath).catch(console.error);
}

module.exports = { installRooModes };