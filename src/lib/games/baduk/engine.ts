// 따내기 바둑(Atari Go) 엔진. 9×9. 상대 돌을 먼저 따내면(잡으면) 승리.
// 착수=교차점 인덱스(숫자). 주의: 0도 유효한 착수 → 빈 수는 항상 null.
import { Player, GameStatus, other } from "../types";

export type Cell = 0 | 1 | 2;
export interface BadukState {
  board: Cell[];
  caps: [number, number]; // [P1이 잡은 돌 수, P2가 잡은 돌 수]
}
export type BadukMove = number; // 0..N*N-1
export const N = 9;

export const rc = (i: number): [number, number] => [Math.floor(i / N), i % N];
export const idx = (r: number, c: number) => r * N + c;
const inB = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

export function neighbors(i: number): number[] {
  const [r, c] = rc(i);
  const out: number[] = [];
  if (inB(r - 1, c)) out.push(idx(r - 1, c));
  if (inB(r + 1, c)) out.push(idx(r + 1, c));
  if (inB(r, c - 1)) out.push(idx(r, c - 1));
  if (inB(r, c + 1)) out.push(idx(r, c + 1));
  return out;
}

export function initial(): BadukState {
  return { board: new Array(N * N).fill(0), caps: [0, 0] };
}

// i가 속한 같은 색 그룹(연결된 돌)과 활로(인접 빈 점) 수
export function group(board: Cell[], i: number): { stones: number[]; libs: number } {
  const color = board[i];
  const stones: number[] = [];
  const libSet = new Set<number>();
  const seen = new Set<number>([i]);
  const stack = [i];
  while (stack.length) {
    const cur = stack.pop()!;
    stones.push(cur);
    for (const n of neighbors(cur)) {
      if (board[n] === 0) libSet.add(n);
      else if (board[n] === color && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return { stones, libs: libSet.size };
}

// p가 m에 두면 합법인가(빈 점 + 따냄이 있거나 자살수가 아님)
export function isLegal(state: BadukState, p: Player, m: BadukMove): boolean {
  const board = state.board;
  if (board[m] !== 0) return false;
  const opp = other(p);
  const test = board.slice();
  test[m] = p;
  // 따냄(상대 그룹 활로 0)이 하나라도 있으면 합법
  for (const n of neighbors(m)) {
    if (test[n] === opp && group(test, n).libs === 0) return true;
  }
  // 따냄이 없으면 자기 그룹에 활로가 있어야(자살수 금지)
  return group(test, m).libs > 0;
}

export function legalMoves(state: BadukState, p: Player): BadukMove[] {
  const out: BadukMove[] = [];
  for (let i = 0; i < state.board.length; i++) if (state.board[i] === 0 && isLegal(state, p, i)) out.push(i);
  return out;
}

export const hasMove = (state: BadukState, p: Player) => legalMoves(state, p).length > 0;

export function applyMove(state: BadukState, p: Player, m: BadukMove): BadukState {
  const board = state.board.slice();
  board[m] = p;
  const opp = other(p);
  let captured = 0;
  const done = new Set<number>();
  for (const n of neighbors(m)) {
    if (board[n] === opp && !done.has(n)) {
      const g = group(board, n);
      g.stones.forEach((s) => done.add(s));
      if (g.libs === 0) {
        for (const s of g.stones) board[s] = 0;
        captured += g.stones.length;
      }
    }
  }
  const caps: [number, number] = [state.caps[0], state.caps[1]];
  caps[p - 1] += captured;
  return { board, caps };
}

export function status(state: BadukState): GameStatus {
  // 먼저 따낸 쪽이 승리
  if (state.caps[0] > 0) return { over: true, winner: 1 };
  if (state.caps[1] > 0) return { over: true, winner: 2 };
  if (!hasMove(state, 1) && !hasMove(state, 2)) return { over: true, winner: 0 };
  return { over: false, winner: null };
}

// 표시용: 돌 개수
export function score(state: BadukState): { p1: number; p2: number } {
  let p1 = 0, p2 = 0;
  for (const c of state.board) c === 1 ? p1++ : c === 2 ? p2++ : 0;
  return { p1, p2 };
}

// 착수 평가(봇/LLM용): p가 m에 두면 얼마나 좋은가
export function moveScore(state: BadukState, p: Player, m: BadukMove): number {
  const after = applyMove(state, p, m);
  if (after.caps[p - 1] > state.caps[p - 1]) return 1_000_000; // 따냄 = 승리
  const board = after.board;
  const opp = other(p);
  let atk = 0;
  const seen = new Set<number>();
  for (const n of neighbors(m)) {
    if (board[n] === opp && !seen.has(n)) {
      const g = group(board, n);
      g.stones.forEach((s) => seen.add(s));
      if (g.libs === 1) atk += 60; // 단수(아타리)
      else atk += Math.max(0, 4 - g.libs);
    }
  }
  const myLibs = group(board, m).libs;
  let def = myLibs * 2;
  if (myLibs === 1) def -= 40; // 자충(스스로 단수) 회피
  return atk + def;
}

export { other };
