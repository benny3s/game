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

  // 화면 힌트: 지금 뭘 하면 좋을지 (mem 을 주면 그 기억 — 다음 사람이 가져간 타일 — 을 고려해 버릴 타일을 고름)
  function hint(st, p, memIn) {
    const mem = memIn || newMemory(1);
    if (!memIn) remember(st, mem);
    if (st.phase === "draw") {
      const a = chooseDraw(st, p, PROFILES.hard, mem);
      return { kind: "draw", take: a.t === "take" };
    }
    const a = chooseDiscard(st, p, PROFILES.hard, mem);
    return { kind: "discard", id: a.id };
  }

  // ── AI 선생님: 추천 + 까닭 + 상대 흐름 · 내 흐름 ─────────────────────
  // 11-02 베니 님: "어디 두라고만 하니 뭔 말인지 모르겠고 재미없음" → 상대가 방금 한 것(👀)·내 묶음 형편(📊)·그래서 이 수(👉)를 같이 말함.
  // 공개된 것(버림 · 가져감 · 더미에서 뽑음 · 더미 수)만 읽는다. 상대 손패와 더미 속은 절대 안 봄 (selftest 가 숨은 패를 바꿔 같은 글인지 확인).
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

  // 우리말 조사: 받침 있으면 앞 것, 없으면 뒤 것 (숫자는 읽는 소리 기준: 영·일·삼·육·칠·팔·십 = 받침)
  function hasBatchim(word) {
    const s = String(word == null ? "" : word).replace(/[(][^)]*[)] *$/, "").trim();   // '서연(AI)' 는 '서연' 으로 읽음
    if (!s) return false;
    const ch = s.charAt(s.length - 1), c = ch.charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    if (ch >= "0" && ch <= "9") return "013678".indexOf(ch) >= 0;
    return "lmnrLMNR".indexOf(ch) >= 0;
  }
  function jo(word, withB, noB) { return word + (hasBatchim(word) ? withB : noB); }

  // 공개된 수만 이어 읽기: log = 이 판의 행동 목록 ({t:"deck"|"take"|"discard"|"win", id}), 첫 차례는 0번 자리.
  // 돌려줌: moves = 한 차례씩 [{ p, from: "deck"|"take"|null, took, tookFrom, passed, passedOf, disc, win }],
  //   piles = 자리별 버림 더미, turn = 지금 차례, drew = 뽑고 아직 안 버린 중인 차례
  // (더미에서 뽑은 타일은 안 보이니 id 를 담지 않음 — passed 는 '그때 안 가져간 맨 위 버림')
  function readLog(n, log) {
    const piles = [], moves = [];
    for (let i = 0; i < n; i++) piles.push([]);
    let p = 0, cur = null;
    const L = log || [];
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      if (!a) continue;
      const prev = (p - 1 + n) % n, pile = piles[prev];
      if (a.t === "deck") {
        cur = { p: p, from: "deck", passed: pile.length ? pile[pile.length - 1] : null, passedOf: prev };
      } else if (a.t === "take") {
        cur = { p: p, from: "take", took: pile.length ? pile.pop() : null, tookFrom: prev };
      } else if (a.t === "discard" || a.t === "win") {
        const m = cur || { p: p, from: null };
        m.disc = a.id;
        if (a.t === "win") m.win = true;
        moves.push(m);
        piles[p].push(a.id);
        cur = null;
        p = (p + 1) % n;
      }
    }
    return { moves: moves, piles: piles, turn: p, drew: cur };
  }

  // 자리별 가져간 횟수 · 차례 수 · 안 가져가고 더미에서 연달아 뽑은 횟수
  function statsOf(n, moves) {
    const takes = [], turns = [], streak = [];
    for (let q = 0; q < n; q++) { takes.push(0); turns.push(0); streak.push(0); }
    for (let i = 0; i < moves.length; i++) { turns[moves[i].p]++; if (moves[i].from === "take") takes[moves[i].p]++; }
    for (let q = 0; q < n; q++) {
      for (let i = moves.length - 1; i >= 0; i--) {
        const m = moves[i];
        if (m.p !== q) continue;
        if (m.from === "deck" && m.passed != null) streak[q]++;
        else if (m.from === "take") break;
      }
    }
    return { takes: takes, turns: turns, streak: streak };
  }

  // 가져간 타일로 짐작하는 노림 (같은 색 앞뒤 숫자로 이어 붙이려는 듯)
  function wantText(st, id) {
    if (Cube.isWild(st, id)) return "만능이라 어디든 끼움";
    const f = faceOf(st, id);
    if (f < 0) return "";
    const c = Math.floor(f / 13), v = f % 13 + 1;
    const nb = [v - 1, v + 1].filter(function (x) { return x >= 1 && x <= 13; });
    return COLORS[c] + " " + nb.join("·") + " 노림";
  }
  // f 와 w 가 '이어지거나 같은 숫자'(w 를 모으는 사람이 f 를 반길 만한) 사이인가
  function nearFace(f, w) {
    if (f < 0 || w < 0) return false;
    if (f === w) return true;
    const fc = Math.floor(f / 13), wc = Math.floor(w / 13), fv = f % 13, wv = w % 13;
    return (fc === wc && Math.abs(fv - wv) === 1) || (fv === wv && fc !== wc);
  }

  // 상대 흐름 읽기. 돌려줌: { opp: [{ q, kind, text, short }] (내 차례 뒤 각 상대가 한 일, 중요한 순), wants, passes, ok }
  //   wants = 다음 사람(내 버림을 가져갈 수 있는 사람)이 최근 가져간 타일 · passes = 다음 사람이 안 가져간 내 버림
  function coachRead(st, me, ctx) {
    const n = st.n, names = (ctx && ctx.names) || [];
    const nm = function (q) { return String(names[q] || "상대 " + (q + 1)); };
    const tr = readLog(n, ctx && ctx.log);
    const res = { opp: [], wants: [], passes: [], ok: false, tr: tr };
    if (!ctx || !ctx.log || tr.turn !== st.turn) return res;       // 기록이 판과 안 맞으면 읽지 않음
    res.ok = true;
    const moves = tr.moves, stat = statsOf(n, moves), next = (me + 1) % n, prev = (me - 1 + n) % n;
    let last = -1;
    for (let i = 0; i < moves.length; i++) if (moves[i].p === me) last = i;
    const rows = [];
    for (let i = last + 1; i < moves.length; i++) {
      const m = moves[i], q = m.p;
      if (q === me) continue;
      const tn = stat.takes[q], hot = tn >= 3 && tn * 2 >= stat.turns[q];
      let text, short, kind;
      if (m.from === "take" && m.took != null) {
        kind = "take";
        text = (m.tookFrom === me ? "내 버림" : nm(m.tookFrom) + " 버림") + " " + tileName(st, m.took) + " 가져감";
        const w = wantText(st, m.took);
        if (w) text += " → " + w;
        if (tn >= 2) text += " · " + tn + "번째" + (hot ? " (잘 맞는 듯)" : "");
      } else if (m.from === "deck") {
        kind = "deck";
        text = m.passed != null
          ? (m.passedOf === me ? "내 버림" : nm(m.passedOf) + " 버림") + " " + tileName(st, m.passed) + " 안 가져가고 더미 뽑음"
          : "더미에서 뽑음";
        if (stat.streak[q] >= 2) text += " (" + stat.streak[q] + "번째 연속)";
      } else {
        kind = "first";
        text = "첫 차례 — " + tileName(st, m.disc) + " 버림";
      }
      rows.push({ q: q, kind: kind, text: text, score: (q === next ? 4 : 0) + (kind === "take" ? 2 : 0) + (q === prev ? 1 : 0) + (hot ? 1 : 0) });
    }
    rows.sort(function (a, b) { return b.score - a.score; });
    res.opp = rows.map(function (r) { return { q: r.q, kind: r.kind, text: r.text }; });
    // 다음 사람이 최근 네 차례 안에 가져간 타일 (그 뒤 다시 버린 건 뺌) · 내 버림을 안 가져간 적
    if (next !== me) {
      const mine = moves.filter(function (m) { return m.p === next; }).slice(-4);
      res.lastTake = mine.length > 0 && mine[mine.length - 1].from === "take";   // 다음 사람이 바로 지난 차례에 가져갔나 (아니면 '앞서' 가져간 것)
      for (let i = 0; i < mine.length; i++) {
        const m = mine[i];
        if (m.from === "take" && m.took != null) {
          let back = false;
          for (let j = i; j < mine.length; j++) if (mine[j].disc === m.took) back = true;
          if (!back) res.wants.push(m.took);
        } else if (m.from === "deck" && m.passed != null && m.passedOf === me) res.passes.push(m.passed);
      }
    }
    return res;
  }

  // 오면 묶음이 느는 타일 (내 패만 봄 · 모두에게 이미 보인 두 장은 뺌) — 색별로 묶어 짧게
  function waitText(st, ids, rd, me) {
    const seen = new Set(ids);
    for (let i = 0; i < st.discards.length; i++) for (let j = 0; j < st.discards[i].length; j++) seen.add(st.discards[i][j]);
    if (rd && rd.tr) for (let i = 0; i < rd.tr.moves.length; i++) { const m = rd.tr.moves[i]; if (m.p !== me && m.took != null) seen.add(m.took); }
    if (st.indicator != null) seen.add(st.indicator);
    const left = new Uint8Array(52);
    for (let f = 0; f < 52; f++) left[f] = 2;
    seen.forEach(function (id) { if (id < 104 && !Cube.isWild(st, id)) left[faceOf(st, id)]--; });
    const base = usedInGroups(st, ids), have = new Set(ids), found = [];
    // 묶음에 끼려면 내 타일 중 하나와 같은 색 ±2 이거나 같은 숫자여야 함 (만능이 둘 이상이면 아무거나) — 빨리 거르려고
    const near = new Uint8Array(52);
    let wilds = 0;
    for (let i = 0; i < ids.length; i++) {
      const g = faceOf(st, ids[i]);
      if (g < 0) { wilds++; continue; }
      const gc = Math.floor(g / 13), gv = g % 13;
      for (let d = -2; d <= 2; d++) if (gv + d >= 0 && gv + d < 13) near[gc * 13 + gv + d] = 1;
      for (let c = 0; c < 4; c++) near[c * 13 + gv] = 1;
    }
    for (let f = 0; f < 52; f++) {
      if (left[f] <= 0 || (!near[f] && wilds < 2)) continue;
      const c = Math.floor(f / 13), v = f % 13;
      let id = c * 26 + v;
      if (have.has(id)) id += 13;
      if (have.has(id)) continue;
      const g = usedInGroups(st, ids.concat([id])) - base;
      if (g >= 1) found.push({ f: f, g: g });
    }
    found.sort(function (a, b) { return b.g - a.g || a.f - b.f; });
    const top = found.slice(0, 3).sort(function (a, b) { return a.f - b.f; });
    const by = {}, order = [];
    for (let i = 0; i < top.length; i++) {
      const c = Math.floor(top[i].f / 13);
      if (!by[c]) { by[c] = []; order.push(c); }
      by[c].push(top[i].f % 13 + 1);
    }
    return order.map(function (c) { return COLORS[c] + " " + by[c].join("·"); }).join(", ");
  }

  function deckCount(st) { return Array.isArray(st.deck) ? st.deck.length : (st.deck | 0); }

  // 내 흐름: 묶음에 든 장수 · 지난 차례와 비교 · 묶음 밖 · 만능 · 더미
  function mineText(st, ids, used, prevUsed) {
    let s = "묶음 " + used + "/14장 · 낱장 " + Math.max(0, 14 - used);
    if (prevUsed != null) {
      const d = used - prevUsed;
      s += " · 지난 차례 " + (d > 0 ? "+" + d : d < 0 ? String(d) : "그대로");
    }
    let w = 0;
    for (let i = 0; i < ids.length; i++) if (Cube.isWild(st, ids[i])) w++;
    if (w) s += " · 만능 " + w + "장 아껴 두기";
    const dk = deckCount(st);
    s += " · 더미 " + dk + (dk <= 12 ? "장 (바닥나면 무승부)" : "장");
    return s;
  }

  // AI 선생님: 추천 + 짧은 까닭 (화면은 text 를 굵게, why 를 아래에). ctx = { log, names, prevUsed, compact(좁은 창이면 true) } 가 있으면
  //   opp(👀 상대 흐름) · mine(📊 내 흐름) · wait(오면 좋은 타일) 도 같이 돌려주고, 까닭을 그 읽기와 이어 말함
  function advise(st, p, ctx) {
    if (!st || st.phase === "over" || st.turn !== p) return null;
    const hand = st.hands[p];
    const rd = coachRead(st, p, ctx);
    const prevUsed = ctx && ctx.prevUsed != null ? ctx.prevUsed : null;
    const nm = function (q) { return String(((ctx && ctx.names) || [])[q] || "상대"); };
    const win = Cube.legal(st).find(function (a) { return a.t === "win"; });
    if (win) return { kind: "win", id: win.id, text: "베니! 끝낼 수 있어요", why: tileName(st, win.id) + " 버리면 남은 14장이 모두 묶음이에요", opp: rd.opp, mine: "끝내기 직전 — 이 타일만 버리면 이겨요", wait: "" };
    const next = (p + 1) % st.n;
    // 다음 사람이 가져간 타일을 기억에 넣어, 그 사람이 반길 타일을 덜 건네줌
    const mem = newMemory(1);
    remember(st, mem);
    for (let i = 0; i < rd.wants.length; i++) { const f = faceOf(st, rd.wants[i]); if (f >= 0) mem.took[f]++; }
    const h = hint(st, p, mem);
    if (h.kind === "draw") {
      const prev = st.discards[(p - 1 + st.n) % st.n], top = prev[prev.length - 1];
      const used = usedInGroups(st, hand);
      const out = { opp: rd.opp, mine: mineText(st, hand, used, prevUsed), wait: waitText(st, hand, rd, p) };
      if (h.take && top != null) {
        const gain = usedInGroups(st, hand.concat([top])) - used;
        const why = winsIfTake(st, hand, top) ? "가져오면 바로 끝낼 수 있어요"
          : gain > 0 ? "가져오면 묶음에 바로 들어가요 (+" + gain + "장)" : "내 타일과 짝이 맞아 묶음이 가까워져요";
        return Object.assign({ kind: "draw", take: true, text: "앞사람이 버린 " + tileName(st, top) + " 가져오기", why: why }, out);
      }
      const wt = out.wait && st.n <= 3 && !(ctx && ctx.compact) ? " · 오면 좋은 타일 " + out.wait : "";   // 4명 판 · 좁은 화면은 창이 좁으니 뺌
      return Object.assign({ kind: "draw", take: false, text: "더미에서 뽑기", why: (top != null ? "앞사람이 버린 " + tileName(st, top) + " — 안 맞아요" : "앞사람 버림이 아직 없어요") + wt }, out);
    }
    const inGroup = Cube.arrange(st, hand).groups.some(function (g) { return g.indexOf(h.id) >= 0; });
    let why = inGroup ? "묶음을 가장 덜 깨는 타일이에요"
      : hasNeighbor(st, hand, h.id) ? "묶음 밖 타일 중 쓸모가 가장 적어요" : "묶음 밖이고 짝이 될 타일도 멀어요";
    // 읽기와 잇기: 다음 사람이 노리는 타일은 아끼고, 안 가져간 타일과 같은 건 안전하다고 말함
    if (rd.ok && next !== p) {
      const plain = hint(st, p);                                   // 읽기 없이 골랐을 타일
      const fp = faceOf(st, plain.id), fr = faceOf(st, h.id);
      if (plain.id !== h.id && fp >= 0) {
        let w = -1;
        for (let i = rd.wants.length - 1; i >= 0 && w < 0; i--) if (nearFace(fp, faceOf(st, rd.wants[i]))) w = rd.wants[i];
        if (w >= 0) why = jo(nm(next), "이", "가") + " " + (rd.lastTake ? "" : "앞서 ") + jo(tileName(st, w), "을", "를") + " 가져가서 " + jo(tileName(st, plain.id), "은", "는") + " 건네주지 않아요";
      } else if (fr >= 0) {
        const safe = rd.passes.some(function (x) { return faceOf(st, x) === fr; });
        const near = rd.wants.some(function (x) { return nearFace(fr, faceOf(st, x)); });
        if (safe) why = jo(nm(next), "이", "가") + " 안 가져간 " + jo(tileName(st, h.id), "과", "와") + " 같은 타일이라 안전해요";
        else if (rd.wants.length && !near && !inGroup) why = jo(nm(next), "이", "가") + " 노리는 타일과 멀어서 건네줘도 안전해요";
      }
    }
    const rest = hand.filter(function (x) { return x !== h.id; });
    const used = usedInGroups(st, rest);
    return { kind: "discard", id: h.id, text: tileName(st, h.id) + " 버리기", why: why, opp: rd.opp, mine: mineText(st, rest, used, prevUsed), wait: waitText(st, rest, rd, p) };
  }

  return { LEVEL: LEVEL, newMemory: newMemory, observe: observe, act: act, hint: hint, advise: advise, tileName: tileName, faceOf: faceOf, valueOf: valueOf, readLog: readLog, coachRead: coachRead, usedCount: usedInGroups };
});
