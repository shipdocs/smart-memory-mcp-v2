# Roo Mode Configuration for Smart Memory MCP

This document explains how to use the Roo mode configuration files included with the Smart Memory MCP project. These configuration files enhance Roo's capabilities with Smart Memory MCP-specific knowledge and behaviors.

## Overview

The Smart Memory MCP project includes custom configuration files for Roo-Code that provide:

1. **UMB Command Integration**: Seamless integration with the Smart Memory MCP server for storing context
2. **Mode-Specific Behaviors**: Tailored behaviors for each mode (Code, Architect, Ask, Debug, Test)
3. **Memory Bank Management**: Smart features for managing memory bank files
4. **Project-Specific Knowledge**: Built-in understanding of Smart Memory MCP concepts

## Installation

### Automatic Installation

The easiest way to install the Roo mode configuration files is to use the provided script:

```bash
# From the root of your Smart Memory MCP project
node scripts/install-roo-modes.js
```

This script will copy all the necessary configuration files to the root of your project.

### Manual Installation

Alternatively, you can manually copy the files from the `config/roo-modes` directory to the root of your project:

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

## UMB Command Usage

The UMB (Update Memory Bank) command is a powerful feature that allows you to store the current context in the memory bank. To use it:

1. Type "UMB" in the chat with Roo-Code
2. Roo-Code will recognize the command and forward it to the Smart Memory MCP server
3. The Smart Memory MCP server will store the current context in multiple categories:
   - Context: The current session state and focus
   - Decision: Technical decisions and rationale
   - Progress: Work progress and tasks
4. You'll receive a confirmation message with details about what was stored

## Memory Bank Features

The configuration includes smart features for memory bank management:

### Auto-Summarization
Condenses chat history into key points during UMB operations, making it easier to review later.

### Priority Tagging
Automatically adds [HIGH], [MED], [LOW] tags to tasks and decisions based on keywords in the conversation.

### Context Awareness
Suggests loading archived files when they're referenced in the conversation.

### Session-Based Daily Mode
Files use format [file]-YYYY-MM-DD.md based on session start date, making it easy to track progress over time.

## Mode-Specific Behaviors

Each mode has specific behaviors tailored to the Smart Memory MCP project:

### Code Mode
- Implements Smart Memory MCP features
- Maintains code documentation
- Updates Memory Bank during coding sessions
- Implements architectural decisions

### Architect Mode
- Designs Smart Memory MCP system architecture
- Documents interfaces and component structures
- Maintains system diagrams
- Makes high-level design choices

### Ask Mode
- Answers questions about Smart Memory MCP
- Provides information about memory bank concepts
- Explains tokenization and context relevance
- Guides users to appropriate modes

### Debug Mode
- Diagnoses Smart Memory MCP issues
- Troubleshoots tokenization problems
- Resolves context relevance scoring issues
- Fixes UMB command failures

### Test Mode
- Writes tests for Smart Memory MCP features
- Validates memory storage and retrieval
- Tests tokenization accuracy
- Verifies UMB command functionality

## Important Note

These configuration files must be placed in the root of your project to be effective. They enhance Roo's capabilities with Smart Memory MCP-specific knowledge and behaviors.