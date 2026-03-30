"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Try popup first (desktop)
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const error = err as { code?: string };
      // If popup blocked or failed, use redirect (mobile-friendly)
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.error("Sign in failed:", err);
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signOut };
}
