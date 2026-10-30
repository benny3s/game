# 베니큐브 학습용 API (짧게)

`core.js` 만 있으면 브라우저·Node 어디서든 돌릴 수 있어요. 화면(`main.js`)·AI(`ai.js`)는 필요 없어요.

## 한 판 돌리기

```js
const Cube = require("./core.js");
let st = Cube.create({ players: 4, rule: "easy", seed: 123 });
while (st.phase !== "over") {
  const p = st.turn;
  const obs = Cube.obs(st, p);              // Float32Array(372)
  const acts = Cube.legal(st);              // 지금 둘 수 있는 행동들
  const a = acts[0];                        // 고르기
  st = Cube.step(st, a).state;              // 새 상태 (입력은 안 바뀜)
}
st.winner;   // 0~n-1, -1 이면 나가리
st.points;   // 이긴 사람이 얻은 점수 (묶음 2 · 일곱 쌍 4 · 만능 버리면 ×2)
```

`Cube.step` 은 `{ state, events }` 를 돌려줘요. `events` 는 `draw` · `discard` · `win` · `nagari`.
`Cube.checkWin(ctx, ids14)` 는 14장이 완성인지, `Cube.arrange(ctx, ids)` 는 묶음/남은 타일을 알려 줘요.

## 관찰 벡터 `Cube.obs(st, p)` — 길이 372 = 52×7 + 8

| 칸 | 내용 |
| --- | --- |
| `0..51` | 내 손패 얼굴 개수 ÷ 2 (만능은 빠짐) |
| `52..103` | 내 버림 더미 얼굴 개수 ÷ 2 |
| `104..155` | 다음 사람 버림 더미 |
| `156..207` | 그다음 사람 |
| `208..259` | 그다음 사람 |
| `260..311` | 앞사람(나–1) 맨 위 버림 한 장 (0/1) |
| `312..363` | 만능 얼굴 한 칸 (0/1, 쉬움 규칙은 전부 0) |
| `364` | 내 만능 장수 ÷ 2 |
| `365` | 남은 더미 ÷ 106 |
| `366` | 뽑을 차례면 1 |
| `367` | 인원 ÷ 4 |
| `368..370` | 다음 세 사람 손패 장수 ÷ 15 |
| `371` | 내 차례면 1 |

얼굴 번호 = `색(0~3)×13 + (숫자−1)`. 고양이는 쉬움 규칙에서만 만능이고, 전통 규칙에서는 만능 얼굴의 보통 타일로 셉니다.

## 행동 표 (숫자로 바꿀 때의 예)

한 번에 한 행동만 둬요. 214개면 전부 표현돼요.

| 번호 | 행동 |
| --- | --- |
| 0 | 더미에서 뽑기 `{t:"deck"}` |
| 1 | 앞사람 버림 가져오기 `{t:"take"}` |
| 2 + id | 타일 `id`(0~105) 버리기 `{t:"discard", id}` |
| 108 + id | 타일 `id` 를 버리며 끝내기 `{t:"win", id}` |

`Cube.legal(st)` 에 없는 행동은 `Cube.step` 이 예외를 던져요. 화면과 AI 도 같은 API 만 씁니다.

## 보상 예시

- 이긴 사람: `+st.points` (2 · 4 · ×2)
- 나머지: 0, 나가리: 모두 0

## 여럿이 (2~4명) — 화면 쪽 도우미 `table.js`

`core.js` API 는 그대로예요. 인원은 `Cube.create({ players: 2|3|4 })` 하나로 정해요.
화면이 쓰는 자리 정하기만 `table.js`(`CubeTable`, Node 에서도 `require`)로 따로 뺐어요.

- `seatOrder(players, hostUid)` — 친구랑 자리 순서 (방장 → 들어온 순서 → uid)
- `tableSize(사람 수, fill)` · `lineup(humans, fill)` — 빈 자리를 AI 로 채운 판 인원 (2~4)
- `describe(n, fill)` — 대기실 안내 한 줄 ("3명이면 셋이서 한 판")
- `viewerFor(levels, st)` · `needCover(levels, 보는 자리, st)` — 한 폰으로 돌려 할 때 가림막

친구랑은 방장이 판의 주인이에요: 씨앗(`seed`) + 수 기록(`log`)을 보내면 친구 화면이
`Cube.create` → `Cube.step` 다시 두기로 똑같아져요 (`test/selftest.js` 에서 확인).
