# 가져다 쓴 것 · 살펴보고 안 쓴 것

## 쓰는 것

| 이름 | 어디서 · 판 | 라이선스 (확인한 곳) | 무엇에 |
|---|---|---|---|
| canvas-confetti | https://github.com/catdad/canvas-confetti · npm `canvas-confetti@1.9.3`, `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js` (고정 판, 저장소에 넣지 않음) | ISC, Copyright (c) 2020 Kiril Vatev — 저장소 LICENSE 와 npm `license` 칸 확인 | 크게 이겼을 때 색종이 (`Cozy.confetti()` 가 있으면 씀, 못 불러오면 cozy.js 의 CSS 색종이) |
| mulberry32 | Tommy Ettinger 의 공개 난수 함수 (널리 쓰이는 몇 줄짜리) | 공개 도메인 (CC0 취지로 공개) | `core.js` 의 씨앗 난수 (섞기·다음 판 씨앗), AI 난수 |
| Jua · Gowun Dodum 글꼴 | Google Fonts (사이트 공통, `common/cozy.css` 규칙대로 `<link>` 로) | SIL Open Font License 1.1 | 글자 · 패 모서리 숫자 |
| 사이트 공통 `common/cozy.css` · `common/cozy.js` | 이 저장소 | 저장소 자체 | 모양 · 창 · 알림 · 소리(Web Audio) · 두 번 눌러 나가기 · 처음 안내 |

패 그림(`cards.js`)·규칙 코어·AI·화면은 모두 이 폴더에서 새로 썼어요. 특정 상업 고스톱 앱의 화면·그림·소리·수치를 흉내 내지 않았어요 (화투의 전통 그림 소재 — 달마다 식물, 학·달·봉황·비 같은 — 만 따르고, 모양은 둥근 파스텔로 새로 그림).

## 살펴보고 안 쓴 것 (2026-10-30)

| 후보 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| Wikimedia Commons "SVG Hwatu" 한국식 화투 48장 (Louie Mantia Jr. 원작 → Marcus Richert · Spenĉjo · Pk0001 수정, 예: File:Hwatu_January_Hikari.svg) | CC BY-SA 4.0 (각 파일 설명 페이지 확인) | 그림은 좋지만 ① 빨강·검정 전통 색이라 냥도쿠 가족의 파스텔 모양과 안 어울리고 ② 한 장 약 49KB(48장 ≈ 2.3MB) ③ 휴대폰 바닥 크기(약 44px)에서는 가는 선이 뭉개지고 ④ 초보용 모서리 표(월·광·띠·쌍피)를 새로 얹어야 함. 그래서 같은 소재로 둥근 그림을 새로 그림 (내려받거나 베끼지 않음) |
| Wikimedia Commons 일본 하나후다 SVG (Louie Mantia) | CC BY-SA 4.0 | 일본식(11·12월 순서·글자)이라 한국 화투와 다름 |
| github.com/ctbot000/go-stop-game (브라우저 맞고, 규칙 엔진 · AI · 테스트 있음) | README 에 MIT 라 적힘, 그림은 CC BY-SA | 별 0 · 커밋 5개의 개인 연습 저장소라 '믿을 만한 프로젝트' 기준에 못 미침. 규칙도 이 게임과 달라(멍박·3고 계산 등) 그대로 못 씀 |
| github.com/jokm1/freegostop | LICENSE 파일 없음 ("자유롭게 사용" 문구만) | Unity(C#) · 라이선스 불분명 |
| github.com/iyagicom/GoStopIyagi | LICENSE 내용 확인 못 함, 소스 안 보임 | 쓸 수 있는 코드가 없음 |
| GitHub 주제 gostop · hwatu 의 나머지 저장소 | — | 정산 계산기 · 기록 앱 · 홍보 사이트라 규칙 엔진이 아님 |
| 범용 MCTS 라이브러리 | (여러 가지) | 숨은 정보 카드 게임에는 결정화(보이는 정보에 맞게 섞기)가 핵심이라 코어 API(`view` · `sampleWorld`) 위에 몇십 줄로 직접 쓰는 게 더 맞음 |
| 움직임 라이브러리 (GSAP · anime.js) | GSAP 은 자체 라이선스(허용 목록 밖), anime.js 는 MIT | 브라우저 기본 Web Animations API 로 충분해서 안 씀 |
