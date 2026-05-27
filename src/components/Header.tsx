"use client";

import { LogOut } from "lucide-react";
import type { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
}

export default function Header({ user, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info shadow-sm shadow-info/20">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-text-primary">StockTrax</div>
            <div className="hidden text-[10px] font-medium text-text-secondary sm:block">Market, analysis, portfolio</div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full border border-border" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info">
                <span className="text-xs font-bold text-white">
                  {user.displayName?.[0] ?? user.email?.[0] ?? "U"}
                </span>
              </div>
            )}
            <span className="text-xs font-medium text-text-secondary hidden sm:inline">
              {user.displayName?.split(" ")[0]}
            </span>
            <button
              onClick={onSignOut}
              className="rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
