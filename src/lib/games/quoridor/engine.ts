// 쿼리도(Quoridor) 엔진. 9×9. 말은 목표 행에 먼저 도달하면 승리.
// 한 수 = 말 이동 또는 벽 설치(상대 경로를 완전히 막는 벽은 불가 — BFS로 검증).
import { Player, GameStatus, other } from "../types";

export const N = 9;
export const WALLS_PER_PLAYER = 10;

export interface QState {
  p1: number; // 셀 인덱스 (플레이어1: 아래→위, 목표 행 0)
  p2: number; // (플레이어2: 위→아래, 목표 행 N-1)
  h: string[]; // 가로벽 슬롯 "r,c" (행 r과 r+1 사이, 열 c·c+1)
  v: string[]; // 세로벽 슬롯 "r,c" (열 c와 c+1 사이, 행 r·r+1)
  walls: [number, number]; // 남은 벽 [p1, p2]
}

export type QMove =
  | { kind: "move"; to: number }
  | { kind: "wall"; o: "h" | "v"; r: number; c: number };

export const rc = (i: number): [number, number] => [Math.floor(i / N), i % N];
export const idx = (r: number, c: number) => r * N + c;
const inB = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const goalRow = (p: Player) => (p === 1 ? 0 : N - 1);

export function initial(): QState {
  return { p1: idx(N - 1, 4), p2: idx(0, 4), h: [], v: [], walls: [WALLS_PER_PLAYER, WALLS_PER_PLAYER] };
}

const has = (arr: string[], r: number, c: number) => arr.includes(`${r},${c}`);

// (r,c)와 (r+1,c) 사이(세로 이동)가 가로벽으로 막혔는가
function blockedV(s: QState, r: number, c: number): boolean {
  return has(s.h, r, c) || has(s.h, r, c - 1);
}
// (r,c)와 (r,c+1) 사이(가로 이동)가 세로벽으로 막혔는가
function blockedH(s: QState, r: number, c: number): boolean {
  return has(s.v, r, c) || has(s.v, r - 1, c);
}

// 인접 두 칸 사이 이동 가능 여부(벽만 고려, 말 점유는 별도)
export function canStep(s: QState, from: number, to: number): boolean {
  const [r, c] = rc(from), [tr, tc] = rc(to);
  if (!inB(tr, tc)) return false;
  if (tr === r - 1 && tc === c) return !blockedV(s, r - 1, c); // 위
  if (tr === r + 1 && tc === c) return !blockedV(s, r, c); // 아래
  if (tr === r && tc === c - 1) return !blockedH(s, r, c - 1); // 좌
  if (tr === r && tc === c + 1) return !blockedH(s, r, c); // 우
  return false;
}

function step(from: number, dir: number): number | null {
  const [r, c] = rc(from);
  const map: Record<number, [number, number]> = { 0: [r - 1, c], 1: [r + 1, c], 2: [r, c - 1], 3: [r, c + 1] };
  const [nr, nc] = map[dir];
  return inB(nr, nc) ? idx(nr, nc) : null;
}

export function pawnMoves(s: QState, p: Player): number[] {
  const my = p === 1 ? s.p1 : s.p2;
  const opp = p === 1 ? s.p2 : s.p1;
  const out = new Set<number>();
  for (let d = 0; d < 4; d++) {
    const next = step(my, d);
    if (next == null || !canStep(s, my, next)) continue;
    if (next !== opp) { out.add(next); continue; }
    // 상대 말 건너뛰기
    const beyond = step(next, d);
    if (beyond != null && canStep(s, next, beyond)) {
      out.add(beyond); // 직진 점프
    } else {
      // 뒤가 막히면 대각 이동(상대 기준 수직 방향)
      const perps = d < 2 ? [2, 3] : [0, 1];
      for (const pd of perps) {
        const diag = step(next, pd);
        if (diag != null && canStep(s, next, diag)) out.add(diag);
      }
    }
  }
  return [...out];
}

// 목표 행까지 도달 가능한가 + 최단 거리(말 무시). 도달 불가면 Infinity.
export function bfsDist(s: QState, p: Player): number {
  const start = p === 1 ? s.p1 : s.p2;
  const goal = goalRow(p);
  const dist = new Array(N * N).fill(-1);
  const q = [start];
  dist[start] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    const [r] = rc(cur);
    if (r === goal) return dist[cur];
    for (let d = 0; d < 4; d++) {
      const nx = step(cur, d);
      if (nx != null && dist[nx] === -1 && canStep(s, cur, nx)) {
        dist[nx] = dist[cur] + 1;
        q.push(nx);
      }
    }
  }
  return Infinity;
}

function wallLegalShape(s: QState, o: "h" | "v", r: number, c: number): boolean {
  if (r < 0 || r > N - 2 || c < 0 || c > N - 2) return false;
  if (o === "h") {
    if (has(s.h, r, c) || has(s.h, r, c - 1) || has(s.h, r, c + 1)) return false; // 겹침
    if (has(s.v, r, c)) return false; // 교차
  } else {
    if (has(s.v, r, c) || has(s.v, r - 1, c) || has(s.v, r + 1, c)) return false;
    if (has(s.h, r, c)) return false;
  }
  return true;
}

function withWall(s: QState, o: "h" | "v", r: number, c: number): QState {
  const ns = { ...s, h: s.h.slice(), v: s.v.slice() };
  (o === "h" ? ns.h : ns.v).push(`${r},${c}`);
  return ns;
}

// 벽 설치 후에도 양 플레이어가 목표에 도달 가능한지
export function wallLegal(s: QState, p: Player, o: "h" | "v", r: number, c: number): boolean {
  if (s.walls[p - 1] <= 0) return false;
  if (!wallLegalShape(s, o, r, c)) return false;
  const ns = withWall(s, o, r, c);
  return bfsDist(ns, 1) !== Infinity && bfsDist(ns, 2) !== Infinity;
}

export function legalMoves(s: QState, p: Player): QMove[] {
  const moves: QMove[] = pawnMoves(s, p).map((to) => ({ kind: "move", to }));
  if (s.walls[p - 1] > 0) {
    for (let r = 0; r <= N - 2; r++)
      for (let c = 0; c <= N - 2; c++) {
        if (wallLegal(s, p, "h", r, c)) moves.push({ kind: "wall", o: "h", r, c });
        if (wallLegal(s, p, "v", r, c)) moves.push({ kind: "wall", o: "v", r, c });
      }
  }
  return moves;
}

export function applyMove(s: QState, p: Player, m: QMove): QState {
  if (m.kind === "move") {
    return p === 1 ? { ...s, p1: m.to } : { ...s, p2: m.to };
  }
  const ns = withWall(s, m.o, m.r, m.c);
  const walls: [number, number] = [s.walls[0], s.walls[1]];
  walls[p - 1] -= 1;
  ns.walls = walls;
  return ns;
}

export const hasMove = (s: QState, p: Player) => pawnMoves(s, p).length > 0 || s.walls[p - 1] > 0;

export function status(s: QState): GameStatus {
  if (rc(s.p1)[0] === 0) return { over: true, winner: 1 };
  if (rc(s.p2)[0] === N - 1) return { over: true, winner: 2 };
  return { over: false, winner: null };
}

// 표시용 점수 = 목표 근접도(클수록 우세). 무승부 판정 fallback에도 사용.
export function score(s: QState) {
  const d1 = bfsDist(s, 1), d2 = bfsDist(s, 2);
  return { p1: Math.max(0, N - (isFinite(d1) ? d1 : N)), p2: Math.max(0, N - (isFinite(d2) ? d2 : N)) };
}
