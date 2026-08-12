// 프로토타입용 클라이언트 저장소 — 게임별로 제출 결과를 보관(localStorage).
import { Weights } from "./games/types";

export type Lang = "javascript" | "python" | "cpp";

export interface Submission {
  gameId: string;
  name: string;
  prompt: string;
  intent: string;
  code?: string; // LLM이 작성한 JS 봇 (있으면 우선)
  lang?: Lang;
  weights?: Weights; // 로컬 폴백 봇용
  winrate: number;
  games: number;
  rating: number;
  rd: number;
  submittedAt: number;
}

const key = (gameId: string) => `vibe-game:submission:${gameId}`;

// ── 코드 작성 탭 드래프트(탭 이동/새로고침에도 유지) ──────────
// 직렬화 가능한 값만 저장(메시지/코드/의도/채점결과/제출후보 등).
export interface EditorDraft {
  messages: { role: "user" | "ai" | "system"; text: string }[];
  intent: string | null;
  code: string;
  lang?: Lang;
  report: unknown | null; // JudgeReport (직렬화 가능)
  lastPrompt: string;
  submitted: { rating: number; tier: string } | null;
}

const draftKey = (gameId: string) => `vibe-game:draft:${gameId}`;

export function saveDraft(gameId: string, d: EditorDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(gameId), JSON.stringify(d));
  } catch {
    /* 용량 초과 등은 무시 */
  }
}

export function loadDraft(gameId: string): EditorDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(draftKey(gameId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorDraft;
  } catch {
    return null;
  }
}

export function saveSubmission(s: Submission) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(s.gameId), JSON.stringify(s));
}

export function loadSubmission(gameId: string): Submission | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(gameId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Submission;
  } catch {
    return null;
  }
}

// ── 저장한 봇 라이브러리 (게임별, 여러 개) ────────────────────
export interface SavedBot {
  id: string;
  gameId: string;
  name: string;
  code: string;
  lang?: Lang; // 기본 javascript (실행 가능). 그 외는 작성/표시용.
  intent: string;
  rating?: number;
  winrate?: number;
  createdAt: number;
}

const botsKey = (gameId: string) => `vibe-game:bots:${gameId}`;

export function listSavedBots(gameId: string): SavedBot[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(botsKey(gameId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as SavedBot[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// id가 있으면 갱신, 없으면 새로 추가. 저장된 봇을 반환.
export function saveBot(bot: Omit<SavedBot, "id" | "createdAt"> & { id?: string }): SavedBot {
  const list = listSavedBots(bot.gameId);
  const id = bot.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry: SavedBot = { ...bot, id, createdAt: Date.now() };
  const idx = list.findIndex((b) => b.id === id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  try {
    localStorage.setItem(botsKey(bot.gameId), JSON.stringify(list.slice(0, 50)));
  } catch {
    /* 용량 초과 무시 */
  }
  return entry;
}

export function deleteSavedBot(gameId: string, id: string) {
  if (typeof window === "undefined") return;
  const list = listSavedBots(gameId).filter((b) => b.id !== id);
  localStorage.setItem(botsKey(gameId), JSON.stringify(list));
}
