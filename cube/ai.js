/* 베니큐브 AI — core API 만 씀 (브라우저·Node 공통)
   easy: 대충 (가끔 엉뚱하게 버림) · normal: arrange 로 손패 가치 · hard: 중급 + 남이 가져간 타일 기억 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./core.js"));
  else root.CubeAI = factory(root.Cube);
})(this, function (Cube) {
  "use strict";

  const LEVEL = { easy: 0, normal: 1, hard: 2 };
  // 난이도별 성격 (시험에서 조금씩 바꿔 볼 수 있게 값으로 둠)
  const PROFILES = {
    easy: { value: 1, danger: 0, randomDiscard: 0.25, randomTake: 0.5, wildKeep: 6 },
    normal: { value: 1, danger: 0, randomDiscard: 0.08, randomTake: 0, wildKeep: 25, takeNeed: 18 },
    hard: { value: 2, danger: 1, randomDiscard: 0, randomTake: 0, wildKeep: 32, takeNeed: 12 },
  };

  // ── 손패 살피기 ─────────────────────────────────────────
  // 타일의 얼굴 번호. 만능은 -1, 전통의 고양이는 만능 얼굴.
  function faceOf(st, id) {
    if (Cube.isWild(st, id)) return -1;
    const t = Cube.tile(id);
    if (t.cat) {
      if (st.wildFace == null) return -1;
      return Math.floor(st.wildFace / 26) * 13 + (st.wildFace % 26);
    }
    return t.c * 13 + (t.v - 1);
  }

  function tally(st, ids) {
    const counts = new Uint8Array(52);
    let wilds = 0;
    for (let i = 0; i < ids.length; i++) {
      const f = faceOf(st, ids[i]);
      if (f < 0) wilds++; else counts[f]++;
    }
    return { counts: counts, wilds: wilds };
  }

  // 초급·중급: 완성 묶음에 든 타일 수 × 100 + 만능 지킴
  function basicValue(st, ids, wildKeep) {
    const a = Cube.arrange(st, ids);
    let n = 0;
    for (let i = 0; i < a.groups.length; i++) n += a.groups[i].length;
    let wilds = 0;
    for (let i = 0; i < ids.length; i++) if (Cube.isWild(st, ids[i])) wilds++;
    return n * 100 + wilds * (wildKeep == null ? 25 : wildKeep);
  }

  // 고급: 완성 묶음 + 반쯤 맞은 묶음(같은 숫자 다른 색, 이어진 숫자) + 일곱 쌍 가능성
  function strongValue(st, ids, wildKeep) {
    const a = Cube.arrange(st, ids);
    let n = 0;
    for (let i = 0; i < a.groups.length; i++) n += a.groups[i].length;
    const t = tally(st, ids), c = t.counts;
    let pot = 0;
    for (let num = 0; num < 13; num++) {
      let colors = 0, pairs = 0;
      for (let col = 0; col < 4; col++) {
        const x = c[col * 13 + num];
        if (x) colors++;
        if (x >= 2) pairs++;
      }
      if (colors === 2) pot += 7;
      else if (colors === 3) pot += 17;
      else if (colors === 4) pot += 30;
      pot += pairs * 4;                              // 같은 얼굴 두 장 (일곱 쌍)
    }
    for (let col = 0; col < 4; col++) {
      const base = col * 13;
      for (let num = 0; num < 13; num++) {
        if (!c[base + num]) continue;
        if (num < 12 && c[base + num + 1]) pot += 7;
        if (num < 11 && c[base + num + 2]) pot += 13;
      }
    }
    return n * 100 + t.wilds * (wildKeep == null ? 32 : wildKeep) + Math.min(pot, 90);
  }

  function valueOf(st, ids, prof) {
    return prof.value >= 2 ? strongValue(st, ids, prof.wildKeep) : basicValue(st, ids, prof.wildKeep);
  }

  // ── 남이 가져간 타일 기억 (고급) ──────────────────────────
  function newMemory(seed) {
    return { piles: null, took: new Uint16Array(52), rng: (seed | 0) || 1 };
  }

  function rnd(mem) {
    let a = (mem.rng + 0x6D2B79F5) | 0;
    mem.rng = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // 버림 더미가 줄어든 만큼 = 누군가 가져간 타일
  function remember(st, mem) {
    if (!mem.piles) { mem.piles = st.discards.map(function (x) { return x.slice(); }); return; }
    for (let i = 0; i < st.discards.length; i++) {
      const cur = st.discards[i], prev = mem.piles[i] || [];
      if (cur.length >= prev.length) continue;
      let same = true;
      for (let j = 0; j < cur.length; j++) if (cur[j] !== prev[j]) { same = false; break; }
      if (!same) continue;
      for (let j = cur.length; j < prev.length; j++) {
        const f = faceOf(st, prev[j]);
        if (f >= 0) mem.took[f]++;
      }
    }
    mem.piles = st.discards.map(function (x) { return x.slice(); });
  }

  // 한 수 둘 때마다 모든 자리의 기억에 알려 주는 곳 — act 는 자기 차례에만 불려서 그 사이 남이 가져간 타일을 놓침
  function observe(st, mem) { if (st && mem) remember(st, mem); }

  // 이 타일을 버리면 남이 좋아할까 (고급)
  function danger(st, p, id, mem) {
    if (Cube.isWild(st, id)) return 500;
    const f = faceOf(st, id);
    if (f < 0) return 0;
    let d = 0;
    if (mem.took[f]) d += 26 + Math.min(mem.took[f], 2) * 5;
    const num = f % 13, col = (f - num) / 13;
    const near = function (ff) { return mem.took[ff] ? 11 : 0; };
    if (num > 0) d += near(col * 13 + num - 1);
    if (num < 12) d += near(col * 13 + num + 1);
    for (let c = 0; c < 4; c++) if (c !== col) d += near(c * 13 + num) * 0.6;
    let thrown = 0;
    for (let i = 0; i < st.discards.length; i++) {
      const pile = st.discards[i];
      for (let j = 0; j < pile.length; j++) if (faceOf(st, pile[j]) === f) thrown++;
    }
    d -= thrown * 6;                                 // 여러 번 버려진 얼굴은 안전
    return Math.max(0, d);
  }

  // ── 버릴 타일 고르기 ────────────────────────────────────
  function chooseDiscard(st, p, prof, mem) {
    const hand = st.hands[p], val = function (ids) { return valueOf(st, ids, prof); };
    if (prof.randomDiscard && rnd(mem) < prof.randomDiscard) return { t: "discard", id: hand[(rnd(mem) * hand.length) | 0] };

    const seen = {}, cands = [];
    for (let i = 0; i < hand.length; i++) {
      const id = hand[i], f = faceOf(st, id), wild = Cube.isWild(st, id);
      const key = wild ? "w" : String(f);
      if (seen[key] !== undefined) { seen[key]++; continue; }   // 같은 얼굴은 한 번만
      seen[key] = 1;
      cands.push(id);
    }
    let best = cands[0], bestV = -1e9;
    for (let i = 0; i < cands.length; i++) {
      const id = cands[i];
      const rest = hand.filter(function (x) { return x !== id; });
      let v = val(rest);
      if (prof.danger && !Cube.isWild(st, id)) v -= danger(st, p, id, mem) * prof.danger;
      // 같은 얼굴이 두 장이면 한 장은 덜 아깝다
      if (hand.filter(function (x) { return faceOf(st, x) === faceOf(st, id) && Cube.isWild(st, x) === Cube.isWild(st, id); }).length > 1) v += 4;
      if (v > bestV) { bestV = v; best = id; }
    }
    return { t: "discard", id: best };
  }

  // 이 타일을 더하면 다음에 끝낼 수 있나
  function canWinWith(st, hand, addId, discardId) {
    const h = hand.concat([addId]).filter(function (x) { return x !== discardId; });
    return h.length === 14 && !!Cube.checkWin(st, h);
  }
  function winsIfTake(st, hand, top) {
    for (let i = 0; i < hand.length; i++) if (canWinWith(st, hand, top, hand[i])) return true;
    return false;
  }

  // ── 뽑기 고르기 ─────────────────────────────────────────
  function chooseDraw(st, p, prof, mem) {
    const prev = (p - 1 + st.n) % st.n, pile = st.discards[prev];
    const canTake = pile.length > 0, canDeck = st.deck.length > 0;
    if (!canTake) return { t: "deck" };
    if (!canDeck) return { t: "take" };
    const top = pile[pile.length - 1];
    if (Cube.isWild(st, top)) return { t: "take" };
    if (prof.randomTake) return rnd(mem) < prof.randomTake ? { t: "take" } : { t: "deck" };
    const hand = st.hands[p];
    if (winsIfTake(st, hand, top)) return { t: "take" };
    const gain = valueOf(st, hand.concat([top]), prof) - valueOf(st, hand, prof);
    return gain >= prof.takeNeed ? { t: "take" } : { t: "deck" };
  }

  function act(st, p, level, mem, opt) {
    const name = typeof level === "string" ? level : ["easy", "normal", "hard"][level || 0] || "easy";
    const prof = Object.assign({}, PROFILES[name], opt || {});
    if (!mem) mem = newMemory(p * 97 + 1);
    if (!Cube.legal(st).length) return null;
    remember(st, mem);
    const win = Cube.legal(st).find(function (a) { return a.t === "win"; });
    if (win) return win;
    return st.phase === "draw" ? chooseDraw(st, p, prof, mem) : chooseDiscard(st, p, prof, mem);
  }

  // 화면 힌트: 지금 뭘 하면 좋을지
  function hint(st, p) {
    const mem = newMemory(1);
    remember(st, mem);
    if (st.phase === "draw") {
      const a = chooseDraw(st, p, PROFILES.hard, mem);
      return { kind: "draw", take: a.t === "take" };
    }
    const a = chooseDiscard(st, p, PROFILES.hard, mem);
    return { kind: "discard", id: a.id };
  }

  // AI 선생님: 추천 + 짧은 까닭 (화면은 text 를 굵게, why 를 아래에)
  const COLORS = ["빨강", "민트", "노랑", "보라"];
  function tileName(st, id) {
    if (Cube.isWild(st, id)) return "만능 타일";
    const t = Cube.tile(id);
    return t.cat ? "조커" : COLORS[t.c] + " " + t.v;
  }
  function usedInGroups(st, ids) {
    let n = 0;
    const a = Cube.arrange(st, ids);
    for (let i = 0; i < a.groups.length; i++) n += a.groups[i].length;
    return n;
  }
  // 묶음 밖 타일에 짝이 될 만한 이웃(같은 색 ±2 · 같은 숫자 다른 색)이 있나
  function hasNeighbor(st, hand, id) {
    const f = faceOf(st, id);
    if (f < 0) return true;
    const c = Math.floor(f / 13), v = f % 13;
    for (let i = 0; i < hand.length; i++) {
      if (hand[i] === id) continue;
      const g = faceOf(st, hand[i]);
      if (g < 0) return true;
      const gc = Math.floor(g / 13), gv = g % 13;
      if ((gc === c && gv !== v && Math.abs(gv - v) <= 2) || (gv === v && gc !== c)) return true;
    }
    return false;
  }
  function advise(st, p) {
    if (!st || st.phase === "over" || st.turn !== p) return null;
    const hand = st.hands[p];
    const win = Cube.legal(st).find(function (a) { return a.t === "win"; });
    if (win) return { kind: "win", id: win.id, text: "베니! 끝낼 수 있어요", why: tileName(st, win.id) + " 버리면 남은 14장이 모두 묶음이에요" };
    const h = hint(st, p);
    if (h.kind === "draw") {
      const prev = st.discards[(p - 1 + st.n) % st.n], top = prev[prev.length - 1];
      if (h.take && top != null) {
        const gain = usedInGroups(st, hand.concat([top])) - usedInGroups(st, hand);
        const why = winsIfTake(st, hand, top) ? "가져오면 바로 끝낼 수 있어요"
          : gain > 0 ? "가져오면 묶음에 바로 들어가요 (+" + gain + "장)" : "내 타일과 짝이 맞아 묶음이 가까워져요";
        return { kind: "draw", take: true, text: "앞사람이 버린 " + tileName(st, top) + " 가져오기", why: why };
      }
      return { kind: "draw", take: false, text: "더미에서 뽑기", why: top != null ? "앞사람이 버린 " + tileName(st, top) + " — 내 묶음에 잘 안 맞아요" : "앞사람 버림이 아직 없어요" };
    }
    const inGroup = Cube.arrange(st, hand).groups.some(function (g) { return g.indexOf(h.id) >= 0; });
    const why = inGroup ? "묶음을 가장 덜 깨는 타일이에요"
      : hasNeighbor(st, hand, h.id) ? "묶음에 안 들어간 타일 중 쓸모가 가장 적어요" : "묶음 밖에 있고 짝이 될 타일도 가까이 없어요";
    return { kind: "discard", id: h.id, text: tileName(st, h.id) + " 버리기", why: why };
  }

  return { LEVEL: LEVEL, newMemory: newMemory, observe: observe, act: act, hint: hint, advise: advise, tileName: tileName, faceOf: faceOf, valueOf: valueOf };
});
