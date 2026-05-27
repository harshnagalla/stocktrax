"use client";

import { BarChart3, LineChart, Briefcase, Search } from "lucide-react";

export type Tab = "market" | "screener" | "analysis" | "portfolio";

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Market", icon: BarChart3 },
  { id: "screener", label: "Screener", icon: Search },
  { id: "analysis", label: "Analysis", icon: LineChart },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
];

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <>
      {/* Desktop tab bar */}
      <nav className="hidden border-b border-border bg-white px-4 sm:block">
        <div className="mx-auto flex max-w-4xl">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "text-info"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={15} />
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-info" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile bottom tab bar — Moonbase style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-white pb-safe sm:hidden">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
            >
              <div
                className={`flex items-center justify-center rounded-full transition-all ${
                  active
                    ? "bg-info/10 px-3 py-1"
                    : "px-3 py-1"
                }`}
              >
                <Icon
                  size={20}
                  className={active ? "text-info" : "text-text-secondary"}
                  strokeWidth={active ? 2.5 : 1.75}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-info" : "text-text-secondary"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
