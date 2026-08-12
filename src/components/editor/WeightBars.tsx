"use client";

import { Weights } from "@/lib/games/types";

interface Props {
  weights: Weights;
  labels: { key: string; label: string }[];
}

export function WeightBars({ weights, labels }: Props) {
  const max = Math.max(...Object.values(weights), 1);
  return (
    <div className="space-y-2">
      {labels.map(({ key, label }) => {
        const v = weights[key] ?? 0;
        const pct = Math.max(4, (v / max) * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="mono w-9 shrink-0 text-right text-xs text-muted-2">{v.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
