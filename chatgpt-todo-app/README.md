# ChatGPT Todo App

A Todo List application integrated with ChatGPT using the [OpenAI Apps SDK](https://developers.openai.com/apps-sdk) and the Model Context Protocol (MCP).

## Description

This project implements an interactive todo list widget that renders directly inside ChatGPT. Users can create, complete, and delete tasks through ChatGPT commands, and the widget updates in real-time.

## Technologies

- **Framework**: Next.js 15.5.7 (App Router)
- **UI**: React 19.1.0 + Tailwind CSS 4
- **Protocol**: Model Context Protocol (MCP) v1.20.0
- **Language**: TypeScript 5

## Features

### Available MCP Tools

The MCP server exposes the following tools that ChatGPT can invoke:

| Tool | Description | Parameters |
|------|-------------|------------|
| `add_todo` | Add a new task | `text`: task description |
| `list_todos` | List all tasks | - |
| `complete_todo` | Mark a task as completed | `id`: task ID |
| `delete_todo` | Delete a task | `id`: task ID |
| `clear_completed` | Remove all completed tasks | - |

### User Interface

- Interactive checkbox to mark tasks as completed
- Delete button per task
- Progress counter (completed tasks / total)
- Dark mode support
- Fullscreen button in ChatGPT

### Custom Hooks

The application includes hooks for OpenAI SDK integration:

- `useWidgetProps<T>` - Get props from the invoked tool
- `useCallTool(name, args)` - Invoke MCP tools from the widget
- `useDisplayMode()` - Get display mode (pip/inline/fullscreen)
- `useIsChatGptApp()` - Detect if running inside ChatGPT
- `useWidgetState()` - Persistent widget state

## Quick Start

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

The MCP endpoint is at: `http://localhost:3000/mcp`

### Production

```bash
pnpm build
pnpm start
```

## Connect with ChatGPT

**Live MCP Server**: `https://mcp-servers-seven.vercel.app/mcp`

1. In ChatGPT, go to **Settings → Connectors → Create**
2. Add the MCP server URL: `https://mcp-servers-seven.vercel.app/mcp`

> **Note:** Requires ChatGPT developer mode access. See the [connection guide](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).

## Project Structure

```
app/
├── mcp/
│   └── route.ts          # MCP server with tools
├── hooks/                # Hooks for OpenAI SDK integration
│   ├── use-widget-props.ts
│   ├── use-call-tool.ts
│   ├── use-display-mode.ts
│   └── ...
├── layout.tsx            # Layout with SDK bootstrap
├── page.tsx              # Todo list widget
└── globals.css           # Tailwind styles
middleware.ts             # CORS for RSC
next.config.ts            # Asset configuration
baseUrl.ts                # Dynamic base URL
```

## How It Works

1. **Invocation**: ChatGPT invokes a tool (e.g., `add_todo`)
2. **Processing**: The MCP server processes and stores the task
3. **Response**: Returns structured data with the updated list
4. **Rendering**: ChatGPT renders the widget in an iframe
5. **Interaction**: User can interact directly with the widget
6. **Sync**: Widget changes invoke MCP tools

## Resources

- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Next.js](https://nextjs.org/docs)

## Deployment

The project is configured for Vercel. The `baseUrl.ts` file automatically detects Vercel environment variables.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter)


