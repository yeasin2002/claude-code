# 01 — Product Overview: What is Claude Code?

> **Series:** Understanding Claude Code Source Architecture  
> **Level:** Beginner — No prior knowledge required

---

## What Is Claude Code?

Claude Code is Anthropic's **AI-powered CLI (Command Line Interface) tool** for software engineering. It lets developers interact with Claude — Anthropic's large language model — directly from the terminal to perform complex, real-world coding tasks.

Think of it as a pair programmer that lives in your terminal. You type a problem, and it reads, edits, and runs code on your behalf — safely, with your approval.

### The Core Idea

```
You (developer) ←→ Claude Code (CLI) ←→ Claude AI (LLM) ←→ Your codebase
```

Claude Code acts as the **bridge** between you and the AI. It handles:
- Sending your requests to Claude
- Letting Claude interact with your file system (read/write/edit)
- Running shell commands on your behalf
- Showing you what's happening with a rich terminal UI

---

## Why Was It Built?

Most AI coding tools integrate into an IDE (like VS Code Copilot). Claude Code is different:

| Aspect | Traditional IDE Plugin | Claude Code |
|--------|----------------------|-------------|
| Environment | IDE-specific | Terminal (works anywhere) |
| Control | Limited | Full file system + shell access |
| Automation | Single-action | Multi-step, multi-file workflows |
| Agent capability | Minimal | Full multi-agent coordination |
| Extensibility | IDE-dependent | Plugins + MCP servers |

The CLI approach means Claude Code works in Docker containers, SSH sessions, CI pipelines, and anywhere a terminal exists.

---

## What Can It Do?

### File Operations
Claude can read, write, and edit any file in your project. It understands the difference between creating a new file and making a precise edit to an existing one.

```
"Update the error handling in src/api/client.ts"
→ Claude reads the file, identifies the issue, makes a targeted edit, shows you the diff
```

### Run Shell Commands
Claude can execute terminal commands — with your permission:

```
"Run the test suite and fix any failing tests"
→ Claude runs `npm test`, reads the output, edits the failing files, runs tests again
```

### Search Your Codebase
Using ripgrep (a fast search tool), Claude can quickly find patterns, function definitions, or references across thousands of files:

```
"Find everywhere we handle authentication errors"
→ Claude searches all files and returns relevant matches
```

### Web Research
Claude can fetch web pages and search the web during a task:

```
"Update our code to use the new React 19 API"
→ Claude searches for React 19 release notes, then updates your code accordingly
```

### Spawn Sub-Agents
For complex tasks, Claude can create **child agents** that work in parallel:

```
"Refactor the entire backend to use async/await"
→ Claude spawns multiple sub-agents, each handling a different module in parallel
```

---

## Key Capabilities at a Glance

| Capability | Description |
|-----------|-------------|
| 🗂️ **File Operations** | Read, write, edit files with intelligence |
| 💻 **Command Execution** | Run shell commands with safety controls |
| 🔍 **Code Search** | ripgrep-powered fast search with glob patterns |
| 🌐 **Web Integration** | Fetch pages, run searches |
| 🤖 **Multi-Agent** | Spawn sub-agents for parallel workflows |
| 🧩 **Skill System** | Reusable workflow patterns (like macros) |
| 🔌 **MCP Integration** | Connect to external tools via protocol |
| 🗣️ **LSP Support** | Code intelligence via Language Server Protocol |
| 📋 **Task Management** | Create, track, execute dev tasks |
| 👥 **Team Mode** | Coordinate multiple AI agents as a team |

---

## How the User Experience Works

### 1. Start Claude Code
```bash
claude
```
A REPL (Read-Evaluate-Print Loop) opens in your terminal with a rich, colorful UI.

### 2. Give Instructions
You type natural language instructions:
```
> Fix the authentication bug in our login flow
```

### 3. Claude Plans and Acts
Claude thinks about the task, reads relevant files, and starts making changes. You see real-time progress:
```
✓ Reading src/auth/login.ts
✓ Found issue on line 42: missing token validation
✓ Editing src/auth/login.ts
  - if (user) { return token }
  + if (user && validateToken(token)) { return token }
```

### 4. You Approve Changes
Dangerous operations (file writes, shell commands) require your approval before executing. You can:
- **Approve once** — allow this specific action
- **Always allow** — allow all future similar actions
- **Deny** — reject the action

### 5. Iterate
The conversation continues. You can refine, ask follow-up questions, or start new tasks.

---

## Slash Commands

Beyond natural language, Claude Code has special `/commands` you can type:

| Command | What It Does |
|---------|-------------|
| `/commit` | Create a git commit of staged changes |
| `/review` | Code review of recent changes |
| `/config` | View/change settings |
| `/doctor` | Diagnose environment issues |
| `/memory` | Manage Claude's persistent memory |
| `/mcp` | Manage MCP server connections |
| `/cost` | View token usage and cost |
| `/diff` | View recent file changes |
| `/compact` | Compress the conversation context |
| `/skills` | Manage reusable skills |
| `/vim` | Toggle vim keybinding mode |

There are over 50 such commands in the codebase.

---

## What Makes It Special?

### 1. Permission-First Safety
Every action Claude takes is governed by a permission system. You're always in control — no file is written, no command is run without either your approval or an explicit rule you've set.

### 2. Multi-Agent Coordination
Claude Code can spawn child "sub-agents" — separate instances of Claude — that work in parallel on different parts of a task. This enables complex, parallel workflows that would be impossible with a single AI context.

### 3. Skill System
You can create **skills** — reusable workflows (like a recipe) that Claude can follow. These are Markdown files with instructions that Claude reads and executes. They're bundled into the binary or loaded from your file system.

### 4. Plugin + MCP Architecture
Claude Code extends itself through:
- **Plugins**: Third-party feature bundles
- **MCP Servers**: External tools that Claude can call (like a browser, database, etc.) using the Model Context Protocol

### 5. IDE Integration
Despite being a CLI, Claude Code bridges into IDEs like VS Code and JetBrains via a **bridge system** — enabling it to show diffs, receive file selections, and coordinate with the editor.

---

## Scale of the Codebase

This source code snapshot gives insight into how large and complex a real-world AI tool gets:

| Metric | Count |
|--------|-------|
| Total files | ~1,900 |
| Lines of code | 512,000+ |
| Agent tools | ~40 |
| User commands | ~50+ |
| UI components | ~140 |
| Key dependencies | 35+ packages |

---

## Next Steps

Now that you understand **what** Claude Code is, the next tutorials will cover:

- **02 — Tech Stack**: What technologies power it and why they were chosen
- **03 — Architecture Overview**: How the layers fit together
- **04 — Tool System**: The heart of how Claude takes actions
- **05 — Command System**: How slash commands work
- ...and more

---

*Source references: `README.md`, `AGENTS.md`, `src/main.tsx`, `src/commands.ts`, `src/tools.ts`*
