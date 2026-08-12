import Link from "next/link";
import { GAME_METAS } from "@/lib/games/meta";
import { GameGlyph } from "@/components/GameGlyph";

export const metadata = { title: "문제 — Vibe Game" };

export default function ProblemsPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-7">
        <span className="chip mb-2">문제 은행 · 운영팀 큐레이션</span>
        <h1 className="text-3xl font-black tracking-tight">문제</h1>
        <p className="mt-1.5 text-sm text-muted">
          각 문제는 하나의 게임입니다. 문제에 들어가 규칙을 읽고, 직접 둬보고, AI로 봇을 만들어 래더에 올리세요.
        </p>
      </div>

      <div className="space-y-3">
        {GAME_METAS.map((g) => (
          <Link
            key={g.id}
            href={`/problems/${g.id}`}
            className="panel group flex items-center gap-4 p-5 transition-colors hover:border-[#2f3947]"
          >
            <span className="mono w-10 shrink-0 text-center text-lg font-bold text-muted-2">#{g.no}</span>
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{ background: g.accent + "1f", boxShadow: `inset 0 0 0 1px ${g.accent}44`, color: g.accent }}
            >
              <GameGlyph id={g.id} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{g.name}</h2>
                <span className="chip !py-0.5 text-[11px]">{g.difficulty}</span>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-muted">{g.tagline}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-accent-2 opacity-0 transition-opacity group-hover:opacity-100">
              문제 풀기 →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-2">
        향후 검수형 UGC(사용자 제작 문제)로 확장 예정 — 현재는 운영팀이 큐레이션한 {GAME_METAS.length}문제.
      </p>
    </main>
  );
}
