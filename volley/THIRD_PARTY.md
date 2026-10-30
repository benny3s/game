# 냥냥 배구 — 가져다 쓴 것 · 살펴보고 안 쓴 것

## 쓴 것

| 이름 | 버전 · 출처 | 라이선스 (확인 방법) | 어디에 |
|---|---|---|---|
| canvas-confetti | 1.9.4 · https://github.com/catdad/canvas-confetti · `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.js` | ISC (저장소 LICENSE 파일 직접 읽음, npm `license: ISC`) | 경기에서 이겼을 때 색종이 (`Cozy.confetti()` 가 이 라이브러리를 찾아 씀. 못 불러오면 Cozy 의 CSS 색종이로 대신) |
| mulberry32 (알고리즘) | Tommy Ettinger 가 공개한 32비트 씨앗 난수 | 퍼블릭 도메인 | `core.js` 의 `rand` (상태 안의 씨앗 난수), `bots.js` 의 봇 난수 — 직접 다시 씀 |
| FNV-1a (알고리즘) | Fowler–Noll–Vo 해시 | 퍼블릭 도메인 | `core.js` 의 `hash` (결정성 시험용 상태 지문) — 직접 다시 씀 |
| Jua · Gowun Dodum 글꼴 | Google Fonts (`fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum`) | SIL Open Font License 1.1 | 사이트 공통 글꼴 (cozy 디자인) |

저장소 안의 것 (Benny 의 코드, 제3자 아님): `common/cozy.css` · `common/cozy.js` (공통 디자인·소리 장치), 야옹 소리 만드는 법은 `nyang/sound.js` 의 `mew` 를 `sound.js` 로 옮겨 씀.

그림(고양이·공·해변·파라솔·야자수)과 소리는 모두 이 폴더 코드로 직접 그리고 만들었습니다 (그림 파일·소리 파일 없음).

## 살펴보고 안 쓴 것 (까닭)

| 이름 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| matter-js 0.20.0 (liabru/matter-js) | MIT | 범용 강체 물리. 이 게임은 원·캡슐·그물 기둥 몇 개뿐이고, 파이썬 학습 환경으로 똑같이 옮길 수 있게 삼각함수 없는 작은 결정적 물리가 필요해서 직접 씀 (아케이드 손맛도 상수로 직접 맞춤) |
| planck.js 1.5.1 (Box2D 포트) | MIT | 위와 같은 까닭. 무겁고(수백 KB) 현실적인 튕김이라 아케이드 느낌을 맞추기 어려움 |
| ZzFX 1.3.2 (KilledByAPixel/ZzFX) | MIT (LICENSE 확인) | 작은 효과음 합성기. npm 판은 ES 모듈이고 불러오자마자 자기 AudioContext 를 만들어서, 아이폰 소리 깨우기·사이트 공통 소리 켬/끔(Cozy.sfx) 과 따로 놂. Cozy.sfx 의 tone/noise + 작은 Web Audio 그래프로 통통·퍽·호루라기·와아를 만듦 |
| MainLoop.js 1.0.4 | MIT | 고정 틱 루프 도우미. 20줄 남짓이고 스매시 멈칫·일시정지·창이 떠 있을 때 멈춤을 직접 넣어야 해서 직접 씀 |
| nipplejs 1.0.4 | MIT | 가상 조이스틱. 요청이 '냥도쿠 아래 단추 줄 같은 둥근 엄지 단추'라서 Pointer Events 로 직접 (손가락마다 따로, 밀어서 옆 단추로) |
| bezier-easing 3.2.0 | MIT | 필요한 움직임이 간단한 cubic ease 몇 개뿐 |
| GAV · Slime Volley · Blobby Volley 2 등 공개 배구 게임 | GPL 계열 | 카피레프트(GPL)라 금지 · 특정 게임의 재현작이기도 함 |
| blobby_volley_js, 피카츄 배구 재현작들 | 제각각 | 특정 상용/기존 게임의 팬 재현작 → 쓰지 않기로 함 (규칙·상수·그림 모두 참고 안 함) |
| Kenney CC0 그림 묶음 · Twemoji(CC-BY) · OpenMoji(CC-BY-SA) | CC0 / CC-BY / CC-BY-SA | 고양이는 찌그러짐·늘어남·표정·털 색 4가지가 필요해서 캔버스 벡터로 직접 그리는 편이 냥도쿠 색감과 맞음 |
