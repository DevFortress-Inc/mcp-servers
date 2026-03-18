# 🪙 Crypto Market Monitor

> Real-time cryptocurrency market dashboard built for the Athena Agent SDK Challenge.

![Crypto Market Monitor](https://img.shields.io/badge/Athena-Agent%20SDK-667eea?style=for-the-badge)
![CoinGecko](https://img.shields.io/badge/Data-CoinGecko%20API-48bb78?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Runtime-Node.js-339933?style=for-the-badge)

---

## 🚀 Live Demo

- **Athena Agent**: [crypto-market-monitor](https://athenachat.bot/chatbot/agent/crypto-market-monitor1159)
- **MCP Endpoint**: `https://<tunnel>.trycloudflare.com/mcp`
- **Widget Preview**: `https://<tunnel>.trycloudflare.com/widget`

---

## 📋 What it does

The Crypto Market Monitor is an Athena Agent that delivers **real-time cryptocurrency market data** through an interactive widget. Ask it anything about the crypto market and it will fetch live data from CoinGecko and display it in a polished dashboard.

**Example prompts:**
- *"Show me the top 20 cryptos"*
- *"What are the top coins by volume?"*
- *"Tell me about Ethereum"*
- *"Show me Bitcoin details"*

---

## ✨ Interactive Widget — 4 Interactions

| Interaction | Description |
|---|---|
| 🔍 **Live Search** | Filter coins by name or ticker in real-time as you type |
| 📊 / 🃏 **View Toggle** | Switch between Table view and Cards view |
| ↕ **Column Sort** | Click any column header to sort (Price, 24h %, Market Cap, Volume) |
| 🔎 **Coin Drill-down** | Click any coin to open a detail panel with 8 metrics |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22+ |
| MCP SDK | `@modelcontextprotocol/sdk` (latest) |
| Transport | Streamable HTTP (`/mcp`) |
| Data Source | CoinGecko Public API v3 |
| Tunnel | Cloudflare Tunnel |
| Widget | Vanilla HTML/JS — `text/html+skybridge` |
| Validation | Zod |

---

## 🔧 MCP Tools

### `get_market_overview`
Fetches the top N cryptocurrencies sorted by market cap or volume.

**Parameters:**
- `limit` — number of coins (5–50, default 20)
- `sort_by` — `market_cap` | `volume` | `price_change_percentage_24h`

### `search_coin`
Searches for a specific coin by name or ticker symbol.

**Parameters:**
- `query` — coin name or ticker (e.g. `bitcoin`, `ETH`, `solana`)

---

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/adamsalmane/crypto-market-monitor.git
cd crypto-market-monitor

# Install dependencies
npm install

# Start the server
node server.js
```

Server starts on `http://localhost:3001`

| Endpoint | Description |
|---|---|
| `GET /` | Health check |
| `GET /widget` | Standalone widget preview |
| `GET /api/coins` | Proxy API (avoids CORS) |
| `POST /mcp` | MCP endpoint for Athena |

---

## 🌐 Deployment

Expose the server publicly using Cloudflare Tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3001
```

Then set your Athena agent MCP URL to:
```
https://<your-tunnel>.trycloudflare.com/mcp
```

---

## 📊 Data Source

All market data is fetched live from the **[CoinGecko Public API v3](https://www.coingecko.com/en/api)** — no API key required.

Data includes: price, market cap, 24h/7d change, volume, circulating supply, 24h high/low, coin logos.

Server-side caching (60s TTL) prevents rate limiting.

---

## 🏗️ Architecture

```
User prompt
    ↓
Athena model selects tool
    ↓
POST /mcp → MCP Server (Node.js)
    ↓
CoinGecko API (with 60s cache)
    ↓
structuredContent { coins[] }
    ↓
Widget renders via window.openai.toolOutput
    ↓
Interactive dashboard in Athena
```

---

## 📁 Project Structure

```
crypto-market-monitor/
├── server.js       # MCP server + widget HTML + proxy API
├── package.json    # Dependencies
└── README.md       # This file
```

---
