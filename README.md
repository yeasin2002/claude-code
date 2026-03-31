# Claude Code Source Snapshot for Security Research

> This repository mirrors a **publicly exposed Claude Code source snapshot** that became accessible on **March 31, 2026** through a source map exposure in the npm distribution. It is maintained for **educational, defensive security research, and software supply-chain analysis**.

---

## Research Context

This repository is maintained by a **university student** studying:

- software supply-chain exposure and build artifact leaks
- secure software engineering practices
- agentic developer tooling architecture
- defensive analysis of real-world CLI systems

This archive is intended to support:

- educational study
- security research practice
- architecture review
- discussion of packaging and release-process failures

It does **not** claim ownership of the original code, and it should not be interpreted as an official Anthropic repository.

---

## How the Public Snapshot Became Accessible

[Chaofan Shou (@Fried_rice)](https://x.com/Fried_rice) publicly noted that Claude Code source material was reachable through a `.map` file exposed in the npm package:

> **"Claude code source code has been leaked via a map file in their npm registry!"**
>
> — [@Fried_rice, March 31, 2026](https://x.com/Fried_rice/status/2038894956459290963)

The published source map referenced unobfuscated TypeScript sources hosted in Anthropic's R2 storage bucket, which made the `src/` snapshot publicly downloadable.

---

## Repository Scope

Claude Code is Anthropic's advanced CLI tool for AI-assisted software engineering. It enables developers to interact with Claude directly from the terminal to perform complex coding tasks including intelligent file operations, command execution with safety controls, advanced codebase search, web research integration, and sophisticated multi-agent workflow coordination.

### Key Capabilities
- **Intelligent File Operations**: Context-aware reading, writing, and editing of files with support for multiple formats
- **Safe Command Execution**: Shell command execution with comprehensive permission controls and user approval flows
- **Advanced Code Search**: Powered by ripgrep with glob pattern matching and semantic search capabilities
- **Web Integration**: Fetch web content and perform searches for development research
- **Multi-Agent Coordination**: Spawn and coordinate sub-agents for complex, parallel workflows
- **Extensible Architecture**: Plugin system and MCP (Model Context Protocol) server integration
- **IDE Integration**: Bidirectional bridge system connecting with VS Code, JetBrains, and other IDEs
- **Task Management**: Create, track, and execute development tasks with team collaboration features

This repository contains a mirrored `src/` snapshot for research and analysis.

- **Public exposure identified on**: 2026-03-31
- **Language**: TypeScript (strict mode)
- **Runtime**: Bun with Node.js compatibility
- **Terminal UI**: React + [Ink](https://github.com/vadimdemedes/ink)
- **Scale**: ~1,900 files, 512,000+ lines of code
- **Architecture**: Tool-based system with ~40 agent tools and ~50 user commands

---

## Directory Structure

```text
src/
├── main.tsx                 # Entrypoint orchestration (Commander.js-based CLI path)
├── commands.ts              # Command registry
├── tools.ts                 # Tool registry
├── Tool.ts                  # Tool type definitions
├── QueryEngine.ts           # LLM query engine
├── context.ts               # System/user context collection
├── cost-tracker.ts          # Token cost tracking
│
├── commands/                # Slash command implementations (~50)
├── tools/                   # Agent tool implementations (~40)
├── components/              # Ink UI components (~140)
├── hooks/                   # React hooks
├── services/                # External service integrations
├── screens/                 # Full-screen UIs (Doctor, REPL, Resume)
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│
├── bridge/                  # IDE and remote-control bridge
├── coordinator/             # Multi-agent coordinator
├── plugins/                 # Plugin system
├── skills/                  # Skill system
├── keybindings/             # Keybinding configuration
├── vim/                     # Vim mode
├── voice/                   # Voice input
├── remote/                  # Remote sessions
├── server/                  # Server mode
├── memdir/                  # Persistent memory directory
├── tasks/                   # Task management
├── state/                   # State management
├── migrations/              # Config migrations
├── schemas/                 # Config schemas (Zod)
├── entrypoints/             # Initialization logic
├── ink/                     # Ink renderer wrapper
├── buddy/                   # Companion sprite
├── native-ts/               # Native TypeScript utilities
├── outputStyles/            # Output styling
├── query/                   # Query pipeline
└── upstreamproxy/           # Proxy configuration
```

---

## Architecture Summary

Claude Code follows a sophisticated tool-based architecture where every capability is implemented as a self-contained, permission-aware tool. The system emphasizes safety, extensibility, and performance through multiple architectural layers.

### Core Architectural Principles

1. **Tool-Based Design**: Every AI capability is implemented as a discrete tool with defined schemas, permissions, and execution logic
2. **Permission-First Security**: Comprehensive permission system with user approval flows and configurable automation levels
3. **Modular Extensibility**: Plugin system and MCP server support for third-party integrations
4. **Performance Optimization**: Lazy loading, parallel prefetch, and feature flag dead code elimination
5. **Type Safety**: Extensive use of TypeScript strict mode and Zod runtime validation
6. **Multi-Agent Coordination**: Built-in support for agent swarms and team-based workflows

### 1. Tool System (`src/tools/`)

Every tool Claude Code can invoke is implemented as a self-contained module with consistent structure:
- Input schema definition using Zod
- Permission requirements and approval flows  
- Progress tracking and error handling
- Execution logic with safety controls

| Tool | Description |
|---|---|
| `BashTool` | Shell command execution |
| `FileReadTool` | File reading (images, PDFs, notebooks) |
| `FileWriteTool` | File creation / overwrite |
| `FileEditTool` | Partial file modification (string replacement) |
| `GlobTool` | File pattern matching search |
| `GrepTool` | ripgrep-based content search |
| `WebFetchTool` | Fetch URL content |
| `WebSearchTool` | Web search |
| `AgentTool` | Sub-agent spawning |
| `SkillTool` | Skill execution |
| `MCPTool` | MCP server tool invocation |
| `LSPTool` | Language Server Protocol integration |
| `NotebookEditTool` | Jupyter notebook editing |
| `TaskCreateTool` / `TaskUpdateTool` | Task creation and management |
| `SendMessageTool` | Inter-agent messaging |
| `TeamCreateTool` / `TeamDeleteTool` | Team agent management |
| `EnterPlanModeTool` / `ExitPlanModeTool` | Plan mode toggle |
| `EnterWorktreeTool` / `ExitWorktreeTool` | Git worktree isolation |
| `ToolSearchTool` | Deferred tool discovery |
| `CronCreateTool` | Scheduled trigger creation |
| `RemoteTriggerTool` | Remote trigger |
| `SleepTool` | Proactive mode wait |
| `SyntheticOutputTool` | Structured output generation |

### 2. Command System (`src/commands/`)

User-facing slash commands invoked with `/` prefix. Each command is a self-contained module following consistent patterns:
- `index.ts` for command registration and exports
- Main implementation with React/Ink terminal UI
- Input validation using Zod schemas where applicable
- Integration with the permission system

| Command | Description |
|---|---|
| `/commit` | Create a git commit |
| `/review` | Code review |
| `/compact` | Context compression |
| `/mcp` | MCP server management |
| `/config` | Settings management |
| `/doctor` | Environment diagnostics |
| `/login` / `/logout` | Authentication |
| `/memory` | Persistent memory management |
| `/skills` | Skill management |
| `/tasks` | Task management |
| `/vim` | Vim mode toggle |
| `/diff` | View changes |
| `/cost` | Check usage cost |
| `/theme` | Change theme |
| `/context` | Context visualization |
| `/pr_comments` | View PR comments |
| `/resume` | Restore previous session |
| `/share` | Share session |
| `/desktop` | Desktop app handoff |
| `/mobile` | Mobile app handoff |

### 3. Service Layer (`src/services/`)

External integrations and core services providing foundational capabilities:

| Service | Description |
|---|---|
| `api/` | Anthropic API client, file API, bootstrap |
| `mcp/` | Model Context Protocol server connection and management |
| `oauth/` | OAuth 2.0 authentication flow |
| `lsp/` | Language Server Protocol manager |
| `analytics/` | GrowthBook-based feature flags and analytics |
| `plugins/` | Plugin loader |
| `compact/` | Conversation context compression |
| `policyLimits/` | Organization policy limits |
| `remoteManagedSettings/` | Remote managed settings |
| `extractMemories/` | Automatic memory extraction |
| `tokenEstimation.ts` | Token count estimation |
| `teamMemorySync/` | Team memory synchronization |

### 4. Bridge System (`src/bridge/`)

A sophisticated bidirectional communication layer that enables seamless integration between IDE extensions (VS Code, JetBrains) and the Claude Code CLI. This system allows for remote control and coordination of AI operations across different development environments.

**Key Components:**
- `bridgeMain.ts` — Main bridge orchestration and lifecycle management
- `bridgeMessaging.ts` — Message protocol implementation with JWT authentication
- `bridgePermissionCallbacks.ts` — Permission delegation and approval flows
- `replBridge.ts` — REPL session management and state synchronization
- `sessionRunner.ts` — Session execution coordination and error handling
- `jwtUtils.ts` — JWT-based authentication and token management

### 5. Permission System (`src/hooks/toolPermission/`)

A comprehensive security framework that governs all tool invocations with multiple permission modes and user control mechanisms:

- **Permission Modes**: `default`, `plan`, `bypassPermissions`, `auto`, and custom configurations
- **User Approval Flows**: Interactive prompts with approve/deny/always allow options
- **Tool-Specific Permissions**: Granular control over individual tool capabilities
- **Context-Aware Security**: Permission decisions based on operation context and risk assessment
- **Audit Trail**: Complete logging of permission decisions and user interactions

### 6. Feature Flag System

Advanced build-time optimization using Bun's `bun:bundle` feature flags for dead code elimination and conditional feature loading:

```typescript
import { feature } from 'bun:bundle'

// Inactive code is completely stripped at build time
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

**Active Feature Flags:**
- `PROACTIVE` - Proactive agent behavior and suggestions
- `KAIROS` - Advanced timing and scheduling features  
- `BRIDGE_MODE` - IDE integration capabilities
- `DAEMON` - Background daemon mode operation
- `VOICE_MODE` - Voice input and interaction
- `AGENT_TRIGGERS` - Automated agent trigger system
- `MONITOR_TOOL` - System monitoring and diagnostics

This system enables:
- **Reduced Bundle Size**: Unused features are completely eliminated
- **Environment-Specific Builds**: Different feature sets for different deployment targets
- **A/B Testing**: Gradual feature rollouts with GrowthBook integration
- **Performance Optimization**: Only load code for enabled features

---

## Key Files in Detail

### `QueryEngine.ts` (~46K lines)
The heart of Claude Code's AI interaction system. This massive file handles:
- **Streaming API Calls**: Real-time response processing with the Anthropic API
- **Tool-Call Loops**: Orchestrating complex multi-tool workflows
- **Thinking Mode**: Internal reasoning and planning capabilities
- **Retry Logic**: Robust error handling and recovery mechanisms
- **Token Management**: Usage tracking, cost calculation, and optimization
- **Context Management**: Intelligent context window management and compression

### `Tool.ts` (~29K lines)
Comprehensive type system and base interfaces for all tools:
- **Input Schema Definitions**: Zod-based validation for all tool inputs
- **Permission Models**: Granular permission requirements and approval flows
- **Progress State Types**: Standardized progress tracking across all tools
- **Error Handling**: Consistent error types and recovery patterns
- **Tool Metadata**: Documentation, usage hints, and capability descriptions

### `commands.ts` (~25K lines)
Central command registry and execution system:
- **Dynamic Command Loading**: Conditional imports based on environment and features
- **Command Discovery**: Automatic registration of slash commands and skills
- **Permission Integration**: Command-level permission checks and user approval
- **Environment Filtering**: Different command sets for different execution contexts
- **Alias Management**: Command aliases and shortcut handling

### `main.tsx` (~4.5K lines)
Application bootstrap and CLI orchestration:
- **Commander.js Integration**: Argument parsing and command routing
- **React/Ink Initialization**: Terminal UI setup and rendering
- **Parallel Startup Optimization**: MDM settings, keychain prefetch, and API preconnect
- **Feature Flag Resolution**: Build-time and runtime feature detection
- **Error Boundary Setup**: Top-level error handling and recovery

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict) |
| Terminal UI | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| CLI Parsing | [Commander.js](https://github.com/tj/commander.js) (extra-typings) |
| Schema Validation | [Zod v4](https://zod.dev) |
| Code Search | [ripgrep](https://github.com/BurntSushi/ripgrep) |
| Protocols | [MCP SDK](https://modelcontextprotocol.io), LSP |
| API | [Anthropic SDK](https://docs.anthropic.com) |
| Telemetry | OpenTelemetry + gRPC |
| Feature Flags | GrowthBook |
| Auth | OAuth 2.0, JWT, macOS Keychain |

---

## Notable Design Patterns

### Parallel Prefetch Architecture
Startup time is aggressively optimized through parallel initialization of critical systems:

```typescript
// main.tsx — fired as side-effects before other imports
startMdmRawRead()        // Mobile Device Management settings
startKeychainPrefetch()  // macOS Keychain authentication data
startApiPreconnect()     // Anthropic API connection warming
```

This pattern reduces cold start time by overlapping I/O operations with module loading.

### Lazy Loading with Dynamic Imports
Heavy modules are deferred until actually needed, reducing memory footprint and startup time:

```typescript
// Deferred imports for performance-critical paths
const analytics = await import('./services/analytics')
const telemetry = await import('./telemetry/opentelemetry')
const gRPC = await import('./services/grpc')
```

### Multi-Agent Coordination (Agent Swarms)
Sophisticated agent orchestration system enabling parallel and coordinated AI workflows:

- **Sub-Agent Spawning**: Via `AgentTool` with isolated contexts and tool access
- **Team Coordination**: `TeamCreateTool` and `TeamDeleteTool` for managing agent teams
- **Message Passing**: `SendMessageTool` for inter-agent communication
- **Workflow Orchestration**: `coordinator/` module handles complex multi-agent scenarios

### Skill System Architecture
Reusable workflow patterns implemented as skills:

- **Bundled Skills**: Compiled into the binary via `bundledSkills.ts`
- **User Skills**: Loaded from filesystem with hot-reloading support
- **Skill Discovery**: Automatic registration and availability checking
- **Context Isolation**: Skills run in isolated contexts with controlled tool access

### Plugin Architecture
Extensible system for third-party integrations:

- **Plugin Discovery**: Automatic loading from configured directories
- **API Surface**: Well-defined plugin interfaces and lifecycle hooks
- **Sandboxing**: Controlled execution environment for third-party code
- **Hot Reloading**: Development-time plugin reloading without restart

## Development and Build Information

### Build System
Claude Code uses Bun's advanced build system with several sophisticated features:

```bash
# Development - Run directly with Bun
bun run src/main.tsx

# Production Build - Compile to standalone executable
bun build src/main.tsx --compile --outfile=claude-code

# Feature-Specific Builds - With different flag combinations
bun build --define feature.VOICE_MODE=true --define feature.BRIDGE_MODE=false

# Bundle Analysis - Inspect bundle composition
bun build --analyze
```

### Testing Strategy
Comprehensive testing across multiple layers:

```bash
# Unit Tests - Individual tool and service testing
bun test src/tools/
bun test src/services/

# Integration Tests - Cross-system functionality
bun test src/integration/

# E2E Tests - Full workflow validation
bun test src/e2e/

# Performance Tests - Startup time and memory usage
bun test src/performance/
```

### Development Workflow
- **Hot Reloading**: Automatic restart on source changes during development
- **Type Checking**: Continuous TypeScript validation with strict mode
- **Linting**: ESLint with custom rules for the codebase patterns
- **Formatting**: Prettier with project-specific configuration
- **Pre-commit Hooks**: Automated testing and validation before commits

### Distribution
- **Standalone Executables**: Platform-specific binaries via `bun build --compile`
- **npm Package**: Bundled JavaScript for Node.js environments
- **Docker Images**: Containerized deployment options
- **IDE Extensions**: Integrated packages for VS Code, JetBrains IDEs

---

## Security Research Context

### Source Code Exposure Analysis
This repository serves as a case study in software supply chain security, specifically examining:

- **Build Artifact Leakage**: How source maps in npm packages can expose proprietary code
- **Dependency Chain Vulnerabilities**: Analysis of third-party package risks in AI tooling
- **Permission System Design**: Study of comprehensive permission frameworks in AI applications
- **Secure Development Practices**: Examination of security patterns in large TypeScript codebases

### Educational Value
The codebase provides insights into:

- **Modern CLI Architecture**: Advanced patterns for building sophisticated command-line tools
- **AI Agent Coordination**: Real-world implementation of multi-agent systems
- **Terminal UI Development**: Complex React/Ink applications with rich interactions
- **Performance Optimization**: Startup time optimization and memory management techniques
- **Type Safety at Scale**: Large-scale TypeScript application architecture

### Research Applications
This snapshot enables research into:

- **Agentic System Design**: How AI agents are structured and coordinated
- **Developer Tool Architecture**: Patterns for building AI-assisted development environments
- **Security Model Implementation**: Real-world permission and approval systems
- **Build System Innovation**: Advanced bundling and feature flag systems

---

## Research / Ownership Disclaimer

- This repository is an **educational and defensive security research archive** maintained by a university student.
- It exists to study source exposure, packaging failures, and the architecture of modern agentic CLI systems.
- The original Claude Code source remains the property of **Anthropic**.
- This repository is **not affiliated with, endorsed by, or maintained by Anthropic**.
