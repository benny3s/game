# 땅따먹기 — 강화학습용 설명 (RL hooks)

규칙은 `core.js` 하나(전역 `Land` / Node `require`), 봇은 `bots.js`(`LandBots`), 학습 환경 껍데기는 `env.js`(`LandEnv`).
셋 다 브라우저와 Node 에서 고치지 않고 그대로 돎. 화면(`render.js`·`main.js`)은 상태를 읽고 `step()` 이 돌려준 일(events)로 소리·효과만 냄.

```
node game/land/test/selftest.js      # 규칙 · 결정성 · env · 봇끼리 48판 (약 7초)
```

## 1. 만들기 · 진행

```js
const Land = require('./game/land/core.js');
const st = Land.create({ n: 8, mode: 'classic', limitSec: 180, size: 0 }, seed);   // size 0 = 인원에 맞춤 (8명 → 72x72)
const events = Land.step(st, actions);    // actions[i] = 플레이어 i 의 행동 (아래 표). st 를 바로 고침
```

- 고정 틱: **초당 8틱 = 초당 8칸** (`Land.C.TPS`). 한 판 = 3분 = 1440틱 (`st.limit`).
- 처음 땅 5x5 (`C.BASE = 2`), 클래식은 아웃 뒤 **16틱(2초)** 뒤 새 5x5 땅에서 다시 (`C.RESPAWN`).
- `Land.sizeFor(n)` = `round(24·√n) + 4` (30~100): 2명 38 · 4명 52 · 8명 72 · 12명 87.

### 행동 표 (`Land.ACT`)

| 값 | 뜻 | 쓰는 곳 |
|---|---|---|
| 0 | 그대로 (KEEP) | 학습 · 봇 |
| 1 | 왼쪽으로 돌기 (LEFT, 반시계) | 학습 · 봇 |
| 2 | 오른쪽으로 돌기 (RIGHT, 시계) | 학습 · 봇 |
| 3 · 4 · 5 · 6 | 화면 기준 위 · 오른쪽 · 아래 · 왼쪽 (절대 방향) | 사람 입력 (키·밀기·방향 단추) |

180도 되돌기는 무시(그대로 감). 방향 번호: 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽 (화면 좌표, y 는 아래로 +). `Land.turn(dir, a)` 가 새 방향.

### 한 틱의 순서 (파이썬 등으로 옮길 때 이 순서 그대로)

1. 다시 태어나기 (클래식만): 기다림 `wait` 이 0 이 된 사람을 7x7 안에 선이 없고 남의 머리와 6칸 이상 떨어진 곳에 (후보 48곳, 상태 난수로)
2. 방향 바꾸고 다음 칸 정하기. 판 밖이면 `wall` 아웃 예약
3. 선 밟기 (틱 **시작** 때의 선 기준): 남의 선 칸에 들어가면 **선 주인만** 아웃(`cut`, 밟은 쪽은 무사·킬 +1), 내 선이면 나 `self`.
   둘이 서로의 머리 칸으로 자리를 바꾸며 서로 선을 밟으면 둘 다 `crash` (공 없음)
4. 머리끼리 같은 칸: 그 칸이 둘 중 한 명의 땅이면 **땅 주인만 삶**(다른 쪽 `crash`, 주인 킬 +1), 아니면 **모두 아웃**
5. 아웃 처리: 선과 땅이 모두 사라짐
6. 살아남은 사람 한 칸 이동: 내 땅 밖이면 선을 긋고, 선을 든 채 내 땅에 들어오면 땅 먹기 대상
7. 땅 먹기 (같은 틱이면 번호 순): 선 칸 + **바깥 테두리에서 물 채우기로 닿지 않는 모든 칸**(주머니 여러 개, 남의 땅 포함)이 내 땅.
   새로 칠한 칸 위에 머리가 있던 사람은 포위 아웃(`trap`, 자기 땅 위여도), 땅이 0 이 된 사람은 `wipe`
8. 시간 · 끝: `tick >= limit` 이면 끝. 한 목숨은 1명 이하 남아도 끝 (`results` 채움)

순위: 클래식 = 끝날 때 땅(그때 아웃 상태면 0) · 한 목숨 = 살아남은 사람(땅 순) → 늦게 아웃된 순. 같으면 킬 많은 순 → 번호.

## 2. 상태 (그대로 JSON 가능)

| 칸 | 뜻 |
|---|---|
| `ver, W, H, n, mode` | 판 정보 (`mode`: `'classic'` · `'life'`) |
| `tick, limit` | 지금 틱 · 끝나는 틱 |
| `seed, rng` | 처음 씨앗 · **mulberry32 난수 상태** (다시 태어날 자리에만 씀) |
| `owner` | `Uint8Array(W*H)`: 0 빈 칸 · k = 플레이어 k-1 의 땅. 칸 번호 = `y*W + x` |
| `trail` | `Uint8Array(W*H)`: 0 없음 · k = 플레이어 k-1 의 선 |
| `players[i]` | `id, alive, out(한 목숨 탈락), fresh(이번 틱에 태어남), x, y, dir, trail[](선 칸 번호 순서, 끝 = 머리 칸), exit(선을 시작한 내 땅 칸), area, box[x0,y0,x1,y1](땅이 든 상자, 줄지 않음), kills, deaths, best(한 번에 가장 크게 먹은 칸 수), peak, aliveT, lifeT, wait, dieT, deadArea, cause, killer` |
| `over, results` | 끝났나 · 순위 `[{ id, rank, area, pct, kills, deaths, best, bestPct, aliveT, alive }]` |

- `Land.toJSON(st)` / `Land.fromJSON(obj 또는 문자열)` / `Land.clone(st)` — 배열을 보통 배열로 바꿔 저장·전송, 되살려 이어 해도 같은 결과.
- `Land.hash(st)` — 상태 지문(8자리 16진). 결정성 시험·온라인 어긋남 찾기에.
- `Land.ranking(st)` — 지금 땅 순위, `Land.pct(st, 칸 수)` — % (소수 한 자리).

## 3. 일어난 일 (events, `step()` 이 돌려줌)

| `t` | 칸 | 언제 |
|---|---|---|
| `spawn` | `p, x, y` | 다시 태어남 |
| `leave` | `p` | 내 땅 밖으로 나가 선 시작 |
| `capture` | `p, n, stolen, cells[], x, y` | 땅 먹기 (n 칸, 그중 남의 땅 stolen 칸, 새로 칠한 칸 번호들) |
| `death` | `p, by, cause, x, y, area, w` | 아웃. `cause`: `cut` · `self` · `wall` · `crash` · `trap` · `wipe`, `by` = 공을 가져간 사람(-1 없음), `w` = 머리 박기 상대들 |
| `end` | `results` | 판 끝 |

## 4. 관찰 `Land.obs(st, pid, out?)` → `Float32Array(Land.C.OBS_N = 2654)`

**내 머리가 가운데, 내가 가는 쪽이 위**가 되게 돌린 21x21 창(`C.OBS_R = 10`) 6장 + 숫자 8개.
`out` 에 같은 길이 배열을 주면 새로 만들지 않고 채움. 아웃 상태면 **모두 0** (살아 있음 칸도 0).

- 창 칸: `index = ch*441 + r*21 + c` (r = 0 이 맨 앞 줄, c = 0 이 왼쪽). 창의 (r, c) = 판의 `머리 + (10-r)·앞 + (c-10)·오른쪽`
- 채널 `ch`: **0 내 땅 · 1 내 선 · 2 남의 땅 · 3 남의 선 · 4 남의 머리 · 5 판 밖**
- 숫자 (2646 부터): 0 내 땅 비율(전체 대비) · 1 선 길이/64 · 2 남은 시간 비율 · 3·4 가장 가까운 내 땅 칸의 앞·오른쪽 거리/32 (±1, 내 땅 안이면 0) · 5 그 거리/32 (못 찾으면 1) · 6 가장 가까운 남의 머리 거리/32 (최대 1) · 7 살아 있음

## 5. 학습 환경 `env.js`

```js
const LandEnv = require('./game/land/env.js');
const env = LandEnv.make({ n: 8, agents: [0], tier: 'normal', mode: 'classic' });  // tier: 'easy'|'normal'|'hard' 또는 자리별 배열
let obs = env.reset(seed);                 // 에이전트마다 관찰 하나
let done = false;
while (!done) {
  const r = env.step([policy(obs[0])]);    // 행동 0·1·2 (절대 방향 3~6 도 받음)
  obs = r.obs; done = r.done;              // r.rewards[k], r.info = { events, tick, results }
}
env.setPolicy(5, (st, pid) => oldMe(st, pid));   // 봇 자리를 다른 정책으로 (셀프플레이)
```

- 보상(기본, `reward` 로 바꿈): **땅 % 변화** (`area: 100` → 1% 늘면 +1, 아웃으로 잃은 땅만큼 자동으로 −) + 내가 남을 아웃시키면 `kill: 0.5` + 내가 아웃되면 `death: -0.5`. 시험에서 보상 합 = 처음→끝 땅 변화 + 보너스임을 확인함.
- 봇 자리는 씨앗에서 정해진 기억(`seed*31 + 자리*7919 + 1`)으로 만들어서 같은 씨앗·같은 행동이면 같은 판.
- 한 판 1440 동작, 틱당 규칙+봇 8명 ≈ 0.09ms (Node) → 한 판 약 0.13초.

## 6. 결정성

- 규칙·봇에 `Math.random`·`Date`·`performance` 없음 (시험이 같은 씨앗·같은 행동 → 같은 `hash` 를 확인).
- 규칙 난수는 상태 안 `rng`(mulberry32), 봇마다 자기 기억 안 `rng`. 봇 기억도 평범한 객체라 JSON 저장 가능.
- 계산은 정수 칸 위에서만 (관찰 숫자만 실수). 물 채우기용 작업 배열은 상태 밖이지만 쓸 때마다 새 도장 번호를 써서 결과에 영향 없음.
- 사람 입력만 시간에 따라 다름 → 다시 보기·온라인은 **틱마다 행동 배열을 기록/전송**하면 똑같이 재현됨.

## 7. 학습한 AI 를 게임에 끼우는 법

게임 화면은 자리마다 '조종 칸' 하나만 봄: `S.ctrls[i] = { decide(st, i) → 행동 }` (`main.js` `humanCtrl` · `botCtrl`).
같은 길로 사람 · 봇 · 학습한 AI · (나중에) 온라인 친구가 들어감.

1. 작은 신경망(JSON `[{ W: [[...]], b: [...] }, ...]`, 숨은 층 ReLU, 마지막 층 3개 = 행동 0·1·2 점수)이면
   `LandBots.policy(brain)` 이 `{ decide(st, pid) }` 를 돌려줌 → `S.ctrls[i]` 에 그대로. 관찰 크기 2654 → 64 → 3 이면 한 번에 약 17만 곱셈(≈0.2ms)이라 화면 쪽에서 돌려도 됨.
2. 큰 모델(onnxruntime-web 등)은 Web Worker 에서: 틱마다 관찰(2654 float = 약 10KB)을 보내고 다음 틱(125ms) 안에 행동을 받음. 늦으면 지난 행동(또는 0)을 씀.
3. 메뉴에 난이도 카드(예: 👑 고수)를 하나 더 두고, 그 카드면 봇 자리에 학습한 정책을 끼우면 됨.
