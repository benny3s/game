/* 베니큐브 규칙 시험 — node game/cube/test/selftest.js
   규칙 (전통 터키 '오케이' 바탕, 각자 받침대에서 묶음을 다 맞추면 이김 · 테이블에 내려놓고 바꾸는 방식은 없음):
   · 타일 106장: 4색 × 1~13 × 2벌 (id 0~103: 색 = floor(id/26), 숫자 = id%26%13+1) + 고양이 타일 2장 (id 104·105)
   · '쉬움' 규칙: 고양이 타일 = 만능. '전통' 규칙: 처음에 표시 타일 한 장을 뒤집고, 같은 색 숫자+1(13 다음은 1)이 만능(2장),
     고양이 타일은 그 만능 타일의 '얼굴'(색·숫자)로만 씀
   · 묶음: 같은 숫자 다른 색 3~4장 / 같은 색 이어진 숫자 3장 이상 (13→1 으로 넘어가지 않음)
   · 나눠 주기: 모두 14장, 첫 사람만 15장 (첫 사람은 뽑지 않고 바로 버림)
   · 차례: 뽑기(더미 맨 위 deck · 왼쪽 사람(바로 앞 차례)이 막 버린 타일 take) → 버리기(discard) — 또는 버리면서 끝내기(win)
   · 끝내기: 15장에서 한 장을 버리고 남은 14장이 전부 묶음 → 2점 / 똑같은 타일 7쌍 → 4점 / 만능 타일을 버리며 끝내면 ×2
   · 더미가 비면 그 차례 사람이 버린 뒤 무승부(나가리)
   API: create({players, rule, seed}) · tile(id) · TILES · isWild(ctx, id) · legal(state) · step(state, action) → {state, events}(원래 상태는 그대로)
        checkWin(ctx, ids14) → null | {kind, groups} · arrange(ctx, ids) → {groups, rest} · view(state, p) · obs(state, p) · OBS · hash(state)
        ctx = 상태 또는 { rule, wildFace } · 행동 = {t:"deck"} {t:"take"} {t:"discard", id} {t:"win", id} */
const path = require("path");
const Cube = require(path.join(__dirname, "..", "core.js"));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + " — got " + JSON.stringify(a) + " want " + JSON.stringify(b));
const T = (c, v, copy = 0) => c * 26 + copy * 13 + (v - 1);              // 색 c, 숫자 v 타일 id
const CAT = 104, CAT2 = 105;
const easy = { rule: "easy", wildFace: null };

// ── 타일
eq(Cube.tile(0), { c: 0, v: 1, cat: false }, "tile 0");
eq(Cube.tile(25), { c: 0, v: 13, cat: false }, "tile 25 (2벌째 13)");
eq(Cube.tile(26 * 3 + 12), { c: 3, v: 13, cat: false }, "tile 색3 13");
eq(Cube.tile(104).cat, true, "고양이 타일");
ok(Cube.TILES === 106, "타일 수 106");

// ── 나눠 주기
for (const n of [2, 3, 4]) {
  const s = Cube.create({ players: n, rule: "easy", seed: 7 });
  eq(s.hands.map(h => h.length), [15, ...Array(n - 1).fill(14)], n + "명 나눠 주기");
  ok(s.deck.length === 106 - 15 - 14 * (n - 1), n + "명 더미 수");
  ok(s.turn === 0 && s.phase === "discard", "첫 사람은 바로 버리기");
  const all = [...s.deck, ...s.hands.flat()].sort((a, b) => a - b);
  ok(all.length === 106 && all.every((x, i) => x === i), "타일이 빠지거나 겹치지 않음");
  ok(JSON.stringify(s) === JSON.stringify(JSON.parse(JSON.stringify(s))), "상태는 JSON 그대로");
}
{ // 전통 규칙: 표시 타일과 만능
  const s = Cube.create({ players: 2, rule: "classic", seed: 11 });
  ok(s.indicator != null && !Cube.tile(s.indicator).cat, "전통: 표시 타일 (고양이 아님)");
  const it = Cube.tile(s.indicator), wf = Cube.tile(s.wildFace);
  ok(wf.c === it.c && wf.v === (it.v === 13 ? 1 : it.v + 1), "전통: 만능 = 같은 색 숫자+1");
  ok(Cube.isWild(s, s.wildFace) && Cube.isWild(s, (s.wildFace % 26 + 13) % 26 + Math.floor(s.wildFace / 26) * 26), "만능 두 벌 모두");
  ok(!Cube.isWild(s, CAT), "전통: 고양이는 만능 아님");
  const all = [...s.deck, ...s.hands.flat(), s.indicator].sort((a, b) => a - b);
  ok(all.length === 106 && all.every((x, i) => x === i), "전통: 표시 타일 포함 106장");
}
ok(Cube.isWild(Cube.create({ players: 2, rule: "easy", seed: 1 }), CAT), "쉬움: 고양이 = 만능");

// ── 묶음·끝내기 판정
const groupsHand = [T(0, 1), T(0, 2), T(0, 3), T(1, 5), T(2, 5), T(3, 5), T(2, 7), T(2, 8), T(2, 9), T(2, 10), T(0, 12), T(1, 12), T(3, 12), T(3, 12, 1)];
ok(groupsHand.length === 14, "시험 손패 14장");
ok(Cube.checkWin(easy, groupsHand) === null, "같은 숫자 묶음에 같은 색 두 장(3,12 두 벌)이면 안 됨");
const good = [T(0, 1), T(0, 2), T(0, 3), T(1, 5), T(2, 5), T(3, 5), T(2, 7), T(2, 8), T(2, 9), T(2, 10), T(0, 12), T(1, 12), T(3, 12), T(2, 12, 1)];
const w = Cube.checkWin(easy, good);
ok(w && w.kind === "groups", "묶음으로 끝내기");
ok(w && w.groups.flat().sort((a, b) => a - b).join() === good.slice().sort((a, b) => a - b).join(), "끝내기 묶음이 손패 전체");
ok(w && w.groups.every(g => g.length >= 3), "묶음은 3장 이상");
ok(Cube.checkWin(easy, [T(0, 12), T(0, 13), T(0, 1), T(1, 4), T(1, 5), T(1, 6), T(2, 4), T(2, 5), T(2, 6), T(3, 9), T(3, 10), T(3, 11), T(3, 12), T(3, 13)]) === null, "13→1 넘어가는 줄은 안 됨");
ok(!!Cube.checkWin(easy, [T(0, 1), CAT, T(0, 3), T(1, 5), T(2, 5), T(3, 5), T(2, 7), T(2, 8), T(2, 9), T(2, 10), T(0, 12), T(1, 12), T(3, 12), T(2, 12, 1)]), "쉬움: 고양이가 빈 칸(0색 2)을 채움");
ok(!!Cube.checkWin(easy, [T(0, 1), CAT, CAT2, T(1, 5), T(2, 5), T(3, 5), T(2, 7), T(2, 8), T(2, 9), T(2, 10), T(0, 12), T(1, 12), T(3, 12), T(2, 12, 1)]), "쉬움: 고양이 두 장");
const pairs = [T(0, 1), T(0, 1, 1), T(1, 4), T(1, 4, 1), T(2, 9), T(2, 9, 1), T(3, 13), T(3, 13, 1), T(0, 7), T(0, 7, 1), T(1, 2), T(1, 2, 1), T(2, 11), T(2, 11, 1)];
const wp = Cube.checkWin(easy, pairs);
ok(wp && wp.kind === "pairs", "일곱 쌍 끝내기");
ok(!!Cube.checkWin(easy, [...pairs.slice(0, 13), CAT]) && Cube.checkWin(easy, [...pairs.slice(0, 13), CAT]).kind === "pairs", "일곱 쌍: 고양이가 짝을 채움");
ok(Cube.checkWin(easy, [T(0, 1), T(1, 1), T(2, 1), T(3, 1), T(0, 1, 1)].concat(groupsHand.slice(5, 14))) === null || true, "판정이 예외 없이 끝남");
ok(Cube.checkWin(easy, good.slice(0, 13)) === null, "13장이면 끝내기 아님");
{ // 전통: 고양이는 만능 타일의 얼굴(색·숫자)로만
  const s = Cube.create({ players: 2, rule: "classic", seed: 3 });
  const f = Cube.tile(s.wildFace), c1 = (f.c + 1) % 4, c2 = (f.c + 2) % 4, c3 = (f.c + 3) % 4;
  const lo = Math.min(f.v, 11);
  const runF = [lo, lo + 1, lo + 2].map(v => v === f.v ? CAT : T(f.c, v));      // 고양이가 (f.c, f.v) 자리
  const rest = [T(c2, 6), T(c3, 6), T(c1, 6), T(c2, 9), T(c2, 10), T(c2, 11), T(c2, 12), T(c2, 13), T(c3, 1), T(c3, 2), T(c3, 3)];
  ok(rest.length === 11 && !!Cube.checkWin(s, [...runF, ...rest]), "전통: 고양이가 만능 얼굴 자리에서 묶음");
  ok(Cube.checkWin(s, [T(c1, 1), T(c1, 2), CAT, ...rest]) === null, "전통: 고양이를 아무 자리에나 쓰면 안 됨");
}

// ── 묶음 정리 (화면·AI 용): 묶음에 든 타일이 최대가 되게
{
  const a = Cube.arrange(easy, [T(0, 1), T(0, 2), T(0, 3), T(0, 4), T(1, 9), T(2, 9), T(3, 9), T(1, 13), T(2, 2)]);
  ok(a.groups.flat().length === 7 && a.rest.length === 2, "정리: 4줄 + 3장 묶음, 남는 2장 (" + JSON.stringify(a) + ")");
}

// ── 차례 흐름
{
  let s = Cube.create({ players: 3, rule: "easy", seed: 5 });
  let L = Cube.legal(s);
  ok(L.every(a => a.t === "discard" || a.t === "win") && L.filter(a => a.t === "discard").length === 15, "처음: 버리기 15가지");
  const d0 = s.hands[0][0];
  let r = Cube.step(s, { t: "discard", id: d0 });
  ok(r.state !== s && s.hands[0].length === 15, "step 은 원래 상태를 바꾸지 않음");
  s = r.state;
  ok(s.turn === 1 && s.phase === "draw" && s.discards[0].slice(-1)[0] === d0, "버리면 다음 사람 뽑기, 내 버림 더미 맨 위");
  L = Cube.legal(s);
  ok(L.some(a => a.t === "deck") && L.some(a => a.t === "take"), "뽑기: 더미 또는 왼쪽 사람 타일");
  const top = s.deck[s.deck.length - 1];
  r = Cube.step(s, { t: "take" }); s = r.state;
  ok(s.hands[1].includes(d0) && s.discards[0].length === 0 && s.phase === "discard", "왼쪽 사람 타일 가져오기");
  ok(s.deck[s.deck.length - 1] === top, "가져오면 더미는 그대로");
  let bad = false; try { Cube.step(s, { t: "deck" }); } catch (e) { bad = true; }
  ok(bad, "버리기 차례에 뽑으면 오류");
  r = Cube.step(s, { t: "discard", id: s.hands[1][3] }); s = r.state;
  r = Cube.step(s, { t: "deck" });
  ok(r.state.hands[2].length === 15 && r.events.some(e => e.type === "draw"), "더미에서 뽑기 + 알림");
}
{ // 끝내기 행동과 점수
  let s = Cube.create({ players: 2, rule: "easy", seed: 9 });
  s = JSON.parse(JSON.stringify(s));
  const extra = T(1, 13, 1);
  const others = [...s.deck, ...s.hands.flat()].filter(x => !good.includes(x) && x !== extra);
  s.hands[0] = [...good, extra]; s.hands[1] = others.slice(0, 14); s.deck = others.slice(14);
  const L = Cube.legal(s);
  ok(L.some(a => a.t === "win" && a.id === extra), "끝낼 수 있으면 win 행동");
  ok(!L.some(a => a.t === "win" && a.id === good[0]), "다른 걸 버리면 끝내기 아님");
  const r = Cube.step(s, { t: "win", id: extra });
  ok(r.state.phase === "over" && r.state.winner === 0 && r.state.winKind === "groups" && r.state.points === 2, "묶음 끝내기 2점");
  ok(r.state.scores[0] === 2 && r.state.scores[1] === 0, "누적 점수");
  ok(r.events.some(e => e.type === "win"), "끝내기 알림");
  const s2 = JSON.parse(JSON.stringify(s)); s2.hands[0] = [...good, CAT];
  const r2 = Cube.step(s2, { t: "win", id: CAT });
  ok(r2.state.points === 4, "만능을 버리며 끝내면 ×2");
  const s3 = JSON.parse(JSON.stringify(s)); const ex3 = T(3, 3); s3.hands[0] = [...pairs, ex3];
  const others3 = [...s.deck, ...s.hands.flat(), ...s.discards.flat()].filter(x => !pairs.includes(x) && x !== ex3);
  s3.hands[1] = others3.slice(0, 14); s3.deck = others3.slice(14);
  ok(Cube.step(s3, { t: "win", id: ex3 }).state.points === 4, "일곱 쌍 4점");
  let bad = false; try { Cube.step(s, { t: "win", id: good[0] }); } catch (e) { bad = true; }
  ok(bad, "못 끝내는데 win 이면 오류");
}
{ // 더미가 비면: 그 차례 사람이 버린 뒤 무승부 (끝내기는 여전히 됨)
  let s = Cube.create({ players: 2, rule: "easy", seed: 2 });
  s = JSON.parse(JSON.stringify(s)); s.discards[1].push(...s.deck.splice(0));
  const r = Cube.step(s, { t: "discard", id: s.hands[0][0] });
  ok(r.state.phase === "over" && r.state.winner === -1 && r.state.points === 0, "더미가 비면 버린 뒤 무승부");
  ok(r.events.some(e => e.type === "nagari"), "무승부 알림 (nagari)");
  eq(Cube.legal(r.state), [], "끝난 판은 행동 없음");
}

// ── 남에게 보이는 모습 · 관찰 · 결정성
{
  const s = Cube.create({ players: 3, rule: "classic", seed: 21 });
  const v = Cube.view(s, 1);
  ok(JSON.stringify(v.hands[1]) === JSON.stringify(s.hands[1]), "보기: 내 손패는 그대로");
  ok(typeof v.hands[0] === "number" && v.hands[0] === 15 && typeof v.deck === "number", "보기: 남 손패·더미는 수만");
  const o = Cube.obs(s, 1);
  ok(o instanceof Float32Array && o.length === Cube.OBS, "관찰 길이 " + Cube.OBS);
  ok(Array.from(o).every(Number.isFinite), "관찰 값이 모두 수");
  const s2 = JSON.parse(JSON.stringify(s)), k = s2.hands[0].length, tmp = s2.hands[0];
  s2.hands[0] = s2.deck.slice(0, k); s2.deck = tmp.concat(s2.deck.slice(k));          // 남 손패와 더미 내용을 바꿔치기
  ok(Array.from(o).join() === Array.from(Cube.obs(s2, 1)).join(), "관찰에 남의 손패·더미 내용이 새지 않음");
}
{
  const play = seed => {
    let s = Cube.create({ players: 4, rule: seed % 2 ? "classic" : "easy", seed });
    let rng = seed * 9301 + 49297;
    const rnd = n => { rng = (rng * 9301 + 49297) % 233280; return Math.floor(rng / 233280 * n); };
    let steps = 0;
    while (s.phase !== "over" && steps < 2000) {
      const L = Cube.legal(s); const win = L.find(a => a.t === "win");
      s = Cube.step(s, win || L[rnd(L.length)]).state; steps++;
    }
    return [Cube.hash(s), s.phase, steps];
  };
  eq(play(42), play(42), "같은 씨앗 같은 결과");
  let over = 0, errs = 0;
  for (let i = 0; i < 300; i++) { try { if (play(1000 + i)[1] === "over") over++; } catch (e) { errs++; if (errs < 3) console.log(e.stack); } }
  ok(errs === 0, "무작위 300판 예외 없음 (" + errs + ")");
  ok(over === 300, "무작위 판이 모두 끝남 (" + over + ")");
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
