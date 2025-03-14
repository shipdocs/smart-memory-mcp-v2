# Smart Memory MCP Usage Guide

This guide explains how to use the Smart Memory MCP system with Roo-Code as a memory bank for persistent context across sessions.

## Overview

Smart Memory MCP provides intelligent memory management for AI assistants, with features like:

- Accurate token counting and optimization
- Context relevance scoring based on current mode
- Memory categorization by type (context, decision, progress, etc.)
- Date-based organization and filtering
- Automatic and manual update triggers

## Setup

### 1. Configure the MCP Server

Add the Smart Memory MCP server to your Roo-Code MCP settings file:

```json
{
  "mcpServers": {
    "smart-memory": {
      "command": "node",
      "args": ["/path/to/smart-memory-mcp/core/target/release/smart-memory-mcp-core"],
      "env": {
        "RUST_LOG": "info",
        "DB_PATH": "{workspace}/.smart-memory/memories.db",
        "CONFIG_PATH": "{workspace}/.smart-memory/config.json"
      },
      "disabled": false,
      "timeout": 60,
      "alwaysAllow": ["UMB"]
    }
  }
}
```

### 2. Create a Configuration File

Create a configuration file at `{workspace}/.smart-memory/config.json`:

```json
{
  "memory_bank": {
    "categories": {
      "context": { "max_tokens": 10000, "priority": "high" },
      "decision": { "max_tokens": 5000, "priority": "medium" },
      "progress": { "max_tokens": 8000, "priority": "high" },
      "product": { "max_tokens": 10000, "priority": "medium" },
      "pattern": { "max_tokens": 5000, "priority": "low" }
    },
    "update_triggers": {
      "auto_update": true,
      "umb_command": true
    },
    "token_budget": {
      "total": 50000,
      "per_category": true
    },
    "relevance": {
      "threshold": 0.7,
      "boost_recent": true
    }
  }
}
```

## Using Memory Bank Features

### Storing Memories

Memories are automatically stored when you use the UMB (Update Memory Bank) command or when significant changes occur (if auto_update is enabled).

To manually store a memory:

```
UMB
```

This will analyze the current session and store relevant information in the appropriate categories.

For more details on the UMB command, see [UMB Command Documentation](./umb-command.md).

### Retrieving Context

Context is automatically retrieved based on the current mode and relevance to your task. The system will:

1. Score memories for relevance to the current mode
2. Optimize context based on token budget and relevance threshold
3. Provide the most relevant context for your current task

### Memory Categories

Smart Memory MCP organizes memories into categories:

| Category | Description | Default Max Tokens | Priority |
|----------|-------------|-------------------|----------|
| context | Current session state and focus | 10000 | high |
| decision | Technical decisions and rationale | 5000 | medium |
| progress | Work progress and tasks | 8000 | high |
| product | Project overview and knowledge | 10000 | medium |
| pattern | System patterns and standards | 5000 | low |

### Date-Based Organization

Memories are automatically tagged with the current date, allowing for filtering by date. This helps maintain a chronological history of your project.

## Advanced Features

### Memory Optimization

Smart Memory MCP automatically optimizes memories to stay within token budgets. You can configure the optimization strategy in the config file:

- **balanced**: Default strategy that balances token reduction with context preservation
- **aggressive**: Maximizes token reduction at the cost of some context
- **conservative**: Minimizes context loss at the cost of higher token usage

### Relevance Scoring

Memories are scored for relevance based on:

- Similarity to the current mode
- Recency (if boost_recent is enabled)
- Content relevance to the current task

### Token Budget Management

Smart Memory MCP manages token budgets to ensure efficient use of context:

- **total**: Total token budget across all categories
- **per_category**: Whether to enforce token budgets per category

## VS Code Extension Features

The Smart Memory MCP VS Code extension provides:

- Memory Explorer view for browsing memories by category and date
- Memory Metrics dashboard for viewing token usage statistics
- UMB command in the command palette
- Status bar indicators for memory bank status

## Troubleshooting

If you encounter issues with the memory bank:

1. Check the logs for error messages
2. Verify that the DB_PATH and CONFIG_PATH environment variables are set correctly
3. Ensure the configuration file is valid JSON
4. Try restarting the MCP server

## Example Workflow

1. Start a new project and initialize the memory bank
2. Work on the project, making changes and decisions
3. Use UMB to update the memory bank with your progress
4. Switch modes as needed (e.g., from architect to code)
5. The memory bank will automatically provide relevant context based on your current mode
6. Continue working with persistent context across sessions
