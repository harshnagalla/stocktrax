"use client";

interface SentimentScoreProps {
  score: number;
  label: string;
  color: string;
  commentary: string;
}

export default function SentimentScore({
  score,
  label,
  color,
  commentary,
}: SentimentScoreProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-1 text-xs text-text-secondary">
        Market Sentiment
      </div>
      <div className={`text-4xl font-bold ${color}`}>{score}</div>
      <div className={`mt-1 text-sm font-medium ${color}`}>{label}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">
        {commentary}
      </p>
    </div>
  );
}
