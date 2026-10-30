# 체스 — 강화학습(RL) 연결 고리

게임 규칙은 `core.js`(chess.js 위, 결정적 · 난수 없음)에 있고 Node 에서 그대로 불러 쓸 수 있어요.
엔진(`ai.js`)은 따로 움직이는 자체 수 생성기라서, 학습 상대 · 정답 비교 · 자기 대국 데이터 만들기에 씁니다.

```js
const C = require('./chess/core.js');      // 규칙 (chess.js BSD-2 를 vendor/chess.js 로 감싼 것)
const AI = require('./chess/ai.js');        // 우리 엔진 (초급·중급·고급)
```

## 상태 (state)

| 무엇 | 꺼내는 법 | 모양 |
|---|---|---|
| 지금 국면 | `C.fen(s)` | FEN 문자열 (말 배치 · 차례 · 캐슬 권리 · 앙파상 칸 · 50수 셈 · 수 번호) |
| 대국 전체 | `C.toJSON(s)` → `{ start, moves }` | 시작 FEN + UCI 수 목록 (`'e2e4'`, 승진 `'e7e8q'`) — 같은 국면 세 번 판정까지 다시 만들 수 있음 |
| 한 줄 기보 | `C.encode(s)` / `C.decode(str)` | `'FEN|e2e4 e7e5|resign:b'` (시작 판이면 FEN 칸이 비어 있음) |
| 차례 · 끝 | `C.status(s)` | `{ turn: 'w'|'b', check, over, winner: 'w'|'b'|null, reason }` |

`reason`: `checkmate` · `stalemate` · `threefold` · `fifty` · `insufficient` · `resign` · `time` · `agree`

## 행동 (action)

```js
const L = C.legal(s);              // [{ uci, san, from, to, promotion, piece, captured, flags }]
const ev = C.step(s, L[0].uci);    // 사건 목록: move · check · end   (첫 사건이 illegal 이면 아무것도 안 바뀜)
C.undo(s, 1);                      // 무르기 (탐색 · MCTS 에서 되돌릴 때)
```

- 보상(reward) 예: 끝났을 때 `winner === 나` → +1, 상대 → −1, 무승부 → 0. 중간 보상은 두지 않는 게 AlphaZero 방식이에요.
- 50수 · 같은 국면 세 번 · 기물 부족은 `step` 이 알아서 끝냄 (자기 대국이 끝없이 돌지 않음).

## 신경망 입력 — AlphaZero 식 평면 (planes)

`C.planes(s)` → `Float32Array(18 × 64)`, 늘 **지금 둘 쪽이 아래**에 오게 돌려서(흑 차례면 180°) 같은 망이 양쪽을 둠.

| 장 | 뜻 |
|---|---|
| 0–5 | 내 폰 · 나이트 · 비숍 · 룩 · 퀸 · 킹 (있으면 1) |
| 6–11 | 상대 폰 · 나이트 · 비숍 · 룩 · 퀸 · 킹 |
| 12 | 같은 국면이 세 번째인가 (전체 1/0) |
| 13–14 | 내 캐슬 권리 (킹 쪽 · 퀸 쪽) |
| 15–16 | 상대 캐슬 권리 |
| 17 | 50수 셈 / 100 |

칸 번호: `줄 × 8 + 칸`, 줄 0 = 내 쪽 첫 줄, 칸 0 = 내 왼쪽(백이면 a, 흑이면 h).
AlphaZero 원래 입력(지난 8국면 × 14장 + 7장 = 119장)이 필요하면 `C.undo` 로 앞 국면을 차례로 꺼내 이 18장을 쌓으면 됩니다.

## 정책 출력 — 4672 수 번호

`C.moveIndex(uci, 차례)` → `0 … 4671` = **출발 칸(64) × 73가지**

- 0–55: 퀸처럼 8방향 × 1~7칸 (방향 순서: 위, 위오른, 오른, 아래오른, 아래, 아래왼, 왼, 위왼 — 지금 둘 쪽 기준)
- 56–63: 나이트 8가지
- 64–72: 덜 승진(나이트 · 비숍 · 룩) × (왼쪽 잡기 · 앞 · 오른쪽 잡기). 퀸 승진은 그냥 퀸 방향 수로 셈

`C.legalMask(s)` → `Uint8Array(4672)` (둘 수 있는 수만 1) — 소프트맥스 전에 가리기용.
`test/selftest.js` 가 여러 국면에서 모든 합법 수가 범위 안 · 겹침 없음 · 가림 개수 = 합법 수 개수인지 확인해요.

## 상대 · 선생님으로 엔진 쓰기

```js
AI.think({ start, moves }, { tier: 'easy' | 'normal' | 'hard', seed: 1 })   // → { move, score(cp, 둘 쪽 기준), mate, depth, nodes, pv }
AI.think(game, { tier: 'hard', nodes: 50000, timeMs: 1e9 })                // 노드 예산만 → 같은 입력이면 늘 같은 결과 (결정적)
AI.explain(game, uci, res)                                                 // { kind: 'fork'|'pin'|'win'|'mate'|…, text } 한 줄 까닭
AI.perft(fen, depth)                                                       // 수 생성 검사
```

- `score` 는 정책·가치 망의 가치 목표(value target)를 미리 만들 때 쓸 수 있어요 (예: `tanh(score / 400)`).
- 초급(`easy`)은 깊이 1 + 흔들기, 중급(`normal`)은 깊이 3, 고급(`hard`)은 반복 심화 + 치환표(기본 1.2초).
  자기 대국 데이터에 다양성이 필요하면 `seed` 를 바꾸고, 첫 수 책(`AI.BOOK_LINES`)을 섞으세요.

## 다음 단계 아이디어

1. Node 일꾼 스레드에서 `hard`(노드 예산) 끼리 자기 대국 → (planes, 방문 분포 대신 엔진 최선 수 one-hot, 결과) 모으기
2. 작은 잔차망(6블록 × 64채널)을 지도 학습 → 엔진 `evaluate` 대신 망 값을 정지 탐색 끝에서 쓰기
3. MCTS(PUCT) + 망으로 바꿔 AlphaZero 방식 자기 대국, `test/selftest.js` 의 AI 끼리 대국으로 고급과 견주기
