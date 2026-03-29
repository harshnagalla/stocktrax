"use client";

interface SentimentScoreProps {
  score: number;
  label: string;
  color: string;
  commentary: string;
}

// Map sentiment to a gradient bar position (0-100)
function getBarSegment(label: string): { position: number; segments: string[] } {
  const segments = ["Bullish", "Neutral", "Correction", "Bearish"];
  switch (label) {
    case "Market Euphoria": return { position: 5, segments };
    case "Bullish Sentiment": return { position: 20, segments };
    case "Neutral / Mixed": return { position: 45, segments };
    case "Bearish / Fearful": return { position: 70, segments };
    case "Capitulation": return { position: 90, segments };
    default: return { position: 50, segments };
  }
}

export default function SentimentScore({
  score,
  label,
  color,
  commentary,
}: SentimentScoreProps) {
  const bar = getBarSegment(label);

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <div className="text-xs font-medium text-text-secondary">Market Sentiment</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
      </div>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">
        {commentary}
      </p>

      {/* Gradient bar */}
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-bullish via-neutral to-bearish">
          <div
            className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-full bg-text-primary ring-2 ring-white"
            style={{ left: `${bar.position}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-text-secondary">
          {bar.segments.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
