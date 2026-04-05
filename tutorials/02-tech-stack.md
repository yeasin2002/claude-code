# 02 — Tech Stack: What Powers Claude Code

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Beginner–Intermediate — Helpful to know TypeScript basics

---

## Overview

Claude Code is built on a carefully chosen set of technologies. Each choice was made for a specific reason. This tutorial explains every piece of the tech stack, why it was chosen, and how the pieces connect.

---

## The High-Level Stack

```
┌─────────────────────────────────────────────────────┐
│               Runtime: Bun                          │
│   (Fast JS/TS runtime with built-in bundler)        │
├─────────────────────────────────────────────────────┤
│           Language: TypeScript (strict)              │
│      (Type-safe, catches errors at compile time)    │
├───────────────────┬─────────────────────────────────┤
│   Terminal UI     │        Core Logic               │
│   React + Ink     │  Commander.js + Anthropic SDK   │
├───────────────────┴─────────────────────────────────┤
│      Schema Validation: Zod v4                       │
├─────────────────────────────────────────────────────┤
│   Auth: OAuth 2.0 + JWT | Search: ripgrep           │
│   Protocols: MCP SDK + LSP | Observability: OTel    │
└─────────────────────────────────────────────────────┘
```

---

## 1. Runtime — Bun

**What it is:** Bun is a modern JavaScript/TypeScript runtime, similar to Node.js but built from scratch in Zig for maximum speed.

**Why it was chosen:**
- **Fast startup** — cold start times are dramatically lower than Node.js
- **Built-in bundler** — no need for separate webpack/esbuild setup
- **Native TypeScript** — runs `.ts` files directly, no compilation step in dev
- **Feature flags** — `bun:bundle` feature flag system enables dead code elimination
- **Compile to binary** — `bun build --compile` produces a standalone executable

```bash
# Run directly (no build step)
bun run src/main.tsx

# Compile to a single binary
bun build src/main.tsx --compile --outfile=claude-code
```

**Key Bun feature used — Feature Flags:**
```typescript
import { feature } from 'bun:bundle'

// At BUILD TIME, if VOICE_MODE is inactive, this whole block is gone
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

This is how Claude Code keeps its binary small — unused features are stripped at build time.

---

## 2. Language — TypeScript (Strict Mode)

**What it is:** TypeScript is JavaScript with static types. "Strict mode" enables all the strictest type-checking options.

**Why strict TypeScript:**
- Catches entire categories of bugs before runtime
- Makes a 500K+ line codebase navigable — you know exactly what type every function receives
- Enables powerful IDE tooling across a large team
- Zod schemas generate TypeScript types automatically (no duplication)

**Example from the codebase (`Tool.ts`):**
```typescript
export type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  P extends ToolProgressData = ToolProgressData,
> = {
  name: string
  call(args: z.infer<Input>, context: ToolUseContext, ...): Promise<ToolResult<Output>>
  checkPermissions(input: z.infer<Input>, context: ToolUseContext): Promise<PermissionResult>
  // ...40+ more typed methods
}
```

The generic types (`Input`, `Output`, `P`) mean TypeScript checks that every implementation passes the right types through the whole pipeline.

---

## 3. Terminal UI — React + Ink

**What it is:** React is the popular UI library. [Ink](https://github.com/vadimdemedes/ink) is a library that renders React components to a terminal instead of a browser DOM.

**Why React in a terminal?:**
- React's component model works perfectly for managing complex UI state (messages, progress bars, permission dialogs)
- Components can be reused (the same `<Spinner>` works everywhere)
- State updates automatically re-render the terminal output
- Familiar patterns — developers who know React understand the component hierarchy

**How it works:**
```
React Component → Ink's renderer → ANSI escape codes → Terminal output
```

**Example structure (simplified):**
```tsx
// A terminal component using Ink
import { Box, Text } from 'ink'

function ProgressLine({ message, isDone }: Props) {
  return (
    <Box>
      <Text color={isDone ? 'green' : 'yellow'}>
        {isDone ? '✓' : '⠋'} {message}
      </Text>
    </Box>
  )
}
```

**Components in this codebase:** ~140 components covering:
- Message display (`Message.tsx`, `Messages.tsx`)
- Tool progress (`AgentProgressLine.tsx`, `BashModeProgress.tsx`)
- Permission dialogs (`BypassPermissionsModeDialog.tsx`)
- Full-screen views (`FullscreenLayout.tsx`, `ContextVisualization.tsx`)
- Markdown rendering (`Markdown.tsx`, `MarkdownTable.tsx`)

---

## 4. CLI Parsing — Commander.js

**What it is:** Commander.js is the most popular Node.js library for parsing command-line arguments.

**Why Commander.js:**
- Handles flags, subcommands, help text automatically
- The `@commander-js/extra-typings` package provides full TypeScript types
- Well-established, battle-tested in production

**How Claude Code uses it (from `main.tsx`):**
```typescript
// Simplified from the real code
const program = new Command()
  .name('claude')
  .description('Claude Code - AI coding assistant')
  .option('-p, --print <message>', 'Print mode — non-interactive')
  .option('--model <model>', 'Which Claude model to use')
  .option('--debug', 'Enable debug output')

program.parse(process.argv)
```

---

## 5. Schema Validation — Zod v4

**What it is:** Zod is a TypeScript-first schema declaration and runtime validation library.

**Why Zod everywhere:**
- Define a schema once → get TypeScript types + runtime validation for free
- Tool inputs validated before execution (security + reliability)
- API responses validated as they arrive
- Settings files validated on load

**Pattern used throughout the codebase:**
```typescript
import { z } from 'zod/v4'

// Define schema
const BashInputSchema = z.object({
  command: z.string().describe('The command to run'),
  timeout: z.number().optional().describe('Timeout in ms'),
})

// TypeScript type is automatically derived
type BashInput = z.infer<typeof BashInputSchema>

// Runtime validation
const result = BashInputSchema.safeParse(userInput)
if (!result.success) {
  // Zod gives precise error messages about what's wrong
  throw new Error(result.error.message)
}
```

Note: This project uses **Zod v4** (beta at time of writing) — more performant than v3.

---

## 6. AI API — Anthropic SDK

**What it is:** The official TypeScript SDK for Anthropic's Claude AI API.

**What it does in this codebase:**
- Streams responses from Claude in real-time (you see output as it's generated)
- Handles tool calls — Claude returns a structured "I want to call this tool" response
- Manages authentication (API keys)
- Handles retries, rate limits, and errors

**How streaming works conceptually:**
```
1. Send message to Claude API
2. Receive stream of chunks:
   - Text tokens ("I'll edit the file...")
   - Tool use block ({"tool": "FileEdit", "input": {...}})
   - End of message
3. For each tool use block:
   - Check permissions
   - Execute the tool
   - Send tool result back to Claude
4. Claude continues generating
5. Repeat until Claude stops calling tools
```

This loop is handled by `QueryEngine.ts` (~46K lines — the heart of the system).

---

## 7. Code Search — ripgrep

**What it is:** ripgrep (`rg`) is a blazingly fast command-line text search tool written in Rust.

**Why ripgrep over alternatives:**
- Significantly faster than grep/ag on large codebases
- Respects `.gitignore` by default
- Handles binary files gracefully
- Already installed on most developer machines

**How Claude Code uses it:**
`GrepTool` wraps ripgrep to let Claude search codebases:
```typescript
// Conceptually: runs rg under the hood
await GrepTool.call({
  pattern: 'authentication error',
  path: './src',
  include: '*.ts',
})
```

---

## 8. Protocols — MCP and LSP

### Model Context Protocol (MCP)
**What it is:** A standardized protocol (created by Anthropic) for connecting AI models to external tools and data sources.

**Why it matters:** MCP lets anyone build a "server" that Claude Code can connect to. Examples:
- A browser MCP server (Claude can control a browser)
- A database MCP server (Claude can query your DB)
- A GitHub MCP server (Claude can interact with PRs)

**SDK used:** `@modelcontextprotocol/sdk`

### Language Server Protocol (LSP)
**What it is:** A protocol used by IDEs for code intelligence (autocomplete, go-to-definition, errors).

**Why Claude Code uses it:** LSP gives Claude access to typed errors, symbol definitions, and references — the same information your IDE has. This makes Claude's code edits more accurate.

---

## 9. Authentication — OAuth 2.0 + JWT

**What it is:**
- **OAuth 2.0**: Industry-standard authorization framework
- **JWT (JSON Web Tokens)**: Stateless authentication tokens
- **macOS Keychain**: Secure credential storage on Mac

**How authentication works:**
1. First run: Claude Code opens browser for OAuth login
2. Credentials stored in macOS Keychain (or equivalent)
3. JWT tokens used for bridge communication (IDE ↔ CLI)
4. Tokens refreshed automatically

---

## 10. Observability — OpenTelemetry

**What it is:** OpenTelemetry is a standardized observability framework for collecting traces, metrics, and logs.

**Why it's here:**
- Anthropic tracks how the tool is used (with privacy controls)
- Performance monitoring (slow operations are detected)
- Error tracking for debugging production issues

**Dependencies used:**
```json
"@opentelemetry/api": "^1.8.0",
"@opentelemetry/sdk-trace-base": "^1.24.0",
"@opentelemetry/exporter-trace-otlp-http": "^0.50.0"
```

---

## 11. Feature Flags — GrowthBook

**What it is:** GrowthBook is an open-source feature flag and A/B testing platform.

**How it's used:**
- Gradual feature rollouts (new features enabled for 10% of users first)
- A/B testing different AI behaviors
- Kill switches for problematic features
- Analytics integration

---

## Complete Dependency List

From `package.json`, grouped by purpose:

| Category | Package | Purpose |
|----------|---------|---------|
| **Runtime** | `bun` | JavaScript/TS runtime |
| **AI** | `@anthropic-ai/sdk` | Claude API client |
| **UI** | `react`, `ink` | Terminal UI framework |
| **CLI** | `commander`, `@commander-js/extra-typings` | Argument parsing |
| **Validation** | `zod` (v4) | Schema validation |
| **Search** | ripgrep (system binary) | Code search |
| **Protocol** | `@modelcontextprotocol/sdk` | MCP integration |
| **Auth** | `google-auth-library` | OAuth flows |
| **Observability** | `@opentelemetry/*` | Tracing and metrics |
| **HTTP** | `axios`, `undici` | HTTP requests |
| **Images** | `sharp` | Image processing |
| **Markdown** | `marked`, `turndown` | Markdown parsing/generation |
| **Compression** | `fflate` | Fast compression |
| **Caching** | `cacache`, `lru-cache` | Result caching |
| **File watching** | `chokidar` | Live file change detection |
| **Terminal** | `chalk`, `cli-highlight`, `ansi-tokenize` | Terminal colors/highlighting |
| **Diff** | `diff` | Code diff generation |
| **Process** | `execa` | Safe child process management |
| **AWS** | `@aws-sdk/*` | AWS Bedrock Claude access |
| **QR Code** | `qrcode` | QR code generation (for mobile) |
| **WebSocket** | `ws` | Real-time communication |
| **YAML** | `yaml` | Config file parsing |
| **Locking** | `proper-lockfile` | File locking for concurrency |
| **Utilities** | `lodash-es`, `semver` | General utilities |

---

## Build System Deep Dive

Bun's build system is central to how Claude Code is distributed:

```bash
# Development mode (just run the TypeScript directly)
bun run src/main.tsx

# Production binary for macOS
bun build src/main.tsx --compile --target=bun-darwin-arm64 --outfile=claude

# With feature flags
bun build src/main.tsx \
  --define feature.VOICE_MODE=false \
  --define feature.BRIDGE_MODE=true \
  --compile
```

**Build output types:**
1. **Standalone binary** — distributed to end users via npm
2. **Bundled JS** — for CLI tool distribution  
3. **Source maps** — for debugging (accidentally exposed in the npm package, leading to this code being public)

---

## Summary Table

| Technology | Role | Why |
|-----------|------|-----|
| Bun | Runtime + bundler | Speed, native TS, feature flags |
| TypeScript strict | Language | Safety at scale |
| React + Ink | Terminal UI | Component model + state management |
| Commander.js | CLI arg parsing | Battle-tested, typed |
| Zod v4 | Schema validation | Types + runtime validation from one source |
| Anthropic SDK | AI API client | Official SDK with streaming support |
| ripgrep | Code search | Fastest available |
| MCP SDK | External tools | Extensibility protocol |
| OAuth 2.0 + JWT | Auth | Industry standard |
| OpenTelemetry | Observability | Production monitoring |
| GrowthBook | Feature flags | Safe rollouts |

---

*Source references: `package.json`, `src/main.tsx`, `src/tools.ts`, `src/Tool.ts`, `AGENTS.md`*
