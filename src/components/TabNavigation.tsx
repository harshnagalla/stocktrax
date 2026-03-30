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
      <nav className="hidden border-b border-border bg-white px-4 sm:flex">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-text-primary text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-white sm:hidden">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              activeTab === id ? "text-info" : "text-text-secondary"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
