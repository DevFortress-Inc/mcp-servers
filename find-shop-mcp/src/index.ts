import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { geocodeLocation, searchNearbyShops } from "./osm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Helper to get image based on name from the fallback data
function getImageForRestaurant(name: string): string {
	// Default image if not found
	return "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Food_Bank_icon.svg/1024px-Food_Bank_icon.svg.png";
}

// In-memory cache for the last search results to support get_restaurant_details
let lastSearchResults: any[] = [];

// Load HTML widget files
function loadWidgetHtml(filename: string): string {
	try {
		// Try resolving relative to current working directory (Vercel)
		let widgetPath = path.join(process.cwd(), "public", filename);

		// If not found, try resolving relative to this file (Local dev)
		if (!fs.existsSync(widgetPath)) {
			widgetPath = path.join(__dirname, "../public", filename);
		}

		return fs.readFileSync(widgetPath, "utf-8");
	} catch (error) {
		console.error(`Failed to load widget ${filename}:`, error);
		return `<!DOCTYPE html><html><body><p>Widget not found: ${filename}</p></body></html>`;
	}
}

// Create the MCP server
function createMcpServer(): McpServer {
	const server = new McpServer({
		name: "fastfood-map-server",
		version: "1.0.0",
	});

	// Load widget HTML
	const mapWidgetHtml = loadWidgetHtml("map-widget.html");
	const detailWidgetHtml = loadWidgetHtml("detail-widget.html");

	// Register the map widget as a resource
	server.resource(
		"map-widget",
		"ui://widget/map.html",
		{
			description: "Interactive map widget showing fast food restaurants",
			mimeType: "text/html",
		},
		async () => ({
			contents: [
				{
					uri: "ui://widget/map.html",
					mimeType: "text/html+skybridge",
					text: mapWidgetHtml,
					_meta: {
						"openai/widgetPrefersBorder": true,
					},
				},
			],
		}),
	);

	// Register the detail widget as a resource
	server.resource(
		"detail-widget",
		"ui://widget/detail.html",
		{
			description: "Restaurant detail widget",
			mimeType: "text/html",
		},
		async () => ({
			contents: [
				{
					uri: "ui://widget/detail.html",
					mimeType: "text/html+skybridge",
					text: detailWidgetHtml,
					_meta: {
						"openai/widgetPrefersBorder": true,
					},
				},
			],
		}),
	);

	// Tool to search for fast food restaurants
	server.tool(
		"search_fastfood",
		"Search for fast food restaurants nearby and display them on an interactive map. Returns restaurant information with ratings and directions.",
		{
			location: z
				.string()
				.optional()
				.describe(
					"Location to search around (e.g., 'San Francisco', 'New York'). Defaults to San Francisco.",
				),
			type: z
				.string()
				.optional()
				.describe(
					"Type of fast food (e.g., 'burger', 'chicken', 'pizza', 'mexican', 'sandwich'). Leave empty for all types.",
				),
			limit: z
				.number()
				.optional()
				.describe("Maximum number of results to return. Defaults to 10."),
		},
		async ({ location, type, limit }) => {
			const maxResults = limit || 10;
			let centerLat = 37.7749; // Default SF
			let centerLng = -122.4194;
			let searchLocationName = location || "San Francisco";

			// Geocode location if provided
			if (location) {
				const geo = await geocodeLocation(location);
				if (geo) {
					centerLat = geo.lat;
					centerLng = geo.lon;
					searchLocationName = geo.display_name;
				} else {
					console.error("Could not geocode location:", location);
				}
			}

			// Fetch from OSM
			console.log(
				`Searching shops around ${centerLat}, ${centerLng} with type: ${type}`,
			);
			const osmNodes = await searchNearbyShops(
				centerLat,
				centerLng,
				3000,
				type,
			); // 3km radius

			let results: any[] = [];

			if (osmNodes.length > 0) {
				results = osmNodes.map((node: any) => {
					const name =
						node.tags["name"] || node.tags["brand"] || "Unknown Shop";
					const street = node.tags["addr:street"] || "";
					const number = node.tags["addr:housenumber"] || "";
					const city = node.tags["addr:city"] || "";

					let address = [number, street, city].filter(Boolean).join(" ");
					if (!address) address = "Address not available";

					const cuisine =
						node.tags["cuisine"] || node.tags["amenity"] || "unknown";

					return {
						id: node.id.toString(),
						name: name,
						address: address,
						lat: node.lat,
						lng: node.lon,
						rating: (Math.random() * 1.5 + 3.5).toFixed(1), // Random rating 3.5-5.0
						type: cuisine,
						image: getImageForRestaurant(name),
					};
				});
			}

			// Limit results
			results = results.slice(0, maxResults);

			// Update cache
			lastSearchResults = results;

			if (results.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: `No fast food restaurants found${type ? ` of type "${type}"` : ""} in ${searchLocationName}.`,
						},
					],
				};
			}

			// Calculate center point for the map
			const actualCenterLat =
				results.reduce((sum, r) => sum + r.lat, 0) / results.length;
			const actualCenterLng =
				results.reduce((sum, r) => sum + r.lng, 0) / results.length;

			// Build text summary for the model
			const textSummary = results
				.map(
					(r, i) =>
						`${i + 1}. ${r.name} (${r.type}) - ${r.address} - Rating: ${r.rating}/5`,
				)
				.join("\n");

			// Return structured content for ChatGPT UI
			return {
				content: [
					{
						type: "text" as const,
						text: `Found ${results.length} fast food restaurants${location ? ` in ${location}` : " nearby"}${type ? ` (type: ${type})` : ""}:\n\n${textSummary}`,
					},
				],
				structuredContent: {
					restaurants: results,
					center: { lat: actualCenterLat, lng: actualCenterLng },
					location: searchLocationName,
					searchType: type || "all",
				},
				_meta: {
					"openai/outputTemplate": "ui://widget/map.html",
					"openai/widgetDomain": "*",
				},
			};
		},
	);

	// Tool to get details about a specific restaurant
	server.tool(
		"get_restaurant_details",
		"Get detailed information about a specific fast food restaurant",
		{
			name: z.string().describe("Name of the restaurant to get details for"),
		},
		async ({ name }) => {
			const restaurant = lastSearchResults.find((r) =>
				r.name.toLowerCase().includes(name.toLowerCase()),
			);

			if (!restaurant) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Restaurant "${name}" not found in the last search results. Available restaurants: ${lastSearchResults.map((r) => r.name).join(", ")}`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `**${restaurant.name}**\nType: ${restaurant.type}\nAddress: ${restaurant.address}\nRating: ${restaurant.rating}/5\nCoordinates: ${restaurant.lat}, ${restaurant.lng}`,
					},
				],
				structuredContent: {
					restaurant,
				},
				_meta: {
					"openai/outputTemplate": "ui://widget/detail.html",
					"openai/widgetDomain": "*",
				},
			};
		},
	);

	// Define location type for type safety
	interface Location {
		name: string;
		lat: number;
		lng: number;
	}

	// Tool to show map with custom locations
	server.tool(
		"show_map",
		"Display an interactive map with specified locations",
		{
			locations: z
				.array(
					z.object({
						name: z.string().describe("Name of the location"),
						lat: z.number().describe("Latitude"),
						lng: z.number().describe("Longitude"),
					}),
				)
				.describe("Array of locations to show on the map"),
			zoom: z
				.number()
				.optional()
				.describe("Zoom level for the map (1-18). Defaults to 14."),
		},
		async ({ locations, zoom }: { locations: Location[]; zoom?: number }) => {
			if (!locations || locations.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: "No locations provided. Please specify at least one location with name, lat, and lng.",
						},
					],
				};
			}

			// Calculate center point
			const centerLat =
				locations.reduce((sum: number, l: Location) => sum + l.lat, 0) /
				locations.length;
			const centerLng =
				locations.reduce((sum: number, l: Location) => sum + l.lng, 0) /
				locations.length;
			const zoomLevel = zoom || 14;

			// Convert locations to restaurant-like format for the widget
			const restaurants = locations.map((loc: Location, index: number) => ({
				id: `loc-${index}`,
				name: loc.name,
				address: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
				lat: loc.lat,
				lng: loc.lng,
				rating: 0,
				type: "location",
				image: "",
			}));

			const locationList = locations
				.map(
					(l: Location, i: number) =>
						`${i + 1}. ${l.name} (${l.lat}, ${l.lng})`,
				)
				.join("\n");

			return {
				content: [
					{
						type: "text" as const,
						text: `Showing map with ${locations.length} location(s):\n\n${locationList}`,
					},
				],
				structuredContent: {
					restaurants,
					center: { lat: centerLat, lng: centerLng },
					zoom: zoomLevel,
					location: "Custom locations",
					searchType: "custom",
				},
				_meta: {
					"openai/outputTemplate": "ui://widget/map.html",
					"openai/widgetDomain": "*",
				},
			};
		},
	);

	return server;
}

// Create Express app
const app = express();

// Store transports by session ID for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Accept, Mcp-Session-Id",
	);
	res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}
	next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
	res.json({ status: "ok", server: "fastfood-map-mcp-server" });
});

// Server info endpoint
app.get("/", (req: Request, res: Response) => {
	res.json({
		name: "fastfood-map-mcp-server",
		version: "1.0.0",
		description: "MCP server for ChatGPT to show fast food shops on a map",
		endpoints: {
			mcp: "/mcp",
			health: "/health",
		},
		tools: ["search_fastfood", "get_restaurant_details", "show_map"],
		resources: ["ui://widget/map.html", "ui://widget/detail.html"],
	});
});

// MCP endpoint - handles all MCP protocol messages
app.all("/mcp", async (req: Request, res: Response) => {
	const sessionId = req.headers["mcp-session-id"] as string | undefined;

	// Handle GET requests for SSE streams
	if (req.method === "GET") {
		console.log("GET /mcp - SSE stream request");

		// Check for existing session
		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!;
			await transport.handleRequest(req, res);
			return;
		}

		// For new sessions without ID, return error
		res
			.status(400)
			.json({ error: "Missing Mcp-Session-Id header for GET request" });
		return;
	}

	// Handle POST requests
	if (req.method === "POST") {
		console.log("POST /mcp - Message request", {
			sessionId,
			body: JSON.stringify(req.body).substring(0, 200),
		});

		// Reuse existing transport if session exists
		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!;
			await transport.handleRequest(req, res, req.body);
			return;
		}

		// Create new transport for new sessions (initialization)
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => randomUUID(),
			onsessioninitialized: (newSessionId) => {
				console.log(`Session initialized: ${newSessionId}`);
				transports.set(newSessionId, transport);
			},
		});

		// Clean up on close
		transport.onclose = () => {
			const sid = transport.sessionId;
			if (sid && transports.has(sid)) {
				console.log(`Session closed: ${sid}`);
				transports.delete(sid);
			}
		};

		// Connect to MCP server
		const server = createMcpServer();
		await server.connect(transport);

		// Handle the request
		await transport.handleRequest(req, res, req.body);
		return;
	}

	// Handle DELETE requests for session termination
	if (req.method === "DELETE") {
		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!;
			await transport.close();
			transports.delete(sessionId);
			res.status(200).json({ message: "Session terminated" });
			return;
		}
		res.status(404).json({ error: "Session not found" });
		return;
	}

	res.status(405).json({ error: "Method not allowed" });
});

// Start server
if (process.argv[1] === __filename) {
	app.listen(PORT, () => {
		console.log(
			`🍔 Fast Food Map MCP Server running on http://localhost:${PORT}`,
		);
		console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
		console.log(`   Health check: http://localhost:${PORT}/health`);
		console.log("");
		console.log("To connect from ChatGPT, use the MCP endpoint URL:");
		console.log(`   http://localhost:${PORT}/mcp`);
	});
}

export default app;

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down server...");
	// Close all transports
	for (const [sessionId, transport] of transports) {
		console.log(`Closing session: ${sessionId}`);
		transport.close();
	}
	process.exit(0);
});
