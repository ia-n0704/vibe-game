// 게임별 리더보드 목 데이터 + 티어 + 사용자 제출 결과 병합.
export interface LadderEntry {
  rank: number;
  name: string;
  rating: number;
  rd: number;
  games: number;
  winrate: number;
  you?: boolean;
}

export interface Tier {
  name: string;
  min: number;
  color: string;
}

export const TIERS: Tier[] = [
  { name: "챌린저", min: 2200, color: "#f5d76e" },
  { name: "마스터", min: 2000, color: "#c084fc" },
  { name: "다이아", min: 1800, color: "#67e8f9" },
  { name: "플래티넘", min: 1600, color: "#34d399" },
  { name: "골드", min: 1400, color: "#fbbf24" },
  { name: "실버", min: 1200, color: "#cbd5e1" },
  { name: "브론즈", min: 0, color: "#b08d57" },
];

export function tierOf(rating: number): Tier {
  return TIERS.find((t) => rating >= t.min) ?? TIERS[TIERS.length - 1];
}

type Base = Omit<LadderEntry, "rank">;

const LADDERS: Record<string, Base[]> = {
  gomoku: [
    { name: "five_sniper", rating: 2301, rd: 41, games: 356, winrate: 0.72 },
    { name: "오목신", rating: 2199, rd: 50, games: 280, winrate: 0.68 },
    { name: "double_threat", rating: 2098, rd: 58, games: 210, winrate: 0.64 },
    { name: "지우_strategist", rating: 1985, rd: 57, games: 174, winrate: 0.61 },
    { name: "open_three", rating: 1908, rd: 72, games: 138, winrate: 0.59 },
    { name: "현수.dev", rating: 1846, rd: 65, games: 151, winrate: 0.56 },
    { name: "wall_maker", rating: 1771, rd: 80, games: 96, winrate: 0.54 },
    { name: "민지pick", rating: 1690, rd: 88, games: 73, winrate: 0.5 },
    { name: "rush_liner", rating: 1519, rd: 96, games: 52, winrate: 0.44 },
    { name: "random_stone", rating: 1284, rd: 161, games: 13, winrate: 0.31 },
  ],
  reversi: [
    { name: "corner_king", rating: 2312, rd: 40, games: 402, winrate: 0.73 },
    { name: "오델로장인", rating: 2188, rd: 49, games: 276, winrate: 0.67 },
    { name: "mobility_master", rating: 2071, rd: 57, games: 233, winrate: 0.63 },
    { name: "edge_lord", rating: 1955, rd: 62, games: 188, winrate: 0.6 },
    { name: "flip_god", rating: 1877, rd: 70, games: 141, winrate: 0.57 },
    { name: "코너헌터", rating: 1809, rd: 68, games: 160, winrate: 0.55 },
    { name: "x_square_avoider", rating: 1731, rd: 82, games: 90, winrate: 0.52 },
    { name: "민지pick", rating: 1655, rd: 90, games: 64, winrate: 0.49 },
    { name: "greedy_flipper", rating: 1498, rd: 99, games: 48, winrate: 0.42 },
    { name: "random_othello", rating: 1264, rd: 165, games: 12, winrate: 0.3 },
  ],
  quoridor: [
    { name: "wall_architect", rating: 2256, rd: 44, games: 290, winrate: 0.7 },
    { name: "미로설계자", rating: 2154, rd: 53, games: 238, winrate: 0.66 },
    { name: "rush_hour", rating: 2042, rd: 59, games: 199, winrate: 0.62 },
    { name: "path_finder", rating: 1933, rd: 64, games: 165, winrate: 0.59 },
    { name: "벽돌장인", rating: 1861, rd: 71, games: 128, winrate: 0.56 },
    { name: "지우_maze", rating: 1788, rd: 69, games: 144, winrate: 0.54 },
    { name: "sprinter", rating: 1709, rd: 85, games: 83, winrate: 0.51 },
    { name: "민지pick", rating: 1632, rd: 92, games: 58, winrate: 0.48 },
    { name: "blocker_novice", rating: 1477, rd: 102, games: 41, winrate: 0.41 },
    { name: "lost_walker", rating: 1241, rd: 168, games: 11, winrate: 0.29 },
  ],
  baduk: [
    { name: "atari_king", rating: 2278, rd: 43, games: 312, winrate: 0.71 },
    { name: "따냄장인", rating: 2176, rd: 51, games: 256, winrate: 0.67 },
    { name: "liberty_hunter", rating: 2069, rd: 58, games: 207, winrate: 0.63 },
    { name: "지우_baduk", rating: 1962, rd: 62, games: 171, winrate: 0.6 },
    { name: "shape_master", rating: 1884, rd: 70, games: 134, winrate: 0.57 },
    { name: "현수.go", rating: 1812, rd: 67, games: 149, winrate: 0.55 },
    { name: "net_setter", rating: 1738, rd: 83, games: 88, winrate: 0.52 },
    { name: "민지pick", rating: 1659, rd: 90, games: 62, winrate: 0.49 },
    { name: "self_atari", rating: 1503, rd: 99, games: 47, winrate: 0.42 },
    { name: "random_stone", rating: 1269, rd: 164, games: 12, winrate: 0.3 },
  ],
};

export function buildLadder(
  gameId: string,
  you?: { name: string; rating: number; rd: number; games: number; winrate: number }
): LadderEntry[] {
  const base = (LADDERS[gameId] ?? LADDERS.gomoku).map((e) => ({ ...e }));
  const list: (Base & { you?: boolean })[] = [...base];
  if (you) list.push({ ...you, you: true });
  list.sort((a, b) => b.rating - a.rating);
  return list.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function winrateToRating(winrate: number): number {
  return Math.round(1500 + (winrate - 0.5) * 1400);
}
