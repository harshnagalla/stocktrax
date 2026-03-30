import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// POST /api/seed-portfolio — seeds portfolio for harshnagalla@gmail.com on first login
// Only runs if portfolio is empty

const SEED_HOLDINGS = [
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

const SEED_EMAIL = "harshnagalla@gmail.com";

export async function POST(request: NextRequest) {
  const { userId, email } = await request.json();

  if (!userId || email !== SEED_EMAIL) {
    return NextResponse.json({ seeded: false });
  }

  // Check if portfolio already exists
  const doc = await db.collection("user_portfolios").doc(userId).get();
  if (doc.exists && doc.data()?.holdings?.length > 0) {
    return NextResponse.json({ seeded: false, reason: "already exists" });
  }

  // Seed the portfolio
  await db.collection("user_portfolios").doc(userId).set({
    holdings: SEED_HOLDINGS,
    updatedAt: new Date(),
  });

  return NextResponse.json({ seeded: true, count: SEED_HOLDINGS.length });
}
