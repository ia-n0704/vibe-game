import Link from "next/link";
import { GAME_METAS } from "@/lib/games/meta";
import { GameGlyph } from "@/components/GameGlyph";

const STEPS = [
  { n: "01", t: "게임 이해", d: "규칙을 읽고 직접 몇 판 둬보며 감을 잡는다." },
  { n: "02", t: "전략 지시", d: "AI 채팅에 “중앙을 장악하고 상대 옆에 붙어 감염시켜” 처럼 말한다." },
  { n: "03", t: "코드 생성", d: "AI가 의도를 이해해 제출용 코드를 대신 작성한다." },
  { n: "04", t: "자동 채점", d: "제출 전, 예시 AI들과 자동 대국 → 승패와 시각 리플레이를 즉시 확인." },
  { n: "05", t: "개선 & 제출", d: "리플레이로 약점을 파악해 다시 프롬프트로 다듬어 제출." },
  { n: "06", t: "래더 & 순위", d: "백그라운드 래더에서 대국, Glicko-2 레이팅·티어가 갱신." },
];

const EDGES = [
  { t: "AI로 진입장벽 제거", d: "코딩을 못 해도 게임을 좋아하면 누구나 참여. 시장을 ‘게임을 좋아하는 모든 사람’으로 확장한다." },
  { t: "프롬프트가 새로운 놀이", d: "코드가 아니라 ‘전략을 어떻게 지시하는가’가 경쟁의 재미이자 실력. 새로운 장르를 만든다." },
  { t: "측정 대상은 승률", d: "직접 썼든 AI에게 시켰든, 실제 대국에서 더 많이 이기는 봇이 높은 레이팅을 받는다." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-5">
      {/* Hero */}
      <section className="relative flex flex-col items-center pt-20 pb-14 text-center">
        <span className="chip mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
          프롬프트로 만드는 경쟁형 게임 AI 플랫폼
        </span>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.1] tracking-tight sm:text-6xl">
          코딩을 몰라도,
          <br />
          <span className="grad-text">전략만 있으면</span> 누구나
          <br />
          게임 AI로 경쟁한다.
        </h1>
        <p className="mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-muted">
          손으로 게임을 해보고, AI에게 전략을 말하면, 그 AI가 전국의 다른 AI와 싸워 순위를 매긴다.
          진짜 경쟁의 대상은 코딩 실력이 아니라 <span className="text-foreground">게임 이해와 전략 설계</span>다.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="#games" className="btn btn-primary !px-5 !py-2.5 text-[15px]">문제 고르기</Link>
          <Link href="/problems" className="btn !px-5 !py-2.5 text-[15px]">문제 은행 열기</Link>
        </div>
      </section>

      {/* Games */}
      <section id="games" className="scroll-mt-20 py-10">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">문제 고르기</h2>
            <p className="mt-1 text-sm text-muted">각 문제마다 문제 설명 · 코드 작성 · 시뮬레이션 · 직접 대결 · 리더보드 탭이 있습니다.</p>
          </div>
          <span className="mono text-xs text-muted-2">{GAME_METAS.length} problems</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {GAME_METAS.map((g) => (
            <Link key={g.id} href={`/problems/${g.id}`} className="panel group relative block overflow-hidden p-6">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50"
                style={{ background: g.accent }}
              />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="grid h-14 w-14 place-items-center rounded-2xl"
                    style={{ background: g.accent + "1f", boxShadow: `inset 0 0 0 1px ${g.accent}44`, color: g.accent }}
                  >
                    <GameGlyph id={g.id} size={28} />
                  </div>
                  <span className="mono text-sm font-bold text-muted-2">#{g.no}</span>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{g.name}</h3>
                  <span className="chip !py-0.5 text-[11px]">{g.difficulty}</span>
                </div>
                <p className="mt-1.5 min-h-[40px] text-[13px] leading-relaxed text-muted">{g.tagline}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-accent-2 opacity-0 transition-opacity group-hover:opacity-100">문제 풀기 →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Core loop */}
      <section className="py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">핵심 루프</h2>
          <p className="mt-1 text-sm text-muted">비전공자가 막힘없이 한 바퀴 도는 단일 흐름</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="panel p-5 transition-colors hover:border-[#2f3947]">
              <div className="mono mb-2 text-2xl font-bold text-muted-2">{s.n}</div>
              <h3 className="text-[15px] font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Edges */}
      <section className="py-10">
        <div className="grid gap-3 md:grid-cols-3">
          {EDGES.map((e) => (
            <div key={e.t} className="panel p-6">
              <h3 className="text-base font-semibold text-foreground">{e.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{e.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-2">
        Vibe Game · 프로토타입 v0.2 — 기획서 기반 데모 · AI 생성/채점은 클라이언트 시뮬레이션입니다.
      </footer>
    </main>
  );
}
