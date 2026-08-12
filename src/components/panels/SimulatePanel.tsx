"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { Bot } from "@/lib/games/types";
import { compileBot } from "@/lib/games/compile";
import { simulate, estimateWinrate, Match } from "@/lib/games/sim";
import { loadSubmission, listSavedBots } from "@/lib/store";
import { ReplayViewer } from "@/components/ReplayViewer";
import { Icon } from "@/components/Icon";

interface Combatant { id: string; name: string; bot: Bot<unknown, unknown>; mine?: boolean }

export function SimulatePanel() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);

  // 저장된 봇 + 제출 봇은 mount 후 로드(SSR 하이드레이션 불일치 방지)
  const [mine, setMine] = useState<{ id: string; name: string; code?: string; weights?: import("@/lib/games/types").Weights }[]>([]);
  useEffect(() => {
    const list: { id: string; name: string; code?: string; weights?: import("@/lib/games/types").Weights }[] = [];
    listSavedBots(game.id)
      .filter((b) => !b.lang || b.lang === "javascript")
      .forEach((b) => list.push({ id: "saved:" + b.id, name: b.name, code: b.code }));
    const sub = loadSubmission(game.id);
    if (sub && (sub.code || sub.weights)) list.push({ id: "submitted", name: "제출된 봇", code: sub.code, weights: sub.weights });
    setMine(list);
  }, [game]);

  // 내 봇(저장/제출) + 예시 AI들
  const combatants = useMemo<Combatant[]>(() => {
    const list: Combatant[] = game.sampleBots.map((b) => ({ id: b.id, name: b.name, bot: b.bot }));
    [...mine].reverse().forEach((m) => {
      const bot = m.code ? compileBot(game, m.code).bot : m.weights ? game.makeBot(m.weights) : null;
      if (bot) list.unshift({ id: m.id, name: `내 봇 · ${m.name.slice(0, 18)}`, bot, mine: true });
    });
    return list;
  }, [game, mine]);

  const hasMine = combatants[0]?.mine;
  const [p1Id, setP1Id] = useState("");
  const [p2Id, setP2Id] = useState("");
  const [match, setMatch] = useState<Match<unknown, unknown> | null>(null);
  const [quick, setQuick] = useState<{ w: number; d: number; l: number } | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setP1Id(hasMine ? "me" : combatants[0]?.id ?? "");
    setP2Id(combatants.find((c) => c.id !== (hasMine ? "me" : combatants[0]?.id))?.id ?? combatants[0]?.id ?? "");
    setMatch(null);
    setQuick(null);
  }, [combatants, hasMine]);

  const botOf = (id: string) => combatants.find((c) => c.id === id)?.bot ?? combatants[0].bot;
  const nameOf = (id: string) => combatants.find((c) => c.id === id)?.name ?? "?";

  function runOnce() {
    setMatch(simulate(game, botOf(p1Id), botOf(p2Id), 1));
  }
  function runAggregate() {
    setRunning(true);
    setTimeout(() => {
      const r = estimateWinrate(game, botOf(p1Id), botOf(p2Id), 20);
      setQuick({ w: r.wins, d: r.draws, l: r.losses });
      setRunning(false);
    }, 30);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* 설정 */}
      <div className="flex flex-col gap-4">
        <div className="panel p-5">
          <h3 className="mb-1 text-sm font-semibold">시뮬레이션</h3>
          <p className="mb-4 text-xs text-muted">두 봇을 붙여 대국을 돌리고 리플레이로 확인하세요. 내 봇을 제출했다면 목록 맨 위에 나타납니다.</p>

          {!hasMine && (
            <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
              아직 제출한 내 봇이 없습니다. <Link href={`/problems/${game.id}/code`} className="text-accent-2 underline underline-offset-2">코드 작성</Link>에서 만들면 여기서 시뮬레이션할 수 있어요. (지금은 예시 AI끼리 붙여볼 수 있습니다.)
            </div>
          )}

          <label className="mb-1 block text-xs text-p1">플레이어 1 (파랑)</label>
          <select value={p1Id} onChange={(e) => { setP1Id(e.target.value); setQuick(null); }} className="mb-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60">
            {combatants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="mb-1 block text-xs text-p2">플레이어 2 (빨강)</label>
          <select value={p2Id} onChange={(e) => { setP2Id(e.target.value); setQuick(null); }} className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60">
            {combatants.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="flex gap-2">
            <button className="btn btn-primary inline-flex flex-1 items-center justify-center gap-1.5" onClick={runOnce}><Icon name="play" size={14} />1판 실행</button>
            <button className="btn inline-flex flex-1 items-center justify-center gap-1.5" onClick={runAggregate} disabled={running}><Icon name="chart" size={14} />{running ? "집계 중…" : "20판 집계"}</button>
          </div>
        </div>

        {quick && (
          <div className="panel p-5">
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">20판 집계 (P1 기준)</span><span className="mono text-xs text-muted">{Math.round((quick.w / 20) * 100)}% 승</span></div>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-surface-3">
              <div className="bg-success" style={{ flex: quick.w }} /><div className="bg-muted-2" style={{ flex: quick.d }} /><div className="bg-danger" style={{ flex: quick.l }} />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span className="text-success">{quick.w}승</span><span>{quick.d}무</span><span className="text-danger">{quick.l}패</span>
            </div>
          </div>
        )}
      </div>

      {/* 리플레이 */}
      <div className="panel p-5">
        {match ? (
          <div className="mx-auto max-w-[560px]">
            <ReplayViewer game={game} match={match} p1Label={nameOf(p1Id)} p2Label={nameOf(p2Id)} />
          </div>
        ) : (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-sm text-muted">
            <div className="mb-3 text-muted-2"><Icon name="flask" size={34} /></div>
            플레이어를 고르고 <span className="mx-1 text-foreground">1판 실행</span>을 누르면<br />여기에서 대국 리플레이가 재생됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
