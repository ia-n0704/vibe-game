"use client";

interface Props {
  p1: number;
  p2: number;
  p1Label?: string;
  p2Label?: string;
}

export function ScoreBar({ p1, p2, p1Label = "내 봇", p2Label = "상대" }: Props) {
  const total = Math.max(p1 + p2, 1);
  const p1pct = (p1 / total) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-p1">
          <span className="h-2.5 w-2.5 rounded-full bg-p1" />
          {p1Label} · {p1}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-p2">
          {p2} · {p2Label}
          <span className="h-2.5 w-2.5 rounded-full bg-p2" />
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full bg-p1 transition-all duration-300"
          style={{ width: `${p1pct}%` }}
        />
        <div
          className="h-full bg-p2 transition-all duration-300"
          style={{ width: `${100 - p1pct}%` }}
        />
      </div>
    </div>
  );
}
