# 장기 — 가져다 쓴 것 · 살펴보고 안 쓴 것

## 쓰는 것

| 이름 | 어디서 · 판 | 라이선스 | 무엇에 |
|---|---|---|---|
| **neil-armstrong-fig/janggi** 의 규칙 엔진 (`engine/`) | https://github.com/neil-armstrong-fig/janggi (커밋 `e94c05bd`, 2026-10-13) | MIT (Copyright (c) 2026 Neil Armstrong) — 아래에 전문 | **규칙 판단을 옮겨 옴** (코드 자체는 붙여 넣지 않고, 우리 배열 구조로 새로 씀): 궁성 대각선은 금이 그어진 곳만(가운데 4 · 모서리 1 · 변 0) · 포(다리 하나 · 포는 다리 X · 포는 못 잡음 · 궁성 모서리→모서리) · 졸은 적 궁성에서 앞 대각선만 · 마/상의 멱(상은 두 점) · 궁/사는 제 궁성 안 · 장군 받는 중엔 한수 쉼 X · 둘 다 연달아 쉬면 점수 · 빅장 무승부/점수 · 점수(차13 포7 마5 상3 사3 졸2, 한 덤 1.5) · 처음 판 초 31수. `test/selftest.js` 의 기물 시험 몇 개는 그 저장소 시험(`*.test.ts`)의 국면을 옮긴 것이고, 시험 안의 '곧이곧대로 쓴 두 번째 생성기'도 그 엔진의 짜임(선 · 꺾어 가기 · 궁성 걸음)을 따라 따로 씀 |
| Noto Serif KR 글꼴 (한자 11자만: 車包馬象士卒兵將帥楚漢) | Google Fonts `css2?family=Noto+Serif+KR:wght@900&text=…` | SIL Open Font License 1.1 (사이트의 Jua · Gowun Dodum 과 같은 글꼴 라이선스) | 기물 위 한자. 못 불러오면 기기의 명조 글꼴로 |
| **canvas-confetti** | https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.js | ISC (Copyright (c) 2020, Kiril Vatev) | 이겼을 때 색종이 (`Cozy.confetti()`) |
| common/* | 이 사이트 공통 (cozy · coach · hotseat · arena · arena-ui · arena-mock · me) | — | 메뉴 · 창 · 소리 · AI 선생님 창 · 자리 고르기 · 친구랑 방 |

라이선스는 2026-10-30 에 저장소의 `LICENSE` 파일(raw.githubusercontent.com)과 GitHub API(`license.spdx_id = MIT`)를 직접 읽고 확인했어요.

### neil-armstrong-fig/janggi — MIT License (전문)

```
MIT License

Copyright (c) 2026 Neil Armstrong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 직접 만든 것

- `core.js` — 규칙 전부 (9×10 배열 · 미리 계산한 줄/걸음 표 · 거꾸로 표로 공격 확인 · 상차림 4가지 · 장군/외통 · 빅장 · 한수 쉼 · 같은 국면 세 번 · 수 제한 · 점수 · 기보 글자 '79졸78' · 학습 입력). 결정적, Node·브라우저·워커 공용
- `ai.js` — 장기 엔진: 증분 판(조브리스트 · 점수 · 칸 값) · 반복 심화 알파베타(PVS) · 치환표 · 정지 탐색(잡는 수 · 장군 피하기) · MVV-LVA · 킬러/히스토리 · 널 무브(= 한수 쉼) · LMR · 장군 연장 · 빅장/점수 끝 이해 · AI 선생님 까닭(공짜로 잡힘 · 장군 피하기 · 멍군 · 잡힐 기물 피하기 · 지키기 · 노리기 · 빅장)
- `board.js`(나뭇결 판 · 팔각 기물 · 누르기) · `main.js`(화면 · 상차림 · 친구랑) · 소리는 Web Audio 합성 (나무 기물 '딱')

## 살펴보고 안 쓴 것

| 이름 | 라이선스 | 안 쓴 까닭 |
|---|---|---|
| neil-armstrong-fig/janggi 의 봇 (Fairy-Stockfish 사용) | GPL-3.0 (Fairy-Stockfish) | GPL 금지 — 봇 쪽 파일은 열어 보지도, 가져오지도 않음 |
| Fairy-Stockfish · ffish.js | GPL-3.0 | GPL |
| pychess-variants (장기 규칙 · 그림) | AGPL-3.0 | 허용 목록 밖 |
| neil-armstrong-fig/janggi 코드 그대로 (TypeScript) | MIT | 쓸 수는 있지만 객체 · 배열 복사 위주라 수읽기(초당 수십만 국면)에 느리고 빌드가 필요함 → 규칙만 옮겨 배열 구조로 새로 씀 |
