import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getHistoricalStockPrices,
  getStockInfo,
  getYahooFinanceNews,
  getStockActions,
  getFinancialStatement,
  getHolderInfo,
  getOptionExpirationDates,
  getOptionChain,
  getRecommendations,
  type FinancialType,
  type HolderType,
  type RecommendationType
} from "./yahoo-finance-api";

const PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"] as const;
const INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"] as const;
const FINANCIAL_TYPES = ["income_stmt", "quarterly_income_stmt", "balance_sheet", "quarterly_balance_sheet", "cashflow", "quarterly_cashflow"] as const;
const HOLDER_TYPES = ["major_holders", "institutional_holders", "mutualfund_holders", "insider_transactions", "insider_purchases", "insider_roster_holders"] as const;
const RECOMMENDATION_TYPES = ["recommendations", "upgrades_downgrades"] as const;

export class YahooFinanceMCP extends McpAgent<Env> {
  server = new McpServer({ name: "yfinance", version: "1.0.0" });

  async init() {
    this.server.tool(
      "get_historical_stock_prices",
      "Get historical stock prices (OHLCV) for a ticker",
      {
        ticker: z.string().describe('Ticker symbol, e.g. "AAPL"'),
        period: z.enum(PERIODS).default("1mo"),
        interval: z.enum(INTERVALS).default("1d")
      },
      async ({ ticker, period, interval }) => ({
        content: [{ type: "text", text: await getHistoricalStockPrices(ticker, period, interval) }]
      })
    );

    this.server.tool(
      "get_stock_info",
      "Get comprehensive stock information for a ticker",
      { ticker: z.string().describe('Ticker symbol, e.g. "AAPL"') },
      async ({ ticker }) => ({
        content: [{ type: "text", text: await getStockInfo(ticker) }]
      })
    );

    this.server.tool(
      "get_yahoo_finance_news",
      "Get latest news for a ticker",
      { ticker: z.string().describe('Ticker symbol, e.g. "AAPL"') },
      async ({ ticker }) => ({
        content: [{ type: "text", text: await getYahooFinanceNews(ticker) }]
      })
    );

    this.server.tool(
      "get_stock_actions",
      "Get dividends and stock splits for a ticker",
      { ticker: z.string().describe('Ticker symbol, e.g. "AAPL"') },
      async ({ ticker }) => ({
        content: [{ type: "text", text: await getStockActions(ticker) }]
      })
    );

    this.server.tool(
      "get_financial_statement",
      "Get financial statements for a ticker",
      {
        ticker: z.string().describe('Ticker symbol, e.g. "AAPL"'),
        financial_type: z.enum(FINANCIAL_TYPES)
      },
      async ({ ticker, financial_type }) => ({
        content: [{ type: "text", text: await getFinancialStatement(ticker, financial_type as FinancialType) }]
      })
    );

    this.server.tool(
      "get_holder_info",
      "Get holder information for a ticker",
      {
        ticker: z.string().describe('Ticker symbol, e.g. "AAPL"'),
        holder_type: z.enum(HOLDER_TYPES)
      },
      async ({ ticker, holder_type }) => ({
        content: [{ type: "text", text: await getHolderInfo(ticker, holder_type as HolderType) }]
      })
    );

    this.server.tool(
      "get_option_expiration_dates",
      "Get available option expiration dates for a ticker",
      { ticker: z.string().describe('Ticker symbol, e.g. "AAPL"') },
      async ({ ticker }) => ({
        content: [{ type: "text", text: await getOptionExpirationDates(ticker) }]
      })
    );

    this.server.tool(
      "get_option_chain",
      "Get option chain for a ticker",
      {
        ticker: z.string().describe('Ticker symbol, e.g. "AAPL"'),
        expiration_date: z.string().describe("Expiration date (YYYY-MM-DD)"),
        option_type: z.enum(["calls", "puts"])
      },
      async ({ ticker, expiration_date, option_type }) => ({
        content: [{ type: "text", text: await getOptionChain(ticker, expiration_date, option_type) }]
      })
    );

    this.server.tool(
      "get_recommendations",
      "Get analyst recommendations for a ticker",
      {
        ticker: z.string().describe('Ticker symbol, e.g. "AAPL"'),
        recommendation_type: z.enum(RECOMMENDATION_TYPES),
        months_back: z.number().default(12)
      },
      async ({ ticker, recommendation_type, months_back }) => ({
        content: [{ type: "text", text: await getRecommendations(ticker, recommendation_type as RecommendationType, months_back) }]
      })
    );
  }
}
