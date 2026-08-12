// 미니멀 라인 아이콘 세트 (currentColor 기반). 이모지 대체용.
import type { CSSProperties } from "react";

const PATHS: Record<string, string> = {
  doc: "M14 3v4a1 1 0 0 0 1 1h4 M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z M9.5 13h5 M9.5 16.5h5",
  chat: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  flask: "M9.5 3h5 M10.5 3v5.5L5.6 17a1.8 1.8 0 0 0 1.6 2.8h9.6A1.8 1.8 0 0 0 18.4 17l-4.9-8.5V3 M8.3 14h7.4",
  chart: "M4 20h16 M7 20v-6 M12 20V8 M17 20v-9",
  pad: "M9 9h6 M7 13H5 M6 12v2 M16.5 12.5h.01 M18 14h.01 M8 9a4 4 0 0 0-4 4 4 4 0 0 0 4 4h8a4 4 0 0 0 4-4 4 4 0 0 0-4-4z",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0z M7 5H4v1a3 3 0 0 0 3 3 M17 5h3v1a3 3 0 0 1-3 3 M9.5 20h5 M12 13.5V16 M9 20l.6-4h4.8l.6 4z",
  gear: "M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z M12 3.5v2.3 M12 18.2v2.3 M5.5 5.5l1.6 1.6 M16.9 16.9l1.6 1.6 M3.5 12h2.3 M18.2 12h2.3 M5.5 18.5l1.6-1.6 M16.9 7.1l1.6-1.6",
  film: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M10.5 8.5l5 3.5-5 3.5z",
  send: "M21 3L10.5 13.5 M21 3l-6.5 18-4-8.5-8.5-4z",
  play: "M8 5.5v13l11-6.5z",
  pause: "M9.5 5.5v13 M15 5.5v13",
  prev: "M15 6l-6 6 6 6",
  next: "M9 6l6 6-6 6",
  start: "M6.5 5.5v13 M19 5.5l-10 6.5 10 6.5z",
  refresh: "M20 11.5a8 8 0 1 0-1.6 5.6 M20 18.5v-5h-5",
  trash: "M4 7h16 M9.5 7V4.8h5V7 M6.5 7l.9 13h9.2l.9-13 M10 11v6 M14 11v6",
  flag: "M6 21V4 M6 4h11l-2.2 4L17 12H6",
  sparkle: "M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z",
  bolt: "M13 3L5 13h6l-1 8 8-10h-6z",
};

interface Props {
  name: keyof typeof PATHS | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.6, className, style }: Props) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : "M" + seg} />
      ))}
    </svg>
  );
}
