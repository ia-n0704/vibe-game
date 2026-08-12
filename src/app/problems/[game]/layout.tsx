"use client";

import { useParams } from "next/navigation";
import { ProblemTabs } from "@/components/ProblemTabs";

export default function ProblemLayout({ children }: { children: React.ReactNode }) {
  const { game } = useParams<{ game: string }>();
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8">
      <ProblemTabs gameId={game} />
      {children}
    </main>
  );
}
