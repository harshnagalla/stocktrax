"use client";

interface VixGaugeProps {
  vix: { price: number; changePercent: number } | undefined;
}

function getVixZone(level: number) {
  if (level > 40) return { label: "Extreme Panic", color: "text-bearish", bg: "bg-bearish/10" };
  if (level > 30) return { label: "High Fear", color: "text-bearish", bg: "bg-bearish/5" };
  if (level > 20) return { label: "Elevated", color: "text-neutral", bg: "bg-neutral/10" };
  if (level > 15) return { label: "Normal", color: "text-info", bg: "bg-info/5" };
  return { label: "Low Volatility", color: "text-bullish", bg: "bg-bullish/10" };
}

export default function VixGauge({ vix }: VixGaugeProps) {
  const level = vix?.price ?? 0;
  const zone = getVixZone(level);

  return (
    <div className={`rounded-2xl p-5 ${zone.bg}`}>
      <div className="text-xs font-medium text-text-secondary">VIX</div>
      {vix ? (
        <>
          <div className={`mt-1 text-2xl font-bold ${zone.color}`}>{level.toFixed(1)}</div>
          <div className={`mt-1 text-xs font-semibold ${zone.color}`}>{zone.label}</div>
        </>
      ) : (
        <div className="mt-1 text-2xl font-bold text-text-secondary">--</div>
      )}
    </div>
  );
}
