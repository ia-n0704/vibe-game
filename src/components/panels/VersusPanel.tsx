"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { Player } from "@/lib/games/types";
import { ScoreBar } from "@/components/ScoreBar";
import { Icon } from "@/components/Icon";

type Phase = "human" | "ai" | "over";

export function VersusPanel() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);

  const [state, setState] = useState<unknown>(() => game.initial());
  const [phase, setPhase] = useState<Phase>("human");
  const [oppId, setOppId] = useState(game.sampleBots[Math.min(2, game.sampleBots.length - 1)].id);
  const [lastMove, setLastMove] = useState<unknown | null>(null);
  const [log, setLog] = useState<string[]>(["게임 시작 — 당신(파랑)이 선공입니다."]);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const oppBot = useMemo(() => game.sampleBots.find((b) => b.id === oppId) ?? game.sampleBots[0], [game, oppId]);

  useEffect(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    setState(game.initial());
    setPhase("human");
    setLastMove(null);
    setOppId(game.sampleBots[Math.min(2, game.sampleBots.length - 1)].id);
    setLog(["게임 시작 — 당신(파랑)이 선공입니다."]);
  }, [game]);

  const sc = game.score(state);
  const st = game.status(state);

  const reset = useCallback(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    setState(game.initial());
    setPhase("human");
    setLastMove(null);
    setLog(["게임 시작 — 당신(파랑)이 선공입니다."]);
  }, [game]);

  const applyAndLog = useCallback((player: Player, move: unknown) => {
    setState((prev: unknown) => {
      const note = game.moveNote(prev, player, move);
      const who = player === 1 ? "나" : oppBot.name;
      setLog((l) => [`${who}: ${note}`, ...l].slice(0, 9));
      setLastMove(move);
      return game.applyMove(prev, player, move);
    });
  }, [game, oppBot.name]);

  const onHumanMove = (move: unknown) => {
    if (phase !== "human") return;
    applyAndLog(1, move);
    setPhase("ai");
  };

  useEffect(() => {
    if (game.status(state).over) { setPhase("over"); return; }
    if (phase === "ai") {
      if (!game.hasMove(state, 2)) { setLog((l) => [`${oppBot.name}: 패스`, ...l].slice(0, 9)); setPhase("human"); return; }
      aiTimer.current = setTimeout(() => {
        const mv = oppBot.bot(state, 2);
        if (mv != null) applyAndLog(2, mv);
        setPhase("human");
      }, 460);
      return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
    }
    if (phase === "human" && !game.hasMove(state, 1)) { setLog((l) => ["나: 패스 (둘 수 있는 수 없음)", ...l].slice(0, 9)); setPhase("ai"); }
  }, [phase, state, game, oppBot, applyAndLog]);

  const Board = game.BoardView;

  const banner = phase === "over"
    ? st.winner === 1 ? { text: "승리! 이 전략을 코드로 만들어 보세요.", cls: "text-p1 border-p1/40 bg-p1/10" }
    : st.winner === 2 ? { text: "패배 — 다시 시도하거나 다른 전략을 구상해 보세요.", cls: "text-p2 border-p2/40 bg-p2/10" }
    : { text: "무승부", cls: "text-muted border-border bg-surface-2" }
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="panel p-5">
        <div className="mb-4"><ScoreBar p1={sc.p1} p2={sc.p2} p1Label="나 (파랑)" p2Label={`${oppBot.name} (빨강)`} /></div>
        <div className="mx-auto max-w-[560px]">
          <Board state={state} interactive={phase === "human"} player={1 as Player} onMove={onHumanMove} lastMove={lastMove} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            {phase === "human" && <span className="flex items-center gap-2 text-p1"><span className="h-2 w-2 animate-pulse rounded-full bg-p1" /> 내 차례</span>}
            {phase === "ai" && <span className="flex items-center gap-2 text-p2"><span className="h-2 w-2 animate-pulse rounded-full bg-p2" /> {oppBot.name} 생각 중…</span>}
            {phase === "over" && <span className="text-muted">게임 종료</span>}
          </div>
          <button className="btn inline-flex items-center gap-1.5 !py-1.5" onClick={reset}><Icon name="refresh" size={14} />새 게임</button>
        </div>
        {banner && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${banner.cls}`}>
            {banner.text}
            {st.winner === 1 && <Link href={`/problems/${game.id}/code`} className="ml-2 underline underline-offset-2">코드 작성으로 →</Link>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold">규칙</h3>
          <ul className="space-y-2">
            {game.rules.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-muted"><span className="mono mt-0.5 text-accent-2">{i + 1}</span><span>{r}</span></li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold">상대 AI</h3>
          <div className="space-y-2">
            {game.sampleBots.map((b) => (
              <button key={b.id} onClick={() => { setOppId(b.id); reset(); }} className={`w-full rounded-lg border p-3 text-left transition-colors ${oppId === b.id ? "border-accent/60 bg-accent/10" : "border-border bg-surface-2 hover:border-[#2f3947]"}`}>
                <div className="text-[13px] font-semibold">{b.name}</div>
                <div className="mt-0.5 text-xs text-muted">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 text-sm font-semibold">대국 로그</h3>
          <ul className="mono space-y-1.5 text-xs text-muted">
            {log.map((l, i) => <li key={i} className={i === 0 ? "text-foreground" : ""}>› {l}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
