"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGame } from "@/lib/games/registry";
import { compileBot } from "@/lib/games/compile";
import { judge, JudgeReport, VERDICT_LABEL } from "@/lib/games/judge";
import { ReplayViewer } from "@/components/ReplayViewer";
import { CodeEditor, Lang } from "@/components/CodeEditor";
import { Icon } from "@/components/Icon";
import { saveSubmission, saveDraft, loadDraft, saveBot, listSavedBots, SavedBot } from "@/lib/store";
import { tierOf } from "@/lib/leaderboard";
import { toast } from "@/lib/toast";

const LANGS: { id: Lang; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
];

interface Msg { role: "user" | "ai" | "system"; text: string; }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// LLM 미연동 시 쓰는 범용 폴백 봇(JS). 한 수 앞 점수가 가장 좋은 수를 고른다.
const FALLBACK_BOT = `(state, player, helpers) => {
  const moves = helpers.legalMoves(state, player);
  if (!moves.length) return null;
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const ns = helpers.applyMove(state, player, m);
    const sc = helpers.score(ns);
    const v = player === 1 ? sc.p1 - sc.p2 : sc.p2 - sc.p1;
    if (v > bestScore) { bestScore = v; best = m; }
  }
  return best;
}`;

export function EditorPanel() {
  const { game: gameId } = useParams<{ game: string }>();
  const game = useMemo(() => getGame(gameId), [gameId]);
  const intro = `안녕하세요! ${game.name} 봇 코드를 직접 작성하는 AI입니다. 전략을 자연어로 알려주면 코드를 작성/수정해 드려요. 코드는 직접 편집할 수도 있습니다.`;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([{ role: "ai", text: intro }]);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [lang, setLang] = useState<Lang>("javascript");
  const [report, setReport] = useState<JudgeReport<unknown, unknown> | null>(null);
  const [submitted, setSubmitted] = useState<null | { rating: number; tier: string }>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [savedBots, setSavedBots] = useState<SavedBot[]>([]);
  const [saveName, setSaveName] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const hydratedFor = useRef<string | null>(null);

  // 진입/전환 시 드래프트·저장목록 로드
  useEffect(() => {
    const d = loadDraft(game.id);
    if (d) {
      // 과거 시스템 알림 메시지는 이제 토스트로 대체됐으므로 채팅에서 제외
      const msgs = (d.messages ?? []).filter((m) => m.role !== "system");
      setMessages(msgs.length ? msgs : [{ role: "ai", text: intro }]);
      setIntent(d.intent ?? null);
      setCode(d.code ?? "");
      setLang(d.lang ?? "javascript");
      setReport((d.report as JudgeReport<unknown, unknown> | null) ?? null);
      setLastPrompt(d.lastPrompt ?? "");
      setSubmitted(d.submitted ?? null);
    } else {
      setMessages([{ role: "ai", text: intro }]);
      setIntent(null); setCode(""); setLang("javascript"); setReport(null); setLastPrompt(""); setSubmitted(null);
    }
    setInput(""); setSaveName("");
    setSavedBots(listSavedBots(game.id));
    hydratedFor.current = game.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  useEffect(() => {
    if (hydratedFor.current !== game.id) return;
    saveDraft(game.id, { messages, intent, code, lang, report, lastPrompt, submitted });
  }, [game, messages, intent, code, lang, report, lastPrompt, submitted]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  // 주어진 JS 코드를 컴파일·채점하고 리포트 갱신. 결과/경고는 토스트로.
  async function judgeCode(codeStr: string): Promise<JudgeReport<unknown, unknown>> {
    const compiled = compileBot(game, codeStr);
    if (!compiled.ok) toast("코드 컴파일 경고 — 무효 수는 합법수로 자동 보정됩니다.", "error");
    const quickOpps = game.sampleBots.slice(0, 6); // 가벼운 대표 AI들로 빠르게
    const rep = await new Promise<JudgeReport<unknown, unknown>>((resolve) =>
      setTimeout(() => resolve(judge(game, compiled.bot, 4, quickOpps) as JudgeReport<unknown, unknown>), 30)
    );
    setReport(rep);
    toast(`채점 완료 · ${rep.total}전 ${rep.wins}승 ${rep.draws}무 ${rep.losses}패 (승률 ${Math.round(rep.winrate * 100)}%)`, "success");
    return rep;
  }

  const isJs = lang === "javascript";

  // 채팅: LLM에게 코드 작성/수정 요청
  async function send(promptText: string) {
    const prompt = promptText.trim();
    if (!prompt || busy) return;
    setInput("");
    setSubmitted(null);
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setBusy(true);

    let newCode: string;
    let newLang: Lang = lang;
    let chosenIntent: string;
    let chosenReason = "";
    let sourceLabel = "";
    try {
      const resp = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: game.name,
          objective: game.problem.objective,
          rules: game.rules,
          codegenSpec: game.codegenSpec,
          prompt,
          currentCode: code.trim() || undefined,
          language: lang,
        }),
      });
      const data = await resp.json();
      if (!data?.ok || !data.code) throw new Error(data?.error || "LLM 응답 실패");
      newCode = data.code;
      chosenIntent = data.intent;
      chosenReason = data.reasoning || "";
      sourceLabel = `via ${data.provider || "LLM"} · ${data.model}`;
    } catch (err) {
      newCode = FALLBACK_BOT;
      newLang = "javascript"; // 폴백 봇은 JS
      chosenIntent = game.parsePrompt(prompt).intent;
      chosenReason = "LLM이 응답하지 않아 범용 폴백 봇(JavaScript)을 넣었습니다. 직접 편집하거나 다시 시도하세요.";
      sourceLabel = "via 로컬 폴백";
      toast(`LLM 연동 실패: ${(err as Error).message}`, "error");
    }

    setCode(newCode);
    setLang(newLang);
    setIntent(chosenIntent);
    setMessages((m) => [...m, { role: "ai", text: `${code.trim() ? "코드 수정" : "코드 작성"} 완료 — ${chosenIntent}.${chosenReason ? `\n${chosenReason}` : ""}\n\n_${sourceLabel}_` }]);
    setLastPrompt(prompt);

    if (newLang === "javascript") {
      await judgeCode(newCode);
    } else {
      setReport(null);
      toast(`${LANGS.find((l) => l.id === newLang)?.label} 코드는 작성·저장만 가능합니다 (즉시 채점은 JavaScript만).`, "info");
    }
    setBusy(false);
  }

  // 직접 편집한 코드로 채점
  async function applyAndJudge() {
    if (!code.trim() || busy) return;
    if (!isJs) { toast("즉시 채점은 JavaScript 봇만 지원합니다.", "info"); return; }
    setBusy(true);
    setSubmitted(null);
    await judgeCode(code);
    setBusy(false);
  }

  function saveCurrent() {
    if (!code.trim()) return;
    const name = saveName.trim() || intent || `${game.name} 봇`;
    saveBot({ gameId: game.id, name, code, lang, intent: intent || name, rating: report?.rating, winrate: report?.winrate });
    setSavedBots(listSavedBots(game.id));
    setSaveName("");
    toast(`저장됨 · "${name}"`, "success");
  }

  function loadBot(id: string) {
    const b = savedBots.find((x) => x.id === id);
    if (!b) return;
    setCode(b.code);
    setLang(b.lang ?? "javascript");
    setIntent(b.intent);
    setReport(null);
    setSubmitted(null);
    toast(`불러옴 · "${b.name}"`, "info");
  }

  function resetAll() {
    setMessages([{ role: "ai", text: intro }]);
    setIntent(null); setCode(""); setLang("javascript"); setReport(null); setLastPrompt(""); setSubmitted(null); setInput(""); setSaveName("");
  }

  function submit() {
    if (!report || !code.trim()) return;
    const tier = tierOf(report.rating);
    saveSubmission({
      gameId: game.id, name: "내 봇 (you)", prompt: lastPrompt, intent: intent || "내 봇",
      code, lang, winrate: report.winrate, games: report.total, rating: report.rating, rd: 120, submittedAt: Date.now(),
    });
    setSubmitted({ rating: report.rating, tier: tier.name });
    toast(`래더에 제출됨 · 예상 ${report.rating} (${tier.name})`, "success");
  }

  return (
    <div className="grid h-[calc(100vh-19rem)] min-h-[580px] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* ① 채팅 */}
      <section className="panel flex min-h-0 flex-col">
        <PanelHead icon="chat" title="AI 채팅" sub="전략 지시 · 코드 수정 요청" />
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
          {busy && <div className="flex items-center gap-2 px-1 text-xs text-muted"><Dots /> AI 작업 중…</div>}
          <div ref={chatEnd} />
        </div>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {game.promptSuggestions.map((s) => (
              <button key={s} disabled={busy} onClick={() => send(s)} className="chip max-w-full truncate hover:text-foreground disabled:opacity-40" title={s}>
                {s.length > 20 ? s.slice(0, 20) + "…" : s}
              </button>
            ))}
            <button disabled={busy} onClick={resetAll} className="chip inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40" title="전체 초기화"><Icon name="trash" size={12} />초기화</button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={2}
              placeholder={code.trim() ? "예: ‘코너를 더 우선하게 고쳐줘’ (Enter)" : "전략을 자연어로… (Enter 전송)"}
              className="mono flex-1 resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none placeholder:text-muted-2 focus:border-accent/60"
            />
            <button className="btn btn-primary h-[44px]" disabled={busy} onClick={() => send(input)}>전송</button>
          </div>
        </div>
      </section>

      {/* ② 코드 에디터 */}
      <section className="panel flex min-h-0 flex-col">
        <PanelHead icon="gear" title="봇 코드 에디터" sub="직접 편집하거나 채팅으로 LLM에게 수정 요청" />
        {/* 툴바 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            title="작성 언어"
            className="h-[26px] rounded-md border border-border bg-surface-2 px-2 text-[11px] text-foreground outline-none focus:border-accent/60"
          >
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <button
            className="btn btn-primary inline-flex items-center gap-1.5 !py-1 !px-2.5 text-xs disabled:opacity-40"
            disabled={busy || !code.trim() || !isJs}
            title={isJs ? "코드를 실행해 채점" : "즉시 채점은 JavaScript만"}
            onClick={applyAndJudge}
          >
            <Icon name="play" size={13} />적용 & 채점
          </button>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={intent ? `이름(기본: ${intent.slice(0, 10)}…)` : "저장 이름"}
            className="mono h-[26px] w-28 rounded-md border border-border bg-surface-2 px-2 text-[11px] outline-none placeholder:text-muted-2 focus:border-accent/60"
          />
          <button className="btn inline-flex items-center gap-1.5 !py-1 !px-2.5 text-xs" disabled={!code.trim()} onClick={saveCurrent}>저장</button>
          <select
            value=""
            onChange={(e) => { if (e.target.value) loadBot(e.target.value); }}
            className="h-[26px] max-w-[120px] rounded-md border border-border bg-surface-2 px-2 text-[11px] text-muted outline-none focus:border-accent/60"
          >
            <option value="">불러오기 ({savedBots.length})</option>
            {savedBots.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {intent && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] text-muted">
            <span className={`mono rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] ${isJs ? "text-accent-2" : "text-warn"}`}>
              {LANGS.find((l) => l.id === lang)?.label}{isJs ? " · 실행됨" : " · 작성용"}
            </span>
            <span className="truncate">{intent}</span>
          </div>
        )}
        <CodeEditor value={code} onChange={setCode} language={lang} className="flex-1" />
      </section>

      {/* ③ 채점 & 리플레이 */}
      <section className="panel flex min-h-0 flex-col">
        <PanelHead icon="film" title="채점 & 리플레이" sub="예시 AI들과 대국한 결과" />
        <div className="flex-1 overflow-y-auto p-4">
          {!report ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
              <div className="mb-3 text-muted-2"><Icon name="film" size={34} /></div>
              코드를 작성/편집하고 <span className="mx-1 text-foreground">적용 &amp; 채점</span>을 누르면<br />여기에서 결과와 리플레이가 재생됩니다.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                <span className="text-sm font-semibold text-success">채점 결과 · {VERDICT_LABEL[report.verdict]}</span>
                <span className="mono text-xs text-muted">{report.total}전 · 승률 {Math.round(report.winrate * 100)}%</span>
              </div>
              <ReplayViewer game={game} match={report.featured.match} p1Label="내 봇" p2Label={report.featured.opponentName} />
              <div className="mt-4 panel-2 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">예시 AI별 전적</span>
                  <span className="mono text-xs text-muted">{report.wins}승 {report.draws}무 {report.losses}패</span>
                </div>
                <div className="space-y-1.5">
                  {report.perOpp.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 text-xs" title={o.desc}>
                      <span className="w-28 shrink-0 truncate text-muted">{o.name}</span>
                      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div className="bg-success" style={{ flex: o.wins }} />
                        <div className="bg-muted-2" style={{ flex: o.draws }} />
                        <div className="bg-danger" style={{ flex: o.losses }} />
                      </div>
                      <span className="mono w-16 shrink-0 text-right text-muted-2">{o.wins}-{o.draws}-{o.losses}</span>
                    </div>
                  ))}
                </div>
                {submitted ? (
                  <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                    <div className="font-semibold text-success">래더 제출 완료</div>
                    <div className="mt-1 text-muted">예상 레이팅 <span className="mono text-foreground">{submitted.rating}</span> · {submitted.tier}</div>
                    <Link href={`/problems/${game.id}/leaderboard`} className="btn btn-primary mt-3 w-full !py-2">리더보드에서 순위 보기 →</Link>
                  </div>
                ) : (
                  <button className="btn btn-primary mt-4 w-full !py-2.5" onClick={submit}>이 봇을 래더에 제출 (예상 {report.rating} · {report.tierName})</button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function PanelHead({ icon, title, sub, right }: { icon: string; title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"><Icon name={icon} size={16} /></span>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <div className="truncate text-xs text-muted">{sub}</div>
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function ChatBubble({ msg }: { msg: Msg }) {
  if (msg.role === "system") return <div className="mx-auto w-fit max-w-full rounded-full border border-border bg-surface-2 px-3 py-1 text-center text-[11px] text-muted">{msg.text}</div>;
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${isUser ? "rounded-br-md bg-accent text-white" : "rounded-bl-md border border-border bg-surface-2 text-foreground"}`} dangerouslySetInnerHTML={{ __html: renderInline(msg.text) }} />
    </div>
  );
}

function renderInline(t: string) {
  const esc = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em class='text-muted-2'>$1</em>").replace(/\n/g, "<br/>");
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
    </span>
  );
}
