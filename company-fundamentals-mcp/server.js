import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { z } from "zod";

const widgetHtml = readFileSync("public/widget.html", "utf8");


function createMCPServer() {
  const server = new McpServer({ name: "mcp-challenge", version: "0.1.0" });

  server.registerResource(
    "company-widget",
    "ui://widget/company.html",
    {},
    async () => ({
      contents: [{
        uri: "ui://widget/company.html",
        mimeType: "text/html+skybridge",
        text: widgetHtml,
        _meta: { "openai/widgetPrefersBorder": true },
      }],
    })
  );

  
  server.registerTool(
  "get_company_fundamentals",
  {
    title: "Get company fundamentals",
    description: "Retrieve key financial metrics for a public company. You MUST use the standard stock ticker symbol (e.g., GOOGL, AAPL). NEVER pass full company names or phrases.",
    inputSchema: {
      symbol: z.string()
    },
    requiresAuth: false, // no OAuth needed - error in inspector
    _meta: {
      "openai/outputTemplate" : "ui://widget/company.html", // tells engine to fetch and render at the end
    }
  },
  async ({ symbol }) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol || cleanSymbol.includes(" ") || cleanSymbol.length > 10) {
        console.log("Blocked invalid tool call:", cleanSymbol);
        return {
          content:[{ type: "text", text: `Error: "${symbol}" is not a valid stock ticker.` }],
          isError: true // Tells to ignore this for the widget
        };
    }
    console.log("Tool called for symbol:", cleanSymbol);

    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${cleanSymbol}&apikey=7YLTSWC3FZLJORMF`
    );

    const data = await response.json();

    // if no data returned
    if (!data || Object.keys(data).length === 0) {
        console.log("No data found or rate limited for:", cleanSymbol);
        return {
            content:[{ type: "text", text: `Error: Could not retrieve data for ${cleanSymbol}.` }],
            isError: true
        };
    }
    console.log("Returned data for", cleanSymbol, ": Success");

    return {
        content: [{
          type: "text",
          text: `Succesfully retrieved metrics for ${symbol}`
        }],
        structuredContent: {
            metrics: data // will automatically inject JSON payload in rendered HTML
        },
        _meta: {
          "openai/outputTemplate" : "ui://widget/company.html" // widget won't appear without this.
        }
    };
  }
);

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) { res.writeHead(400).end("Missing URL"); return; }
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
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
    res.writeHead(200, { "content-type": "text/plain" }).end("MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = createMCPServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }
  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Todo MCP server listening on http://localhost:${port}${MCP_PATH}`);
});