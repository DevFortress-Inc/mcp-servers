# Sports Dashboard MCP

A Model Context Protocol (MCP) server that retrieves real-time football data including fixtures, results, and standings by league and season. Built for the Athena AI Agent platform.

## Live Demo

- **Athena Agent:** https://athenachat.bot/chatbot/agent/sports-dashboard1061
- **MCP Endpoint:** https://ean-hoodlike-censoriously.ngrok-free.dev/mcp

> The Athena agent is already live and configured. Just visit the link above and start chatting — no setup needed.

## Data Source

[TheSportsDB](https://www.thesportsdb.com/) — free public sports API, no API key required.

## Features

- Live league standings with form guide
- Upcoming and recent fixtures by league
- Full league dashboard (fixtures + standings in one call)
- Embedded interactive widget with tab switching and team search filter

## Project Structure

```
sports-dashboard-mcp/
├── server.js
├── package.json
└── public/
    └── sports-widget.html
```

## Run Locally

**Requirements:** Node.js v18+

1. Clone the repo and navigate to this folder:
```bash
git clone https://github.com/DevFortress-Inc/mcp-servers
cd mcp-servers/sports-dashboard-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

The MCP server will run at `http://localhost:8787/mcp`

## MCP Tools

| Tool | Description | Default League |
|------|-------------|----------------|
| `get_standings` | League table and team positions | Premier League |
| `get_fixtures` | Upcoming or recent match fixtures | Premier League |
| `get_league_dashboard` | Full overview — fixtures + standings | Premier League |

## Supported Leagues

| League ID | League |
|-----------|--------|
| 4328 | English Premier League |
| 4335 | La Liga |
| 4331 | Bundesliga |
| 4332 | Serie A |
| 4334 | Ligue 1 |

## Example Prompts

- "Show me the Premier League dashboard"
- "What are the La Liga standings?"
- "Show me upcoming Bundesliga fixtures"