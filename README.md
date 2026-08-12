# Vibe Game

**프롬프트로 만드는 경쟁형 게임 AI 플랫폼** — 코딩을 몰라도, 전략만 있으면 누구나 게임 AI로 경쟁한다.

손으로 게임을 해보고, AI에게 자연어로 전략을 지시하면, 그 AI가 코드를 만들어 다른 AI와 대결해 순위가 매겨집니다. 진짜 경쟁의 대상은 코딩 실력이 아니라 **게임 이해와 전략 설계**입니다.

> SW마에스트로 아이디어 프로토타입 (Next.js). AI 코드 생성·채점은 클라이언트/로컬 LLM 시뮬레이션입니다.

## 핵심 흐름

문제(게임) 선택 → **직접 대결**(손플레이) → **코드 작성**(LLM에게 전략 지시 or 직접 편집) → **채점**(예시 AI들과 자동 대국) → **벤치마크**(강한 AI 15종과 경쟁) → **리더보드**

## 수록 게임 (문제 은행)

| # | 게임 | 규칙 요약 |
|---|------|-----------|
| 1 | 오목 | 가로·세로·대각 5목을 먼저 잇기 |
| 2 | 리버시 | 상대 돌을 끼워 뒤집기, 코너 쟁탈 |
| 3 | 쿼리도 | 벽으로 길을 막고 먼저 반대편 도달 |
| 4 | 따내기 바둑 | 활로를 막아 상대 돌을 먼저 따내기 |

각 게임은 강한 샘플 AI 15종(휴리스틱 평가 + 탐색)을 갖추고 있습니다.

## 주요 기능

- **AI 코드 에디터** — 자연어로 전략을 지시하면 LLM이 봇 코드를 작성/수정. 직접 편집도 가능(문법 하이라이팅, 언어 선택 JS/Python/C++). 실행·채점은 JavaScript.
- **LLM 연동** — 서버 라우트(`/api/strategy`)가 Ollama(로컬/클라우드)로 프롬프트→봇 코드 생성. 실패 시 로컬 폴백.
- **채점·시뮬레이션·벤치마크** — 브라우저에서 봇을 컴파일해 예시 AI들과 대국, 리플레이 재생, Glicko-2 스타일 레이팅/티어.
- **저장/불러오기** — 만든 봇을 게임별로 저장해 시뮬레이션·벤치마크에서 재사용.
- 다크 개발자 톤 UI, 미니멀 라인 아이콘, 토스트 알림.

## 실행

```bash
npm install
npm run dev   # http://localhost:3100
```

LLM 코드 생성을 켜려면 [Ollama](https://ollama.com)를 설치하고 모델을 받은 뒤 `.env.local`을 설정하세요:

```bash
ollama pull qwen2.5-coder:7b
```

```env
# .env.local (커밋되지 않음)
LLM_PROVIDERS=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Ollama

## 구조

```
src/
  app/                 # 라우트: 홈, /problems/[game]/{문제,code,simulate,benchmark,versus,leaderboard}
  app/api/strategy/    # LLM 코드 생성 서버 라우트
  components/          # Nav, CodeEditor, ReplayViewer, Toaster, 패널들
  lib/games/           # 게임 추상화(GameModule) + 게임별 엔진/봇/보드 (gomoku, reversi, quoridor, baduk)
  lib/games/{sim,judge,search,compile}.ts  # 공용 시뮬레이션·채점·탐색·코드 컴파일
```
