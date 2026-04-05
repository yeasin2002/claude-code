# Claude Code — Tutorial Series Index

> **What this is:** A complete learning path to understand the Claude Code CLI source code and build a similar application from scratch.
>
> **Source context:** This documentation is based on analyzed source code from a publicly exposed snapshot of Claude Code (Anthropic's CLI tool), made available through a source map exposure on 2026-03-31. It is maintained for educational and architectural analysis purposes.

---

## Reading Order

| # | File | Topic | Level |
|---|------|--------|-------|
| 01 | [Product Overview](./01-product-overview.md) | What Claude Code is and what it does | Beginner |
| 02 | [Tech Stack](./02-tech-stack.md) | Technologies used and why | Beginner–Int |
| 03 | [Architecture Overview](./03-architecture-overview.md) | How all layers fit together | Intermediate |
| 04 | [Tool System](./04-tool-system.md) | The core capability mechanism | Intermediate |
| 05 | [Command System](./05-command-system.md) | Slash commands for user control | Intermediate |
| 06 | [Permission System](./06-permission-system.md) | Safety and user approval flows | Intermediate |
| 07 | [Service Layer & Bridge](./07-service-layer-and-bridge.md) | External integrations + IDE bridge | Int–Advanced |
| 08 | [UI Architecture](./08-ui-architecture.md) | React/Ink terminal UI system | Intermediate |
| 09 | [Multi-Agent System](./09-multi-agent-system.md) | Parallel AI coordination | Advanced |
| 10 | [MVP Building Guide](./10-mvp-building-guide.md) | Build your own from scratch | Advanced |
| 11 | [Package Ecosystem Comparison](./11-package-ecosystem-comparison.md) | Terminal AI Agent Packages | Intermediate |
| 12 | [TanStack AI vs Vercel AI](./12.tanstack_ai-vs-vercel-ai.md) | AI SDK Comparison | Intermediate |

---

## Quick Reference: Key Source Files

| Source File | Size | What It Does |
|-------------|------|-------------|
| `src/main.tsx` | 800KB | Entry point, CLI setup, React/Ink init |
| `src/QueryEngine.ts` | 46KB | Core AI streaming loop |
| `src/query.ts` | 68KB | Full query pipeline |
| `src/Tool.ts` | 29KB | Tool type definitions + `buildTool()` |
| `src/tools.ts` | 17KB | Tool registry + filtering |
| `src/commands.ts` | 25KB | Command registry |
| `src/context.ts` | 6KB | Git status + CLAUDE.md injection |
| `src/cost-tracker.ts` | 10KB | Token usage tracking |
| `src/hooks/useCanUseTool.tsx` | 40KB | Permission checking hook |
| `src/bridge/bridgeMain.ts` | 115KB | IDE bridge orchestration |
| `src/bridge/replBridge.ts` | 100KB | REPL-IDE synchronization |
| `src/skills/loadSkillsDir.ts` | 34KB | Skill loading + hot-reload |
| `src/hooks/useTypeahead.tsx` | 212KB | Autocomplete system |

---

## Quick Reference: All Tools

| Tool Name | Category | What It Does |
|-----------|----------|-------------|
| `AgentTool` | Multi-agent | Spawn child Claude instances |
| `AskUserQuestionTool` | Interaction | Ask user a question |
| `BashTool` | Execution | Run shell commands |
| `BriefTool` | Utility | Generate summaries |
| `ConfigTool` | Config | Read/write settings (internal) |
| `EnterPlanModeTool` | Planning | Switch to plan-then-act mode |
| `EnterWorktreeTool` | Git | Isolate work in git worktree |
| `ExitPlanModeTool` | Planning | Resume execution from plan mode |
| `ExitWorktreeTool` | Git | Leave the worktree |
| `FileEditTool` | Files | Partial file edits (string replace) |
| `FileReadTool` | Files | Read files (text, images, PDFs) |
| `FileWriteTool` | Files | Create or overwrite files |
| `GlobTool` | Search | File pattern matching |
| `GrepTool` | Search | ripgrep content search |
| `LSPTool` | Code Intel | Language Server Protocol queries |
| `ListMcpResourcesTool` | MCP | List MCP server resources |
| `MCPTool` | MCP | Call MCP server tools |
| `McpAuthTool` | MCP | Authenticate with MCP server |
| `NotebookEditTool` | Files | Edit Jupyter notebooks |
| `PowerShellTool` | Execution | Windows PowerShell commands |
| `REPLTool` | Execution | Node.js REPL (internal) |
| `ReadMcpResourceTool` | MCP | Read an MCP resource |
| `RemoteTriggerTool` | Remote | Trigger remote events |
| `ScheduleCronTool` | Scheduling | Create cron-style triggers |
| `SendMessageTool` | Multi-agent | Inter-agent communication |
| `SkillTool` | Skills | Execute workflow skills |
| `SleepTool` | Timing | Wait/pause in proactive mode |
| `SyntheticOutputTool` | Output | Produce structured output |
| `TaskCreateTool` | Tasks | Create background tasks |
| `TaskGetTool` | Tasks | Get task status |
| `TaskListTool` | Tasks | List all active tasks |
| `TaskOutputTool` | Tasks | Read task output |
| `TaskStopTool` | Tasks | Stop a running task |
| `TaskUpdateTool` | Tasks | Update task status |
| `TeamCreateTool` | Multi-agent | Create agent teams |
| `TeamDeleteTool` | Multi-agent | Dissolve agent teams |
| `TodoWriteTool` | Productivity | Manage todo lists |
| `ToolSearchTool` | Search | Find deferred tools by keyword |
| `WebFetchTool` | Web | Fetch URL content |
| `WebSearchTool` | Web | Search the internet |

---

## Key Concepts Glossary

| Term | Definition |
|------|-----------|
| **Tool** | A capability Claude can invoke (file operations, shell execution, etc.) |
| **Command** | A user-invoked `/slash-command` for direct control |
| **REPL** | Read-Evaluate-Print-Loop — the interactive terminal session |
| **Permission Context** | Object encoding all current permission rules |
| **MCP** | Model Context Protocol — standard for external tool connections |
| **LSP** | Language Server Protocol — code intelligence protocol |
| **Feature Flag** | Build-time or runtime toggles for features |
| **Skill** | A Markdown file with reusable workflow instructions for Claude |
| **Bridge** | Bidirectional CLI ↔ IDE communication system |
| **Coordinator** | Claude instance that orchestrates other agents |
| **Worker** | Claude sub-agent that executes specific tasks |
| **Context Window** | The maximum amount of text Claude can process at once |
| **Compact** | Context compression that summarizes old messages |
| **System Prompt** | Background instructions always provided to Claude |
| **CLAUDE.md** | Project-specific instructions file Claude always reads |
| **Worktree** | Isolated git working directory for safe experimentation |

---

## Minimal Tech Stack to Copy

To build a similar app, you need at minimum:

```json
{
  "runtime": "bun or node",
  "language": "TypeScript",
  "ai": "@anthropic-ai/sdk",
  "cli_parse": "commander",
  "terminal_ui": "chalk (simple) OR ink (rich)",
  "schema_validation": "zod",
  "process_execution": "execa"
}
```

See [Tutorial 10](./10-mvp-building-guide.md) for the complete MVP implementation.

---

*Generated: April 2026 | Based on Claude Code source code analysis*
