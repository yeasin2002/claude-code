# 10 — Building the MVP: Create Your Own AI CLI Tool

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Advanced — Build something real

---

## Vision

You've studied the Claude Code source. Now let's build a **minimal but working version** — an MVP AI coding assistant CLI that you can evolve into something truly your own.

**What the MVP will do:**
- Take user input in a terminal REPL
- Send it to an AI (Claude API)
- Stream the response in real-time
- Execute tools: read files, run bash commands, search code
- Ask permission before dangerous actions
- Display results with colored terminal output

**What we deliberately won't build yet:**
- Multi-agent coordination
- IDE bridge integration
- MCP server support
- Plugin system
- Voice input
- Full permission rule system (just basic prompt)

---

## MVP Architecture

```
my-ai-cli/
├── src/
│   ├── main.ts              ← Entry point, CLI setup
│   ├── repl.ts              ← The interactive loop
│   ├── query.ts             ← Claude API communication + streaming
│   ├── tools/
│   │   ├── index.ts         ← Tool registry
│   │   ├── bash.ts          ← Bash execution tool
│   │   ├── file-read.ts     ← File reading tool
│   │   ├── file-edit.ts     ← File editing tool
│   │   └── grep.ts          ← Code search tool
│   ├── permissions.ts       ← Simple permission prompts
│   └── ui.ts                ← Terminal output helpers
├── package.json
└── tsconfig.json
```

---

## Step 1: Project Setup

```bash
mkdir my-ai-cli && cd my-ai-cli
bun init -y
```

**`package.json`:**
```json
{
  "name": "my-ai-cli",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "bun run src/main.ts",
    "dev": "bun --watch src/main.ts",
    "build": "bun build src/main.ts --compile --outfile=my-ai-cli"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "execa": "^8.0.1",
    "readline": "^1.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

```bash
bun install
```

---

## Step 2: Tool Interface

Define the tool contract (inspired by Claude Code's `Tool.ts`):

**`src/tools/index.ts`:**
```typescript
import type Anthropic from '@anthropic-ai/sdk'

// The shape of every tool
export interface Tool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  
  // Execute the tool
  execute(input: unknown): Promise<string>
  
  // Is this a dangerous action?
  requiresPermission(input: unknown): boolean
  
  // What to show user before asking permission
  permissionPrompt(input: unknown): string
}

// Format tools for Claude API
export function formatToolsForAPI(tools: Tool[]): Anthropic.Tool[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }))
}
```

---

## Step 3: Implement the Core Tools

**`src/tools/bash.ts`:**
```typescript
import { execa } from 'execa'
import type { Tool } from './index.js'

export const BashTool: Tool = {
  name: 'bash',
  description: 'Execute a shell command. Use for running tests, git operations, package management.',
  
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute'
      }
    },
    required: ['command']
  },
  
  requiresPermission: (_input) => true,  // Always ask for bash
  
  permissionPrompt(input: any) {
    return `Run command: ${input.command}`
  },
  
  async execute(input: any): Promise<string> {
    try {
      const { stdout, stderr } = await execa('sh', ['-c', input.command], {
        timeout: 30000,      // 30 second timeout
        maxBuffer: 1024 * 1024,  // 1MB output limit
      })
      
      let result = ''
      if (stdout) result += stdout
      if (stderr) result += '\nSTDERR:\n' + stderr
      return result || '(no output)'
    } catch (error: any) {
      return `Error: ${error.message}\n${error.stderr || ''}`
    }
  }
}
```

**`src/tools/file-read.ts`:**
```typescript
import fs from 'fs/promises'
import type { Tool } from './index.js'

export const FileReadTool: Tool = {
  name: 'file_read',
  description: 'Read the contents of a file. Use this to examine code, config files, or any text file.',
  
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      }
    },
    required: ['path']
  },
  
  requiresPermission: () => false,  // Reading is safe
  permissionPrompt: () => '',
  
  async execute(input: any): Promise<string> {
    try {
      const content = await fs.readFile(input.path, 'utf-8')
      const lines = content.split('\n')
      
      // Truncate very large files
      if (lines.length > 500) {
        return lines.slice(0, 500).join('\n') + 
               `\n\n... (truncated: file has ${lines.length} lines, showing first 500)`
      }
      
      return content
    } catch (error: any) {
      return `Error reading file: ${error.message}`
    }
  }
}
```

**`src/tools/file-edit.ts`:**
```typescript
import fs from 'fs/promises'
import type { Tool } from './index.js'

export const FileEditTool: Tool = {
  name: 'file_edit',
  description: 'Edit a file by replacing a specific string with new content. The old_string must exist exactly in the file.',
  
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      old_string: { type: 'string', description: 'Exact text to find and replace' },
      new_string: { type: 'string', description: 'Text to replace it with' }
    },
    required: ['path', 'old_string', 'new_string']
  },
  
  requiresPermission: () => true,
  
  permissionPrompt(input: any) {
    const lines = input.old_string.split('\n').slice(0, 3).join('\n')
    return `Edit ${input.path}\n  Replace: ${lines}...`
  },
  
  async execute(input: any): Promise<string> {
    try {
      const content = await fs.readFile(input.path, 'utf-8')
      
      if (!content.includes(input.old_string)) {
        return `Error: old_string not found in ${input.path}. Make sure it matches exactly.`
      }
      
      const newContent = content.replace(input.old_string, input.new_string)
      await fs.writeFile(input.path, newContent, 'utf-8')
      
      return `Successfully edited ${input.path}`
    } catch (error: any) {
      return `Error: ${error.message}`
    }
  }
}
```

**`src/tools/grep.ts`:**
```typescript
import { execa } from 'execa'
import type { Tool } from './index.js'

export const GrepTool: Tool = {
  name: 'grep',
  description: 'Search for a pattern in files. Use ripgrep if available, falls back to grep.',
  
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Pattern to search for' },
      path: { type: 'string', description: 'Directory or file to search', default: '.' },
      include: { type: 'string', description: 'File glob pattern, e.g. *.ts' }
    },
    required: ['pattern']
  },
  
  requiresPermission: () => false,
  permissionPrompt: () => '',
  
  async execute(input: any): Promise<string> {
    try {
      const args = ['-n', '--color=never', input.pattern, input.path || '.']
      if (input.include) args.push('--include', input.include)
      
      // Try ripgrep first, fall back to grep
      const rgOrGrep = await execa('which', ['rg'])
        .then(() => 'rg')
        .catch(() => 'grep')
      
      const { stdout } = await execa(rgOrGrep, args, { timeout: 10000 })
      return stdout || 'No matches found'
    } catch (error: any) {
      if (error.exitCode === 1) return 'No matches found'
      return `Search error: ${error.message}`
    }
  }
}
```

---

## Step 4: Permission System

**`src/permissions.ts`:**
```typescript
import chalk from 'chalk'
import readline from 'readline/promises'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

export type PermissionDecision = 'allow' | 'deny' | 'always_allow'

// Track what the user has always-allowed this session
const sessionAlwaysAllowed = new Set<string>()

export async function askPermission(
  toolName: string,
  description: string
): Promise<PermissionDecision> {
  // Check session cache
  const cacheKey = `${toolName}:${description}`
  if (sessionAlwaysAllowed.has(cacheKey)) {
    return 'allow'
  }
  
  console.log('\n' + chalk.yellow('⚠️  Permission Required'))
  console.log(chalk.white(description))
  console.log(chalk.dim('Options: [y]es / [a]lways / [n]o'))
  
  const answer = await rl.question(chalk.bold('Allow? > '))
  
  switch (answer.toLowerCase().trim()) {
    case 'y':
    case 'yes':
      return 'allow'
    
    case 'a':
    case 'always':
      sessionAlwaysAllowed.add(cacheKey)
      console.log(chalk.green('✓ Will always allow this action this session'))
      return 'always_allow'
    
    default:
      return 'deny'
  }
}

export function closePermissionInterface() {
  rl.close()
}
```

---

## Step 5: Terminal UI Helpers

**`src/ui.ts`:**
```typescript
import chalk from 'chalk'

export function printUserMessage(text: string) {
  console.log('\n' + chalk.bold.blue('You: ') + text)
}

export function printAssistantChunk(text: string) {
  process.stdout.write(chalk.white(text))
}

export function printAssistantStart() {
  process.stdout.write('\n' + chalk.bold.green('Claude: '))
}

export function printAssistantEnd() {
  console.log()  // newline after streaming
}

export function printToolCall(toolName: string, input: unknown) {
  const inputStr = JSON.stringify(input, null, 2)
    .split('\n')
    .map(l => '  ' + l)
    .join('\n')
  console.log(chalk.dim(`\n[Tool: ${toolName}]\n${inputStr}`))
}

export function printToolResult(result: string) {
  const truncated = result.length > 500 
    ? result.slice(0, 500) + '\n... (truncated)'
    : result
  console.log(chalk.dim('Result: ' + truncated))
}

export function printError(message: string) {
  console.error(chalk.red('Error: ' + message))
}

export function printStatus(message: string) {
  console.log(chalk.dim('• ' + message))
}
```

---

## Step 6: The Query Engine

**`src/query.ts`:**
```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Tool } from './tools/index.js'
import { formatToolsForAPI } from './tools/index.js'
import { askPermission } from './permissions.js'
import * as ui from './ui.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

type Message = Anthropic.MessageParam

export async function runQuery(
  userMessage: string,
  tools: Tool[],
  conversationHistory: Message[]
): Promise<Message[]> {
  
  // Add user message to history
  const messages: Message[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]
  
  // The AI loop: keep going until Claude stops calling tools
  while (true) {
    ui.printAssistantStart()
    
    let assistantContent: Anthropic.ContentBlock[] = []
    let textBuffer = ''
    
    // Stream the response
    const stream = client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      system: `You are a helpful coding assistant. You have access to tools to read files, 
edit code, run commands, and search codebases. When given a task:
1. Read relevant files to understand context
2. Make changes carefully, one step at a time
3. Verify your changes work when possible
4. Explain what you're doing

Current directory: ${process.cwd()}`,
      messages,
      tools: formatToolsForAPI(tools),
    })
    
    // Process streaming events
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // Start accumulating text
        } else if (event.content_block.type === 'tool_use') {
          console.log()  // newline after text
          ui.printToolCall(event.content_block.name, '')
        }
      }
      
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          ui.printAssistantChunk(event.delta.text)
          textBuffer += event.delta.text
        } else if (event.delta.type === 'input_json_delta') {
          // Accumulating tool input (will process at content_block_stop)
        }
      }
    }
    
    ui.printAssistantEnd()
    
    // Get the final message
    const finalMessage = await stream.finalMessage()
    assistantContent = finalMessage.content
    
    // Add assistant message to history
    messages.push({ role: 'assistant', content: assistantContent })
    
    // Check if we're done
    if (finalMessage.stop_reason === 'end_turn') {
      break
    }
    
    // Process tool calls
    if (finalMessage.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      
      for (const block of assistantContent) {
        if (block.type !== 'tool_use') continue
        
        const tool = tools.find(t => t.name === block.name)
        
        if (!tool) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool "${block.name}" not found`,
          })
          continue
        }
        
        ui.printToolCall(tool.name, block.input)
        
        // Check and request permission
        if (tool.requiresPermission(block.input)) {
          const decision = await askPermission(
            tool.name,
            tool.permissionPrompt(block.input)
          )
          
          if (decision === 'deny') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'User denied this action.',
              is_error: true,
            })
            continue
          }
        }
        
        // Execute the tool
        try {
          const result = await tool.execute(block.input)
          ui.printToolResult(result)
          
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        } catch (error: any) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool error: ${error.message}`,
            is_error: true,
          })
        }
      }
      
      // Send tool results back, continue the loop
      messages.push({ role: 'user', content: toolResults })
    }
  }
  
  return messages
}
```

---

## Step 7: The REPL

**`src/repl.ts`:**
```typescript
import readline from 'readline/promises'
import chalk from 'chalk'
import type { Tool } from './tools/index.js'
import { runQuery } from './query.js'
import * as ui from './ui.js'
import type Anthropic from '@anthropic-ai/sdk'

type Message = Anthropic.MessageParam

export async function startREPL(tools: Tool[]) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  let conversationHistory: Message[] = []
  
  console.log(chalk.bold.cyan('🤖 My AI CLI — Powered by Claude'))
  console.log(chalk.dim('Type your request. Commands: /clear, /exit, /help'))
  console.log()
  
  while (true) {
    const input = await rl.question(chalk.bold('> ')).catch(() => '/exit')
    
    const trimmed = input.trim()
    
    // Handle slash commands
    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log(chalk.dim('Goodbye!'))
      rl.close()
      process.exit(0)
    }
    
    if (trimmed === '/clear') {
      conversationHistory = []
      console.clear()
      console.log(chalk.green('✓ Conversation cleared'))
      continue
    }
    
    if (trimmed === '/help') {
      console.log(chalk.bold('\nAvailable commands:'))
      console.log('  /clear  — Clear conversation history')
      console.log('  /exit   — Exit the program')
      console.log('  /tools  — List available tools')
      console.log('\nAvailable tools Claude can use:')
      tools.forEach(t => console.log(`  ${t.name}: ${t.description}`))
      console.log()
      continue
    }
    
    if (trimmed === '/tools') {
      console.log(chalk.bold('\nAvailable tools:'))
      tools.forEach(t => {
        console.log(`  ${chalk.cyan(t.name)}: ${t.description}`)
      })
      console.log()
      continue
    }
    
    if (!trimmed) continue
    
    ui.printUserMessage(trimmed)
    
    try {
      conversationHistory = await runQuery(trimmed, tools, conversationHistory)
    } catch (error: any) {
      ui.printError(error.message)
      if (error.message?.includes('API key')) {
        console.log(chalk.yellow('Set your API key: export ANTHROPIC_API_KEY=your_key'))
      }
    }
  }
}
```

---

## Step 8: The Entry Point

**`src/main.ts`:**
```typescript
import { Command } from 'commander'
import chalk from 'chalk'
import { startREPL } from './repl.js'
import { BashTool } from './tools/bash.js'
import { FileReadTool } from './tools/file-read.js'
import { FileEditTool } from './tools/file-edit.js'
import { GrepTool } from './tools/grep.js'

// Validate environment
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable not set'))
  console.log(chalk.yellow('Get your API key at: https://console.anthropic.com'))
  console.log(chalk.yellow('Then run: export ANTHROPIC_API_KEY=your_key_here'))
  process.exit(1)
}

// Register all tools
const tools = [
  FileReadTool,
  FileEditTool,
  GrepTool,
  BashTool,
]

// CLI setup
const program = new Command()
  .name('my-ai-cli')
  .description('AI-powered coding assistant')
  .version('0.1.0')
  .option('-p, --print <message>', 'Non-interactive: print response and exit')
  .option('--no-bash', 'Disable bash tool (safer)')

program.parse()
const options = program.opts()

// Filter tools based on options
const activeTools = options.bash
  ? tools
  : tools.filter(t => t.name !== 'bash')

// Run
if (options.print) {
  // Non-interactive mode
  import('./query.js').then(({ runQuery }) => {
    runQuery(options.print, activeTools, [])
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err.message)
        process.exit(1)
      })
  })
} else {
  // Interactive REPL
  startREPL(activeTools)
}
```

---

## Running the MVP

```bash
# Install dependencies
bun install

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run in development
bun run dev

# Or build a binary
bun run build
./my-ai-cli
```

**Example session:**
```
🤖 My AI CLI — Powered by Claude
Type your request. Commands: /clear, /exit, /help

> List all TypeScript files in this project and tell me what each one does

Claude: I'll scan the TypeScript files for you.

[Tool: grep]
  {"pattern": "\\.ts$", "path": "."}
Result: src/main.ts
src/repl.ts
src/query.ts
src/ui.ts
src/permissions.ts
src/tools/index.ts
src/tools/bash.ts
...

[Tool: file_read]
  {"path": "src/main.ts"}
Result: import { Command } from 'commander'
...

Here's what each file does:
- **main.ts**: Entry point...
- **repl.ts**: Interactive REPL loop...
...
```

---

## What to Build Next (Progression Path)

### Phase 2: Better UX
- [ ] Use `ink` (React for terminal) for richer UI
- [ ] Show streaming text as it arrives more elegantly
- [ ] Add progress indicators with spinners
- [ ] Color-code different content types

### Phase 3: Memory
- [ ] Read `CLAUDE.md` from project root and inject as system context
- [ ] Save approved rules to a settings file
- [ ] Load settings on startup so preferences persist

### Phase 4: More Tools
- [ ] `FileWriteTool` — create new files
- [ ] `GlobTool` — file pattern matching
- [ ] `WebFetchTool` — fetch URLs
- [ ] `WebSearchTool` — web search integration

### Phase 5: Skill System
- [ ] Read `.md` files from `~/.my-ai-cli/skills/`
- [ ] Let users create reusable workflow instructions
- [ ] Register skills as callable behaviors

### Phase 6: Command System
- [ ] Add `/commit` — auto-generate git commit messages
- [ ] Add `/review` — code review current changes
- [ ] Add `/explain` — explain selected code

### Phase 7: Configuration
- [ ] Settings file (`~/.my-ai-cli/settings.json`)
- [ ] Per-project settings
- [ ] Zod validation for settings schema
- [ ] Model selection

### Phase 8: Plugin System
- [ ] Plugin discovery from `~/.my-ai-cli/plugins/`
- [ ] Plugin manifest format
- [ ] Custom tools from plugins

### Phase 9: MCP Support
- [ ] Connect to MCP servers
- [ ] Discover tools from servers
- [ ] Add MCP tools to the tool pool

---

## Key Patterns to Study in the Real Claude Code

As you build your own version, study these files for each feature:

| Feature | Study in Real Source |
|---------|---------------------|
| Tool interface | `src/Tool.ts` lines 362-701 |
| Tool defaults | `src/Tool.ts` `buildTool()` function |
| Streaming | `src/query.ts` (68K bytes) |
| Permission logic | `src/hooks/useCanUseTool.tsx` |
| Command system | `src/commands/` any command |
| Skill loading | `src/skills/loadSkillsDir.ts` |
| State management | `src/state/AppState.ts` |
| Context injection | `src/context.ts` |
| Token estimation | `src/services/tokenEstimation.ts` |
| Bridge protocol | `src/bridge/bridgeMessaging.ts` |

---

## Summary

You now have:
- ✅ A working AI CLI REPL
- ✅ 4 tools: Bash, FileRead, FileEdit, Grep
- ✅ Streaming responses
- ✅ Permission system (allow once / always / deny)
- ✅ Conversation history
- ✅ Slash commands (`/clear`, `/exit`, `/help`, `/tools`)
- ✅ Non-interactive (`--print`) mode

This is the foundation. Claude Code started as something similar and grew into ~500K lines of sophisticated engineering over time. Your journey can follow the same path.

**The most important lesson from studying Claude Code:**

> Every major system — permissions, tools, commands, bridge, multi-agent — follows the same pattern: **a clean interface**, **a registry**, **safe defaults**, and **opt-in complexity**.

Start clean. Grow deliberately.

---

*This tutorial synthesizes patterns from the entire Claude Code source: `src/Tool.ts`, `src/tools.ts`, `src/query.ts`, `src/hooks/useCanUseTool.tsx`, `src/commands.ts`, `src/main.tsx`, and all tool implementations in `src/tools/`.*
