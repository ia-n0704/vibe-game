// 서버 사이드 전략 컴파일러 — 사용자의 자연어 프롬프트를 LLM으로 해석해
// 게임 휴리스틱 가중치 + 의도 + 근거 + 제출 코드를 구조화 JSON으로 생성한다.
// provider 우선순위(LLM_PROVIDERS): ollama → gemini. 모두 실패하면 클라이언트가 로컬 파서로 폴백.
// 키/주소는 .env.local(서버 전용)에서만 읽는다.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  name: string;
  objective: string;
  rules: string[];
  codegenSpec: string;
  prompt: string;
  currentCode?: string; // 있으면 '수정 모드'
  language?: "javascript" | "python" | "cpp";
}

const PROVIDERS = (process.env.LLM_PROVIDERS || "ollama")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const LANG_LABEL: Record<string, string> = { javascript: "JavaScript", python: "Python", cpp: "C++" };

// ── 프롬프트 구성 (LLM이 직접 봇 코드를 작성) ─────────────────
// minimax 등 일부 모델이 비표준 JSON(따옴표 없는 키)을 내므로,
// JSON 대신 라벨 + 코드펜스 형식으로 받아 견고하게 파싱한다.
function buildPrompts(b: Body) {
  const lang = b.language ?? "javascript";
  const langLabel = LANG_LABEL[lang] ?? "JavaScript";

  const taskBlock =
    lang === "javascript"
      ? `당신의 임무: 사용자가 요구한 전략을 구현한 JavaScript 봇 함수를 작성합니다.
반드시 이 시그니처의 화살표 함수 하나:
(state, player, helpers) => { /* ... */ return move; }
- player: 내 번호(1 또는 2). 반환값 move는 helpers.legalMoves(state, player)가 준 항목 중 하나. 합법수가 없으면 null.
- 외부 라이브러리/전역 사용 금지. helpers와 표준 JS 문법만. 무한 루프 금지.

${b.codegenSpec}`
      : `당신의 임무: 사용자가 요구한 전략을 구현한 ${langLabel} 봇 프로그램을 작성합니다.
표준 입출력(stdin/stdout) 프로토콜로 심판과 통신하는 완전한 standalone 프로그램을 작성하세요:
- READY first|second : 선/후공 통보(OK 응답)
- TURN my_time opp_time : 내 차례 → 둘 수(좌표 등)를 한 줄로 출력
- OPP r1 c1 r2 c2 time : 상대의 직전 수
- FINISH : 종료
게임 상태/수 표현은 아래 설명을 참고하되, ${langLabel} 표준 문법만 사용하세요.

${b.codegenSpec}
(참고: 이 프로토타입의 즉시 채점은 JavaScript 봇만 실행합니다. ${langLabel} 코드는 작성·저장·제출용으로 보여집니다.)`;

  const system = `당신은 보드게임 "${b.name}"를 플레이하는 봇 코드를 작성하는 프로그래머입니다.
게임 목표: ${b.objective}
규칙:
${b.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

${taskBlock}
${
    b.currentCode
      ? `\n현재 봇 코드가 이미 있습니다. 사용자의 요구가 기존 코드를 고치는 내용이면 이 코드를 바탕으로 수정하고, 완전히 새 전략이면 새로 작성하세요. 기존 코드:\n${b.currentCode}\n`
      : ""
  }
반드시 아래 형식으로만, 다른 설명 없이 출력하세요:
INTENT: (한국어 한 줄 전략 요약)
REASONING: (사용자 요구를 코드에 어떻게 반영했는지 2~3문장 한국어)
CODE:
\`\`\`${lang}
(여기에 ${langLabel} 코드 전체)
\`\`\``;
  const user = `사용자 ${b.currentCode ? "수정/전략 요구" : "전략 요구"}: "${b.prompt}"`;
  return { system, user };
}

// ── Ollama ───────────────────────────────────────────────────
async function callOllama(system: string, user: string): Promise<{ text: string; model: string }> {
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw new Error("OLLAMA_MODEL 미설정");
  const url = (process.env.OLLAMA_URL || "http://localhost:11434") + "/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      options: { temperature: 0.6 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(120000), // 코드 작성 + 클라우드 reasoning 모델이라 오래 걸림
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text().catch(() => "")).slice(0, 120)}`);
  const d = await res.json();
  const text = d?.message?.content;
  if (!text) throw new Error("Ollama 빈 응답");
  return { text, model };
}

// ── Gemini ───────────────────────────────────────────────────
async function callGemini(system: string, user: string): Promise<{ text: string; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY 미설정");
  const models = Array.from(new Set([process.env.GEMINI_MODEL, "gemini-2.0-flash"].filter(Boolean))) as string[];
  let lastErr = "";
  for (const model of models.slice(0, 2)) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.6 },
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d?.candidates?.[0]?.content?.parts?.find?.((p: { text?: string }) => typeof p.text === "string")?.text;
        if (text) return { text, model };
        lastErr = "Gemini 빈 응답";
      } else {
        lastErr = `Gemini ${res.status}`;
        if (res.status !== 503 && res.status !== 429 && res.status !== 500) break;
      }
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  throw new Error(lastErr || "Gemini 실패");
}

// 라벨 + 코드펜스 형식을 견고하게 파싱(모델이 형식을 조금 어겨도 동작).
function parseResponse(text: string): { code: string; intent: string; reasoning: string } {
  // 1) 코드: 첫 번째 ``` 펜스 블록 내용
  let code = "";
  const fence = text.match(/```[a-zA-Z0-9+#.]*\s*\n([\s\S]*?)```/);
  if (fence) {
    code = fence[1].trim();
  } else {
    const ci = text.search(/CODE\s*:/i);
    if (ci >= 0) {
      const after = text.slice(ci).replace(/^CODE\s*:/i, "");
      code = after.replace(/```[a-zA-Z0-9+#.]*\s*/g, "").trim();
    }
  }
  // 2) intent / reasoning
  const intentM = text.match(/INTENT\s*:\s*(.+)/i);
  const reasonM = text.match(/REASONING\s*:\s*([\s\S]*?)(?:\n\s*CODE\s*:|```|$)/i);
  const intent = (intentM?.[1] || "").trim().replace(/\s+$/, "") || "전략 봇";
  const reasoning = (reasonM?.[1] || "").trim();
  if (!code) throw new Error("코드 블록을 찾지 못함");
  return { code, intent, reasoning };
}

export async function POST(req: NextRequest) {
  let b: Body;
  try {
    b = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }
  if (!b?.prompt || !b.codegenSpec) {
    return NextResponse.json({ ok: false, error: "prompt/codegenSpec 필요" }, { status: 400 });
  }

  const { system, user } = buildPrompts(b);

  // provider 순서대로 시도
  const errs: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      const r = provider === "ollama" ? await callOllama(system, user) : provider === "gemini" ? await callGemini(system, user) : null;
      if (!r) continue;

      const parsed = parseResponse(r.text);
      return NextResponse.json({
        ok: true,
        source: provider,
        provider: provider === "ollama" ? "Ollama" : "Gemini",
        model: r.model,
        language: b.language ?? "javascript",
        code: parsed.code,
        intent: parsed.intent,
        reasoning: parsed.reasoning,
      });
    } catch (e) {
      errs.push(`${provider}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: false, error: errs.join(" | ") || "사용 가능한 LLM 없음" }, { status: 200 });
}
