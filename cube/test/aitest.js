/* 베니큐브 AI 시험 — node cube/test/aitest.js
   3명(초급·중급·고급 한 명씩)이 300판. 자리를 돌려 가며 두어 첫 차례 이점을 없앰.
   확인: 예외 없음 · 모든 판이 끝남 · 고급 > 중급 > 초급 승률 · 남의 손패를 몰래 보지 않음 */
const path = require("path");
const Cube = require(path.join(__dirname, "..", "core.js"));
const AI = require(path.join(__dirname, "..", "ai.js"));

const LEVELS = ["easy", "normal", "hard"];
const NAMES = { easy: "🐣 초급", normal: "🐱 중급", hard: "🐯 고급" };
const GAMES = 300;
const seed0 = 20261030;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };

let errs = 0, finished = 0, nagari = 0, steps = 0;
const wins = { easy: 0, normal: 0, hard: 0 };
const points = { easy: 0, normal: 0, hard: 0 };
const byRule = { easy: { games: 0, wins: 0 }, classic: { games: 0, wins: 0 } };

for (let g = 0; g < GAMES; g++) {
  const seed = seed0 + g;
  const rule = g % 2 ? "classic" : "easy";
  const n = 3;
  const seats = [0, 1, 2].map(k => LEVELS[(k + g) % 3]);        // 자리 돌리기
  const mems = seats.map((lv, k) => AI.newMemory(seed * 7 + k * 131 + 1));
  let st = Cube.create({ players: n, rule: rule, seed: seed });
  let guard = 0;
  try {
    while (st.phase !== "over" && guard++ < 4000) {
      const p = st.turn;
      const a = AI.act(st, p, seats[p], mems[p]);
      if (!a) throw new Error("행동이 없음 (turn " + p + ")");
      st = Cube.step(st, a).state;
      steps++;
    }
  } catch (e) {
    errs++;
    if (errs <= 3) console.log(e.stack);
    continue;
  }
  if (st.phase !== "over") { errs++; continue; }
  finished++;
  if (st.winner < 0) nagari++;
  else {
    wins[seats[st.winner]]++;
    byRule[rule].wins++;
  }
  byRule[rule].games++;
  for (let p = 0; p < n; p++) points[seats[p]] += st.scores[p] || 0;
}

ok(errs === 0, "300판 예외 없음 (" + errs + ")");
ok(finished === GAMES, "300판 모두 끝남 (" + finished + ")");
const rate = lv => wins[lv] / Math.max(1, finished) * 100;
const per = lv => points[lv] / Math.max(1, finished);
console.log("베니큐브 AI 300판 (3명: 초급·중급·고급 한 명씩, 자리 돌림, 쉬움/전통 반씩)");
console.log("  끝낸 판 " + finished + "/" + GAMES + " · 무승부(나가리) " + nagari + " · 끝내기 비율 " + (finished - nagari) / Math.max(1, finished) * 100);
for (const lv of LEVELS) console.log("  " + NAMES[lv] + " 승률 " + rate(lv).toFixed(1) + "% (" + wins[lv] + "승) · 판마다 평균 " + per(lv).toFixed(2) + "점");
console.log("  규칙별: 쉬움 " + byRule.easy.wins + "/" + byRule.easy.games + " · 전통 " + byRule.classic.wins + "/" + byRule.classic.games);
console.log("  판마다 평균 " + (steps / Math.max(1, finished)).toFixed(1) + "수");

// ── 고급 > 중급 > 초급
ok(wins.hard > wins.normal, "고급 > 중급 승률 (" + wins.hard + " vs " + wins.normal + ")");
ok(wins.normal > wins.easy, "중급 > 초급 승률 (" + wins.normal + " vs " + wins.easy + ")");
ok(wins.hard > wins.easy, "고급 > 초급 승률 (" + wins.hard + " vs " + wins.easy + ")");

// ── 남의 손패·더미 내용을 보지 않음: 남의 손패와 더미를 바꿔치기해도 같은 행동
{
  const shuffleOthers = (st, me) => {
    const s = JSON.parse(JSON.stringify(st));
    const pool = [];
    for (let p = 0; p < s.n; p++) if (p !== me) pool.push(...s.hands[p]);
    pool.push(...s.deck);
    for (let i = pool.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    let k = 0;
    for (let p = 0; p < s.n; p++) if (p !== me) { const len = s.hands[p].length; s.hands[p] = pool.slice(k, k + len); k += len; }
    s.deck = pool.slice(k);
    return s;
  };
  let same = true, checked = 0;
  for (let g = 0; g < 24; g++) {
    const st = Cube.create({ players: 3, rule: g % 2 ? "classic" : "easy", seed: seed0 + g });
    st.turn = 2;
    for (const p of [0, 2]) {
      const s1 = JSON.parse(JSON.stringify(st)); s1.turn = p;
      const a1 = AI.act(s1, p, "hard", AI.newMemory(1 + g));
      const a2 = AI.act(shuffleOthers(s1, p), p, "hard", AI.newMemory(1 + g));
      checked++;
      if (JSON.stringify(a1) !== JSON.stringify(a2)) same = false;
    }
  }
  ok(same, "남의 손패·더미를 바꿔도 같은 행동 (" + checked + "번)");
}

console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
