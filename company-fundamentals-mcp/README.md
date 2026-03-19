
# Company Fundamentals Widget (MCP Server)

This project is a lightweight MCP server that provides a financial data widget for analyzing public companies using stock ticker symbols.

It integrates a custom HTML widget with a backend tool that fetches real-time company fundamentals from the Alpha Vantage API.

# Live Demo
- Athena Agent: https://athenachat.bot/chatbot/agent/company-fundamentals9823
- MCP Endpoint: https://reuseable-collins-ungenerical.ngrok-free.dev/mcp

---

## Features

* Search companies by stock ticker/symbol (e.g., AAPL, GOOGL)
* View key financial metrics:
  * Revenue
  * Profit Margin
  * EBITDA
  * P/E Ratio

* Toggle between:
  * Dashboard (card view)
  * Table view

* MCP tool integration with structured output
---

## Project Structure

```
.
├── public/
│   └── widget.html      # Frontend widget UI
├── server.js            # MCP server & tool logic
├── package.json
```

---

## How It Works

### 1. MCP Tool

The server exposes a tool:

**`get_company_fundamentals`**

* Accepts: stock ticker symbol
* Returns: structured financial data
* Injects data directly into the widget UI

---

### 2. Widget UI

The widget:

* Accepts user input (ticker)
* Calls the MCP tool (if available)
* Falls back to Alpha Vantage API if needed
* Dynamically renders results

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

---

### 2. Run the server

```bash
node server.js
```

Server runs at:

```
http://localhost:8787/mcp
```

---

### 3. (Optional) Expose with ngrok

```bash
npx ngrok http 8787
```

---

## API Used

* Alpha Vantage (Company Overview endpoint)

Note: The API key is currently hardcoded for demo purposes.

---

## Limitations

* Alpha Vantage has strict rate limits
* Only supports valid stock ticker symbols
* Minimal error handling for edge cases

---

## Future Improvements

* Add caching to avoid rate limits
* Improve error messages in UI
* Support more financial metrics
* Add loading skeletons instead of text
* Secure API key with environment variables

---

## Author

**Mimavine**

---

## Notes

* The widget is rendered using MCP resource templates
* Designed for experimentation with MCP + UI integration
