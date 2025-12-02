const BASE_URL = "https://query1.finance.yahoo.com";
const BASE_URL_V2 = "https://query2.finance.yahoo.com";

export type FinancialType = "income_stmt" | "quarterly_income_stmt" | "balance_sheet" | "quarterly_balance_sheet" | "cashflow" | "quarterly_cashflow";
export type HolderType = "major_holders" | "institutional_holders" | "mutualfund_holders" | "insider_transactions" | "insider_purchases" | "insider_roster_holders";
export type RecommendationType = "recommendations" | "upgrades_downgrades";

let cachedCookie: string | null = null;
let cachedCrumb: string | null = null;
let cacheExpiry = 0;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};

async function getCookieAndCrumb(): Promise<{ cookie: string; crumb: string }> {
  const now = Date.now();
  if (cachedCookie && cachedCrumb && now < cacheExpiry) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  // Step 1: Get cookie from Yahoo Finance homepage
  const homeResponse = await fetch("https://finance.yahoo.com", {
    headers: HEADERS,
    redirect: "follow"
  });

  const setCookieHeader = homeResponse.headers.get("set-cookie") || "";
  const cookies = setCookieHeader.split(",").map(c => c.split(";")[0].trim()).join("; ");

  if (!cookies) {
    throw new Error("Failed to get Yahoo cookie");
  }

  // Step 2: Get crumb using the cookie
  const crumbResponse = await fetch(`${BASE_URL_V2}/v1/test/getcrumb`, {
    headers: { ...HEADERS, "Cookie": cookies }
  });

  const crumb = await crumbResponse.text();
  if (!crumb || crumb.includes("error")) {
    throw new Error("Failed to get Yahoo crumb");
  }

  cachedCookie = cookies;
  cachedCrumb = crumb;
  cacheExpiry = now + 30 * 60 * 1000; // Cache for 30 minutes

  return { cookie: cookies, crumb };
}

async function fetchYahoo(url: string, useCrumb = false): Promise<Response> {
  let finalUrl = url;
  let headers: Record<string, string> = { ...HEADERS };

  if (useCrumb) {
    const { cookie, crumb } = await getCookieAndCrumb();
    headers["Cookie"] = cookie;
    finalUrl += (url.includes("?") ? "&" : "?") + `crumb=${encodeURIComponent(crumb)}`;
  }

  const response = await fetch(finalUrl, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response;
}

export async function getHistoricalStockPrices(ticker: string, period = "1mo", interval = "1d"): Promise<string> {
  try {
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(ticker)}?range=${period}&interval=${interval}&includeAdjustedClose=true`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.chart?.error) return `Error: ${data.chart.error.description}`;
    const result = data.chart?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

    const records = timestamps.map((ts: number, i: number) => ({
      Date: new Date(ts * 1000).toISOString(),
      Open: quotes.open?.[i] ?? null,
      High: quotes.high?.[i] ?? null,
      Low: quotes.low?.[i] ?? null,
      Close: quotes.close?.[i] ?? null,
      Volume: quotes.volume?.[i] ?? null,
      "Adj Close": adjClose?.[i] ?? quotes.close?.[i] ?? null
    }));

    return JSON.stringify(records);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getStockInfo(ticker: string): Promise<string> {
  try {
    const modules = ["assetProfile", "summaryProfile", "summaryDetail", "financialData", "defaultKeyStatistics", "calendarEvents", "price"].join(",");
    const url = `${BASE_URL_V2}/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.quoteSummary?.error) return `Error: ${data.quoteSummary.error.description}`;
    const result = data.quoteSummary?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    const info: Record<string, unknown> = {};
    for (const [, value] of Object.entries(result)) {
      if (value && typeof value === "object") Object.assign(info, value);
    }

    return JSON.stringify(info);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getYahooFinanceNews(ticker: string): Promise<string> {
  try {
    const url = `${BASE_URL}/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=10&enableFuzzyQuery=false`;
    const response = await fetchYahoo(url, false); // Search doesn't need crumb
    const data = await response.json() as any;

    const news = data.news || [];
    if (news.length === 0) return `No news found for ${ticker}.`;

    return news.map((item: any) =>
      `Title: ${item.title || ""}\nPublisher: ${item.publisher || ""}\nPublished: ${item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : ""}\nURL: ${item.link || ""}`
    ).join("\n\n");
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getStockActions(ticker: string): Promise<string> {
  try {
    const url = `${BASE_URL}/v8/finance/chart/${encodeURIComponent(ticker)}?range=max&interval=1d&events=div,split`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.chart?.error) return `Error: ${data.chart.error.description}`;
    const result = data.chart?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    const events = result.events || {};
    const dividends = events.dividends || {};
    const splits = events.splits || {};

    const actions: any[] = [];
    for (const div of Object.values(dividends) as any[]) {
      actions.push({ Date: new Date(div.date * 1000).toISOString(), Dividends: div.amount, "Stock Splits": 0 });
    }
    for (const split of Object.values(splits) as any[]) {
      actions.push({ Date: new Date(split.date * 1000).toISOString(), Dividends: 0, "Stock Splits": split.numerator / split.denominator });
    }

    actions.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    return JSON.stringify(actions);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getFinancialStatement(ticker: string, financialType: FinancialType): Promise<string> {
  try {
    const moduleMap: Record<FinancialType, string> = {
      income_stmt: "incomeStatementHistory",
      quarterly_income_stmt: "incomeStatementHistoryQuarterly",
      balance_sheet: "balanceSheetHistory",
      quarterly_balance_sheet: "balanceSheetHistoryQuarterly",
      cashflow: "cashflowStatementHistory",
      quarterly_cashflow: "cashflowStatementHistoryQuarterly"
    };

    const module = moduleMap[financialType];
    if (!module) return `Invalid financial type: ${financialType}`;

    const url = `${BASE_URL_V2}/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${module}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.quoteSummary?.error) return `Error: ${data.quoteSummary.error.description}`;
    const result = data.quoteSummary?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    let statements: any[] = [];
    if (financialType.includes("income")) {
      const key = financialType.includes("quarterly") ? "incomeStatementHistoryQuarterly" : "incomeStatementHistory";
      statements = result[key]?.incomeStatementHistory || [];
    } else if (financialType.includes("balance")) {
      const key = financialType.includes("quarterly") ? "balanceSheetHistoryQuarterly" : "balanceSheetHistory";
      statements = result[key]?.balanceSheetStatements || [];
    } else if (financialType.includes("cashflow")) {
      const key = financialType.includes("quarterly") ? "cashflowStatementHistoryQuarterly" : "cashflowStatementHistory";
      statements = result[key]?.cashflowStatements || [];
    }

    const formatted = statements.map((stmt: any) => {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(stmt)) {
        if (value && typeof value === "object" && "raw" in (value as any)) {
          obj[key] = (value as any).raw;
        } else if (key === "endDate" && value && typeof value === "object" && "fmt" in (value as any)) {
          obj["date"] = (value as any).fmt;
        } else {
          obj[key] = value;
        }
      }
      return obj;
    });

    return JSON.stringify(formatted);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getHolderInfo(ticker: string, holderType: HolderType): Promise<string> {
  try {
    const moduleMap: Record<HolderType, string> = {
      major_holders: "majorHoldersBreakdown",
      institutional_holders: "institutionOwnership",
      mutualfund_holders: "fundOwnership",
      insider_transactions: "insiderTransactions",
      insider_purchases: "netSharePurchaseActivity",
      insider_roster_holders: "insiderHolders"
    };

    const module = moduleMap[holderType];
    if (!module) return `Invalid holder type: ${holderType}`;

    const url = `${BASE_URL_V2}/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${module}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.quoteSummary?.error) return `Error: ${data.quoteSummary.error.description}`;
    const result = data.quoteSummary?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    let holders: unknown;
    switch (holderType) {
      case "major_holders": holders = result.majorHoldersBreakdown; break;
      case "institutional_holders": holders = result.institutionOwnership?.ownershipList || []; break;
      case "mutualfund_holders": holders = result.fundOwnership?.ownershipList || []; break;
      case "insider_transactions": holders = result.insiderTransactions?.transactions || []; break;
      case "insider_purchases": holders = result.netSharePurchaseActivity; break;
      case "insider_roster_holders": holders = result.insiderHolders?.holders || []; break;
    }

    const extractRaw = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(extractRaw);
      if (typeof obj === "object") {
        const o = obj as Record<string, unknown>;
        if ("raw" in o) return o.raw;
        const newObj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(o)) newObj[k] = extractRaw(v);
        return newObj;
      }
      return obj;
    };

    return JSON.stringify(extractRaw(holders));
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getOptionExpirationDates(ticker: string): Promise<string> {
  try {
    const url = `${BASE_URL}/v7/finance/options/${encodeURIComponent(ticker)}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.optionChain?.error) return `Error: ${data.optionChain.error.description}`;
    const result = data.optionChain?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    const expirationDates = (result.expirationDates || []).map((ts: number) =>
      new Date(ts * 1000).toISOString().split("T")[0]
    );

    return JSON.stringify(expirationDates);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getOptionChain(ticker: string, expirationDate: string, optionType: "calls" | "puts"): Promise<string> {
  try {
    const dateTs = Math.floor(new Date(expirationDate).getTime() / 1000);
    const url = `${BASE_URL}/v7/finance/options/${encodeURIComponent(ticker)}?date=${dateTs}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.optionChain?.error) return `Error: ${data.optionChain.error.description}`;
    const result = data.optionChain?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    const options = result.options?.[0];
    if (!options) return `No options for ${expirationDate}. Use get_option_expiration_dates first.`;

    return JSON.stringify(optionType === "calls" ? options.calls : options.puts);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getRecommendations(ticker: string, recommendationType: RecommendationType, monthsBack = 12): Promise<string> {
  try {
    const module = recommendationType === "recommendations" ? "recommendationTrend" : "upgradeDowngradeHistory";
    const url = `${BASE_URL_V2}/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${module}`;
    const response = await fetchYahoo(url, true);
    const data = await response.json() as any;

    if (data.quoteSummary?.error) return `Error: ${data.quoteSummary.error.description}`;
    const result = data.quoteSummary?.result?.[0];
    if (!result) return `Ticker ${ticker} not found.`;

    if (recommendationType === "recommendations") {
      return JSON.stringify(result.recommendationTrend?.trend || []);
    }

    const history = result.upgradeDowngradeHistory?.history || [];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffTs = Math.floor(cutoffDate.getTime() / 1000);

    const filtered = history
      .filter((item: any) => item.epochGradeDate && item.epochGradeDate >= cutoffTs)
      .sort((a: any, b: any) => (b.epochGradeDate || 0) - (a.epochGradeDate || 0));

    const seenFirms = new Set<string>();
    const uniqueByFirm = filtered.filter((item: any) => {
      if (seenFirms.has(item.firm)) return false;
      seenFirms.add(item.firm);
      return true;
    });

    return JSON.stringify(uniqueByFirm.map((item: any) => ({
      ...item,
      gradeDate: item.epochGradeDate ? new Date(item.epochGradeDate * 1000).toISOString() : null
    })));
  } catch (error) {
    return `Error: ${error}`;
  }
}
