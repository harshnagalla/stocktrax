import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// GET /api/user-portfolio?userId=xxx — fetch user's portfolio
// POST /api/user-portfolio — add/update holdings
// DELETE /api/user-portfolio — remove a holding

const COLLECTION = "user_portfolios";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const doc = await db.collection(COLLECTION).doc(userId).get();
    if (!doc.exists) return NextResponse.json({ holdings: [] });
    return NextResponse.json(doc.data());
  } catch (err) {
    console.error("Portfolio fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, holdings } = body;

  if (!userId || !holdings) {
    return NextResponse.json({ error: "userId and holdings required" }, { status: 400 });
  }

  try {
    await db.collection(COLLECTION).doc(userId).set(
      { holdings, updatedAt: new Date() },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Portfolio save error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
