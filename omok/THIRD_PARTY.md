# 오목 — 가져다 쓴 것 · 살펴보고 안 쓴 것

## 쓰는 것

| 이름 | 어디서 · 판 | 라이선스 | 무엇에 |
|---|---|---|---|
| **quintet** (Renju Note) | npm `@renju-note/quintet@0.11.0` · https://github.com/renju-note/quintet | MIT (Copyright (c) 2020 Renju Note) — `test/vendor/quintet/LICENSE` | **시험 전용 정답 맞추기**. `test/vendor/quintet/quintet_bg.wasm`(패키지 그대로, sha256 `5b8c8118…bfb39e`)을 `test/vendor/quintet/quintet.js`(우리 로더: 패키지의 wasm-bindgen 접착 코드 중 필요한 부분만 옮김)로 불러, 무작위 렌주 국면에서 우리 VCF 결과와 맞춰 보고 우리 VCT 첫 수를 모든 응수에 대해 다시 확인. 게임 화면은 읽지 않음 |
| quintet 의 시험 판 | `src/board/forbidden.rs` 의 시험 판들 · `benches/cases/*.txt` | MIT (위와 같음) | 렌주 금수 판정 시험(삼삼·띈 삼·가짜 삼·세 겹 판정·사사·장목)을 `test/selftest.js` 에 옮겨 적음. VCF·VCT 벤치 판 10개를 `test/cases/` 에 그대로 복사 (머리 주석의 출처 그대로: renjuportal.com 문제, Hiroshi Okabe 의 "5-moves-to-end problems") |
| **canvas-confetti** | https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js · https://github.com/catdad/canvas-confetti | ISC (Copyright (c) 2020, Kiril Vatev) | 이겼을 때 색종이 (`Cozy.confetti()` 가 있으면 씀, 못 불러오면 CSS 색종이) |
| **simplex-noise** | https://cdn.jsdelivr.net/npm/simplex-noise@2.4.0/simplex-noise.js · https://github.com/jwagner/simplex-noise.js | MIT (Copyright (c) 2018 Jonas Wagner) | 나무판 결(한 번 만들어 둠). 못 불러오면 `board.js` 안의 작은 값 잡음으로 대신 |
| Jua · Gowun Dodum | Google Fonts | SIL OFL 1.1 | 사이트 공통 글꼴 (`common/cozy.css` 와 같음) |
| common/cozy.css · cozy.js | 이 사이트 (냥도쿠에서 뽑은 공통 디자인) | — | 메뉴·카드·단추·창·알림·소리·처음 안내·나가기 확인 |

CDN 은 정확한 판 번호로 고정했습니다. 라이선스는 각 저장소/패키지의 LICENSE 파일과 npm `license` 칸에서 직접 확인했습니다.

## 살펴보고 안 쓴 것 (2026-10-30)

| 이름 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| Rapfi (github dotb1ue/rapfi, 옛 dhbloo/rapfi) | GPL-3.0 | 가장 강한 오목·렌주 엔진이지만 GPL (금지) |
| AlphaGomoku (MaciejKozarzewski) | GPL-3.0 | GPL |
| KataGomo (hzyhhzy) | KataGo 라이선스(목록 밖) | 허용 목록 밖 + C++·신경망(GPU) |
| lihongxun945/gobang (JS 오목 AI, 별 1.8k) | 라이선스 파일 없음 | 출처 불명 라이선스 → 사용 금지 |
| @algorithm.ts/gomoku 4.0.5 | MIT | 단순 미니맥스, 금수 규칙 없음 — 우리 엔진(패턴 표·VCF·VCT·금수)보다 약함 |
| renjukit 0.8.0 (renju-note/renjukit-ts) | MIT | ES 모듈만, 쓰는 곳 없음. 금수 판정이 '다섯 먼저' 예외를 빠뜨림 (quintet 이 고친 그 부분) |
| renju 1.0.1 · renju-rules 0.1.0 (npm) | MIT | 작고 검증 안 됨, 쌍삼 금지 규칙 없음 |
| quintet 를 게임 AI 에 직접 쓰기 | MIT | 렌주 규칙만 있고(쌍삼 금지·자유 없음) 도중에 멈출 수 없음 — 벤치 판 하나의 VCT 반증에 58초. 그래서 시험 정답 맞추기로만 씀 |
| WGo.js (wgo 3.0.0-alpha) | MIT | 바둑판 그리기. 떨어져 앉는 움직임·미리 보기 십자선·금수 ✕·이긴 줄 빛 같은 것과 포근한 모양을 맞추기 어려워 캔버스를 직접 그림 |
| junxiaosong/AlphaZero_Gomoku | MIT | 파이썬·작은 판(6·8줄) 신경망 — 15줄 웹에 못 씀 (나중 RL 단계 참고용) |

## 직접 만든 것

`core.js`(규칙·금수 판정·기보·대칭) · `ai.js`(패턴 표 알파베타·VCF·VCT) · `board.js`(나무판·돌·움직임) · `main.js`(화면) — 모두 이 저장소 코드.
