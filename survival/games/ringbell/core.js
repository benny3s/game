/* 베니 서바이벌 · 링 더 벨 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 X 5일차 데스매치 (2:2 팀전 · 3라운드 중 2라운드를 먼저 이긴 팀이 생존)
   · 카드: 4색(빨강 · 파랑 · 노랑 · 초록) × 숫자 1~10 = 40장. 세트마다 섞어 한 사람에 4장, 남은 카드는 뒷면 더미, 맨 위 한 장을 앞면으로
   · 목숨 3개. 라운드는 최대 9세트. 1세트 선은 무작위, 다음 세트는 직전 세트에 벨을 친 사람이 선
   · 내 차례에 셋 중 하나
       ① 교환 — 앞면 카드나 뒷면 더미에서 한 장 가져오고 손패 한 장을 앞면으로 버림 (가져온 카드를 바로 버려도 됨, 버린 카드가 다음 사람의 새 앞면)
       ② 벨 — 나머지 사람이 차례대로 한 번씩 교환한 뒤, 벨 친 사람부터 조합 공개
       ③ 포카드 선언 — 같은 숫자 4장이 모이면 선언하고 바로 벨: 조합 비교 없이 상대 팀 모두 목숨 −1
   · 조합: 손패에서 1~4장 — 2장 이상이면 모두 같은 숫자이거나 모두 같은 색. 숫자 합이 가장 낮은 사람(여럿이면 모두) 목숨 −1,
       벨 친 사람이 가장 낮으면 목숨 −1 더
   · 뒷면 더미가 다 떨어지면 더미를 비운 사람의 다음 사람부터 바로 조합 공개 (벨 벌점 없음)
   · 목숨이 0이 된 사람의 팀이 그 라운드에서 짐 (두 팀이 함께 0 이면 그 라운드에 마지막으로 벨을 친 사람의 팀이 이김)
   방송과 다른 점(우리가 정함):
     ① 2명 = 1:1 (기본) · 4명 = 2:2 팀전 (방송, 자리 0·2 대 1·3 — 차례가 팀을 번갈아) · 3명 = 각자 (3라운드를 다 하고 이긴 라운드 수 → 남은 목숨 합)
     ② 2:2는 방송처럼 공개 차례에 조합을 골라 냄 (팀원을 살리려 일부러 낮게 내는 '탱킹' — 방송 3라운드 김경훈 1 · 김유현 2) ·
        1:1 · 3명은 낮게 낼 까닭이 없어 합이 가장 큰 조합을 자동으로 공개 · 공개된 조합 카드만 보이고 나머지 손패는 비공개
     ③ 벨이 울린 뒤의 교환은 한 번씩 꼭 함 (가져온 카드를 바로 버리면 그대로) · 그때 더미가 비었으면 앞면만 · 그때는 포카드 선언 없음
     ④ 9세트가 끝나도 아무도 0이 아니면 팀 목숨 합이 많은 쪽 승, 같으면 추첨 (2~4명은 9세트 전에 반드시 누군가 0이 됨)
        · 함께 0 인데 그 라운드에 벨이 없었으면 추첨
     ⑤ 다음 세트 선 = 벨 친 사람 · 포카드 선언한 사람 · 더미가 비어 끝났으면 공개를 시작한 사람(더미를 비운 사람의 다음)
     ⑥ 앞면에서 가져간 카드는 그 사람이 버릴 때까지 모두가 앎 · 버린 카드는 모두 기록에 남음 · 1라운드짜리 짧은 판 옵션
     ⑦ 한 세트에 교환이 120번을 넘으면 더미가 떨어진 것처럼 바로 공개 · 포카드 때는 선언한 4장만 공개 (나머지 비교 없음) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).ringbell = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const HAND = 4, LIVES = 3, MAXSET = 9, NCARD = 40, MAXTURN = 120;   // MAXTURN: 한 세트 교환 한도 (모두 앞면을 가져와 그대로 버리기만 하면 끝나지 않으니)
  const CN = ["빨강", "파랑", "노랑", "초록"];
  const col = c => (c / 10) | 0, num = c => (c % 10) + 1;
  const cname = c => (c >= 0 ? `${CN[col(c)]} ${num(c)}` : "?");

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 200) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 조합 (순수 함수) ─────────────────────────────────────────
  // 합이 가장 큰 조합 — 같은 숫자 모두 / 같은 색 모두 / 한 장 중 가장 큰 것 (같으면 장 수가 많은 쪽)
  function best(h) {
    let bs = -1, bc = [], bk = "";
    const take = (s, cs, k) => { if (s > bs || (s === bs && cs.length > bc.length)) { bs = s; bc = cs; bk = k; } };
    for (let v = 1; v <= 10; v++) { const cs = h.filter(c => num(c) === v); if (cs.length) take(v * cs.length, cs, cs.length > 1 ? "num" : "one"); }
    for (let k = 0; k < 4; k++) { const cs = h.filter(c => col(c) === k); if (cs.length) take(cs.reduce((x, c) => x + num(c), 0), cs, cs.length > 1 ? "col" : "one"); }
    return { sum: Math.max(0, bs), cards: bc.slice().sort((a, b) => num(a) - num(b) || a - b), kind: bk };
  }
  // 빠른 판 (AI 용): skip 번째 카드를 빼고 계산
  const CS = new Int32Array(4), NS = new Int32Array(11);
  function bestSum(h, skip) {
    CS.fill(0); NS.fill(0); let b = 0;
    for (let i = 0; i < h.length; i++) { if (i === skip) continue; const c = h[i], v = c % 10 + 1; CS[(c / 10) | 0] += v; NS[v] += v; }
    for (let k = 0; k < 4; k++) if (CS[k] > b) b = CS[k];
    for (let v = 1; v <= 10; v++) if (NS[v] > b) b = NS[v];
    return b;
  }
  function fourV(h) { for (let v = 1; v <= 10; v++) if (h.filter(c => num(c) === v).length >= 4) return v; return 0; }
  // 낼 수 있는 조합: 1~4장, 2장 이상이면 모두 같은 숫자이거나 모두 같은 색
  const byNum = (a, b) => num(a) - num(b) || a - b;
  function validCombo(cs) { return cs.length >= 1 && cs.length <= 4 && (cs.length === 1 || cs.every(c => num(c) === num(cs[0])) || cs.every(c => col(c) === col(cs[0]))); }
  const sumOf = cs => cs.reduce((x, c) => x + num(c), 0);
  const ckOf = cs => (!cs.length ? "" : cs.length === 1 ? "one" : num(cs[0]) === num(cs[1]) ? "num" : "col");
  function combos(h) {
    const L = [];
    for (let m = 1; m < 1 << h.length; m++) { const cs = h.filter((_, i) => (m >> i) & 1); if (validCombo(cs)) L.push(cs.sort(byNum)); }
    return L;
  }
  const teamsFor = n => (n === 4 ? [[0, 2], [1, 3]] : Array.from({ length: n }, (_, i) => [i]));

  // ── 진행 ─────────────────────────────────────────────────
  function init({ n, seed, cfg } = {}) {
    n = [2, 3, 4].includes(n | 0) ? n | 0 : 2;
    const R = cfg && +cfg.rounds === 1 ? 1 : 3;
    const teams = teamsFor(n), teamOf = [];
    teams.forEach((t, k) => t.forEach(s => (teamOf[s] = k)));
    const st = {
      n, rs: (seed >>> 0) || 1, R, need: teams.length === 2 ? Math.floor(R / 2) + 1 : 99, teams, teamOf,
      round: 0, set: 0, lives: Array(n).fill(LIVES), wins: Array(teams.length).fill(0), lifeSum: Array(n).fill(0),
      phase: "turn", over: false, deck: [], up: -1, disc: [], hands: [], known: [], got: -1, src: "",
      start: 0, cur: 0, bell: -1, four: -1, after: [], lastBell: -1, nextStart: 0, turns: 0,
      rv: null, shown: null, res: null, rres: null, hist: [], rounds: [], log: [], seq: 0,
    };
    for (let i = 0; i < 3; i++) rnd(st);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.set = 0; st.lives = Array(st.n).fill(LIVES); st.lastBell = -1; st.rres = null;
    push(st, { k: "round", r: st.round });
    startSet(st, Math.floor(rnd(st) * st.n));
  }
  function startSet(st, start) {
    st.set++; st.start = start; st.cur = start; st.bell = -1; st.four = -1; st.after = []; st.got = -1; st.src = ""; st.res = null; st.turns = 0; st.rv = null; st.shown = null; st.sw = Array(st.n).fill(0);
    const d = shuffle(() => rnd(st), Array.from({ length: NCARD }, (_, i) => i));
    st.hands = Array.from({ length: st.n }, () => []);
    for (let k = 0; k < HAND; k++) for (let j = 0; j < st.n; j++) st.hands[(start + j) % st.n].push(d.pop());
    st.up = d.pop(); st.deck = d; st.disc = []; st.known = Array.from({ length: st.n }, () => []);
    st.phase = "turn";
    push(st, { k: "set", r: st.round, set: st.set, start, up: st.up });
  }
  function needs(st) { return !st.over && (st.phase === "turn" || st.phase === "drop" || st.phase === "reveal") ? [st.cur] : []; }
  const ERR = m => ({ ok: false, err: m });
  function apply(st, seat, a) {
    if (st.over) return ERR("끝난 판이에요");
    if (!a || typeof a !== "object") return ERR("잘못된 행동");
    if (!needs(st).includes(seat)) return ERR("차례가 아니에요");
    const h = st.hands[seat], afterBell = st.bell >= 0;
    if (st.phase === "turn") {
      if (a.t === "take") {
        if (a.src === "up") { if (st.up < 0) return ERR("앞면 카드가 없어요"); st.got = st.up; st.up = -1; st.known[seat].push(st.got); }
        else if (a.src === "deck") { if (!st.deck.length) return ERR("뒷면 더미가 비었어요"); st.got = st.deck.pop(); }
        else return ERR("가져올 곳을 골라요");
        h.push(st.got); st.src = a.src; st.phase = "drop";
        push(st, { k: "take", s: seat, src: a.src, c: a.src === "up" ? st.got : -1, after: afterBell });
        return { ok: true };
      }
      if (afterBell) return ERR("벨이 울린 뒤에는 한 번 바꾸기만 해요");
      if (a.t === "bell") {
        st.bell = seat; st.lastBell = seat; st.after = [];
        for (let k = 1; k < st.n; k++) st.after.push((seat + k) % st.n);
        push(st, { k: "bell", s: seat });
        nextAfter(st);
        return { ok: true };
      }
      if (a.t === "four") {
        const v = fourV(h); if (!v) return ERR("같은 숫자 4장이 없어요");
        st.four = seat; st.lastBell = seat;
        push(st, { k: "four", s: seat, v });
        endSet(st, "four", seat);
        return { ok: true };
      }
      return ERR("교환 · 벨 · 포카드 중에서 골라요");
    }
    if (st.phase === "drop") {
      if (a.t !== "drop") return ERR("버릴 카드를 골라요");
      const i = h.indexOf(a.c); if (i < 0 || typeof a.c !== "number") return ERR("손패에 없는 카드예요");
      h.splice(i, 1);
      const kn = st.known[seat].indexOf(a.c); if (kn >= 0) st.known[seat].splice(kn, 1);
      if (st.up >= 0) st.disc.push(st.up);                 // 뒷면에서 가져왔으면 원래 앞면은 아래로 깔림 (모두 봤던 카드)
      const same = a.c === st.got;
      st.up = a.c; st.got = -1; st.phase = "turn"; st.turns++; st.sw[seat]++;
      push(st, { k: "drop", s: seat, c: a.c, same, src: st.src, after: afterBell });
      st.src = "";
      if (afterBell) { nextAfter(st); return { ok: true }; }
      if (!st.deck.length || st.turns >= MAXTURN) { endSet(st, "deck", seat); return { ok: true }; }
      st.cur = (seat + 1) % st.n;
      return { ok: true };
    }
    if (st.phase === "reveal") {
      if (a.t !== "show" || !Array.isArray(a.cards)) return ERR("공개할 조합을 골라요");
      const cs = a.cards;
      if (cs.length < 1 || cs.length > 4 || new Set(cs).size !== cs.length || cs.some(c => typeof c !== "number" || !h.includes(c))) return ERR("손패에서 1~4장을 골라요");
      if (!validCombo(cs)) return ERR("같은 숫자끼리나 같은 색끼리만 함께 낼 수 있어요");
      const sorted = cs.slice().sort(byNum);
      st.shown[seat] = sorted;
      push(st, { k: "show", s: seat, cards: sorted.slice(), sum: sumOf(sorted) });
      st.rv.k++;
      if (st.rv.k < st.n) st.cur = st.rv.order[st.rv.k];
      else resolve(st, st.rv.kind, st.rv.who, st.shown);
      return { ok: true };
    }
    return ERR("지금은 할 수 없어요");
  }
  function nextAfter(st) {
    if (st.after.length) { st.cur = st.after.shift(); st.phase = "turn"; }
    else endSet(st, "bell", st.bell);
  }
  // 세트 끝: (2:2는 차례대로 조합을 골라 공개) → 조합 비교 → 목숨 → 라운드 끝인지
  function endSet(st, kind, who) {
    const n = st.n, first = kind === "deck" ? (who + 1) % n : who;
    if (n === 4 && kind !== "four") {
      st.rv = { kind, who, order: Array.from({ length: n }, (_, k) => (first + k) % n), k: 0 };
      st.shown = Array(n).fill(null); st.phase = "reveal"; st.cur = first; st.got = -1;
      push(st, { k: "reveal", kind, who });
      return;
    }
    if (kind === "four") { const v = fourV(st.hands[who]); resolve(st, kind, who, st.hands.map((h, j) => (j === who ? h.filter(c => num(c) === v).sort(byNum) : []))); return; }   // 포카드: 선언한 4장만 공개
    resolve(st, kind, who, st.hands.map(h => best(h).cards));
  }
  function resolve(st, kind, who, cmb) {
    const n = st.n, sums = cmb.map(sumOf), lost = Array(n).fill(0);
    if (kind === "four") { for (let j = 0; j < n; j++) if (st.teamOf[j] !== st.teamOf[who]) lost[j] = 1; }
    else {
      const m = Math.min(...sums);
      for (let j = 0; j < n; j++) if (sums[j] === m) lost[j] = 1;
      if (kind === "bell" && lost[who]) lost[who] = 2;
    }
    const before = st.lives.slice();
    for (let j = 0; j < n; j++) st.lives[j] = Math.max(0, st.lives[j] - lost[j]);
    const first = kind === "deck" ? (who + 1) % n : who;
    const order = Array.from({ length: n }, (_, k) => (first + k) % n);
    st.res = { r: st.round, set: st.set, kind, who, order, sums, combo: cmb.map(x => x.slice()), ck: cmb.map(ckOf), lost, before, lives: st.lives.slice(), hands: st.hands.map(h => h.slice()), turns: st.turns, chose: st.shown ? 1 : 0 };
    st.hist.push(st.res);
    st.phase = "show"; st.cur = -1; st.nextStart = first;
    push(st, { k: "res", kind, who, sums: st.res.sums.slice(), lost: lost.slice() });
    // 라운드 끝?
    const T = st.teams.length, outT = [];
    for (let j = 0; j < n; j++) if (st.lives[j] === 0 && !outT.includes(st.teamOf[j])) outT.push(st.teamOf[j]);
    st.rres = null;
    if (outT.length || st.set >= MAXSET) {
      let win, why;
      if (outT.length === T) {
        if (st.lastBell >= 0) { win = [st.teamOf[st.lastBell]]; why = "bell"; }
        else { win = [Math.floor(rnd(st) * T)]; why = "lot"; }
      } else if (outT.length) { win = []; for (let t = 0; t < T; t++) if (!outT.includes(t)) win.push(t); why = "out"; }
      else {
        const ls = st.teams.map(t => t.reduce((x, s) => x + st.lives[s], 0)), mx = Math.max(...ls), tops = ls.map((x, t) => (x === mx ? t : -1)).filter(t => t >= 0);
        win = tops.length === 1 ? tops : [tops[Math.floor(rnd(st) * tops.length)]]; why = tops.length === 1 ? "lives" : "lot";
      }
      for (const t of win) st.wins[t]++;
      for (let j = 0; j < n; j++) st.lifeSum[j] += st.lives[j];
      st.rres = { r: st.round, win, out: outT, why, wins: st.wins.slice() };
      st.rounds.push(st.rres);
      push(st, { k: "rwin", r: st.round, win: win.slice(), why });
      if (T === 2 ? Math.max(...st.wins) >= st.need || st.round >= st.R : st.round >= st.R) { st.over = true; st.phase = "end"; }
    }
  }
  function auto(st) { return st.phase === "show" && !st.over ? (st.rres ? 5600 : 4400) : null; }
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    if (st.rres) startRound(st); else startSet(st, st.nextStart);
  }
  const over = st => !!st.over;
  function ranks(st) {
    const key = i => st.wins[st.teamOf[i]] * 1000 + (st.teams.length === 2 ? 0 : st.lifeSum[i]);
    return Array.from({ length: st.n }, (_, i) => Array.from({ length: st.n }, (_, j) => j).filter(j => key(j) > key(i)).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const h = st.hands[seat], L = [];
    if (st.phase === "turn") {
      L.push({ t: "take", src: "up" });
      if (st.deck.length) L.push({ t: "take", src: "deck" });
      if (st.bell < 0) { L.push({ t: "bell" }); if (fourV(h)) L.push({ t: "four" }); }
    } else if (st.phase === "reveal") { for (const cs of combos(h)) L.push({ t: "show", cards: cs }); }
    else for (const c of h) L.push({ t: "drop", c });
    return L;
  }

  // 공개 결과 (조합 카드만 — 'all' 은 손패 전체)
  const pubRes = (r, all) => (r ? { r: r.r, set: r.set, kind: r.kind, who: r.who, order: r.order.slice(), sums: r.sums.slice(), combo: r.combo.map(x => x.slice()), ck: r.ck.slice(), chose: r.chose, lost: r.lost.slice(), before: r.before.slice(), lives: r.lives.slice(), turns: r.turns, hands: all ? r.hands.map(h => h.slice()) : null } : null);
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1;
    const gotPub = st.phase === "drop" && (all || st.cur === me || st.src === "up") ? st.got : -1;
    const pubObj = { r: st.round, s: st.set, p: st.phase, l: st.lives, w: st.wins, u: st.up, d: st.deck.length, x: st.disc, hn: st.hands.map(h => h.length), k: st.known, c: st.cur, b: st.bell, f: st.four, a: st.after, sr: st.src, g: st.src === "up" ? st.got : -1, h: st.hist.length, ov: st.over, sh: st.shown, sw: st.sw };
    const v = {
      n: st.n, R: st.R, need: st.need, round: st.round, set: st.set, maxSet: MAXSET, phase: st.phase, over: st.over,
      teams: st.teams.map(t => t.slice()), teamOf: st.teamOf.slice(), lives: st.lives.slice(), wins: st.wins.slice(), lifeSum: st.lifeSum.slice(),
      up: st.up, deckN: st.deck.length, disc: st.disc.slice(), handN: st.hands.map(h => h.length), known: st.known.map(k => k.slice()),
      hand: me >= 0 ? st.hands[me].slice() : null, got: gotPub, src: st.phase === "drop" ? st.src : "",
      hands: all ? st.hands.map(h => h.slice()) : null, deck: all ? st.deck.slice() : null,
      rv: st.rv ? { kind: st.rv.kind, who: st.rv.who, order: st.rv.order.slice(), k: st.rv.k } : null, shown: st.shown ? st.shown.map(x => (x ? x.slice() : null)) : null,
      swaps: st.sw.slice(), start: st.start, cur: st.cur, bell: st.bell, four: st.four, after: st.after.slice(), lastBell: st.lastBell, turns: st.turns,
      res: pubRes(st.res, all), rres: st.rres ? { ...st.rres, win: st.rres.win.slice(), out: st.rres.out.slice(), wins: st.rres.wins.slice() } : null,
      hist: st.hist.map(r => pubRes(r, all)), rounds: st.rounds.map(x => ({ ...x, win: x.win.slice(), out: x.out.slice(), wins: x.wins.slice() })),
      needs: needs(st), ranks: st.over ? ranks(st) : null, log: st.log.slice(-80).map(e => ({ ...e, cards: e.cards ? e.cards.slice() : undefined, sums: e.sums ? e.sums.slice() : undefined, lost: e.lost ? e.lost.slice() : undefined, win: e.win ? e.win.slice() : undefined })),
      score: st.teamOf.map(t => st.wins[t]), seat, pub: hash(JSON.stringify(pubObj)),
    };
    return JSON.parse(JSON.stringify(v));                // 깊은 복사: 화면 · 선생님 · AI 가 V 를 건드려도 판은 그대로
  }

  // ── AI (보이는 것만) ─────────────────────────────────────────
  // 남 손패의 모르는 칸 · 더미에 있을 수 있는 카드 = 40장 − 내 손패 − 앞면 − 깔린 앞면 − 남이 앞면에서 가져가 아직 든 카드
  function pool(V, me) {
    const seen = new Uint8Array(NCARD);
    for (const c of V.hand) seen[c] = 1;
    if (V.up >= 0) seen[V.up] = 1;
    for (const c of V.disc) seen[c] = 1;
    V.known.forEach((k, j) => { if (j !== me) for (const c of k) seen[c] = 1; });
    if (V.shown) V.shown.forEach((k, j) => { if (k && j !== me) for (const c of k) seen[c] = 1; });
    const p = []; for (let c = 0; c < NCARD; c++) if (!seen[c]) p.push(c);
    return p;
  }
  // 한 장 더 볼 때의 기대 상승 (P 에서 한 장 → 가장 좋은 한 장 버림)
  const T5 = [0, 0, 0, 0, 0];
  function lookPot(h, P) {
    if (!P.length) return 0;
    const b0 = bestSum(h, -1); let tot = 0;
    for (let i = 0; i < 4; i++) T5[i] = h[i];
    for (const x of P) {
      T5[4] = x; let bb = b0;
      for (let d = 0; d < 5; d++) { const s = bestSum(T5, d); if (s > bb) bb = s; }
      tot += bb - b0;
    }
    return tot / P.length;
  }
  // 4장 손패의 값 = 지금 최고 합 + lam × 한 장 더 볼 때 기대 상승
  const hval = (h, P, lam) => bestSum(h, -1) + (lam > 0 ? lam * lookPot(h, P) : 0);
  // 다음 사람(앞면을 받는 사람)이 이 카드를 반길 정도 — 그 사람이 앞면에서 가져가 든 카드와 색 · 숫자가 겹치면 그만큼
  function helpNext(V, me, c) {
    const j = (me + 1) % V.n, k = V.known[j]; let s = 0;
    for (const x of k) { if (col(x) === col(c)) s += num(c); else if (num(x) === num(c)) s += num(c); }
    return V.teamOf[j] === V.teamOf[me] ? -s : s;
  }
  function lamOf(V) { return V.bell >= 0 ? 0 : V.deckN > V.n * 2 ? 0.7 : V.deckN > V.n ? 0.35 : 0.1; }
  // 버릴 카드 고르기 (5장 손패) — 값이 가장 큰 4장을 남김
  function dropPick(V, me, P, lam, deny) {
    const h = V.hand, L = [];
    for (let d = 0; d < h.length; d++) {
      const rest = h.filter((_, i) => i !== d);
      const v = hval(rest, P, lam) - (deny ? deny * helpNext(V, me, h[d]) / 10 : 0);
      L.push({ c: h[d], v, sum: bestSum(rest, -1) });
    }
    L.sort((a, b) => b.v - a.v || num(a.c) - num(b.c) || a.c - b.c);
    return L;
  }
  // 앞면 vs 뒷면: 앞면은 (손패 + 앞면) 에서 가장 좋은 4장, 뒷면은 P 의 카드마다 가장 좋은 4장의 평균
  function takeEval(V, me, P, lam) {
    const h = V.hand, f5 = x => { const t = h.concat([x]); let bv = -1e9; for (let d = 0; d < 5; d++) { const rest = t.filter((_, i) => i !== d); const v = hval(rest, P, lam); if (v > bv) bv = v; } return bv; };
    const up = V.up >= 0 ? f5(V.up) : -1e9;
    let deck = -1e9;
    if (V.deckN > 0 && P.length) { let tot = 0; for (const x of P) tot += f5(x); deck = tot / P.length; }
    return { up, deck, now: hval(h, P, lam) };
  }
  // 벨을 지금 치면: 남 손패를 P 에서 채워 보고, 나머지 사람이 한 번씩 욕심껏 바꾼 뒤 비교 → 내 팀 기준 목숨 득실
  const KO = 2.5, IMPROVE = 6;                         // 남 손패: 이번 세트에 바꾼 횟수만큼(최대 6번) 욕심껏 다듬었다고 봄                                          // 목숨이 0이 되면(라운드 짐) 더 얹는 값
  // 이번 세트에 그 사람이 바꾼 횟수 (공개 기록) — 바꿀수록 손패가 좋아졌다고 봄
  function swapsThisSet(V) { return V.swaps.slice(); }          // 공개 값 (기록이 잘려도 정확)
  // 남 손패 한 벌 뽑기: 아는 카드 + 남은 카드, 이번 세트에 바꾼 만큼(최대 IMPROVE 번) 욕심껏 다듬었다고 봄 (가져간 앞면 카드는 그대로)
  function sampleHand(V, j, h, bag, bp, swaps) {
    const k = V.known[j]; let m = 0; for (const c of k) h[m++] = c; while (m < 4) h[m++] = bag[bp++];
    const fixed = k.length;
    for (let z = 0; z < Math.min(swaps, IMPROVE) && bp < bag.length; z++) {
      h[4] = bag[bp++]; let bv = bestSum(h, 4), bd = 4;
      for (let d = fixed; d < 4; d++) { const s = bestSum(h, d); if (s > bv) { bv = s; bd = d; } }
      if (bd !== 4) h[bd] = h[4];
    }
    return bp;
  }
  function bellEV(V, me, S, r) {
    const P = pool(V, me), n = V.n, order = [], sw = swapsThisSet(V);
    for (let k = 1; k < n; k++) order.push((me + k) % n);
    const mine = bestSum(V.hand, -1);
    let U = 0, pLow = 0, pOpp = 0;
    const hs = Array.from({ length: n }, () => [0, 0, 0, 0, 0]);
    for (let q = 0; q < S; q++) {
      const bag = shuffle(r, P.slice()); let bp = 0;
      for (const j of order) bp = sampleHand(V, j, hs[j], bag, bp, sw[j]);
      let up = V.up, dk = V.deckN;
      const sums = Array(n).fill(0); sums[me] = mine;
      for (const j of order) {
        const h = hs[j], b = bestSum(h.slice(0, 4), -1);
        h[4] = up; let bd = 4, bv = b;                    // 앞면을 가져와 가장 좋은 한 장 버림
        for (let d = 0; d < 4; d++) { const s = bestSum(h, d); if (s > bv) { bv = s; bd = d; } }
        if (bd === 4 && bp < bag.length && dk > 0) {      // 앞면이 도움 안 되면 뒷면 (남은 더미만큼)
          h[4] = bag[bp++]; bv = b; bd = 4; dk--;
          for (let d = 0; d < 4; d++) { const s = bestSum(h, d); if (s > bv) { bv = s; bd = d; } }
        }
        const out = h[bd]; if (bd !== 4) h[bd] = h[4]; up = out; sums[j] = bv;
      }
      let m = 1e9; for (let j = 0; j < n; j++) if (sums[j] < m) m = sums[j];
      let u = 0;
      for (let j = 0; j < n; j++) if (sums[j] === m) {
        const loss = j === me ? 2 : 1, val = loss + (V.lives[j] - loss <= 0 ? KO : 0);
        u += V.teamOf[j] === V.teamOf[me] ? -val : val;
        if (j === me) pLow++; else if (V.teamOf[j] !== V.teamOf[me]) pOpp++;
      }
      U += u;
    }
    return { U: U / S, pLow: pLow / S, pOpp: pOpp / S, mine };
  }
  // 2:2 공개 고르기: 낼 수 있는 합마다, 아직 안 낸 사람 손패를 뽑아 보고(그 사람들은 가장 큰 조합을 낸다고 봄) 팀 득실을 셈
  //  득실 = 상대 팀이 잃는 목숨 − 우리 팀이 잃는 목숨 + 목숨 1 로 남는 사람(우리 −0.4 · 상대 +0.4) + 라운드 승패 ±RW
  const RW = 5, S_REV = 160;
  function revealUtil(V, me, sums) {
    const n = V.n, kind = V.rv.kind, who = V.rv.who, lost = Array(n).fill(0);
    let m = 1e9; for (let j = 0; j < n; j++) if (sums[j] < m) m = sums[j];
    for (let j = 0; j < n; j++) if (sums[j] === m) lost[j] = kind === "bell" && j === who ? 2 : 1;
    let u = 0, outM = false, outO = false;
    for (let j = 0; j < n; j++) {
      const mine = V.teamOf[j] === V.teamOf[me], left = V.lives[j] - lost[j];
      u += mine ? -lost[j] : lost[j];
      if (left <= 0) { if (mine) outM = true; else outO = true; }
      else if (left === 1 && lost[j]) u += mine ? -0.4 : 0.4;
    }
    if (outM && outO) u += V.lastBell >= 0 ? (V.teamOf[V.lastBell] === V.teamOf[me] ? RW : -RW) : 0;
    else if (outM) u -= RW; else if (outO) u += RW;
    return u;
  }
  function revealPick(V, me, r) {
    const b = best(V.hand), opts = new Map();
    opts.set(b.sum, b.cards);
    for (const cs of combos(V.hand)) { const x = sumOf(cs); if (!opts.has(x)) opts.set(x, cs); }
    const cand = [...opts.keys()].sort((x, y) => y - x);          // 큰 합부터 (같은 값이면 큰 합 = 숨김 없는 쪽)
    const ord = V.rv.order, pos = ord.indexOf(me), later = ord.slice(pos + 1), sums = Array(V.n).fill(0);
    for (const j of ord.slice(0, pos)) sums[j] = sumOf(V.shown[j]);
    const U = new Map(cand.map(x => [x, 0]));
    const S = later.length ? S_REV : 1, P = pool(V, me), sw = swapsThisSet(V), hs = [0, 0, 0, 0, 0];
    for (let q = 0; q < S; q++) {
      const bag = later.length ? shuffle(r, P.slice()) : P; let bp = 0;
      for (const j of later) { bp = sampleHand(V, j, hs, bag, bp, sw[j]); sums[j] = bestSum(hs, 4); }
      for (const x of cand) { sums[me] = x; U.set(x, U.get(x) + revealUtil(V, me, sums)); }
    }
    let bx = b.sum, bu = U.get(b.sum) / S;
    for (const x of cand) { const u = U.get(x) / S; if (u > bu + 0.05) { bu = u; bx = x; } }
    return { a: { t: "show", cards: opts.get(bx).slice() }, U: cand.map(x => ({ sum: x, u: U.get(x) / S, cards: opts.get(x).slice() })), best: b.sum, pick: bx };
  }
  const S_HARD = 128;                                      // 표본 수: 부하 100% PC 에서도 한 번 150ms 안
  const bellT = n => (n === 2 ? 0.4 : 1.0);              // 벨 문턱(목숨 득실): 시험 hard vs normal — 1:1 0.35→79% · 1.0→77%, 3·4명 0.35→54·59% · 1.0→63·66%
  function hardPick(V, me, r) {
    if (V.phase === "reveal") return revealPick(V, me, r);
    const P = pool(V, me), lam = lamOf(V);
    if (V.phase === "drop") {
      const L = dropPick(V, me, P, lam, 1);
      return { a: { t: "drop", c: L[0].c }, L, lam };
    }
    if (V.bell < 0 && fourV(V.hand)) return { a: { t: "four" }, four: fourV(V.hand) };
    let E = null;
    if (V.bell < 0) {
      E = bellEV(V, me, S_HARD, r);
      // 남은 더미가 적을수록 벨 없이 끝날 수 있어 문턱을 조금 낮춤
      const th = bellT(V.n) - (V.deckN <= V.n ? 0.25 : 0);
      if (E.U > th) return { a: { t: "bell" }, E, th };
    }
    const T = takeEval(V, me, P, lam);
    const src = T.deck > T.up + 0.05 || V.up < 0 ? "deck" : "up";
    return { a: { t: "take", src: V.deckN > 0 ? src : "up" }, E, T, lam };
  }
  function ai(V, me, tier, r) {
    if (!V || V.over || !V.needs || !V.needs.includes(me) || !V.hand) return null;
    if (tier === "hard") return hardPick(V, me, r).a;
    const h = V.hand, s = bestSum(h, -1);
    if (V.phase === "reveal") return { t: "show", cards: best(h).cards };
    if (V.phase === "drop") {
      if (tier === "easy" && r() < 0.3) return { t: "drop", c: h[Math.floor(r() * h.length)] };
      const L = dropPick(V, me, [], 0, 0);
      return { t: "drop", c: L[0].c };
    }
    if (V.bell < 0 && fourV(h)) return { t: "four" };
    if (V.bell < 0) {
      if (tier === "normal" && s >= (V.n === 2 ? 18 : 19) && V.turns >= 1) return { t: "bell" };
      if (tier === "easy" && V.turns >= 1 && r() < 0.35 && s >= 13 + Math.floor(r() * 9)) return { t: "bell" };
    }
    if (tier === "easy") return { t: "take", src: V.deckN > 0 && r() < 0.5 ? "deck" : "up" };
    // 중급: 앞면이 지금 합을 올리면 앞면, 아니면 뒷면
    const t = h.concat([V.up]); let bv = s;
    for (let d = 0; d < 5; d++) { const x = bestSum(t, d); if (x > bv) bv = x; }
    return { t: "take", src: bv > s || V.deckN === 0 ? "up" : "deck" };
  }
  function recRnd(V, me) {
    let a = (parseInt(hash(JSON.stringify([V.round, V.set, V.phase, V.turns, V.hand, V.up, V.disc, V.known, V.lives, V.bell, V.shown, me])), 36) >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function recommend(V, me) { return hardPick(V, me, recRnd(V, me)); }

  return {
    id: "ringbell", HAND, LIVES, MAXSET, CN, col, num, cname,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, recRnd,
    bellT, S_HARD, S_REV, RW, swapsThisSet, best, bestSum, fourV, combos, validCombo, sumOf, revealPick, revealUtil, pool, lookPot, takeEval, dropPick, bellEV, hardPick, helpNext, lamOf, teamsFor,
  };
});
