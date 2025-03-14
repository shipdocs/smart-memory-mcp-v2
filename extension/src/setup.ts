import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ServerDiscovery } from './server-discovery';
import { ServerManager } from './server-manager';
import { StatusBarManager } from './status-bar';

const exists = promisify(fs.exists);

// Import the installRooModes function from our script
// We'll use dynamic import to avoid issues with the script not being available during development
async function importInstallRooModes(extensionPath: string): Promise<(workspacePath: string) => Promise<void>> {
    try {
        const scriptPath = path.join(extensionPath, 'scripts', 'install-roo-modes.js');
        if (await exists(scriptPath)) {
            const { installRooModes } = require(scriptPath);
            return installRooModes;
        }
    } catch (error) {
        console.error('Failed to import installRooModes:', error);
    }
    
    // Return a no-op function if the script can't be loaded
    return async () => {
        console.log('Skipping Roo modes installation (script not available)');
    };
}

/**
 * Setup the Smart Memory MCP extension
 * This function:
 * 1. Ensures the server binary exists
 * 2. Configures the MCP settings
 * 3. Installs Roo modes to the workspace
 */
export async function setupExtension(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Create server discovery instance
        const serverDiscovery = new ServerDiscovery(context);
        
        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up Smart Memory MCP",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Checking core binary..." });
            const binaryPath = await serverDiscovery.ensureServerBinary();
            if (!binaryPath) {
                throw new Error('Failed to find or extract server binary');
            }

            progress.report({ message: "Configuring MCP settings..." });
            await serverDiscovery.configureMcpSettings();
            
            // Install Roo modes to the workspace if we have an active workspace
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                progress.report({ message: "Installing Roo modes to workspace..." });
                const installRooModes = await importInstallRooModes(context.extensionPath);
                const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                await installRooModes(workspacePath);
            }

            progress.report({ message: "Setup complete" });
        });

        vscode.window.showInformationMessage('Smart Memory MCP setup completed successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Smart Memory MCP setup failed: ${error}`);
        console.error('Smart Memory MCP setup failed:', error);
    }
}