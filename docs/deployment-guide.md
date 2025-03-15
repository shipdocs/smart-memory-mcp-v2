# Smart Memory MCP Deployment Guide

This guide provides instructions for deploying the Smart Memory MCP project using GitHub Actions for continuous integration and deployment (CI/CD).

## Table of Contents

1. [Overview](#overview)
2. [GitHub Repository Setup](#github-repository-setup)
3. [GitHub Actions Workflow](#github-actions-workflow)
4. [Release Process](#release-process)
5. [VS Code Marketplace Publishing](#vs-code-marketplace-publishing)
6. [Manual Deployment](#manual-deployment)
7. [Troubleshooting](#troubleshooting)

## Overview

The Smart Memory MCP project uses GitHub Actions for automated building, testing, and deployment. The CI/CD pipeline:

1. Builds and tests the Rust core on multiple platforms (Windows, macOS, Linux)
2. Builds and tests the VS Code extension
3. Packages the extension with platform-specific binaries
4. Creates GitHub releases for tagged versions
5. Publishes the extension to the VS Code Marketplace (for tagged releases)

## GitHub Repository Setup

### 1. Create a GitHub Repository

If you haven't already, create a GitHub repository for your project:

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top-right corner and select "New repository"
3. Name your repository (e.g., "smart-memory-mcp")
4. Choose visibility (public or private)
5. Click "Create repository"

### 2. Push Your Code to GitHub

Initialize your local repository and push it to GitHub:

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit"

# Add GitHub remote
git remote add origin https://github.com/yourusername/smart-memory-mcp.git

# Push to GitHub
git push -u origin main
```

### 3. Set Up Required Secrets

For publishing to the VS Code Marketplace, you need to add a Personal Access Token (PAT) as a secret:

1. Generate a VS Code Marketplace PAT:
   - Go to [Azure DevOps](https://dev.azure.com)
   - Click on your profile icon in the top-right corner
   - Select "Personal access tokens"
   - Click "New Token"
   - Name it (e.g., "VSCE Publishing")
   - Set Organization to "All accessible organizations"
   - Set Expiration as needed
   - Under Scopes, select "Marketplace" and check "Manage"
   - Click "Create"
   - Copy the generated token

2. Add the PAT as a GitHub secret:
   - Go to your GitHub repository
   - Click "Settings" > "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - Name: `VSCE_PAT`
   - Value: Paste the token you copied
   - Click "Add secret"

## GitHub Actions Workflow

The CI/CD workflow is defined in `.github/workflows/ci-cd.yml`. This workflow:

- Triggers on pushes to main and develop branches, pull requests, and tags starting with "v"
- Builds and tests the project on Windows, macOS, and Linux
- Creates artifacts for each platform
- Creates a GitHub release for tagged versions
- Publishes the extension to the VS Code Marketplace for tagged versions

### Workflow Structure

The workflow consists of three main jobs:

1. **build**: Builds and tests the project on all platforms
2. **release**: Creates a GitHub release for tagged versions
3. **publish**: Publishes the extension to the VS Code Marketplace

## Release Process

To create a new release:

1. Update the version in:
   - `core/Cargo.toml`
   - `extension/package.json`

2. Commit the version changes:
   ```bash
   git add core/Cargo.toml extension/package.json
   git commit -m "Bump version to x.y.z"
   ```

3. Create and push a tag:
   ```bash
   git tag v1.0.0  # Replace with your version
   git push origin v1.0.0
   ```

4. The GitHub Actions workflow will automatically:
   - Build and test the project
   - Create a GitHub release
   - Upload the binaries and extension as assets
   - Publish the extension to the VS Code Marketplace

### Release Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):

- MAJOR: Incompatible API changes
- MINOR: New functionality in a backward-compatible manner
- PATCH: Backward-compatible bug fixes

For pre-releases, use suffixes like `-alpha.1`, `-beta.1`, `-rc.1`.

## VS Code Marketplace Publishing

The extension is automatically published to the VS Code Marketplace when you push a tag. To manually publish:

1. Install vsce:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   cd extension
   vsce package
   ```

3. Publish the extension:
   ```bash
   vsce publish -p <your-pat>
   ```

## Manual Deployment

If you need to deploy manually:

### Building the Core

1. Build the Rust core:
   ```bash
   cd core
   cargo build --release
   ```

2. The binary will be in `core/target/release/`

### Building the Extension

1. Build the extension:
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. Package the extension:
   ```bash
   npm run package
   ```

3. The VSIX file will be in the `extension` directory

### Installing Manually

1. Install the extension in VS Code:
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X)
   - Click "..." > "Install from VSIX..."
   - Select the VSIX file

2. Copy the core binary to the extension's bin directory:
   - Windows: `extension/bin/windows/`
   - macOS: `extension/bin/macos/`
   - Linux: `extension/bin/linux/`

## Troubleshooting

### GitHub Actions Failures

If the GitHub Actions workflow fails:

1. Check the workflow run logs:
   - Go to the "Actions" tab in your repository
   - Click on the failed workflow run
   - Examine the logs for errors

2. Common issues:
   - **Build failures**: Check for compilation errors
   - **Test failures**: Fix failing tests
   - **Missing secrets**: Ensure all required secrets are set
   - **Permission issues**: Check GitHub token permissions

### Manual Build Issues

If you encounter issues building manually:

1. **Rust build failures**:
   - Ensure Rust is installed: `rustc --version`
   - Update Rust: `rustup update`
   - Check for missing dependencies

2. **Extension build failures**:
   - Ensure Node.js is installed: `node --version`
   - Update npm: `npm install -g npm`
   - Clear npm cache: `npm cache clean --force`

### Publishing Issues

If publishing to the VS Code Marketplace fails:

1. **Authentication issues**:
   - Ensure your PAT is valid and has the correct permissions
   - Generate a new PAT if necessary

2. **Version conflicts**:
   - Ensure the version in `package.json` is unique
   - Check if the version already exists in the marketplace