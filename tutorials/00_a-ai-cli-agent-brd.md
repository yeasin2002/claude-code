# Business Requirements Document
## AI CLI Coding Agent — MVP & Roadmap

| Field | Value |
|-------|-------|
| **Document ID** | BRD-CLI-001 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Document Type** | Product BRD + MVP Guidelines |
| **Author** | Product Owner |
| **Created** | April 2026 |
| **Reviewed By** | — |

---

> **Purpose:** This document defines what to build, why to build it, and how to measure success — written in business language for decision-making and planning. It is not a technical specification. Code, file structures, and implementation details live in a separate Technical Design Document. Everything here can be understood and acted on without writing a single line of code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market & Competitive Analysis](#2-market--competitive-analysis)
3. [Product Vision & Strategic Objectives](#3-product-vision--strategic-objectives)
4. [Stakeholder Map](#4-stakeholder-map)
5. [MVP Scope — What We Build First](#5-mvp-scope--what-we-build-first)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture in Plain Language](#8-system-architecture-in-plain-language)
9. [Phased Delivery Roadmap](#9-phased-delivery-roadmap)
10. [Constraints & Dependencies](#10-constraints--dependencies)
11. [Risk Register](#11-risk-register)
12. [Success Metrics & Acceptance Criteria](#12-success-metrics--acceptance-criteria)
13. [Open Questions & Decisions Needed](#13-open-questions--decisions-needed)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

This document outlines requirements for building a proprietary **AI CLI Coding Agent** — a terminal-based tool where a developer describes what they want in plain English, and an AI carries out the work: reading code, editing files, running commands, and searching the codebase. The product competes in a category validated by Anthropic (Claude Code), Google (Gemini CLI), OpenAI (Codex CLI), and the community (OpenCode, Qwen Code) — each of which has reached tens of thousands of developers.

The key differentiator of this product is **ownership**. Unlike commercial tools, this agent is fully owned, fully extensible, and not locked to any single AI provider or hosting platform. The architecture is designed to grow from a four-tool MVP into a full-featured coding assistant with memory, a plugin ecosystem, and protocol-level integrations.

**MVP delivers in one sprint:** a working interactive terminal agent with file read, file edit, shell execution, and code search — with a human-approval safety gate before any destructive action, real-time streaming output, and persistent conversation context within a session.

---

## 2. Market & Competitive Analysis

### 2.1 Market Context

The AI coding agent category has matured rapidly since 2024. The pattern is now established: an agent lives in the terminal, accepts natural language, executes real actions on the codebase, and streams its reasoning back to the developer in real time. The four major open-source implementations provide a detailed map of what the market expects.

### 2.2 Competitor Profiles

---

#### OpenCode (`sst/opencode`)
**Stars:** ~122k | **Language:** TypeScript / Bun | **License:** MIT

OpenCode is built for the terminal with a TUI (terminal user interface) using Bubble Tea for a smooth terminal experience. It supports multiple AI providers: OpenAI, Anthropic Claude, Google Gemini, AWS Bedrock, Groq, Azure OpenAI, and OpenRouter. Built-in tools include shell execution, file editing via exact string replacement, search via ripgrep, and web fetch. It stores conversations in a SQLite database for persistent session management across terminal restarts.

OpenCode uses a dual-agent architecture that separates planning from code generation. The Plan agent operates in read-only mode for exploration and discussion, while the Build agent writes code, creates files, and runs commands. This prevents the common problem of AI agents diving into implementation before understanding the architecture.

OpenCode has LSP (Language Server Protocol) support providing code intelligence features — type checking, diagnostics, and file watching. Hooks run at specific lifecycle moments: before a tool executes (for validation), after a tool completes (for formatting or logging), and when a session ends.

**Key Differentiators:** Dual-agent Plan/Build mode, SQLite session persistence, 75+ provider support, LSP integration, hooks system, AGENTS.md project memory, auto-compact for long sessions.

---

#### Gemini CLI (`google-gemini/gemini-cli`)
**Stars:** ~98k | **Language:** TypeScript / Node.js | **License:** Apache 2.0

Gemini CLI features include checkpointing (automatic session snapshots), headless mode for scripting, hooks to customize CLI behavior, IDE integration, MCP server connectivity, model routing with automatic fallback, plan mode (a safe read-only mode for planning), subagents, remote subagents, session rewind and replay, and sandboxing for isolated tool execution.

Plan Mode transforms Gemini CLI into a read-only researcher. The agent explores the codebase and external documentation to create a structured plan. The user reviews and approves the plan before the agent switches to execution mode. Skills load specialized knowledge only when triggered — like "library books on a shelf." Hooks are scripts that run at specific lifecycle points, such as checking if a dev server is running on startup or running security guards before tool calls.

Sandboxing features include native macOS Seatbelt, Linux bubblewrap/seccomp, native Windows sandboxing, gVisor (runsc), and experimental LXC container support. Git worktree support allows isolated parallel sessions. Plan Mode is enabled by default since v0.34.0.

**Key Differentiators:** Plan Mode as default, PTY (pseudo-terminal) support for interactive programs, multi-layer OS sandboxing, checkpointing/restore, git worktree sessions, 1M token context, free tier (1,000 req/day with Google account).

---

#### Qwen Code (`QwenLM/qwen-code`)
**Stars:** ~18k | **Language:** TypeScript / Node.js | **License:** Apache 2.0

Qwen Code is a direct fork of Gemini CLI adapted for Alibaba's Qwen3-Coder models. It inherits the full Gemini CLI feature set while adding multi-protocol authentication (OpenAI-compatible APIs, Anthropic, Google GenAI, or Qwen OAuth for 1,000 free requests/day), skills, subagents, web search, hooks, and VS Code/Zed/JetBrains IDE integration.

**Key Differentiators:** Free tier via Qwen OAuth, model-agnostic despite being optimised for Qwen3-Coder, inherits Gemini CLI's mature sandboxing and plan mode, fastest-growing agent in this list by star velocity.

---

#### open-codex (`ymichael/open-codex`)
**Stars:** ~2.2k | **Language:** TypeScript / Node.js | **License:** Apache 2.0

A lightweight fork of OpenAI's original Codex CLI (before OpenAI rewrote it in Rust). Replaces the proprietary Responses API with standard Chat Completions, enabling multi-provider support: OpenAI, Gemini, OpenRouter, and Ollama. Intentionally minimal — fast setup, no heavy framework.

**Key Differentiators:** Simplest entry point, works with any OpenAI-compatible endpoint, no native compilation required, suitable as a learning reference.

---

### 2.3 Feature Comparison Matrix

| Feature | OpenCode | Gemini CLI | Qwen Code | open-codex | **Our Target** |
|---------|:--------:|:----------:|:---------:|:-----------:|:--------------:|
| Interactive REPL | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Real-time streaming | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| File read / edit | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Shell execution | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Code search (ripgrep) | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Permission gate | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Multi-provider support | ✅ 75+ | ✅ Gemini | ✅ Multi | ✅ Multi | ✅ Phase 1 |
| Session persistence | ✅ SQLite | ✅ | ✅ | ❌ | Phase 3 |
| Project memory (AGENTS.md) | ✅ | ✅ GEMINI.md | ✅ .qwen | ❌ | Phase 3 |
| Hooks system | ✅ | ✅ | ✅ | ❌ | Phase 5 |
| Skills system | ✅ | ✅ | ✅ | ❌ | Phase 5 |
| Plan mode (read-only explore) | ✅ | ✅ Default | ✅ | ❌ | Phase 6 |
| LSP integration | ✅ | ❌ | ❌ | ❌ | Phase 7 |
| Subagents | ✅ | ✅ | ✅ | ❌ | Phase 8 |
| MCP support | ✅ | ✅ | ✅ | ❌ | Phase 4 |
| OS-level sandboxing | ❌ | ✅ | ✅ | ❌ | Phase 6 |
| Checkpointing / restore | ❌ | ✅ | ✅ | ❌ | Phase 6 |
| Web search | ✅ Exa | ✅ | ✅ | ❌ | Phase 4 |
| Plugin system | ✅ | ✅ Extensions | ❌ | ❌ | Phase 7 |
| Headless / CI mode | ✅ | ✅ | ✅ | ✅ | ✅ MVP |
| Git worktree sessions | ❌ | ✅ | ❌ | ❌ | Phase 8 |

### 2.4 Competitive Gaps We Can Fill

Studying the competition reveals three under-served areas that differentiate an independent agent:

**Better onboarding for small teams.** OpenCode and Gemini CLI are comprehensive but require significant configuration effort before they feel productive. An MVP that works well immediately — zero config, sensible defaults — wins the trial-to-adoption conversion.

**Cleaner extensibility story.** The plugin and hook systems in existing tools are powerful but underdocumented. A product that ships a skills authoring guide as a first-class deliverable (not an afterthought) will win contribution and community faster.

**Language Server integration as a default, not an add-on.** Only OpenCode has LSP support among the four; even there it's a configuration task. An agent that comes with LSP diagnostics wired out of the box provides meaningfully smarter code understanding from day one.

---

## 3. Product Vision & Strategic Objectives

### 3.1 Vision Statement

A developer-owned, cross-platform AI coding agent that does real coding work in the terminal, understands the codebase with intelligence beyond raw text search, can be extended without forking the core, and never requires a third-party hosting account to run.

### 3.2 Strategic Objectives

| # | Objective | Why It Matters |
|---|-----------|----------------|
| **O1** | Deliver a working MVP that covers the four core tools (read, edit, shell, search) with streaming and permission safety | Establishes the foundational interaction loop that every future feature is built on top of |
| **O2** | Design the tool interface as a registry from day one — each capability is a self-contained module | The single most important architectural decision; prevents the codebase from becoming a ball of mud as features are added |
| **O3** | Make the LLM provider replaceable via a single adapter swap | Vendor lock-in at the API level is the most expensive technical debt this product can accumulate |
| **O4** | Ship project memory and session persistence before any UI polish work | These two features provide more daily value per hour of engineering than any visual improvement |
| **O5** | Build the skills and hooks system before the plugin system | Skills and hooks are lower risk and higher adoption; they validate the extensibility model before investing in the full plugin infrastructure |
| **O6** | Reach feature parity with OpenCode's core feature set within three phases | Parity is the threshold at which a developer can choose this product over the established alternative on merit, not loyalty |

### 3.3 Product Principles

**Safety is non-negotiable.** No action that modifies the filesystem, executes a shell command, or makes a network request ever runs without an explicit approval pathway. This is the one constraint that overrides all product convenience trade-offs.

**Every feature is a tool.** The agent's capabilities grow by adding modules to a registry, not by modifying the orchestration core. This principle must be defended aggressively as the product ages.

**Defaults over configuration.** The agent should work well immediately for the majority of users without requiring any configuration files. Configuration exists to tune, not to enable.

**The project memory file is the product's memory.** Teaching users to write a good `AGENTS.md` is the highest-leverage onboarding activity. Most of the agent's per-project intelligence comes from this file, not from the LLM's training data.

---

## 4. Stakeholder Map

### 4.1 Primary

| Stakeholder | Role | Primary Interest |
|-------------|------|-----------------|
| **Product Owner / Builder** | Single decision-maker, primary developer | Architectural control, delivery speed, extensibility |
| **End User (Developer)** | Daily terminal user | Reliable execution, transparent safety, fast responses, predictable behaviour |
| **AI Provider (Anthropic / OpenAI / Google)** | External API dependency | Stable API, rate limit compliance, billing |

### 4.2 Secondary

| Stakeholder | Interest |
|-------------|---------|
| Future team members or contributors | Clean codebase, well-documented tool interface, low onboarding friction |
| OSS community (if open-sourced) | Permissive licence, extensible plugin contract, documented protocols |
| Organisations adopting internally | Config management, audit logging, permission policy controls |

### 4.3 What Primary Users Actually Need

The primary user expects the agent to behave like a knowledgeable pair programmer. Specifically:

- It reads the right files before suggesting changes, not random files.
- It asks before touching anything. No surprises in production code.
- When it makes a mistake, the mistake is recoverable — via the permission gate, git history, or a checkpoint/restore capability.
- It gets faster and more useful the longer it's been on a project, because project memory compounds.
- It works the same way on their MacBook, their Linux server, and in CI.

---

## 5. MVP Scope — What We Build First

### 5.1 In Scope for MVP

The MVP is the smallest set of capabilities that makes the agent genuinely useful for a real coding task. Nothing ships until every item below works correctly together.

| Capability | What It Does |
|-----------|-------------|
| **Interactive REPL** | Persistent terminal session that accepts natural language, maintains conversation history, and handles slash commands |
| **Real-time streaming** | Responses appear token by token as the LLM generates them — no waiting for a full response |
| **File Read** | Agent reads any text file and includes its content as context for the LLM |
| **File Edit** | Agent applies targeted text replacements to existing files; confirms the target string exists before writing |
| **Shell Execution (Bash Tool)** | Agent runs shell commands and returns stdout and stderr output; always requires explicit approval |
| **Code Search (Grep Tool)** | Agent searches for patterns across the codebase using ripgrep (falls back to grep) with file paths and line numbers |
| **Permission Gate** | Before any destructive action, the agent pauses, shows the user what it's about to do in plain language, and requires Allow or Deny |
| **Session History** | All messages in a session are tracked and passed to the LLM on every turn, preserving context across multiple exchanges |
| **Headless / Non-interactive Mode** | A `--print` flag enables one-shot execution from scripts or CI with no interactive session required |
| **Bash-disable Flag** | `--no-bash` removes the shell execution tool from the active set, making the agent safe for untrusted contexts |

### 5.2 Explicitly Out of Scope for MVP

These are real requirements — but they belong in a later phase. Adding any of these to Phase 1 risks delaying the working core.

- Multi-agent or subagent coordination
- IDE bridge or editor extension
- MCP server connectivity
- Plugin loading from disk
- Voice input or output
- Project memory file (AGENTS.md)
- Session persistence to disk
- Configuration file
- Sandboxing (Docker / OS-level)
- Web fetch or web search
- Plan mode (read-only explore)
- Checkpointing and restore
- LSP integration

### 5.3 MVP Quality Bar

The MVP is done when a developer can sit down with no documentation and within five minutes be able to:

1. Launch the agent with their API key
2. Ask it to read a file and summarise what it does
3. Ask it to make a specific edit, see the permission prompt, approve it, and verify the file changed correctly
4. Ask it to run a test suite and read the output
5. Search for a function across the codebase and get accurate results
6. Exit cleanly

If any of those five steps fails or requires guessing, the MVP is not done.

---

## 6. Functional Requirements

Requirements are labelled by delivery phase. Phase 1 = MVP; later phases follow the roadmap in Section 9.

---

### 6.1 Entry Point & Launch Behaviour

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-01 | The system reads the AI provider API key from an environment variable. If absent or malformed, it exits with a clear, actionable error message before launching | 1 |
| FR-02 | The system launches in interactive REPL mode by default and in headless mode when the `--print <message>` flag is supplied | 1 |
| FR-03 | On startup in interactive mode, the system displays the product name, version, active tools list, and available slash commands | 1 |
| FR-04 | The `--no-bash` flag removes the shell execution tool from the active toolset at launch — no config file required | 1 |
| FR-05 | The `--model <id>` flag overrides the default LLM model for this session | 1 |
| FR-06 | The `--help` flag displays a description of all CLI flags and exits | 1 |

---

### 6.2 Interactive REPL Behaviour

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-07 | The REPL presents a prompt indicator, accepts natural language input, and passes it to the LLM | 1 |
| FR-08 | The REPL maintains all messages in a conversation array for the session duration and passes the full array to the LLM on every turn | 1 |
| FR-09 | `/clear` flushes conversation history and clears the terminal display | 1 |
| FR-10 | `/exit` or `/quit` gracefully terminates the session | 1 |
| FR-11 | `/help` displays all slash commands and a brief description of each registered tool | 1 |
| FR-12 | `/tools` lists all active tools with name and description | 1 |
| FR-13 | Empty input (Enter with no text) is silently ignored with no LLM call | 1 |
| FR-14 | `/history` displays previous messages in the current session | 2 |
| FR-15 | `/model` displays the current model and allows interactive switching between configured providers | 3 |

---

### 6.3 LLM Communication & Streaming

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-16 | The system streams LLM response tokens to the terminal as they arrive — first token must appear within 3 seconds of input submission | 1 |
| FR-17 | The system sends all registered tool schemas to the LLM with each request | 1 |
| FR-18 | When the LLM emits a tool call, the system intercepts it, routes it through the permission gate, executes the tool if approved, and passes the result back to the LLM | 1 |
| FR-19 | The LLM communication loop continues (tool call → permission → execution → result → LLM) until the model produces a final text response with no further tool calls | 1 |
| FR-20 | A configurable maximum iteration count (default: 10) prevents infinite agentic loops | 1 |
| FR-21 | API errors (rate limit, network failure, invalid response) are caught, displayed as human-readable messages, and do not crash the REPL | 1 |
| FR-22 | The LLM provider is accessed through a provider adapter interface. Changing providers requires only swapping the adapter, not modifying tool or REPL code | 1 |

---

### 6.4 Core Tool Specifications

#### File Read Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-23 | Reads the contents of any text file from a given path and returns them to the LLM | 1 |
| FR-24 | Files exceeding 500 lines are truncated to the first 500 lines with a notice appended showing the total line count | 1 |
| FR-25 | Reading a file does not require user approval — it is a safe, read-only action | 1 |
| FR-26 | Returns a descriptive error (file not found, permission denied) without crashing when the path is invalid | 1 |

#### File Edit Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-27 | Performs an exact-string replacement in a target file | 1 |
| FR-28 | Before writing, verifies the target string exists in the file. If it does not, returns an error and makes no change to the file | 1 |
| FR-29 | File edits always require user approval through the permission gate | 1 |
| FR-30 | The permission prompt shows the file path and the first few lines of the text being replaced | 1 |

#### Shell Execution (Bash) Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-31 | Executes arbitrary shell commands and returns stdout and stderr combined | 1 |
| FR-32 | Shell commands are always subject to user approval — there is no auto-approve override for shell execution | 1 |
| FR-33 | Commands are subject to a 30-second execution timeout. Timed-out commands are terminated and the timeout is reported as a tool error | 1 |
| FR-34 | Output is capped at 1 MB per execution. Output exceeding this limit is truncated with a warning | 1 |
| FR-35 | The `--no-bash` flag at launch removes this tool from the available toolset entirely | 1 |

#### Code Search (Grep) Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-36 | Searches for a regex pattern across a directory tree and returns matching lines with file paths and line numbers | 1 |
| FR-37 | Uses ripgrep when available; falls back to grep automatically when ripgrep is not installed | 1 |
| FR-38 | An optional file glob parameter restricts the search to matching file types (e.g., `*.ts`, `*.py`) | 1 |
| FR-39 | Returns "No matches found" cleanly rather than an error when the pattern is not present | 1 |

#### File Write Tool (New File Creation)
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-40 | Creates a new file at a specified path with provided content | 4 |
| FR-41 | Writing a new file requires user approval | 4 |
| FR-42 | If the target path already exists, presents the conflict to the user and requires explicit overwrite confirmation | 4 |

#### Glob Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-43 | Lists all files matching a glob pattern within a directory tree | 4 |
| FR-44 | Respects `.gitignore` patterns by default | 4 |

#### Web Fetch Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-45 | Retrieves the readable text content of a URL, stripping HTML and returning plain text | 4 |
| FR-46 | Respects a configurable timeout and output size limit consistent with other tools | 4 |

#### Web Search Tool
| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-47 | Queries a configured search API and returns result titles, URLs, and summaries | 4 |

---

### 6.5 Permission System

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-48 | Before executing any tool classified as destructive or side-effecting, the system pauses and presents the proposed action to the user in plain English | 1 |
| FR-49 | The permission prompt offers three explicit options: Allow Once (this call only), Always Allow (all future calls to this tool in this session), and Deny (skip and return a reason to the LLM) | 1 |
| FR-50 | "Always Allow" state is held in session memory only. It does not survive process restart unless written to a settings file | 1 |
| FR-51 | When a tool call is denied, the LLM receives a clear denial message and continues the conversation, allowing it to propose an alternative approach | 1 |
| FR-52 | The shell execution tool always requires fresh approval regardless of "Always Allow" state. There is no mechanism to permanently auto-approve shell commands in the MVP | 1 |
| FR-53 | A rule-based permission system (pre-approve patterns, e.g., "always allow reads in `/src`") is configurable via settings | 7 |

---

### 6.6 Terminal Output & Rendering

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-54 | User messages and agent responses are visually distinct from each other | 1 |
| FR-55 | Tool invocations are shown inline during execution — tool name and input parameters appear before the result | 1 |
| FR-56 | Error messages appear in a distinct colour (red) with actionable guidance | 1 |
| FR-57 | A loading indicator appears while waiting for the LLM to respond | 2 |
| FR-58 | Markdown in LLM responses is rendered in terminal-readable format rather than as raw syntax | 2 |
| FR-59 | Long tool outputs are displayed with truncation at a configurable line limit, with an option to expand | 3 |

---

### 6.7 Project Memory (AGENTS.md)

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-60 | On startup, the agent reads an `AGENTS.md` file from the project root and injects its contents into the system prompt | 3 |
| FR-61 | The memory file can include project-specific instructions, conventions, common patterns, and any other context the developer wants the agent to always know | 3 |
| FR-62 | The memory file is optional. Its absence does not affect agent behaviour | 3 |
| FR-63 | A `/init` command generates a suggested `AGENTS.md` by analysing the project structure and producing a first-draft context document | 3 |

---

### 6.8 Skills System

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-64 | Skills are Markdown files stored in `~/.agent/skills/` (global) or `.agent/skills/` (project-level) | 5 |
| FR-65 | Each skill contains reusable prompt instructions invocable by name within the REPL | 5 |
| FR-66 | Skills are loaded on demand when explicitly invoked, not injected into every session (progressive disclosure) | 5 |
| FR-67 | The agent lists available skills in `/help` output | 5 |
| FR-68 | A built-in `/skill new` command guides the user through creating a new skill interactively | 5 |

---

### 6.9 Hooks System

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-69 | Hooks are scripts or functions that execute at specific lifecycle events: before a tool call, after a tool call, and at session end | 5 |
| FR-70 | `BeforeToolCall` hooks can inspect the proposed tool call and optionally cancel it with a reason | 5 |
| FR-71 | `AfterToolCall` hooks receive the tool result and can trigger side effects (logging, formatting, notifications) | 5 |
| FR-72 | Hook configuration is defined in the settings file under a dedicated `hooks` section | 5 |

---

### 6.10 Plan Mode (Explore-then-Execute)

| ID | Requirement | Phase |
|----|-------------|:-----:|
| FR-73 | Plan mode is a read-only session state where the agent can explore the codebase and external documentation but cannot execute writes or shell commands | 6 |
| FR-74 | The agent produces a structured plan (a numbered list of proposed actions with rationale) before requesting permission to begin execution | 6 |
| FR-75 | The user reviews and approves the plan before the agent switches to execution mode | 6 |
| FR-76 | Plan mode can be activated via a `/plan` command or a keyboard shortcut | 6 |
| FR-77 | Plan mode is enabled by default for first-time users; experienced users can disable it in settings | 6 |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-01 | The first token of an LLM response appears within 3 seconds of input submission under normal network conditions |
| NFR-02 | Shell commands are terminated after 30 seconds and the timeout is reported as an error |
| NFR-03 | Tool output is capped at 1 MB per call; output exceeding this is truncated with a warning |
| NFR-04 | Files larger than 500 lines are truncated at read time; the full file is never unnecessarily held in memory |
| NFR-05 | The REPL remains responsive during tool execution — the event loop must not block |

### 7.2 Reliability & Safety

| ID | Requirement |
|----|-------------|
| NFR-06 | Unhandled exceptions in any tool are caught, returned to the LLM as a tool error, and never crash the REPL |
| NFR-07 | The file edit tool verifies the target string exists before writing — a failed check produces zero side effects |
| NFR-08 | API key validation occurs at startup before any user interaction begins |
| NFR-09 | No code path bypasses the permission gate for destructive operations |
| NFR-10 | The agentic loop hard-stops at 10 iterations maximum. This prevents runaway execution and unexpected token consumption |

### 7.3 Security

| ID | Requirement |
|----|-------------|
| NFR-11 | API keys are read exclusively from environment variables. They are never written to disk, logged, or included in any output |
| NFR-12 | Shell commands execute within the user's current working directory context with no automatic privilege escalation |
| NFR-13 | `--no-bash` provides a deterministic restricted mode safe for CI environments |
| NFR-14 | File operations are constrained to paths accessible by the running process |

### 7.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-15 | All error messages are written in plain English and include actionable guidance (e.g., "Set your API key: export API_KEY=...") |
| NFR-16 | Permission prompts describe the proposed action in plain language, not internal JSON or schema notation |
| NFR-17 | The `/help` command is comprehensive enough for a first-time user without external documentation |
| NFR-18 | The agent is installable via a single npm/bun command with no manual build steps |

### 7.5 Maintainability & Extensibility

| ID | Requirement |
|----|-------------|
| NFR-19 | Adding a new tool requires creating one new module file and registering it — no changes to any existing module |
| NFR-20 | The LLM communication layer, tool system, permission gate, REPL, and rendering layer have no direct dependencies on each other |
| NFR-21 | The codebase is fully typed in TypeScript with strict mode. No `any` types in public interfaces |
| NFR-22 | Unit tests cover tool execute functions, permission logic, and input validation |

### 7.6 Cross-Platform Compatibility

| ID | Requirement |
|----|-------------|
| NFR-23 | The agent runs on macOS (Intel and Apple Silicon), Linux (x86\_64 and ARM), and Windows (via WSL2 minimum) |
| NFR-24 | The agent supports Node.js ≥18 and Bun ≥1.0 as runtime environments |
| NFR-25 | No mandatory cloud service dependency beyond the AI provider API — no Vercel account, no GitHub account, no proprietary gateway |

---

## 8. System Architecture in Plain Language

This section describes what each part of the system does and how the parts relate to each other — without any implementation detail. Think of it as an org chart for the software.

### 8.1 The Six Components

**Entry Point** is the front door. It reads the environment, validates the API key, registers the initial tools, and decides whether to launch the interactive REPL or the headless mode. It is intentionally thin — all real work happens in the layers below.

**Interactive REPL** is the conversation manager. It reads what the developer types, handles slash commands internally (these never reach the LLM), maintains the message history for the session, and delegates everything else to the LLM Communication Layer.

**LLM Communication Layer** is the orchestration engine — the brain of the system. It constructs the full prompt (history + tool schemas + system context), calls the AI provider, streams the response to the Rendering Layer, detects when the LLM requests a tool, routes that request to the Permission Gate, and manages the loop until the LLM reaches a final response. This is the only component that talks to external AI services.

**Permission Gate** is the safety checkpoint. When the LLM requests a tool that is classified as destructive, execution stops here. The gate shows the user what is about to happen, collects their decision, and either allows execution or returns a denial to the LLM. It also tracks session-level "always allow" decisions.

**Tool Registry** is the capability catalogue. It holds references to all registered tools, formats their schemas for the AI provider API, and routes incoming tool requests to the right handler. Adding a new capability means registering it here — nothing else changes.

**Rendering Layer** is the visual output manager. It receives events (user messages, AI text, tool invocations, tool results, errors) and turns them into styled terminal output. It knows nothing about business logic — it only receives display instructions.

### 8.2 How One Developer Turn Works (Data Flow)

```
Developer types message and presses Enter
    ↓
REPL appends message to history array
    ↓
LLM Communication Layer builds full prompt (history + tools + system context)
    ↓
LLM API responds — streaming tokens arrive
    ↓
Rendering Layer displays tokens in real time
    ↓
IF the LLM requests a tool:
    Permission Gate receives the request
        → IF approved: Tool Registry dispatches to the tool; result returned to LLM
        → IF denied:  Denial reason returned to LLM
    LLM processes the result and continues responding
    Loop repeats until no further tool calls
    ↓
Final response complete → history updated → REPL prompts for next input
```

### 8.3 The Provider Adapter Pattern

The LLM Communication Layer never calls an AI provider SDK directly. It calls a **Provider Adapter interface** — a thin wrapper that knows how to talk to one specific provider. The current default adapter points to Anthropic. Switching to OpenAI, Google Gemini, or Ollama means swapping the adapter — the rest of the system is unaffected.

This is the single most important architectural decision in the entire product. Getting it right in Phase 1 prevents the most expensive form of technical debt.

### 8.4 The Tool Interface Contract

Every tool — current and future — must implement the same five-field contract:

- **Name** — the identifier the LLM uses when calling this tool
- **Description** — what the tool does, written for the LLM to understand
- **Input schema** — what parameters the tool accepts (validated against this before execution)
- **Execute function** — the actual work the tool performs
- **Permission classifier** — declares whether this tool requires human approval before running

As long as a new tool implements these five fields, it slots into the system with zero changes to any other component.

---

## 9. Phased Delivery Roadmap

Each phase is self-contained. No phase should break the interface of the one before it. New capabilities are additions, not rewrites.

---

### Phase 1 — MVP: The Working Core

**Theme:** A usable agent today. The absolute minimum to be genuinely helpful.

**Delivers:**
- Interactive REPL with slash commands (`/clear`, `/exit`, `/help`, `/tools`)
- Four core tools: File Read, File Edit, Shell Execution, Code Search
- Real-time streaming responses
- Human-in-the-loop permission gate (Allow Once / Always Allow / Deny)
- Session conversation history
- Headless mode (`--print` flag)
- `--no-bash` safety flag
- Basic error handling that does not crash on API failures

**Definition of Done:** A developer can complete a real coding task (read → understand → edit → verify → search) in a single session with all permission prompts appearing correctly.

---

### Phase 2 — Terminal UX: First Impressions

**Theme:** The agent looks and feels like a professional tool.

**Delivers:**
- Loading spinner during LLM response
- Colour-coded output: user input, AI response, tool calls, results, errors each have distinct visual treatment
- Markdown in AI responses rendered in human-readable terminal format
- Migration to a component-based TUI framework for richer rendering

**Why Now:** First impressions drive adoption. A visually noisy or cluttered terminal erodes trust before the user evaluates the agent's actual capabilities.

---

### Phase 3 — Memory: The Agent Learns the Project

**Theme:** The agent remembers between sessions and across turns without being re-taught.

**Delivers:**
- `AGENTS.md` project memory file — agent reads it at startup and uses it as system context
- `/init` command that generates a first-draft `AGENTS.md` by analysing the project structure
- Global settings file (`~/.agent/settings.json`) persisting preferences across sessions
- Per-project settings file (`.agent/settings.json`) overriding global settings for that project
- Session persistence to SQLite — conversations survive terminal restarts
- `/history` command listing recent sessions

**Why Now:** Without memory, the agent restarts fresh every session. With `AGENTS.md`, the agent's usefulness compounds every time the developer adds a note. This is the highest-value feature after the MVP core.

---

### Phase 4 — Tool Expansion: Real-World Capability

**Theme:** The agent can handle the full range of common coding assistant tasks.

**Delivers:**
- File Write Tool (create new files — with approval)
- Glob Tool (list files by pattern, respects `.gitignore`)
- Web Fetch Tool (retrieve readable content from a URL)
- Web Search Tool (query a search API; useful for unfamiliar APIs and current documentation)
- MCP (Model Context Protocol) server connectivity — connect to any compatible external tool server

**Why Now:** File Write and Glob are prerequisites for real scaffolding work ("create a new feature module"). Web Fetch and Search extend the agent's utility to developers working with unfamiliar APIs. MCP opens the ecosystem.

---

### Phase 5 — Skills & Hooks: Workflow Automation

**Theme:** Users can teach the agent how to work on their project.

**Delivers:**
- **Skills** — Markdown files in `~/.agent/skills/` or `.agent/skills/`. Each skill is a reusable prompt instruction set invocable by name within the session.
- **Built-in skill creator** — A `/skill new` interactive guide that walks the user through writing their first skill
- **Hooks** — Scripts or functions that execute at lifecycle events: before a tool call, after a tool call, at session start, at session end
- BeforeToolCall hooks can inspect and optionally cancel proposed tool calls
- AfterToolCall hooks can trigger side effects (logging, formatting, running tests after a file edit)

**Why Now:** Skills are the first step toward teams sharing reusable workflows. Hooks are the first step toward policy enforcement and automation. Together they dramatically expand what a single developer can automate.

---

### Phase 6 — Plan Mode & Safety: Enterprise-Grade Control

**Theme:** The agent plans before it acts; actions are reversible.

**Delivers:**
- **Plan Mode** — Read-only exploration state; agent proposes a numbered plan for review before executing any writes
- **Checkpointing** — Automatic project snapshots before any file modification; `/restore` to revert
- **OS-level sandboxing** — Docker/Podman, macOS Seatbelt (sandbox-exec), Linux bubblewrap for process isolation
- **Git worktree sessions** — Each agent session can run in an isolated git worktree to prevent conflicts
- Plan Mode enabled by default for new users

**Why Now:** Plan Mode is now the default in Gemini CLI and expected by developers who have used it. Checkpointing is the safety net that makes users comfortable giving the agent larger tasks. Sandboxing is a requirement for any team context where the agent is running against codebases it shouldn't have unrestricted access to.

---

### Phase 7 — LSP & Configuration: Intelligent Code Understanding

**Theme:** The agent understands code structure, not just text.

**Delivers:**
- **LSP (Language Server Protocol) integration** — Connect to language servers for each configured language; agent gains access to type information, diagnostics, cross-file references, and symbol navigation
- **Diagnostics tool** — Agent can request the current error and warning list from the LSP before and after edits
- **Extended configuration schema** — Model selection per agent role, per-tool permission patterns, maximum loop iterations, output verbosity, sandboxing policy
- **Rule-based permission system** — Pre-approve specific tool patterns in settings (e.g., "always allow reads in `/src`")

**Why Now:** Only OpenCode offers LSP among the four competitors, and it's still configuration-required. Shipping it with sensible defaults is a genuine differentiator. Extended configuration is the threshold at which teams can standardise agent behaviour across contributors.

---

### Phase 8 — Subagents & Plugin System: Ecosystem Scale

**Theme:** The agent becomes a platform.

**Delivers:**
- **Subagents** — The orchestrator agent can spawn specialised subagents for distinct tasks (one for planning, one for writing tests, one for documentation)
- **Plugin system** — Plugin discovery from `~/.agent/plugins/` (global) or `.agent/plugins/` (project-level). Each plugin has a manifest declaring its name, version, description, and the tools it provides
- **Plugin authoring SDK** (`@agent/plugin`) — Published package for building plugins independently of the core
- **Git worktree sessions** — Parallel agent sessions isolated to separate branches (if not delivered in Phase 6)

**Why Now:** Subagents multiply the agent's capability for complex tasks without increasing the complexity of the core interaction loop. The plugin system is the product's long-term moat — every domain-specific tool that an internal team or external contributor builds becomes a capability that couldn't exist without this infrastructure.

---

### Phase 9 — Voice, Remote & Advanced Integration

**Theme:** The agent works wherever the developer works.

**Delivers:**
- Voice input (speech-to-text at the prompt) and optional voice output
- A2A (Agent-to-Agent) protocol — connect to and coordinate with remote agents running on other machines or services
- Desktop application wrapper (Electron or Tauri) providing a native window with multi-session management
- VSCode extension with sidebar panel and command palette integration

**Why Now:** These capabilities complete the transition from a CLI tool to a development platform. They are not required for the core use case but extend the addressable audience to developers who don't primarily live in the terminal.

---

### Roadmap Summary

| Phase | Theme | Key Deliverables | Dependency |
|-------|-------|-----------------|-----------|
| **1** | Working Core | REPL, 4 tools, streaming, permissions | None |
| **2** | Terminal UX | TUI polish, markdown, spinners | Phase 1 |
| **3** | Memory | AGENTS.md, SQLite sessions, settings | Phase 1 |
| **4** | Tool Expansion | File Write, Glob, Web, MCP | Phase 1 |
| **5** | Skills & Hooks | Skills system, lifecycle hooks | Phase 3, 4 |
| **6** | Plan Mode & Safety | Plan mode, checkpointing, sandboxing | Phase 3 |
| **7** | LSP & Config | LSP integration, full config schema | Phase 3 |
| **8** | Subagents & Plugins | Plugin system, subagents | Phase 5, 7 |
| **9** | Advanced Integrations | Voice, A2A, desktop app, IDE extension | Phase 8 |

---

## 10. Constraints & Dependencies

### 10.1 Technical Constraints

| ID | Constraint | Implication |
|----|-----------|-------------|
| TC-01 | Active internet connection required to reach AI provider API | Offline use not supported in MVP; addressed in Phase 4 via Ollama local model support |
| TC-02 | API usage is billable; no free tier exists for production use | Token consumption monitoring is important; Phase 2 adds visible token tracking |
| TC-03 | Shell tool requires subprocess execution capability on the host | Restricted CI environments may block this; `--no-bash` mitigates the risk |
| TC-04 | ripgrep must be installed for optimal search; falls back to grep automatically | No installation hard block, but ripgrep should be in the setup documentation |
| TC-05 | LLM context windows impose a ceiling on conversation history and tool output volume | Long sessions may exhaust the context window; auto-compact (Phase 3) addresses this |
| TC-06 | Node.js v24+ required if TanStack AI SDK is chosen (due to isolated-vm dependency) | Verify SDK choice before finalising runtime requirements |

### 10.2 External Dependencies

| Dependency | Purpose | Risk | Mitigation |
|-----------|---------|:----:|-----------|
| Anthropic API (default) | LLM inference | Medium | Provider adapter allows replacement |
| Vercel AI SDK (`ai` package) | LLM communication abstraction | Low | Stable; provider adapter isolates it |
| Bun / Node.js runtime | Execution environment | Low | Both supported |
| ripgrep binary | Fast code search | Low | Graceful fallback to grep |
| npm registry | Package distribution | Low | Can vendor packages if needed |
| Git binary | Phase 6 worktree sessions, Phase 8 commit operations | Low | Required for those phases only |
| MCP servers | Phase 4 external tool connectivity | Medium | Each server is independent; failures are isolated |

---

## 11. Risk Register

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|----|------|:----------:|:------:|:--------:|-----------|
| R-01 | AI provider API changes streaming format or tool-call schema | Medium | High | **High** | Provider adapter pattern isolates this; pin SDK version; monitor changelogs |
| R-02 | Runaway agentic loop consumes unexpected token volume | Low | High | **Medium** | Hard iteration cap (10 loops); token usage display from Phase 2 |
| R-03 | File edit tool applies incorrect replacement, causing data loss | Low | High | **Medium** | Exact-string-match requirement before write; recommend git-tracked repos; Phase 6 checkpointing |
| R-04 | Shell command in a future auto-approve mode causes irreversible system changes | Low | Very High | **High** | Shell always requires approval; no full-auto mode in MVP; auto-approve shell is explicitly out of scope |
| R-05 | Context window exhaustion in long sessions degrades agent reasoning | Medium | Medium | **Medium** | Rolling context compression via auto-compact in Phase 3; token usage display in Phase 2 |
| R-06 | Scope creep during MVP build delays the working core | High | Medium | **High** | Enforce Phase 1 scope gate; log all new ideas as Phase 2+ backlog — never add to MVP in-flight |
| R-07 | Architecture shortcuts under MVP time pressure create debt that slows Phase 2–3 | Medium | High | **High** | Tool interface contract and provider adapter are the two critical Phase 1 architecture decisions; invest here |
| R-08 | REPL crashes on API rate limits or network timeouts, eroding user trust | Medium | High | **High** | Try-catch at every external call site; graceful degradation to error message with guidance |
| R-09 | Plugin system (Phase 8) allows malicious third-party code to execute in the user environment | Low | Very High | **High** | Plugins run in process context; require explicit opt-in per plugin; plan signed manifest verification before Phase 8 ships |
| R-10 | Feature parity race with OpenCode/Gemini CLI leads to shipping incomplete versions of advanced features | Medium | Medium | **Medium** | Phase gates prevent half-finished features from shipping; completeness over speed |

---

## 12. Success Metrics & Acceptance Criteria

### 12.1 Phase 1 MVP — Acceptance Criteria

The MVP is accepted when all twelve criteria pass in a live session on a fresh environment.

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-01 | Agent reads a specified file and produces an accurate summary | Manual session test |
| AC-02 | Agent makes a targeted file edit and the file on disk reflects the change | Manual test + file diff |
| AC-03 | File edit tool returns an error and makes no change when the target string does not exist | Negative test |
| AC-04 | Agent runs a shell command and returns its output | Manual session test |
| AC-05 | Permission prompt appears before every file edit and bash command without exception | 5 consecutive calls — all prompted |
| AC-06 | "Deny" returns the agent to a responsive state with an alternative response from the LLM | Manual session test |
| AC-07 | Agent searches for a pattern and returns file paths with line numbers | Manual session test |
| AC-08 | First streaming token appears within 3 seconds of input | Manual timing on standard network |
| AC-09 | REPL does not crash when API key is absent, when API returns a rate limit error, or when a tool throws an exception | Error injection test |
| AC-10 | `--print "describe this project"` returns a complete response and exits with code 0 | CLI test |
| AC-11 | `--no-bash` launches the agent with bash tool absent from `/tools` output | CLI + `/tools` verification |
| AC-12 | Agent runs without modification on macOS Apple Silicon, Ubuntu Linux, and Windows WSL2 | Cross-platform smoke test |

### 12.2 Product Health Metrics (Post-MVP)

| Metric | Target | Notes |
|--------|--------|-------|
| Daily sessions per active developer | ≥ 3/day | Signals integration into daily workflow |
| Session abandonment rate | < 15% | High abandonment = agent failing too often mid-task |
| Permission denial rate | < 5% | High denials = agent proposing unexpected or inappropriate actions |
| Max-iteration cap hit rate | 0 | Hitting the cap = agent is looping or task is under-specified |
| Tool error rate | < 2% of calls | Higher = fragile tool implementations or poor LLM tool use |
| Context window exhaustion events | < 1% of sessions | Signals need for auto-compact |

### 12.3 Qualitative Success Signals

- Developers describe the agent as "trustworthy" — they feel safe giving it tasks in a production repo
- Developers use the agent for tasks they previously did manually (grep, sed, git diff reading)
- A new contributor can add a tool by reading the existing tool implementations in under two hours
- The `AGENTS.md` file for an active project grows over time, making sessions progressively more accurate

---

## 13. Open Questions & Decisions Needed

| ID | Question | Blocks | Owner |
|----|---------|:------:|-------|
| OQ-01 | What is the product name? Name appears in CLI output, npm package, and all future documentation | Phase 1 | Product Owner |
| OQ-02 | Which AI provider is the Phase 1 default — Anthropic Claude or another? The provider adapter should be tested against at least one alternative before Phase 1 closes | Phase 1 | Product Owner |
| OQ-03 | Vercel AI SDK or TanStack AI as the LLM communication abstraction? Vercel AI SDK has 20M weekly downloads and is used by OpenCode. TanStack AI has better type safety and vendor neutrality but is in alpha. | Phase 1 | Engineering |
| OQ-04 | Will the product be open-sourced? This affects licence choice, contribution guidelines, and whether the plugin API needs to be public from Phase 8 | Phase 8 | Product Owner |
| OQ-05 | Should a `--full-auto` mode (no permission prompts) ever be introduced? This is a significant safety policy decision with no obvious right answer | Phase 6 | Product Owner |
| OQ-06 | What is the context window management strategy for Phase 3? Options: rolling summary compression, hard cutoff with warning, per-project context window configuration | Phase 3 | Engineering |
| OQ-07 | Should skills be shareable via a public registry (like npm), a private registry, or only via filesystem paths? | Phase 5 | Product Owner |
| OQ-08 | What is the behaviour when a configured MCP server is unavailable at startup — fail fast, warn and continue, or retry with backoff? | Phase 4 | Engineering |
| OQ-09 | For Phase 6 sandboxing, what is the supported minimum — Docker only, or also native OS sandboxing (macOS Seatbelt, Linux bubblewrap)? | Phase 6 | Engineering |
| OQ-10 | Should the LSP integration in Phase 7 ship wired by default for the four most common languages (TypeScript, Python, Go, Rust), or be fully opt-in via configuration? | Phase 7 | Product Owner |

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **A2A Protocol** | Agent-to-Agent communication standard that allows AI agents on different machines or services to coordinate tasks |
| **Agent** | Software that accepts a goal, plans a sequence of actions (including tool calls), executes them, and returns a result — distinct from a chatbot, which only generates text |
| **Agentic Loop** | The repeating cycle: LLM proposes a tool call → system executes it → result fed back to LLM → LLM responds again — until no further tool calls are needed |
| **AGENTS.md** | A Markdown file in the project root that the agent reads at startup and uses as system context. The developer-authored memory for the project |
| **Auto-compact** | A feature that automatically summarises older conversation history when it approaches the context window limit, preserving essential context while freeing token space |
| **Bash Tool** | The tool capability enabling the agent to execute shell commands. Always requires user approval |
| **Checkpointing** | Saving a snapshot of the project state before executing any file modifications, enabling a `/restore` command that undoes agent changes |
| **Context Window** | The maximum number of tokens an LLM can process in a single request. Includes the system prompt, conversation history, tool schemas, and tool results |
| **File Edit Tool** | The tool capability performing exact-string replacements in existing files |
| **File Read Tool** | The tool capability reading text files and returning their content to the LLM |
| **File Write Tool** | The tool capability creating new files at specified paths (Phase 4) |
| **Glob Tool** | The tool capability listing files matching a pattern (e.g., `src/**/*.ts`) |
| **Headless Mode** | Non-interactive single-prompt execution via `--print` flag; used in CI pipelines and scripts |
| **Hook** | A script or function that executes at a specific agent lifecycle event (before tool call, after tool call, session start, session end) |
| **Human-in-the-Loop** | Design pattern where the agent pauses before a consequential action and requires explicit human approval to continue |
| **LLM (Large Language Model)** | The AI model powering the agent's reasoning — Claude, GPT, Gemini, or any compatible model |
| **LSP (Language Server Protocol)** | A standard protocol enabling editors and agents to access code intelligence features — type information, diagnostics, cross-references — from a language-specific server |
| **MCP (Model Context Protocol)** | An open standard for connecting AI agents to external tools and data sources via a standardised protocol, regardless of the tool's implementation |
| **Permission Gate** | The component that intercepts destructive tool calls, presents the proposed action to the user in plain language, and gates execution on explicit approval |
| **Plan Mode** | A read-only agent state where the agent explores and proposes a structured plan before requesting permission to execute any modifications |
| **Plugin** | A third-party or internally-developed package that registers custom tools with the agent, loaded from a filesystem directory |
| **Provider Adapter** | A thin interface implementation that translates between the agent's internal communication model and a specific AI provider's API. Swapping it changes the provider without touching business logic |
| **REPL** | Read-Eval-Print Loop — the interactive terminal session where the agent continuously accepts input and returns output |
| **ripgrep (rg)** | A high-performance regex search tool. Used by the Grep tool when installed; falls back to grep |
| **Sandboxing** | Restricting the execution environment of tool calls — via Docker, Podman, macOS Seatbelt, or Linux bubblewrap — to limit the blast radius of unintended operations |
| **Session History** | The array of all user and LLM messages in the current session, passed to the LLM on every turn to maintain conversational context |
| **Skill** | A user-authored Markdown file containing reusable prompt instructions or workflow definitions, invocable by name within the REPL |
| **Streaming** | Delivery of LLM response tokens incrementally to the terminal as they are generated, rather than waiting for the full response before displaying anything |
| **Subagent** | A specialised agent instance spawned by the orchestrator to handle a specific sub-task (e.g., planning, test writing, documentation) in parallel with the main session |
| **System Prompt** | Instructions sent to the LLM at the start of every request that define the agent's persona, capabilities, constraints, and current project context |
| **Token** | The unit of text processed by an LLM — roughly three-quarters of a word on average. API costs and context window limits are both measured in tokens |
| **Tool** | A self-contained capability module that the LLM can invoke. Each tool has a name, description, input schema, execution function, and permission classification |
| **Tool Registry** | The central catalogue of all active tools. It formats tool schemas for the LLM API and routes incoming tool requests to the correct handler |

---

*Document references: OpenCode documentation (opencode.ai/docs), Gemini CLI documentation (geminicli.com/docs), Qwen Code documentation (qwenlm.github.io/qwen-code-docs), open-codex GitHub (ymichael/open-codex), and the MVP technical guide (00-mvp-building-guide.md). Competitive data verified April 2026.*
