# Building a Minimal REPL Terminal UI

This guide shows you how to create the absolute bare minimum version of a terminal-based REPL (Read-Eval-Print Loop) using React and Ink, similar to Claude Code's architecture but stripped down to essentials.

## What You'll Build

A static terminal interface that:

- Renders in the terminal using React components
- Displays a simple prompt and input field
- Stays in an interactive session (REPL mode)
- Has basic UI layout without complex features

## Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "ink": "^4.4.1",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "bun": ">=1.0.0"
  }
}
```

## Project Structure

```
minimal-repl/
├── src/
│   ├── main.tsx           # Entry point
│   ├── components/
│   │   ├── App.tsx        # Root wrapper component
│   │   └── REPL.tsx       # Main REPL interface
│   └── ink.ts             # Ink rendering utilities
├── package.json
└── tsconfig.json
```

## Step 1: Create the Ink Wrapper

**File: `src/ink.ts`**

This file wraps Ink's render function for easy use:

```typescript
import { type ReactNode } from "react";
import { render as inkRender, type RenderOptions } from "ink";

export async function render(
  node: ReactNode,
  options?: RenderOptions,
): Promise<void> {
  const instance = inkRender(node, options);
  await instance.waitUntilExit();
}

export { Box, Text } from "ink";
```

## Step 2: Create the App Wrapper

**File: `src/components/App.tsx`**

A simple wrapper that provides context to child components:

```typescript
import React from 'react';
import { Box } from 'ink';

type Props = {
  children: React.ReactNode;
};

/**
 * Top-level wrapper for the REPL session.
 * In a real app, this would provide context providers.
 */
export function App({ children }: Props): React.ReactNode {
  return (
    <Box flexDirection="column" width="100%">
      {children}
    </Box>
  );
}
```

## Step 3: Create the REPL Component

**File: `src/components/REPL.tsx`**

The main interface with a static design:

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export function REPL(): React.ReactNode {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([
    'Welcome to Minimal REPL!',
    'Type something and press Enter...',
  ]);

  // Handle keyboard input
  useInput((inputChar, key) => {
    if (key.return) {
      // User pressed Enter
      if (input.trim()) {
        setMessages(prev => [...prev, `> ${input}`, `Echo: ${input}`]);
        setInput('');
      }
    } else if (key.backspace || key.delete) {
      // Handle backspace
      setInput(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && inputChar) {
      // Add character to input
      setInput(prev => prev + inputChar);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╔═══════════════════════════════════╗
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ║     MINIMAL REPL v1.0.0          ║
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╚═══════════════════════════════════╝
        </Text>
      </Box>

      {/* Message History */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, idx) => (
          <Box key={idx}>
            <Text>{msg}</Text>
          </Box>
        ))}
      </Box>

      {/* Input Prompt */}
      <Box>
        <Text color="green" bold>
          $ {' '}
        </Text>
        <Text>{input}</Text>
        <Text color="gray">█</Text>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
}
```

## Step 4: Create the Entry Point

**File: `src/main.tsx`**

The main entry point that starts the REPL:

```typescript
import React from 'react';
import { render } from './ink.js';
import { App } from './components/App.js';
import { REPL } from './components/REPL.js';

async function main() {
  console.clear(); // Clear terminal before starting

  await render(
    <App>
      <REPL />
    </App>
  );
}

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

## Step 5: TypeScript Configuration

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "jsx": "react",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Step 6: Package Configuration

**File: `package.json`**

```json
{
  "name": "minimal-repl",
  "version": "1.0.0",
  "type": "module",
  "main": "src/main.tsx",
  "scripts": {
    "dev": "bun run src/main.tsx",
    "build": "bun build src/main.tsx --compile --outfile=minimal-repl"
  },
  "dependencies": {
    "react": "^18.2.0",
    "ink": "^4.4.1",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

## Running the Application

### Development Mode

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Build Standalone Executable

```bash
# Build a single executable file
bun run build

# Run the executable
./minimal-repl
```

## How It Works

### 1. Rendering Flow

```
main.tsx
  └─> render()
       └─> <App>
            └─> <REPL>
                 ├─> Header (static)
                 ├─> Message History (dynamic)
                 ├─> Input Prompt (dynamic)
                 └─> Footer (static)
```

### 2. Component Hierarchy

- **App**: Root wrapper that provides layout structure
- **REPL**: Main component that handles:
  - State management (input, messages)
  - Keyboard input via `useInput` hook
  - Rendering the UI layout

### 3. Key Concepts

**Ink Rendering**

- Ink uses React to render terminal UIs
- Components like `<Box>` and `<Text>` map to terminal output
- `useInput` hook captures keyboard events

**REPL Session**

- The app stays running in a loop
- User input is captured character by character
- Enter key triggers message processing
- Ctrl+C exits the application

**Static Design**

- All UI elements are defined in JSX
- No complex state management
- No external API calls
- No file system operations

## Customization Ideas

### Add Colors

```typescript
<Text color="blue">Blue text</Text>
<Text color="red" bold>Bold red text</Text>
<Text backgroundColor="yellow">Highlighted</Text>
```

### Add Borders

```typescript
import { Box } from 'ink';

<Box borderStyle="round" borderColor="cyan" padding={1}>
  <Text>Content in a box</Text>
</Box>
```

### Add Multiple Sections

```typescript
<Box flexDirection="row">
  <Box flexDirection="column" width="50%">
    <Text>Left panel</Text>
  </Box>
  <Box flexDirection="column" width="50%">
    <Text>Right panel</Text>
  </Box>
</Box>
```

## What's NOT Included

This minimal version intentionally excludes:

- ❌ Skills system
- ❌ Plugin architecture
- ❌ MCP (Model Context Protocol) integration
- ❌ File operations
- ❌ Command execution
- ❌ API calls to LLMs
- ❌ Session persistence
- ❌ History navigation
- ❌ Autocomplete
- ❌ Syntax highlighting
- ❌ Multi-line input
- ❌ Configuration files
- ❌ Keybinding customization

## Next Steps

To expand this minimal REPL, you could add:

1. **Command Processing**: Parse input and execute commands
2. **History**: Store and navigate previous inputs
3. **Multi-line Input**: Support for longer text entry
4. **Syntax Highlighting**: Color code different input types
5. **Autocomplete**: Suggest completions as user types
6. **Session State**: Save and restore sessions

## Architecture Comparison

### Claude Code (Full)

```
main.tsx (1000+ lines)
  ├─> 50+ commands
  ├─> 40+ tools
  ├─> Skills system
  ├─> Plugin loader
  ├─> MCP integration
  ├─> LSP support
  └─> Complex state management
```

### Minimal REPL (This Guide)

```
main.tsx (~20 lines)
  └─> REPL.tsx (~80 lines)
       ├─> Input handling
       ├─> Message display
       └─> Static UI
```

## Troubleshooting

### Terminal doesn't clear

Add `console.clear()` before rendering:

```typescript
console.clear();
await render(<App><REPL /></App>);
```

### Input not working

Ensure stdin is in raw mode (Ink handles this automatically)

### Colors not showing

Check your terminal supports ANSI colors:

```bash
echo $TERM
```

### Exit not working

Ink automatically handles Ctrl+C, but you can customize:

```typescript
render(<App><REPL /></App>, {
  exitOnCtrlC: true
});
```

## Summary

You now have a minimal, working REPL that:

- ✅ Renders in the terminal
- ✅ Accepts user input
- ✅ Displays messages
- ✅ Stays in a session loop
- ✅ Has a clean, static design

This is the foundation. From here, you can incrementally add features as needed without the complexity of the full Claude Code architecture.
