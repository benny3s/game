# 베니 서바이벌 (`survival/`) — 만드는 법

방송 두뇌 서바이벌 게임을 한 곳에 모은 칸. 첫 화면은 **방송 칸 셋(데블스 플랜 → 더 지니어스 → 피의 게임) → 시즌 칸 → 게임 카드** 순서이고,
카드는 `list/*.js` 의 값만으로 그려요. 게임은 **고를 때** `games/<id>/core.js` · `ui.js` 를 불러와요 (미리 다 안 불러옴).
주소 `survival/?g=<id>` 로 바로 그 게임이 열려요.

## 파일 나눔 (주인)
| 파일 | 주인 | 비고 |
|---|---|---|
| `index.html` · `shell.js` · `style.css` · `README.md` · 루트 `games.json` · `sw.js` · `test/qa/adapters/survival.js` | 공용 틀 (sv-blood 가 맡음) | 일꾼은 고치지 않고 부탁 |
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
`name` · `emoji` · `short` · `min` · `max` · `board`(한 기기 탭 허용 — 숨은 정보가 없는 1:1 만, 지금 한 기기는 2명 고정) · `defN` · `opts [{k, label, items:[[값,글]], def}]` · `howto ['…']` · `sub(V,me)` · `chip(V,i,me) → {t,on,out}` · `render(stage, V, ctx)` · `coach(V, me, since, names) → {opp, mine, rec, why}` · `result(V, me)`(선택) · `tutorial()` (1분 규칙, 직접 해 보기 한 단계) · `qa(V, me, rnd)`(선택, 자동 시험이 내 차례에 둘 수) · `src` · `diff`.
`ctx` = `{ me, act, canAct, seats, mode, fast, coachOn, g, wait, sfx, toast }`.
- **지켜야 할 것**: `CONVENTIONS.md` — 선생님(👀 상대 흐름 · 📊 내 흐름 · 💡 추천 · 👉 수의 의미, **보이는 것만**) · 1분 규칙 · 모드 혼자(AI) · 친구랑 · AI 구경 · 기록은 `common/rank.js` 로만 (shell 이 대신 보냄) · 폰 세로 375×667 한 화면 · 콘솔 오류 0 · 조사(이/가 · 은/는)는 받침 맞춰 붙여 쓰기.
- 모델 = `games/formula/`, 시험 틀 = `test/s3ui_lib.js` (`run(id, policy, opts)`) · `test/board_ui_lib.js` (판 게임).

## 시험
| 무엇 | 명령 (`C:\Users\1\Claude-Benny\game` 에서) |
|---|---|
| core 한 게임 | `node survival/test/<id>_selftest.js` |
| ui 한 게임 (가상 틀) | `node survival/test/<id>_ui.js [--shots <임시 폴더>]` |
| 껍데기 + 모든 게임 혼자(AI) 끝까지 | `node survival/test/shell_ui.js [--prog blood] [--only id,id] [--shots <폴더>]` |
| 아케이드 QA | `node test/qa/run.js --quick --no-selftest --games survival` — 어댑터(`test/qa/adapters/survival.js`)가 `list/*.js` 를 읽어 **목록 전 항목**을 하나씩 (방송 칸 → 시즌 칸 → 카드 → 혼자 → 시작 → 끝까지), 폰 375×667 · 판 화면은 한 화면(세로 스크롤 없음) · 콘솔 오류 0. 새 게임은 목록에만 올리면 자동으로 검사에 들어옴 |

시험은 소리를 끄고(`--mute-audio`), 빈 포트를 잡고(8860 부터), 끝나면 브라우저와 서버를 닫아요. 시험 손잡이: `window.__survival` (`ready` · `LIST` · `ORDER` · `ensure(id)` · `pick(id, tab)` · `fast` · `pause` · `autoAct` · `probe` · `fp` · `round`).

## 새 게임 올리는 순서 (일꾼)
1. `games/<id>/core.js` · `ui.js` + `test/<id>_selftest.js` · `<id>_ui.js` 를 만들고 모두 통과시켜요.
2. 자기 `list/<이름>.js` 에 한 줄 추가 (`v: 1`). 고치면 `v` 를 올려요.
3. `node survival/test/shell_ui.js --only <id>` 로 진짜 틀에서 한 판 끝까지.
4. 경로를 적어 커밋 (`git commit -- <내 경로>`), push.
