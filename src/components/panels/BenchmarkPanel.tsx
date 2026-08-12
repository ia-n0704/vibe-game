"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { Bot, Weights } from "@/lib/games/types";
import { compileBot } from "@/lib/games/compile";
import { simulate } from "@/lib/games/sim";
import { loadSubmission, listSavedBots } from "@/lib/store";
import { winrateToRating, tierOf } from "@/lib/leaderboard";
import { Icon } from "@/components/Icon";

interface Row { id: string; name: string; desc: string; wins: number; draws: number; losses: number; winrate: number }
interface MyBot { id: string; name: string; code?: string; weights?: Weights }

export function BenchmarkPanel() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);

  // 저장된 봇 + 제출 봇 목록 (mount 후 로드)
  const [mine, setMine] = useState<MyBot[]>([]);
  const [pickId, setPickId] = useState("");
  useEffect(() => {
    const list: MyBot[] = listSavedBots(game.id)
      .filter((b) => !b.lang || b.lang === "javascript")
      .map((b) => ({ id: "saved:" + b.id, name: b.name, code: b.code }));
    const sub = loadSubmission(game.id);
    if (sub && (sub.code || sub.weights)) list.push({ id: "submitted", name: "제출된 봇", code: sub.code, weights: sub.weights });
    setMine(list);
    setPickId(list[0]?.id ?? "");
  }, [game]);

  const picked = mine.find((m) => m.id === pickId) ?? mine[0];
  const myBot: Bot<unknown, unknown> | null = useMemo(() => {
    if (!picked) return null;
    if (picked.code) return compileBot(game, picked.code).bot;
    if (picked.weights) return game.makeBot(picked.weights);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, picked]);

  const GPO = 2; // 상대당 대국 수(선·후공 교대). dev에서도 빠르게.
  const total = game.sampleBots.length;

  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    if (!myBot || running) return;
    setRunning(true); setDone(false); setRows([]); setProgress(0);
    const out: Row[] = [];
    for (let i = 0; i < game.sampleBots.length; i++) {
      const opp = game.sampleBots[i];
      let w = 0, d = 0, l = 0;
      // 게임마다 이벤트 루프에 양보 → UI가 멈추지 않음
      for (let g = 0; g < GPO; g++) {
        await new Promise((r) => setTimeout(r, 0));
        const first: 1 | 2 = g % 2 === 0 ? 1 : 2;
        const res = simulate(game, myBot, opp.bot, first);
        if (res.winner === 1) w++;
        else if (res.winner === 2) l++;
        else d++;
      }
      out.push({ id: opp.id, name: opp.name, desc: opp.desc, wins: w, draws: d, losses: l, winrate: w / GPO });
      setRows([...out]);
      setProgress(i + 1);
    }
    setRunning(false); setDone(true);
  }

  const wins = rows.reduce((a, b) => a + b.wins, 0);
  const draws = rows.reduce((a, b) => a + b.draws, 0);
  const losses = rows.reduce((a, b) => a + b.losses, 0);
  const games = wins + draws + losses;
  const winrate = games ? wins / games : 0;
  const beaten = rows.filter((r) => r.winrate > 0.5).length;
  const rating = winrateToRating(winrate);
  const tier = tierOf(rating);

  if (!myBot) {
    return (
      <div className="panel mx-auto max-w-xl p-8 text-center">
        <div className="mb-3 flex justify-center text-muted-2"><Icon name="chart" size={36} /></div>
        <h2 className="text-lg font-bold">저장/제출된 봇이 없습니다</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          벤치마크는 <span className="text-foreground">내가 만든 봇</span>을 {total}개의 샘플 AI와 겨루게 합니다.
          먼저 코드 작성 탭에서 봇을 만들어 <span className="text-foreground">저장</span>하거나 래더에 제출하세요.
        </p>
        <Link href={`/problems/${game.id}/code`} className="btn btn-primary mt-5">코드 작성으로 가기 →</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 헤더 / 실행 */}
      <div className="panel mb-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold">샘플 AI {total}종과의 경쟁</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>내 봇</span>
              <select
                value={pickId}
                onChange={(e) => { setPickId(e.target.value); setRows([]); setDone(false); setProgress(0); }}
                disabled={running}
                className="max-w-[200px] rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none focus:border-accent/60"
              >
                {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span className="text-muted-2">· 상대당 {GPO}판(선·후공 교대)</span>
            </div>
          </div>
          <button className="btn btn-primary inline-flex items-center gap-1.5" onClick={run} disabled={running}>
            {running ? `진행 중… ${progress}/${total}` : <><Icon name={done ? "refresh" : "play"} size={14} />{done ? "다시 실행" : "벤치마크 실행"}</>}
          </button>
        </div>
        {(running || done) && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-all" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
        )}
      </div>

      {/* 종합 요약 */}
      {games > 0 && (
        <div className="panel mb-4 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <Stat label="종합 승률" value={`${Math.round(winrate * 100)}%`} sub={`${wins}승 ${draws}무 ${losses}패`} />
          <Stat label="이긴 상대" value={`${beaten} / ${rows.length}`} sub="승률 50% 초과" />
          <Stat label="예상 레이팅" value={`${rating}`} sub={`${games}전 기준`} />
          <div>
            <div className="text-xs text-muted">티어</div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold" style={{ borderColor: tier.color + "66", color: tier.color }}>
              <span className="h-2 w-2 rounded-full" style={{ background: tier.color }} />{tier.name}
            </div>
            {done && <div className="mt-1 text-xs text-muted-2">{beaten >= total ? "전원 격파!" : `상위 ${Math.max(1, total - beaten)}종이 더 강함`}</div>}
          </div>
        </div>
      )}

      {/* 상대별 결과 (약→강 순) */}
      <div className="panel overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">상대별 전적 <span className="font-normal text-muted-2">(약 → 강 순)</span></div>
        {rows.length === 0 && !running && (
          <div className="p-8 text-center text-sm text-muted">‘벤치마크 실행’을 누르면 {total}종의 샘플 AI와 차례로 겨룹니다.</div>
        )}
        <ul>
          {game.sampleBots.map((opp, i) => {
            const r = rows.find((x) => x.id === opp.id);
            const pending = !r;
            const wr = r ? r.winrate : 0;
            const color = !r ? "var(--muted-2)" : wr >= 0.5 ? "var(--success)" : wr >= 0.35 ? "var(--warn)" : "var(--danger)";
            return (
              <li key={opp.id} className="flex items-center gap-3 border-b border-border-soft px-4 py-2.5 last:border-0">
                <span className="mono w-6 shrink-0 text-center text-xs text-muted-2">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{opp.name}</span>
                    {i === total - 1 && <span className="chip !py-0.5 !text-[10px]">최강</span>}
                  </div>
                  <div className="truncate text-[11px] text-muted">{opp.desc}</div>
                </div>
                {pending ? (
                  <span className="text-xs text-muted-2">{running && progress === i ? "대국 중…" : "대기"}</span>
                ) : (
                  <>
                    <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-surface-3 sm:flex">
                      <div className="bg-success" style={{ flex: r.wins }} />
                      <div className="bg-muted-2" style={{ flex: r.draws }} />
                      <div className="bg-danger" style={{ flex: r.losses }} />
                    </div>
                    <span className="mono w-16 shrink-0 text-right text-xs text-muted">{r.wins}-{r.draws}-{r.losses}</span>
                    <span className="mono w-12 shrink-0 text-right text-sm font-bold" style={{ color }}>{Math.round(wr * 100)}%</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-3 text-center text-xs text-muted-2">
        샘플 AI는 각 게임에 맞춰 설계된 전략(휴리스틱·알파베타 탐색)으로, 아래로 갈수록 강합니다.
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mono mt-0.5 text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-2">{sub}</div>}
    </div>
  );
}
