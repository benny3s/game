# 베니 서바이벌 (`survival/`) — 만드는 법

방송 두뇌 서바이벌 게임을 한 곳에 모은 칸. 첫 화면은 **방송 칸 셋(데블스 플랜 → 더 지니어스 → 피의 게임) → 시즌 칸 → 게임 카드** 순서이고,
카드는 `list/*.js` 의 값만으로 그려요. 게임은 **고를 때** `games/<id>/core.js` · `ui.js` 를 불러와요 (미리 다 안 불러옴).
주소 `survival/?g=<id>` 로 바로 그 게임이 열려요.

## 파일 나눔 (주인)
| 파일 | 주인 | 비고 |
|---|---|---|
| `index.html` · `shell.js` · `review.js` · `style.css` · `README.md` · 루트 `games.json` · `sw.js` · `test/qa/adapters/survival.js` · `test/tier_bench.js` · `test/replay_check.js` | 공용 틀 (sv-blood 가 맡음) | 일꾼은 고치지 않고 부탁 |
| `list/devil.js` | 데블스 플랜 S1·S2 (A) | |
| `list/devil-s3.js` | 데블스 플랜 S3 일꾼 | |
| `list/genius.js` | 더 지니어스 일꾼 | |
| `list/blood.js` | 피의 게임 일꾼 | |
| `games/<id>/` · `test/<id>_*` | 그 게임을 만든 일꾼 | |

## 목록 파일 (`list/<이름>.js`) — 형식
파일 하나가 없어도 첫 화면은 깨지지 않아요 (없는 파일은 건너뜀). 각 파일은 이렇게 한 줄씩 더해요:

```js
(window.SVList = window.SVList || []).push(
  { id: "mazesum", prog: "blood", season: "S3", title: "수식미로", emoji: "🧭", v: 1, short: "숫자판을 외우고 합이 맞는 길을 찾는 기억 미로" },
  …
);
```
- **꼭**: `id`(= `games/<id>/` 폴더 이름, 영문·숫자·`_`·`-`) · `prog`(`"devil"` | `"genius"` | `"blood"`) · `season`(칸 이름 그대로 보임, 예 `"S1"` `"S2"` `"S3"` `"SX"`) · `title` · `emoji` · `v`(숫자).
- **고를 수 있음**: `seasonName`(시즌 칸 밑에 작게, 예 `"데드 어게인"`) · `short`(카드 한 줄) · `src`(방송 출처 한 줄) · `diff`(방송과 다른 점 한 줄, 앞에 "※ 방송과 다른 점:" 붙이지 않아도 됨) · `link`(게임 대신 다른 주소로 가는 카드, 예 `"../genius/"` — 이때 `id` 는 다른 것과 겹치지 않는 이름만, 게임 폴더는 필요 없음).
- 칸 순서 = 파일을 읽는 순서(`devil` → `devil-s3` → `genius` → `blood`) 안에서 **나온 순서**. 방송 회차 순으로 적으면 돼요.
- **v**: 그 게임 파일(`core.js` · `ui.js`)을 고치면 올려요 → 브라우저가 `games/<id>/core.js?v=<v>` 로 새 파일을 받음. 안 올리면 옛 파일이 캐시에서 나올 수 있어요 (아케이드 `sw.js` 는 온라인일 때 늘 새 파일부터 받음).
- 목록 파일 자체는 shell 이 **10분 단위** 쿼리(`?v=<10분 단위 숫자>`)로 불러요. 일꾼은 `index.html` · `shell.js` 를 고치지 않아요.
- 규칙이 어긋난 항목(이름 규칙 위반 · `title` 없음 · 모르는 `prog` · 겹치는 `id`)은 그 항목만 빼고 나머지는 그대로 받아요. 목록 파일 하나가 깨져도(문법 오류 · 404) 그 파일만 빠지고 다른 파일은 무사해요 (파일마다 따로 불러서).
- **방송 출처 · 다른 점 표시**: 목록 `src`/`diff` → 없으면 `ui.src` / `ui.diff` → 없으면 `ui.show = { src, diff }`. `ui.howto` 안에 "방송: …" · "※ 방송과 다른 점: …" 줄이 이미 있으면 shell 이 그 줄은 빼고 라벨 하나만 붙여요 (두 번 안 보임).

## 게임 하나 = 둘 (`games/<id>/`)
### `core.js` — 결정적 규칙 (Node · 브라우저 공용 → `window.SVCores[id]`)
같은 `seed` 면 같은 결과. 숨은 정보는 `view` 로 새지 않아야 해요.
- `init({ n, seed, cfg })` → st · `needs(st)` → 지금 입력할 자리들 (동시 입력이면 여럿)
- `apply(st, seat, a)` → `{ ok, err }` · `view(st, seat)` → 그 자리 눈에 보이는 것만 (`-1` = 구경꾼, `'all'` = 다 보기).
  `view` 에는 늘 `pub`(모두 같은 공개 지문) · `needs` · `over` · `ranks`(끝나면, 0 = 1등) · `log`(공개 기록 `[{i, …}]`) · `score`
- `over(st)` · `ranks(st)` · `ai(view, seat, tier, rnd)` (보이는 것만으로) · `legal(st, seat)`(선택) · `auto(st)` / `advance(st)`(사람 입력 없이 넘어가는 단계)

### `ui.js` — 화면 (→ `window.SVUI[id]`)
`name` · `emoji` · `short` · `min` · `max` · `board`(한 기기 탭 허용 — 숨은 정보가 없는 1:1 만, 지금 한 기기는 2명 고정) · `defN` · `opts [{k, label, items:[[값,글]], def}]` · `howto ['…']` · `sub(V,me)` · `chip(V,i,me) → {t,on,out}` · `render(stage, V, ctx)` · `coach(V, me, since, names) → {opp, mine, rec, why}` · `result(V, me)`(선택) · `tutorial()` (1분 규칙, 직접 해 보기 한 단계) · `qa(V, me, rnd)`(선택, 자동 시험이 내 차례에 둘 수) · `src` · `diff` · `fitCoach`(선택).
- **`fitCoach: true`** (판이 화면을 꽉 채우는 게임): AI 선생님 창을 열어도 판이 가려지지 않게 shell 이 스테이지 아래쪽을 창만큼 비우고(창 높이는 화면의 21%·최대 190px, 글은 창 안에서 스크롤) 스테이지에 `sv-coachfit` 클래스와 CSS 변수 `--sv-sh`(판이 쓸 수 있는 높이)를 줘요. 게임 CSS 에서 `.sv-coachfit .판 { width: min(100%, calc(var(--sv-sh, 360px) - <판 말고 남은 줄 높이>)) }` 로 판을 줄이고 곁가지(안내 줄 · 범례)는 `display:none`. 예: `games/colorturn` · `games/cardchess`. `shell_ui.js` 가 이 게임들은 선생님 창을 연 채 맨 아래 요소가 창 위쪽보다 위인지 시험해요.
`ctx` = `{ me, act, canAct, seats, mode, fast, coachOn, g, wait, sfx, toast }`.
- **지켜야 할 것**: `CONVENTIONS.md` — 선생님(👀 상대 흐름 · 📊 내 흐름 · 💡 추천 · 👉 수의 의미, **보이는 것만**) · 1분 규칙 · 모드 혼자(AI) · 친구랑 · AI 구경 · 기록은 `common/rank.js` 로만 (shell 이 대신 보냄) · 폰 세로 375×667 한 화면 · 콘솔 오류 0 · 조사(이/가 · 은/는)는 받침 맞춰 붙여 쓰기.
- 모델 = `games/formula/`, 시험 틀 = `test/s3ui_lib.js` (`run(id, policy, opts)`) · `test/board_ui_lib.js` (판 게임).

## 🎞️ 복기 · 📒 아쉬운 장면 (공용 틀이 해 줌 — 게임은 약속만 지키고 고리만 채워요)
판이 끝나면 결과 창에 **[🎞️ 복기]** 가 생겨요 (혼자 · 한 기기 · AI 구경 · 친구랑 모두 — 친구랑은 방장이 끝난 뒤 손님에게 기록을 따로 보내 줌). 첫 화면 **[🎞️ 지난 판]** 에서는 이 기기의 최근 10판을 열어요.
- **하는 일**: 한 수씩 앞뒤(⏮ ◀ ▶ ⏭ · 슬라이더 · 🙋 내 수 · ⚠ 아쉬운 수), 끝난 뒤라 **숨은 패까지 다 공개**(`view(st, 'all')`), 내 결정마다 같은 view 로 **고급 AI 를 3번**(한 번이 0.16초를 넘길 만큼 무거운 AI 는 1번) 돌려 '같음 ✅ / 다름 🔸' + 까닭을 AI 선생님 창에 보여 줘요. 손해가 큰 장면(`sev ≥ 60`, 판마다 큰 순 3개)은 📒 에 담기고, 📒 에서 누르면 **그 장면 바로 앞까지 되감은 연습 판**(`survival/?drill=<id>`, 랭킹 · 기록에는 안 셈)이 열려요 — 고급 AI 가 고른 수(들) 안에 있으면 ✅ 해냄.
- **기록**: shell 이 판마다 `{ id, gv, mode, n, seed, cfg, seats, me, acts:[{s,a,h}|{adv:1}], fp, ranks }` 를 쌓아요 (`h` = 사람이 둔 수). 복기 = `init({n,seed,cfg})` 에 `apply` · `advance` 를 그대로 다시 먹임 → 끝 상태의 전체 지문(`fp`)이 다르면 '재생이 달라요' 로 막아요.
- **게임이 지킬 약속** (`node survival/test/replay_check.js --g <id>` 로 확인 — 못 지키면 복기가 안 켜져요)
  1. 같은 `seed` + 같은 `cfg` + 같은 행동 순서 = 같은 판. `init` · `apply` · `advance` · `view` 안에서 `Math.random` · `Date.now` · 시계 · `localStorage` 를 쓰지 말고 `st` 안의 씨앗 난수만 써요 (시험이 재생 중 함정을 걸어 던지게 해요).
  2. `view(st, seat)` 는 `st` 를 바꾸지 않아요. 안 먹은 `apply`(엉뚱한 행동 · 차례 아닌 자리)도 `st` 를 바꾸지 않아요. `ai(view, …)` 도 받은 `view` 를 바꾸지 않아요 (복기가 같은 view 로 고급 AI 를 다시 불러요).
  3. `ui.render(stage, V, ctx)` 가 `view(st, 'all')`(모든 자리 패 공개) · `ctx.me = -1` · `ctx.canAct = false` · `ctx.mode = "watch"` 로도 멀쩡히 그려져야 해요 (AI 구경과 같은 길).
- **게임이 채우는 고리 (모두 선택 — 없어도 열려요, 다만 글이 밋밋)**
  - `ui.actText(a, V, names) → "베팅 3칩"` : 행동 한 줄 글. `V` 는 그 수를 두기 *전* 그 자리 view (직전 수를 보여 줄 때는 `null` 일 수 있음 — 없어도 쓸 수 있게). 없으면 `{t:"bet", n:3}` 를 `bet n 3` 처럼 그대로 보여 줘서 사람이 읽기 힘들어요.
  - `ui.review(Vbefore, seat, myA, bestA, info) → { sev, why, my?, best? }` : 내 수(`myA`)가 고급 AI 의 수(`bestA`)와 다를 때 **얼마나 아쉬운지** `sev` 0~100 (≥ 60 이면 📒 에 담김, 같은 수면 안 불려도 됨) + `why` **숫자 근거 한 줄**(예 "남은 카드 7 이상이 3장이라 이길 확률 ~40% 인데 베팅이 커서 기대 −2칩"). `info = { k, names, same, tally:[{a,n}], total, seed }`. 없으면 같음 / 다름 + "같은 수가 아니어도 틀린 것은 아니에요" 만 나와요.
  - `ui.coach(V, me, since, names)` 는 복기에서도 불려요 (`since = -1`) — 그때 선생님의 💡 가 '그때 선생님: …' 줄로 나와요.
- **README 밖의 것은 shell 이**: 기록 저장(`localStorage sv.rev.v1`, 최근 10판 · 150KB 이하) · 📒 담기(`common/mistakes.js` 의 `survival`) · 친구랑 손님 전달 · 복기 화면 · 연습 판.

## 품질 관문 (게임 하나마다 — 총괄 기준 `survival-quality.md` 5번)
`selftest` 실패 0 → `node survival/test/<id>_ui.js` → **`node survival/test/replay_check.js --g <id>`**(복기 약속) → **`node survival/test/tier_bench.js --g <id>`**(고급이 초급을 이기는지: 실력 게임 65% · 운이 큰 게임은 `LUCK` 표에 한 줄 올려 55%) → `node survival/test/shell_ui.js --only <id>`(혼자 끝까지 + 🎞️ 복기 열림 · 끝까지 넘김) → `node test/qa/run.js --quick --no-selftest --games survival` → llm-bridge 교차 리뷰 → push → 총괄에 한 줄. 방송과 같은 설명(howto · 1분 규칙 · `src` 에 확인한 회차 · 영상), AI 선생님 세 줄 + 숫자 근거도 이 관문의 일부예요.

## 시험
| 무엇 | 명령 (`C:\Users\1\Claude-Benny\game` 에서) |
|---|---|
| core 한 게임 | `node survival/test/<id>_selftest.js` |
| ui 한 게임 (가상 틀) | `node survival/test/<id>_ui.js [--shots <임시 폴더>]` |
| 껍데기 + 모든 게임 혼자(AI) 끝까지 + 🎞️ 복기 열림 · 끝까지 넘김 | `node survival/test/shell_ui.js [--prog blood] [--only id,id] [--shots <폴더>]` |
| 복기 약속 (같은 씨앗 · 같은 행동 = 같은 판 · view · 안 먹은 apply · ai 가 상태를 안 바꿈) | `node survival/test/replay_check.js [--g id,id] [--runs 2]` — 목록 전 게임, 어긋나면 종료 코드 1 |
| AI 3단계가 실제로 다른가 (고급 vs 초급 N판) | `node survival/test/tier_bench.js [--g id,id] [--runs 200] [--md 표.md]` — 읽는 법은 파일 맨 위 |
| 아케이드 QA | `node test/qa/run.js --quick --no-selftest --games survival` — 어댑터(`test/qa/adapters/survival.js`)가 `list/*.js` 를 읽어 **목록 전 항목**을 하나씩 (방송 칸 → 시즌 칸 → 카드 → 혼자 → 시작 → 끝까지), 폰 375×667 · 판 화면은 한 화면(세로 스크롤 없음) · 콘솔 오류 0. 새 게임은 목록에만 올리면 자동으로 검사에 들어옴 |

시험은 소리를 끄고(`--mute-audio`), 빈 포트를 잡고(8860 부터), 끝나면 브라우저와 서버를 닫아요. 시험 손잡이: `window.__survival` (`ready` · `LIST` · `ORDER` · `ensure(id)` · `pick(id, tab)` · `fast` · `pause` · `autoAct` · `probe` · `fp` · `round`).

## 새 게임 올리는 순서 (일꾼)
1. `games/<id>/core.js` · `ui.js` + `test/<id>_selftest.js` · `<id>_ui.js` 를 만들고 모두 통과시켜요.
2. 자기 `list/<이름>.js` 에 한 줄 추가 (`v: 1`). 고치면 `v` 를 올려요.
3. `node survival/test/replay_check.js --g <id>` (복기 약속) · `node survival/test/tier_bench.js --g <id>` (AI 단계) 통과.
4. `node survival/test/shell_ui.js --only <id>` 로 진짜 틀에서 한 판 끝까지 + 복기 열림.
5. 경로를 적어 커밋 (`git commit -- <내 경로>`), push. `ui.actText` · `ui.review` 는 위 '복기' 칸대로 채우면 복기 글이 좋아져요.
