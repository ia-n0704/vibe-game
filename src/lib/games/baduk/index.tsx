"use client";

import { Bot, BoardViewProps, GameModule, Player, SampleBot, Weights, other } from "../types";
import { runRules } from "../strategy";
import {
  BadukState, BadukMove, N,
  initial, legalMoves, applyMove, hasMove, status, score, group, neighbors, moveScore, rc, idx,
} from "./engine";

const DEFAULT: Weights = { attack: 1, defense: 1, blunder: 0 };

function makeBot(w: Weights): Bot<BadukState, BadukMove> {
  const wA = w.attack ?? 1, wD = w.defense ?? 1, bl = w.blunder ?? 0;
  return (state, p) => {
    const moves = legalMoves(state, p);
    if (!moves.length) return null;
    if (bl > 0 && Math.random() < bl) return moves[(Math.random() * moves.length) | 0];
    const opp = other(p);
    let best = moves[0], bs = -Infinity;
    for (const m of moves) {
      const after = applyMove(state, p, m);
      if (after.caps[p - 1] > state.caps[p - 1]) return m; // 따냄 = 승리
      const board = after.board;
      let atk = 0;
      const seen = new Set<number>();
      for (const n of neighbors(m)) {
        if (board[n] === opp && !seen.has(n)) {
          const g = group(board, n);
          g.stones.forEach((s) => seen.add(s));
          atk += g.libs === 1 ? 60 : Math.max(0, 4 - g.libs);
        }
      }
      const myLibs = group(board, m).libs;
      let def = myLibs * 2;
      if (myLibs === 1) def -= 40;
      const s = wA * atk + wD * def + Math.random() * 0.01;
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  };
}

const sampleBots: SampleBot<BadukState, BadukMove>[] = [
  { id: "random", name: "랜덤 워커", desc: "되는 대로 둔다(자살수만 피함). 최약체.", bot: makeBot({ attack: 1, defense: 1, blunder: 1 }) },
  { id: "blind", name: "초보", desc: "절반은 막 두고 절반만 생각.", bot: makeBot({ attack: 1, defense: 1, blunder: 0.5 }) },
  { id: "rush", name: "공격광", desc: "단수만 노리고 자기 활로는 등한시.", bot: makeBot({ attack: 1.8, defense: 0.4, blunder: 0.25 }) },
  { id: "turtle", name: "거북이", desc: "활로 늘리기에만 치중.", bot: makeBot({ attack: 0.5, defense: 1.6, blunder: 0.25 }) },
  { id: "atk1", name: "공격가", desc: "상대를 단수로 몬다.", bot: makeBot({ attack: 1.6, defense: 0.8, blunder: 0.12 }) },
  { id: "def1", name: "수비가", desc: "내 돌의 활로를 지킨다.", bot: makeBot({ attack: 0.8, defense: 1.6, blunder: 0.12 }) },
  { id: "bal1", name: "균형가", desc: "공격과 활로를 함께.", bot: makeBot({ attack: 1, defense: 1, blunder: 0.1 }) },
  { id: "atk2", name: "맹공가", desc: "단수·따냄 기회를 집요하게.", bot: makeBot({ attack: 1.8, defense: 1, blunder: 0.06 }) },
  { id: "def2", name: "철벽", desc: "자충을 절대 피하고 활로 우위.", bot: makeBot({ attack: 0.9, defense: 1.8, blunder: 0.06 }) },
  { id: "bal2", name: "전략가", desc: "공수 균형 + 실수 적음.", bot: makeBot({ attack: 1.2, defense: 1.2, blunder: 0.04 }) },
  { id: "counter", name: "역공가", desc: "지키며 단수를 노린다.", bot: makeBot({ attack: 1.4, defense: 1.3, blunder: 0.03 }) },
  { id: "hunter", name: "사냥꾼", desc: "공격 비중 높은 정밀형.", bot: makeBot({ attack: 1.7, defense: 1.2, blunder: 0.02 }) },
  { id: "wall", name: "수문장", desc: "수비 비중 높은 정밀형.", bot: makeBot({ attack: 1.2, defense: 1.7, blunder: 0.02 }) },
  { id: "master", name: "고수", desc: "공수 모두 강하게, 실수 거의 없음.", bot: makeBot({ attack: 1.5, defense: 1.5, blunder: 0 }) },
  { id: "grandmaster", name: "그랜드마스터", desc: "최적 균형. 최강.", bot: makeBot({ attack: 1.6, defense: 1.6, blunder: 0 }) },
];

function parsePrompt(prompt: string) {
  return runRules(prompt, DEFAULT, [
    { re: /공격|단수|따|잡|몰아|적극|아타리|둘러/, label: "공격", effect: "단수·따냄 ↑", apply: (w) => { w.attack += 1; } },
    { re: /수비|활로|지키|살리|안전|방어|호구/, label: "수비", effect: "내 활로 보전 ↑", apply: (w) => { w.defense += 1; } },
    { re: /균형|골고루|함께/, label: "균형", effect: "공수 균형", apply: (w) => { w.attack += 0.3; w.defense += 0.3; } },
    { re: /신중|확실|실수/, label: "신중", effect: "실수 최소화", apply: (w) => { w.blunder = 0; } },
  ], "균형형 — 공격(단수)과 활로 보전을 함께");
}

function generateCode(prompt: string, res: { weights: Weights; intent: string }): string {
  const w = res.weights, f = (n: number) => (n ?? 0).toFixed(2);
  return `# Vibe Game · 따내기 바둑 — 자동 생성 제출 코드 (Python)
# 전략 의도: ${res.intent}
# 프롬프트: "${prompt.replace(/"/g, "'").slice(0, 120)}"
W = dict(attack=${f(w.attack)}, defense=${f(w.defense)})

def choose(state, me):
    best, best_s = None, -1e18
    for mv in legal_moves(state, me):
        after = apply_move(state, me, mv)
        if captured(after, me):           # 따냄이면 즉시 승리
            return mv
        atk = atari_value(after, mv, opp(me))   # 상대 단수 가치
        lib = my_liberties(after, mv)           # 내 활로(작으면 자충)
        s = W["attack"]*atk + W["defense"]*(lib*2 - (40 if lib==1 else 0))
        if s > best_s: best, best_s = mv, s
    return best
`;
}

// ── 바둑판(고반) 렌더러 ──────────────────────────────────────
const PAD = 7;
const STEP = (100 - 2 * PAD) / (N - 1);
const xx = (c: number) => PAD + c * STEP;
const yy = (r: number) => PAD + r * STEP;
const STARS = [2, N - 3].flatMap((r) => [2, N - 3].map((c) => idx(r, c))).concat([idx((N / 2) | 0, (N / 2) | 0)]);

function BadukBoard({ state, interactive, player = 1, onMove, lastMove }: BoardViewProps<BadukState, BadukMove>) {
  const board = state.board;
  const legal = interactive ? new Set(legalMoves(state, player)) : new Set<number>();
  return (
    <div className="relative aspect-square w-full select-none rounded-lg border border-border" style={{ background: "#3a2c18" }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {Array.from({ length: N }, (_, r) => (
          <line key={"h" + r} x1={xx(0)} y1={yy(r)} x2={xx(N - 1)} y2={yy(r)} stroke="rgba(0,0,0,0.55)" strokeWidth={0.3} />
        ))}
        {Array.from({ length: N }, (_, c) => (
          <line key={"v" + c} x1={xx(c)} y1={yy(0)} x2={xx(c)} y2={yy(N - 1)} stroke="rgba(0,0,0,0.55)" strokeWidth={0.3} />
        ))}
        {STARS.map((i) => { const [r, c] = rc(i); return <circle key={"s" + i} cx={xx(c)} cy={yy(r)} r={0.7} fill="rgba(0,0,0,0.6)" />; })}
      </svg>
      {board.map((cell, i) => {
        const [r, c] = rc(i);
        const isLegal = legal.has(i);
        const isLast = lastMove === i;
        return (
          <button
            key={i}
            disabled={!isLegal}
            onClick={() => isLegal && onMove?.(i)}
            className={`absolute grid place-items-center rounded-full ${isLegal ? "cursor-pointer" : "cursor-default"}`}
            style={{ left: `${xx(c)}%`, top: `${yy(r)}%`, width: `${STEP}%`, height: `${STEP}%`, transform: "translate(-50%,-50%)" }}
          >
            {cell !== 0 && (
              <span
                className="cell-pop block rounded-full"
                style={{
                  width: "82%", height: "82%",
                  background: cell === 1
                    ? "radial-gradient(circle at 32% 28%, #7dd3fc, #38bdf8 55%, #0284c7)"
                    : "radial-gradient(circle at 32% 28%, #fda4af, #fb7185 55%, #e11d48)",
                  boxShadow: isLast ? "0 0 0 1.5px rgba(255,255,255,0.8), 0 2px 5px rgba(0,0,0,0.5)" : "0 2px 5px rgba(0,0,0,0.5)",
                }}
              />
            )}
            {cell === 0 && isLegal && <span className="block h-1/4 w-1/4 rounded-full" style={{ background: "rgba(124,92,255,0.4)" }} />}
          </button>
        );
      })}
    </div>
  );
}

export const badukGame: GameModule<BadukState, BadukMove> = {
  id: "baduk",
  name: "따내기 바둑",
  tagline: "활로를 막아 상대 돌을 먼저 따내는 자가 이긴다.",
  accent: "#fb923c",
  icon: "",
  rules: [
    "교차점에 번갈아 돌을 놓습니다(파랑 선공). 돌의 상하좌우 빈 점이 ‘활로’입니다.",
    "상대 돌(그룹)의 활로를 모두 막으면 그 돌을 따냅니다(잡습니다).",
    "먼저 상대 돌을 하나라도 따내면 즉시 승리합니다(따내기 바둑).",
    "자기 그룹의 활로가 0이 되는 자살수는 둘 수 없습니다. 자충(스스로 단수)을 조심하세요.",
  ],
  problem: {
    objective: "상대 돌(그룹)의 활로를 모두 막아 먼저 따내면 승리한다.",
    constraints: [
      "보드: 9×9 교차점. 빈 점에 착수, 자살수는 금지.",
      "그룹의 활로(인접 빈 점)가 0이 되면 따냄 → 따낸 즉시 게임 종료·승리.",
      "단수(활로 1) 상태의 돌은 다음 수에 따일 수 있으니 살리거나 활용한다.",
      "선공/후공을 번갈아 갖는 다전제로 승률을 측정한다.",
    ],
  },
  initial,
  legalMoves,
  applyMove,
  hasMove,
  status,
  score,
  scoreLabel: { p1: "파랑", p2: "빨강" },
  moveNote: (prev, p, m) => {
    const got = applyMove(prev, p, m).caps[p - 1] - prev.caps[p - 1];
    return got > 0 ? `따냄! (${got}점) 승리` : `(${(m / N) | 0},${m % N}) 착수`;
  },
  defaultWeights: DEFAULT,
  weightLabels: [
    { key: "attack", label: "공격(단수)" },
    { key: "defense", label: "활로 보전" },
  ],
  parsePrompt,
  makeBot,
  sampleBots,
  generateCode,
  promptSuggestions: [
    "상대를 단수로 몰아 따낼 기회를 최우선으로 노려.",
    "내 돌의 활로를 지키면서 안전하게 둬.",
    "자충은 절대 피하고, 상대 약한 돌을 집요하게 공격해.",
    "공격과 수비를 균형 있게, 실수 없이.",
  ],
  codegenSpec: `게임: 따내기 바둑(Atari Go), 9×9. 교차점 인덱스 i = row*9 + col.
state: { board: number[81], caps: [p1잡은수, p2잡은수] }. board 0=빈점,1=플레이어1,2=플레이어2.
move: number (둘 교차점 인덱스). 반드시 helpers.legalMoves(state, player) 중 하나.
helpers:
  legalMoves(state, player) -> number[]   // 자살수 제외한 둘 수 있는 점
  applyMove(state, player, move) -> newState  // caps가 늘면 따냄 발생
  score(state) -> { p1, p2 }   // 돌 개수
  other(player) -> 상대 번호
  group(board, i) -> { stones:number[], libs:number }   // i가 속한 그룹과 활로 수
  neighbors(i) -> number[]   // 상하좌우 이웃
  moveScore(state, player, m) -> number   // 참고용 종합 점수(따냄=백만)
  N = 9
팁: 어떤 후보 m에 대해 applyMove 후 caps[player-1]이 늘면 그 수는 따냄=승리입니다. 상대 그룹을 활로 1(단수)로 만드는 수는 가치가 높고, 내가 둔 뒤 내 그룹 활로가 1이면 자충이라 위험합니다.`,
  codeHelpers: { N, neighbors, group, moveScore, rc, idx },
  BoardView: BadukBoard,
};
