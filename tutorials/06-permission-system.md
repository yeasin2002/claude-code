# 06 — Permission System: Safety and Control

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate

---

## Why a Permission System?

Claude Code gives an AI model the ability to:
- Modify any file on your computer
- Execute any shell command
- Make network requests

This is enormously powerful and equally dangerous if not controlled. The **permission system** is the safety layer that ensures Claude never does something without your knowledge or consent.

The core philosophy: **fail-closed**. When in doubt, ask the user.

---

## Permission Modes

The system operates in one of several **permission modes** that govern the default behavior:

```typescript
type PermissionMode = 
  | 'default'           // Ask for destructive actions
  | 'plan'              // Read-only: Claude can plan but not act
  | 'bypassPermissions' // Trust mode: skip most prompts (dangerous)
  | 'auto'              // Automated: use classifier to decide
```

### Default Mode
The standard mode. Claude can:
- ✅ Read files freely
- ✅ Search the codebase freely
- ⚠️ Write/edit files (asks once, remembers your answer)
- ⚠️ Run shell commands (asks each time unless you set rules)
- ❌ Certain high-risk operations (always ask)

### Plan Mode
Claude can read and reason but **cannot execute any actions**. Use this when you want to review Claude's plan before it starts working:

```
> /plan
Now in plan mode. Claude will outline what it intends to do but not execute.

> Fix the authentication system
[Claude explains its plan without actually editing any files]

> [You review] Looks good, proceed
> /plan exit  (or use ExitPlanModeTool)
[Claude now executes the plan]
```

### Bypass Permissions Mode
Claude skips most permission prompts — it can act freely. **Use with extreme caution.** This mode is marked with a special visual indicator. Intended mainly for automation scripts and trusted environments.

### Auto Mode
An automated classifier (`yoloClassifier`) decides whether to approve or deny tool calls based on:
- The tool's input
- Context from `CLAUDE.md`
- The operation's risk profile
- Custom rules

---

## The Permission Context

Every tool call receives a `ToolPermissionContext` that encodes all permission rules:

```typescript
type ToolPermissionContext = DeepImmutable<{
  mode: PermissionMode
  
  // Working directories Claude is allowed to modify
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>
  
  // Rules from settings: always allow these without asking
  alwaysAllowRules: ToolPermissionRulesBySource
  
  // Rules: always deny these
  alwaysDenyRules: ToolPermissionRulesBySource
  
  // Rules: always ask, even in bypass mode
  alwaysAskRules: ToolPermissionRulesBySource
  
  // Whether bypass mode is available to this session
  isBypassPermissionsModeAvailable: boolean
  
  // If true, auto-deny all prompts (background agents without UI)
  shouldAvoidPermissionPrompts?: boolean
}>
```

---

## PermissionResult — What Tools Return

When a tool's `checkPermissions()` is called, it returns a `PermissionResult`:

```typescript
type PermissionResult = 
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'ask'; ruleContent: string; reason?: string }
  | { behavior: 'deny'; reason: string }
```

- **`allow`**: Proceed without asking the user
- **`ask`**: Show the user a permission dialog
- **`deny`**: Reject outright (show error to Claude)

### Default Behavior (from `buildTool()`)

If a tool doesn't implement `checkPermissions`, the default allows everything:

```typescript
checkPermissions: (input) =>
  Promise.resolve({ behavior: 'allow', updatedInput: input })
```

Tools that do something sensitive **override** this:

```typescript
// BashTool's checkPermissions (simplified)
async checkPermissions(input, context) {
  const { command } = input
  
  // Check always-deny rules first
  if (matchesDenyRule(context, command)) {
    return { behavior: 'deny', reason: 'Command is in deny list' }
  }
  
  // Check always-allow rules
  if (matchesAllowRule(context, command)) {
    return { behavior: 'allow', updatedInput: input }
  }
  
  // Default: ask the user
  return { behavior: 'ask', ruleContent: `Bash(${command})` }
}
```

---

## The `useCanUseTool` Hook

The main permission hook is `src/hooks/useCanUseTool.tsx` (~40K bytes). This is called by `QueryEngine.ts` before every tool execution:

```typescript
// Simplified flow
async function canUseTool(
  tool: Tool,
  input: unknown,
  context: ToolUseContext
): Promise<PermissionResponse> {
  
  // 1. Check if tool is denied globally
  if (isDenied(tool, permissionContext)) {
    return { result: 'deny', reason: 'Tool is denied' }
  }
  
  // 2. Validate input
  const validation = await tool.validateInput?.(input, context)
  if (validation?.result === false) {
    return { result: 'deny', reason: validation.message }
  }
  
  // 3. Get tool's own permission check
  const permResult = await tool.checkPermissions(input, context)
  
  // 4. Apply permission context rules
  const contextResult = applyPermissionContext(permResult, permissionContext)
  
  // 5. If 'ask', show dialog to user
  if (contextResult.behavior === 'ask') {
    const userDecision = await showPermissionDialog(tool, input)
    return userDecision
  }
  
  return contextResult
}
```

---

## Permission Dialog

When Claude needs permission, a dialog appears:

```
┌────────────────────────────────────────────────────────────┐
│  Claude wants to run a command:                            │
│                                                            │
│  $ npm run test -- --watch                                 │
│                                                            │
│  [Allow once]  [Always allow]  [Always deny]  [Deny]      │
└────────────────────────────────────────────────────────────┘
```

User choices:
- **Allow once**: Run this specific command now, ask again next time
- **Always allow**: Add to always-allow list for future sessions
- **Always deny**: Add to always-deny list
- **Deny**: Reject this specific request

When you click "Always allow", the rule is saved as:
```json
{
  "permissions": {
    "allow": ["Bash(npm run test *)", "Bash(git *)"]
  }
}
```

---

## Permission Rules Syntax

Rules are patterns that match tool calls:

```
ToolName(ruleContent)
```

**Examples:**
```
Bash(git *)              → Allow all git commands
Bash(npm run *)          → Allow all npm run commands
FileEdit(src/*)          → Allow editing any file in src/
Bash(rm *)               → Deny all rm commands (if in deny list)
*                        → Match everything (use with extreme caution)
```

Rules are organized by **source** (who created them):

```typescript
type ToolPermissionRulesBySource = {
  // From user's global settings (~/.claude/settings.json)
  user?: ToolPermissionRule[]
  // From project-level CLAUDE.md or settings
  project?: ToolPermissionRule[]
  // From current session interactions
  session?: ToolPermissionRule[]
  // From CLI flags
  cli?: ToolPermissionRule[]
}
```

---

## Risk Classification

The auto-mode classifier (`yoloClassifier.ts`) categorizes operations by risk:

### Low Risk (usually auto-approved)
- Reading files
- Searching with grep/glob
- Running read-only commands (`git log`, `ls`, `cat`)
- Web fetching

### Medium Risk (ask, remember the answer)
- Editing files
- Creating new files
- Running test suites
- `git add`, `git commit`

### High Risk (always ask)
- Deleting files (`rm`, `del`)
- System-level changes
- `sudo` commands
- Network operations to unknown hosts
- Commands that modify system settings

### Critical (require explicit bypass)
- `rm -rf`
- System configuration changes
- Modifying Claude Code's own files

---

## Audit Trail

The permission system maintains a **denial tracking state** to detect patterns:

```typescript
type DenialTrackingState = {
  // How many times has Claude been denied recently?
  consecutiveDenials: number
  // When did the last denial happen?
  lastDenialTimestamp: number
}
```

If Claude is denied too many times consecutively, the system falls back to prompting even in auto-mode. This prevents automated systems from getting stuck in infinite permission loops.

---

## Permission Logging

All permission decisions are logged (for debugging and audit):

```typescript
// src/hooks/toolPermission/permissionLogging.ts
function logPermissionDecision(
  tool: string,
  input: unknown,
  decision: 'allow' | 'deny' | 'ask',
  source: 'rule' | 'user' | 'classifier' | 'default'
) {
  // Logged to diagnostic logs
  // PII is stripped before logging
}
```

---

## Working Directory Controls

Claude Code restricts file access to the **current working directory** and any explicitly added directories:

```typescript
type AdditionalWorkingDirectory = {
  // The additional directory path
  path: string
  // Optional: display name for the UI
  name?: string
}
```

You can add working directories with:
```bash
claude --add-dir /path/to/other/project
```

Or via the `/add-dir` command. Claude can then read from and write to those directories.

The permission system checks all file operations against this allowlist.

---

## Hooks: Custom Permission Logic

Claude Code supports **hooks** — custom scripts that run before and after tool calls to implement custom permission logic:

From `src/schemas/hooks.ts`:
```typescript
type HookConfig = {
  // When does this hook fire?
  event: 'pre_tool_use' | 'post_tool_use' | 'pre_compact' | 'session_start'
  
  // Optional: only fire for specific tools
  matcher?: string  // e.g., "Bash(git *)"
  
  // Command to run
  command: string
}
```

**Example hook configuration** (in your CLAUDE.md or settings):
```yaml
hooks:
  - event: pre_tool_use
    matcher: "Bash(*)"
    command: "security-check.sh"
```

When Claude tries to run a bash command, your `security-check.sh` script runs first. If it exits with code 0, Claude proceeds. If it exits with code 1, Claude is denied.

---

## Bridge Permission Delegation

When Claude Code runs embedded in an IDE (via the bridge), permissions can be **delegated to the IDE**:

```typescript
// src/bridge/bridgePermissionCallbacks.ts
type BridgePermissionCallbacks = {
  // IDE shows its own permission dialog, sends result back
  onPermissionRequest: (request: PermissionRequest) => Promise<PermissionResponse>
}
```

This allows IDEs to show their own native permission dialogs instead of Claude Code's terminal UI.

---

## Summary

| Concept | Key Point |
|---------|-----------|
| Permission modes | `default`, `plan`, `bypassPermissions`, `auto` |
| PermissionResult | `allow`, `ask`, or `deny` returned by each tool |
| useCanUseTool | Central hook that enforces all permission logic |
| Permission dialog | User sees `Allow Once / Always Allow / Deny` |
| Rule syntax | `ToolName(pattern)` stored in settings.json |
| Rule sources | User / project / session / CLI |
| Auto classifier | Risk-based automatic approval for low-risk ops |
| Working directories | Claude is restricted to declared directories |
| Hooks | Custom scripts that can veto any tool call |
| Audit trail | All decisions logged with denial tracking |

---

*Source references: `src/hooks/useCanUseTool.tsx`, `src/hooks/toolPermission/`, `src/types/permissions.ts`, `src/Tool.ts`, `src/schemas/hooks.ts`, `README.md`*
