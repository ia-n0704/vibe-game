// 게임 무관 negamax + 알파베타. 강한 샘플 AI의 탐색 엔진.
import { AnyGame, Player } from "./types";

export type EvalFn = (state: unknown, player: Player) => number;
const other = (p: Player): Player => (p === 1 ? 2 : 1);
const WIN = 1e7;

export function negamax(
  game: AnyGame,
  ev: EvalFn,
  state: unknown,
  player: Player,
  depth: number,
  alpha: number,
  beta: number
): number {
  const st = game.status(state);
  if (st.over) {
    if (st.winner === player) return WIN - (20 - depth);
    if (st.winner === other(player)) return -WIN + (20 - depth);
    return 0;
  }
  if (depth <= 0) return ev(state, player);
  const moves = game.legalMoves(state, player) as unknown[];
  if (!moves.length) {
    return -negamax(game, ev, state, other(player), depth - 1, -beta, -alpha);
  }
  let best = -Infinity;
  for (const m of moves) {
    const ns = game.applyMove(state, player, m);
    const v = -negamax(game, ev, ns, other(player), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// depth<=1 이면 1-ply(내 수 직후 평가), 그 이상은 negamax.
export function searchBot(game: AnyGame, ev: EvalFn, depth: number) {
  return (state: unknown, player: Player) => {
    const moves = game.legalMoves(state, player) as unknown[];
    if (!moves.length) return null;
    let best = moves[0];
    let bs = -Infinity;
    if (depth <= 1) {
      for (const m of moves) {
        const ns = game.applyMove(state, player, m);
        const v = ev(ns, player) + Math.random() * 1e-3;
        if (v > bs) { bs = v; best = m; }
      }
      return best;
    }
    let alpha = -Infinity;
    for (const m of moves) {
      const ns = game.applyMove(state, player, m);
      const v = -negamax(game, ev, ns, other(player), depth - 1, -Infinity, Infinity) + Math.random() * 1e-3;
      if (v > bs) { bs = v; best = m; }
      if (v > alpha) alpha = v;
    }
    return best;
  };
}
