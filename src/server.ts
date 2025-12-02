import { YahooFinanceMCP } from "./mcp";

export { YahooFinanceMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        name: "Yahoo Finance MCP Server",
        version: "1.0.0",
        description: "MCP server providing Yahoo Finance data tools",
        endpoints: { sse: "/sse", mcp: "/mcp" },
        tools: [
          { name: "get_historical_stock_prices", description: "Get historical OHLCV data", params: { ticker: "string", period: "1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max", interval: "1m|2m|5m|15m|30m|60m|90m|1h|1d|5d|1wk|1mo|3mo" } },
          { name: "get_stock_info", description: "Get comprehensive stock information", params: { ticker: "string" } },
          { name: "get_yahoo_finance_news", description: "Get latest news", params: { ticker: "string" } },
          { name: "get_stock_actions", description: "Get dividends and splits", params: { ticker: "string" } },
          { name: "get_financial_statement", description: "Get financial statements", params: { ticker: "string", financial_type: "income_stmt|quarterly_income_stmt|balance_sheet|quarterly_balance_sheet|cashflow|quarterly_cashflow" } },
          { name: "get_holder_info", description: "Get holder information", params: { ticker: "string", holder_type: "major_holders|institutional_holders|mutualfund_holders|insider_transactions|insider_purchases|insider_roster_holders" } },
          { name: "get_option_expiration_dates", description: "Get option expiration dates", params: { ticker: "string" } },
          { name: "get_option_chain", description: "Get option chain data", params: { ticker: "string", expiration_date: "YYYY-MM-DD", option_type: "calls|puts" } },
          { name: "get_recommendations", description: "Get analyst recommendations", params: { ticker: "string", recommendation_type: "recommendations|upgrades_downgrades", months_back: "number" } }
        ],
        usage: {
          claude_desktop: { mcpServers: { "yahoo-finance": { command: "npx", args: ["mcp-remote", "https://your-worker.workers.dev/sse"] } } },
          mcp_inspector: "npx @modelcontextprotocol/inspector@latest"
        }
      });
    }

    if (url.pathname.startsWith("/sse")) {
      return YahooFinanceMCP.serveSSE("/sse", { binding: "YahooFinanceMCP" }).fetch(request, env, ctx);
    }

    if (url.pathname.startsWith("/mcp")) {
      return YahooFinanceMCP.serve("/mcp", { binding: "YahooFinanceMCP" }).fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
