# Yahoo Finance MCP Server

A remote MCP (Model Context Protocol) server for Yahoo Finance data, deployed on Cloudflare Workers.

## Features

- **9 tools** for accessing Yahoo Finance data
- **Cookie + Crumb authentication** for reliable API access
- **SSE and Streamable HTTP** transport support
- **Cloudflare Workers** deployment with Durable Objects

## Tools

| Tool | Description |
|------|-------------|
| `get_historical_stock_prices` | Get OHLCV data for a ticker |
| `get_stock_info` | Get comprehensive stock information |
| `get_yahoo_finance_news` | Get latest news for a ticker |
| `get_stock_actions` | Get dividends and stock splits |
| `get_financial_statement` | Get income statement, balance sheet, or cashflow |
| `get_holder_info` | Get institutional, insider, and major holders |
| `get_option_expiration_dates` | Get available option expiration dates |
| `get_option_chain` | Get calls/puts option chain |
| `get_recommendations` | Get analyst recommendations |

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server runs at `http://localhost:5173`

## Deploy

```bash
npm run deploy
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | JSON documentation |
| `/sse` | MCP SSE transport |
| `/mcp` | MCP Streamable HTTP transport |

## Usage

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "yahoo-finance": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-worker.workers.dev/sse"]
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect to `http://localhost:5173/sse` (local) or `https://your-worker.workers.dev/sse` (deployed).

## Project Structure

```
src/
├── server.ts           # Worker entry point
├── mcp.ts              # MCP server with tool definitions
└── yahoo-finance-api.ts # Yahoo Finance API client
```

## License

MIT
