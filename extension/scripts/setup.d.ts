/**
 * Type definitions for setup.js
 */

/**
 * Main setup function that handles the entire setup process
 * @returns Promise that resolves to true if setup was successful, false otherwise
 */
export function setup(): Promise<boolean>;

/**
 * Check if Rust is installed
 * @returns true if Rust is installed, false otherwise
 */
export function hasRust(): boolean;

/**
 * Install Rust if not already installed
 * @returns Promise that resolves when installation is complete
 */
export function installRust(): Promise<void>;

/**
 * Clone the core repository
 * @returns Promise that resolves when cloning is complete
 */
export function cloneCore(): Promise<void>;

/**
 * Build the core components
 * @returns Promise that resolves when build is complete
 */
export function buildCore(): Promise<void>;

/**
 * Setup configuration files
 * @returns Promise that resolves when configuration is complete
 */
export function setupConfig(): Promise<void>;