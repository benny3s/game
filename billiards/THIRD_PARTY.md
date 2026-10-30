# 가져다 쓴 것

| 이름 | 어디서 · 판 | 라이선스 (확인한 곳) | 무엇에 |
|---|---|---|---|
| canvas-confetti | https://github.com/catdad/canvas-confetti · `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js` (고정 판, 저장소에 넣지 않음) | ISC, Copyright (c) 2020 Kiril Vatev — 저장소 LICENSE · npm `license` 칸 (고스톱 THIRD_PARTY.md 와 같은 판) | 이겼을 때 색종이 (`Cozy.confetti()`, 못 불러오면 CSS 색종이) |
| mulberry32 | Tommy Ettinger 의 공개 난수 함수 (몇 줄) | 공개 도메인 (CC0 취지) | `core.js` 8볼 랙 섞기, AI 후보 흔들기 |
| 사이트 공통 `common/cozy.*` · `me.js` · `arena*.js` · `coach.js` | 이 저장소 | 저장소 자체 | 모양 · 창 · 소리 엔진 · 이름 · 친구랑 방 · AI 선생님 창 |

물리 엔진·규칙·AI·그림(당구대·공·큐)·소리(Web Audio 합성)는 모두 이 폴더에서 새로 썼어요. 외부 코드를 베끼지 않았고, 물리는 교과서에 나오는 일반 모델(미끄러짐→굴림 마찰 7/2 법칙, 공 관성 2/5 mR², 충격량 마찰)만 따랐어요.
특정 상업 당구 앱의 화면·그림·소리·수치를 흉내 내지 않았어요 — 전통 스포츠인 4구·3쿠션·8볼의 일반 규칙과 당구대 규격만 따름.

## 살펴보고 안 쓴 것 (2026-10-30)

| 후보 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| planck.js / matter.js 같은 2D 물리 엔진 | MIT | 공 회전(밀어치기·끌어치기·옆 회전)과 쿠션 회전 효과가 없고, 결정적 고정 간격·궤적 기록을 직접 다루기 어려움. 당구 공 몇 개면 직접 쓰는 편이 작고 빠름 (한 샷 약 1ms) |
