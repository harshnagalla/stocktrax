import { NextRequest, NextResponse } from "next/server";
import { db } from "./firebase";
import { getAuth } from "firebase-admin/auth";

// Verify Firebase ID token from Authorization header
// Returns userId if valid, null if not
export async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
