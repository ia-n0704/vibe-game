// 게임별 미니멀 기하 글리프 (currentColor). 이모지 게임 아이콘 대체용.
import type { CSSProperties } from "react";

interface Props { id: string; size?: number; className?: string; style?: CSSProperties }

export function GameGlyph({ id, size = 22, className, style }: Props) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", className, style, "aria-hidden": true as const };
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (id === "reversi") {
    // 보드 위의 돌 + 뒤집힘(반쪽 채움)
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" {...stroke} />
        <path d="M12 5.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
        <circle cx="12" cy="12" r="6.5" {...stroke} strokeWidth={1.1} opacity={0.5} />
      </svg>
    );
  }

  if (id === "baduk") {
    // 바둑판 격자 + 흑백 돌(따냄)
    return (
      <svg {...common}>
        <path d="M5 5h14 M5 12h14 M5 19h14 M5 5v14 M12 5v14 M19 5v14" {...stroke} strokeWidth={1} opacity={0.45} />
        <circle cx="5" cy="5" r="2.1" fill="currentColor" />
        <circle cx="12" cy="12" r="2.1" {...stroke} strokeWidth={1.4} />
        <circle cx="19" cy="19" r="2.1" fill="currentColor" />
      </svg>
    );
  }

  if (id === "quoridor") {
    // 격자 + 벽 + 말
    return (
      <svg {...common}>
        <path d="M4 9h16 M4 15h16 M9 4v16 M15 4v16" {...stroke} strokeWidth={1.1} opacity={0.55} />
        <path d="M12 9v6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="6.5" cy="6.5" r="1.7" fill="currentColor" />
      </svg>
    );
  }

  // gomoku (오목): 격자 + 대각으로 이어진 다섯 돌
  return (
    <svg {...common}>
      <path d="M5 5h14 M5 12h14 M5 19h14 M5 5v14 M12 5v14 M19 5v14" {...stroke} strokeWidth={1} opacity={0.45} />
      <circle cx="5" cy="19" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="5" r="1.7" fill="currentColor" />
    </svg>
  );
}
