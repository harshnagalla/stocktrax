"use client";

import type { TickerData } from "@/lib/fmp/types";
import { calculateVMIScore } from "@/lib/vmi-scoring";
import type { VMICriterion } from "@/lib/vmi-scoring";

interface VMIVerdictProps {
  data: TickerData;
}

function barColor(ratio: number): string {
  if (ratio >= 0.7) return "bg-bullish";
  if (ratio >= 0.4) return "bg-neutral";
  return "bg-bearish";
}

function scoreBadgeBg(total: number): string {
  if (total >= 80) return "bg-bullish";
  if (total >= 60) return "bg-bullish/80";
  if (total >= 40) return "bg-neutral";
  if (total >= 20) return "bg-bearish/80";
  return "bg-bearish";
}

function generateKeyReasons(criteria: VMICriterion[]): {
  strengths: string[];
  weaknesses: string[];
} {
  const sorted = [...criteria].sort((a, b) => {
    const ratioA = a.maxScore > 0 ? a.score / a.maxScore : 0;
    const ratioB = b.maxScore > 0 ? b.score / b.maxScore : 0;
    return ratioB - ratioA;
  });

  const strengths = sorted
    .slice(0, 3)
    .filter((c) => c.maxScore > 0 && c.score / c.maxScore >= 0.5)
    .map((c) => `Strong ${c.name}: ${c.detail}`);

  const weaknesses = sorted
    .slice(-2)
    .filter((c) => c.maxScore > 0 && c.score / c.maxScore < 0.5)
    .map((c) => `Weak ${c.name}: ${c.detail}`);

  return { strengths, weaknesses };
}

export default function VMIVerdict({ data }: VMIVerdictProps) {
  const score = calculateVMIScore(data);
  const { total, label, color, criteria, businessQuality, valuation, momentum } =
    score;
  const { strengths, weaknesses } = generateKeyReasons(criteria);

  const categories = [
    { name: "Business Quality", value: businessQuality, max: 60 },
    { name: "Valuation", value: valuation, max: 20 },
    { name: "Momentum", value: momentum, max: 20 },
  ];

  return (
    <div className="rounded-2xl bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary">
        VMI Investing Verdict
      </h3>

      {/* Score badge + label */}
      <div className="mt-4 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white ${scoreBadgeBg(total)}`}
        >
          {total}
        </div>
        <div>
          <div className={`text-lg font-bold ${color}`}>{label}</div>
          <div className="text-xs text-text-secondary">out of 100</div>
        </div>
      </div>

      {/* Category breakdown bars */}
      <div className="mt-5 space-y-3">
        {categories.map((cat) => {
          const ratio = cat.max > 0 ? cat.value / cat.max : 0;
          const pct = ratio * 100;
          return (
            <div key={cat.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-text-secondary">{cat.name}</span>
                <span className="font-medium text-text-primary">
                  {cat.value}/{cat.max}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all ${barColor(ratio)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Reasons */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold text-text-primary">
            Key Reasons
          </div>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={`s-${i}`} className="text-xs text-bullish">
                + {s}
              </li>
            ))}
            {weaknesses.map((w, i) => (
              <li key={`w-${i}`} className="text-xs text-bearish">
                - {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
