"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAME_METAS, metaOf } from "@/lib/games/meta";
import { GameGlyph } from "@/components/GameGlyph";

const TABS = [
  { seg: "", label: "문제" },
  { seg: "code", label: "코드 작성" },
  { seg: "simulate", label: "시뮬레이션" },
  { seg: "benchmark", label: "벤치마크" },
  { seg: "versus", label: "직접 대결" },
  { seg: "leaderboard", label: "리더보드" },
];

export function ProblemTabs({ gameId }: { gameId: string }) {
  const path = usePathname();
  const parts = path.split("/"); // ["", "problems", game, sub?]
  const current = parts[3] ?? "";
  const meta = metaOf(gameId);

  return (
    <div className="mb-7 space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/problems" className="hover:text-foreground">문제</Link>
        <span className="text-muted-2">/</span>
        <span className="mono text-muted-2">#{meta.no}</span>
      </div>

      {/* 다른 문제로 전환 */}
      <div className="flex flex-wrap items-center gap-2">
        {GAME_METAS.map((g) => {
          const active = g.id === gameId;
          const href = current ? `/problems/${g.id}/${current}` : `/problems/${g.id}`;
          return (
            <Link
              key={g.id}
              href={href}
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors"
              style={{
                borderColor: active ? g.accent + "88" : "var(--border)",
                background: active ? g.accent + "1a" : "var(--surface-2)",
                color: active ? "var(--foreground)" : "var(--muted)",
              }}
            >
              <span className="mono text-xs text-muted-2">#{g.no}</span>
              <GameGlyph id={g.id} size={18} style={{ color: active ? g.accent : "var(--muted-2)" }} />
              <span className="font-semibold">{g.name}</span>
            </Link>
          );
        })}
      </div>

      {/* 문제 헤더 */}
      <div className="flex items-center gap-3.5">
        <span
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{ background: meta.accent + "1f", boxShadow: `inset 0 0 0 1px ${meta.accent}44`, color: meta.accent }}
        >
          <GameGlyph id={meta.id} size={24} />
        </span>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="mono text-muted-2">#{meta.no}</span>
            {meta.name}
            <span className="chip !py-0.5 text-[11px]">{meta.difficulty}</span>
          </h1>
          <p className="text-xs text-muted">{meta.tagline}</p>
        </div>
      </div>

      {/* 탭 바 — 텍스트 + 하단 인디케이터 */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.seg === current;
          const href = t.seg ? `/problems/${gameId}/${t.seg}` : `/problems/${gameId}`;
          return (
            <Link
              key={t.seg}
              href={href}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
