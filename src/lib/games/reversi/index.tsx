"use client";

import { Bot, BoardViewProps, GameModule, Player, SampleBot, Weights, other, AnyGame } from "../types";
import { runRules } from "../strategy";
import { searchBot } from "../search";
import {
  RevState, RevMove, Cell, N,
  initial, legalMoves, applyMove, hasMove, status, score, flips, POS, CORNERS,
} from "./engine";

const DEFAULT: Weights = { corner: 3, mobility: 1, stability: 1, greedy: 0.4, caution: 1 };

function evaluate(b: RevState, p: Player, mv: RevMove, w: Weights): number {
  const flipped = flips(b, mv, p).length;
  const after = applyMove(b, p, mv);
  // legalMoves는 비싸므로 모빌리티 가중치가 있을 때만 계산
  const oppMoves = (w.mobility ?? 0) > 0 ? legalMoves(after, other(p)).length : 0;
  let s = 0;
  s += (w.greedy ?? 0) * flipped;
  s += (w.corner ?? 0) * (CORNERS.includes(mv) ? 25 : 0);
  s += (w.stability ?? 0) * (POS[mv] / 10);
  s += (w.mobility ?? 0) * (-oppMoves); // 상대 선택지를 줄일수록 좋음
  if ((w.caution ?? 0) > 0 && POS[mv] < 0) s += (w.caution ?? 0) * (POS[mv] / 8); // 위험칸 회피
  return s + Math.random() * 0.01;
}

function makeBot(w: Weights): Bot<RevState, RevMove> {
  return (b, p) => {
    const moves = legalMoves(b, p);
    if (!moves.length) return null;
    let best = moves[0], bs = -Infinity;
    for (const m of moves) { const s = evaluate(b, p, m, w); if (s > bs) { bs = s; best = m; } }
    return best;
  };
}

// ── 강한 평가함수 + 알파베타 (벤치마크 로스터) ───────────────
// 프런티어(빈칸에 닿은 내 돌) 수 — 적을수록 안정적.
function frontier(b: RevState, p: Player): number {
  let f = 0;
  for (let i = 0; i < 64; i++) {
    if (b[i] !== p) continue;
    const r = (i / N) | 0, c = i % N;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && b[nr * N + nc] === 0) { f++; dr = 2; break; }
      }
  }
  return f;
}

interface RW { corner: number; mob: number; pos: number; front: number; disc: number }
function evalRev(b: RevState, p: Player, w: RW): number {
  const opp = other(p);
  const sc = score(b);
  const empties = 64 - sc.p1 - sc.p2;
  let s = 0;
  let pos = 0, corner = 0;
  for (let i = 0; i < 64; i++) pos += b[i] === p ? POS[i] : b[i] === opp ? -POS[i] : 0;
  for (const k of CORNERS) corner += b[k] === p ? 1 : b[k] === opp ? -1 : 0;
  s += corner * w.corner + pos * w.pos;
  if (w.mob) s += (legalMoves(b, p).length - legalMoves(b, opp).length) * w.mob;
  if (w.front) s += (frontier(b, opp) - frontier(b, p)) * w.front;
  const my = p === 1 ? sc.p1 : sc.p2, om = p === 1 ? sc.p2 : sc.p1;
  s += (my - om) * (empties < 12 ? 6 : w.disc); // 종반엔 돌 수 비중 ↑
  return s;
}

const engineAdapter = { legalMoves, applyMove, status } as unknown as AnyGame;
const sbot = (w: RW, depth: number) =>
  searchBot(engineAdapter, (s, p) => evalRev(s as RevState, p, w), depth) as Bot<RevState, RevMove>;

const sampleBots: SampleBot<RevState, RevMove>[] = [
  { id: "random", name: "랜덤 워커", desc: "합법수 중 무작위. 최약체.", bot: (b, p) => { const m = legalMoves(b, p); return m.length ? m[(Math.random() * m.length) | 0] : null; } },
  { id: "greedy", name: "탐욕가", desc: "매 턴 가장 많이 뒤집는 수.", bot: makeBot({ corner: 0, mobility: 0, stability: 0, greedy: 1, caution: 0 }) },
  { id: "corner", name: "코너 사냥꾼", desc: "코너와 안정칸을 노린다.", bot: makeBot({ corner: 4, mobility: 0, stability: 1.5, greedy: 0.2, caution: 1.2 }) },
  { id: "mobility", name: "봉쇄가", desc: "안정칸으로 상대 선택지를 줄인다.", bot: sbot({ corner: 7, mob: 0, pos: 0.3, front: 1.6, disc: 0 }, 1) },
  { id: "safe", name: "신중가", desc: "X·C 위험칸을 피해 둔다.", bot: makeBot({ corner: 3.5, mobility: 0, stability: 1.2, greedy: 0.1, caution: 2.2 }) },
  { id: "pos1", name: "포지셔너", desc: "위치 가치표 1수 평가.", bot: sbot({ corner: 6, mob: 0, pos: 0.4, front: 0, disc: 0.5 }, 1) },
  { id: "mob1", name: "기동 제압", desc: "프런티어로 기동력 확보(1수).", bot: sbot({ corner: 7, mob: 0, pos: 0.2, front: 1.2, disc: 0 }, 1) },
  { id: "front1", name: "안정 추구", desc: "프런티어 최소화로 안정성(1수).", bot: sbot({ corner: 6, mob: 0, pos: 0.3, front: 1, disc: 0 }, 1) },
  { id: "ab2a", name: "전략가", desc: "코너+안정성 균형 평가.", bot: sbot({ corner: 8, mob: 0, pos: 0.5, front: 1, disc: 0.3 }, 1) },
  { id: "ab2b", name: "안정 마스터", desc: "프런티어를 강하게 최소화.", bot: sbot({ corner: 8, mob: 0, pos: 0.4, front: 1.8, disc: 0 }, 1) },
  { id: "ab3a", name: "코너 지배자", desc: "코너 선점을 최우선.", bot: sbot({ corner: 14, mob: 0, pos: 0.4, front: 0.9, disc: 0.2 }, 1) },
  { id: "ab3b", name: "안정 운영가", desc: "프런티어 최소화로 안정성 극대화.", bot: sbot({ corner: 11, mob: 0, pos: 0.6, front: 1.8, disc: 0.2 }, 1) },
  { id: "ab4a", name: "포지션 전문가", desc: "위치 가치표를 깊게 활용.", bot: sbot({ corner: 12, mob: 0, pos: 0.9, front: 1, disc: 0.3 }, 1) },
  { id: "ab4b", name: "종반 강자", desc: "후반 돌 수 우위를 노린다.", bot: sbot({ corner: 12, mob: 0, pos: 0.5, front: 0.9, disc: 0.9 }, 1) },
  { id: "ab5", name: "그랜드마스터", desc: "코너·안정성·위치를 모두 강하게. 최강.", bot: sbot({ corner: 16, mob: 0, pos: 0.8, front: 1.6, disc: 0.5 }, 1) },
];

function parsePrompt(prompt: string) {
  return runRules(prompt, DEFAULT, [
    { re: /코너|모서리|구석|꼭지/, label: "코너", effect: "코너 선점 ↑", apply: (w) => { w.corner += 3; w.stability += 0.8; } },
    { re: /모빌리티|선택지|가둬|봉쇄|묶|수읽기|움직임/, label: "봉쇄", effect: "상대 모빌리티 억제 ↑", apply: (w) => { w.mobility += 2; } },
    { re: /안정|가장자리|변|벽|굳히|고정/, label: "안정", effect: "안정칸/가장자리 ↑", apply: (w) => { w.stability += 1.5; } },
    { re: /많이|뒤집|개수|욕심|먹|최대/, label: "최다 획득", effect: "뒤집는 수 최대화 ↑", apply: (w) => { w.greedy += 1.5; } },
    { re: /안전|신중|위험|조심|방어/, label: "신중", effect: "위험칸(X·C) 회피 ↑", apply: (w) => { w.caution += 1.5; } },
    { re: /공격|적극|몰아|압박/, label: "공격", effect: "공격적 전개 ↑", apply: (w) => { w.greedy += 0.8; w.mobility += 0.8; } },
  ], "균형형 — 코너·모빌리티·안정성을 고르게 추구");
}

function generateCode(prompt: string, res: { weights: Weights; intent: string }): string {
  const w = res.weights, f = (n: number) => (n ?? 0).toFixed(2);
  return `# Vibe Game · 리버시 — 자동 생성 제출 코드 (Python)
# 전략 의도: ${res.intent}
# 프롬프트: "${prompt.replace(/"/g, "'").slice(0, 120)}"
import sys
W = dict(corner=${f(w.corner)}, mobility=${f(w.mobility)}, stability=${f(w.stability)},
         greedy=${f(w.greedy)}, caution=${f(w.caution)})

def choose(board, me):
    best, best_s = None, -1e9
    for mv in legal_moves(board, me):                 # 한 칸 이상 뒤집는 칸만 합법
        flipped = count_flips(board, mv, me)
        opp_mob = len(legal_moves(place(board, mv, me), opp(me)))
        s  = W["greedy"]    * flipped
        s += W["corner"]    * (25 if mv in CORNERS else 0)
        s += W["stability"] * (POS[mv] / 10)
        s += W["mobility"]  * (-opp_mob)              # 상대 선택지 최소화
        if POS[mv] < 0: s += W["caution"] * (POS[mv] / 8)
        if s > best_s: best, best_s = mv, s
    return best

for line in sys.stdin:                                 # READY/TURN/OPP/FINISH
    cmd, *a = line.split()
    if cmd == "TURN":
        mv = choose(board, me)
        print(*(divmod(mv, 8) if mv is not None else ("PASS",)), flush=True)
    elif cmd == "FINISH": break
`;
}

// ── 보드 렌더러 ───────────────────────────────────────────────
function Disc({ value }: { value: Cell }) {
  if (value === 0) return null;
  const p1 = value === 1;
  return (
    <span
      className="cell-pop block h-[80%] w-[80%] rounded-full"
      style={{
        background: p1
          ? "radial-gradient(circle at 32% 28%, #7dd3fc, #38bdf8 55%, #0284c7)"
          : "radial-gradient(circle at 32% 28%, #fda4af, #fb7185 55%, #e11d48)",
        boxShadow: p1
          ? "0 4px 12px -3px rgba(56,189,248,0.6), inset 0 -3px 6px rgba(0,0,0,0.35)"
          : "0 4px 12px -3px rgba(251,113,133,0.6), inset 0 -3px 6px rgba(0,0,0,0.35)",
      }}
    />
  );
}

function ReversiBoard({ state, interactive, player = 1, onMove, lastMove }: BoardViewProps<RevState, RevMove>) {
  const legal = interactive ? new Set(legalMoves(state, player)) : new Set<number>();
  return (
    <div
      className="grid aspect-square w-full select-none gap-[3px] rounded-xl border border-border p-[6px]"
      style={{ gridTemplateColumns: `repeat(${N}, minmax(0,1fr))`, background: "#13301f" }}
    >
      {state.map((cell, i) => {
        const isLegal = legal.has(i);
        const isLast = lastMove === i;
        return (
          <button
            key={i}
            disabled={!isLegal}
            onClick={() => isLegal && onMove?.(i)}
            className={`relative grid aspect-square place-items-center rounded-[4px] ${isLegal ? "cursor-pointer" : "cursor-default"}`}
            style={{
              background: isLast ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <Disc value={cell} />
            {isLegal && (
              <span className="absolute h-[26%] w-[26%] rounded-full" style={{ background: "rgba(56,189,248,0.45)", boxShadow: "0 0 8px 1px rgba(56,189,248,0.5)" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const reversiGame: GameModule<RevState, RevMove> = {
  id: "reversi",
  name: "리버시",
  tagline: "한 수로 전세가 뒤집힌다. 코너를 쥐는 자가 이긴다.",
  accent: "#34d399",
  icon: "⚫",
  rules: [
    "상대 돌을 내 돌 사이에 끼워 한 줄 이상 뒤집을 수 있는 칸에만 둘 수 있습니다.",
    "둔 칸과 직선으로 이어진 상대 돌이 모두 내 색으로 뒤집힙니다.",
    "둘 곳이 없으면 패스. 양쪽 모두 둘 수 없으면 게임 종료.",
    "마지막에 돌이 더 많은 쪽이 승리합니다. 코너는 절대 뒤집히지 않아 가장 강력합니다.",
  ],
  problem: {
    objective: "게임 종료 시 내 색(파랑) 돌을 상대보다 더 많이 남기면 승리한다.",
    constraints: [
      "보드: 8×8. 중앙 4칸에 X자 초기 배치.",
      "한 줄 이상 뒤집을 수 있는 칸에만 착수 가능. 둘 곳이 없으면 패스.",
      "양쪽 모두 둘 수 없으면 종료, 돌 수로 승부.",
      "선공/후공을 번갈아 갖는 다전제로 승률을 측정한다.",
    ],
  },
  initial,
  legalMoves,
  applyMove,
  hasMove,
  status,
  score: (s) => { const { p1, p2 } = score(s); return { p1, p2 }; },
  scoreLabel: { p1: "파랑", p2: "빨강" },
  moveNote: (prev, p, m) => `(${(m / N) | 0},${m % N}) 착수 · ${flips(prev, m, p).length}개 뒤집음`,
  defaultWeights: DEFAULT,
  weightLabels: [
    { key: "corner", label: "코너" },
    { key: "mobility", label: "봉쇄력" },
    { key: "stability", label: "안정성" },
    { key: "greedy", label: "최다 획득" },
    { key: "caution", label: "위험 회피" },
  ],
  parsePrompt,
  makeBot,
  sampleBots,
  generateCode,
  promptSuggestions: [
    "코너를 최우선으로 노리고 위험칸은 피해서 안전하게 둬.",
    "상대 둘 곳을 최대한 줄여서 가둬버려.",
    "가장자리를 굳히면서 안정적으로 운영해.",
    "초반에는 욕심내지 말고 신중하게, 코너만 챙겨.",
  ],
  codegenSpec: `게임: 리버시(오델로), 8x8. 셀 인덱스 i = row*8 + col.
state: 길이 64의 숫자 배열. 0=빈칸, 1=플레이어1, 2=플레이어2.
move: number (착수할 칸 인덱스 0~63). legalMoves가 주는 값 중에서 골라 반환.
helpers:
  legalMoves(state, player) -> number[]  // 둘 수 있는 칸들 (반드시 이 중에서 반환)
  applyMove(state, player, move) -> newState
  score(state) -> { p1:number, p2:number }   // 각 색 돌 개수
  other(player) -> 상대 번호
  flips(state, i, player) -> number[]   // i에 두면 뒤집히는 칸들
  POS -> number[64]   // 위치 가치표(코너 +, 코너 인접 X/C칸 -)
  CORNERS -> [0, 7, 56, 63]
  N = 8
팁: applyMove 후 score로 평가하거나 flips 개수·POS·CORNERS를 조합해 점수화하세요. 코너는 절대 뒤집히지 않아 매우 강력합니다. 반환값은 number 하나.`,
  codeHelpers: { N, flips, POS, CORNERS },
  BoardView: ReversiBoard,
};
