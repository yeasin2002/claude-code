# 09 — Multi-Agent System: Coordination and Swarms

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Advanced

---

## What Is Multi-Agent in Claude Code?

Claude Code can spawn **sub-agents** — independent instances of Claude — that work in **parallel** on different parts of a task. This is one of Claude Code's most powerful and distinctive features.

```
Main Claude (Coordinator)
    ├── Agent A: "Review all files in src/auth/"
    ├── Agent B: "Review all files in src/api/"
    └── Agent C: "Review all files in src/components/"
                    ↓
        All three run simultaneously
                    ↓
        Coordinator synthesizes results
```

---

## Why Multi-Agent?

### The Context Window Problem

Claude has a limited context window (~200K tokens). A very large codebase might have more code than fits. Multi-agent solves this by dividing work:

```
Codebase: 500,000 tokens of code
Context window: 200,000 tokens

Single agent: Can only see 40% of codebase at once
Multi-agent:  Agent A sees module1, Agent B sees module2, Agent C sees module3
              Coordinator aggregates all findings
```

### Parallelism = Speed

Sequential vs parallel:
```
Sequential: [Task1: 30s] → [Task2: 30s] → [Task3: 30s] = 90s total
Parallel:   [Task1: 30s]
            [Task2: 30s]  ← all running simultaneously
            [Task3: 30s]
            = 30s total (3x faster)
```

### Specialization

Different agents can be configured for different roles:
- **Reviewer Agent**: Only reads, never writes
- **Writer Agent**: Makes changes based on reviewer's findings
- **Tester Agent**: Runs tests and reports failures

---

## The AgentTool

The `AgentTool` (`src/tools/AgentTool/`) is how Claude spawns sub-agents:

```typescript
// Claude calls this tool to spawn a sub-agent
AgentTool.call({
  prompt: "Read all TypeScript files in src/auth/ and identify security vulnerabilities",
  tools: ['FileRead', 'GrepTool'],  // limit sub-agent's tools
  model: 'claude-haiku',            // use a cheaper model for simple tasks
})
```

### What AgentTool Does

1. **Creates an isolated context** — the sub-agent has its own message history, doesn't share parent's state
2. **Provisions tool access** — sub-agent only gets the tools explicitly granted
3. **Runs asynchronously** — sub-agent runs in parallel with other work
4. **Returns results** — when sub-agent finishes, results returned as a tool result

### Sub-Agent Isolation

Critical design principle: **sub-agents are isolated**:

```typescript
// createSubagentContext() in the codebase
function createSubagentContext(parent: ToolUseContext): ToolUseContext {
  return {
    ...parent,
    
    // Sub-agent CANNOT modify parent's UI state
    setAppState: (_f) => { /* intentionally no-op */ },
    
    // But CAN modify session-level infrastructure
    setAppStateForTasks: parent.setAppStateForTasks,
    
    // Has its own message history
    messages: [],
    
    // Has its own agent ID
    agentId: generateAgentId(),
  }
}
```

Sub-agents can't accidentally corrupt the main session state. They communicate back through tool results.

---

## Team System

For structured parallelism, Claude Code has a **team** concept:

### TeamCreateTool

Creates a persistent team of background agents:

```typescript
TeamCreateTool.call({
  name: "code-review-team",
  members: [
    {
      role: "security-reviewer",
      systemPrompt: "You review code only for security vulnerabilities",
      tools: ['FileRead', 'GrepTool'],
    },
    {
      role: "performance-reviewer", 
      systemPrompt: "You review code only for performance issues",
      tools: ['FileRead', 'BashTool'],
    }
  ]
})
```

### SendMessageTool

Send work to a team member and receive responses:

```typescript
SendMessageTool.call({
  teamName: "code-review-team",
  memberRole: "security-reviewer",
  message: "Please review src/auth/login.ts for security issues"
})
// Returns: agent's findings
```

### TeamDeleteTool

Clean up when done:

```typescript
TeamDeleteTool.call({ name: "code-review-team" })
```

---

## Coordinator Mode

`src/coordinator/coordinatorMode.ts` implements the **coordinator** pattern — a special mode where one Claude acts as an orchestrator:

```typescript
// coordinatorMode.ts (19K bytes)

function isCoordinatorMode(): boolean {
  return feature('COORDINATOR_MODE') && 
         process.env.COORDINATOR_MODE === 'true'
}

function getCoordinatorTools(): Tools {
  // Coordinators get a restricted but powerful tool set:
  return [
    TaskCreateTool,    // Create tasks for workers
    TaskUpdateTool,    // Update task status
    TaskListTool,      // See all tasks
    TaskGetTool,       // Get specific task info
    SendMessageTool,   // Communicate with teams
    AgentTool,         // Spawn sub-agents
    FileReadTool,      // Read-only access
    GrepTool,          // Search capability
  ]
  // Note: NO FileWrite, FileEdit, BashTool
  // Coordinators organize work, workers execute it
}
```

### Coordinator vs Worker

```
┌─────────────────────────────────────────────────┐
│                  COORDINATOR                    │
│  Available tools: TaskCreate, Agent, SendMsg    │
│  Role: Plan, assign, monitor, synthesize       │
└─────────────────────────────────────────────────┘
            ↓ spawns, monitors, communicates ↓
┌─────────────────────────────────────────────────┐
│                    WORKER                       │
│  Available tools: Bash, FileRead, FileEdit      │
│  Role: Execute specific assigned work          │
└─────────────────────────────────────────────────┘
```

---

## Task Management System

The task system (`src/tasks/`) enables background work that outlives a single conversation turn:

### TaskCreateTool

```typescript
TaskCreateTool.call({
  name: "refactor-auth-module",
  description: "Refactor authentication to use JWT",
  tools: ['FileRead', 'FileEdit', 'BashTool'],
  instructions: "...",
})
// Returns: taskId
```

### Task Lifecycle

```
Created → Running → Completed | Failed
                    ↓
              TaskOutputTool reads the result
```

### Background Tasks

Some tasks run truly in the background — they continue even if you start a new conversation:

```typescript
// Tasks can be marked as background
{ runInBackground: true }
```

The `useTaskListWatcher.ts` hook watches for task status changes and updates the UI.

---

## Agent Types

Different agent types have different capabilities:

```typescript
type AgentType = 
  | 'default'           // Standard Claude agent
  | 'coordinator'       // Organizer with limited tools
  | 'worker'            // Executor with implementation tools
  | 'reviewer'          // Read-only auditor
  | 'custom'            // User-defined type
```

Your custom agent types can be defined in `.agents/` directories — Claude Code reads these YAML/MD agent definition files.

---

## Progress Reporting

Sub-agents report progress back to the parent via `AgentToolProgress`:

```typescript
type AgentToolProgress = {
  type: 'agent_progress'
  messages: Message[]       // The sub-agent's conversation so far
  sessionId: string         // Unique ID for this sub-agent run
  status: 'running' | 'done' | 'error'
  tokensUsed: number
}
```

The UI renders this via `AgentProgressLine.tsx` (14K):

```
┌─────────────────────────────────────────────────┐
│ 🤖 Sub-agent: code-review-team/security          │
│ ─────────────────────────────────────────────── │
│ Reading src/auth/login.ts...                    │
│ ✓ Checked for SQL injection: none found         │
│ ⚠ Found: Missing rate limiting on /login route  │
│ Reading src/auth/register.ts...                 │
│ Status: Running | Tokens: 2,341                 │
└─────────────────────────────────────────────────┘
```

---

## Worktree Mode

For heavyweight isolation, Claude Code supports **git worktrees** — separate working directories on different git branches:

```typescript
// Enter a worktree for safe experimentation
EnterWorktreeTool.call({
  branch: 'refactor/auth-jwt',
  createIfNotExists: true,
})

// Claude now works in a separate worktree
// Changes won't affect your main branch
// You can review the diff before merging

ExitWorktreeTool.call()
```

This is the safest mode for large refactors — all changes are isolated until you explicitly review and merge them.

---

## Agent SDK Mode

Claude Code has a special **SDK mode** where it can be controlled programmatically:

```typescript
// From src/entrypoints/agentSdkTypes.ts
type SDKStatus = {
  status: 'idle' | 'running' | 'done' | 'error'
  messages: Message[]
  tokensUsed: number
  cost: number
}
```

This enables:
- Use Claude Code as a library in your own Node.js applications
- Build custom GUIs on top of the Claude Code engine
- CI/CD integrations
- Custom agent orchestration

---

## Inter-Agent Communication

When agents need to talk to each other, they use `SendMessageTool`:

```typescript
// Agent A sends to Agent B
SendMessageTool.call({
  recipient: 'security-reviewer-agent',
  message: {
    type: 'work_assignment',
    payload: {
      files: ['src/auth/login.ts', 'src/auth/middleware.ts'],
      task: 'Review for authentication bypass vulnerabilities',
    }
  }
})
```

Messages are queued and delivered when the recipient agent is available. The `ListPeersTool` (feature-flagged) shows all currently active agents in a session.

---

## Swarm Initialization

The `useSwarmInitialization.ts` hook manages starting up a multi-agent system:

```typescript
// Simplified swarm init
async function initSwarm(config: SwarmConfig) {
  // 1. Create the coordinator
  const coordinator = await createAgentSession({
    role: 'coordinator',
    tools: getCoordinatorTools(),
  })
  
  // 2. Pre-warm worker slots
  const workers = await Promise.all(
    config.workerCount.map(() => createWorkerSession())
  )
  
  // 3. Register all agents
  setAppState(prev => ({
    ...prev,
    activeAgents: [coordinator, ...workers]
  }))
}
```

---

## Summary

| Concept | Key Detail |
|---------|-----------|
| **AgentTool** | Spawns a child Claude with isolated context |
| **Isolation** | Sub-agents can't modify parent state directly |
| **TeamCreateTool** | Creates persistent named agent teams |
| **SendMessageTool** | Inter-agent communication |
| **Coordinator mode** | Organizer Claude with limited tools |
| **Workers** | Executor Claudes with implementation tools |
| **Task system** | Background tasks that outlive a turn |
| **Worktree mode** | Git-isolated sandbox for safe refactors |
| **SDK mode** | Programmatic control of Claude Code |
| **Progress** | AgentToolProgress events stream to UI |

---

*Source references: `src/tools/AgentTool/`, `src/tools/TeamCreateTool/`, `src/tools/SendMessageTool/`, `src/tools/TaskCreateTool/`, `src/coordinator/coordinatorMode.ts`, `src/hooks/useSwarmInitialization.ts`, `README.md`*
