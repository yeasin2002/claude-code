# 05 — Command System: How Slash Commands Work

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate

---

## What Are Commands?

Commands are **user-facing actions** you invoke by typing `/command` in Claude Code's REPL. They are distinct from tools in an important way:

| Aspect | Tools | Commands |
|--------|-------|---------|
| Invoked by | Claude AI | The user directly |
| Format | Tool call JSON | `/command-name` slash prefix |
| Purpose | AI capabilities | User control & configuration |
| Example | `FileEditTool` | `/commit`, `/config`, `/doctor` |
| Permission | Through permission system | Direct execution |

Commands give **you** direct control over Claude Code itself, while tools give **Claude** the ability to act.

---

## Command Registry — `commands.ts`

The command registry lives in `src/commands.ts` (~25K lines). It's responsible for:

1. **Registering all commands** (both built-in and from plugins/skills)
2. **Dynamic loading** based on environment and feature flags
3. **Alias resolution** — multiple names can point to one command
4. **Environment filtering** — some commands only appear in certain contexts

```typescript
// Simplified from commands.ts
export type Command = {
  name: string
  description: string
  aliases?: string[]
  
  // Can this command be used in non-interactive mode?
  isAvailableInPrintMode?: boolean
  
  // Handler
  call(input: string, context: CommandContext): Promise<void>
  
  // UI rendering
  renderResult?(result: unknown): React.ReactNode
  
  // Autocomplete
  getCompletions?(input: string, context: CommandContext): Promise<string[]>
}
```

---

## All Commands at a Glance

The `src/commands/` directory contains **86+ subdirectories and files**. Here are the key ones:

### Development Workflow Commands

| Command | What It Does |
|---------|-------------|
| `/commit` | Stage and create a git commit |
| `/review` | Code review of staged/changed files |
| `/diff` | View a visual diff of recent changes |
| `/branch` | Create or switch git branches |
| `/pr_comments` | View comments on the current PR |
| `/autofix-pr` | Auto-fix issues in an open PR |

### Session Management Commands

| Command | What It Does |
|---------|-------------|
| `/resume` | Resume a previous Claude session |
| `/compact` | Compress the conversation context to save tokens |
| `/clear` | Clear the current conversation |
| `/export` | Export the conversation as Markdown |
| `/share` | Share a session link |
| `/copy` | Copy conversation to clipboard |

### Configuration Commands

| Command | What It Does |
|---------|-------------|
| `/config` | View and modify settings |
| `/model` | Switch the Claude model being used |
| `/theme` | Change the terminal color theme |
| `/vim` | Toggle vim keybinding mode |
| `/keybindings` | Configure keyboard shortcuts |
| `/output-style` | Change how Claude's output is formatted |
| `/context` | Visualize the current context window |

### Authentication & Account Commands

| Command | What It Does |
|---------|-------------|
| `/login` | Authenticate with your Anthropic account |
| `/logout` | Sign out |
| `/cost` | View token usage + estimated cost |
| `/usage` | Detailed usage statistics |
| `/permissions` | View and modify permission settings |

### Tool & Extension Commands

| Command | What It Does |
|---------|-------------|
| `/mcp` | Manage MCP server connections |
| `/skills` | View, install, and manage skills |
| `/plugin` | Manage plugins |
| `/hooks` | Configure automation hooks |

### Diagnostic Commands

| Command | What It Does |
|---------|-------------|
| `/doctor` | Run environment diagnostics |
| `/status` | Show system status |
| `/env` | View environment variables |
| `/version` | Show Claude Code version |
| `/help` | Show help text |

### Agent & Team Commands

| Command | What It Does |
|---------|-------------|
| `/agents` | Manage agent configurations |
| `/tasks` | View and manage background tasks |
| `/plan` | Enter planning mode |

### Multimedia Commands

| Command | What It Does |
|---------|-------------|
| `/desktop` | Hand off to desktop app |
| `/mobile` | Hand off to mobile app |
| `/voice` | Toggle voice input mode |

### Memory Commands

| Command | What It Does |
|---------|-------------|
| `/memory` | View and edit Claude's persistent memory |

---

## How Commands Are Structured

Each command lives in its own directory and follows a consistent pattern:

```
src/commands/
├── commit.ts           ← Simple commands are single files
├── config/
│   ├── index.ts        ← Command registration + exports
│   └── config.tsx      ← Implementation with React/Ink UI
├── doctor/
│   ├── index.ts
│   └── doctor.tsx
└── mcp/
    ├── index.ts
    └── mcp.tsx
```

### Example: Commit Command (`commit.ts`)

```typescript
// Simplified from src/commands/commit.ts
export const CommitCommand: Command = {
  name: 'commit',
  description: 'Create a git commit of staged changes',
  aliases: ['git-commit'],
  
  isAvailableInPrintMode: false,
  
  async call(input: string, context: CommandContext) {
    // 1. Get staged files
    const staged = await getStagedFiles()
    
    if (staged.length === 0) {
      setToolJSX({ jsx: <Text>No staged files to commit.</Text> })
      return
    }
    
    // 2. Ask Claude to generate a commit message
    const message = await generateCommitMessage(staged)
    
    // 3. Show the proposed message to the user
    setToolJSX({
      jsx: <CommitPreview message={message} onConfirm={doCommit} />
    })
  },
  
  renderResult(result) {
    return <CommitResult sha={result.sha} message={result.message} />
  }
}
```

### Example: Config Command (multi-file)

```typescript
// src/commands/config/index.ts
export { ConfigCommand } from './config.js'

// src/commands/config/config.tsx
export const ConfigCommand: Command = {
  name: 'config',
  description: 'View or modify Claude Code settings',
  
  getCompletions(input) {
    // Context-aware tab completion
    return ['model', 'theme', 'permissions', 'memory']
  },
  
  async call(input, context) {
    const [subcommand, ...args] = input.trim().split(/\s+/)
    
    switch (subcommand) {
      case 'get': return handleGet(args[0])
      case 'set': return handleSet(args[0], args[1])
      case 'list': return handleList()
      default: return handleInteractiveConfig(context)
    }
  }
}
```

---

## CommandContext — What Commands Have Access To

When a command's `call()` is invoked, it receives a `CommandContext` object:

```typescript
type CommandContext = {
  // The current conversation messages
  messages: Message[]
  
  // Available tools (so commands can reference what Claude can do)
  tools: Tools
  
  // Permission context
  permissionContext: ToolPermissionContext
  
  // Set the UI to show (using React/Ink components)
  setToolJSX: SetToolJSXFn
  
  // Send a message as if the user typed it
  sendUserMessage: (text: string) => void
  
  // MCP connections
  mcpClients: MCPServerConnection[]
  
  // Current model name
  mainLoopModel: string
  
  // App state (getters + setters)
  getAppState(): AppState
  setAppState(f: (prev: AppState) => AppState): void
}
```

Commands use `setToolJSX` to display React components in the terminal — this is how the rich UI for `/config`, `/doctor`, and `/mcp` works.

---

## The Doctor Command — A Complex Example

`/doctor` is one of the most complex commands. It:
1. Checks the environment
2. Tests connectivity
3. Validates configuration
4. Renders a rich diagnostic report

```
doctor/
├── index.ts              ← Registration
└── doctor.tsx            ← 13,000+ byte implementation
```

It renders a full-screen diagnostic view using Ink components:

```
╔══════════════════════════════════════╗
║         Claude Code Doctor          ║
╠══════════════════════════════════════╣
║  Runtime                            ║
║  ✓ Bun version: 1.0.22             ║
║  ✓ Node.js compatibility: OK        ║
║                                     ║
║  API Connectivity                   ║
║  ✓ Anthropic API: Connected         ║
║  ✓ Auth: Valid token                ║
║                                     ║
║  MCP Servers                        ║
║  ✓ browser server: Connected        ║
║  ✗ github server: Disconnected      ║
╚══════════════════════════════════════╝
```

---

## Command Autocomplete

Commands support intelligent tab completion via `getCompletions()`:

```typescript
// User types: /config m[TAB]
// Claude Code calls:
const completions = await ConfigCommand.getCompletions('m', context)
// Returns: ['model']

// User types: /model [TAB]
// Returns all available models:
// ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', ...]
```

The completion system in `src/hooks/useTypeahead.tsx` (212KB — the largest hook file) handles all autocomplete logic including:
- Command name completion
- Subcommand completion
- Argument completion
- File path completion (for file-accepting commands)
- `@` mention completion (for referencing files and agents)

---

## Plugin Commands

Plugins can register their own commands. The plugin system loads commands the same way built-in commands are loaded:

```typescript
// When a plugin is loaded:
const pluginCommands = await loadPluginCommands(plugin.commandDir)
// These are merged into the main command registry
registerCommands([...builtInCommands, ...pluginCommands])
```

This is how third-party extensions add new `/` commands to Claude Code.

---

## Skill Commands

Skills can also expose as commands. When you install a skill:
```
/skills install github-pr-review
```

It might register:
```
/github-pr-review  → executes the skill's instructions
```

Skills are implemented differently from commands — they're Markdown files with instructions that Claude follows, rather than TypeScript code. But they appear in the command menu alongside regular commands.

---

## How Commands Appear in the UI

When you type `/` in the REPL, a popup appears listing all available commands:

```
> /
┌─────────────────────────────────────────┐
│ /commit    Create a git commit          │
│ /config    Modify settings              │
│ /doctor    Run diagnostics              │
│ /diff      View recent changes          │
│ /help      Show help                    │
│ /memory    Manage memory                │
│ /mcp       Manage MCP servers           │
│ ...                                     │
└─────────────────────────────────────────┘
```

This UI is rendered by the `useTypeahead.tsx` hook system.

---

## The `/init` and `/install` Special Commands

Two commands deserve special mention for their role in project setup:

### `/init` (`src/commands/init.ts` — 20K bytes)
Creates a `CLAUDE.md` file for a new project by:
1. Analyzing the project structure
2. Asking Claude to generate appropriate instructions
3. Writing the file for future context injection

### `/install` (`src/commands/install.tsx` — 39K bytes)
Handles IDE integration installation:
1. Detects installed IDEs (VS Code, JetBrains, etc.)
2. Installs the appropriate extension
3. Configures the bridge connection

---

## The UltraPlan Command (`ultraplan.tsx`)

`ultraplan.tsx` (~66K bytes) is one of the most complex command implementations. It provides a sophisticated planning workflow that:
1. Breaks down complex tasks into sub-tasks
2. Assigns work to multiple agents
3. Tracks progress across all parallel work streams
4. Synthesizes results

---

## Summary

| Concept | Details |
|---------|---------|
| **Definition** | User-invoked `/commands` for direct control |
| **vs Tools** | Commands are for users, tools are for Claude |
| **Registry** | `src/commands.ts` + all `src/commands/` directories |
| **Pattern** | `index.ts` (registration) + `command.tsx` (implementation) |
| **Context** | Access to messages, tools, permissions, state |
| **UI** | Use `setToolJSX` to render React/Ink components |
| **Completion** | `getCompletions()` enables intelligent tab completion |
| **Extensions** | Plugins and skills can add new commands |
| **Count** | 86+ command files/directories |

---

*Source references: `src/commands.ts`, `src/commands/` (all directories), `src/hooks/useTypeahead.tsx`, `README.md`*
