// 게임에 무관한 대국 시뮬레이터 + 승률 추정. 턴별 상태 스냅샷을 리플레이로 기록한다.
import { GameModule, Player, Bot, other } from "./types";

export interface Frame<S, M> {
  state: S;
  turn: number;
  mover: Player | null;
  move: M | null;
  note: string;
  p1: number;
  p2: number;
}

export interface Match<S, M> {
  frames: Frame<S, M>[];
  winner: Player | 0;
  finalScore: { p1: number; p2: number };
}

export function simulate<S, M>(
  game: GameModule<S, M>,
  p1Bot: Bot<S, M>,
  p2Bot: Bot<S, M>,
  first: Player = 1,
  maxTurns = 320
): Match<S, M> {
  let state = game.initial();
  const frames: Frame<S, M>[] = [];
  const s0 = game.score(state);
  frames.push({ state, turn: 0, mover: null, move: null, note: "게임 시작", p1: s0.p1, p2: s0.p2 });

  let current: Player = first;
  let turn = 0;
  while (turn < maxTurns) {
    if (game.status(state).over) break;

    if (!game.hasMove(state, current)) {
      const sc = game.score(state);
      frames.push({
        state,
        turn: ++turn,
        mover: current,
        move: null,
        note: `P${current} 패스`,
        p1: sc.p1,
        p2: sc.p2,
      });
      current = other(current);
      continue;
    }

    const bot = current === 1 ? p1Bot : p2Bot;
    const move = bot(state, current);
    if (move == null) {
      // 봇이 수를 못 냄(0은 유효한 수이므로 == null 로 검사) → 패스 처리
      turn++;
      current = other(current);
      continue;
    }
    const note = game.moveNote(state, current, move);
    state = game.applyMove(state, current, move);
    const sc = game.score(state);
    frames.push({ state, turn: ++turn, mover: current, move, note, p1: sc.p1, p2: sc.p2 });
    current = other(current);
  }

  const fin = game.score(state);
  const st = game.status(state);
  const winner: Player | 0 = st.over
    ? (st.winner ?? 0)
    : fin.p1 > fin.p2
    ? 1
    : fin.p2 > fin.p1
    ? 2
    : 0;
  return { frames, winner, finalScore: fin };
}

export function estimateWinrate<S, M>(
  game: GameModule<S, M>,
  userBot: Bot<S, M>,
  oppBot: Bot<S, M>,
  games = 8
): { wins: number; draws: number; losses: number; winrate: number } {
  let wins = 0,
    draws = 0,
    losses = 0;
  for (let g = 0; g < games; g++) {
    const first: Player = g % 2 === 0 ? 1 : 2;
    const r = simulate(game, userBot, oppBot, first);
    if (r.winner === 1) wins++;
    else if (r.winner === 2) losses++;
    else draws++;
  }
  return { wins, draws, losses, winrate: wins / games };
}
