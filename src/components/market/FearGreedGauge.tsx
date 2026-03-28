"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface FearGreedData {
  score: number;
  rating: string;
}

function getZone(score: number): { label: string; color: string } {
  if (score <= 24) return { label: "Extreme Fear", color: "text-bearish" };
  if (score <= 44) return { label: "Fear", color: "text-neutral" };
  if (score <= 55) return { label: "Neutral", color: "text-text-secondary" };
  if (score <= 74) return { label: "Greed", color: "text-bullish" };
  return { label: "Extreme Greed", color: "text-bullish" };
}

export default function FearGreedGauge() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [corsBlocked, setCorsBlocked] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fetch(
      `https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${today}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Not OK");
        return res.json();
      })
      .then((json) => {
        const fg = json?.fear_and_greed;
        if (fg) {
          setData({ score: Math.round(fg.score), rating: fg.rating });
        } else {
          setCorsBlocked(true);
        }
      })
      .catch(() => {
        setCorsBlocked(true);
      });
  }, []);

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-2 text-xs text-text-secondary">
        CNN Fear & Greed Index
      </div>

      {data ? (
        <>
          <div className={`text-3xl font-bold ${getZone(data.score).color}`}>
            {data.score}
          </div>
          <div
            className={`mt-1 text-xs font-medium ${getZone(data.score).color}`}
          >
            {getZone(data.score).label}
          </div>
        </>
      ) : corsBlocked ? (
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">
            CORS blocked in browser
          </div>
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
        <div className="text-sm text-text-secondary">Loading...</div>
      )}
    </div>
  );
}
