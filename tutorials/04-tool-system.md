# 04 — Tool System: How Claude Takes Actions

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate — Understand TypeScript generics helps

---

## What Is the Tool System?

The **tool system** is the mechanism by which Claude AI takes actions in the real world. Claude doesn't just generate text — it calls **tools**, which are discrete, type-safe, permission-checked functions that do things like:

- Read a file
- Execute a shell command
- Search the codebase
- Make a web request
- Spawn a sub-agent

Every single capability Claude Code has is implemented as a tool.

---

## The Tool Interface

Every tool in the system implements the `Tool<Input, Output, P>` interface defined in `src/Tool.ts`. Here's a conceptual overview (simplified from the ~793-line real definition):

```typescript
type Tool<Input, Output, P extends ToolProgressData> = {
  // Identity
  name: string              // Unique name Claude uses to call this tool
  aliases?: string[]        // Legacy names for backwards compatibility

  // Schema
  inputSchema: Input        // Zod schema defining what parameters Claude passes

  // Core methods
  call(args, context, canUseTool, parentMessage, onProgress): Promise<ToolResult<Output>>
  checkPermissions(input, context): Promise<PermissionResult>
  
  // UI
  renderToolUseMessage(input, options): React.ReactNode      // Shows "Reading file.ts..."
  renderToolResultMessage(output, progress, options): React.ReactNode  // Shows the result
  renderToolUseProgressMessage(progress, options): React.ReactNode    // Shows progress

  // Metadata
  description(input, options): Promise<string>   // Shown to Claude in its system prompt
  prompt(options): Promise<string>               // How Claude is told to use this tool
  userFacingName(input): string                  // Human-readable name for UI

  // Behavior
  isConcurrencySafe(input): boolean   // Can this tool run in parallel?
  isReadOnly(input): boolean          // Does this tool modify anything?
  isDestructive?(input): boolean      // Does this do something irreversible?
  isEnabled(): boolean                // Is this tool available right now?
}
```

### The `buildTool()` Factory

Rather than manually implementing every method, tools use the `buildTool()` factory which provides sensible defaults:

```typescript
// src/Tool.ts
export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  return {
    // Defaults (fail-closed for safety)
    isEnabled: () => true,
    isConcurrencySafe: () => false,  // assume NOT safe by default
    isReadOnly: () => false,          // assume modifies by default
    isDestructive: () => false,
    checkPermissions: (input) => Promise.resolve({ behavior: 'allow', updatedInput: input }),
    toAutoClassifierInput: () => '',
    userFacingName: () => def.name,
    
    // Override with tool-specific definition
    ...def,
  }
}
```

This pattern ensures:
- **Fail-closed**: New tools that forget to implement `isConcurrencySafe` default to `false` (safer)
- **Single source of truth**: All default behaviors live in one place
- **Less boilerplate**: Tool authors only implement what's different

---

## All 40+ Tools at a Glance

### File Operation Tools

| Tool | What It Does | Read-Only? |
|------|-------------|-----------|
| `FileReadTool` | Read files (text, images, PDFs, notebooks) | ✅ Yes |
| `FileWriteTool` | Create or overwrite files | ❌ No |
| `FileEditTool` | Partial file edits (string replacement) | ❌ No |
| `NotebookEditTool` | Edit Jupyter notebooks | ❌ No |

### Shell Execution Tools

| Tool | What It Does | Notes |
|------|-------------|-------|
| `BashTool` | Execute shell commands | Requires permission |
| `PowerShellTool` | Windows PowerShell commands | Windows-specific |
| `REPLTool` | Node.js REPL (internal/ant-only) | Ant-only feature |

### Search Tools

| Tool | What It Does | Notes |
|------|-------------|-------|
| `GrepTool` | ripgrep content search | Fast regex/literal search |
| `GlobTool` | File pattern matching | Find files by name pattern |
| `ToolSearchTool` | Find deferred tools | Used when tool count is high |

### Web Tools

| Tool | What It Does |
|------|-------------|
| `WebFetchTool` | Fetch a URL and return its content |
| `WebSearchTool` | Search the web |

### Agent & Team Tools

| Tool | What It Does |
|------|-------------|
| `AgentTool` | Spawn a sub-agent (child Claude instance) |
| `TeamCreateTool` | Create a team of agents |
| `TeamDeleteTool` | Dissolve a team |
| `SendMessageTool` | Send a message to another agent |

### Task Management Tools

| Tool | What It Does |
|------|-------------|
| `TaskCreateTool` | Create a new background task |
| `TaskUpdateTool` | Update a task's status/output |
| `TaskGetTool` | Get info about a specific task |
| `TaskListTool` | List all active tasks |
| `TaskStopTool` | Stop a running task |
| `TaskOutputTool` | Get a task's output |

### Planning Tools

| Tool | What It Does |
|------|-------------|
| `EnterPlanModeTool` | Switch to plan mode (discuss only, no actions) |
| `ExitPlanModeTool` | Exit plan mode, start executing |

### Git/Workspace Tools

| Tool | What It Does |
|------|-------------|
| `EnterWorktreeTool` | Switch to a git worktree for isolation |
| `ExitWorktreeTool` | Return from worktree |

### Skill & Configuration Tools

| Tool | What It Does |
|------|-------------|
| `SkillTool` | Execute a skill (reusable workflow) |
| `ConfigTool` | Read/write configuration (internal) |

### MCP Tools

| Tool | What It Does |
|------|-------------|
| `MCPTool` | Call a tool on an MCP server |
| `ListMcpResourcesTool` | List available MCP resources |
| `ReadMcpResourceTool` | Read an MCP resource |
| `McpAuthTool` | Authenticate with an MCP server |

### Specialized Tools

| Tool | What It Does |
|------|-------------|
| `LSPTool` | Language Server Protocol queries |
| `TodoWriteTool` | Manage a todo list for task tracking |
| `AskUserQuestionTool` | Ask the user a clarifying question |
| `BriefTool` | Generate a brief summary |
| `SyntheticOutputTool` | Produce structured output |
| `SleepTool` | Wait/pause in proactive mode |
| `ScheduleCronTool` | Schedule recurring triggers |
| `RemoteTriggerTool` | Trigger remote events |

---

## Tool Registration

All tools are registered in `src/tools.ts` via `getAllBaseTools()`:

```typescript
export function getAllBaseTools(): Tools {
  return [
    AgentTool,
    TaskOutputTool,
    BashTool,
    // Conditionally include search tools
    ...(hasEmbeddedSearchTools() ? [] : [GlobTool, GrepTool]),
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    // Feature-flagged tools
    ...(feature('AGENT_TRIGGERS') ? [ScheduleCronTool] : []),
    ...(isPowerShellToolEnabled() ? [PowerShellTool] : []),
    // ...more tools
  ]
}
```

### Tool Filtering

The `getTools()` function filters the full list based on:
1. **Permission context**: Deny rules remove tools
2. **Environment**: Some tools only available in specific contexts
3. **Mode**: Simple mode only has Bash + Read + Edit
4. **isEnabled()**: Each tool can disable itself dynamically

```typescript
export const getTools = (permissionContext: ToolPermissionContext): Tools => {
  if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
    return [BashTool, FileReadTool, FileEditTool]
  }
  
  const tools = getAllBaseTools()
    .filter(tool => !isDenied(tool, permissionContext))
    .filter(tool => tool.isEnabled())
  
  return tools
}
```

---

## How a Tool Call Flows

Let's trace exactly what happens when Claude decides to call `FileEditTool`:

```
1. Claude API response contains:
   {
     "type": "tool_use",
     "id": "toolu_01234",
     "name": "str_replace_based_edit_tool",
     "input": {
       "path": "src/auth/login.ts",
       "old_string": "if (user) {",
       "new_string": "if (user && validateToken(token)) {"
     }
   }

2. QueryEngine.ts receives this tool_use block

3. Find the tool:
   const tool = findToolByName(tools, "str_replace_based_edit_tool")
   // → FileEditTool

4. Validate input:
   const validation = await tool.validateInput?.(input, context)
   // Checks: does the file exist? Is old_string actually in the file?

5. Check permissions:
   const permResult = await canUseTool(tool, input, context)
   // Asks user if needed, checks always-allow/always-deny rules

6. If approved, execute:
   const result = await tool.call(input, context, canUseTool, message, onProgress)
   // Actually modifies the file

7. Render progress in UI:
   tool.renderToolUseMessage(input, options)
   // Shows: "Editing src/auth/login.ts"

8. Send result back to Claude:
   {
     "type": "tool_result",
     "tool_use_id": "toolu_01234",
     "content": "Successfully edited src/auth/login.ts"
   }

9. Claude continues thinking based on the result
```

---

## A Real Tool: FileEditTool

Let's look at how a real tool is structured (conceptualized from the source):

```typescript
// src/tools/FileEditTool/FileEditTool.ts
import { buildTool } from '../../Tool.js'
import { z } from 'zod/v4'

const InputSchema = z.strictObject({
  path: z.string().describe('The file path to edit'),
  old_string: z.string().describe('Exact string to find and replace'),
  new_string: z.string().describe('String to replace it with'),
})

export const FileEditTool = buildTool({
  name: 'str_replace_based_edit_tool',

  inputSchema: InputSchema,

  async call(input, context, canUseTool, parentMessage, onProgress) {
    const { path, old_string, new_string } = input

    // Read current file content
    const content = await fs.readFile(path, 'utf-8')

    // Find the exact string
    if (!content.includes(old_string)) {
      return { data: 'Error: old_string not found in file' }
    }

    // Make the replacement
    const newContent = content.replace(old_string, new_string)

    // Write back
    await fs.writeFile(path, newContent)

    return { data: 'Successfully edited file' }
  },

  async checkPermissions(input, context) {
    // FileEditTool requires explicit permission for writes
    return { behavior: 'ask', ruleContent: `Edit ${input.path}` }
  },

  isReadOnly: () => false,
  isDestructive: () => false,  // It's reversible via git

  renderToolUseMessage(input, options) {
    return <Text>Editing {input.path}</Text>
  },

  renderToolResultMessage(content, progress, options) {
    return <FileEditToolUpdatedMessage content={content} />
  },
})
```

---

## ToolResult and Context Modification

Tools return a `ToolResult<Output>` object:

```typescript
type ToolResult<T> = {
  data: T
  // Optional: inject new messages after the result
  newMessages?: (UserMessage | AssistantMessage | SystemMessage)[]
  // Optional: modify the ToolUseContext for future tool calls
  contextModifier?: (context: ToolUseContext) => ToolUseContext
  // Optional: MCP protocol metadata
  mcpMeta?: { _meta?: Record<string, unknown> }
}
```

The `contextModifier` is powerful — it lets tools change the context for all future tool calls in the same conversation. For example, when `EnterWorktreeTool` runs, it adds a new working directory to the permission context.

---

## Tool Progress Reporting

Long-running tools can report incremental progress:

```typescript
type ToolCallProgress<P extends ToolProgressData> = (progress: ToolProgress<P>) => void

// AgentTool uses this to stream sub-agent messages
type AgentToolProgress = {
  type: 'agent_progress'
  messages: Message[]
  sessionId: string
}

// BashTool uses this to stream command output
type BashProgress = {
  type: 'bash_progress'
  output: string
  isComplete: boolean
}
```

The `onProgress` callback fires repeatedly during execution, and the UI renders each update in real-time.

---

## Concurrency and Tool Parallelism

Claude can call multiple tools **in parallel** when it determines they're independent. The `isConcurrencySafe` flag controls this:

```typescript
// Example: GrepTool is concurrency-safe (only reads)
isConcurrencySafe: () => true

// Example: FileEditTool is NOT concurrency-safe (writes could conflict)
isConcurrencySafe: () => false
```

When Claude returns multiple tool_use blocks in a single response, QueryEngine checks `isConcurrencySafe`:
- All safe → run in parallel
- Any unsafe → run sequentially

---

## MCP Tools

MCP (Model Context Protocol) tools are **dynamically added** at runtime when MCP servers connect:

```typescript
// MCP tools look identical to built-in tools from Claude's perspective
// But they're constructed dynamically from server metadata:
const mcpTool: Tool = {
  name: `mcp__browser__navigate`,
  isMcp: true,
  mcpInfo: { serverName: 'browser', toolName: 'navigate' },
  call: async (input) => {
    // Forward call to the MCP server
    return mcpClient.callTool('navigate', input)
  },
  // ...rest of interface
}
```

The `assembleToolPool()` function in `tools.ts` combines built-in and MCP tools, deduplicating and sorting for prompt-cache stability.

---

## Tool Search (Deferred Loading)

When there are too many tools, Claude's context window can't fit them all. The **ToolSearchTool** solves this:

1. Most tools are marked `shouldDefer: true` → not shown to Claude initially
2. `ToolSearchTool` IS shown and lets Claude search for tools by keyword
3. Claude searches: `ToolSearch({ query: "schedule a task" })`
4. ToolSearchTool returns: "Found `ScheduleCronTool` — creates scheduled triggers"
5. Claude can now call the deferred tool

---

## Summary

| Concept | Key Point |
|---------|-----------|
| `Tool` interface | ~793 lines defining every required method |
| `buildTool()` | Factory that fills in safe defaults |
| Tool registry | `getAllBaseTools()` → `getTools()` after filtering |
| Tool call flow | API → validate → permission → execute → render → feed back |
| ToolResult | Contains data + optional context modification |
| Progress | Callbacks for real-time streaming |
| Concurrency | `isConcurrencySafe()` controls parallelism |
| MCP tools | Dynamically added, look identical to built-ins |
| Deferred loading | `ToolSearchTool` enables lazy tool discovery |

---

*Source references: `src/Tool.ts`, `src/tools.ts`, `src/tools/` (all 40+ tool directories), `README.md`*
