# 07 — Service Layer & Bridge System

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate–Advanced

---

## Overview

The **service layer** (`src/services/`) and **bridge system** (`src/bridge/`) are the external-integration backbone of Claude Code:

- **Services** = connections to external APIs, protocols, and infrastructure
- **Bridge** = bidirectional communication between Claude Code and IDEs

```
           Claude Code CLI
                ↓
┌───────────────────────────────────────────┐
│              Service Layer                │
│  API | MCP | OAuth | LSP | Analytics     │
│  Plugins | Compact | Token Estimation    │
└───────────────────────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│              Bridge System               │
│  IDE ↔ CLI bidirectional connection      │
│  VS Code, JetBrains extension support   │
└───────────────────────────────────────────┘
```

---

## Service Layer — `src/services/`

### 1. API Service (`services/api/`)

The heart of all Claude AI communication. This wraps the `@anthropic-ai/sdk` and handles:

- **Streaming**: Real-time token-by-token response streaming
- **Error handling**: Rate limits, network errors, retries
- **File API**: Uploading large files/images to Anthropic's file storage
- **Bootstrap**: API connection warming (started at CLI launch time)

```typescript
// Conceptual: how the API client is used
const stream = await anthropicClient.messages.stream({
  model: 'claude-opus-4-5',
  max_tokens: 64000,
  messages: conversationHistory,
  tools: toolDefinitions,
  stream: true,
})

// Process each chunk as it arrives
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    displayText(event.delta.text)
  }
  if (event.type === 'tool_use') {
    await executeToolCall(event)
  }
}
```

### 2. MCP Service (`services/mcp/`)

Model Context Protocol management. Claude Code can connect to multiple MCP servers simultaneously.

**What MCP enables:**
- External tools (browser control, database queries, GitHub integration)
- External resources (files, databases, APIs as "resources" Claude can read)
- Standardized protocol for any third-party Claude integration

**MCP Server lifecycle:**
```
1. User configures MCP server in settings or via /mcp command
2. Claude Code starts an MCP client connection
3. Client handshakes with server, discovers available tools + resources
4. Tools are added to Claude's tool pool dynamically
5. Resources appear as readable data Claude can access
```

**Key files:**
- `services/mcp/types.ts` — Type definitions for connections, tools, resources
- `services/mcpServerApproval.tsx` — UI for approving new MCP server connections (security)

### 3. OAuth Service (`services/oauth/`)

Handles authentication flows:

```
1. First launch → Claude Code opens a browser to Anthropic's auth
2. User logs in → Gets OAuth tokens (access + refresh)
3. Tokens stored securely (macOS Keychain, etc.)
4. `startKeychainPrefetch()` preloads tokens at startup for fast auth
5. Token refresh happens automatically when access token expires
```

Service also handles:
- `google-auth-library` for Google OAuth
- JWT token management (used by bridge system)
- macOS Keychain integration

### 4. LSP Service (`services/lsp/`)

Language Server Protocol integration gives Claude code intelligence:

- **Go-to-definition**: Claude can ask "what does `validateToken` do?"
- **Type information**: Claude knows the exact type of any variable
- **Error detection**: Claude sees the same linting errors your IDE shows
- **Symbol references**: Claude can find all usages of a function

**Why this matters for AI:** Without LSP, Claude only sees raw text. With LSP, Claude sees the same structured, semantic information your IDE uses. This makes code edits much more accurate.

The LSP service manages connections to language servers (TypeScript Language Server, rust-analyzer, etc.) running alongside Claude Code.

### 5. Analytics Service (`services/analytics/`)

GrowthBook-powered feature flag and analytics service:

```typescript
// Checking a feature flag at runtime
const analytics = await import('./services/analytics')
const isNewSearchEnabled = await analytics.isFeatureEnabled('new_search_ui')

// Tracking user events (privacy-respecting)
await analytics.track('tool_used', {
  toolName: 'FileEdit',
  success: true,
  // No file contents or personal data
})
```

### 6. Compact Service (`services/compact/`)

Context compression — when the conversation gets too long for Claude's context window, this service compresses it:

```
Full conversation (200K tokens)
        ↓
Compact service
        ↓
Compressed summary (50K tokens) + recent messages (50K tokens)
        ↓
Claude continues with more room to work
```

The `/compact` command triggers this manually. It runs automatically when the context window reaches ~90% capacity.

### 7. Token Estimation (`services/tokenEstimation.ts`)

Estimates token counts without making an API call (which would be slow and expensive):

```typescript
// Estimate tokens before sending to API
const estimatedTokens = estimateTokens(messages, tools)

// Show warning if approaching limit
if (estimatedTokens > CONTEXT_WINDOW_WARNING_THRESHOLD) {
  showTokenWarning()
}
```

Uses a local approximation model (faster than calling the API).

### 8. Plugin Service (`services/plugins/`)

Loads, manages, and hot-reloads plugins:

```typescript
// Plugin loading lifecycle
1. Scan configured plugin directories
2. For each plugin directory:
   a. Read plugin.json for metadata
   b. Load skills from skills/ subdirectory
   c. Load commands from commands/ subdirectory
   d. Register everything with the main registries
3. Watch for file changes (hot-reload in dev mode)
```

### 9. Memory Extraction (`services/extractMemories/`)

Automatically extracts important facts from conversations and saves them to long-term memory files:

```
During conversation:
"My API key is stored in ~/.env"
"We always use kebab-case for file names"
"The database is PostgreSQL 15"

↓ Memory Extraction Service (runs in background)

Adds to ~/.claude/memories/project.md:
- API keys stored in ~/.env
- File naming: kebab-case
- Database: PostgreSQL 15
```

Future conversations automatically include these memories in context.

### 10. Voice Service (`services/voice.ts`)

Speech-to-text for voice input mode. Uses the operating system's speech recognition or a cloud STT service. Activated with the `VOICE_MODE` feature flag and `/voice` command.

---

## Bridge System — `src/bridge/`

The bridge is the most complex service: a **bidirectional, real-time communication layer** between the Claude Code CLI and IDE extensions.

### Why a Bridge?

Claude Code is a terminal tool. But most developers live in IDEs. The bridge allows:

1. **IDE → CLI**: Send the currently selected code to Claude without typing it
2. **CLI → IDE**: Show diffs/previews directly in the IDE editor
3. **Shared state**: The IDE knows what Claude is doing; Claude knows what file you're looking at
4. **Extension integration**: The VS Code extension controls the CLI through the bridge

```
┌──────────────┐         Bridge         ┌────────────────┐
│  Claude Code │ ←——— bidirectional ———→ │  IDE Extension │
│     CLI      │      messages          │  (VS Code etc) │
└──────────────┘                        └────────────────┘
```

### Bridge Architecture

```
src/bridge/
├── bridgeMain.ts          ← Main orchestration (115K bytes!)
├── replBridge.ts          ← REPL session management (100K bytes)
├── bridgeMessaging.ts     ← Message protocol (15K bytes)
├── bridgeApi.ts           ← HTTP API surface (18K bytes)
├── bridgePermissionCallbacks.ts  ← Permission delegation
├── jwtUtils.ts            ← Authentication for bridge connections
├── createSession.ts       ← New session creation
├── sessionRunner.ts       ← Session execution
├── bridgeEnabled.ts       ← Feature detection
├── bridgeConfig.ts        ← Configuration
├── bridgeDebug.ts         ← Debugging utilities
├── bridgeUI.ts            ← UI state synchronization
├── remoteBridgeCore.ts    ← Remote bridge support (39K bytes)
└── initReplBridge.ts      ← Bridge initialization (23K bytes)
```

### Bridge Message Protocol (`bridgeMessaging.ts`)

Communication happens via a lightweight message protocol with JWT authentication:

```typescript
type BridgeMessage = {
  id: string                    // Message ID for correlation
  type: string                  // Message type
  payload: unknown              // Message data
  timestamp: number
  jwt?: string                  // Authentication token
}

// Example messages:
{ type: 'ide_selection_changed', payload: { file: 'auth.ts', range: [42, 50] } }
{ type: 'permission_request', payload: { tool: 'FileEdit', input: {...} } }
{ type: 'permission_response', payload: { decision: 'allow' } }
{ type: 'session_status', payload: { status: 'running', tokens: 1234 } }
```

### JWT Authentication (`jwtUtils.ts`)

The bridge uses JWT to authenticate messages:

```typescript
// When Claude Code connects to an IDE extension:
const token = signJWT({
  sessionId: currentSession.id,
  permissions: ['read', 'write'],
  expiresIn: '1h'
}, SECRET_KEY)

// IDE extension verifies incoming messages:
const payload = verifyJWT(message.jwt, SECRET_KEY)
```

This prevents rogue applications from sending commands to Claude Code through the bridge.

### REPL Bridge (`replBridge.ts` — 100K bytes)

The largest bridge file manages the REPL (interactive session) connection:

- **Session state sync**: What messages are visible, what's Claude doing
- **Input forwarding**: IDE can submit messages to Claude
- **Output streaming**: Claude's responses appear in both terminal and IDE
- **Interrupt handling**: Stop Claude mid-response from either terminal or IDE

### Remote Bridge (`remoteBridgeCore.ts`)

Enables Claude Code to run on a remote server while being controlled locally:

```
Local machine (your IDE) → Network → Remote server (claude running)
```

Use cases:
- Development in cloud environments
- SSH sessions with IDE integration
- Team members controlling a shared Claude instance

### Bridge Initialization Sequence

```
1. bridgeEnabled.ts checks if bridge mode should be active
   (Process env, feature flag BRIDGE_MODE)

2. initReplBridge.ts starts the bridge server
   - Opens a Unix socket / WebSocket
   - Begins listening for IDE connections

3. IDE extension discovers the bridge
   (File on disk or fixed port)

4. JWT handshake authenticates the connection

5. State sync: IDE sends current file/selection
   Claude Code shares its state (messages, tools, costs)

6. Bridge is live — bidirectional messages flow
```

---

## Coordinator — Multi-Agent Mode

`src/coordinator/coordinatorMode.ts` (19K bytes) implements the **coordinator** pattern for running multiple Claude agents in parallel.

### How Coordination Works

```
User request:
"Refactor the entire codebase to use async/await"

Coordinator Claude:
1. Analyzes the scope
2. Divides work:
   - Agent A: services/ directory
   - Agent B: components/ directory  
   - Agent C: utils/ directory
3. Creates tasks for each agent:
   TaskCreateTool({...})
4. Monitors progress
5. Synthesizes results
```

### The Coordinator Mode

When coordinator mode is active, Claude has access to:
- Limited tools (only coordination-relevant ones)
- `AgentTool` — spawn sub-agents
- `TaskCreateTool/TaskUpdateTool/TaskListTool` — manage tasks
- `SendMessageTool` — communicate with sub-agents

Sub-agents (workers) have access to:
- The standard file operation tools
- Bash execution
- But NOT the coordinator tools (can't spawn more agents)

---

## Skills System — `src/skills/`

Skills are **reusable workflow patterns** — like macros or playbooks.

### What a Skill Looks Like

A skill is a directory containing a `SKILL.md` file:

```markdown
---
name: github-pr-review
description: Review a GitHub pull request systematically
---

# PR Review Skill

## When to Use
Use this skill when asked to review a pull request.

## Steps
1. Fetch the PR diff using BashTool: `gh pr diff <number>`
2. Read each changed file
3. Check for:
   - Bug risks
   - Performance issues
   - Security vulnerabilities
   - Code style
4. Write a review comment for each finding
5. Submit the review with `gh pr review`
```

### Bundled Skills (`bundledSkills.ts`)

Some skills are compiled **directly into the binary**:

```typescript
// bundledSkills.ts
export const BUNDLED_SKILLS = [
  {
    name: 'commit-message',
    content: readFile('./bundled/commit-message/SKILL.md')
  },
  {
    name: 'code-review', 
    content: readFile('./bundled/code-review/SKILL.md')
  },
]
```

These are always available, even without network access.

### User Skills

Custom skills are loaded from:
- `~/.claude/skills/`
- Project-level `.claude/skills/` directory
- Plugin-installed skills

The `loadSkillsDir.ts` (34K bytes) handles discovery, loading, hot-reloading, and MCP-skill builders.

---

## State Management — `src/state/`

Application state flows through a React context provider (`AppState`). Key aspects:

```typescript
// State is updated immutably via setAppState(f => f(prev))
setAppState(prev => ({
  ...prev,
  messages: [...prev.messages, newMessage],
  totalCostUSD: prev.totalCostUSD + turnCost,
}))
```

For **sub-agents**: `setAppState` is intentionally a no-op in sub-agent contexts. Sub-agents can't directly modify the parent's state — they communicate through tool results and messages. The exception is `setAppStateForTasks` which manages infrastructure (timers, background tasks) that should outlive a single agent.

---

## Summary

| Service | Key Purpose |
|---------|------------|
| `services/api/` | Anthropic API + streaming |
| `services/mcp/` | External tool protocol |
| `services/oauth/` | Authentication flows |
| `services/lsp/` | Code intelligence |
| `services/analytics/` | Feature flags + telemetry |
| `services/compact/` | Context compression |
| `services/tokenEstimation.ts` | Local token counting |
| `services/plugins/` | Plugin loading + hot-reload |
| `services/extractMemories/` | Automatic memory |
| `services/voice.ts` | Speech-to-text |
| `bridge/bridgeMain.ts` | IDE integration orchestration |
| `bridge/replBridge.ts` | REPL-IDE sync |
| `bridge/jwtUtils.ts` | Bridge authentication |
| `coordinator/` | Multi-agent coordination |
| `skills/` | Reusable workflow patterns |

---

*Source references: `src/services/` (all subdirs), `src/bridge/` (all files), `src/coordinator/`, `src/skills/`, `README.md`*
