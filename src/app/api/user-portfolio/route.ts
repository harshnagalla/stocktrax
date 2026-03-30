import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { verifyAuth, unauthorized } from "@/lib/auth-middleware";

const COLLECTION = "user_portfolios";

export async function GET(request: NextRequest) {
  // Verify auth — user can only read their own portfolio
  const userId = await verifyAuth(request);
  if (!userId) return unauthorized();

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
  const userId = await verifyAuth(request);
  if (!userId) return unauthorized();

  const body = await request.json();
  const { holdings } = body;

  if (!holdings) {
    return NextResponse.json({ error: "holdings required" }, { status: 400 });
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
