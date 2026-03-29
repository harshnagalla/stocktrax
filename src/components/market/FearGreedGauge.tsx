"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface FearGreedData {
  score: number;
}

function getZone(score: number): { label: string; color: string; bg: string } {
  if (score <= 24) return { label: "Extreme Fear", color: "text-bearish", bg: "bg-bearish/10" };
  if (score <= 44) return { label: "Fear", color: "text-neutral", bg: "bg-neutral/10" };
  if (score <= 55) return { label: "Neutral", color: "text-text-secondary", bg: "bg-bg-surface" };
  if (score <= 74) return { label: "Greed", color: "text-bullish", bg: "bg-bullish/10" };
  return { label: "Extreme Greed", color: "text-bullish", bg: "bg-bullish/15" };
}

export default function FearGreedGauge() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [corsBlocked, setCorsBlocked] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fetch(`https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${today}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((json) => {
        const fg = json?.fear_and_greed;
        if (fg) setData({ score: Math.round(fg.score) });
        else setCorsBlocked(true);
      })
      .catch(() => setCorsBlocked(true));
  }, []);

  if (data) {
    const zone = getZone(data.score);
    return (
      <div className={`rounded-2xl p-5 ${zone.bg}`}>
        <div className="text-xs font-medium text-text-secondary">Fear & Greed</div>
        <div className={`mt-1 text-2xl font-bold ${zone.color}`}>{data.score}</div>
        <div className={`mt-0.5 text-xs font-semibold ${zone.color}`}>{zone.label}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-xs font-medium text-text-secondary">Fear & Greed</div>
      {corsBlocked ? (
        <div className="mt-2">
          <a
            href="https://www.cnn.com/markets/fear-and-greed"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-info hover:underline"
          >
            View on CNN <ExternalLink size={10} />
          </a>
        </div>
      ) : (
        <div className="mt-1 text-lg font-bold text-text-secondary">...</div>
      )}
    </div>
  );
}
