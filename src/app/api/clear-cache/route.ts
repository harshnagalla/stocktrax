import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

// POST /api/clear-cache — clears all stale analysis cache from Firestore
// Admin only — call once to clear bad data

export async function POST() {
  try {
    const snapshot = await db.collection("analysis_cache").get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return NextResponse.json({ cleared: snapshot.size });
  } catch (err) {
    console.error("Clear cache failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
