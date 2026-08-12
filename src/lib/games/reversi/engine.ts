// 리버시(오델로) 엔진. 8×8. 상태=셀 배열, 수=착수할 칸 인덱스.
import { Player, GameStatus, other } from "../types";

export type Cell = 0 | 1 | 2;
export type RevState = Cell[];
export type RevMove = number; // 0..63
export const N = 8;

const DIRS = [-1, 1, -N, N, -N - 1, -N + 1, N - 1, N + 1];
const rc = (i: number): [number, number] => [Math.floor(i / N), i % N];

export function initial(): RevState {
  const b: RevState = new Array(N * N).fill(0);
  b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; // d4 e4 d5 e5
  return b;
}

export function score(b: RevState) {
  let p1 = 0, p2 = 0, empty = 0;
  for (const c of b) c === 1 ? p1++ : c === 2 ? p2++ : empty++;
  return { p1, p2, empty };
}

// 한 칸에 두었을 때 뒤집히는 칸들(없으면 빈 배열 = 불법수)
export function flips(b: RevState, i: number, p: Player): number[] {
  if (b[i] !== 0) return [];
  const opp = other(p);
  const [r0, c0] = rc(i);
  const out: number[] = [];
  for (const d of DIRS) {
    const line: number[] = [];
    let j = i + d;
    let pr = r0, pc = c0;
    while (j >= 0 && j < N * N) {
      const [r, c] = rc(j);
      if (Math.abs(r - pr) > 1 || Math.abs(c - pc) > 1) break; // 가장자리 래핑 방지
      if (b[j] === opp) { line.push(j); pr = r; pc = c; j += d; continue; }
      if (b[j] === p && line.length) out.push(...line);
      break;
    }
  }
  return out;
}

export function legalMoves(b: RevState, p: Player): RevMove[] {
  const out: RevMove[] = [];
  for (let i = 0; i < b.length; i++) if (b[i] === 0 && flips(b, i, p).length) out.push(i);
  return out;
}

export function applyMove(b: RevState, p: Player, i: RevMove): RevState {
  const nb = b.slice();
  nb[i] = p;
  for (const j of flips(b, i, p)) nb[j] = p;
  return nb;
}

export const hasMove = (b: RevState, p: Player) => legalMoves(b, p).length > 0;

export function status(b: RevState): GameStatus {
  const { p1, p2 } = score(b);
  if (!hasMove(b, 1) && !hasMove(b, 2)) {
    if (p1 > p2) return { over: true, winner: 1 };
    if (p2 > p1) return { over: true, winner: 2 };
    return { over: true, winner: 0 };
  }
  return { over: false, winner: null };
}

// 위치 가치표(코너 +, 코너 인접 X/C칸 -)
export const POS: number[] = (() => {
  const w = new Array(N * N).fill(0);
  const v = [
    [120, -20, 20, 5, 5, 20, -20, 120],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [120, -20, 20, 5, 5, 20, -20, 120],
  ];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) w[r * N + c] = v[r][c];
  return w;
})();

export const CORNERS = [0, N - 1, N * (N - 1), N * N - 1];
