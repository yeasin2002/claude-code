# 08 — UI Architecture: React in the Terminal

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Intermediate — React knowledge helpful

---

## The Core Idea: React + Ink

Most React apps render to a web browser DOM. Claude Code uses [**Ink**](https://github.com/vadimdemedes/ink) — a library that renders React component trees to the **terminal** using ANSI escape codes.

```
React Component Tree
        ↓
   Ink Renderer
        ↓
ANSI escape codes
        ↓
Terminal output (colors, bold, cursor movement)
```

This gives Claude Code all the benefits of React — declarative components, state management, re-rendering — in a terminal environment.

---

## Why React in a Terminal?

It might seem odd to use React in a CLI tool. Here's why it works brilliantly:

1. **Component reuse**: The same `<Spinner>` component works in a file read progress, an agent status, and a loading screen
2. **Declarative updates**: When a file edit completes, just update the state — Ink re-renders only what changed
3. **Team familiarity**: TypeScript + React is what most web devs know
4. **Rich interactions**: Permission dialogs, search interfaces, settings screens — all are just React forms
5. **Testability**: Components can be unit tested like any React component

---

## Ink Primitives

Ink provides a small set of terminal-specific components:

```tsx
import { Box, Text, useInput, useApp } from 'ink'

// Box = flexbox container (controls terminal layout)
<Box flexDirection="column" padding={1}>
  <Text bold color="green">✓ Done</Text>
  <Text dimColor>Took 0.4s</Text>
</Box>

// useInput = capture keyboard events
useInput((input, key) => {
  if (key.escape) handleEscape()
  if (key.return) handleSubmit()
})

// useApp = access app lifecycle
const { exit } = useApp()
```

All of Claude Code's 140+ components build on these primitives.

---

## Component Inventory (by Category)

### Layout & Structure

| Component | Description |
|-----------|-------------|
| `FullscreenLayout.tsx` (84K) | Full-screen view manager |
| `App.tsx` | Root application component |
| `StatusLine.tsx` (49K) | Bottom status bar |
| `TagTabs.tsx` | Tab navigation |
| `DevBar.tsx` | Developer debug bar |

### Message Display

| Component | Description |
|-----------|-------------|
| `Messages.tsx` (147K) | Main message list (scrollable) |
| `Message.tsx` (79K) | Single message renderer |
| `MessageRow.tsx` (48K) | A row in the message list |
| `MessageSelector.tsx` (115K) | Select/navigate messages |
| `VirtualMessageList.tsx` (148K) | Virtualized message list (performance) |
| `CompactSummary.tsx` | Compact context display |

### Tool Result Display

| Component | Description |
|-----------|-------------|
| `FileEditToolDiff.tsx` (21K) | File diff viewer |
| `FileEditToolUpdatedMessage.tsx` | File edit result display |
| `StructuredDiff.tsx` (25K) | Structured diff viewer |
| `HighlightedCode.tsx` (17K) | Syntax-highlighted code blocks |
| `Markdown.tsx` (28K) | Markdown renderer |
| `MarkdownTable.tsx` (47K) | Markdown table renderer |
| `AgentProgressLine.tsx` (14K) | Sub-agent progress display |
| `BashModeProgress.tsx` | Bash command progress |

### Permission & Dialogs

| Component | Description |
|-----------|-------------|
| `BypassPermissionsModeDialog.tsx` | Bypass mode confirmation |
| `AutoModeOptInDialog.tsx` | Auto-mode opt-in |
| `MCPServerApprovalDialog.tsx` | MCP connection approval |
| `TrustDialog/` | Trust dialog for sandboxed content |
| `IdeAutoConnectDialog.tsx` | IDE auto-connect approval |
| `CostThresholdDialog.tsx` | Cost limit dialog |

### Input Components

| Component | Description |
|-----------|-------------|
| `TextInput.tsx` (20K) | Main text input field |
| `BaseTextInput.tsx` (19K) | Base input implementation |
| `VimTextInput.tsx` (16K) | Vim-mode text input |
| `PromptInput/` | Full prompt input area |
| `SearchBox.tsx` | Search input field |

### Configuration UIs

| Component | Description |
|-----------|-------------|
| `ModelPicker.tsx` (54K) | Model selection UI |
| `ThemePicker.tsx` (35K) | Color theme picker |
| `OutputStylePicker.tsx` | Output format picker |
| `Settings/` | Settings panel |
| `LanguagePicker.tsx` | UI language selection |

### Authentication

| Component | Description |
|-----------|-------------|
| `ConsoleOAuthFlow.tsx` (79K) | OAuth login flow UI |
| `ApproveApiKey.tsx` (10K) | API key approval |
| `AwsAuthStatusBox.tsx` | AWS authentication status |

### Onboarding

| Component | Description |
|-----------|-------------|
| `Onboarding.tsx` (31K) | New user onboarding flow |
| `IdeOnboardingDialog.tsx` | IDE integration onboarding |
| `ClaudeInChromeOnboarding.tsx` | Chrome extension onboarding |

### Context & Diagnostics

| Component | Description |
|-----------|-------------|
| `ContextVisualization.tsx` (76K) | Context window visualization |
| `DiagnosticsDisplay.tsx` | Environment diagnostics |
| `Stats.tsx` (152K) | Usage statistics display |
| `CoordinatorAgentStatus.tsx` (36K) | Multi-agent status view |
| `TokenWarning.tsx` | Context window warning |

### Spinners & Loading

| Component | Description |
|-----------|-------------|
| `Spinner.tsx` (87K) | Multi-mode animated spinner |
| `ToolUseLoader.tsx` | Tool execution loading indicator |
| `MemoryUsageIndicator.tsx` | Memory usage display |

---

## The Main Layout Structure

```
FullscreenLayout
├── ScrollKeybindingHandler    (handles scroll keyboard shortcuts)
│   └── VirtualMessageList     (virtualized scroll for performance)
│       └── Messages           (renders all conversation messages)
│           ├── MessageRow     (one message row)
│           │   ├── Message    (user or assistant message)  
│           │   └── [ToolResultMessages]  (FileEdit, Bash, etc.)
│           └── AgentProgressLine  (for sub-agent work)
└── StatusLine                 (bottom bar: model, cost, tokens)
    └── PromptInput            (text input area)
        ├── TextInput / VimTextInput
        └── ContextSuggestions (@ mention, file hints)
```

---

## The Spinner Component (87K bytes — A Deep Dive)

The `Spinner.tsx` is surprisingly complex for an animated loading indicator. It supports **multiple display modes**:

```typescript
type SpinnerMode = 
  | 'spinning'      // Classic dots spinner ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
  | 'bash'          // Shows command being executed
  | 'agent'         // Shows sub-agent progress
  | 'thinking'      // Shows Claude is "thinking"
  | 'compact'       // Compressed status
  | 'mcp'           // MCP tool execution
```

Each mode renders a different UI. The complexity comes from handling all these contexts in one reusable component.

---

## Virtual Scrolling (`VirtualMessageList.tsx`)

For long conversations with thousands of messages, rendering all of them would be slow. `VirtualMessageList.tsx` (148K bytes) implements **virtual scrolling**:

```
Visible terminal area: 40 rows
Total messages: 2,000

Virtual scroller renders ONLY messages visible in the viewport:
- 3 messages above viewport (buffer)
- 10 messages in viewport
- 3 messages below viewport (buffer)

= 16 total DOM elements instead of 2,000
```

This is the same technique websites like Twitter use for infinite scroll feeds.

---

## The Typeahead System (`useTypeahead.tsx`)

The typeahead hook (212K bytes — the largest hook) powers all autocomplete in the prompt input:

```
User types: "@src/auth[TAB]"
                    ↓
         Typeahead detects "@" trigger
                    ↓
         Scans filesystem for matching paths
                    ↓
         Shows popup with completions:
         @src/auth/login.ts
         @src/auth/logout.ts
         @src/auth/middleware.ts
```

It handles multiple completion contexts:
- **File paths** — `@filename.ts` attaches files to context
- **Commands** — `/commit` shows command completions
- **Agents** — `@agent-name` references agent configurations
- **Tool params** — Context-sensitive completions inside commands

---

## Theme System

Claude Code supports multiple terminal color themes. The theme system is defined in `src/utils/theme.ts`:

```typescript
type Theme = {
  primary: string      // Main brand color
  secondary: string    // Secondary color
  success: string      // Green tones
  warning: string      // Yellow/amber
  error: string        // Red tones
  text: string         // Default text
  subtle: string       // Dimmed text
  highlight: string    // Highlighted text
}
```

The `ThemePicker.tsx` (35K) renders a full interactive theme selection UI with live preview.

---

## Fullscreen Layout Modes

Claude Code can switch between several full-screen modes:

### Normal Mode
The standard REPL with message history and input.

### Doctor Mode
Triggered by `/doctor` — shows environment diagnostics.

### Context Visualization Mode
Triggered by `/context` — shows a visual breakdown of context window usage:
```
Context Window Usage:
████████████████████████ 48,000 / 200,000 tokens
├─ System prompt:  8,000 (16%)
├─ Messages:      30,000 (63%)
├─ Tool results:   8,000 (17%)
└─ Remaining:    152,000
```

### Stats Mode
Triggered by `/stats` — shows detailed usage statistics (152KB component for a reason).

### Log Selector (`LogSelector.tsx` — 200K bytes)
The largest component. Provides a searchable, filterable log viewer for past sessions and agent transcripts.

---

## Hooks Overview (`src/hooks/`)

83 hooks handle all interactive behavior. Key categories:

### Navigation Hooks
- `useArrowKeyHistory` — Arrow key history navigation (34K)
- `useHistorySearch` — Search through command history
- `useVirtualScroll` — Scroll management (35K)

### Input Hooks
- `useTextInput` — Core text editing (17K)
- `useVimInput` — Vim mode (9K)
- `usePasteHandler` — Clipboard paste (10K)
- `useGlobalKeybindings` — Global keyboard shortcuts (31K)

### Session Hooks
- `useReplBridge` — Bridge connection management (115K — largest hook!)
- `useIDEIntegration` — IDE integration state
- `useCancelRequest` — Interrupt handling (10K)

### Display Hooks
- `useDiffData` — Diff computation
- `useElapsedTime` — Time tracking for spinners
- `useMergedTools` — Merge built-in + MCP tools

### AI/Tool Hooks
- `useCanUseTool` — Permission checking (40K)
- `useSwarmInitialization` — Multi-agent setup
- `useScheduledTasks` — Background task tracking

---

## How Tool Results Appear in the UI

When a tool executes, the tool's render methods are called:

```tsx
// In Messages.tsx (simplified)
function ToolResultDisplay({ tool, result, progress }) {
  // Small/compact rendering for non-verbose mode
  const compact = tool.renderToolResultMessage(result, progress, {
    style: 'condensed',
    theme: currentTheme,
    verbose: false
  })
  
  // Full rendering in verbose mode
  const full = tool.renderToolResultMessage(result, progress, {
    theme: currentTheme,
    verbose: true
  })
  
  return isVerbose ? full : compact
}
```

Each tool controls its own display. `FileEditTool` shows a diff. `BashTool` shows colored command output. `AgentTool` shows a collapsible sub-agent conversation.

---

## Summary

| Concept | Key Point |
|---------|-----------|
| React + Ink | React renders to terminal via ANSI codes |
| Component count | ~140+ components |
| Key pattern | Tools render their own results |
| Performance | Virtual scrolling, lazy rendering |
| Typeahead | 212K hook for all autocomplete |
| Theme support | Configurable color themes |
| Full-screen modes | Doctor, Context, Stats, Logs |
| State | React state via AppState context |
| Hooks | 83 hooks for all interactive behavior |

---

*Source references: `src/components/` (all files), `src/hooks/`, `src/ink.ts`, `src/ink/`*
