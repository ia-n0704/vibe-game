// 서버 컴포넌트(홈/내비)에서 쓰는 순수 메타데이터. React/클라이언트 코드를 import하지 않는다.
export interface GameMeta {
  id: string;
  no: number; // 문제 번호
  name: string;
  tagline: string;
  accent: string;
  difficulty: string;
}

export const GAME_METAS: GameMeta[] = [
  { id: "gomoku", no: 1, name: "오목", tagline: "가로·세로·대각으로 다섯 개를 먼저 잇는 자가 이긴다.", accent: "#fbbf24", difficulty: "입문" },
  { id: "reversi", no: 2, name: "리버시", tagline: "한 수로 전세가 뒤집힌다. 코너를 쥐는 자가 이긴다.", accent: "#34d399", difficulty: "보통" },
  { id: "quoridor", no: 3, name: "쿼리도", tagline: "벽으로 길을 막고, 먼저 반대편에 도달하라.", accent: "#c084fc", difficulty: "어려움" },
  { id: "baduk", no: 4, name: "따내기 바둑", tagline: "활로를 막아 상대 돌을 먼저 따내는 자가 이긴다.", accent: "#fb923c", difficulty: "보통" },
];

export const DEFAULT_GAME = "gomoku";
export const metaOf = (id?: string): GameMeta => GAME_METAS.find((m) => m.id === id) ?? GAME_METAS[0];
export const problemNo = (id?: string): number => metaOf(id).no;
