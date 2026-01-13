# Fast Food Map MCP Server

An HTTP-based MCP (Model Context Protocol) server for ChatGPT that displays fast food restaurants on interactive maps using ChatGPT's native UI component system.

## Features

- 🍔 **Search Fast Food**: Find nearby fast food restaurants by type (burger, chicken, pizza, mexican, sandwich)
- 🗺️ **Interactive Maps**: Display results on maps using ChatGPT's native UI components
- 📍 **Restaurant Details**: Get detailed information about specific restaurants
- 🎯 **Custom Locations**: Show any locations on a map
- 🚗 **Get Directions**: One-click directions to any restaurant via Google Maps

## How It Works

This MCP server uses ChatGPT's UI component system (not iframes) to render interactive maps and restaurant lists directly in the ChatGPT interface. The server returns:

1. **Text content** - For the AI model to understand and reference
2. **Structured content** - Data that powers the UI component
3. **React component bundle** - Inline React code that renders the UI

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- ChatGPT Desktop App or ChatGPT Plus account

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd hackthon-vibe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000` by default.

   To use a different port:
   ```bash
   PORT=8080 npm start
   ```

## Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available tools |
| `/mcp` | GET/POST/DELETE | MCP protocol endpoint (Streamable HTTP) |
| `/health` | GET | Health check endpoint |

## Configuration for ChatGPT

### ChatGPT Desktop App

1. Make sure the MCP server is running:
   ```bash
   npm start
   ```

2. Open ChatGPT Desktop App settings

3. Navigate to **Features** → **MCP Servers**

4. Add a new MCP server with the following URL:
   ```
   http://localhost:3000/mcp
   ```

### Using ngrok for Local Development

If ChatGPT can't connect to `localhost`, use ngrok to create a public tunnel:

1. Install ngrok: https://ngrok.com/download

2. Start your MCP server:
   ```bash
   npm start
   ```

3. In another terminal, create a tunnel:
   ```bash
   ngrok http 3000
   ```

4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and use it in ChatGPT:
   ```
   https://abc123.ngrok.io/mcp
   ```

## Usage Examples

Once configured, you can ask ChatGPT things like:

- "Show me fast food restaurants nearby"
- "Find burger places around San Francisco"
- "Search for chicken restaurants and show them on a map"
- "What pizza places are nearby?"
- "Get details about McDonald's"
- "Show 3 burger restaurants"

## Available Tools

### 1. `search_fastfood`
Search for fast food restaurants and display them on a map.

**Parameters:**
- `location` (optional): Location to search around (defaults to "San Francisco")
- `type` (optional): Type of fast food - "burger", "chicken", "pizza", "mexican", "sandwich"
- `limit` (optional): Maximum number of results (defaults to 5)

**Example prompt:** "Find 3 burger restaurants nearby"

### 2. `get_restaurant_details`
Get detailed information about a specific restaurant.

**Parameters:**
- `name` (required): Name of the restaurant

**Example prompt:** "Get details about Chick-fil-A"

### 3. `show_map`
Display a custom map with specified locations.

**Parameters:**
- `locations` (required): Array of location objects with name, lat, lng
- `zoom` (optional): Zoom level 1-18 (defaults to 14)

**Example prompt:** "Show me a map with McDonald's at 37.77, -122.41"

## ChatGPT UI Components

This server uses ChatGPT's native UI component system instead of iframes. Each tool response includes:

```json
{
  "content": [{ "type": "text", "text": "..." }],
  "structuredContent": {
    "restaurants": [...],
    "center": { "lat": 37.78, "lng": -122.41 }
  },
  "_meta": {
    "openai/component": {
      "type": "react",
      "bundle": "// React component code..."
    },
    "openai/widgetDomain": "*"
  }
}
```

The React component bundle renders:
- A static map image from OpenStreetMap
- A list of restaurants with ratings
- "Get Directions" buttons that open Google Maps

### Supported ChatGPT UI APIs

The components use these `window.openai` APIs:
- `window.openai.toolOutput` - Access structured data
- `window.openai.openExternal({ href })` - Open external links (e.g., Google Maps directions)

## Development

### Run in development mode (with hot reload):
```bash
npm run dev
```

### Build for production:
```bash
npm run build
```

### Build and start:
```bash
npm run serve
```

### Test the server:
```bash
# Check server info
curl http://localhost:3000/

# Health check
curl http://localhost:3000/health

# Test MCP initialization
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

## Project Structure

```
hackthon-vibe/
├── src/
│   └── index.ts      # Main HTTP MCP server with React components
├── dist/             # Compiled JavaScript (after build)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── Dockerfile        # Container deployment
└── README.md         # This file
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to run the HTTP server on |

## Extending with Real APIs

The current implementation uses sample data. To use real location data, you can integrate with:

1. **Google Places API**: Real-time restaurant data with ratings and reviews
2. **Yelp Fusion API**: Business search with detailed reviews
3. **Foursquare API**: Venue discovery and recommendations
4. **OpenStreetMap Overpass API**: Free geographic data

Example integration point in `src/index.ts`:
```typescript
// Replace fastFoodData with API call
async function fetchNearbyRestaurants(lat: number, lng: number, type?: string) {
  const response = await fetch(
    `https://api.example.com/places?lat=${lat}&lng=${lng}&type=${type}`
  );
  return response.json();
}
```

## Deploying to Production

### Using Docker

Build and run:
```bash
docker build -t fastfood-mcp-server .
docker run -p 3000:3000 fastfood-mcp-server
```

### Using Railway/Render/Fly.io

1. Push your code to GitHub
2. Connect your repository to the platform
3. Set the build command: `npm run build`
4. Set the start command: `npm start`
5. Deploy!

## Troubleshooting

### Server not connecting to ChatGPT
1. Ensure the server is running (`npm start`)
2. Check that the port is not blocked by a firewall
3. Verify the MCP endpoint URL is correct: `http://localhost:3000/mcp`
4. Check server logs for connection attempts
5. **ChatGPT Desktop App may not be able to reach localhost** - use ngrok:
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL (e.g., `https://abc123.ngrok.io/mcp`) in ChatGPT settings.
6. Ensure your server responds correctly to the initialization request

### Port already in use
```bash
# Use a different port
PORT=8080 npm start
```

### Build errors
1. Ensure Node.js 18+ is installed
2. Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Map not displaying
- The maps use OpenStreetMap static map images (no iframes)
- Some corporate networks may block external image requests
- Check browser console for any CSP errors

## References

- [ChatGPT UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Apps SDK Examples](https://github.com/openai/apps-sdk-examples)

## License

MIT