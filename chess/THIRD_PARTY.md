# 체스 — 가져다 쓴 것 · 살펴보고 안 쓴 것

## 쓰는 것

| 이름 | 어디서 · 판 | 라이선스 | 무엇에 |
|---|---|---|---|
| **chess.js** | npm `chess.js@1.4.0` (`dist/cjs/chess.js`) · https://github.com/jhlywa/chess.js | BSD-2-Clause (Copyright (c) 2025, Jeff Hlywa) — 전문은 `vendor/chess.js` 머리말과 `vendor/chess.js.LICENSE.txt` | 화면 쪽 규칙 전부: 합법 수 · 캐슬링 · 앙파상 · 승진 · 체크/메이트/스테일메이트 · 같은 국면 세 번 · 50수 · 기물 부족 · SAN · PGN. `vendor/chess.js` = 패키지 파일 그대로 + 브라우저·워커·Node 공용으로 감싼 몇 줄(전역 `ChessJS`)만 더함 |
| **Chessnut 기물 그림** | https://github.com/LexLuengas/chessnut-pieces (master, SVG 12장 그대로) — lichess 의 'chessnut' 세트와 같은 것 | Apache License 2.0 (Copyright 2015 Alexis Luengas) — `vendor/pieces/chessnut/LICENSE.txt` · `COPYRIGHT.txt` 같이 둠 | 판 위 기물 · 잡은 기물 · 승진 고르기 · 로고. 파일은 고치지 않음 |
| **canvas-confetti** | https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js · https://github.com/catdad/canvas-confetti | ISC (Copyright (c) 2020, Kiril Vatev) | 이겼을 때 색종이 (`Cozy.confetti()`, 못 불러오면 CSS 색종이) |
| common/* | 이 사이트 공통 (cozy · coach · hotseat · arena · arena-ui · me) | — | 메뉴·창·소리·AI 선생님 창·자리 고르기·친구랑 방 |

라이선스는 2026-10-30 에 각 패키지의 LICENSE 파일(npm 꾸러미 · GitHub 원본)을 직접 읽고 확인했습니다.
기물 그림 라이선스는 lichess 저장소 `COPYING.md` 의 표(chessnut = Apache 2.0)와 원저장소 `LICENSE.txt` 를 둘 다 봤어요.

## 직접 만든 것

- `ai.js` — 체스 엔진 전부 이 저장소 코드: 0x88 판 · 자체 수 생성(chess.js 와 perft 로 맞춰 봄) · 조브리스트 지문 · 치환표 ·
  반복 심화 알파베타(PVS) · 정지 탐색 · 널 무브 · LMR · 킬러/히스토리 · 정적 교환 계산(SEE) · 우리가 정한 칸 값 표(중반/종반 섞기) ·
  첫 수 책(잘 알려진 시작 27줄, 수순 자체는 공용 지식) · AI 선생님 까닭 찾기(포크 · 핀 · 공짜 잡기 · 피하기 · 지키기 · 캐슬링 …)
- `core.js`(chess.js 위 규칙 감싸기 · 한글 표기 · 학습 입력) · `board.js`(DOM 판 · 끌기/누르기 · 승진 고르기) · `main.js`(화면 · 친구랑) · 소리는 Web Audio 합성

## 살펴보고 안 쓴 것

| 이름 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| Stockfish / stockfish.js (npm `stockfish@19`) | GPL-3.0 | 가장 강하지만 GPL (금지) |
| sunfish (thomasahle) | GPL-3.0 | GPL |
| Lozza (op12no2) | GitHub 표시 'Other' (확인 불가) | 허용 목록 밖으로 침 |
| chessground (lichess 판 그리기) | GPL-3.0-or-later | GPL |
| cburnett 기물 (lichess 기본 · 위키백과) | lichess 표기 GPLv2+ (위키미디어는 GFDL/CC BY-SA/GPL) | 허용 목록(MIT·BSD·Apache·ISC·CC0) 밖 → Apache 2.0 인 Chessnut 을 씀 |
| js-chess-engine 2.4.6 | MIT | 쓸 수는 있지만 약하고 느림, 결정적 노드 예산·선생님 까닭(공격 정보)이 없음 → 직접 만든 엔진이 더 맞음 |
| @chrisoakman/chessboardjs 1.0.0 · cm-chessboard 8.x | MIT | jQuery/ES 모듈 · 기본 그림이 CC BY-SA. 사이트 모양(어두운 라운지)·화살표·승진 고르기를 맞추기 쉬운 DOM 판을 직접 만듦 |
