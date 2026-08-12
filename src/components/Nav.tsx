"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_GAME } from "@/lib/games/meta";

const LINKS = [
  { href: "/problems", label: "문제" },
];

export function Nav() {
  const path = usePathname();
  const currentGame = path.split("/")[2]; // /problems/<game>/...

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-5 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#6a47ff] text-sm font-black text-white shadow-[0_6px_18px_-6px_rgba(124,92,255,0.8)]">V</span>
          <span className="text-[15px] font-bold tracking-tight">Vibe<span className="text-muted">Game</span></span>
          <span className="mono hidden rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-2 sm:inline">v0.3</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="chip hidden md:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-success" />래더 가동중</span>
          <Link href={`/problems/${currentGame ?? DEFAULT_GAME}/code`} className="btn btn-primary !py-1.5 !px-3.5 text-[13px]">봇 만들기</Link>
        </div>
      </div>
    </header>
  );
}
