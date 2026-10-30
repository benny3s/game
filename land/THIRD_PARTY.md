# 땅따먹기 — 가져다 쓴 남의 코드 · 살펴보고 안 쓴 것

모두 **브라우저 그리기·효과용**이고, 규칙(`core.js`)·봇(`bots.js`)·학습 환경(`env.js`)은 아무것도 안 씀 (Node 에서 그대로 돎).
CDN(jsdelivr)에서 **정확한 버전**으로 불러옴. 못 불러와도 게임은 됨 (평범한 결·선으로 대신 그림).
라이선스는 GitHub 의 LICENSE 파일과 npm `package.json` 의 `license` 칸을 직접 읽어 확인함 (2026-10-30).

## 쓰는 것

| 이름 | 버전 · 주소 | 라이선스 | 어디에 |
|---|---|---|---|
| simplex-noise (Jonas Wagner) | 4.0.3 · https://github.com/jwagner/simplex-noise.js · `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/cjs/simplex-noise.js` | MIT | 크레파스 결 타일(이음매 없는 4D 잡음) · 종이 결 · 땅 테두리를 손그림처럼 흔드는 꼭짓점 잡음 (`art.js`, `render.js`) |
| Rough.js (Preet Shihn) | 4.6.6 · https://github.com/rough-stuff/rough · `https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js` | MIT | 손그림 종이 테두리(닿으면 아웃) · 아웃된 자리 크레파스 낙서 자국 · 다시 태어날 때 동그라미 (`render.js`, 한 번 그려 작은 캔버스에 담아 씀) |
| canvas-confetti (Kiril Vatev) | 1.9.3 · https://github.com/catdad/canvas-confetti · `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js` | ISC | 1등 했을 때 색종이 (공통 `Cozy.confetti()` 가 있으면 씀) |
| Jua · Gowun Dodum (Google Fonts) | 사이트 공통 글꼴 | SIL OFL 1.1 | 글자 (게임 판 위 `+3.4%`·`나` 표시도 Jua) |

- simplex-noise 4.x 는 ES 모듈/CommonJS 만 있어서, `index.html` 에서 `window.exports = {}` 를 잠깐 만들어 CommonJS 파일을 불러온 뒤 `window.SimplexNoiseLib` 로 옮기고 지움 (규칙 4: 모듈 없이 보통 script).
- 이모지(🐱🐶…)는 기기 글꼴 글자일 뿐 그림 파일을 쓰지 않음.
- 소리는 공통 `common/cozy.js` 의 `Cozy.sfx`(Web Audio 로 직접 만듦)에 이 게임 소리를 더한 것 (`sound.js`), 소리 파일 없음.

## 살펴보고 안 쓴 것 (왜)

| 이름 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| nipplejs (Yoann Moinet) | MIT (LICENSE 확인) | 아날로그 조이스틱(끌기)이라, 칸 단위로 네 방향 '톡' 도는 이 게임엔 둥근 4단추가 더 정확함. 단추 4개는 20줄이고 cozy 모양·여러 손가락도 그대로 됨 |
| Hammer.js | MIT | 2016년 뒤로 멈춤. 밀기를 손을 뗄 때 알려 줘서, 손가락이 움직이는 순간 바로 돌아야 하는 이 게임과 안 맞음 → Pointer Events 로 직접 (16px 움직이면 바로 돎, 떼지 않고 또 밀어도 됨) |
| Twemoji (CC-BY 4.0) · Noto Emoji (Apache-2.0) · OpenMoji (CC-BY-SA 4.0) 동물 얼굴 | 위와 같음 | 판 위 머리로 쓰려면 플레이어 색으로 바꾸고, 가는 쪽을 보고, 깜빡이고, 신남·놀람 표정이 필요해서 코드로 직접 그림 (`art.js` `face()`) |
| d3-contour (marching squares) | ISC | 땅을 둥근 등고선으로 그리면 땅 먹을 때마다 그 사람 땅 전체를 다시 그려야 함. 칸 꼭짓점 흔들기는 바뀐 곳만 다시 그려도 이음매가 없음 |
| 'paper.io 따라 만들기' 류 저장소 | 여러 가지 | 특정 상업 게임을 따라 만든 것이라 규칙 2 로 제외. 바깥에서 물 채우기(flood fill)로 둘러싼 칸 찾기는 몇 줄이라 직접 짜고 시험함 |
| Howler.js | MIT | 소리 파일을 안 쓰고 Web Audio 로 바로 만들므로 필요 없음 |
| 이징 함수 묶음 | 여러 가지 | backOut · cubicOut 두 줄짜리 표준 식을 바로 씀 |
