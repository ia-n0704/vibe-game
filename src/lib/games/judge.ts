// 채점 서비스 — 제출 봇을 게임의 예시 AI들과 공식 대국시켜 판정/전적/레이팅을 산출.
import { GameModule, Bot, SampleBot } from "./types";
import { estimateWinrate, simulate, Match } from "./sim";
import { winrateToRating, tierOf } from "@/lib/leaderboard";

export type Verdict = "AC" | "CE" | "TLE" | "RE";

export const VERDICT_LABEL: Record<Verdict, string> = {
  AC: "정상 (Accepted)",
  CE: "컴파일 에러",
  TLE: "시간 초과",
  RE: "런타임 에러",
};

export interface OppResult {
  id: string;
  name: string;
  desc: string;
  wins: number;
  draws: number;
  losses: number;
  winrate: number;
}

export interface JudgeReport<S, M> {
  verdict: Verdict;
  perOpp: OppResult[];
  wins: number;
  draws: number;
  losses: number;
  total: number;
  winrate: number;
  rating: number;
  tierName: string;
  featured: { opponentName: string; match: Match<S, M> };
  gamesPerOpp: number;
}

// 약→강 순으로 정렬된 로스터에서 n개를 고르게 추출(빠른 인라인 채점용)
export function representative<S, M>(game: GameModule<S, M>, n: number): SampleBot<S, M>[] {
  const all = game.sampleBots;
  if (all.length <= n) return all;
  const picked: SampleBot<S, M>[] = [];
  for (let i = 0; i < n; i++) picked.push(all[Math.round((i * (all.length - 1)) / (n - 1))]);
  return picked;
}

export function judge<S, M>(
  game: GameModule<S, M>,
  bot: Bot<S, M>,
  gamesPerOpp = 8,
  opponents: SampleBot<S, M>[] = game.sampleBots
): JudgeReport<S, M> {
  const perOpp: OppResult[] = opponents.map((opp) => {
    const r = estimateWinrate(game, bot, opp.bot, gamesPerOpp);
    return {
      id: opp.id,
      name: opp.name,
      desc: opp.desc,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      winrate: r.winrate,
    };
  });

  const wins = perOpp.reduce((a, b) => a + b.wins, 0);
  const draws = perOpp.reduce((a, b) => a + b.draws, 0);
  const losses = perOpp.reduce((a, b) => a + b.losses, 0);
  const total = wins + draws + losses;
  const winrate = total ? wins / total : 0;
  const rating = winrateToRating(winrate);

  // 가장 까다로운 상대(승률 최저)와의 한 판을 대표 리플레이로
  const hardest = [...perOpp].sort((a, b) => a.winrate - b.winrate || b.losses - a.losses)[0];
  const hardestBot = opponents.find((b) => b.id === hardest.id)!;
  const match = simulate(game, bot, hardestBot.bot, 1);

  return {
    verdict: "AC",
    perOpp,
    wins,
    draws,
    losses,
    total,
    winrate,
    rating,
    tierName: tierOf(rating).name,
    featured: { opponentName: hardestBot.name, match },
    gamesPerOpp,
  };
}
