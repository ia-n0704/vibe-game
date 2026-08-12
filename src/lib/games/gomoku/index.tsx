"use client";

import { Bot, BoardViewProps, GameModule, Player, SampleBot, Weights, other } from "../types";
import { runRules } from "../strategy";
import {
  GoState, GoMove, Cell, N,
  initial, legalMoves, applyMove, hasMove, status, score, placeScore, rc, idx,
} from "./engine";

const DEFAULT: Weights = { offense: 1, defense: 1, blunder: 0 };

function makeBot(w: Weights): Bot<GoState, GoMove> {
  const wOff = w.offense ?? 1, wDef = w.defense ?? 1, blunder = w.blunder ?? 0;
  return (b, p) => {
    const moves = legalMoves(b);
    if (!moves.length) return null;
    if (blunder > 0 && Math.random() < blunder) return moves[(Math.random() * moves.length) | 0];
    const opp = other(p);
    let best = moves[0], bs = -Infinity;
    for (const m of moves) {
      const off = placeScore(b, m, p); // 내가 두면 강함(공격/승리)
      const def = placeScore(b, m, opp); // 상대가 두면 강함 → 막을 가치
      const s = wOff * off + wDef * def + Math.random() * 1e-3;
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  };
}

// 오목은 수비만 하면 무승부가 되므로 모든 봇이 공격 우위. 세기는 실수율(blunder)로 차등.
const sampleBots: SampleBot<GoState, GoMove>[] = [
  { id: "random", name: "랜덤 워커", desc: "되는 대로 둔다. 최약체.", bot: makeBot({ offense: 1, defense: 0, blunder: 1 }) },
  { id: "blind", name: "초보", desc: "절반은 막 두고 절반만 패턴.", bot: makeBot({ offense: 1.2, defense: 0.6, blunder: 0.5 }) },
  { id: "rush", name: "돌격수", desc: "수비는 거의 안 하고 자기 줄만.", bot: makeBot({ offense: 1.8, defense: 0.4, blunder: 0.25 }) },
  { id: "guard0", name: "어설픈 견제", desc: "막으려 하지만 자주 실수.", bot: makeBot({ offense: 1.2, defense: 1, blunder: 0.3 }) },
  { id: "off1", name: "공격가", desc: "내 줄 만들기에 집중.", bot: makeBot({ offense: 1.8, defense: 0.8, blunder: 0.12 }) },
  { id: "guard1", name: "견제형", desc: "상대 줄을 누르며 전진.", bot: makeBot({ offense: 1.4, defense: 1.2, blunder: 0.12 }) },
  { id: "bal1", name: "균형가", desc: "공격 우위로 균형.", bot: makeBot({ offense: 1.5, defense: 1, blunder: 0.1 }) },
  { id: "off2", name: "맹공가", desc: "위협을 겹쳐 만든다.", bot: makeBot({ offense: 2, defense: 0.9, blunder: 0.06 }) },
  { id: "solid", name: "단단한 공격", desc: "공격하면서 4·열린3은 꼭 막는다.", bot: makeBot({ offense: 1.6, defense: 1.3, blunder: 0.06 }) },
  { id: "bal2", name: "전략가", desc: "공격 우위 + 실수 적음.", bot: makeBot({ offense: 1.6, defense: 1.2, blunder: 0.04 }) },
  { id: "counter", name: "역공가", desc: "막으면서 내 위협도 키운다.", bot: makeBot({ offense: 1.8, defense: 1.3, blunder: 0.03 }) },
  { id: "threat", name: "위협가", desc: "이중 위협을 노리는 정밀형.", bot: makeBot({ offense: 2, defense: 1.1, blunder: 0.02 }) },
  { id: "precise", name: "정밀형", desc: "공격 우위, 수비도 탄탄.", bot: makeBot({ offense: 1.7, defense: 1.4, blunder: 0.02 }) },
  { id: "master", name: "고수", desc: "공수 모두 강하게, 실수 거의 없음.", bot: makeBot({ offense: 1.9, defense: 1.4, blunder: 0 }) },
  { id: "grandmaster", name: "그랜드마스터", desc: "최적 균형(공격 우위). 최강.", bot: makeBot({ offense: 2, defense: 1.5, blunder: 0 }) },
];

function parsePrompt(prompt: string) {
  return runRules(prompt, DEFAULT, [
    { re: /공격|만들|이기|줄|연속|위협|몰아|적극/, label: "공격", effect: "내 줄 형성 ↑", apply: (w) => { w.offense += 1; } },
    { re: /수비|막|방어|차단|블록|지키|끊/, label: "수비", effect: "상대 줄 차단 ↑", apply: (w) => { w.defense += 1; } },
    { re: /균형|골고루|둘 다|함께/, label: "균형", effect: "공수 균형", apply: (w) => { w.offense += 0.3; w.defense += 0.3; } },
    { re: /신중|안전|확실/, label: "신중", effect: "실수 최소화", apply: (w) => { w.blunder = 0; } },
  ], "균형형 — 공격과 수비를 함께 본다");
}

function generateCode(prompt: string, res: { weights: Weights; intent: string }): string {
  const w = res.weights, f = (n: number) => (n ?? 0).toFixed(2);
  return `# Vibe Game · 오목 — 자동 생성 제출 코드 (Python)
# 전략 의도: ${res.intent}
# 프롬프트: "${prompt.replace(/"/g, "'").slice(0, 120)}"
import sys
W = dict(offense=${f(w.offense)}, defense=${f(w.defense)})

def choose(board, me):
    opp = 3 - me
    best, best_s = None, -1e18
    for cell in candidate_moves(board):           # 돌 주변 빈 칸
        off = place_score(board, cell, me)        # 내가 두면 강함(승리=큰 값)
        dfn = place_score(board, cell, opp)        # 상대가 두면 강함 → 막을 가치
        s = W["offense"]*off + W["defense"]*dfn
        if s > best_s: best, best_s = cell, s
    return best
`;
}

// ── 보드 렌더러 (15×15) ───────────────────────────────────────
function Stone({ value }: { value: Cell }) {
  if (value === 0) return null;
  const p1 = value === 1;
  return (
    <span
      className="cell-pop block h-[82%] w-[82%] rounded-full"
      style={{
        background: p1
          ? "radial-gradient(circle at 32% 28%, #7dd3fc, #38bdf8 55%, #0284c7)"
          : "radial-gradient(circle at 32% 28%, #fda4af, #fb7185 55%, #e11d48)",
        boxShadow: p1
          ? "0 2px 6px -1px rgba(56,189,248,0.6)"
          : "0 2px 6px -1px rgba(251,113,133,0.6)",
      }}
    />
  );
}

function GomokuBoard({ state, interactive, onMove, lastMove }: BoardViewProps<GoState, GoMove>) {
  return (
    <div
      className="grid aspect-square w-full select-none gap-px rounded-lg border border-border p-1"
      style={{ gridTemplateColumns: `repeat(${N}, minmax(0,1fr))`, background: "#1a140c" }}
    >
      {state.map((cell, i) => {
        const empty = cell === 0;
        const clickable = interactive && empty;
        const isLast = lastMove === i;
        return (
          <button
            key={i}
            disabled={!clickable}
            onClick={() => clickable && onMove?.(i)}
            className={`relative grid aspect-square place-items-center ${clickable ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
            style={{ background: "rgba(120,90,50,0.18)", boxShadow: isLast ? "inset 0 0 0 1.5px rgba(255,255,255,0.7)" : "inset 0 0 0 0.5px rgba(0,0,0,0.35)" }}
          >
            <Stone value={cell} />
          </button>
        );
      })}
    </div>
  );
}

export const gomokuGame: GameModule<GoState, GoMove> = {
  id: "gomoku",
  name: "오목",
  tagline: "가로·세로·대각으로 다섯 개를 먼저 잇는 자가 이긴다.",
  accent: "#fbbf24",
  icon: "",
  rules: [
    "빈 칸에 번갈아 돌을 놓습니다. 파랑이 선공.",
    "가로·세로·대각선 어느 방향이든 같은 색 돌 5개를 먼저 이으면 승리합니다.",
    "‘열린 3’, ‘열린 4’ 같은 이중 위협을 만들면 막기 어려워집니다.",
    "상대의 4(열린 3)는 즉시 막지 않으면 집니다. 공격과 수비의 줄타기가 핵심.",
  ],
  problem: {
    objective: "내 색(파랑) 돌 5개를 한 줄로 먼저 이으면 승리한다.",
    constraints: [
      "보드: 15×15. 빈 칸 어디든 둘 수 있다(봇은 돌 주변 후보만 고려).",
      "가로/세로/대각 5목 달성 시 즉시 종료. 빈 칸이 없으면 무승부.",
      "한 수로 두 개의 ‘열린 3/4’를 동시에 만들면 사실상 승리.",
      "선공/후공을 번갈아 갖는 다전제로 승률을 측정한다.",
    ],
  },
  initial,
  legalMoves: (s) => legalMoves(s),
  applyMove,
  hasMove: (s) => hasMove(s),
  status,
  score,
  scoreLabel: { p1: "파랑", p2: "빨강" },
  moveNote: (_prev, _p, m) => `(${(m / N) | 0},${m % N})에 착수`,
  defaultWeights: DEFAULT,
  weightLabels: [
    { key: "offense", label: "공격" },
    { key: "defense", label: "수비" },
  ],
  parsePrompt,
  makeBot,
  sampleBots,
  generateCode,
  promptSuggestions: [
    "상대 줄은 무조건 막으면서 내 줄을 천천히 키워.",
    "수비보다 공격 우선 — 이중 위협을 노려 몰아붙여.",
    "열린 3은 바로 막고, 내 열린 3은 적극적으로 만들어.",
    "실수 없이 공격과 수비를 균형 있게.",
  ],
  codegenSpec: `게임: 오목(Gomoku), 15×15. 셀 인덱스 i = row*15 + col.
state: 길이 225의 숫자 배열. 0=빈칸, 1=플레이어1, 2=플레이어2.
move: number (놓을 칸 인덱스 0~224). 반드시 helpers.legalMoves가 준 빈 칸 중 하나.
helpers:
  legalMoves(state) -> number[]   // 돌 주변의 빈 칸 후보(첫 수는 중앙). 이 중에서 골라 반환.
  applyMove(state, player, cell) -> newState
  score(state) -> { p1, p2 }      // 각자 가장 긴 연속 줄 길이
  other(player) -> 상대 번호
  placeScore(state, cell, who) -> number   // who가 cell에 두면 얼마나 강한가(5목=백만, 열린4≈5만, 열린3≈천)
  rc(i)->[row,col], idx(r,c)->i, N=15
팁: 각 후보 cell에서 placeScore(state, cell, me)는 공격 가치, placeScore(state, cell, opp)는 그 자리를 상대에게 내줄 때의 위험(=막을 가치)입니다. 보통 offense*내공격 + defense*상대위협 을 최대화하는 칸을 둡니다. 5목(백만)이 보이면 무조건 그 수.`,
  codeHelpers: { N, placeScore, rc, idx },
  BoardView: GomokuBoard,
};
