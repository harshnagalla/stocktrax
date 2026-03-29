"use client";

import { Activity } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-info" />
        <span className="text-base font-semibold text-text-primary">
          StockTrax
        </span>
      </div>
    </header>
  );
}
