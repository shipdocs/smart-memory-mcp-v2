# Smart Memory MCP - Roo Mode Configuration Files

This directory contains configuration files for Roo-Code's different modes, specifically tailored for the Smart Memory MCP project. These files enhance Roo's capabilities with Smart Memory MCP-specific knowledge and behaviors.

## Installation

### Automatic Installation

The easiest way to install these configuration files is to use the provided script:

```bash
# From the root of your Smart Memory MCP project
node scripts/install-roo-modes.js
```

This script will copy all the necessary configuration files to the root of your project.

### Manual Installation

Alternatively, you can manually copy the files to the root of your project:

```bash
# From the root of your Smart Memory MCP project
cp config/roo-modes/.clinerules-* .
cp config/roo-modes/.roomodes .
```

## Configuration Files

### .roomodes

This file defines custom modes for the Smart Memory MCP project. It currently includes a Test mode specifically designed for the Smart Memory MCP system.

### .clinerules-* Files

These files provide mode-specific configurations:

- `.clinerules-code`: Configuration for Code mode, focused on implementation tasks
- `.clinerules-architect`: Configuration for Architect mode, responsible for system design
- `.clinerules-ask`: Configuration for Ask mode, handling questions about the system
- `.clinerules-debug`: Configuration for Debug mode, specializing in diagnosing issues
- `.clinerules-test`: Configuration for Test mode, focused on test-driven development

## UMB Command Support

All modes include support for the UMB (Update Memory Bank) command, which allows you to store the current context in the memory bank. When you type "UMB" in the chat, Roo will:

1. Store the current context in multiple categories:
   - Context: The current session state and focus
   - Decision: Technical decisions and rationale
   - Progress: Work progress and tasks

2. Provide a confirmation message with details about what was stored

## Memory Bank Features

The configuration includes smart features for memory bank management:

- Auto-Summarization: Condense chat history into key points during UMB
- Priority Tagging: Add [HIGH], [MED], [LOW] to tasks/decisions
- Context Awareness: Suggest loading archived files when referenced
- Session-Based Daily Mode: Files use format [file]-YYYY-MM-DD.md

## Important Note

These configuration files must be placed in the root of your project to be effective. They enhance Roo's capabilities with Smart Memory MCP-specific knowledge and behaviors.