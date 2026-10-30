# 바둑 — 강화학습용 안내 (RL.md)

규칙 엔진 `core.js`(전역 `Baduk`, Node 는 `require("./core.js")`)는 화면과 상관없는 **순수·결정적 함수**입니다.
브라우저와 Node 에서 같은 코드가 돌고, 무작위(`Math.random`)·시간(`Date`)을 쓰지 않습니다.
9줄에서 우리 AlphaZero 를 처음 학습시킬 것을 염두에 두고 만들었습니다.

## 1. 상태 (state)

`Baduk.create({ size, komi, handicap, superko, maxMoves, rules })` 또는 `Baduk.create(size, komi, rules)` → 평범한 객체

| 필드 | 뜻 |
|---|---|
| `size` | 판 크기 N (5~19 홀수, 화면은 7·9·13·19 — 7줄은 "빠른 바둑") |
| `komi` | 덤 (기본 6.5, 접바둑 2점 이상이면 0.5). 화면의 7줄은 **9** — 7×7 최선 결과가 흑 9집 승으로 알려져 있어 비기는 덤(정수라 무승부 가능). 화면 계가(한국식 집 계산)와 학습 보상(면적) 모두 같은 덤을 씀 |
| `handicap`, `setup` | 접바둑 돌 수, 미리 놓은 흑 돌 점 목록 |
| `board` | `Int8Array(N*N)` — 0 빈칸 · 1 흑 · 2 백. 점 번호 `p = y*N + x` (y 는 위에서부터, x 는 왼쪽부터) |
| `toPlay` | 둘 차례 (1 흑 · 2 백) |
| `ko` | 지금 차례가 못 두는 패 자리 (`-1` = 없음) |
| `caps` | `[0, 흑이 따낸 돌, 백이 따낸 돌]` |
| `moves` | 둔 수 목록 (행동 번호). 색은 번갈아: 첫 수는 `Baduk.first(s)` (접바둑이면 백) |
| `hist` | 이전 판 최대 8개 (`Int8Array`, 최근이 앞) — 입력 평면용 |
| `passes` | 연속 패스 수 · `over`, `end` (`{reason:"pass"|"resign"|"maxmoves", winner?, loser?}`) |
| `superko`, `hashes` | 위치 초패(켰을 때만)와 판 해시 기록 |

JSON 으로 저장·전송: `Baduk.toJSON(s)` / `Baduk.fromJSON(o)` (타입 배열 ↔ 배열). 상태 해시: `Baduk.hash(s)` (16자리 hex).

## 2. 행동 (action)

| 값 | 뜻 |
|---|---|
| `0 … N*N-1` | 점 `y*N + x` 에 두기 |
| `N*N` | 패스 |
| `-1` | 기권 (학습에는 쓰지 않음) |

- 둘 수 있는 곳: `Baduk.legal(s)` → `Uint8Array(N*N+1)` (마지막 칸 = 패스, 끝난 판이면 전부 0)
- 행동 수: `Baduk.actionCount(N)` = N*N+1
- 한 수: `Baduk.play(s, a)` (= `Baduk.step`) → `{ state, events }` — **새 상태 객체**를 돌려줌(원래 상태는 그대로). 잘못된 수면 `state === s` 이고 `events[0].type === "illegal"`
- 되돌리기: `Baduk.undo(s, n)` (처음부터 다시 둬서 만듦, 결정적), `Baduk.replay(s, moves)`
- 규칙: 한국식 — 단순 패 금지, 자충(스스로 잡힘) 금지, 패스 두 번이면 끝, `maxMoves`(기본 3·N²) 넘으면 끝. `superko:true` 면 위치 초패도 금지
- events: `place{p,color}` · `capture{by,points}` · `atari{color,points}`(상대 돌을 단수로 만듦) · `ko{p}` · `pass{color}` · `resign` · `end{reason}`

## 3. 끝 · 보상

- 끝 확인: `Baduk.terminal(s)` → `{ over, winner, margin }` · 보상: `Baduk.reward(s, color)` → +1 / −1 / 0 (그 색 기준)
- 학습 보상(추천): **Tromp-Taylor 면적** `Baduk.scoreArea(s)` → `{ black, white, margin, winner, own }`
  (`margin` = 흑 − 백 − 덤, 흑 기준). `z = sign(margin)` 을 둘 사람 기준으로 바꿔 쓰면 됨.
  사석을 들어내지 않으므로, 자기대국은 죽은 돌을 다 따낼 때까지 두게 하는 보통의 AlphaZero 방식이 맞습니다.
- 사람 대국 계가: `Baduk.scoreKorean(s, dead)` — 사석(점 목록 또는 N*N 마스크)을 빼고 집 + 따낸 돌 + 사석, **빅은 집 없음**
  (goscorer, MIT). → `{ black, white, komi, margin, winner, terrB, terrW, capsB, capsW, terr, seki }`
- 사석 추정(화면용): `BadukAI.guessDead(s)` — 신경망 소유 지도(대칭 2개 평균)에서 사슬 평균이 자기 색 반대로 −0.35 넘게 기울면 죽은 돌

## 4. 관측 평면 (obs)

`Baduk.planes(s, H = 8)` (= `Baduk.obs`) → `Float32Array((2H+3) × N × N)`, 인덱스 `c*N*N + p`

| 평면 c | 내용 |
|---|---|
| `0 … H-1` | **둘 사람(나)** 의 돌, t 수 전 판 (t=0 지금) |
| `H … 2H-1` | 상대 돌, t 수 전 판 |
| `2H` | 차례: 흑 차례면 전부 1, 백이면 0 |
| `2H+1` | 둘 수 있는 곳 (패·자충 제외) |
| `2H+2` | 패 자리 |

9줄·H=8 이면 19평면 × 81, 행동 82개. 바둑은 숨은 정보가 없어 두 사람 관측이 같습니다(차례 기준으로만 뒤집힘).

**8 대칭** (자료 늘리기): `Baduk.symPoint(k, p, N)` (k=0..7, 역변환 `symInverse(k)`),
`Baduk.symPlanes(planes, C, N, k)`, `Baduk.symPolicy(policy, N, k)` (패스 칸은 그대로).

## 5. 결정성

- 규칙 엔진: 무작위 없음. 조브리스트 표는 고정 씨앗 mulberry32. 같은 수 → 같은 `hash(s)` (자기 시험에서 확인)
- AI(`ai.js`): 모든 무작위는 `opt.seed` 로 만든 mulberry32 → 같은 씨앗·같은 상태면 같은 수. 예외: 🐯 는 **시간 예산**(기본 1.5초)이라 기기 속도에 따라 방문 수가 달라짐 → 시험·학습에서는 `{ visits: n, timeMs: 1e9 }` 로 고정
- 신경망: wasm SIMD 경로와 JS 경로의 값 차이 < 1e-6 (f32 누적 순서 차이). 비트까지 같아야 하면 `BadukNN.loadModel(buf, { wasm: false })`

## 6. 누가 두는가 (꽂을 자리)

화면(`main.js`)은 `G.players[색] = "human" | "ai"` 만 봅니다. AI 수는 워커에 같은 방식으로 묻습니다:

```js
worker.postMessage({ id, kind: "move", state: Baduk.toJSON(s), opt: { tier: "hard", seed } })
// → { id, ok: true, res: { move, info: { winB, leadB, visits } } }
```
- 나중에 온라인(친구랑): `"remote"` 를 하나 더 두고, 상대 수를 받으면 `play(a, "remote")` 같은 길로 넣으면 됨 (행동 번호 그대로 주고받기)
- **학습한 정책 꽂기**: `ai.js` 의 `nnSearch`(PUCT)는 평가 함수만 바꾸면 됩니다.
  1. 우리 신경망 `policy(planes) → { policy: Float32Array(N*N+1), value }` 를 만들고 (입력은 `Baduk.planes`)
  2. `ai.js` 에 단계(예: `"az"`)를 더해 `nnEvalPos` 대신 그 평가를 부르게 하고
  3. `worker.js` 에서 가중치를 불러 `setModel` 처럼 넣기.
  `nn.js` 의 conv(둘레 0 평면 + 4채널×8칸 wasm SIMD 커널)는 그대로 다시 쓸 수 있음 — PyTorch 에서 가중치를
  `[oc][ic][ky][kx]` float16 으로 내보내면 `.bkn` 형식(`tools/katago2bkn.js` 참고)으로 담을 수 있습니다.

## 7. 기보 형식

- SGF: `Baduk.toSGF(s, { black, white, result, date })` / `Baduk.fromSGF(text)` (갈래 없는 한 줄 기보, `RU[Korean]`, 접바둑 `HA`·`AB`)
- 끝난 판은 `localStorage["baduk.records"]` 에 최근 200판: `{ t, mode, size, komi, handicap, human, tiers, result, winner, moves, sgf }`
- 하던 판(이어 하기): `localStorage["baduk.cur"]` = `{ mode, human, players, tiers, hints, st: toJSON(state) }`

## 8. 지금 AI 와 대략의 실력 (솔직하게)

두뇌는 **KataGo g170 b6c96 신경망**(CC0, 6블록 96채널, 약 100만 개 값)을 브라우저에서 직접 돌립니다.
입력은 KataGo 와 똑같이 만들고(축 찾기 포함) 한국·일본식(집 계산·빅 집 없음) 규칙으로 알려 줍니다.

| 단계 | 방식 | 9줄 자기 시험 결과 | 대략 실력 (추정) |
|---|---|---|---|
| 🐣 초급 | 정책에서 높은 온도로 뽑기 + 일부러 둘째 수(35%) + 고무줄(많이 앞서면 더 느슨) | MCTS 300 플레이아웃에 1/4 승 (평균 −20집) | 막 규칙을 익힌 분과 비슷 (25급 안팎) |
| 🐱 중급 | 정책 상위 5수에서 낮은 온도로 뽑기 | 🐣 에 6/6 승 (평균 +43집) | 15~10급 쯤 |
| 🐯 고급 | PUCT 수읽기 1.5초 (탐색마다 신경망) | 🐱 에 2/2 승 (32방문만으로) | 9줄 데스크톱 ≈ 아마 저단 근처, 19줄 ≈ 1~5급 (b6c96 생정책 실력 기준) |

- 속도(이 PC, 다른 작업과 같이 돌 때): 신경망 1회 9줄 5~20ms · 19줄 20~80ms (wasm), JS 만이면 6~10배 느림.
  🐯 한 수에 9줄 약 150방문 · 19줄 약 25방문 (브라우저 워커). 휴대폰은 2~4배 적을 것으로 예상.
- 실력 표는 사람과 둬서 잰 것이 아니라 AI 끼리 대국과 KataGo 작은 신경망에 대해 알려진 수준으로 짐작한 것입니다.
- 신경망을 못 불러오면(아주 오래된 브라우저) RAVE 몬테카를로로 대신 둡니다 (훨씬 약함).
