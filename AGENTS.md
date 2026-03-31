<!-- Product -->

# Claude Code Product Overview

Claude Code is Anthropic's CLI tool for AI-assisted software engineering. It enables developers to interact with Claude directly from the terminal to perform complex coding tasks including file editing, command execution, codebase search, and workflow coordination.

## Core Capabilities

- **File Operations**: Read, write, and edit files with intelligent context awareness
- **Command Execution**: Run shell commands with safety checks and permission controls
- **Code Search**: Advanced search capabilities using ripgrep and glob patterns
- **Web Integration**: Fetch web content and perform searches for research
- **Agent Coordination**: Spawn sub-agents and coordinate multi-agent workflows
- **Skill System**: Reusable workflows and custom skill execution
- **MCP Integration**: Model Context Protocol server connections for extended functionality
- **LSP Support**: Language Server Protocol integration for code intelligence
- **Task Management**: Create, track, and execute development tasks
- **Team Collaboration**: Multi-agent team coordination and messaging

## Architecture Philosophy

- **Tool-based**: Every capability is implemented as a self-contained tool with defined schemas and permissions
- **Permission-aware**: Comprehensive permission system with user approval flows
- **Extensible**: Plugin system and MCP server support for third-party integrations
- **Safety-first**: Multiple layers of validation and user control over AI actions
- **Performance-optimized**: Lazy loading, parallel prefetch, and efficient bundling

<!-- Structure  -->

# Project Structure & Organization

## Root Structure

```
src/
├── main.tsx                 # CLI entrypoint with Commander.js setup
├── commands.ts              # Command registry and loading logic
├── tools.ts                 # Tool registry and permission filtering
├── Tool.ts                  # Base tool type definitions (~29K lines)
├── QueryEngine.ts           # Core LLM interaction engine (~46K lines)
├── context.ts               # System/user context collection
├── cost-tracker.ts          # Token usage and cost tracking
└── [feature directories]/   # Organized by functional domain
```

## Core Directories

### `/commands/` - User-facing slash commands (~50 commands)

Each command is a self-contained module with:

- `index.ts` - Command registration and exports
- `[command].tsx` - Implementation with React/Ink UI
- `validation.ts` - Input validation (where applicable)

Examples: `/commit`, `/review`, `/mcp`, `/config`, `/doctor`

### `/tools/` - AI agent tools (~40 tools)

Each tool follows a consistent structure:

- Tool class extending base Tool interface
- Input schema definition (Zod)
- Permission requirements
- Execution logic with progress tracking

Key tools: `BashTool`, `FileReadTool`, `FileWriteTool`, `FileEditTool`, `GrepTool`, `WebSearchTool`, `AgentTool`

### `/components/` - React/Ink UI components (~140 components)

Reusable terminal UI components organized by function:

- Form components (inputs, selectors, confirmations)
- Display components (tables, progress bars, syntax highlighting)
- Layout components (containers, modals, panels)

### `/services/` - External integrations and core services

- `api/` - Anthropic API client and file operations
- `mcp/` - Model Context Protocol server management
- `lsp/` - Language Server Protocol integration
- `oauth/` - Authentication flows
- `analytics/` - Feature flags and telemetry
- `plugins/` - Plugin system loader

### `/bridge/` - IDE integration layer

Bidirectional communication between CLI and IDE extensions:

- `bridgeMain.ts` - Main bridge orchestration
- `bridgeMessaging.ts` - Message protocol implementation
- `replBridge.ts` - REPL session management
- `sessionRunner.ts` - Session execution coordination

## Specialized Directories

### `/coordinator/` - Multi-agent orchestration

Manages agent swarms and team coordination workflows.

### `/skills/` - Reusable workflow system

- `bundledSkills.ts` - Built-in skills registration
- Individual skill implementations
- Skill loading and execution logic

### `/plugins/` - Plugin architecture

Third-party and built-in plugin loading system.

### `/hooks/` - React hooks and permission system

- `toolPermission/` - Tool execution permission checks
- UI state management hooks
- Context providers

### `/utils/` - Shared utilities

- `permissions/` - File system and security utilities
- `settings/` - Configuration management
- `debug.ts` - Logging and debugging helpers
- `bundledMode.ts` - Runtime detection utilities

### `/types/` - TypeScript type definitions

Shared type definitions across the application.

### `/screens/` - Full-screen UI modes

- Doctor diagnostics screen
- REPL interactive mode
- Session resume interface

## File Naming Conventions

### Tools

- PascalCase with "Tool" suffix: `FileReadTool/`, `BashTool/`
- Each tool directory contains `index.ts` and implementation files

### Commands

- kebab-case directory names: `add-dir/`, `autofix-pr/`
- Contains `index.ts` for registration and main implementation file

### Components

- PascalCase React component names: `AgentProgressLine.tsx`
- Organized by functional grouping in subdirectories

### Services

- camelCase for service modules: `tokenEstimation.ts`
- Directory structure for complex services: `mcp/`, `analytics/`

## Import Patterns

### Lazy Loading

```typescript
// Heavy modules loaded on-demand
const analytics = await import("./services/analytics");
```

### Feature Flags

```typescript
import { feature } from "bun:bundle";
// Conditional imports based on build flags
```

### Relative Imports

```typescript
// Consistent use of .js extensions for Bun compatibility
import { Tool } from "../Tool.js";
import type { Command } from "../types/command.js";
```

## Configuration Files

- `.kiro/` - User configuration directory
- Settings managed through Zod schemas in `/schemas/`
- Migration system in `/migrations/` for config updates

## Key Architectural Principles

1. **Modular Design**: Each feature is self-contained with clear boundaries
2. **Type Safety**: Extensive use of TypeScript and Zod for runtime validation
3. **Performance**: Lazy loading and parallel prefetch for fast startup
4. **Extensibility**: Plugin system and MCP integration points
5. **Security**: Permission system with user approval flows
6. **Testability**: Clear separation of concerns and dependency injection

<!-- Tech -->

# Technology Stack & Build System

## Runtime & Language

- **Runtime**: Bun (JavaScript runtime optimized for speed)
- **Language**: TypeScript with strict mode enabled
- **Node Version**: Uses Bun's Node.js compatibility layer

## Core Technologies

- **Terminal UI**: React + Ink for terminal-based user interfaces
- **CLI Framework**: Commander.js with extra-typings for command parsing
- **Schema Validation**: Zod v4 for runtime type validation
- **Code Search**: ripgrep for fast text search across codebases
- **Protocols**:
  - Model Context Protocol (MCP) SDK for server integrations
  - Language Server Protocol (LSP) for code intelligence
- **API Client**: Anthropic SDK for Claude API interactions
- **Authentication**: OAuth 2.0, JWT tokens, macOS Keychain integration

## Development Tools

- **Telemetry**: OpenTelemetry with gRPC transport
- **Feature Flags**: GrowthBook for A/B testing and feature rollouts
- **Analytics**: Built-in analytics service with privacy controls
- **Bundling**: Bun's native bundler with feature flag dead code elimination

## Architecture Patterns

### Lazy Loading

Heavy modules are dynamically imported only when needed:

```typescript
// Deferred imports for performance
const analytics = await import("./services/analytics");
const telemetry = await import("./telemetry/opentelemetry");
```

### Feature Flags

Dead code elimination via Bun's bundle feature flags:

```typescript
import { feature } from "bun:bundle";

const voiceCommand = feature("VOICE_MODE")
  ? require("./commands/voice/index.js").default
  : null;
```

### Parallel Prefetch

Startup optimization through parallel initialization:

```typescript
// Fired as side-effects before heavy imports
startMdmRawRead();
startKeychainPrefetch();
```

## Common Commands

Since this is a source code snapshot without build configuration files, the following are inferred from the codebase structure:

### Development

```bash
# Run with Bun
bun run src/main.tsx

# Development mode (likely)
bun run dev

# Type checking
bun run typecheck
```

### Building

```bash
# Compile standalone executable
bun build src/main.tsx --compile --outfile=claude-code

# Bundle for distribution
bun build --target=bun
```

### Testing

```bash
# Run tests (inferred)
bun test

# Run specific test suites
bun test src/tools/
bun test src/services/
```

## Key Dependencies

- `@anthropic-ai/sdk` - Claude API client
- `commander` - CLI argument parsing
- `react` + `ink` - Terminal UI framework
- `zod` - Schema validation
- `@opentelemetry/*` - Observability
- Various Node.js built-ins for file system, crypto, etc.

## Build Artifacts

- Standalone executable via `bun build --compile`
- Bundled JavaScript for npm distribution
- Source maps (which led to this code exposure)
- Embedded skill files in compiled binaries
