import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as semver from 'semver';

// Current version is read from package.json
const CURRENT_VERSION = vscode.extensions.getExtension('rooveterinaryinc.smart-memory-mcp')?.packageJSON.version || '0.1.0';

// GitHub repository information
const GITHUB_OWNER = 'your-org';
const GITHUB_REPO = 'smart-memory-mcp';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Version check interval (24 hours)
const VERSION_CHECK_INTERVAL = 24 * 60 * 60 * 1000;

// Last check timestamp key
const LAST_CHECK_KEY = 'smartMemory.lastVersionCheck';
const SKIP_VERSION_KEY = 'smartMemory.skipVersion';

/**
 * Version information interface
 */
export interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  releaseUrl: string;
  releaseNotes: string;
}

/**
 * Check if an update is available
 * @param context VS Code extension context
 * @param force Force check even if the interval hasn't elapsed
 * @returns Promise resolving to version information
 */
export async function checkForUpdates(context: vscode.ExtensionContext, force: boolean = false): Promise<VersionInfo | null> {
  // Check if we should skip this version
  const skipVersion = context.globalState.get<string>(SKIP_VERSION_KEY);
  
  // Check if we've checked recently
  const lastCheck = context.globalState.get<number>(LAST_CHECK_KEY) || 0;
  const now = Date.now();
  
  if (!force && now - lastCheck < VERSION_CHECK_INTERVAL) {
    return null;
  }
  
  try {
    // Update last check timestamp
    await context.globalState.update(LAST_CHECK_KEY, now);
    
    // Get latest release info from GitHub
    const latestRelease = await getLatestRelease();
    
    if (!latestRelease) {
      return null;
    }
    
    const latestVersion = latestRelease.tag_name.replace(/^v/, '');
    
    // Check if update is available and not skipped
    const updateAvailable = semver.gt(latestVersion, CURRENT_VERSION) && 
                           (!skipVersion || semver.gt(latestVersion, skipVersion));
    
    return {
      current: CURRENT_VERSION,
      latest: latestVersion,
      updateAvailable,
      releaseUrl: latestRelease.html_url,
      releaseNotes: latestRelease.body || 'No release notes available'
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

/**
 * Get the latest release information from GitHub
 * @returns Promise resolving to release information
 */
async function getLatestRelease(): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      GITHUB_API_URL,
      {
        headers: {
          'User-Agent': `SmartMemoryMCP/${CURRENT_VERSION}`
        }
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API returned status code ${response.statusCode}`));
          return;
        }
        
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const release = JSON.parse(data);
            resolve(release);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.end();
  });
}

/**
 * Show update notification to the user
 * @param versionInfo Version information
 * @param context VS Code extension context
 */
export async function showUpdateNotification(versionInfo: VersionInfo, context: vscode.ExtensionContext): Promise<void> {
  if (!versionInfo.updateAvailable) {
    return;
  }
  
  const downloadOption = 'Download';
  const viewNotesOption = 'View Release Notes';
  const skipOption = 'Skip This Version';
  const remindLaterOption = 'Remind Me Later';
  
  const result = await vscode.window.showInformationMessage(
    `Smart Memory MCP v${versionInfo.latest} is available (current: v${versionInfo.current})`,
    downloadOption,
    viewNotesOption,
    skipOption,
    remindLaterOption
  );
  
  if (result === downloadOption) {
    vscode.env.openExternal(vscode.Uri.parse(versionInfo.releaseUrl));
  } else if (result === viewNotesOption) {
    // Show release notes in a markdown preview
    const notesPath = path.join(context.extensionPath, 'release-notes.md');
    fs.writeFileSync(notesPath, `# Smart Memory MCP v${versionInfo.latest} Release Notes\n\n${versionInfo.releaseNotes}`);
    
    const uri = vscode.Uri.file(notesPath);
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } else if (result === skipOption) {
    // Skip this version
    await context.globalState.update(SKIP_VERSION_KEY, versionInfo.latest);
  }
  // For remindLaterOption, we do nothing and will check again after the interval
}

/**
 * Register version-related commands
 * @param context VS Code extension context
 */
export function registerVersionCommands(context: vscode.ExtensionContext): void {
  // Register command to check for updates
  context.subscriptions.push(
    vscode.commands.registerCommand('smartMemory.checkForUpdates', async () => {
      vscode.window.showInformationMessage('Checking for updates...');
      
      const versionInfo = await checkForUpdates(context, true);
      
      if (!versionInfo) {
        vscode.window.showInformationMessage('Failed to check for updates. Please try again later.');
        return;
      }
      
      if (versionInfo.updateAvailable) {
        await showUpdateNotification(versionInfo, context);
      } else {
        vscode.window.showInformationMessage(`You are using the latest version (v${versionInfo.current}).`);
      }
    })
  );
  
  // Register command to show current version
  context.subscriptions.push(
    vscode.commands.registerCommand('smartMemory.showVersion', () => {
      vscode.window.showInformationMessage(`Smart Memory MCP v${CURRENT_VERSION}`);
    })
  );
}

/**
 * Initialize version checking
 * @param context VS Code extension context
 */
export async function initializeVersionChecking(context: vscode.ExtensionContext): Promise<void> {
  // Check for updates on startup
  const versionInfo = await checkForUpdates(context);
  
  if (versionInfo?.updateAvailable) {
    await showUpdateNotification(versionInfo, context);
  }
  
  // Set up periodic version checking
  setInterval(async () => {
    const versionInfo = await checkForUpdates(context);
    
    if (versionInfo?.updateAvailable) {
      await showUpdateNotification(versionInfo, context);
    }
  }, VERSION_CHECK_INTERVAL);
}