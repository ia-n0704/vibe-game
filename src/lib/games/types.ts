// 멀티 게임 추상화 — 각 게임이 이 인터페이스를 구현하면 플레이/에디터/채점/리더보드가 공통으로 동작한다.
import type { ComponentType } from "react";

export type Player = 1 | 2;
export const other = (p: Player): Player => (p === 1 ? 2 : 1);

// 전략 가중치 — 게임마다 키 집합이 다르다(예: Ataxx의 capture/central …).
export type Weights = Record<string, number>;

export interface ParsedStrategy {
  weights: Weights;
  matched: { keyword: string; effect: string }[];
  intent: string;
}

// 봇 = 상태 + 차례 → 한 수(없으면 null=패스)
export type Bot<S, M> = (state: S, player: Player) => M | null;

export interface SampleBot<S, M> {
  id: string;
  name: string;
  desc: string;
  bot: Bot<S, M>;
}

// 보드 렌더러 props. 상호작용 보드는 자체적으로 부분 선택 상태를 관리하고
// 완성된 한 수를 onMove로 올려보낸다(게임마다 입력 방식이 달라도 통일됨).
export interface BoardViewProps<S, M> {
  state: S;
  interactive?: boolean;
  player?: Player; // 상호작용 시 현재 차례
  onMove?: (move: M) => void;
  lastMove?: M | null;
  controls?: ComponentType; // (선택) 보드 위에 띄울 추가 컨트롤
}

export interface GameStatus {
  over: boolean;
  winner: Player | 0 | null; // 0=무승부, null=진행중
}

export interface GameModule<S, M> {
  id: string;
  name: string;
  tagline: string;
  accent: string; // 카드/티어 색
  icon: string;
  rules: string[];
  problem: { objective: string; constraints: string[] }; // 문제 설명용 스펙

  // 엔진
  initial(): S;
  legalMoves(state: S, player: Player): M[];
  applyMove(state: S, player: Player, move: M): S;
  hasMove(state: S, player: Player): boolean;
  status(state: S): GameStatus;
  score(state: S): { p1: number; p2: number };
  scoreLabel: { p1: string; p2: string }; // 점수 단위/의미(예: "내 봇" / "상대")
  moveNote(prev: S, player: Player, move: M): string; // 리플레이 한 줄 설명

  // 전략/AI
  defaultWeights: Weights;
  weightLabels: { key: string; label: string }[];
  parsePrompt(prompt: string): ParsedStrategy;
  makeBot(weights: Weights): Bot<S, M>;
  sampleBots: SampleBot<S, M>[];
  generateCode(prompt: string, parsed: ParsedStrategy): string;
  promptSuggestions: string[];

  // LLM 자유 코드 작성용: 상태/수/헬퍼 설명 + LLM 코드가 호출할 헬퍼 함수들
  codegenSpec: string;
  codeHelpers?: Record<string, unknown>;

  // UI
  BoardView: ComponentType<BoardViewProps<S, M>>;
}

// 페이지/공통 컴포넌트에서 구체 타입을 신경 쓰지 않도록 하는 느슨한 별칭
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameModule<any, any>;
