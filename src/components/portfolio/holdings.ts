export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  account: "Tiger" | "IBKR";
}

// Combined holdings across both accounts
// Tickers appearing in both accounts are listed separately
export const HOLDINGS: Holding[] = [
  // Tiger Brokers
  { ticker: "ALM", shares: 200, avgCost: 6.31, account: "Tiger" },
  { ticker: "DOCU", shares: 2, avgCost: 151.11, account: "Tiger" },
  { ticker: "LULU", shares: 10, avgCost: 163.95, account: "Tiger" },
  { ticker: "MSFT", shares: 15, avgCost: 359.29, account: "Tiger" },
  { ticker: "QQQ", shares: 7, avgCost: 545.65, account: "Tiger" },
  { ticker: "SNAP", shares: 3, avgCost: 39.47, account: "Tiger" },
  { ticker: "UNH", shares: 20, avgCost: 342.96, account: "Tiger" },
  { ticker: "VOO", shares: 7, avgCost: 586.77, account: "Tiger" },
  { ticker: "VTWO", shares: 10, avgCost: 89.63, account: "Tiger" },
  { ticker: "XLV", shares: 60, avgCost: 155.16, account: "Tiger" },
  { ticker: "M44U.SI", shares: 3000, avgCost: 1.099, account: "Tiger" },
  // IBKR
  { ticker: "NNDM", shares: 120, avgCost: 7.50, account: "IBKR" },
  { ticker: "CWEB", shares: 100, avgCost: 70.95, account: "IBKR" },
  { ticker: "ISRG", shares: 4, avgCost: 466.84, account: "IBKR" },
  { ticker: "ATEC", shares: 150, avgCost: 15.58, account: "IBKR" },
  { ticker: "NKE", shares: 100, avgCost: 66.40, account: "IBKR" },
  { ticker: "SHOP", shares: 30, avgCost: 52.01, account: "IBKR" },
  { ticker: "IBIT", shares: 100, avgCost: 46.50, account: "IBKR" },
  { ticker: "VTWO", shares: 80, avgCost: 89.43, account: "IBKR" },
  { ticker: "AMZN", shares: 20, avgCost: 155.22, account: "IBKR" },
  { ticker: "AMD", shares: 50, avgCost: 87.24, account: "IBKR" },
  { ticker: "GOOGL", shares: 32, avgCost: 174.75, account: "IBKR" },
  { ticker: "QQQ", shares: 28, avgCost: 455.93, account: "IBKR" },
  { ticker: "VOO", shares: 40, avgCost: 541.20, account: "IBKR" },
];

// Unique tickers for batch quote fetching
export const UNIQUE_TICKERS = [...new Set(HOLDINGS.map((h) => h.ticker))];
