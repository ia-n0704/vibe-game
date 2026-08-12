"use client";

import { useState } from "react";
import { Bot, BoardViewProps, GameModule, Player, SampleBot, Weights, other } from "../types";
import { runRules } from "../strategy";
import {
  QState, QMove, N,
  initial, legalMoves, applyMove, hasMove, status, score,
  pawnMoves, bfsDist, wallLegal, rc, idx,
} from "./engine";

const DEFAULT: Weights = { rush: 1.2, wall: 1, caution: 0.6, defense: 0.6 };

function candidateWalls(s: QState, p: Player): { o: "h" | "v"; r: number; c: number }[] {
  const oppCell = p === 1 ? s.p2 : s.p1;
  const [or, oc] = rc(oppCell);
  const cand: { o: "h" | "v"; r: number; c: number }[] = [];
  const seen = new Set<string>();
  for (const rr of [or - 1, or]) {
    for (const cc of [oc - 1, oc]) {
      for (const o of ["h", "v"] as const) {
        const key = `${o}${rr},${cc}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (wallLegal(s, p, o, rr, cc)) cand.push({ o, r: rr, c: cc });
      }
    }
  }
  return cand;
}

function makeBot(w: Weights): Bot<QState, QMove> {
  return (s, p) => {
    const moves = pawnMoves(s, p);
    const myDist = bfsDist(s, p);

    // 최단 경로를 가장 잘 줄이는 말 이동
    let bestTo: number | null = null;
    let bestAfter = Infinity;
    for (const to of moves) {
      const d = bfsDist(applyMove(s, p, { kind: "move", to }), p);
      if (d < bestAfter || (d === bestAfter && Math.random() < 0.3)) { bestAfter = d; bestTo = to; }
    }
    const advanceScore = (w.rush ?? 1) * (myDist - bestAfter + 0.05);

    // 상대 앞을 막는 벽 후보 평가
    let bestWall: { o: "h" | "v"; r: number; c: number } | null = null;
    let bestWallScore = -Infinity;
    if ((w.wall ?? 0) > 0 && s.walls[p - 1] > 0) {
      const oppDist = bfsDist(s, other(p));
      for (const cand of candidateWalls(s, p)) {
        const ns = applyMove(s, p, { kind: "wall", ...cand });
        const dOpp = bfsDist(ns, other(p)) - oppDist;
        const dMine = bfsDist(ns, p) - myDist;
        const sc = (w.wall ?? 0) * dOpp - (w.caution ?? 0) * Math.max(0, dMine);
        if (sc > bestWallScore) { bestWallScore = sc; bestWall = cand; }
      }
    }

    if (bestWall && bestWallScore > advanceScore && bestWallScore > 0) return { kind: "wall", ...bestWall };
    if (bestTo != null) return { kind: "move", to: bestTo };
    const all = legalMoves(s, p);
    return all.length ? all[0] : null;
  };
}

// 쿼리도는 벽 후보가 많아 깊은 탐색이 비싸므로, 잘 튜닝된 최단경로+벽 휴리스틱 변형으로 강한 로스터 구성.
const sampleBots: SampleBot<QState, QMove>[] = [
  { id: "random", name: "랜덤 워커", desc: "되는 대로 전진. 최약체.", bot: (s, p) => { const m = pawnMoves(s, p).map((to) => ({ kind: "move", to } as QMove)); return m.length ? m[(Math.random() * m.length) | 0] : null; } },
  { id: "rusher", name: "속공가", desc: "벽 없이 최단 경로로 돌진.", bot: makeBot({ rush: 2, wall: 0, caution: 0, defense: 0 }) },
  { id: "rusher2", name: "전력질주", desc: "오직 전진, 견제 무시.", bot: makeBot({ rush: 3, wall: 0, caution: 0, defense: 0 }) },
  { id: "blocker", name: "벽 설계가", desc: "상대 앞을 벽으로 틀어막는다.", bot: makeBot({ rush: 0.8, wall: 2.2, caution: 0.4, defense: 1 }) },
  { id: "blocker2", name: "미로 건축가", desc: "공격적으로 벽을 남발해 가둔다.", bot: makeBot({ rush: 0.6, wall: 3, caution: 0.2, defense: 1.2 }) },
  { id: "balanced", name: "균형가", desc: "전진과 견제를 함께.", bot: makeBot({ rush: 1.3, wall: 1.2, caution: 0.7, defense: 0.6 }) },
  { id: "efficient", name: "효율가", desc: "내 경로 손해 없는 벽만.", bot: makeBot({ rush: 1.4, wall: 1.4, caution: 1.8, defense: 0.5 }) },
  { id: "counter", name: "반응형", desc: "상대가 앞서면 벽으로 견제.", bot: makeBot({ rush: 1.6, wall: 1.5, caution: 0.9, defense: 0.8 }) },
  { id: "tempo", name: "템포 마스터", desc: "거리 우위를 끝까지 유지.", bot: makeBot({ rush: 1.8, wall: 1, caution: 1.2, defense: 0.4 }) },
  { id: "patient", name: "신중가", desc: "벽을 아끼고 결정적일 때만.", bot: makeBot({ rush: 1.5, wall: 0.9, caution: 2, defense: 0.7 }) },
  { id: "saboteur", name: "방해꾼", desc: "상대 길을 최대한 늘린다.", bot: makeBot({ rush: 1, wall: 2.6, caution: 0.6, defense: 0.9 }) },
  { id: "racer", name: "레이서", desc: "전진 우선 + 가끔 결정타 벽.", bot: makeBot({ rush: 2.2, wall: 0.8, caution: 0.7, defense: 0.3 }) },
  { id: "wall_eco", name: "벽 경제학자", desc: "벽 가성비 극대화.", bot: makeBot({ rush: 1.5, wall: 1.7, caution: 2.2, defense: 0.6 }) },
  { id: "aggressor", name: "압박가", desc: "전진하며 끊임없이 견제.", bot: makeBot({ rush: 1.7, wall: 1.9, caution: 0.5, defense: 0.7 }) },
  { id: "master", name: "그랜드마스터", desc: "최적 튜닝 — 전진·견제·효율 균형.", bot: makeBot({ rush: 1.9, wall: 1.6, caution: 1.5, defense: 0.7 }) },
];

function parsePrompt(prompt: string) {
  return runRules(prompt, DEFAULT, [
    { re: /속공|돌진|빠르게|최단|달려|질주|전진|직진/, label: "속공", effect: "최단 경로 돌진 ↑", apply: (w) => { w.rush += 1.4; w.wall -= 0.3; } },
    { re: /벽|차단|막|봉쇄|가둬|방해|함정/, label: "벽 견제", effect: "상대 차단 벽 ↑", apply: (w) => { w.wall += 1.6; } },
    { re: /방어|수비|지키|버티|신중|안전/, label: "방어", effect: "벽 아껴 신중하게 ↑", apply: (w) => { w.defense += 1.2; w.caution += 1; w.rush -= 0.2; } },
    { re: /효율|아끼|절약|경제/, label: "효율", effect: "내 경로 손해 회피 ↑", apply: (w) => { w.caution += 1.4; } },
    { re: /공격|압박|몰아|적극/, label: "공격", effect: "전진+견제 동시 ↑", apply: (w) => { w.rush += 0.6; w.wall += 0.6; } },
  ], "균형형 — 전진과 벽 견제를 상황에 맞게");
}

function generateCode(prompt: string, res: { weights: Weights; intent: string }): string {
  const w = res.weights, f = (n: number) => (n ?? 0).toFixed(2);
  return `# Vibe Game · 쿼리도 — 자동 생성 제출 코드 (Python)
# 전략 의도: ${res.intent}
# 프롬프트: "${prompt.replace(/"/g, "'").slice(0, 120)}"
import sys
W = dict(rush=${f(w.rush)}, wall=${f(w.wall)}, caution=${f(w.caution)}, defense=${f(w.defense)})

def choose(state, me):
    my_dist  = bfs_dist(state, me)                     # 목표 행까지 최단 거리(BFS)
    opp_dist = bfs_dist(state, opp(me))
    # 1) 최단 경로를 가장 잘 줄이는 말 이동
    best_to = min(pawn_moves(state, me), key=lambda to: bfs_dist(move(state, to), me))
    advance = W["rush"] * (my_dist - bfs_dist(move(state, best_to), me))
    # 2) 상대 앞을 막는 벽 후보(상대 칸 주변)
    best_wall, best_wall_s = None, -1e9
    if walls_left(state, me) > 0:
        for cand in candidate_walls_near(state, opp(me)):
            ns = place_wall(state, cand)
            d_opp  = bfs_dist(ns, opp(me)) - opp_dist
            d_mine = bfs_dist(ns, me) - my_dist
            s = W["wall"] * d_opp - W["caution"] * max(0, d_mine)
            if s > best_wall_s: best_wall, best_wall_s = cand, s
    return best_wall if best_wall and best_wall_s > advance > 0 else ("move", best_to)

for line in sys.stdin:                                  # READY/TURN/OPP/FINISH
    cmd, *a = line.split()
    if cmd == "TURN": print(encode(choose(state, me)), flush=True)
    elif cmd == "FINISH": break
`;
}

// ── 보드 렌더러 ───────────────────────────────────────────────
// (2N-1) 단위 좌표계: 셀 8, 간격 1.4
const CELL = 8, GAP = 1.4;
const TOTAL = N * CELL + (N - 1) * GAP;
const pct = (u: number) => (u / TOTAL) * 100;
const cellLeft = (c: number) => c * (CELL + GAP);
const cellTop = (r: number) => r * (CELL + GAP);

function QuoridorBoard({ state, interactive, player = 1, onMove, lastMove }: BoardViewProps<QState, QMove>) {
  const [mode, setMode] = useState<"move" | "wall">("move");
  const reachable = interactive && mode === "move" ? new Set(pawnMoves(state, player)) : new Set<number>();

  const wallSlots: QMove[] =
    interactive && mode === "wall" ? (legalMoves(state, player).filter((m) => m.kind === "wall") as QMove[]) : [];

  const lastWall = lastMove && lastMove.kind === "wall" ? lastMove : null;
  const [p1r] = rc(state.p1), [p2r] = rc(state.p2);

  function pawnStyle(cell: number) {
    const [r, c] = rc(cell);
    return { left: `${pct(cellLeft(c))}%`, top: `${pct(cellTop(r))}%`, width: `${pct(CELL)}%`, height: `${pct(CELL)}%` } as const;
  }
  function hWallStyle(r: number, c: number) {
    return { left: `${pct(cellLeft(c))}%`, top: `${pct(cellTop(r) + CELL)}%`, width: `${pct(2 * CELL + GAP)}%`, height: `${pct(GAP)}%` } as const;
  }
  function vWallStyle(r: number, c: number) {
    return { left: `${pct(cellLeft(c) + CELL)}%`, top: `${pct(cellTop(r))}%`, width: `${pct(GAP)}%`, height: `${pct(2 * CELL + GAP)}%` } as const;
  }

  return (
    <div>
      {interactive && (
        <div className="mb-2 flex items-center gap-2">
          <button className={`btn !py-1 !px-3 text-xs ${mode === "move" ? "btn-primary" : ""}`} onClick={() => setMode("move")}>♟ 이동</button>
          <button
            className={`btn !py-1 !px-3 text-xs ${mode === "wall" ? "btn-primary" : ""}`}
            onClick={() => setMode("wall")}
            disabled={state.walls[player - 1] <= 0}
          >
            🧱 벽 설치
          </button>
          <span className="ml-auto mono text-xs text-muted">
            남은 벽 · <span className="text-p1">나 {state.walls[player - 1]}</span> / <span className="text-p2">상대 {state.walls[player === 1 ? 1 : 0]}</span>
          </span>
        </div>
      )}

      <div className="relative aspect-square w-full rounded-xl border border-border p-[2%]" style={{ background: "#0e1622" }}>
        <div className="relative h-full w-full">
          {/* 목표 행 표시 */}
          <div className="absolute rounded-sm" style={{ left: 0, top: 0, width: "100%", height: `${pct(CELL)}%`, background: "rgba(56,189,248,0.07)" }} />
          <div className="absolute rounded-sm" style={{ left: 0, top: `${pct(cellTop(N - 1))}%`, width: "100%", height: `${pct(CELL)}%`, background: "rgba(251,113,133,0.07)" }} />

          {/* 셀 */}
          {Array.from({ length: N * N }, (_, i) => {
            const [r, c] = rc(i);
            const isReach = reachable.has(i);
            return (
              <button
                key={i}
                disabled={!isReach}
                onClick={() => isReach && onMove?.({ kind: "move", to: i })}
                className={`absolute rounded-[5px] ${isReach ? "cursor-pointer" : "cursor-default"}`}
                style={{
                  left: `${pct(cellLeft(c))}%`, top: `${pct(cellTop(r))}%`, width: `${pct(CELL)}%`, height: `${pct(CELL)}%`,
                  background: "rgba(255,255,255,0.035)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              >
                {isReach && <span className="absolute left-1/2 top-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "rgba(124,92,255,0.5)", boxShadow: "0 0 10px 1px rgba(124,92,255,0.6)" }} />}
              </button>
            );
          })}

          {/* 설치된 벽 */}
          {state.h.map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"h" + k} className="absolute rounded-full" style={{ ...hWallStyle(r, c), background: lastWall && lastWall.o === "h" && lastWall.r === r && lastWall.c === c ? "#a78bfa" : "#7c5cff", boxShadow: "0 0 8px -1px rgba(124,92,255,0.8)" }} />; })}
          {state.v.map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"v" + k} className="absolute rounded-full" style={{ ...vWallStyle(r, c), background: lastWall && lastWall.o === "v" && lastWall.r === r && lastWall.c === c ? "#a78bfa" : "#7c5cff", boxShadow: "0 0 8px -1px rgba(124,92,255,0.8)" }} />; })}

          {/* 벽 설치 가능 슬롯(클릭) */}
          {wallSlots.map((m) => {
            if (m.kind !== "wall") return null;
            const st = m.o === "h" ? hWallStyle(m.r, m.c) : vWallStyle(m.r, m.c);
            return (
              <button
                key={`${m.o}${m.r},${m.c}`}
                onClick={() => onMove?.(m)}
                className="absolute rounded-full opacity-0 transition-opacity hover:opacity-100"
                style={{ ...st, background: "rgba(124,92,255,0.7)", boxShadow: "0 0 8px -1px rgba(124,92,255,0.9)" }}
                title="여기에 벽 설치"
              />
            );
          })}

          {/* 말 */}
          {[[state.p1, 1], [state.p2, 2]].map(([cell, who]) => (
            <div key={who} className="cell-pop absolute grid place-items-center" style={pawnStyle(cell as number)}>
              <span
                className="block h-[74%] w-[74%] rounded-full"
                style={{
                  background: who === 1
                    ? "radial-gradient(circle at 32% 28%, #7dd3fc, #38bdf8 55%, #0284c7)"
                    : "radial-gradient(circle at 32% 28%, #fda4af, #fb7185 55%, #e11d48)",
                  boxShadow: who === 1
                    ? "0 4px 12px -3px rgba(56,189,248,0.7), inset 0 -3px 6px rgba(0,0,0,0.35)"
                    : "0 4px 12px -3px rgba(251,113,133,0.7), inset 0 -3px 6px rgba(0,0,0,0.35)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const quoridorGame: GameModule<QState, QMove> = {
  id: "quoridor",
  name: "쿼리도",
  tagline: "벽으로 길을 막고, 먼저 반대편에 도달하라.",
  accent: "#c084fc",
  icon: "🧱",
  rules: [
    "내 차례에 말을 상하좌우 한 칸 이동하거나, 벽 하나를 설치합니다.",
    "파랑은 맨 위 행, 빨강은 맨 아래 행에 먼저 도달하면 승리합니다.",
    "벽은 2칸 길이로 상대(와 나)의 전진을 막지만, 목표로 가는 길을 완전히 봉쇄할 수는 없습니다.",
    "벽은 1인당 10개 한정 — 언제 아끼고 언제 쓸지가 핵심입니다. 상대 말은 뛰어넘을 수 있습니다.",
  ],
  problem: {
    objective: "상대보다 먼저 반대편 끝 행에 내 말(파랑)을 도달시키면 승리한다.",
    constraints: [
      "보드: 9×9. 파랑은 맨 위 행, 빨강은 맨 아래 행이 목표.",
      "한 수: 말 1칸 이동(상대 말은 점프) 또는 벽 1개 설치.",
      "벽은 1인당 10개. 상대(와 나)의 모든 경로를 완전히 막는 벽은 불가(BFS로 검증).",
      "선공/후공을 번갈아 갖는 다전제로 승률을 측정한다.",
    ],
  },
  initial,
  legalMoves,
  applyMove,
  hasMove,
  status,
  score: (s) => score(s),
  scoreLabel: { p1: "파랑", p2: "빨강" },
  moveNote: (_prev, _p, m) => (m.kind === "move" ? "말 이동" : `벽 설치 (${m.o === "h" ? "가로" : "세로"})`),
  defaultWeights: DEFAULT,
  weightLabels: [
    { key: "rush", label: "속공" },
    { key: "wall", label: "벽 견제" },
    { key: "defense", label: "방어" },
    { key: "caution", label: "효율" },
  ],
  parsePrompt,
  makeBot,
  sampleBots,
  generateCode,
  promptSuggestions: [
    "벽은 아끼고 최단 경로로 빠르게 돌진해.",
    "상대 앞을 벽으로 막아서 길을 최대한 늘려.",
    "내 경로엔 손해 없이 상대만 효율적으로 차단해.",
    "전진하면서 상대가 앞서면 벽으로 견제해.",
  ],
  codegenSpec: `게임: 쿼리도(Quoridor), 9x9. 셀 인덱스 i = row*9 + col (row 0이 맨 위).
state: { p1:number, p2:number, h:string[], v:string[], walls:[number,number] }
  - p1/p2: 각 말의 셀 인덱스. walls[0]/walls[1]: 각 플레이어의 남은 벽 수.
목표 행: 플레이어1은 row 0(맨 위), 플레이어2는 row 8(맨 아래)에 도달하면 승리.
move: { kind:"move", to:number }  또는  { kind:"wall", o:"h"|"v", r:number, c:number }.
helpers:
  legalMoves(state, player) -> move[]   // 가능한 모든 수 (반드시 이 중에서 골라 반환)
  applyMove(state, player, move) -> newState
  bfsDist(state, player) -> number   // 그 플레이어의 목표 행까지 최단 거리(작을수록 유리)
  pawnMoves(state, player) -> number[]  // 말이 갈 수 있는 칸들
  other(player) -> 상대 번호
  rc(i) -> [row, col],  N = 9
팁: bfsDist로 나와 상대의 남은 거리를 비교하세요. 보통 내 거리를 줄이는 말 이동을 고르고, 필요할 때 상대 거리를 늘리는 벽({kind:"wall",...})을 둡니다. 반드시 legalMoves 안의 객체를 반환하세요.`,
  codeHelpers: { N, rc, bfsDist, pawnMoves },
  BoardView: QuoridorBoard,
};
