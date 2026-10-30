# 원카드 — 강화학습용 안내 (RL.md)

`core.js`(전역 `OneCard`, Node 에서는 `require('./core.js')`)만 있으면 화면 없이 판을 돌릴 수 있어요. 규칙 값은 `cfg.rules`(우리 집 규칙, `G.RULE_DEFS`) 하나로 정해져요.

## 파일

| 파일 | 하는 일 |
|---|---|
| `core.js` | 규칙 전부. 순수 함수 + JSON 상태, `Math.random`·`Date` 없음 (난수는 상태 안 mulberry32) |
| `ai.js` | 🐣 easy · 🐱 normal · 🐯 hard(결정화 몬테카를로) · 🧑‍🏫 coach. `view` 만 받아서 남의 손패를 못 봄 |
| `ai-worker.js` | 브라우저에서 🐯·선생님 계산을 Web Worker 로 |
| `test/selftest.js` | 규칙·결정성·숨은 정보·무작위 판·AI 대결 시험 (`node game/onecard/test/selftest.js`, 약 90초) |

## 한 판 돌리기 (Node)

```js
const G = require('./core.js');
let s = G.create({ players: 4, rules: G.presetRules('basic'), seed: 1234 });   // players 2~8 (7명부터 두 벌)
while (s.phase !== 'end') {
  const p = s.phase === 'call' ? s.call.p : s.turn;   // 'call' 은 시간 경주 — 화면(방장)이 누가 먼저였는지 정함
  const o = G.obs(s, p);                     // Float32Array(G.OBS_LEN = 222)
  const mask = G.legalMask(s);               // Uint8Array(G.N_ACTIONS = 123), 1 = 할 수 있음
  const a = pickFromPolicy(o, mask);
  const { state, events } = G.step(s, a);    // 순수 함수. 빠르게는 G.apply(s, a, null) (제자리)
  s = state;
}
const r0 = G.reward(s, 0);                   // 이기면 +(남들이 남긴 장수), 지면 -(내 남은 장수), 합 0
s = G.nextRound(s);                          // 다음 판 (이긴 사람이 선)
```

- 🐱 끼리 기본 규칙: 둘이면 한 판 60수(중간값, 90% 165), 넷이면 97수(90% 193). 이긴 사람 장수 중간값 둘 6 · 넷 20.
- 600수를 넘으면 `result.kind = 'cap'` 로 끝 (손패 적은 순).

## 상태 (JSON 그대로 저장 가능)

| 칸 | 뜻 |
|---|---|
| `n`, `decks`, `rules` | 사람 수, 카드 벌 수(1·2), 우리 집 규칙 |
| `seed`, `rng` | 이 판 씨앗, mulberry32 상태 (int32) |
| `round`, `first`, `turn`, `dir` | 몇 판째, 선, 결정할 사람, 도는 방향(1 · -1) |
| `phase` | `play` · `suit`(7 낸 뒤 무늬 고르기) · `call`(☝️ 한 장 남음) · `end` |
| `deck`, `pile` | 더미 · 버린 더미 (둘 다 배열 **끝이 맨 위**) |
| `hands[p]` | 손패 (번호 순) |
| `suit`, `rank` | 지금 맞춰야 할 무늬·숫자 (-1 = 아무거나, 조커 다음) |
| `atk`, `atkStr`, `atkKind` | 쌓인 공격 장수, 마지막 공격 세기, 종류 `'2'`·`'A'`·`'J'`(조커) |
| `out[p]`, `order`, `bustAt[p]` | 0 남음 · 1 다 털음 · 2 파산, 다 털어 낸 순서, 파산 때 장수 |
| `call`, `pend` | 외치기 `{ p, k }` (k = 0 한 번 더 · 1 다음 · 2 건너뛰기), 무늬 고른 뒤 이어질 차례 |
| `stat` | 외침·벌칙·먹은 장수·다시 섞은 횟수 |
| `result` | `{ kind: out·last·rank·cap, winner, order, cards, pts, bust, hands }` |

카드 번호 `c`: 한 벌 54장 — `0~51 = 무늬×13 + 숫자` (무늬 0 ♠ · 1 ♥ · 2 ♦ · 3 ♣, 숫자 0 A · 1 2 … 10 J · 11 Q · 12 K), 52 흑백 조커, 53 컬러 조커. 두 벌이면 54~107 이 두 번째 벌 (`c % 54` 가 같은 카드).

## 행동표 (`G.N_ACTIONS` = 123)

| 번호 | 뜻 | 언제 |
|---|---|---|
| 0~107 | `A_PLAY + c`: 카드 `c` 내기 (받아치기 · 3 으로 2 막기 포함) | play |
| 108 | `A_DRAW`: 한 장 먹기 (공격받는 중이면 쌓인 장수만큼 받기) | play |
| 109~112 | `A_SUIT + 무늬`: 7 낸 뒤 다음 무늬 | suit |
| 113 | `A_CALL`: ☝️ 원카드! (제때 외침) | call |
| 114~121 | `A_CATCH + 자리`: 그 사람이 먼저 🫵 잡았다 → 한 장 남은 사람 벌칙 | call |
| 122 | `A_MISS`: 아무도 안 누르고 시간이 지남 → 벌칙 | call |

`call` 단계는 사람 사이 시간 경주라 정책이 고를 것이 아니에요. 학습 때는 `A_CALL` 로 고정하거나 `AI.race(s, 자리별 실력, rand)` 로 흉내 내요.

## 관찰 (`G.obs(s, p)`, 길이 222)

`view(s, p)` 를 거쳐 만들어서 남의 손패·더미 순서·씨앗은 들어가지 않아요.

| 칸 | 길이 | 뜻 |
|---|---|---|
| 내 손패 | 54 | 카드마다 0.5 (두 벌이면 1까지) |
| 버린 더미 | 54 | 나온 카드 (같은 방식) |
| 맨 위 카드 | 54 | 원핫 |
| 지금 무늬 · 숫자 | 5 + 14 | 원핫 (끝 칸 = 아무거나) |
| 단계 | 4 | `play`·`suit`·`call`·`end` |
| 공격 종류 | 3 | `2`·`A`·조커 |
| 공격 | 5 | 쌓인 장수/20 · 공격 중 · 세기/15 · 방향 · 내가 외칠 차례 |
| 더미 · 벌 · 인원 | 3 | 남은 비율 · 두 벌 · n/8 |
| 자리마다 (나부터 차례 순, 8칸 × 3) | 24 | 손패/20 · 남아 있음 · 지금 차례 |
| 그 밖 | 2 | 수/600 · 외치기 규칙 켬 |

## 보상

판 끝 `G.reward(s, p)` = `result.pts[p]` (장수, 모든 자리 합 0). 친구랑 정산은 이 값 × `rules.chipPer`. 끝까지 등수(`rankAll`)면 등수 한 칸마다 `placePts` 장, 파산은 `bust + bustPay` 장.
