"use client";

import type { TickerData } from "@/lib/fmp/types";

interface ValuationDashboardProps {
  data: TickerData;
}

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}

function MetricCard({ label, value, note, noteColor }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-text-primary">
        {value}
      </div>
      {note && (
        <div className={`mt-0.5 text-[10px] ${noteColor ?? "text-text-secondary"}`}>
          {note}
        </div>
      )}
    </div>
  );
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null || !isFinite(v)) return "--";
  return v.toFixed(decimals);
}

export default function ValuationDashboard({ data }: ValuationDashboardProps) {
  const km = data.keyMetrics;
  const ratios = data.ratios;
  const dcf = data.dcf;
  const profile = data.profile;

  // P/E
  const pe = km?.peRatioTTM;
  const sector = profile?.sector ?? null;
  const sectorPEEntry = sector
    ? data.sectorPE?.find(
        (s) => s.sector.toLowerCase() === sector.toLowerCase()
      )
    : null;
  const sectorPEVal = sectorPEEntry ? parseFloat(sectorPEEntry.pe) : null;
  let peNote: string | undefined;
  let peNoteColor: string | undefined;
  if (pe != null && sectorPEVal != null && isFinite(sectorPEVal) && sectorPEVal > 0) {
    if (pe < sectorPEVal) {
      peNote = `Below sector avg (${sectorPEVal.toFixed(1)})`;
      peNoteColor = "text-bullish";
    } else {
      peNote = `Above sector avg (${sectorPEVal.toFixed(1)})`;
      peNoteColor = "text-bearish";
    }
  }

  // PEG
  const peg = km?.pegRatioTTM;
  let pegNote: string | undefined;
  let pegNoteColor: string | undefined;
  if (peg != null && isFinite(peg)) {
    if (peg > 0 && peg <= 1) {
      pegNote = "Undervalued";
      pegNoteColor = "text-bullish";
    } else if (peg <= 1.5) {
      pegNote = "Fair value";
      pegNoteColor = "text-neutral";
    } else if (peg <= 2) {
      pegNote = "Slightly expensive";
      pegNoteColor = "text-neutral";
    } else {
      pegNote = "Expensive";
      pegNoteColor = "text-bearish";
    }
  }

  // DCF margin of safety
  const dcfVal = dcf?.dcf ?? null;
  const dcfPrice = dcf?.price ?? null;
  let dcfMoS: string = "--";
  let dcfNote: string | undefined;
  let dcfNoteColor: string | undefined;
  if (dcfVal != null && dcfPrice != null && dcfVal > 0) {
    const margin = ((dcfVal - dcfPrice) / dcfVal) * 100;
    dcfMoS = `${margin.toFixed(1)}%`;
    if (margin > 15) {
      dcfNote = "Good margin of safety";
      dcfNoteColor = "text-bullish";
    } else if (margin > 0) {
      dcfNote = "Slightly undervalued";
      dcfNoteColor = "text-neutral";
    } else {
      dcfNote = "Overvalued vs DCF";
      dcfNoteColor = "text-bearish";
    }
  }

  // P/S
  const ps = km?.priceToSalesRatioTTM;

  // EV/EBITDA
  const evEbitda = km?.enterpriseValueOverEBITDATTM;

  // FCF Yield
  const fcfYield = km?.freeCashFlowYieldTTM;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-text-primary">
        Valuation
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="P/E (TTM)"
          value={fmt(pe, 1)}
          note={peNote}
          noteColor={peNoteColor}
        />
        <MetricCard
          label="PEG Ratio"
          value={fmt(peg)}
          note={pegNote}
          noteColor={pegNoteColor}
        />
        <MetricCard
          label="P/S (TTM)"
          value={fmt(ps, 1)}
        />
        <MetricCard
          label="EV/EBITDA"
          value={fmt(evEbitda, 1)}
        />
        <MetricCard
          label="FCF Yield"
          value={fcfYield != null && isFinite(fcfYield) ? `${(fcfYield * 100).toFixed(1)}%` : "--"}
        />
        <MetricCard
          label="DCF Margin of Safety"
          value={dcfMoS}
          note={dcfNote}
          noteColor={dcfNoteColor}
        />
      </div>
    </div>
  );
}
