import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { z } from "zod";

const widgetHtml = readFileSync(new URL("./public/sports-widget.html", import.meta.url), "utf8");
const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const LEAGUES = {
  "4328": "English Premier League",
  "4335": "La Liga",
  "4331": "Bundesliga",
  "4332": "Serie A",
  "4334": "Ligue 1",
  "4480": "MLS",
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function createSportsServer() {
  const server = new McpServer({ name: "sports-dashboard", version: "1.0.0" });

  server.registerResource(
    "sports-widget",
    "ui://widget/sports-dashboard.html",
    {},
    async () => ({
      contents: [{
        uri: "ui://widget/sports-dashboard.html",
        mimeType: "text/html+skybridge",
        text: widgetHtml,
        _meta: { "openai/widgetPrefersBorder": true },
      }],
    })
  );

  server.registerTool(
    "get_standings",
    {
      title: "Get Standings",
      description: "Get the league table and standings. Use when the user asks about standings, rankings, league table, or team positions. League IDs: 4328=Premier League, 4335=La Liga, 4331=Bundesliga, 4332=Serie A, 4334=Ligue 1. Default to 4328 if no league is specified.",
      inputSchema: {
        league_id: z.string().default("4328"),
        season: z.string().optional().default("2025-2026"),
      },
    },
    async ({ league_id = "4328", season = "2025-2026" }) => {
      let data;
      try { data = await fetchJson(`${SPORTSDB_BASE}/lookuptable.php?l=${league_id}&s=${season}`); }
      catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true }; }

      const table = data.table || [];
      const leagueName = LEAGUES[league_id] || `League ${league_id}`;

      return {
        content: [{ type: "text", text: `Successfully retrieved standings for ${leagueName}.` }],
        structuredContent: { type: "standings", leagueName, league_id, season, table },
        _meta: { "openai/outputTemplate": "ui://widget/sports-dashboard.html" },
      };
    }
  );

  server.registerTool(
    "get_fixtures",
    {
      title: "Get Fixtures",
      description: "Get upcoming or recent fixtures for a football league. Use when the user asks about matches, games, fixtures or results. League IDs: 4328=Premier League, 4335=La Liga, 4331=Bundesliga, 4332=Serie A, 4334=Ligue 1. Default to 4328 if no league is specified.",
      inputSchema: {
        league_id: z.string().default("4328"),
        type: z.enum(["next", "last"]).optional().default("next"),
      },
    },
    async ({ league_id = "4328", type = "next" }) => {
      const endpoint = type === "last"
        ? `${SPORTSDB_BASE}/eventspastleague.php?id=${league_id}`
        : `${SPORTSDB_BASE}/eventsnextleague.php?id=${league_id}`;

      let data;
      try { data = await fetchJson(endpoint); }
      catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true }; }

      const events = data.events || [];
      const leagueName = LEAGUES[league_id] || `League ${league_id}`;

      return {
        content: [{ type: "text", text: `Successfully retrieved fixtures for ${leagueName}.` }],
        structuredContent: { type: "fixtures", leagueName, league_id, events },
        _meta: { "openai/outputTemplate": "ui://widget/sports-dashboard.html" },
      };
    }
  );

  server.registerTool(
    "get_league_dashboard",
    {
      title: "Get League Dashboard",
      description: "Get both fixtures AND standings for a league in one call. Use this for any general overview, dashboard, or when the user asks about a league without specifying fixtures or standings. League IDs: 4328=Premier League, 4335=La Liga, 4331=Bundesliga, 4332=Serie A, 4334=Ligue 1. Default to 4328 if no league is specified.",
      inputSchema: {
        league_id: z.string().default("4328"),
        season: z.string().optional().default("2025-2026"),
      },
    },
    async ({ league_id = "4328", season = "2025-2026" }) => {
      const leagueName = LEAGUES[league_id] || `League ${league_id}`;
      const [fd, sd] = await Promise.allSettled([
        fetchJson(`${SPORTSDB_BASE}/eventsnextleague.php?id=${league_id}`),
        fetchJson(`${SPORTSDB_BASE}/lookuptable.php?l=${league_id}&s=${season}`),
      ]);
      const events = fd.status === "fulfilled" ? (fd.value.events || []) : [];
      const table  = sd.status === "fulfilled" ? (sd.value.table || []) : [];

      return {
        content: [{ type: "text", text: `Successfully retrieved dashboard for ${leagueName}.` }],
        structuredContent: { type: "dashboard", leagueName, league_id, season, events, table },
        _meta: { "openai/outputTemplate": "ui://widget/sports-dashboard.html" },
      };
    }
  );

  return server;
}

const PORT = process.env.PORT || 8787;

const httpServer = createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400).end("Missing URL"); return; }
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === "/mcp") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("Sports Dashboard MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === "/mcp" && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createSportsServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => { transport.close(); server.close(); });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("[MCP] Error:", err);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(`✅ Sports Dashboard MCP running on http://localhost:${PORT}/mcp`);
});