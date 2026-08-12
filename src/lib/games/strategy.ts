// 프롬프트 → 가중치 파서를 게임마다 선언적으로 만들기 위한 공통 헬퍼.
import { ParsedStrategy, Weights } from "./types";

export interface Rule {
  re: RegExp;
  label: string;
  effect: string;
  apply: (w: Weights) => void;
}

export function runRules(
  prompt: string,
  base: Weights,
  rules: Rule[],
  balancedIntent: string
): ParsedStrategy {
  const weights: Weights = { ...base };
  const matched: { keyword: string; effect: string }[] = [];
  for (const rule of rules) {
    if (rule.re.test(prompt)) {
      rule.apply(weights);
      matched.push({ keyword: rule.label, effect: rule.effect });
    }
  }
  for (const k of Object.keys(weights)) {
    if (weights[k] < 0) weights[k] = 0;
  }
  const intent =
    matched.length === 0
      ? balancedIntent
      : matched.map((m) => m.keyword).join(" + ") + " 중심 전략";
  return { weights, matched, intent };
}
