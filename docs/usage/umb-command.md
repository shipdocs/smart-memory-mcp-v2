# UMB Command - Update Memory Bank

The UMB (Update Memory Bank) command is a powerful feature that allows you to store the current context of your conversation with Roo in the Smart Memory MCP system. This helps maintain context across sessions and provides a way to organize and retrieve important information.

## How It Works

When you type `UMB` or `Update Memory Bank` in the chat, Roo will:

1. Acknowledge the command with `[MEMORY BANK: UPDATING]`
2. Use the Smart Memory MCP server to store the current context
3. Organize the context into multiple categories:
   - **Context**: The current session state and focus
   - **Decision**: Technical decisions and rationale
   - **Progress**: Work progress and tasks

## Requirements

To use the UMB command, you need:

1. The Smart Memory MCP server running
2. The Smart Memory MCP extension installed in VS Code
3. The `.clinerules-*` files in your project that define the UMB command

## Status Indicators

Roo will always start its responses with one of these status indicators:

- `[MEMORY BANK: ACTIVE]`: The Smart Memory MCP server is running and ready to accept UMB commands
- `[MEMORY BANK: INACTIVE]`: The Smart Memory MCP server is not running

If the server is inactive, Roo will advise you to start it with the VS Code command:
```
Smart Memory: Start Server
```
Or by running the extension.

## Smart Features

The UMB command includes several smart features:

- **Auto-Summarization**: Condenses chat history into 3-5 key points
- **Priority Tagging**: Adds [HIGH], [MED], [LOW] to tasks/decisions based on keywords
- **Context Awareness**: Suggests loading archived contexts if referenced

## Token Usage Tracking

The UMB command can also track token usage in the following format:

```
## Token Usage - YYYY-MM-DD

### Token Usage
- Initial interactions: ~X tokens
- Code implementation: ~Y tokens
- Documentation updates: ~Z tokens
- Total tokens used: ~(X+Y+Z) tokens

### Financial Costs
- Estimated cost: $C (T tokens at $0.20 per 1K tokens)

### Return on Investment
- Development time saved: ~H hours
- Developer hourly rate: $R/hour
- Value of time saved: $V
- Net value: $N ($V - $C)
```

## Installation

When you install the Smart Memory MCP extension, it will automatically:

1. Configure the MCP settings for VS Code
2. Install the necessary `.clinerules-*` files in your project
3. Set up the Smart Memory MCP server

## Keyboard Shortcut

The UMB command is also registered in VS Code as `smartMemory.updateMemoryBank` with the keyboard shortcut:
- **Windows/Linux**: Ctrl+Shift+U
- **Mac**: Cmd+Shift+U