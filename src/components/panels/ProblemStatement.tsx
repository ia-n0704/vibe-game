"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { metaOf } from "@/lib/games/meta";

const PROTOCOL: { cmd: string; mean: string }[] = [
  { cmd: "READY first|second", mean: "선/후공 통보. 플레이어는 OK로 응답." },
  { cmd: "TURN my_time opp_time", mean: "내 차례. 제한 시간 내 수를 출력(또는 PASS)." },
  { cmd: "OPP r1 c1 r2 c2 time", mean: "상대의 직전 수와 소요 시간 통보." },
  { cmd: "FINISH", mean: "게임 종료. 플레이어는 정상 종료." },
];

export function ProblemStatement() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);
  const meta = metaOf(gameId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 목표 */}
      <section className="panel p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="chip">목표</span>
          <span className="chip">난이도 · {meta.difficulty}</span>
          <span className="chip mono">문제 #{meta.no}</span>
        </div>
        <p className="text-[15px] leading-relaxed text-foreground">{game.problem.objective}</p>
      </section>

      {/* 규칙 */}
      <section className="panel p-6">
        <h2 className="mb-3 text-sm font-semibold">게임 규칙</h2>
        <ul className="space-y-2.5">
          {game.rules.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-muted">
              <span className="mono mt-0.5 shrink-0 text-accent-2">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 제약 / 채점 */}
      <section className="panel p-6">
        <h2 className="mb-3 text-sm font-semibold">제약 & 채점 방식</h2>
        <ul className="space-y-2.5">
          {game.problem.constraints.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-[13px] text-muted">
          제출하면 샌드박스에서 <span className="text-foreground">예시 AI들과 자동 대국</span> → 승/무/패와 시각 리플레이를 즉시 제공합니다.
          컴파일 에러(CE)·시간 초과(TLE)·런타임 에러(RE)는 결과 코드로 안내됩니다.
        </p>
      </section>

      {/* 입출력 프로토콜 */}
      <section className="panel p-6">
        <h2 className="mb-1 text-sm font-semibold">입출력 프로토콜 (표준 입출력)</h2>
        <p className="mb-3 text-xs text-muted">심판(채점기)과 플레이어 프로세스가 줄 단위로 통신합니다. 언어 중립적이라 다중 언어를 지원합니다.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <thead><tr className="border-b border-border bg-surface-2 text-xs text-muted"><th className="px-3 py-2 font-medium">명령</th><th className="px-3 py-2 font-medium">의미</th></tr></thead>
            <tbody>
              {PROTOCOL.map((p) => (
                <tr key={p.cmd} className="border-b border-border-soft last:border-0">
                  <td className="mono px-3 py-2 text-accent-2">{p.cmd}</td>
                  <td className="px-3 py-2 text-muted">{p.mean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-2">※ 비전공자는 이 프로토콜을 몰라도 됩니다 — AI가 알아서 처리합니다. 고수는 코드 탭에서 직접 확인할 수 있습니다.</p>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/problems/${game.id}/versus`} className="btn flex-1 !py-2.5">먼저 직접 둬보기</Link>
        <Link href={`/problems/${game.id}/code`} className="btn btn-primary flex-1 !py-2.5">AI로 봇 만들기 →</Link>
      </div>
    </div>
  );
}
