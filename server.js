import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { z } from "zod";

const widgetHtml = readFileSync("public/widget.html", "utf8");
const WIDGET_URI = "ui://widget/crypto.html";
const PORT = process.env.PORT ?? 3000;

async function fetchMarketOverview(limit = 10) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

async function fetchCoinChart(coinId, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

function createCryptoServer() {
  const server = new McpServer({ name: "crypto-market-monitor", version: "1.0.0" });

  server.registerResource(
    "crypto-widget",
    WIDGET_URI,
    { description: "Interactive crypto market dashboard" },
    async () => ({
      contents: [{
        uri: WIDGET_URI,
        mimeType: "text/html+skybridge",
        text: widgetHtml,
        _meta: {
          "openai/widgetPrefersBorder": true,
          "openai/widgetCSP": {
            connect_domains: ["https://api.coingecko.com"],
          },
        },
      }],
    })
  );

  server.registerTool(
    "get_market_overview",
    {
      title: "Get Crypto Market Overview",
      description: "Use this when the user asks about crypto market, top coins, Bitcoin, Ethereum, prices, or market overview. Returns top coins with prices, 24h/7d changes, market cap, and sparkline charts.",
      inputSchema: {
        limit: z.number().int().min(5).max(20).optional().default(10).describe("Number of top coins to return (default 10)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Fetching market data…",
        "openai/toolInvocation/invoked": "Market data loaded",
        "openai/widgetAccessible": true,
      },
    },
    async ({ limit = 10 }) => {
      try {
        const coins = await fetchMarketOverview(limit);
        const top3 = coins.slice(0, 3).map(c =>
          `${c.name}: ${c.current_price >= 1 ? '$' + c.current_price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + c.current_price.toFixed(4)} (${c.price_change_percentage_24h >= 0 ? '+' : ''}${c.price_change_percentage_24h?.toFixed(2)}% 24h)`
        ).join(' | ');
        return {
          content: [
            { type: "text", text: `Top ${limit} coins loaded.` },
            { type: "resource", resource: { uri: WIDGET_URI, mimeType: "text/html+skybridge", text: widgetHtml } },
          ],
          structuredContent: { coins },
          _meta: { "openai/outputTemplate": WIDGET_URI },
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error fetching market data: ${e.message}` }], structuredContent: { coins: [] } };
      }
    }
  );

  server.registerTool(
    "get_coin_chart",
    {
      title: "Get Coin Price Chart",
      description: "Use this when the user asks for price history or chart of a specific coin. Also called internally by the widget when the user changes timeframe (1D/7D/30D).",
      inputSchema: {
        coin_id: z.string().describe("CoinGecko coin ID e.g. bitcoin, ethereum, solana"),
        days: z.number().int().describe("Number of days: 1, 7, or 30"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      _meta: {
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Loading price chart…",
        "openai/toolInvocation/invoked": "Chart loaded",
        "openai/widgetAccessible": true,
      },
    },
    async ({ coin_id, days }) => {
      try {
        const data = await fetchCoinChart(coin_id, days);
        const prices = data.prices || [];
        const vals = prices.map(p => p[1]);
        const min = Math.min(...vals), max = Math.max(...vals);
        const first = vals[0], last = vals[vals.length - 1];
        const change = ((last - first) / first * 100).toFixed(2);
        return {
          content: [{ type: "text", text: `${coin_id} ${days}d chart: ${change >= 0 ? '+' : ''}${change}% change. Range: $${min.toFixed(2)} – $${max.toFixed(2)}.` }],
          structuredContent: { prices, coin_id, days },
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], structuredContent: { prices: [], coin_id, days } };
      }
    }
  );

  return server;
}

const MCP_PATH = "/mcp";
const httpServer = createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400).end("Bad Request"); return; }
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("Crypto Market Monitor MCP Server — OK");
    return;
  }

  if (url.pathname === MCP_PATH && ["POST", "GET", "DELETE"].includes(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = createCryptoServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP error:", err);
      if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(`✅ Crypto MCP server running at http://localhost:${PORT}${MCP_PATH}`);
});