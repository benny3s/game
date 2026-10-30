/* 베니큐브 규칙 엔진 (브라우저·Node 공통, 의존성 없음) */
(function (root) {
  "use strict";

  const TILES = 106;          // 0~103 타일 + 고양이 2장
  const NFACE = 52;           // 색4 × 숫자13 얼굴
  const OBS = 52 * 7 + 8;     // 관찰 벡터 길이

  // ── 타일 ────────────────────────────────────────────────
  function tile(id) {
    if (id >= 104) return { c: -1, v: 0, cat: true };
    const c = Math.floor(id / 26);
    return { c: c, v: (id % 26) % 13 + 1, cat: false };
  }

  // 만능 얼굴 id(0벌째) → 얼굴 번호
  function wildFaceIdx(wf) {
    return Math.floor(wf / 26) * 13 + (wf % 26);
  }

  function isWild(ctx, id) {
    if (id >= 104) return ctx.rule !== "classic";
    if (ctx.rule === "classic" && ctx.wildFace != null) {
      const t = tile(id);
      return t.c * 13 + (t.v - 1) === wildFaceIdx(ctx.wildFace);
    }
    return false;
  }

  // 타일의 얼굴 번호. 전통에서 고양이는 만능 얼굴의 보통 타일.
  function faceIdx(ctx, id) {
    const t = tile(id);
    if (t.cat) {
      return ctx.rule === "classic" && ctx.wildFace != null ? wildFaceIdx(ctx.wildFace) : -1;
    }
    return t.c * 13 + (t.v - 1);
  }

  // ── 묶음 후보: anchor 얼굴을 반드시 쓰는 묶음들 ─────────────
  // { faces: 실제로 쓰는 다른 얼굴들, need: 만능으로 채울 수, size: 묶음 크기 }
  const COMBOS = [[0, 1], [0, 2], [1, 2], [0, 1, 2]];
  function groupCandidates(counts, anchor) {
    const n = anchor % 13;
    const c = (anchor - n) / 13;
    const res = [];
    const others = [];
    for (let x = 0; x < 4; x++) if (x !== c) others.push(x);
    // 같은 숫자, 다른 색 3~4장
    for (let k = 0; k < COMBOS.length; k++) {
      const cb = COMBOS[k];
      const faces = [];
      let need = 0;
      for (let j = 0; j < cb.length; j++) {
        const f = others[cb[j]] * 13 + n;
        if (counts[f] === 0) need++;
        else faces.push(f);
      }
      res.push({ faces: faces, need: need, size: 1 + cb.length });
    }
    // 같은 색 이어진 숫자 3장 이상 (13→1 안 넘어감)
    for (let a = Math.max(0, n - 12); a <= n; a++) {
      for (let b = Math.max(n, a + 2); b <= 12; b++) {
        const faces = [];
        let need = 0;
        for (let q = a; q <= b; q++) {
          if (q === n) continue;
          const f = c * 13 + q;
          if (counts[f] === 0) need++;
          else faces.push(f);
        }
        res.push({ faces: faces, need: need, size: b - a + 1 });
      }
    }
    return res;
  }

  function tally(ctx, ids) {
    const counts = new Uint8Array(NFACE);
    const faceIds = [];
    for (let f = 0; f < NFACE; f++) faceIds.push([]);
    const wildIds = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (isWild(ctx, id)) { wildIds.push(id); continue; }
      const f = faceIdx(ctx, id);
      if (f < 0) { wildIds.push(id); continue; }  // 만능 아닌 고양이(쉬움)는 여기 안 옴
      counts[f]++;
      faceIds[f].push(id);
    }
    return { counts: counts, wilds: wildIds.length, faceIds: faceIds, wildIds: wildIds };
  }

  function countsKey(counts, wilds) {
    return String.fromCharCode.apply(null, counts) + "|" + wilds;
  }

  // 남은 타일을 전부 묶음으로 나누기 (실패 기억으로 빠르게)
  function solveFull(counts, wilds, rem, memo) {
    if (rem === 0) return [];
    const key = countsKey(counts, wilds);
    if (memo.has(key)) return null;
    let anchor = -1;
    for (let f = 0; f < NFACE; f++) if (counts[f]) { anchor = f; break; }
    if (anchor < 0) { memo.add(key); return null; }  // 만능만 남음 → 묶음 불가
    const cands = groupCandidates(counts, anchor);
    for (let i = 0; i < cands.length; i++) {
      const cd = cands[i];
      if (cd.size > rem || wilds < cd.need) continue;
      const fs = cd.faces;
      counts[anchor]--;
      for (let j = 0; j < fs.length; j++) counts[fs[j]]--;
      const sub = solveFull(counts, wilds - cd.need, rem - cd.size, memo);
      counts[anchor]++;
      for (let j = 0; j < fs.length; j++) counts[fs[j]]++;
      if (sub) {
        const g = [anchor];
        for (let j = 0; j < fs.length; j++) g.push(fs[j]);
        for (let j = 0; j < cd.need; j++) g.push(-1);
        return [g].concat(sub);
      }
    }
    memo.add(key);
    return null;
  }

  function solveGroups(ctx, ids) {
    const t = tally(ctx, ids);
    const moves = solveFull(t.counts, t.wilds, ids.length, new Set());
    if (!moves) return null;
    const used = new Uint8Array(NFACE);
    let wi = 0;
    const groups = [];
    for (let i = 0; i < moves.length; i++) {
      const g = moves[i], out = [];
      for (let j = 0; j < g.length; j++) {
        const f = g[j];
        if (f === -1) out.push(t.wildIds[wi++]);
        else out.push(t.faceIds[f][used[f]++]);
      }
      groups.push(out);
    }
    return groups;
  }

  // 일곱 쌍: 홀수 얼굴은 만능이 하나씩 채우고, 남은 만능은 짝수여야 함
  function isPairs(ctx, ids) {
    if (ids.length % 2 !== 0) return false;
    const t = tally(ctx, ids);
    let odd = 0;
    for (let f = 0; f < NFACE; f++) if (t.counts[f] & 1) odd++;
    const w = t.wildIds.length;
    return w >= odd && ((w - odd) & 1) === 0;
  }

  function checkWin(ctx, ids) {
    if (!ids || ids.length !== 14) return null;
    const groups = solveGroups(ctx, ids);
    if (groups) return { kind: "groups", groups: groups };
    return isPairs(ctx, ids) ? { kind: "pairs" } : null;
  }

  // ── 정리: 묶음에 들어가는 타일 수 최대 ─────────────────────
  function arrangeDfs(counts, wilds, memo) {
    const key = countsKey(counts, wilds);
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let anchor = -1;
    for (let f = 0; f < NFACE; f++) if (counts[f]) { anchor = f; break; }
    if (anchor < 0) return { score: 0, groups: [] };
    // 이 타일을 묶지 않고 넘김
    counts[anchor]--;
    let best = arrangeDfs(counts, wilds, memo);
    counts[anchor]++;
    const cands = groupCandidates(counts, anchor);
    for (let i = 0; i < cands.length; i++) {
      const cd = cands[i];
      if (wilds < cd.need) continue;
      const fs = cd.faces;
      counts[anchor]--;
      for (let j = 0; j < fs.length; j++) counts[fs[j]]--;
      const sub = arrangeDfs(counts, wilds - cd.need, memo);
      counts[anchor]++;
      for (let j = 0; j < fs.length; j++) counts[fs[j]]++;
      const score = cd.size + sub.score;
      if (score > best.score) {
        const g = [anchor];
        for (let j = 0; j < fs.length; j++) g.push(fs[j]);
        for (let j = 0; j < cd.need; j++) g.push(-1);
        best = { score: score, groups: [g].concat(sub.groups) };
      }
    }
    memo.set(key, best);
    return best;
  }

  function arrange(ctx, ids) {
    const t = tally(ctx, ids);
    const best = arrangeDfs(t.counts, t.wilds, new Map());
    const used = new Uint8Array(NFACE);
    let wi = 0;
    const groups = [];
    for (let i = 0; i < best.groups.length; i++) {
      const g = best.groups[i], out = [];
      for (let j = 0; j < g.length; j++) {
        const f = g[j];
        if (f === -1) out.push(t.wildIds[wi++]);
        else out.push(t.faceIds[f][used[f]++]);
      }
      groups.push(out);
    }
    const taken = new Set();
    for (let i = 0; i < groups.length; i++)
      for (let j = 0; j < groups[i].length; j++) taken.add(groups[i][j]);
    return { groups: groups, rest: ids.filter(function (id) { return !taken.has(id); }) };
  }

  // ── 나눠 주기 ──────────────────────────────────────────
  function nextRand(st) {
    let a = ((st.rng | 0) + 0x6D2B79F5) | 0;
    st.rng = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle(st, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand(st) * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  function create(opts) {
    opts = opts || {};
    const n = opts.players == null ? 2 : opts.players;
    if (n < 2 || n > 4) throw new Error("인원은 2~4명");
    const rule = opts.rule === "classic" ? "classic" : "easy";
    const seed = opts.seed == null ? 0 : (opts.seed | 0);
    const st = { rng: seed };
    const deck = [];
    for (let i = 0; i < TILES; i++) deck.push(i);
    shuffle(st, deck);

    let indicator = null, wildFace = null;
    if (rule === "classic") {
      for (;;) {
        const id = deck.pop();
        if (id >= 104) { deck.unshift(id); continue; }  // 고양이는 더미 맨 아래로
        indicator = id;
        const t = tile(id);
        wildFace = t.c * 26 + (t.v === 13 ? 0 : t.v);
        break;
      }
    }

    const hands = [], discards = [], scores = [];
    for (let p = 0; p < n; p++) { hands.push([]); discards.push([]); scores.push(0); }
    for (let r = 0; r < 14; r++)
      for (let p = 0; p < n; p++) hands[p].push(deck.pop());
    hands[0].push(deck.pop());  // 첫 사람만 15장

    return {
      n: n, rule: rule, seed: seed, rng: st.rng, deck: deck,
      hands: hands, discards: discards, turn: 0, phase: "discard",
      indicator: indicator, wildFace: wildFace, winner: null, winKind: null,
      points: 0, scores: scores, round: 1
    };
  }

  // ── 행동 ──────────────────────────────────────────────
  function legal(state) {
    if (!state || state.phase === "over") return [];
    const n = state.n, p = state.turn;
    const L = [];
    if (state.phase === "draw") {
      if (state.deck.length) L.push({ t: "deck" });
      if (state.discards[(p - 1 + n) % n].length) L.push({ t: "take" });
      return L;
    }
    const hand = state.hands[p];
    for (let i = 0; i < hand.length; i++) L.push({ t: "discard", id: hand[i] });
    for (let i = 0; i < hand.length; i++) {
      const id = hand[i];
      const rest = hand.filter(function (x) { return x !== id; });
      if (checkWin(state, rest)) L.push({ t: "win", id: id });
    }
    return L;
  }

  function step(state, action) {
    if (!state || state.phase === "over") throw new Error("끝난 판");
    if (!action || typeof action !== "object") throw new Error("행동이 없음");
    const s = JSON.parse(JSON.stringify(state));  // 입력 상태는 건드리지 않음
    const n = s.n, p = s.turn;

    if (action.t === "deck" || action.t === "take") {
      if (s.phase !== "draw") throw new Error("뽑을 차례가 아님");
      if (action.t === "deck") {
        if (!s.deck.length) throw new Error("더미가 비었음");
        const id = s.deck.pop();
        s.hands[p].push(id);
        s.phase = "discard";
        return { state: s, events: [{ type: "draw", p: p, from: "deck", id: id }] };
      }
      const prev = (p - 1 + n) % n;
      const pile = s.discards[prev];
      if (!pile.length) throw new Error("가져올 타일이 없음");
      const id = pile.pop();
      s.hands[p].push(id);
      s.phase = "discard";
      return { state: s, events: [{ type: "draw", p: p, from: "take", id: id }] };
    }

    if (action.t === "discard") {
      if (s.phase !== "discard") throw new Error("버릴 차례가 아님");
      const idx = s.hands[p].indexOf(action.id);
      if (idx < 0) throw new Error("손에 없는 타일");
      s.hands[p].splice(idx, 1);
      s.discards[p].push(action.id);
      const events = [{ type: "discard", p: p, id: action.id }];
      if (s.deck.length === 0) {
        s.phase = "over";
        s.winner = -1;
        s.winKind = null;
        s.points = 0;
        events.push({ type: "nagari" });
      } else {
        s.turn = (p + 1) % n;
        s.phase = "draw";
      }
      return { state: s, events: events };
    }

    if (action.t === "win") {
      if (s.phase !== "discard") throw new Error("끝낼 차례가 아님");
      const idx = s.hands[p].indexOf(action.id);
      if (idx < 0) throw new Error("손에 없는 타일");
      const rest = s.hands[p].filter(function (x) { return x !== action.id; });
      const res = checkWin(s, rest);
      if (!res) throw new Error("끝내기가 아님");
      const doubled = isWild(s, action.id);
      const points = (res.kind === "groups" ? 2 : 4) * (doubled ? 2 : 1);
      s.hands[p].splice(idx, 1);
      s.discards[p].push(action.id);
      s.phase = "over";
      s.winner = p;
      s.winKind = res.kind;
      s.points = points;
      s.scores[p] += points;
      return {
        state: s,
        events: [{ type: "win", p: p, kind: res.kind, points: points, groups: res.groups || null }]
      };
    }

    throw new Error("알 수 없는 행동");
  }

  // ── 보기 · 관찰 ────────────────────────────────────────
  function view(s, p) {
    const v = JSON.parse(JSON.stringify(s));
    v.hands = s.hands.map(function (h, i) { return i === p ? h.slice() : h.length; });
    v.deck = s.deck.length;
    return v;
  }

  function obs(s, p) {
    const o = new Float32Array(OBS);
    const n = s.n;
    // 내 손패 얼굴 개수 / 2
    for (let i = 0; i < s.hands[p].length; i++) {
      const id = s.hands[p][i];
      if (isWild(s, id)) continue;
      const f = faceIdx(s, id);
      if (f >= 0) o[f] += 0.5;
    }
    // 자리별(나 기준 0~3) 버림 얼굴 개수 / 2
    for (let r = 0; r < 4 && r < n; r++) {
      const pile = s.discards[(p + r) % n];
      const base = 52 + r * 52;
      for (let i = 0; i < pile.length; i++) {
        const id = pile[i];
        if (isWild(s, id)) continue;
        const f = faceIdx(s, id);
        if (f >= 0) o[base + f] += 0.5;
      }
    }
    // 왼쪽 사람 맨 위 버림 한 칸
    const prev = (p - 1 + n) % n;
    const top = s.discards[prev];
    if (top.length) {
      const id = top[top.length - 1];
      if (!isWild(s, id)) {
        const f = faceIdx(s, id);
        if (f >= 0) o[52 * 5 + f] = 1;
      }
    }
    // 만능 얼굴 한 칸 (쉬움은 0)
    if (s.wildFace != null) o[52 * 6 + wildFaceIdx(s.wildFace)] = 1;
    // 숫자 8개
    let wc = 0;
    for (let i = 0; i < s.hands[p].length; i++) if (isWild(s, s.hands[p][i])) wc++;
    const t = 52 * 7;
    o[t] = wc / 2;
    o[t + 1] = s.deck.length / 106;
    o[t + 2] = s.phase === "draw" ? 1 : 0;
    o[t + 3] = n / 4;
    for (let r = 1; r < 4; r++) {
      o[t + 3 + r] = r < n ? s.hands[(p + r) % n].length / 15 : 0;
    }
    o[t + 7] = s.turn === p ? 1 : 0;
    return o;
  }

  // ── 해시 ──────────────────────────────────────────────
  function hash(s) {
    const str = JSON.stringify(s);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  const API = {
    TILES: TILES, OBS: OBS, tile: tile, isWild: isWild, create: create,
    checkWin: checkWin, arrange: arrange, legal: legal, step: step,
    view: view, obs: obs, hash: hash
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.Cube = API;
})(this);
