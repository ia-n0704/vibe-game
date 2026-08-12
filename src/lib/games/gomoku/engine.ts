// 오목(Gomoku) 엔진. 15×15, 가로/세로/대각 5목 먼저 만들면 승리.
// 수 = 빈 칸 인덱스(숫자). 주의: 칸 0도 유효한 수 → 빈 수는 항상 null 로 표현.
import { Player, GameStatus, other } from "../types";

export type Cell = 0 | 1 | 2;
export type GoState = Cell[];
export type GoMove = number; // 0..N*N-1
export const N = 15;
export const WIN = 5;

export const rc = (i: number): [number, number] => [Math.floor(i / N), i % N];
export const idx = (r: number, c: number) => r * N + c;
const inB = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function initial(): GoState {
  return new Array(N * N).fill(0);
}

export function applyMove(b: GoState, p: Player, i: GoMove): GoState {
  const nb = b.slice();
  nb[i] = p;
  return nb;
}

// 돌 주변(거리 2 이내) 빈 칸을 후보로. 분기 수를 줄여 빠르게.
export function legalMoves(b: GoState): GoMove[] {
  let any = false;
  const cand = new Set<number>();
  for (let i = 0; i < b.length; i++) {
    if (b[i] === 0) continue;
    any = true;
    const [r, c] = rc(i);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc) && b[idx(nr, nc)] === 0) cand.add(idx(nr, nc));
      }
  }
  if (!any) return [idx((N / 2) | 0, (N / 2) | 0)]; // 첫 수는 중앙
  return [...cand];
}

export const hasMove = (b: GoState): boolean => b.some((c) => c === 0);

// 한 방향 연속 길이(셀 i에 p가 있다고 보고 dr,dc 양방향) + 열린 끝 수
export function lineInfo(b: GoState, i: number, p: Player, dr: number, dc: number): { len: number; open: number } {
  const [r0, c0] = rc(i);
  let len = 1, open = 0;
  for (const sgn of [1, -1]) {
    let r = r0 + dr * sgn, c = c0 + dc * sgn;
    while (inB(r, c) && b[idx(r, c)] === p) { len++; r += dr * sgn; c += dc * sgn; }
    if (inB(r, c) && b[idx(r, c)] === 0) open++;
  }
  return { len, open };
}

// 셀 i에 p가 두었을 때 가장 강한 라인 길이(승리 판정용)
export function maxLineAt(b: GoState, i: number, p: Player): number {
  let m = 1;
  for (const [dr, dc] of DIRS) m = Math.max(m, lineInfo(b, i, p, dr, dc).len);
  return m;
}

export function status(b: GoState): GameStatus {
  // 마지막에 채워진 칸들 기준으로 검사하는 대신 전체에서 5목 탐색
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (p === 0) continue;
    for (const [dr, dc] of DIRS) {
      const [r0, c0] = rc(i);
      const pr = r0 - dr, pc = c0 - dc;
      if (inB(pr, pc) && b[idx(pr, pc)] === p) continue; // 라인 시작점만 검사
      let len = 0, r = r0, c = c0;
      while (inB(r, c) && b[idx(r, c)] === p) { len++; r += dr; c += dc; }
      if (len >= WIN) return { over: true, winner: p as Player };
    }
  }
  if (!hasMove(b)) return { over: true, winner: 0 };
  return { over: false, winner: null };
}

// 표시용 점수 = 각자 가장 긴 연속 줄 길이(기세 표시)
export function score(b: GoState): { p1: number; p2: number } {
  let m1 = 0, m2 = 0;
  for (let i = 0; i < b.length; i++) {
    const p = b[i];
    if (p === 0) continue;
    const m = maxLineAt(b, i, p as Player);
    if (p === 1) m1 = Math.max(m1, m);
    else m2 = Math.max(m2, m);
  }
  return { p1: m1, p2: m2 };
}

// 패턴 점수: 셀 i에 p가 두면 얼마나 강한가(공격) — 4방향 종합
export function placeScore(b: GoState, i: number, p: Player): number {
  let s = 0;
  for (const [dr, dc] of DIRS) {
    const { len, open } = lineInfo(b, i, p, dr, dc);
    if (len >= WIN) s += 1_000_000;
    else if (len === 4) s += open >= 2 ? 50_000 : open === 1 ? 1_200 : 0;
    else if (len === 3) s += open >= 2 ? 1_000 : open === 1 ? 120 : 0;
    else if (len === 2) s += open >= 2 ? 100 : open === 1 ? 15 : 0;
    else s += open >= 2 ? 8 : 2;
  }
  return s;
}

export { other };
