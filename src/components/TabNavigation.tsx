"use client";

import { BarChart3, LineChart, GitCompareArrows } from "lucide-react";

export type Tab = "market" | "analysis" | "compare";

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Market", icon: BarChart3 },
  { id: "analysis", label: "Analysis", icon: LineChart },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
];

export default function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <nav className="flex border-b border-border bg-white px-4">
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
  );
}
