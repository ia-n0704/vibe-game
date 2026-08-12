"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { buildLadder, tierOf, TIERS, LadderEntry } from "@/lib/leaderboard";
import { loadSubmission, Submission } from "@/lib/store";

export function LeaderboardPanel() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);

  const [ladder, setLadder] = useState<LadderEntry[]>([]);
  const [sub, setSub] = useState<Submission | null>(null);

  useEffect(() => {
    const s = loadSubmission(game.id);
    setSub(s);
    setLadder(buildLadder(game.id, s ? { name: s.name, rating: s.rating, rd: s.rd, games: s.games, winrate: s.winrate } : undefined));
  }, [game]);

  const you = ladder.find((e) => e.you);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Glicko-2 레이팅 · 비동기 래더 결과. 상위 봇의 리플레이는 학습용으로 공개됩니다.</p>
        <Link href={`/problems/${game.id}/code`} className="btn btn-primary">내 봇 만들러 가기 →</Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <span key={t.name} className="chip"><span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t.name}<span className="text-muted-2">{t.min}+</span></span>
        ))}
      </div>

      {you && sub && (
        <div className="panel mb-5 p-5" style={{ boxShadow: "0 0 0 1px rgba(124,92,255,0.25)" }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#6a47ff] text-lg font-black text-white">#{you.rank}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="font-bold">{you.name}</span><TierBadge rating={you.rating} /></div>
              <div className="mt-0.5 truncate text-xs text-muted">전략: {sub.intent}</div>
            </div>
            <div className="flex gap-6 text-center">
              <Stat label="레이팅" value={`${you.rating}`} /><Stat label="RD" value={`±${you.rd}`} /><Stat label="승률" value={`${Math.round(you.winrate * 100)}%`} />
            </div>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">봇</th><th className="px-4 py-3 font-medium">티어</th>
              <th className="px-4 py-3 text-right font-medium">레이팅</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">RD</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">대국</th>
              <th className="px-4 py-3 text-right font-medium">승률</th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((e) => (
              <tr key={e.rank + e.name} className={`border-b border-border-soft last:border-0 ${e.you ? "bg-accent/10" : "hover:bg-surface-2/50"}`}>
                <td className="px-4 py-3"><span className={`mono ${e.rank <= 3 ? "font-bold text-warn" : "text-muted-2"}`}>{e.rank}</span></td>
                <td className="px-4 py-3"><span className={`font-medium ${e.you ? "text-accent-2" : ""}`}>{e.name}</span>{e.you && <span className="ml-2 chip !py-0.5 !text-[10px]">YOU</span>}</td>
                <td className="px-4 py-3"><TierBadge rating={e.rating} /></td>
                <td className="mono px-4 py-3 text-right font-semibold">{e.rating}</td>
                <td className="mono hidden px-4 py-3 text-right text-muted sm:table-cell">±{e.rd}</td>
                <td className="mono hidden px-4 py-3 text-right text-muted sm:table-cell">{e.games}</td>
                <td className="mono px-4 py-3 text-right text-muted">{Math.round(e.winrate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!sub && (
        <p className="mt-4 text-center text-sm text-muted">
          아직 제출한 봇이 없습니다. <Link href={`/problems/${game.id}/code`} className="text-accent-2 underline underline-offset-2">코드 작성</Link> 탭에서 전략을 지시해 봇을 만들고 래더에 올려보세요.
        </p>
      )}
    </div>
  );
}

function TierBadge({ rating }: { rating: number }) {
  const t = tierOf(rating);
  return <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: t.color + "55", color: t.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />{t.name}</span>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="mono text-lg font-bold">{value}</div><div className="text-xs text-muted">{label}</div></div>;
}
