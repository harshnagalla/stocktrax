"use client";

import { LogOut } from "lucide-react";
import type { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
}

export default function Header({ user, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-info flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight">StockTrax</span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-info flex items-center justify-center">
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
              className="rounded-full p-1.5 text-text-secondary hover:bg-bg-surface transition-colors"
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
