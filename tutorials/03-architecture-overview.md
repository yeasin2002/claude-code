# 03 — Architecture Overview: How the System Is Structured

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate — Helpful to understand TypeScript and CLI tools

---

## The Big Picture

Claude Code's architecture can be understood as **five distinct layers** that interact in a specific order:

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface Layer                        │
│         React/Ink Terminal UI + Slash Commands                  │
├─────────────────────────────────────────────────────────────────┤
│                     Orchestration Layer                          │
│         QueryEngine.ts — AI loop + tool-call coordination       │
├───────────────────────────┬─────────────────────────────────────┤
│       Tool System         │       Permission System             │
│   ~40 discrete tools      │   Safety checks + user approval     │
├───────────────────────────┴─────────────────────────────────────┤
│                      Service Layer                               │
│   API client, MCP, OAuth, LSP, Analytics, Plugins               │
├─────────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                           │
│   Bun runtime, file system, shell, bridge to IDEs               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Entrypoint — `main.tsx`

Everything starts in `src/main.tsx` (~800KB, the largest compiled file). This is the bootstrap file.

### What happens at startup

```typescript
// Simplified startup sequence
async function main() {
  // 1. PARALLEL PREFETCH — start I/O before anything else loads
  startMdmRawRead()       // Read MDM (Mobile Device Management) settings
  startKeychainPrefetch() // Load saved credentials from keychain
  startApiPreconnect()    // Warm up connection to Anthropic API

  // 2. Parse CLI arguments
  const program = new Command().name('claude')
  program.option('-p --print <msg>', 'Non-interactive mode')
  program.option('--model <model>', 'Claude model to use')
  // ...50+ more options

  // 3. Resolve feature flags
  const voiceEnabled = feature('VOICE_MODE')
  const bridgeEnabled = feature('BRIDGE_MODE')

  // 4. Initialize React/Ink UI
  const { waitUntilExit } = render(<App {...appProps} />)
  await waitUntilExit()
}
```

### Why parallel prefetch?

Startup time matters for a CLI tool. By firing off I/O operations (network, keychain, file reads) **before** the main module even loads, Claude Code overlaps waiting time with initialization.

```
Without prefetch:   [load modules] → [read keychain] → [open API connection]
With prefetch:      [load modules]
                    [read keychain ──────────────────]  (parallel)
                    [open API connection ────────────]  (parallel)
```

---

## Layer 2: The Core Loop — `QueryEngine.ts`

`QueryEngine.ts` (~46K lines) is the **brain** of the system. It manages the AI interaction loop.

### The Query Loop (Simplified)

```
User types a message
        ↓
QueryEngine sends message to Claude API (streaming)
        ↓
Claude responds with:
  - Text (shown to user in real-time)
  - Tool calls (e.g., "I need to read file.ts")
        ↓
For each tool call:
  1. Check permissions (can Claude do this?)
  2. If approved: execute the tool
  3. Send result back to Claude
        ↓
Claude continues → may call more tools → eventually stops
        ↓
Show final response to user
```

### Key Responsibilities of QueryEngine

| Responsibility | Description |
|---------------|-------------|
| **Streaming** | Processes API responses token-by-token in real time |
| **Tool orchestration** | Calls tools, collects results, feeds back to AI |
| **Thinking mode** | Internal Claude reasoning before responding |
| **Retry logic** | Handles API errors, rate limits, network issues |
| **Token management** | Tracks total tokens used, manages context window |
| **Context compression** | When context window fills, compresses old messages |
| **Cost tracking** | Monitors and reports API usage costs |

---

## Project Directory Structure

```
src/
├── main.tsx              ← App entrypoint (Commander.js setup, React/Ink init)
├── QueryEngine.ts        ← Core AI loop (~46K lines)
├── Tool.ts               ← Tool type definitions and buildTool() factory (~29K lines)
├── tools.ts              ← Tool registry (getAllBaseTools, getTools)
├── commands.ts           ← Command registry (~25K lines)
├── context.ts            ← System/user context (git status, CLAUDE.md)
├── cost-tracker.ts       ← Token usage & cost tracking
│
├── tools/                ← ~40 individual tools
│   ├── BashTool/
│   ├── FileReadTool/
│   ├── FileEditTool/
│   └── ...
│
├── commands/             ← ~50+ slash commands
│   ├── commit.ts
│   ├── config/
│   ├── doctor/
│   └── ...
│
├── components/           ← ~140 React/Ink UI components
│   ├── Messages.tsx
│   ├── FullscreenLayout.tsx
│   ├── Spinner.tsx
│   └── ...
│
├── hooks/                ← React hooks
│   ├── useCanUseTool.tsx ← The main permission hook
│   ├── toolPermission/   ← Permission system
│   └── ...
│
├── services/             ← External integrations
│   ├── api/              ← Anthropic API client
│   ├── mcp/              ← MCP server management
│   ├── oauth/            ← Auth flows
│   ├── lsp/              ← Language Server Protocol
│   ├── analytics/        ← Feature flags (GrowthBook)
│   └── plugins/          ← Plugin loader
│
├── bridge/               ← IDE integration bridge
│   ├── bridgeMain.ts
│   ├── replBridge.ts
│   └── ...
│
├── coordinator/          ← Multi-agent orchestration
│   └── coordinatorMode.ts
│
├── skills/               ← Skill system
│   ├── bundledSkills.ts
│   └── loadSkillsDir.ts
│
├── schemas/              ← Zod config schemas
├── types/                ← TypeScript type definitions
├── utils/                ← Shared utility functions
├── state/                ← Application state management
├── screens/              ← Full-screen UI modes (Doctor, REPL, Resume)
├── plugins/              ← Plugin architecture
├── migrations/           ← Configuration migrations
└── [other specialized dirs]/
```

---

## Module Dependency Flow

Understanding which modules depend on which helps navigate the codebase:

```
main.tsx
├── commands.ts           (all commands)
│   └── commands/*        (individual commands)
├── tools.ts              (all tools)
│   ├── Tool.ts           (type definitions)
│   └── tools/*           (individual tools)
├── QueryEngine.ts        (AI loop)
│   ├── services/api/     (Anthropic client)
│   ├── hooks/useCanUseTool.tsx  (permissions)
│   └── context.ts        (git status, CLAUDE.md)
└── components/*          (UI)
    └── hooks/*           (React state)
```

**Important:** Circular dependencies are carefully avoided. When they risk occurring (like TeamCreateTool needing tools.ts), lazy `require()` calls are used instead of top-level imports.

---

## Application State — `AppState`

The application maintains a central state object (`AppState`) managed via React's state system. Key parts:

```typescript
type AppState = {
  // Current messages in the conversation
  messages: Message[]
  
  // Which tool uses are in progress
  inProgressToolUseIDs: Set<string>
  
  // MCP server connections
  mcp: {
    clients: MCPServerConnection[]
    tools: Tools
  }
  
  // Permission context for all tools
  permissionContext: ToolPermissionContext
  
  // Current file edit history
  fileHistory: FileHistoryState
  
  // Cost tracking
  totalCostUSD: number
}
```

---

## The Two Operating Modes

Claude Code operates in two distinct modes:

### Mode 1: Interactive REPL
The default. You type messages, Claude responds. The terminal UI is active.

```
┌──────────────────────────────────────┐
│  Messages area (scrollable)          │
│  [User: Fix the bug in auth.ts]      │
│  [Claude: I'll read the file...]     │
│  [✓ Read auth.ts]                    │
│  [Claude: Here's what I found...]    │
│                                      │
│  Status bar: Model | Cost | Tokens   │
│──────────────────────────────────────│
│  Input: > _                          │
└──────────────────────────────────────┘
```

### Mode 2: Print Mode (`--print` / `-p`)
Non-interactive. Takes a single message, produces output, exits. Used in scripts and CI:

```bash
claude --print "What files have authentication logic?" --output-format json
```

---

## Context System

Before every conversation, Claude Code builds a **context** — background information injected into the system prompt.

### System Context (cached per conversation)
```typescript
// from context.ts
{
  gitStatus: "Current branch: main\nStatus: M src/auth.ts\nRecent commits: ..."
}
```

### User Context (from CLAUDE.md files)
Claude Code reads `CLAUDE.md` files from:
- Project root
- Subdirectories (nested, loaded on demand)
- Global memory files in `~/.claude/`

`CLAUDE.md` files contain project-specific instructions Claude should always follow:
```markdown
# CLAUDE.md
Always use async/await, never callbacks.
Run `npm test` before any commit.
Our auth system uses JWT tokens stored in httpOnly cookies.
```

---

## Configuration System

Settings are stored in `~/.claude/` (or `.kiro/` in some builds):

```
~/.claude/
├── settings.json      ← Main user settings (model choice, permissions, etc.)
├── memories/          ← Persistent memory files
└── skills/            ← User-installed skills
```

Settings are validated using Zod schemas at load time:
```typescript
// from schemas/ directory
const SettingsSchema = z.object({
  model: z.string().optional(),
  permissions: z.object({
    allow: z.array(z.string()),
    deny: z.array(z.string()),
  }).optional(),
  // ...
})
```

A **migration system** (`migrations/`) handles updating old settings files when the schema changes across versions.

---

## Feature Flag System

Feature flags enable/disable functionality at build time and runtime:

### Build-time Flags (Bun)
```typescript
import { feature } from 'bun:bundle'

// If VOICE_MODE is false at build time, this code is GONE from the binary
const VoiceCommand = feature('VOICE_MODE') ? require('./commands/voice') : null
```

**Active feature flags:**
| Flag | Purpose |
|------|---------|
| `PROACTIVE` | Proactive suggestions and behavior |
| `KAIROS` | Scheduling and timing features |
| `BRIDGE_MODE` | IDE integration |
| `DAEMON` | Background daemon operation |
| `VOICE_MODE` | Voice input |
| `AGENT_TRIGGERS` | Automated agent triggers |
| `MONITOR_TOOL` | System monitoring |
| `COORDINATOR_MODE` | Multi-agent coordination |

### Runtime Flags (Environment Variables)
```bash
USER_TYPE=ant claude  # Enables internal Anthropic-only tools
CLAUDE_CODE_SIMPLE=true claude  # Minimal tool set (Bash + Read + Edit only)
ENABLE_LSP_TOOL=true claude  # Enable LSP integration
```

---

## Key Architectural Decisions

### Decision 1: Tool-Based Everything
Every capability is a tool with a defined input schema, permission requirement, and output. This means:
- New capabilities are added by creating new tools
- The AI can call any tool in a unified way
- Permissions are consistent across all capabilities

### Decision 2: Permission-First
Claude **cannot** do anything without going through the permission system. Even internal tools check permissions. This means any user can trust that rogue AI behavior is caught before execution.

### Decision 3: React for Terminal UI
Ink brings React to the terminal, enabling:
- Component-based UI development
- Declarative state management  
- Hot-reloading during development
- Consistent look across tools

### Decision 4: Lazy Loading for Performance
Heavy dependencies (analytics, telemetry, certain services) are loaded only when needed:
```typescript
// NOT loaded at startup
const analytics = await import('./services/analytics')
```
This keeps startup fast.

### Decision 5: Avoiding Circular Dependencies
The codebase uses lazy `require()` calls for modules that would otherwise create circular dependency chains:
```typescript
// Circular dep prevention pattern
const getTeamCreateTool = () =>
  require('./tools/TeamCreateTool/TeamCreateTool.js').TeamCreateTool
```

---

## Summary

| Layer | Core File/Dir | Role |
|-------|--------------|------|
| Entrypoint | `main.tsx` | Bootstrap, CLI parsing, UI init |
| AI Loop | `QueryEngine.ts` | Streaming, tool orchestration, retries |
| Tool Types | `Tool.ts` | Type definitions, `buildTool()` factory |
| Tool Registry | `tools.ts` | `getAllBaseTools()`, filtering, permission |
| Tools | `src/tools/` | 40+ discrete capabilities |
| Commands | `src/commands/` | 50+ slash commands |
| UI | `src/components/` | 140+ React/Ink components |
| Permissions | `src/hooks/toolPermission/` | Safety layer |
| Services | `src/services/` | External integrations |
| Bridge | `src/bridge/` | IDE connection |
| Context | `context.ts` | Git status, CLAUDE.md injection |

---

*Source references: `src/main.tsx`, `src/QueryEngine.ts`, `src/Tool.ts`, `src/tools.ts`, `src/context.ts`, `src/state/`, `AGENTS.md`, `README.md`*
