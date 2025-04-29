# Smart Memory MCP

A Model Context Protocol (MCP) server for Smart Memory integration with VS Code.

## Features

- Parent process monitoring to automatically shut down when VS Code closes
- Memory bank storage and retrieval
- Context-aware memory optimization
- VS Code extension integration
- Automatic backups and crash recovery

## Getting Started

### Prerequisites

- Rust (latest stable version)
- Node.js (v18 or later)
- VS Code

### Installation

1. Clone the repository
2. Build the core server
3. Install the VS Code extension

See the [installation guide](docs/installation-guide.md) for detailed instructions.

## GitHub Actions

This project uses GitHub Actions for continuous integration, security scanning, and automated dependency updates:

### Available Workflows

1. **CI Pipeline** (`ci.yml`):
   - Builds and tests the project on multiple platforms
   - Creates releases when you tag a version
   - Publishes to VS Code Marketplace on release
   - Triggers: Push to main, Pull Requests, Tags

2. **Security Scanning** (`security.yml`):
   - Runs CodeQL analysis for JavaScript, TypeScript, and Rust
   - Performs dependency vulnerability scanning
   - Triggers: Push to main, Pull Requests, Weekly on Sunday

3. **Dependency Updates** (`dependencies.yml`):
   - Automatically updates project dependencies
   - Creates pull requests with updates
   - Triggers: Weekly on Monday, Manual trigger

### Enabling Workflows

1. **Enable GitHub Actions**:
   - Go to your repository on GitHub
   - Navigate to "Settings" > "Actions" > "General"
   - Ensure "Allow all actions and reusable workflows" is selected
   - Click "Save"

2. **Set up required secrets**:
   - Go to "Settings" > "Secrets and variables" > "Actions"
   - Add the following secrets:
     - `VSCE_PAT`: A Personal Access Token for publishing to VS Code Marketplace
       - Create at: https://dev.azure.com/
       - Required scopes: Marketplace (Manage)

### Creating a Release

To create a new release:

```bash
# Tag a new version
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The CI workflow will automatically:
- Create a GitHub release
- Build and attach binaries
- Publish to VS Code Marketplace

## Development

See the [development guide](docs/development-guide.md) for information on:
- Project structure
- Development workflow
- Testing
- Contributing

## Building the Extension

See the [building VSIX guide](docs/building-vsix.md) for detailed instructions on:
- Building the extension locally
- Cross-platform building
- Installing the built extension

## Deployment

See the [deployment guide](docs/deployment-guide.md) for information on:
- Release process
- VS Code Marketplace publishing
- GitHub release creation

## License

This project is licensed under the MIT License - see the [LICENSE](license.md) file for details.
