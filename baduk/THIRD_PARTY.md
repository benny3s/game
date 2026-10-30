# 바둑 — 가져다 쓴 오픈 소스

모두 허용 라이선스(MIT · ISC · CC0)만 썼고, 라이선스 원문을 직접 읽어 확인했습니다 (2026-10-30).

## 쓰는 것

| 이름 | 버전 · 출처 | 라이선스 | 어디에 · 무엇에 |
|---|---|---|---|
| **KataGo 신경망** `g170-b6c96-s175395328-d26788732` | https://katagoarchive.org/g170/neuralnets/g170-b6c96-s175395328-d26788732.bin.gz | **CC0** (g170 실행 신경망은 공개 도메인 — https://katagotraining.org/network_license/ ) | `model/b6c96.bkn` — AI 두뇌(정책·승률·집 차이·소유 지도). `tools/katago2bkn.js` 로 float16 변환 (4.1MB → 2.0MB), 값 자체는 그대로 |
| **KataGo 소스** (lightvector/KataGo) | https://github.com/lightvector/KataGo (master, 2026-10) | **MIT** (원문: `vendor/katago.LICENSE.txt`) | JS 로 옮겨 씀: `nn.js` 의 입력 22평면·전역 19개(`cpp/neuralnet/nninputs.cpp` fillRowV7), 모델 파일 구조(`desc.cpp`), 앞으로 계산·전역 풀링 식(`eigenbackend.cpp`) / `core.js` 의 축(사다리) 찾기(`cpp/game/board.cpp` searchIsLadderCaptured · AttackerFirst2Libs, `nninputs.cpp` iterLadders)·패 규칙 |
| **goscorer** (lightvector/goscorer) | https://github.com/lightvector/goscorer `javascript/goscorer.js` (main, 2025-04) | **MIT** (원문: `vendor/goscorer.LICENSE.txt`) | `vendor/goscorer.js` — 끝난 판 한국식 계가(빅 찾기·가짜 눈 처리). 바꾼 것: 끝의 ES module `export` 를 브라우저 전역 `goscorer` / Node `module.exports` 꼬리로만 바꿈 (파일 맨 위에 적어 둠) |
| **@sabaki/go-board** | 1.4.3 · https://github.com/SabakiHQ/go-board (npm) | **MIT** (원문: `test/vendor/sabaki-go-board.LICENSE.txt`) | `test/vendor/sabaki-go-board.js` — **시험에서만**: 무작위 대국 186판·2만 7천 수를 우리 규칙 엔진과 한 수씩 비교(따냄·자충·패·둘 수 있는 곳) |
| **canvas-confetti** | 1.9.3 · `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js` | **ISC** (Copyright (c) 2020 Kiril Vatev) | 이긴 판 색종이 (`common/cozy.js` 의 `Cozy.confetti()` 가 있으면 씀) |
| Jua · Gowun Dodum 글꼴 | Google Fonts | SIL OFL 1.1 | 사이트 공통 글꼴 (냥도쿠와 같음) |

## 직접 만든 것 (위를 바탕으로)

- `nn.js` 의 **WebAssembly SIMD conv 커널**: 외부 도구 없이 JS 로 바이트를 짜서 만든 작은 모듈(약 1KB). 출력 4채널 × 8칸 묶음 f32x4 곱셈. JS 경로와 결과 차이 < 1e-6, 약 6~10배 빠름. SIMD 가 안 되는 브라우저는 JS 경로로 자동 전환.
- `core.js` 규칙 엔진(사슬 연결 목록·조브리스트·한국식 계가 연결·강화학습 평면·8대칭·SGF 읽기/쓰기), `ai.js`(PUCT 수읽기, 단계별 수 고르기, RAVE 몬테카를로 예비 AI, 사석 추정), 화면 전체.

## 살펴봤지만 안 쓴 것 (까닭)

| 이름 | 라이선스 | 까닭 |
|---|---|---|
| @sabaki/influence 1.2.2 | MIT | 영향력 지도로 집 추정 — KataGo 소유 지도가 훨씬 정확해서 필요 없음 |
| @sabaki/deadstones 2.2.0 | MIT | 몬테카를로 사석 추정(wasm). `Date.now()` 씨앗이라 결정적이지 않고, 신경망 소유 지도로 충분. 신경망이 없을 때는 우리 플레이아웃 평균으로 대신 |
| @sabaki/sgf 3.5.0 | MIT | 우리 기보는 갈래 없는 한 줄이라 40줄짜리 읽기/쓰기로 충분 (의존성 `doken` 까지 들일 까닭 없음) |
| TensorFlow.js 4.22 / onnxruntime-web 1.31 | Apache-2.0 / MIT | 내려받을 크기가 1~10MB(wasm). 이 작은 신경망엔 손으로 짠 wasm 커널(1KB)이 더 가볍고 빠름 |
| KataGo b10c128 (g170e) | CC0 | 더 세지만 파일 11MB·계산 약 3배 — 휴대폰엔 b6c96 이 알맞음 |
| Leela Zero · GNU Go · Pachi | GPL | 허용 라이선스 아님 |
| Michi (pasky/michi) | MIT | 후보로 검토만 함 (코드 안 씀). 큰 패턴 파일은 Pachi(GPL) 유래. 신경망이 훨씬 세서 예비 MCTS 는 간단한 우리 코드로 |
