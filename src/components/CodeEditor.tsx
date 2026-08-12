"use client";

import { useMemo, useRef } from "react";

export type Lang = "javascript" | "python" | "cpp";

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: Lang;
  readOnly?: boolean;
  className?: string;
}

const KEYWORDS: Record<Lang, Set<string>> = {
  javascript: new Set(["const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "this", "null", "undefined", "true", "false", "typeof", "instanceof", "class", "extends", "super", "import", "export", "from", "default", "await", "async", "try", "catch", "finally", "throw", "break", "continue", "switch", "case", "do", "delete", "void", "yield"]),
  python: new Set(["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "None", "True", "False", "import", "from", "as", "class", "pass", "break", "continue", "try", "except", "finally", "with", "lambda", "yield", "global", "nonlocal", "raise", "assert", "del", "is", "print", "range", "len"]),
  cpp: new Set(["int", "long", "float", "double", "char", "bool", "void", "auto", "return", "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue", "struct", "class", "public", "private", "protected", "const", "static", "new", "delete", "true", "false", "nullptr", "include", "using", "namespace", "std", "template", "typename", "sizeof", "this", "vector", "string"]),
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code: string, lang: Lang): string {
  const kws = KEYWORDS[lang];
  const block = lang !== "python";
  const lineC = lang === "python" ? "#[^\\n]*" : "//[^\\n]*";
  const blockC = block ? "/\\*[\\s\\S]*?\\*/|" : "";
  const strPat =
    lang === "javascript"
      ? "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`"
      : "\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'";
  const re = new RegExp(`(${blockC}${lineC})|(${strPat})|(\\b\\d[\\w.]*)|([A-Za-z_$][\\w$]*)`, "g");
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(esc(code.slice(last, m.index)));
    const tok = m[0];
    if (m[1]) out.push(`<span class="tok-com">${esc(tok)}</span>`);
    else if (m[2]) out.push(`<span class="tok-str">${esc(tok)}</span>`);
    else if (m[3]) out.push(`<span class="tok-num">${esc(tok)}</span>`);
    else if (m[4]) {
      if (kws.has(tok)) out.push(`<span class="tok-kw">${esc(tok)}</span>`);
      else if (code[m.index + tok.length] === "(") out.push(`<span class="tok-fn">${esc(tok)}</span>`);
      else out.push(esc(tok));
    }
    last = m.index + tok.length;
  }
  if (last < code.length) out.push(esc(code.slice(last)));
  return out.join("") + "\n"; // 마지막 줄 정렬용 여유 개행
}

// 라인넘버 거터 + 하이라이트 오버레이 + 투명 textarea.
export function CodeEditor({ value, onChange, language = "javascript", readOnly, className }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(value.split("\n").length, 1);
  const html = useMemo(() => highlight(value, language), [value, language]);

  function sync() {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && !readOnly) {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart, en = ta.selectionEnd;
      onChange(value.slice(0, s) + "  " + value.slice(en));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  }

  const shared = "mono whitespace-pre p-3 text-[12px] leading-[1.5] [tab-size:2]";

  return (
    <div className={`relative flex min-h-0 overflow-hidden bg-[#0b0e13] ${className ?? ""}`}>
      <div
        ref={gutterRef}
        aria-hidden
        className="mono select-none overflow-hidden border-r border-border/60 bg-[#0a0c11] px-2.5 py-3 text-right text-[12px] leading-[1.5] text-muted-2"
      >
        {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <div className="relative min-w-0 flex-1">
        <pre
          ref={preRef}
          aria-hidden
          className={`${shared} pointer-events-none absolute inset-0 overflow-hidden text-[#cdd6e4]`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sync}
          onKeyDown={onKeyDown}
          wrap="off"
          className={`${shared} absolute inset-0 resize-none overflow-auto bg-transparent text-transparent caret-[#cdd6e4] outline-none placeholder:text-muted-2`}
          placeholder="// 여기에 봇 코드를 직접 작성하거나, 왼쪽 채팅에서 LLM에게 작성/수정을 요청하세요."
        />
      </div>
    </div>
  );
}
