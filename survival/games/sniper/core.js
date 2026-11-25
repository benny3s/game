/* 베니 서바이벌 · 저격 홀덤 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 3일차 감옥 매치 (5명)
   · 카드 1~10 네 벌(40장). 각자 칩 60개. 라운드마다 기본 베팅 1개 → 개인 카드 2장(나만 봄) → 공유 카드 2장 공개 → 1차 베팅
     → 공유 카드 2장 더 → 2차 베팅. 한 사람이 한 라운드에 거는 칩은 '칩이 가장 적은 사람의 칩 수'까지
   · 베팅: 체크 · 콜 · 레이즈 · 포기. 모두 같은 칩을 걸면 그 베팅 끝. 혼자 남으면 바로 판돈을 가져감
   · 족보 = 공유 4장 + 개인 2장 중 가장 좋은 조합: 포카드 > 풀하우스 > 스트레이트(5장 연속) > 트리플 > 투페어 > 원페어 > 하이카드
   · 개인 카드 공개 전, 선부터 차례로 족보 하나를 '저격' (가장 높은 숫자 + 족보, 풀하우스는 트리플 숫자) — 저격당한 족보는 꼴찌
   · 가장 높은 족보가 판돈. 같은 등급이면 족보 숫자 → 높은 개인 카드 → 다른 개인 카드. 완전히 같거나 모두 저격당하면 똑같이 나눔
     (남는 칩은 베팅 순서가 빠른 사람부터 1개씩)
   · 칩이 75개 이상이 되면 75개를 내고 생존 확정 — 남는 칩은 다른 사람에게 줌 (칩이 0인 사람에게는 1개 이상)
   · 끝까지 생존하지 못한 사람이 탈락 (방송은 1명)
   방송과 다른 점: 앱은 3~6명 (빈 자리는 AI · 규칙 코드는 2명도 받음) · 선은 무작위로 시작해 라운드마다 다음 사람 · 레이즈 단위 1개 · 포기한 사람은 저격 안 함 ·
     남는 칩은 한 사람에게 몰아 줌 (0 인 사람 1개씩 먼저) · 라운드 시작에 칩이 0 인 사람이 있으면 그 사람이 탈락하고 끝 ·
     80라운드가 지나면 칩이 가장 적은 사람이 탈락 · 시작 칩 옵션 20개 (생존 25개)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 장면에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).sniper = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CATS = ["하이카드", "원페어", "투페어", "트리플", "스트레이트", "풀하우스", "포카드"];
  const OPTS = { chips: [60, 20] };
  const MAXR = 80;
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 300) st.log.shift(); }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ── 족보 ──
  // best(cards 6장) → { c 등급, num 선언 숫자, k 비교 값(등급 · 족보 숫자), use 족보 숫자들 }
  function best(cards) {
    const cnt = Array(11).fill(0); for (const v of cards) cnt[v]++;
    const by = n => { const o = []; for (let v = 10; v >= 1; v--) if (cnt[v] >= n) o.push(v); return o; };
    const q = by(4), t = by(3), p = by(2);
    let c, use;
    if (q.length) { c = 6; use = [q[0]]; }
    else if (t.length && p.filter(v => v !== t[0]).length) { c = 5; use = [t[0], p.filter(v => v !== t[0])[0]]; }
    else {
      let top = 0; for (let v = 10; v >= 5 && !top; v--) { let ok = true; for (let d = 0; d < 5; d++) if (!cnt[v - d]) { ok = false; break; } if (ok) top = v; }
      if (top) { c = 4; use = [top]; }
      else if (t.length) { c = 3; use = [t[0]]; }
      else if (p.length >= 2) { c = 2; use = [p[0], p[1]]; }
      else if (p.length) { c = 1; use = [p[0]]; }
      else { c = 0; use = [by(1)[0]]; }
    }
    let k = c * 1e4 + use[0] * 100 + (use[1] || 0);
    return { c, num: use[0], k, use };
  }
  // 겨룰 때 값: 족보 → 높은 개인 카드 → 다른 개인 카드 (저격당하면 맨 아래)
  const fullKey = (h, priv) => { const a = Math.max(priv[0], priv[1]), b = Math.min(priv[0], priv[1]); return h.k * 1e4 + a * 100 + b; };
  const handName = (c, num) => `${num} ${CATS[c]}`;
  const validSnipe = (c, num) => Number.isInteger(c) && c >= 0 && c <= 6 && Number.isInteger(num) && num >= 1 && num <= 10 && !(c === 4 && num < 5);

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(2, Math.min(6, n | 0 || 5));
    const o = optsOf(cfg), start = o.chips, goal = Math.round(start * 1.25);
    const st = { n, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, start, goal, chips: Array(n).fill(start),
      surv: Array(n).fill(-1), survR: Array(n).fill(0), nsurv: 0, out: Array(n).fill(false), round: 0, first: Math.floor(mix(seed, 7) * n) % n,
      phase: "bet1", deck: [], hands: [], board: [], shown: 0, inH: [], put: Array(n).fill(0), cap: 0, ord: [], ti: 0, acted: [],
      snipes: Array(n).fill(null), pot: 0, gift: null, last: null, hist: [], log: [], seq: 0, over: false, res: null };
    startRound(st);
    return st;
  }
  const alive = (st, s) => st.surv[s] < 0 && !st.out[s];
  const actives = st => { const o = []; for (let i = 0; i < st.n; i++) { const s = (st.first + i) % st.n; if (alive(st, s)) o.push(s); } return o; };
  function shuffle(st) {
    const d = []; for (let v = 1; v <= 10; v++) d.push(v, v, v, v);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(mix(st.rs, st.round, i, 31) * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }
  function startRound(st) {
    st.round++;
    if (st.round > 1) { let f = st.first; for (let i = 1; i <= st.n; i++) { const s = (st.first + i) % st.n; if (alive(st, s)) { f = s; break; } } st.first = f; }
    const A = actives(st);
    st.deck = shuffle(st);
    st.hands = Array.from({ length: st.n }, () => null);
    for (const s of A) st.hands[s] = [st.deck.pop(), st.deck.pop()];
    st.board = [st.deck.pop(), st.deck.pop(), st.deck.pop(), st.deck.pop()];
    st.shown = 2;
    st.cap = Math.min(...A.map(s => st.chips[s]));
    st.put = Array(st.n).fill(0); st.pot = 0;
    for (const s of A) { st.chips[s] -= 1; st.put[s] = 1; st.pot += 1; }
    st.inH = Array(st.n).fill(false); for (const s of A) st.inH[s] = true;
    st.snipes = Array(st.n).fill(null); st.last = null; st.gift = null;
    push(st, { k: "round", r: st.round, first: st.first, cap: st.cap });
    startStreet(st, "bet1");
  }
  function startStreet(st, ph) {
    st.phase = ph; st.ord = actives(st).filter(s => st.inH[s]); st.ti = 0; st.acted = Array(st.n).fill(false);
    if (ph === "snipe") push(st, { k: "snipe", r: st.round });
    skipDone(st);
  }
  const maxPut = st => Math.max(...st.put);
  // 베팅 차례 고르기: 아직 할 사람이 없으면 다음 단계로
  function skipDone(st) {
    if (st.phase === "bet1" || st.phase === "bet2") {
      const live = st.ord.filter(s => st.inH[s]);
      if (live.length <= 1) return showdown(st, true);
      const m = maxPut(st);
      const need = s => st.inH[s] && (!st.acted[s] || st.put[s] < m);
      // 레이즈가 불가능하고(모두 상한) 콜만 남은 게 아니면 그대로
      for (let k = 0; k < st.ord.length; k++) { const s = st.ord[(st.ti + k) % st.ord.length]; if (need(s)) { st.ti = (st.ti + k) % st.ord.length; return; } }
      // 모두 맞춤 → 다음
      if (st.phase === "bet1") { st.shown = 4; push(st, { k: "board", r: st.round, b: st.board.slice() }); startStreet(st, "bet2"); }
      else startStreet(st, "snipe");
      return;
    }
    if (st.phase === "snipe") {
      while (st.ti < st.ord.length && !st.inH[st.ord[st.ti]]) st.ti++;
      if (st.ti >= st.ord.length) showdown(st, false);
    }
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "bet1" || st.phase === "bet2" || st.phase === "snipe") return [st.ord[st.ti]];
    if (st.phase === "gift") return [st.gift.s];
    return [];
  }
  const over = st => !!st.over;
  function toCall(st, s) { return maxPut(st) - st.put[s]; }

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: st.phase === "show" ? "잠깐 — 결과를 보는 중이에요" : "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    const ph = st.phase;
    if (ph === "bet1" || ph === "bet2") {
      const m = maxPut(st), c = m - st.put[seat];
      if (a.t === "fold") { st.inH[seat] = false; push(st, { k: "act", r: st.round, s: seat, a: { t: "fold" } }); }
      else if (a.t === "check") { if (c > 0) return { ok: false, err: `콜하려면 칩 ${c}개가 필요해요` }; st.acted[seat] = true; push(st, { k: "act", r: st.round, s: seat, a: { t: "check" } }); }
      else if (a.t === "call") { if (c <= 0) return { ok: false, err: "낼 칩이 없어요 — 체크해요" }; st.chips[seat] -= c; st.put[seat] += c; st.pot += c; st.acted[seat] = true; push(st, { k: "act", r: st.round, s: seat, a: { t: "call", n: c } }); }
      else if (a.t === "raise") {
        const to = a.to;
        if (!Number.isInteger(to) || to <= m) return { ok: false, err: "지금보다 높게 올려요" };
        if (to > st.cap) return { ok: false, err: `한 라운드에 ${st.cap}개까지만 걸 수 있어요` };
        const d = to - st.put[seat]; st.chips[seat] -= d; st.put[seat] = to; st.pot += d;
        st.acted = st.acted.map((x, s) => s === seat); push(st, { k: "act", r: st.round, s: seat, a: { t: "raise", to } });
      } else return { ok: false, err: "포기 · 체크 · 콜 · 레이즈 중에서 골라요" };
      st.ti = (st.ti + 1) % st.ord.length;
      skipDone(st);
      return { ok: true };
    }
    if (ph === "snipe") {
      if (a.t !== "snipe") return { ok: false, err: "저격할 족보를 고르거나 '저격 안 함'" };
      if (a.pass) st.snipes[seat] = { pass: true };
      else { if (!validSnipe(a.c, a.num)) return { ok: false, err: "없는 족보예요" }; st.snipes[seat] = { c: a.c, num: a.num }; }
      push(st, { k: "act", r: st.round, s: seat, a: a.pass ? { t: "snipe", pass: true } : { t: "snipe", c: a.c, num: a.num } });
      st.ti++;
      skipDone(st);
      return { ok: true };
    }
    if (ph === "gift") {
      const G = st.gift;
      if (a.t !== "gift" || !G.to.includes(a.to)) return { ok: false, err: "칩을 줄 사람을 골라요" };
      st.chips[a.to] += G.left;
      if (alive(st, a.to) && st.chips[a.to] >= st.goal) (st.chk = st.chk || []).push(a.to);   // 받은 칩으로 75개 → 바로 생존
      push(st, { k: "gift", s: seat, to: a.to, n: G.left, ones: G.ones.slice() });
      st.gift = null;
      afterGifts(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 일이 없어요" };
  }

  function showdown(st, fold) {
    const live = st.ord.filter(s => st.inH[s]);
    const res = { r: st.round, pot: st.pot, fold, board: st.board.slice(0, st.shown), hands: {}, snipes: st.snipes.map(x => (x ? Object.assign({}, x) : null)), win: [], gain: Array(st.n).fill(0), put: st.put.slice() };
    if (fold) { res.win = live.slice(); }
    else {
      const sn = st.snipes.filter(x => x && !x.pass);
      let bestK = -1, ws = [];
      for (const s of live) {
        const h = best(st.hands[s].concat(st.board)), hit = sn.some(x => x.c === h.c && x.num === h.num);
        const fk = hit ? -1 : fullKey(h, st.hands[s]);
        res.hands[s] = { cards: st.hands[s].slice(), c: h.c, num: h.num, use: h.use.slice(), hit, fk };
        if (fk > bestK) { bestK = fk; ws = [s]; } else if (fk === bestK) ws.push(s);
      }
      res.win = ws;
    }
    // 판돈 나누기 (남는 칩은 베팅 순서가 빠른 사람부터)
    const per = Math.floor(st.pot / res.win.length); let rem = st.pot - per * res.win.length;
    for (const s of st.ord) if (res.win.includes(s)) { const g = per + (rem > 0 ? 1 : 0); if (rem > 0) rem--; st.chips[s] += g; res.gain[s] = g; }
    st.pot = 0; st.last = res; st.phase = "show";
    push(st, { k: "show", r: st.round, win: res.win.slice(), fold, gain: res.gain.slice(), hands: JSON.parse(JSON.stringify(res.hands)) });
  }
  const auto = st => (st.over ? null : st.phase === "show" ? (st.last && st.last.fold ? 2600 : 5200) : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    st.hist.push(JSON.parse(JSON.stringify(st.last)));
    st.chk = actives(st).filter(s => st.chips[s] >= st.goal);
    afterGifts(st);
  }
  // 생존 확정 → (남는 칩 주기) → 끝 확인 → 다음 라운드
  function afterGifts(st) {
    while (st.chk && st.chk.length) {
      const s = st.chk.shift();
      if (!alive(st, s) || st.chips[s] < st.goal) continue;
      st.chips[s] -= st.goal; st.surv[s] = st.nsurv++; st.survR[s] = st.round;
      let left = st.chips[s]; st.chips[s] = 0;
      push(st, { k: "surv", s, left, r: st.round });
      const rest = actives(st);
      if (rest.length <= 1) { if (rest.length) st.chips[rest[0]] += left; return finish(st); }
      const zero = rest.filter(o => st.chips[o] === 0), ones = [];
      for (const o of zero) if (left > 0) { st.chips[o] += 1; left--; ones.push(o); }
      if (left > 0) { st.gift = { s, left, to: rest.slice(), ones }; st.phase = "gift"; return; }
      if (ones.length) push(st, { k: "gift", s, to: -1, n: 0, ones });
    }
    st.chk = null;
    const rest = actives(st);
    const broke = rest.filter(s => st.chips[s] <= 0);
    if (rest.length <= 1 || broke.length) return finish(st, broke);
    if (st.round >= MAXR) { const lo = Math.min(...rest.map(s => st.chips[s])); return finish(st, rest.filter(s => st.chips[s] === lo)); }
    startRound(st);
  }
  function finish(st, losers) {
    const rest = actives(st);
    const L = losers && losers.length ? losers : rest.length === 1 ? rest : [];
    for (const s of L) st.out[s] = true;
    st.over = true; st.phase = "end";
    st.res = { out: L.slice(), surv: st.surv.slice(), chips: st.chips.slice() };
    push(st, { k: "end", out: L.slice() });
  }
  // 순위: 먼저 생존한 순 → 끝까지 남은 사람은 칩 순 → 탈락
  function ranks(st) {
    const sc = s => (st.surv[s] >= 0 ? 1e6 - st.surv[s] * 1e3 : st.out[s] ? -1 : st.chips[s]);
    const v = st.chips.map((c, s) => sc(s));
    return v.map(x => v.filter(y => y > x).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const ph = st.phase;
    if (ph === "bet1" || ph === "bet2") {
      const m = maxPut(st), c = m - st.put[seat], o = [{ t: "fold" }];
      o.push(c > 0 ? { t: "call" } : { t: "check" });
      for (let to = m + 1; to <= st.cap; to++) o.push({ t: "raise", to });
      return o;
    }
    if (ph === "snipe") { const o = [{ t: "snipe", pass: true }]; for (let c = 0; c <= 6; c++) for (let num = 1; num <= 10; num++) if (validSnipe(c, num)) o.push({ t: "snipe", c, num }); return o; }
    if (ph === "gift") return st.gift.to.map(to => ({ t: "gift", to }));
    return [];
  }

  // ── 보이는 것: 남의 개인 카드는 쇼다운(포기 안 한 사람)에서만, 안 깐 공유 카드 · 덱은 안 보임 ──
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, all = seat === "all";
    const pubObj = { r: st.round, p: st.phase, f: st.first, c: st.chips, s: st.surv, o: st.out, b: st.board.slice(0, st.shown), ih: st.inH, pu: st.put, cap: st.cap, ord: st.ord, ti: st.ti,
      sn: st.snipes, pot: st.pot, g: st.gift ? [st.gift.s, st.gift.left] : 0, l: st.last ? st.last.r : 0, h: st.hist.length };
    const mine = st.hands.map((h, s) => (h && (all || s === me) ? h.slice() : null));
    return {
      n: st.n, opt: Object.assign({}, st.opt), start: st.start, goal: st.goal, round: st.round, phase: st.phase, first: st.first,
      chips: st.chips.slice(), surv: st.surv.slice(), survR: st.survR.slice(), out: st.out.slice(), board: st.board.slice(0, st.shown), shown: st.shown,
      hands: mine, inH: st.inH.slice(), put: st.put.slice(), cap: st.cap, ord: st.ord.slice(), ti: st.ti, cur: needs(st)[0] ?? -1,
      toCall: me >= 0 ? toCall(st, me) : 0, maxPut: maxPut(st), pot: st.pot, snipes: st.snipes.map(x => (x ? Object.assign({}, x) : null)),
      gift: st.gift ? { s: st.gift.s, left: st.gift.left, to: st.gift.to.slice(), ones: st.gift.ones.slice() } : null,
      last: st.last ? JSON.parse(JSON.stringify(st.last)) : null, hist: st.hist.map(h => JSON.parse(JSON.stringify(h))),
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)).toString(36),
    };
  }

  // ── AI ──
  // 모르는 카드: 40장 − 보이는 공유 카드 − 내 카드 − 지난 쇼다운? (이번 라운드만)
  function unknownDeck(V, me) {
    const cnt = Array(11).fill(4);
    for (const v of V.board) cnt[v]--;
    for (const h of V.hands) if (h) for (const v of h) cnt[v]--;          // 보이는 개인 카드 (평소엔 내 것만)
    const d = []; for (let v = 1; v <= 10; v++) for (let k = 0; k < cnt[v]; k++) d.push(v);
    return d;
  }
  // 표본: 남의 개인 카드 + 남은 공유 카드
  function sample(V, me, R, opps) {
    const d = unknownDeck(V, me);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    const board = V.board.slice(); while (board.length < 4) board.push(d.pop());
    const hands = {}; for (const o of opps) hands[o] = V.hands[o] ? V.hands[o].slice() : [d.pop(), d.pop()];
    return { board, hands };
  }
  // 상대 베팅 읽기: 그때 보이던 공유 카드에서 개인 카드 두 장이 얼마나 센지(0~1 백분위)
  function pctTable(bd) {
    const cnt = Array(11).fill(4); for (const v of bd) cnt[v]--;
    const rows = []; let tot = 0;
    for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) {
      const w = a === b ? cnt[a] * (cnt[a] - 1) / 2 : cnt[a] * cnt[b]; if (w <= 0) continue;
      rows.push({ a, b, w, k: fullKey(best([a, b].concat(bd)), [a, b]) }); tot += w;
    }
    rows.sort((x, y) => x.k - y.k);
    const pct = {}; let acc = 0;
    for (let i = 0; i < rows.length;) { let j = i, ws = 0; while (j < rows.length && rows[j].k === rows[i].k) ws += rows[j++].w; for (let t = i; t < j; t++) pct[rows[t].a * 11 + rows[t].b] = (acc + ws / 2) / tot; acc += ws; i = j; }
    return pct;
  }
  // 이번 라운드 상대 행동 (1 = 공유 2장 때, 2 = 4장 때)
  function readActs(V) {
    const acts = {}; let i = -1;
    for (let k = V.log.length - 1; k >= 0; k--) if (V.log[k].k === "round" && V.log[k].r === V.round) { i = k; break; }
    if (i < 0) return acts;
    let street = 1;
    for (let k = i + 1; k < V.log.length; k++) {
      const e = V.log[k];
      if (e.k === "board") street = 2;
      else if (e.k === "act" && e.a && e.a.t !== "snipe" && e.a.t !== "fold") (acts[e.s] = acts[e.s] || []).push({ st: street, t: e.a.t });
    }
    return acts;
  }
  // rd = { r 레이즈 지수, c 콜 지수, k 체크 깎기 } → 표본마다 무게 함수
  function reader(V, me, rd) {
    if (!rd) return null;
    const acts = readActs(V), T1 = pctTable(V.board.slice(0, 2)), T2 = V.board.length === 4 ? pctTable(V.board) : null;
    const who = Object.keys(acts).map(Number).filter(o => o !== me);
    if (!who.length) return null;
    return hands => {
      let w = 1;
      for (const o of who) {
        const h = hands[o]; if (!h) continue;
        const key = Math.min(h[0], h[1]) * 11 + Math.max(h[0], h[1]);
        for (const x of acts[o]) {
          const p = ((x.st === 2 && T2) ? T2 : T1)[key] ?? 0.5;
          w *= x.t === "raise" ? Math.pow(p, rd.r) : x.t === "call" ? Math.pow(p, rd.c) : 1 - rd.k * p;
        }
      }
      return w;
    };
  }
  // 저격 모형: 아직 저격 안 한 사람은 q 의 확률로 '자기를 이기는 가장 센 패'를 읽어 저격 (나머지는 헛저격 = 영향 없음)
  //  P = [{ s, h, p }] 표본 속 모든 사람의 패, order = 저격 순서, sn = 이미 나온 저격 → 늘어난 저격 목록
  function modelSnipes(P, order, sn, rq, q) {
    const all = sn.slice();
    for (const o of order) {
      if (!(rq[o] < q)) continue;
      const mine = P.find(x => x.s === o); if (!mine) continue;
      const hitOf = x => all.some(y => y.c === x.h.c && y.num === x.h.num);
      const myK = hitOf(mine) ? -1 : fullKey(mine.h, mine.p);
      let tgt = null, tk = myK;
      for (const x of P) { if (x.s === o || hitOf(x)) continue; const k = fullKey(x.h, x.p); if (k > tk) { tk = k; tgt = x; } }
      if (tgt) all.push({ c: tgt.h.c, num: tgt.h.num });
    }
    return all;
  }
  function judgeSample(P, me, all) {
    const hitOf = x => all.some(y => y.c === x.h.c && y.num === x.h.num);
    let mk = -1, bk = -1, ties = 0;
    for (const x of P) { const k = hitOf(x) ? -1 : fullKey(x.h, x.p); if (x.s === me) mk = k; else if (k > bk) { bk = k; ties = 1; } else if (k === bk) ties++; }
    return mk > bk ? 1 : mk === bk ? 1 / (ties + 1) : 0;
  }
  // 이번 판 승률 (포기 없이 끝까지, 지금까지 나온 저격 + 남은 사람의 저격 모형 q)
  function equity(V, me, sims, seed, q, rd) {
    const R = seeded(seed), opps = V.ord.filter(s => s !== me && V.inH[s]), W = reader(V, me, rd);
    const sn = V.snipes.filter(x => x && !x.pass);
    const later = V.phase === "snipe" ? V.ord.slice(V.ti).filter(s => V.inH[s]) : V.ord.filter(s => V.inH[s]);
    let w = 0, myHit = 0, raw = 0, tw = 0;
    for (let k = 0; k < sims; k++) {
      const S = sample(V, me, R, opps), rq = {}, wt = W ? W(S.hands) : 1;
      for (const o of V.ord) rq[o] = R();
      if (wt <= 0) continue;
      const P = [{ s: me, h: best(V.hands[me].concat(S.board)), p: V.hands[me] }].concat(opps.map(o => ({ s: o, h: best(S.hands[o].concat(S.board)), p: S.hands[o] })));
      raw += wt * judgeSample(P, me, sn);
      const all = q ? modelSnipes(P, later, sn, rq, q) : sn;
      w += wt * judgeSample(P, me, all);
      if (all.some(y => y.c === P[0].h.c && y.num === P[0].h.num)) myHit += wt;
      tw += wt;
    }
    tw = tw || 1;
    return { eq: w / tw, raw: raw / tw, hit: myHit / tw };
  }
  // 저격 후보마다 이길 몫 (같은 표본으로 견줌). 남은 저격(뒷사람)은 없다고 봄
  function snipeRows(V, me, sims, seed, q, rd, extra) {
    const R = seeded(seed), opps = V.ord.filter(s => s !== me && V.inH[s]), W = reader(V, me, rd);
    const sn = V.snipes.filter(x => x && !x.pass);
    const Ss = []; const freq = {}, later = V.ord.slice(V.ti + 1).filter(s => V.inH[s]);
    let tw = 0;
    for (let k = 0; k < sims; k++) {
      const S = sample(V, me, R, opps);
      S.wt = W ? W(S.hands) : 1; tw += S.wt;
      S.P = [{ s: me, h: best(V.hands[me].concat(S.board)), p: V.hands[me] }].concat(opps.map(o => ({ s: o, h: best(S.hands[o].concat(S.board)), p: S.hands[o] })));
      S.rq = {}; for (const o of V.ord) S.rq[o] = R();
      for (const x of S.P) if (x.s !== me) { const key = x.h.c * 100 + x.h.num; freq[key] = (freq[key] || 0) + S.wt; }
      Ss.push(S);
    }
    const cands = [{ pass: true }].concat(Object.keys(freq).map(Number).sort((a, b) => freq[b] - freq[a]).slice(0, 18).map(k => ({ c: Math.floor(k / 100), num: k % 100 })));
    const mine = best(V.hands[me].concat(V.board.length === 4 ? V.board : V.board));
    if (V.board.length === 4 && !cands.some(c => !c.pass && c.c === mine.c && c.num === mine.num)) cands.push({ c: mine.c, num: mine.num });
    for (const x of extra || []) if (x && !x.pass && validSnipe(x.c, x.num) && !cands.some(c => !c.pass && c.c === x.c && c.num === x.num)) cands.push({ c: x.c, num: x.num });
    const rows = cands.map(d => {
      const mine0 = d.pass ? sn : sn.concat([d]);
      let w = 0;
      for (const S of Ss) if (S.wt > 0) w += S.wt * judgeSample(S.P, me, q ? modelSnipes(S.P, later, mine0, S.rq, q) : mine0);
      const f = d.pass ? 0 : (freq[d.c * 100 + d.num] || 0) / ((tw || 1) * Math.max(1, opps.length));
      return Object.assign({ w: w / (tw || 1), f }, d);
    });
    rows.sort((a, b) => b.w - a.w || (a.pass ? -1 : b.pass ? 1 : 0));
    return rows;
  }
  const PROF = {
    // fm 콜 여유(상대 1명당) · rA·rB 레이즈 문턱(공평 몫 × rA + rB) · rk·aggr 레이즈 크기 · rd 상대 베팅 읽기(레이즈 · 콜 지수, 체크 깎기) · q 뒷사람 저격 모형
    easy:   { sims: 40, snipeSims: 40, snipe: 0.5, noise: 0.3, bluff: 0.02, aggr: 0.6, q: 0, fm: 0.15, rA: 1.6, rB: 0.08, rk: 2.2, rd: null },
    normal: { sims: 120, snipeSims: 120, snipe: 0.85, noise: 0.08, bluff: 0.05, aggr: 1, q: 0, fm: 0.05, rA: 1.2, rB: 0.05, rk: 2.2, rd: { r: 1.5, c: 0.5, k: 0.2 } },
    hard:   { sims: 300, snipeSims: 260, snipe: 1, noise: 0, bluff: 0.06, aggr: 1.3, q: 0, fm: 0, rA: 1.0, rB: 0.03, rk: 3, rd: { r: 2.5, c: 0.8, k: 0.4 } },
  };
  const keyV = (V, s) => hash(JSON.stringify([V.round, V.phase, V.board, V.hands[s], V.put, V.inH, V.snipes, V.ti, V.chips, s]));
  // 베팅: 승률 × 판돈과 낼 칩을 견줘서
  function betChoice(V, s, P, R, seed) {
    const opps = V.ord.filter(o => o !== s && V.inH[o]).length;
    const E = equity(V, s, P.sims, seed, P.q, P.rd);
    let eq = E.eq;
    if (P.noise) eq = Math.max(0, Math.min(1, eq + (R() - 0.5) * P.noise));
    const c = V.toCall != null && V.seat === s ? V.toCall : V.maxPut - V.put[s], pot = V.pot;
    const room = V.cap - V.maxPut;
    const fair = 1 / (opps + 1);
    let a;
    const fm = P.fm ?? 0.15, rA = P.rA ?? 1.6, rB = P.rB ?? 0.08, rk = P.rk ?? 2.2;
    if (c > 0 && eq * (pot + c) < c * (1.0 + fm * opps)) a = { t: "fold" };
    else if (room > 0 && (eq > fair * rA + rB || (P.bluff && (!P.bs || (c === 0 && V.phase === "bet2" && opps <= (P.bo ?? 9))) && R() < P.bluff))) {
      const val = eq > fair * rA + rB;
      // 블러프(약한 패로 올리기): bs 가 있으면 판돈의 bs 배 — 모두 체크한 2차 베팅에서만
      const want = !val && P.bs ? Math.max(1, Math.round(pot * P.bs)) : Math.max(1, Math.round((pot + c) * Math.min(1, (eq - fair) * rk) * P.aggr));
      a = { t: "raise", to: Math.min(V.cap, V.maxPut + want) };
    } else a = c > 0 ? { t: "call" } : { t: "check" };
    const val = eq > fair * rA + rB;
    return { a, eq: E.eq, raw: E.raw, hit: E.hit, c, pot, opps, fair, need: c > 0 ? c * (1.0 + fm * opps) / (pot + c) : 0, rT: fair * rA + rB, bl: a.t === "raise" && !val, room };
  }
  // 복기: 같은 자리에서 내 수와 고급 수의 기대 칩 (베팅 = 승률로 셈한 '돌려받을 칩 − 더 낼 칩', 레이즈는 한 명이 따라온다고 봄 · 저격 = 이길 몫 × 판돈)
  function judge(V, s, myA, bestA) {
    if (!V || !myA || !bestA || V.over) return null;
    const P = PROF.hard, seed = keyV(V, s);
    if (V.phase === "bet1" || V.phase === "bet2") {
      const E = equity(V, s, P.sims, seed, P.q, P.rd), eq = E.eq, pot = V.pot, c = V.maxPut - V.put[s];
      const ev = a => a.t === "fold" ? 0 : a.t === "check" ? eq * pot : a.t === "call" ? eq * (pot + c) - c
        : a.t === "raise" && Number.isInteger(a.to) ? eq * (pot + (a.to - V.put[s]) + (a.to - V.maxPut)) - (a.to - V.put[s]) : null;
      const m = ev(myA), b = ev(bestA);
      return m == null || b == null ? null : { kind: "bet", eq, c, pot, my: { ev: m }, best: { ev: b } };
    }
    if (V.phase === "snipe") {
      const rows = snipeRows(V, s, P.snipeSims, seed, P.q, P.rd, [myA, bestA]);
      const w = a => { const r = rows.find(x => (a.pass ? x.pass : !x.pass && x.c === a.c && x.num === a.num)); return r ? r : null; };
      const m = w(myA), b = w(bestA);
      return !m || !b ? null : { kind: "snipe", pot: V.pot, my: { ev: m.w * V.pot, w: m.w, f: m.f }, best: { ev: b.w * V.pot, w: b.w, f: b.f } };
    }
    return null;
  }
  function snipeChoice(V, s, P, R, seed) {
    const rows = snipeRows(V, s, P.snipeSims, seed, P.q, P.rd);
    let pick = rows[0];
    if (P.snipe < 1 && R() > P.snipe) pick = R() < 0.5 ? rows.find(r => r.pass) : rows[Math.floor(R() * Math.min(4, rows.length))];
    return { a: pick.pass ? { t: "snipe", pass: true } : { t: "snipe", c: pick.c, num: pick.num }, rows };
  }
  function giftChoice(V) {
    // 칩이 가장 적은 사람에게 (탈락 위험이 큰 사람) · 같으면 앞 순서
    const to = V.gift.to.slice().sort((a, b) => V.chips[a] - V.chips[b] || a - b)[0];
    return { t: "gift", to };
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const seed = keyV(V, s), R = P === PROF.hard || typeof rnd !== "function" ? seeded(seed) : rnd;
    if (V.phase === "bet1" || V.phase === "bet2") return betChoice(V, s, P, R, seed).a;
    if (V.phase === "snipe") return snipeChoice(V, s, P, R, seed).a;
    if (V.phase === "gift") return giftChoice(V);
    return null;
  }
  function ai(V, s, tier, rnd) { return aiWith(V, s, PROF[tier] || PROF.normal, rnd); }
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, seed = keyV(V, s), R = seeded(seed);
    if (V.phase === "bet1" || V.phase === "bet2") { const b = betChoice(V, s, P, R, seed); return Object.assign({ a: b.a }, b); }
    if (V.phase === "snipe") return snipeChoice(V, s, P, R, seed);
    if (V.phase === "gift") return { a: giftChoice(V) };
    return null;
  }

  return {
    id: "sniper", CATS, OPTS, PROF, MAXR, optsOf, best, fullKey, handName, validSnipe,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, equity, snipeRows, unknownDeck, readActs,
  };
});
