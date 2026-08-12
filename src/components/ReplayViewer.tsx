"use client";

import { useEffect, useRef, useState } from "react";
import { Match } from "@/lib/games/sim";
import { AnyGame } from "@/lib/games/types";
import { ScoreBar } from "./ScoreBar";
import { Icon } from "./Icon";

interface Props {
  game: AnyGame;
  match: Match<unknown, unknown>;
  p1Label?: string;
  p2Label?: string;
}

const SPEEDS = [0.5, 1, 2, 4];

export function ReplayViewer({ game, match, p1Label = "내 봇", p2Label = "상대 봇" }: Props) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = match.frames;
  const last = frames.length - 1;
  const frame = frames[Math.min(i, last)];
  const Board = game.BoardView;

  useEffect(() => {
    setI(0);
    setPlaying(true);
  }, [match]);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setI((v) => Math.min(v + 1, last)), 560 / speed);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, i, last, speed]);

  const winnerText =
    match.winner === 1 ? `${p1Label} 승리` : match.winner === 2 ? `${p2Label} 승리` : "무승부";
  const winnerColor =
    match.winner === 1 ? "text-p1" : match.winner === 2 ? "text-p2" : "text-muted";

  return (
    <div className="flex h-full flex-col gap-3">
      <ScoreBar p1={frame.p1} p2={frame.p2} p1Label={p1Label} p2Label={p2Label} />

      <Board state={frame.state} lastMove={frame.move} />

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="mono">
          턴 {frame.turn}/{frames[last].turn}
        </span>
        <span className="flex items-center gap-1.5">
          {frame.mover && (
            <span className={`h-2 w-2 rounded-full ${frame.mover === 1 ? "bg-p1" : "bg-p2"}`} />
          )}
          {frame.note}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={last}
        value={Math.min(i, last)}
        onChange={(e) => {
          setPlaying(false);
          setI(Number(e.target.value));
        }}
        className="w-full accent-[var(--accent)]"
      />

      <div className="flex items-center gap-2">
        <button className="btn grid place-items-center !px-2.5 !py-1.5" onClick={() => { setPlaying(false); setI(0); }} title="처음으로"><Icon name="start" size={15} /></button>
        <button className="btn grid place-items-center !px-2.5 !py-1.5" onClick={() => { setPlaying(false); setI((v) => Math.max(0, v - 1)); }} title="이전"><Icon name="prev" size={15} /></button>
        <button
          className="btn btn-primary inline-flex items-center gap-1.5 !px-4 !py-1.5"
          onClick={() => {
            if (i >= last) setI(0);
            setPlaying((p) => !p);
          }}
        >
          <Icon name={playing ? "pause" : i >= last ? "refresh" : "play"} size={14} />
          {playing ? "일시정지" : i >= last ? "다시보기" : "재생"}
        </button>
        <button className="btn grid place-items-center !px-2.5 !py-1.5" onClick={() => { setPlaying(false); setI((v) => Math.min(last, v + 1)); }} title="다음"><Icon name="next" size={15} /></button>
        <button
          className="btn !px-3 !py-1.5"
          onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
          title="속도"
        >
          {speed}×
        </button>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-sm font-bold ${winnerColor}`}>
          {i >= last ? <><Icon name="flag" size={14} />{winnerText}</> : ""}
        </span>
      </div>
    </div>
  );
}
