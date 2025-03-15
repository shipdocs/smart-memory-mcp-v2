import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);
const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);

/**
 * ServerDiscovery class handles finding and managing the server binary
 */
export class ServerDiscovery {
  private context: vscode.ExtensionContext;
  private extensionPath: string;
  private globalStoragePath: string;
  private platform: string;
  private binaryName: string;
  private dataDir: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.extensionPath = context.extensionPath;
    this.globalStoragePath = context.globalStoragePath;
    this.platform = os.platform();
    this.binaryName = this.platform === 'win32' ? 'smart-memory-mcp-core.exe' : 'smart-memory-mcp-core';
    this.dataDir = path.join(os.homedir(), '.smart-memory');
  }

  /**
   * Get the path to the server binary
   * This will search for the binary in the following locations:
   * 1. Custom path specified in settings
   * 2. User's .smart-memory directory (locally compiled)
   * 3. Extension bin directory for current platform
   * 4. Extension bin directory for all platforms
   * 5. Development location
   */
  async getServerPath(): Promise<string | null> {
    // Check if a custom path is specified in settings
    const config = vscode.workspace.getConfiguration('smartMemory');
    const customBinaryPath = config.get<string>('customBinaryPath');
    
    if (customBinaryPath && await exists(customBinaryPath)) {
      return customBinaryPath;
    }

    // Check user's .smart-memory directory (locally compiled)
    const localBinaryPath = path.join(this.dataDir, 'bin', this.binaryName);
    if (await exists(localBinaryPath)) {
      return localBinaryPath;
    }

    // Check extension bin directory for current platform
    const platformBinaryPath = path.join(this.extensionPath, 'bin', this.binaryName);
    if (await exists(platformBinaryPath)) {
      return platformBinaryPath;
    }

    // Check platform-specific directories
    const platformDirs = {
      win32: path.join(this.extensionPath, 'bin', 'windows', 'smart-memory-mcp-core.exe'),
      darwin: path.join(this.extensionPath, 'bin', 'macos', 'smart-memory-mcp-core'),
      linux: path.join(this.extensionPath, 'bin', 'linux', 'smart-memory-mcp-core')
    };

    const platformSpecificPath = platformDirs[this.platform as keyof typeof platformDirs];
    if (platformSpecificPath && await exists(platformSpecificPath)) {
      return platformSpecificPath;
    }

    // Check development location
    const corePath = path.resolve(this.extensionPath, '..', 'core');
    if (await exists(corePath)) {
      const devBinaryPath = path.join(corePath, 'target', 'release', this.binaryName);
      if (await exists(devBinaryPath)) {
        return devBinaryPath;
      }
    }

    return null;
  }

  /**
   * Run the installation script to compile the server from source
   */
  async runInstallationScript(): Promise<boolean> {
    // Determine which script to run based on platform
    let scriptPath;
    let command;
    
    if (this.platform === 'win32') {
      scriptPath = path.join(this.extensionPath, 'scripts', 'install.ps1');
      command = 'powershell';
    } else {
      scriptPath = path.join(this.extensionPath, 'scripts', 'install.sh');
      command = 'bash';
    }
    
    // Check if the script exists
    if (!await exists(scriptPath)) {
      // Copy the script from the extension
      const sourceScriptPath = path.join(
        this.extensionPath,
        '..',
        'scripts',
        this.platform === 'win32' ? 'install.ps1' : 'install.sh'
      );
      
      if (!await exists(sourceScriptPath)) {
        vscode.window.showErrorMessage('Installation script not found.');
        return false;
      }
      
      // Create the scripts directory if it doesn't exist
      const scriptsDir = path.dirname(scriptPath);
      if (!await exists(scriptsDir)) {
        await mkdir(scriptsDir, { recursive: true });
      }
      
      await copyFile(sourceScriptPath, scriptPath);
      
      // Make the script executable (except on Windows)
      if (this.platform !== 'win32') {
        await chmod(scriptPath, 0o755);
      }
    }
    
    // Ask the user if they want to compile from source
    const response = await vscode.window.showInformationMessage(
      'Smart Memory MCP binary not found. Would you like to compile it from source?',
      'Yes', 'No'
    );
    
    if (response !== 'Yes') {
      return false;
    }
    
    // Show progress notification
    return await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Compiling Smart Memory MCP',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Installing dependencies...' });
      
      try {
        // Create a terminal to run the script
        const terminal = vscode.window.createTerminal('Smart Memory MCP Installation');
        terminal.show();
        
        if (this.platform === 'win32') {
          terminal.sendText(`& "${scriptPath}"`);
        } else {
          terminal.sendText(`"${scriptPath}"`);
        }
        
        // Wait for the script to complete
        await new Promise<void>((resolve) => {
          const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (closedTerminal === terminal) {
              disposable.dispose();
              resolve();
            }
          });
        });
        
        // Check if the binary was created
        const binaryPath = path.join(this.dataDir, 'bin', this.binaryName);
        if (await exists(binaryPath)) {
          vscode.window.showInformationMessage('Smart Memory MCP compiled successfully!');
          return true;
        } else {
          vscode.window.showErrorMessage('Failed to compile Smart Memory MCP. Check the terminal output for details.');
          return false;
        }
      } catch (error) {
        console.error('Error running installation script:', error);
        vscode.window.showErrorMessage(`Failed to run installation script: ${error}`);
        return false;
      }
    });
  }

  /**
   * Ensure the server binary exists and is executable
   * If the binary doesn't exist, it will try to extract it from the extension
   * or compile it from source
   */
  async ensureServerBinary(): Promise<string | null> {
    // First try to find an existing binary
    const existingPath = await this.getServerPath();
    if (existingPath) {
      // Make sure it's executable (except on Windows)
      if (this.platform !== 'win32') {
        await chmod(existingPath, 0o755);
      }
      return existingPath;
    }

    // Try to compile from source
    const compiled = await this.runInstallationScript();
    if (compiled) {
      // Check if the binary was created
      const localBinaryPath = path.join(this.dataDir, 'bin', this.binaryName);
      if (await exists(localBinaryPath)) {
        return localBinaryPath;
      }
    }

    // If compilation failed or was declined, fall back to bundled binaries
    try {
      // Create the bin directory if it doesn't exist
      const binDir = path.join(this.globalStoragePath, 'bin');
      if (!await exists(binDir)) {
        await mkdir(binDir, { recursive: true });
      }

      // Determine which binary to use based on platform
      let sourceBinaryPath;
      
      // Check platform-specific directories first
      const platformDirs = {
        win32: path.join(this.extensionPath, 'bin', 'windows', 'smart-memory-mcp-core.exe'),
        darwin: path.join(this.extensionPath, 'bin', 'macos', 'smart-memory-mcp-core'),
        linux: path.join(this.extensionPath, 'bin', 'linux', 'smart-memory-mcp-core')
      };

      sourceBinaryPath = platformDirs[this.platform as keyof typeof platformDirs];
      
      // Fall back to generic binary if platform-specific one doesn't exist
      if (!sourceBinaryPath || !await exists(sourceBinaryPath)) {
        sourceBinaryPath = path.join(this.extensionPath, 'bin', this.binaryName);
      }

      if (!await exists(sourceBinaryPath)) {
        throw new Error(`Binary not found for platform ${this.platform}`);
      }

      // Copy the binary to the global storage directory
      const targetBinaryPath = path.join(binDir, this.binaryName);
      await copyFile(sourceBinaryPath, targetBinaryPath);
      
      // Make it executable (except on Windows)
      if (this.platform !== 'win32') {
        await chmod(targetBinaryPath, 0o755);
      }

      // Update the settings to use this binary
      const config = vscode.workspace.getConfiguration('smartMemory');
      await config.update('customBinaryPath', targetBinaryPath, vscode.ConfigurationTarget.Global);

      return targetBinaryPath;
    } catch (error) {
      console.error('Failed to extract server binary:', error);
      return null;
    }
  }

  /**
   * Get the path to the data directory
   * This will create the directory if it doesn't exist
   */
  async getDataDirectory(): Promise<string> {
    // Check if a custom data path is specified in settings
    const config = vscode.workspace.getConfiguration('smartMemory');
    const customDataPath = config.get<string>('customDataPath');
    
    if (customDataPath) {
      if (!await exists(customDataPath)) {
        await mkdir(customDataPath, { recursive: true });
      }
      return customDataPath;
    }

    // Use the default data directory
    if (!await exists(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
    
    return this.dataDir;
  }

  /**
   * Get the path to the config file
   * This will create the file with default settings if it doesn't exist
   */
  async getConfigPath(): Promise<string> {
    const dataDir = await this.getDataDirectory();
    const configPath = path.join(dataDir, 'config.json');
    
    if (!await exists(configPath)) {
      // Use the default config template from resources
      const templatePath = path.join(this.extensionPath, 'resources', 'default-config.json');
      
      try {
        // Check if the template exists
        if (await exists(templatePath)) {
          // Copy the template to the config path
          await copyFile(templatePath, configPath);
        } else {
          // If template doesn't exist, create a basic config
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
          
          await writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
        }
      } catch (error) {
        console.error('Error creating config file:', error);
        // Create a basic config as fallback
        const basicConfig = {
          memory_bank: {
            categories: {
              context: { max_tokens: 10000, priority: "high" }
            }
          }
        };
        
        await writeFile(configPath, JSON.stringify(basicConfig, null, 2));
      }
    } else {
      // Check if the config file needs to be updated with new fields
      try {
        const configContent = await readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        let needsUpdate = false;
        
        // Check for server section
        if (!config.server) {
          config.server = {
            port: 50051,
            log_level: "info",
            auto_start: true,
            check_interval_ms: 30000
          };
          needsUpdate = true;
        }
        
        // Check for client section
        if (!config.client) {
          config.client = {
            timeout_ms: 5000,
            retry_attempts: 3,
            retry_delay_ms: 1000
          };
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await writeFile(configPath, JSON.stringify(config, null, 2));
        }
      } catch (error) {
        console.error('Error updating config file:', error);
      }
    }
    
    return configPath;
  }

  /**
   * Get the path to the database file
   */
  async getDbPath(): Promise<string> {
    const dataDir = await this.getDataDirectory();
    return path.join(dataDir, 'memories.db');
  }

  /**
   * Configure the MCP settings for Roo-Code
   */
  async configureMcpSettings(): Promise<void> {
    // Get the binary path
    const binaryPath = await this.ensureServerBinary();
    if (!binaryPath) {
      throw new Error('Failed to find or extract server binary');
    }

    // Get the config and db paths
    const configPath = await this.getConfigPath();
    const dbPath = await this.getDbPath();

    // Get the path to the Roo-Code MCP settings file
    const homeDir = os.homedir();
    let mcpSettingsPath;
    
    // Determine the path based on the operating system
    if (this.platform === 'darwin') {
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
    } else if (this.platform === 'linux') {
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
    } else if (this.platform === 'win32') {
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
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
    
    // Check if the MCP settings file exists
    let mcpSettings;
    try {
      if (await exists(mcpSettingsPath)) {
        // Read the current MCP settings
        const mcpSettingsContent = await readFile(mcpSettingsPath, 'utf8');
        mcpSettings = JSON.parse(mcpSettingsContent);
      } else {
        // Create a new MCP settings file
        mcpSettings = {};
      }
    } catch (error) {
      console.error(`Error reading MCP settings file: ${error}`);
      mcpSettings = {};
    }
    
    // Make sure the mcpServers object exists
    if (!mcpSettings.mcpServers) {
      mcpSettings.mcpServers = {};
    }
    
    // Add or update the Smart Memory MCP server configuration
    mcpSettings.mcpServers['smart-memory'] = {
      command: path.resolve(binaryPath),
      args: [],
      env: {
        RUST_LOG: 'info',
        DB_PATH: path.resolve(dbPath),
        CONFIG_PATH: path.resolve(configPath)
      },
      disabled: false,
      timeout: 60,
      alwaysAllow: [
        "handleUmbCommand",
        "updateMemoryBank",
        "storeMemory",
        "retrieveMemory",
        "optimizeMemory",
        "getContext"
      ]
    };
    
    // Create the settings directory if it doesn't exist
    const settingsDir = path.dirname(mcpSettingsPath);
    if (!await exists(settingsDir)) {
      await mkdir(settingsDir, { recursive: true });
    }
    
    // Write the updated MCP settings back to the file
    await writeFile(mcpSettingsPath, JSON.stringify(mcpSettings, null, 2));
    
    // Check if the Claude desktop app is installed
    let claudeDesktopConfigPath;
    
    // Determine the path based on the operating system
    if (this.platform === 'darwin') {
      // macOS
      claudeDesktopConfigPath = path.join(
        homeDir,
        'Library',
        'Application Support',
        'Claude',
        'claude_desktop_config.json'
      );
    } else if (this.platform === 'linux') {
      // Linux
      claudeDesktopConfigPath = path.join(
        homeDir,
        '.config',
        'Claude',
        'claude_desktop_config.json'
      );
    } else if (this.platform === 'win32') {
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
      return;
    }
    
    if (claudeDesktopConfigPath && await exists(claudeDesktopConfigPath)) {
      console.log('Claude desktop app detected. Adding Smart Memory MCP server configuration...');
      
      // Read the current Claude desktop config
      let claudeConfig;
      try {
        const claudeConfigContent = await readFile(claudeDesktopConfigPath, 'utf8');
        claudeConfig = JSON.parse(claudeConfigContent);
      } catch (error) {
        console.error(`Error reading Claude desktop config file: ${error}`);
        console.log('Skipping Claude desktop app configuration.');
        return;
      }
      
      // Make sure the mcpServers object exists
      if (!claudeConfig.mcpServers) {
        claudeConfig.mcpServers = {};
      }
      
      // Add or update the Smart Memory MCP server configuration
      claudeConfig.mcpServers['smart-memory'] = {
        command: path.resolve(binaryPath),
        args: [],
        env: {
          RUST_LOG: 'info',
          DB_PATH: path.resolve(dbPath),
          CONFIG_PATH: path.resolve(configPath)
        },
        disabled: false,
        timeout: 60,
        alwaysAllow: [
          "handleUmbCommand",
          "updateMemoryBank",
          "storeMemory",
          "retrieveMemory",
          "optimizeMemory",
          "getContext"
        ]
      };
      
      // Write the updated Claude desktop config back to the file
      await writeFile(claudeDesktopConfigPath, JSON.stringify(claudeConfig, null, 2));
    }
  }
}