// 아주 가벼운 토스트 알림 — window 커스텀 이벤트로 발행, <Toaster/>가 수신.
export type ToastType = "success" | "error" | "info";

export interface ToastDetail {
  id: number;
  message: string;
  type: ToastType;
}

export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  const detail: ToastDetail = { id: Date.now() + Math.random(), message, type };
  window.dispatchEvent(new CustomEvent<ToastDetail>("vibe-toast", { detail }));
}
