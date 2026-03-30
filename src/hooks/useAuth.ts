"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut as fbSignOut, type User } from "firebase/auth";
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
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email sign in failed:", err);
      throw err;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signInWithEmail, signOut };
}
