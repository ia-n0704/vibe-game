// 클라이언트 페이지에서 쓰는 게임 모듈 레지스트리(보드 렌더러 포함).
import { AnyGame } from "./types";
import { gomokuGame } from "./gomoku";
import { reversiGame } from "./reversi";
import { quoridorGame } from "./quoridor";
import { badukGame } from "./baduk";

export const GAMES: AnyGame[] = [gomokuGame, reversiGame, quoridorGame, badukGame];

export const getGame = (id?: string): AnyGame =>
  GAMES.find((g) => g.id === id) ?? GAMES[0];
