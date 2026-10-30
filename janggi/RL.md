# 장기 — 강화학습(RL) 연결 고리

규칙은 `core.js`(결정적 · 난수 없음)에 있고 Node 에서 그대로 불러 쓸 수 있어요.
엔진(`ai.js`)은 같은 규칙 표를 쓰는 빠른 증분 판이라서 학습 상대 · 정답 비교 · 자기 대국 데이터 만들기에 씁니다.

```js
const J = require('./janggi/core.js');    // 규칙
const AI = require('./janggi/ai.js');     // 우리 엔진 (초급 · 중급 · 고급)
```

## 상태 (state)

| 무엇 | 꺼내는 법 | 모양 |
|---|---|---|
| 새 판 | `J.create({ rules, setup: [초, 한] })` | `setup` 을 안 주면 상차림 단계부터 (한이 먼저 `h=0..3`, 그다음 초 `c=0..3`) |
| 문제 판 | `J.create({ fen: '3k5/8R/9/9/9/9/9/9/4K4/R8 c', rules })` | 위(한 끝줄)부터 `/`, 숫자 = 빈칸, 대문자 초 · 소문자 한 (K궁 A사 E상 H마 R차 C포 P졸), 끝 `c`/`h` = 둘 차례 |
| 대국 전체 | `J.toJSON(s)` → `{ rules, moves }` / `J.fromJSON(j)` | 수 목록만으로 같은 국면 세 번 판정까지 다시 만듦 |
| 지금 국면 | `J.view(s)` | `{ board[90], turn, phase, setup, check, bik, passes, plies, over, winner, reason, score, fen }` |
| 끝 | `s.over` · `s.winner` (0 초 · 1 한 · null 무) · `s.reason` | `mate`(외통) · `resign` · `bikjang` · `repeat`(같은 국면 세 번) · `pass2`(서로 한수 쉼) · `limit`(수 제한) |
| 점수 | `J.score(s)` → `{ cho, han }` | 차13 포7 마5 상3 사3 졸2, 한은 덤 1.5 (처음 72 : 73.5) — 외통 · 기권이 아닌 끝은 이 점수로 승패 |

규칙 고르기 `rules = { bik: 'points'|'draw'|'off', pass: true|false, limit: 150|200|300 }` (`J.normRules` 가 기본값을 채움).

## 행동 (action)

```js
const L = J.legal(s);            // [{ uci:'7978', from, to, piece, captured }, …, { uci:'pass', pass:true }]  (상차림 단계면 [{ uci:'h=0', setup:0 }, …])
const ev = J.step(s, L[0].uci);  // 사건 목록: setup · start · move · check · bikjang · end  (첫 사건이 illegal 이면 아무것도 안 바뀜)
J.undo(s, 1);                    // 무르기
J.fastClone(s);                  // 탐색 · MCTS 용 빠른 복사
```

- 수 글자: 출발 두 자리 + 도착 두 자리, 한국 기보처럼 앞 숫자 = 위에서 몇째 줄(10째 줄은 `0`), 뒤 숫자 = 왼쪽에서 몇째 칸 (초 쪽에서 본 판). `79졸78` 의 `7978`.
- 보상 예: 끝났을 때 `winner === 나` → +1, 상대 → −1, 무승부 → 0. 점수로 끝나는 판이 많으니(빅장 · 반복 · 수 제한) 중간 보상 없이도 학습 신호가 꽤 촘촘해요.
- 장기는 스테일메이트가 없어요: 둘 곳이 없고 장군도 아니면 `pass` 만 남음 (규칙 `pass:false` 여도).

## 신경망 입력 — `J.obs(s)` → `Float32Array(18 × 90)`

늘 **지금 둘 쪽이 아래**에 오게 돌려서(한 차례면 판을 180° 돌림) 같은 망이 양쪽을 둠. 칸 번호 = 줄 × 9 + 칸.

| 장 | 뜻 |
|---|---|
| 0–6 | 내 궁 · 사 · 상 · 마 · 차 · 포 · 졸 (있으면 1) |
| 7–13 | 상대 궁 · 사 · 상 · 마 · 차 · 포 · 졸 |
| 14 | 빅장이 걸려 있음 (이번에 안 풀면 끝) |
| 15 | 한수 쉼 연속 횟수 / 2 |
| 16 | 지금 국면이 나온 횟수 (0 · 0.5 · 1) |
| 17 | 수 진행 / 수 제한 |

## 정책 출력 — `J.moveIndex(uci, 차례)` → `0 … 8104`

- `0–8099`: 출발 칸(90) × 도착 칸(90), 둘 쪽 기준으로 돌린 칸 번호
- `8100`: 한수 쉼 · `8101–8104`: 상차림 마상마상 · 상마상마 · 마상상마 · 상마마상
- `J.legalMask(s)` → `Uint8Array(8105)` (둘 수 있는 것만 1) — 소프트맥스 전에 가리기용.
  `test/selftest.js` 가 겹침 없음 · 가림 개수 = 합법 수 개수인지 확인해요.

## 상대 · 선생님으로 엔진 쓰기

```js
AI.think({ rules, moves }, { tier: 'easy' | 'normal' | 'hard', seed: 1 })   // → { move, score(점수×100, 둘 쪽 기준), mate, depth, nodes, pv }
AI.think(game, { tier: 'hard', nodes: 60000, timeMs: 1e9 })                // 노드 예산만 → 같은 입력이면 늘 같은 결과 (결정적)
AI.explain(game, uci, res)                                                 // { kind: 'free'|'evade'|'check'|'escape'|…, text } 한 줄 까닭
AI.perft(game, depth)                                                      // 수 생성 검사 (처음 판 31 · 961 · 30353 · 958264)
```

- `score` 를 가치 목표로 쓸 때는 `tanh(score / 800)` 정도로 줄이면 돼요. `|score| > 15000` 은 '점수로 끝나는 판'(빅장 · 반복 · 서로 쉼)을 읽은 값, `mate` 는 외통.
- 초급은 깊이 1 + 흔들기(+15% 아무 수), 중급은 깊이 2 + 작은 흔들기, 고급은 반복 심화(1.2초 · 보통 깊이 7~9).
- 시험 결과(10판씩): 🐯 고급 10:0 🐱 중급 · 🐱 중급 10:0 🐣 초급 · 🐯 고급 10:0 🐣 초급.

## 다음 단계 아이디어

1. Node 일꾼 스레드에서 `hard`(노드 예산) 끼리 자기 대국 → (obs, 엔진 최선 수 one-hot, 결과) 모으기 — 상차림 16가지로 시작 국면이 저절로 다양해져요
2. 작은 잔차망(6블록 × 64채널, 입력 18×10×9)을 지도 학습 → `evaluate` 대신 망 값을 정지 탐색 끝에서 쓰기
3. MCTS(PUCT) + 망으로 바꿔 자기 대국, `test/selftest.js` 의 AI 끼리 대국으로 고급과 견주기
