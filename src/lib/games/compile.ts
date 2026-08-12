// LLM이 작성한 JS 코드를 봇으로 컴파일한다.
// 안전장치: 예외/무효 수가 나오면 합법수로 보정 → 시뮬레이션이 절대 깨지지 않음.
import { AnyGame, Bot, Player } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fn = (state: unknown, player: Player, helpers: unknown) => unknown;

export function compileBot(game: AnyGame, code: string): { bot: Bot<unknown, unknown>; ok: boolean; error?: string } {
  const src = (code || "").trim();
  let fn: Fn | null = null;
  let error: string | undefined;

  // 1) 완전한 함수식 형태: (state, player, helpers) => {...}
  try {
    const f = new Function("return (" + src + ")")();
    if (typeof f === "function") fn = f as Fn;
  } catch {
    /* 다음 방식 시도 */
  }
  // 2) 함수 "본문"만 준 경우
  if (!fn) {
    try {
      fn = new Function("state", "player", "helpers", src) as Fn;
    } catch (e) {
      error = (e as Error).message;
      fn = null;
    }
  }

  const helpers = {
    legalMoves: game.legalMoves,
    applyMove: game.applyMove,
    score: game.score,
    status: game.status,
    hasMove: game.hasMove,
    other: (p: Player): Player => (p === 1 ? 2 : 1),
    ...(game.codeHelpers || {}),
  };

  const bot: Bot<unknown, unknown> = (state, player) => {
    const legal = game.legalMoves(state, player) as unknown[];
    if (!legal.length) return null;
    const rand = () => legal[(Math.random() * legal.length) | 0];
    if (!fn) return rand();
    let mv: unknown;
    try {
      mv = fn(state, player, helpers);
    } catch {
      return rand();
    }
    if (mv == null) return rand();
    if (typeof mv === "number") return (legal as number[]).includes(mv) ? mv : rand();
    const s = JSON.stringify(mv);
    const match = legal.find((l) => JSON.stringify(l) === s);
    return match ?? rand();
  };

  return { bot, ok: !!fn, error };
}
