"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups for this site, or open in Chrome/Safari (not WhatsApp/Instagram browser).");
      } else if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
        // User closed popup — not an error
      } else {
        setError("Sign in failed. Try opening in Chrome or Safari instead of in-app browser.");
        console.error("Sign in failed:", err);
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return { user, loading, error, signInWithGoogle, signOut };
}
