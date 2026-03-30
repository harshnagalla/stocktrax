import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getApp() {
  if (getApps().length > 0) return getApps()[0];

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 env var not set");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf-8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const app = getApp();
export const db = getFirestore(app);

// ─── Analysis Cache ─────────────────────────────────────────────

const CACHE_COLLECTION = "analysis_cache";
const CACHE_TTL_HOURS = 24;

export async function getCachedAnalysis(key: string): Promise<unknown | null> {
  try {
    const doc = await db.collection(CACHE_COLLECTION).doc(key).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    // Check expiry
    const cachedAt = data.cachedAt?.toDate?.() ?? new Date(data.cachedAt);
    const ageHours = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > CACHE_TTL_HOURS) {
      // Expired — delete async, return null
      db.collection(CACHE_COLLECTION).doc(key).delete().catch(() => {});
      return null;
    }

    return data.result;
  } catch (err) {
    console.error("Firestore cache read error:", err);
    return null;
  }
}

export async function setCachedAnalysis(key: string, result: unknown): Promise<void> {
  try {
    await db.collection(CACHE_COLLECTION).doc(key).set({
      result,
      cachedAt: new Date(),
    });
  } catch (err) {
    console.error("Firestore cache write error:", err);
  }
}
