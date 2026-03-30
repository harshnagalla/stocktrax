"use client";

import { Activity } from "lucide-react";

interface LoginScreenProps {
  onSignIn: () => void;
  error?: string | null;
}

export default function LoginScreen({ onSignIn, error }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Activity size={32} className="text-info" />
          <span className="text-2xl font-bold">StockTrax</span>
        </div>

        <p className="text-sm text-text-secondary mb-8">
          Smart stock analysis with moat scoring, support levels, and actionable insights.
        </p>

        <button
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-bg-surface px-6 py-3.5 text-sm font-medium transition-all hover:shadow-md active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {error && (
          <div className="mt-4 rounded-xl bg-bearish/5 p-3 text-xs text-bearish">
            {error}
          </div>
        )}

        <p className="mt-6 text-[10px] text-text-secondary">
          Tip: If login doesn&apos;t work, open this link in Chrome or Safari — in-app browsers (WhatsApp, Instagram) don&apos;t support Google login.
        </p>
      </div>
    </div>
  );
}
