# 오목 — 강화학습(RL)용 정리

`omok/core.js` 하나가 규칙 전부입니다. 브라우저와 Node 에서 그대로 돌고(`require('./core.js')` 또는 전역 `Omok`),
상태는 JSON 으로 저장되는 평범한 객체, 함수는 결정적(같은 입력 → 같은 결과)입니다. 화면(`main.js`)과 AI(`ai.js`)도
이 함수들만 씁니다.

## 1. 상태 (state)

```js
const O = require('./omok/core.js');
const s = O.create(15, 'standard', seed);   // create(size = 15, rule = 'standard', seed = 1)
```

| 필드 | 뜻 |
|---|---|
| `v` | 형식 번호 (1) |
| `size` | 한 변 (15). 코어는 아무 크기나 되지만 AI(`ai.js`)는 15 만 |
| `rule` | `'standard'` 쌍삼 금지 · `'renju'` 렌주 · `'free'` 자유 |
| `board` | 길이 `size²` 배열, 칸 번호 `idx = y*size + x` (y=0 이 화면 맨 위). 0 빈칸 · 1 흑 · 2 백 |
| `moves` | 둔 순서 (칸 번호 배열). 흑이 먼저, 번갈아 |
| `turn` | 둘 차례 1 흑 · 2 백 |
| `over` · `winner` · `reason` | 끝났나 · 이긴 색(0 = 무승부/진행 중) · `'five'` `'resign'` `'draw'` |
| `winLines` | 이긴 줄의 칸 번호들 (화면 효과용) |
| `rng` | 상태 안 난수 씨앗 (mulberry32). `O.rand(s)` 가 0~1 을 내고 씨앗을 바꿈 |

저장: `O.toJSON(s)` / `O.fromJSON(obj)` (그냥 `JSON.stringify(s)` 해도 됨) · 복사 `O.clone(s)` · 지문 `O.hash(s)` (FNV-1a 32비트, 결정성 확인용).

### 규칙 (정확한 정의)

- **standard (쌍삼 금지, 기본)**: 흑백 모두 삼삼(열린 삼 두 개를 한 번에) 금지. 그 수가 다섯이면 예외. 사사는 가능. 여섯 이상(장목)은 둘 수는 있지만 **누구에게도 승리가 아님** (정확히 다섯만 승리).
- **renju (렌주)**: 흑만 삼삼·사사·장목 금지(다섯이 되면 예외), 흑은 정확히 다섯만 승리. 백은 금지 없고 장목도 승리.
- **free (자유)**: 금지 없음, 다섯 이상이면 승리.
- 열린 삼 = 한 수 더 두면 **열린 사(양쪽 다섯 자리, 정확히 다섯)** 가 되는 모양이고, 그 한 수가 **금수가 아니어야** 진짜 삼 (재귀, 최대 8겹). 띈 삼(`_XX_X_`) 포함.
- 판이 다 차거나(또는 남은 칸이 12개 이하인데 둘 차례 쪽이 둘 곳이 없으면) 무승부.
- 렌주 금수 판정은 quintet(MIT) 의 시험 판들과 무작위 국면 VCF 대조로 검증 (`test/selftest.js`).

## 2. 행동 (action)

| 값 | 뜻 |
|---|---|
| `0 … size²-1` | 그 칸에 돌 두기 (`O.ACTIONS(s)` = 225) |
| `O.RESIGN` (-1) | 둘 차례 쪽 기권 (화면용, 학습 행동 공간에는 넣지 않는 것을 권함) |

```js
const ev = O.step(s, a);      // = O.play(s, idx) (a 가 칸일 때). 상태를 바꾸고 events 를 돌려줌
O.legalMask(s)                // Uint8Array(225): 1 = 둘 수 있음 (빈칸이고, 둘 차례 쪽 금수가 아님)
O.legalMoves(s)               // 위를 칸 번호 목록으로
O.forbiddenMask(s)            // Uint8Array(225): 둘 차례 쪽 금수 0 · 1 삼삼 · 2 사사 · 3 장목
O.undo(s)                     // 한 수 무르기 (기권으로 끝났으면 기권만 취소)
O.resign(s, color)            // 아무 때나 그 색이 기권 (상대 차례여도 됨)
O.terminal(s), s.winner, O.reward(s, color)   // 끝? · 이긴 색 · 그 색 입장 보상 1 / -1 / 0
```

`events` (화면이 소리·효과에 씀): `{type:'place', idx, color, n}` · `{type:'threat', kind:'three'|'four'|'open4', color, idx}` ·
`{type:'win', color, lines, reason}` · `{type:'draw'}` · `{type:'resign', color}` · 반칙이면 상태는 그대로이고
`[{type:'illegal', idx, reason:'over'|'range'|'occupied'|'forbidden', ban:'33'|'44'|'overline'}]` 하나.
학습 루프에서는 `legalMask` 로 가린 뒤 고르면 반칙이 나오지 않습니다.

## 3. 관측 (observation)

```js
const x = O.planes(s);   // = O.obs(s). Float32Array(4 * 225), 장마다 225칸 (idx 순서)
```

| 장 | 내용 |
|---|---|
| 0 | 둘 차례 쪽 돌 (1/0) |
| 1 | 상대 돌 |
| 2 | 흑 차례면 전부 1, 백 차례면 전부 0 |
| 3 | 마지막 수 한 칸만 1 |

오목은 숨은 정보가 없어 두 쪽 관측이 같습니다(관점만 '둘 차례'로 맞춤). 금수가 있는 규칙이라면 `forbiddenMask(s)` 를
5번째 장으로 붙이는 것을 권합니다(정책이 금수를 배우지 않아도 되게 — 어차피 `legalMask` 로 가리긴 해야 함).
규칙은 판마다 바뀌지 않게 규칙별로 따로 학습하거나, 규칙 번호 장을 더하세요.

## 4. 대칭 (8가지)

```js
O.symIdx(idx, k, 15)     // k = 0..7: k&4 이면 좌우 뒤집고, 그다음 (k&3)번 90° 돌림
O.symInv(k)              // 역변환 (뒤집기 든 것은 자기 자신)
O.symArray(arr, k, 15)   // 칸 단위 배열(여러 장을 이어 붙인 planes 도 됨)을 통째로 변환
```

데이터 늘리기: 같은 `k` 로 `planes` 와 정책 목표(225칸 확률)를 함께 변환. 규칙 판정은 모든 대칭에서 같음 (시험에서 확인).

## 5. 기보 (game record)

한 줄 문자열: `"<규칙 글자><크기>:<수들>[=<결과>]"` — 규칙 글자 `S` 쌍삼 금지 · `R` 렌주 · `F` 자유,
수 하나 = x, y 를 `a`(0)부터 두 글자, 결과 = `B`/`W`/`D` + `5`(다섯) · `r`(기권) · `d`(무승부).
예: `S15:hhihgiigjgifjehfiegf=B5`

```js
O.encode(s) → 'S15:...'      O.decode(str) → { rule, size, moves, winner, reason } | null
O.fromRecord(str) → state | null   // 수마다 규칙 검사 (틀린 기보면 null)
O.coordName(idx) → 'H8'           // 열 A~O, 줄 1~15 (아래가 1)
```

화면은 끝난 판을 `localStorage['omok.records']`(최근 200판)에 `{ t, rec, mode, rule, tier, me, res, win, n, secs }` 로 남깁니다.

## 6. 결정성

- `core.js` 는 `Math.random` · `Date` · `performance` 를 쓰지 않습니다. 난수가 필요하면 `O.rand(s)` (상태 안 씨앗).
- 같은 씨앗 + 같은 행동 → 같은 `O.hash(s)` (시험 `결정성` 단락).
- AI(`ai.js`)는 `seed` 와 `maxNodes` 를 주고 `timeMs` 를 넉넉히 주면 결정적입니다(노드 수로만 끊김).
  화면에서는 느린 폰을 위해 시간 상한(고급 1.25초)이 있어서 기기마다 조금 다를 수 있습니다.

## 7. 지금 AI (`ai.js`, 웹 워커 `ai-worker.js`)

```js
OmokAI.think(state, { tier: 'easy'|'normal'|'hard', seed, maxNodes, timeMs, hint })   // hint: 🧑‍🏫 AI 선생님 추천용 (잡음 없이 가장 좋은 수)
// → { move, kind: 'book'|'win'|'block'|'open4'|'vcf'|'vct'|'defend-vcf'|'defend-vct'|'search'|'easy'|'lost', score, depth, nodes, ms }
```

- 칸마다 4방향 11칸 창의 줄 모양을 표로 들고 돌 하나마다 주변만 고침 → 알파베타(PVS) + 반복 심화 + 치환표 +
  킬러/히스토리 + 위협 가지치기, VCF(사로 몰기) · VCT(사·열린 삼으로 몰기, 반격 사까지 따짐), 상대 VCF/VCT 를 미리 끊는 수 고르기.
- 🐣 초급: 한 수 앞 + 잡음, 사는 늘 막고 상대 줄은 30% 확률로 흘려 봄(`blind`), 가끔 2·3등 수 ·
  🐱 중급: 2천 노드, 깊이 2, VCF(8수), 상대 VCF 끊기(4수, 30% 확률로 건너뜀 `slip`) ·
  🐯 고급: 26만 노드, VCF · VCT(위협 9수까지), 상대 VCF/VCT 를 끊는 수만 후보로 (이긴다고 증명된 상대 수순이 남는 수는 뺌, 렌주는 더 깊게).
  화면에서는 시간 상한(초급 0.3초 · 중급 0.8초 · 고급 1.25초)도 있어 느린 폰에서도 1.5초 안에 둠.
- **난이도 간격 (2026-10-30 조율)**: 사람 흉내 봇 두 개로 맞춤 — P1 '꼼꼼한 초보'(한 수 앞만, 사·열린 삼은 늘 막음) ·
  P2 'P1 + 짧은 VCF(5수)'. 둘 다 `think(s, { tier: 'easy', cfg: { blind: 0, pick: [1, 1], o4: 1 (, vcf: [5, 600]) } })`.
  - 쌍삼 금지 40판씩: P1 은 🐣 을 80% 이김 · 🐱 에게 15% · 🐯 에게 0%. P2 는 🐱 에게 38% · 🐯 에게 0%.
    (예전 🐱 은 P1 0% · P2 10% 로 초보에게 벽이었음.)
  - 🐯 vs 🐱 20판: 데스크톱 16:4, 느린 폰 흉내(시간 상한 1/3) 16:4 → 느린 기기에서도 순서가 유지됨.
    (🐱 은 노드 예산이 작아 시간 상한에 닿지 않고, 🐯 만 시간에 묶임.)
  - selftest 가 P1 vs 🐣 · P2 vs 🐱 · P2 vs 🐯 를 결정적으로 돌려 이 간격을 지킴.
- **느린 폰 시험 주의**: Chrome DevTools/CDP 의 CPU 느리게(`Emulation.setCPUThrottlingRate`)는 웹 워커에 걸리지 않습니다
  (같은 국면 노드 수가 1배·4배에서 거의 같음). 느린 기기 흉내는 Node 에서 `timeMs` 를 줄여(예: ×0.33) 대국을 돌리는 게 맞습니다.
- 조율용 `cfg` 덮어쓰기: `think(s, { tier, cfg: { nodes, maxDepth, vcf, oppVcf, slip, noise, blind, pick, o4, … } })`.
- 학습한 AI 의 맞상대·기준점으로 그대로 쓸 수 있습니다 (Node 에서 `require('./omok/ai.js')`).

## 8. 학습한 정책을 끼우는 법

1. **화면**: `main.js` 에서 색마다 조종하는 쪽은 `G.players[색] = { kind: 'human' } | { kind: 'ai', tier }` 입니다.
   모든 수는 `act(칸 번호)` 한 길로 들어가 `O.step()` 을 부르므로, 새 종류만 더하면 됩니다.
   예: `{ kind: 'ai', tier: 'rl' }` → `ai-worker.js` 에서 `opts.tier === 'rl'` 이면 모델로 수를 고르게.
2. **워커**: `ai-worker.js` 는 `{ id, state, opts }` 를 받아 `{ id, res: { move } }` 를 돌려줍니다.
   모델(예: onnxruntime-web, 고정 버전 CDN)을 `importScripts` 로 불러 `O.planes(state)` 를 넣고,
   나온 225칸 점수를 `O.legalMask(state)` 로 가린 뒤 가장 큰 칸(또는 MCTS)을 `move` 로 돌려주면 끝.
   `state` 는 JSON 이라 워커에서 `O.fromJSON` 없이 바로 써도 됩니다(코어 함수는 평범한 배열을 받음).
3. **원격(친구랑)**: 이미 붙어 있음 — 코어(`core.js`)와 RL API 는 그대로이고, 누가 두는지만 `seats.js`(`OmokSeats`)가 정함.
   방 최대 16명: 방장 먼저 들어온 순서로 2명이 두고(상담 2:2 면 4명, 같은 색끼리 `mover(seats, 색, 수 번호)` 로 번갈아) 나머지는 구경.
   방장이 판의 주인: 손님 수 `{ t:'move', a, n, round }` → 방장이 `O.step()` 으로 확인해 모두에게(믿을 만한 통로),
   늦게 온 구경꾼은 `hello` → 방장이 `{ t:'sync', rec: encode(), seats }` 로 판 전체를 주고 `fromRecord()` 로 이어 봄.
   기권은 `O.resign(s, color)`. 학습한 정책을 친구랑에 넣을 때도 `G.players` 대신 자리표(seats)에 봇 uid 를 앉히면 됨.

## 9. 시험

`node game/omok/test/selftest.js` (약 1분 반, `quick` 을 붙이면 더 짧게):
규칙(렌주 금수 quintet 판 · 쌍삼 금지 · 자유 · 장목 승패) · 수/무르기/기권/무승부/기보/JSON · planes/대칭 · 결정성 ·
AI 전술(한 수 승리 · 사 막기 · 열린 삼 막기 · 금수 이용 · VCF/VCT 문제) · quintet 대조(무작위 렌주 국면 VCF 일치, VCT 첫 수 전수 확인) ·
AI 끼리 대국(worker_threads 로 58판: 난이도 순서 · 사람 흉내 봇과의 간격 · 반칙 없음 · 한 수 시간) ·
친구랑 자리(`seats.js`: 들어온 순서 · 구경꾼은 못 둠 · 상담 번갈아 순서 · 나감/다음 판 자리 채우기).
