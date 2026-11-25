/* 베니 서바이벌 · 콰트로 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 2 룰 브레이커 1화 결승 (임윤선 vs 남휘종) · 12화 결승 3회전 (임요환 vs 이상민) — 1:1 + 관전 플레이어 11명(AI)
   · 카드 41장 = 빨강 · 파랑 · 노랑 · 초록 각 1~10 + 검정 0 한 장. 후보 둘에게 4장씩, 관전 플레이어 11명에게 3장씩
   · 콰트로 = 색도 숫자도 전부 다른 4장 (최대 합 7+8+9+10 = 34). 4장을 다 오픈하면 판정
   · 카드를 1장 오픈해야 교환을 시작할 수 있고, 오픈한 카드는 교환할 수 없어요. 교환 = 관전 플레이어 1명과 카드 1장씩 맞바꿈 (한 사람과 한 번만)
   · 판 a (1화): 관전 플레이어 11명 전원과 한 번씩 교환해야 마지막(4번째) 카드를 오픈할 수 있고, 오픈한 0 은 즉시 패
   · 판 b (결승): 교환은 최대 3명까지, 관전 플레이어 1명의 카드 3장을 한 번 엿보기 · 0 은 검정 한 장으로 정상 카드 취급
   · 승패: 둘 다 콰트로면 합이 큰 쪽 → 같으면 4장 중 가장 큰 숫자 → 같으면 무승부. 한 명만 콰트로면 그쪽 승. 둘 다 못 하면 무승부
   우리 판 다듬기(방송 문서에 없음): 관전 플레이어는 AI 예요 — 교환할 때 '이미 열린 카드와 색 · 숫자가 겹치지 않는 카드 중 가장 큰 카드'를 줘요
   (맞는 카드가 없으면 가장 낮은 카드, 판 a 는 0 을 안 줘요. 방송은 서로 협상) · 차례를 번갈아 한 가지씩 (방송은 동시에) · 엿보기는 차례를 쓰지 않아요 · 판 b 의 멀리건과 아이템은 뺐어요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-quattro"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLN = ["빨강", "파랑", "노랑", "초록", "검정"], CEM = ["🟥", "🟦", "🟨", "🟩", "⬛"], G = 11;
  const VERS = { a: { maxEx: 11, mustAll: true, peek: 0, zeroLoses: true }, b: { maxEx: 3, mustAll: false, peek: 1, zeroLoses: false } };
  const col = id => (id === 0 ? 4 : ((id - 1) / 10) | 0), num = id => (id === 0 ? 0 : ((id - 1) % 10) + 1), mk = (c, n) => 1 + c * 10 + (n - 1);
  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const isQ = h => { const c = new Set(h.map(col)), n = new Set(h.map(num)); return h.length === 4 && c.size === 4 && n.size === 4; };
  const sumOf = h => h.reduce((s, x) => s + num(x), 0), maxOf = h => Math.max(...h.map(num));
  // 관전 플레이어가 내줄 카드: 열린 카드와 색 · 숫자가 안 겹치는 것 중 가장 큰 숫자 (없으면 가장 낮은 숫자, 판 a 는 0 제외)
  function guestPick(gh, opened, zeroLoses) {
    const oc = new Set(opened.map(col)), on = new Set(opened.map(num));
    let best = -1, bn = -1;
    for (let k = 0; k < gh.length; k++) { const c = gh[k]; if (zeroLoses && c === 0) continue; if (oc.has(col(c)) || on.has(num(c))) continue; if (num(c) > bn) { bn = num(c); best = k; } }
    if (best >= 0) return best;
    let lo = -1, ln = 99;
    for (let k = 0; k < gh.length; k++) { const c = gh[k]; if (zeroLoses && c === 0) continue; if (num(c) < ln) { ln = num(c); lo = k; } }
    return lo >= 0 ? lo : 0;
  }

  function init({ n, seed, cfg }) {
    const ver = cfg && VERS[cfg.ver] ? cfg.ver : "a", V = VERS[ver];
    const st = { n: 2, rs: (seed >>> 0) || 1, ver, V, cfg: cfg || {}, hands: [[], []], guests: [], gex: [Array(G).fill(false), Array(G).fill(false)], nEx: [0, 0], peeked: [null, null], peekDone: [false, false], turn: 0, phase: "play", over: false, winner: -1, draw: false, why: "", loser: -1, log: [], seq: 0 };
    let deck = Array.from({ length: 41 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    if (cfg && cfg.deck) deck = cfg.deck.slice();   // 시험용
    for (let s = 0; s < 2; s++) st.hands[s] = deck.splice(0, 4).map(c => ({ c, o: false }));
    for (let g = 0; g < G; g++) st.guests.push(deck.splice(0, 3));
    st.turn = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    push(st, { k: "start", first: st.turn });
    return st;
  }
  const openN = (st, s) => st.hands[s].filter(x => x.o).length;
  const needs = st => (st.over ? [] : [st.turn]);
  function finish(st, winner, draw, why, loser) { st.over = true; st.phase = "end"; st.winner = winner; st.draw = !!draw; st.why = why || ""; st.loser = loser === undefined ? -1 : loser; push(st, { k: "end", winner, draw: !!draw, why }); }
  function judge(st) {
    const h = st.hands.map(x => x.map(y => y.c)), q = h.map(isQ);
    if (q[0] && q[1]) {
      const s = h.map(sumOf);
      if (s[0] !== s[1]) return finish(st, s[0] > s[1] ? 0 : 1, false, "sum");
      const m = h.map(maxOf);
      if (m[0] !== m[1]) return finish(st, m[0] > m[1] ? 0 : 1, false, "max");
      return finish(st, -1, true, "tie");
    }
    if (q[0] !== q[1]) return finish(st, q[0] ? 0 : 1, false, "one");
    return finish(st, -1, true, "none");
  }
  function nextTurn(st) {
    if (openN(st, 0) === 4 && openN(st, 1) === 4) { judge(st); return; }
    const o = 1 - st.turn;
    if (openN(st, o) < 4) st.turn = o;   // 상대가 아직 남았으면 차례 넘김, 아니면 계속
  }
  function apply(st, seat, a) {
    if (!a || st.over || seat !== st.turn) return { ok: false, err: "지금은 차례가 아니에요" };
    const H = st.hands[seat], V = st.V;
    if (a.t === "peek") {
      if (!V.peek || st.peekDone[seat]) return { ok: false, err: "엿보기는 한 번뿐이에요" };
      if (!Number.isInteger(a.g) || a.g < 0 || a.g >= G) return { ok: false, err: "엿볼 관전 플레이어를 골라요" };
      st.peeked[seat] = { g: a.g, cards: st.guests[a.g].slice() }; st.peekDone[seat] = true;   // 엿보기는 기록에도 안 남겨요 (상대는 엿봤는지도 몰라요)
      return { ok: true };   // 차례는 그대로
    }
    if (a.t === "open") {
      if (!Number.isInteger(a.c) || a.c < 0 || a.c > 3 || H[a.c].o) return { ok: false, err: "아직 안 연 카드를 골라요" };
      if (V.mustAll && openN(st, seat) === 3 && st.nEx[seat] < G) return { ok: false, err: `마지막 카드는 관전 플레이어 ${G}명과 모두 교환한 뒤에 열 수 있어요 (지금 ${st.nEx[seat]}명)` };
      H[a.c].o = true; push(st, { k: "open", s: seat, card: H[a.c].c });
      if (V.zeroLoses && H[a.c].c === 0) { finish(st, 1 - seat, false, "zero", seat); return { ok: true }; }
      nextTurn(st); return { ok: true };
    }
    if (a.t === "swap") {
      if (openN(st, seat) < 1) return { ok: false, err: "카드를 1장 오픈해야 교환할 수 있어요" };
      if (!Number.isInteger(a.c) || a.c < 0 || a.c > 3 || H[a.c].o) return { ok: false, err: "안 연 카드를 골라 줘요" };
      if (!Number.isInteger(a.g) || a.g < 0 || a.g >= G) return { ok: false, err: "교환할 관전 플레이어를 골라요" };
      if (st.gex[seat][a.g]) return { ok: false, err: "그 사람과는 이미 교환했어요" };
      if (st.nEx[seat] >= V.maxEx) return { ok: false, err: `교환은 최대 ${V.maxEx}명까지예요` };
      const gh = st.guests[a.g], k = guestPick(gh, H.filter(x => x.o).map(x => x.c), V.zeroLoses), got = gh[k], gave = H[a.c].c;
      gh[k] = gave; H[a.c] = { c: got, o: false };
      st.gex[seat][a.g] = true; st.nEx[seat]++;
      for (const q of [0, 1]) if (st.peeked[q] && st.peeked[q].g === a.g) st.peeked[q] = null;   // 누가 바꾸든 그 사람의 손은 달라져서 엿본 것은 더 이상 몰라요
      push(st, { k: "swap", s: seat, g: a.g });
      nextTurn(st); return { ok: true, got, gave };
    }
    return { ok: false, err: "카드를 열거나 교환해요" };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.draw || st.winner < 0 ? [0, 0] : [st.winner === 0 ? 0 : 1, st.winner === 1 ? 0 : 1]);
  function legal(st, seat) {
    if (seat !== st.turn || st.over) return [];
    const H = st.hands[seat], out = [];
    H.forEach((x, i) => { if (!x.o) out.push({ t: "open", c: i }); });
    const op = out.filter(() => !(st.V.mustAll && openN(st, seat) === 3 && st.nEx[seat] < G));
    if (openN(st, seat) >= 1 && st.nEx[seat] < st.V.maxEx) { const g = st.gex[seat].findIndex(x => !x), c = H.findIndex(x => !x.o); if (g >= 0 && c >= 0) return [{ t: "swap", g, c }].concat(op); }
    return op;
  }

  // ── AI · 평가 (내가 보는 것만) ─────────────────────────────────
  // 4장 조합의 가치: 서로 다른 색 · 숫자를 가장 많이 모은 부분 + 합
  function fval(h, V) {
    let best = 0;
    for (let m = 1; m < 16; m++) {
      const sub = []; for (let i = 0; i < h.length; i++) if (m & (1 << i)) sub.push(h[i]);
      const sz = sub.length, c = new Set(sub.map(col)), n = new Set(sub.map(num));
      if (c.size !== sz || n.size !== sz) continue;
      const s = sumOf(sub), v = sz * 30 + s * (sz === 4 ? 1.5 : 0.4) + (sz === 4 ? 200 : 0);
      if (v > best) best = v;
    }
    if (V && V.zeroLoses && h.includes(0)) best -= 120;
    return best;
  }
  const bestSub = (h, zl) => {
    let best = null;
    for (let m = 1; m < 16; m++) {
      const sub = []; for (let i = 0; i < h.length; i++) if (m & (1 << i)) sub.push(i);
      const cs = sub.map(i => h[i]), c = new Set(cs.map(col)), n = new Set(cs.map(num));
      if (c.size !== cs.length || n.size !== cs.length) continue;
      if (zl && cs.includes(0)) continue;
      const v = cs.length * 1000 + sumOf(cs);
      if (!best || v > best.v) best = { v, idx: sub };
    }
    return best ? best.idx : [];
  };
  // 아직 모르는 카드 (내 4장 · 상대가 오픈한 카드 · 엿본 카드 제외)
  function unseen(V) {
    const known = new Set(V.mine.map(x => x.c)); V.opp.forEach(x => { if (x.c !== null) known.add(x.c); });
    if (V.peeked) V.peeked.cards.forEach(c => known.add(c));
    const out = []; for (let i = 0; i < 41; i++) if (!known.has(i)) out.push(i);
    return out;
  }
  function samples(pool, K, r) {
    const out = [];
    for (let k = 0; k < K; k++) { const a = []; while (a.length < 3) { const c = pool[Math.floor(r() * pool.length)]; if (!a.includes(c)) a.push(c); } out.push(a); }
    return out;
  }
  // 교환 결과 후보: 엿본 관전 플레이어는 정확히 · 나머지는 표본 평균
  function bestSwap(V, r, K) {
    const H = V.mine.map(y => y.c), opened = V.mine.filter(y => y.o).map(y => y.c), zl = V.rules.zeroLoses, base = fval(H, V.rules), pool = unseen(V);
    const gs = [...Array(G).keys()].filter(g => !V.gex[g]), pg = V.peeked && !V.gex[V.peeked.g] ? V.peeked.g : -1;
    const generic = gs.find(g => g !== pg), rets = samples(pool, K || 40, r).map(h3 => h3[guestPick(h3, opened, zl)]);
    const exact = pg >= 0 ? [V.peeked.cards[guestPick(V.peeked.cards, opened, zl)]] : null;
    let best = null;
    for (let x = 0; x < 4; x++) {
      if (V.mine[x].o) continue;
      const ev = list => { let s = 0; for (const c of list) { const h2 = H.slice(); h2[x] = c; s += fval(h2, V.rules); } return s / list.length; };
      const opts = [];
      if (generic !== undefined) opts.push({ g: generic, e: ev(rets) });
      if (exact) opts.push({ g: pg, e: ev(exact) });
      for (const o of opts) { const gain = o.e - base; if (!best || gain > best.gain) best = { x, g: o.g, e: o.e, gain, exact: o.g === pg }; }
    }
    return best;
  }
  const TIER = { easy: { thr: 8, rnd: 0.3, keepMin: 8, keepA: 8, K: 12 }, normal: { thr: 2, rnd: 0.05, keepMin: 6, keepA: 5, K: 30 }, hard: { thr: 0.5, rnd: 0, keepMin: 5, keepA: 0, K: 50 } };
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const T = TIER[tier] || TIER.normal, zl = V.rules.zeroLoses, H = V.mine.map(x => x.c);
    const U = [0, 1, 2, 3].filter(i => !V.mine[i].o), nOpen = 4 - U.length;
    if (V.rules.peek && !V.peekUsed) return { t: "peek", g: Math.floor(r() * G) };
    if (T.rnd && r() < T.rnd && V.legal && V.legal.length) return V.legal[Math.floor(r() * V.legal.length)];
    const ma = V.rules.mustAll, can4 = !ma || V.nEx >= G;   // 판 a 는 교환이 안 끝났으면 마지막(4번째) 카드를 못 열어요
    const exLeft = V.rules.maxEx - V.nEx, canSwap = nOpen >= 1 && exLeft > 0 && V.gex.some(x => !x);
    const best = bestSub(H, zl), keepU = U.filter(i => best.includes(i)).sort((a, b) => num(H[b]) - num(H[a]));
    const openCard = i => ({ t: "open", c: i });
    const worst = () => U.filter(i => !best.includes(i)).sort((a, b) => num(H[a]) - num(H[b]))[0];
    if (nOpen === 0) { const c = keepU.length ? keepU[0] : U.slice().sort((a, b) => (zl && H[a] === 0 ? 1 : 0) - (zl && H[b] === 0 ? 1 : 0) || num(H[b]) - num(H[a]))[0]; return openCard(c); }
    if (!canSwap) {   // 더 교환할 수 없음 → 다 연다
      if (U.length === 1 && !can4) return null;
      return openCard(keepU.length ? keepU[0] : U[0]);
    }
    // 안 겹치는 좋은 카드는 일찍 열어 둬요 — 관전 플레이어가 그 카드와 겹치지 않는 카드를 주고, 교환 슬롯은 한 장 이상 남겨요
    if (keepU.length && U.length >= 2 && (ma ? num(H[keepU[0]]) >= T.keepA : num(H[keepU[0]]) >= T.keepMin)) return openCard(keepU[0]);
    const bs = bestSwap(V, r, T.K), w = worst();
    if (bs && (ma || bs.gain > T.thr)) return { t: "swap", g: bs.g, c: w !== undefined && !bs.exact ? w : bs.x };
    if (U.length === 1 && !can4) return null;
    return openCard(keepU.length ? keepU[0] : U[0]);
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const reveal = st.over || all;
    const oppHand = s => st.hands[s].map(x => ({ c: reveal || x.o ? x.c : null, o: x.o }));
    const pubObj = { t: st.turn, ph: st.phase, o: st.hands.map(h => h.map(x => (x.o ? x.c : -1))), ne: st.nEx, ov: st.over, w: st.winner };
    const me0 = me >= 0 ? me : 0, known = me >= 0;   // 자리 번호가 없으면 0번 자리의 손 · 엿본 것을 보여 주지 않아요
    const mine = st.hands[me0].map(x => ({ c: known || reveal ? x.c : null, o: x.o }));
    const v = {
      n: 2, seat, ver: st.ver, rules: { maxEx: st.V.maxEx, mustAll: st.V.mustAll, peek: st.V.peek, zeroLoses: st.V.zeroLoses }, guestsN: G, turn: st.turn, phase: st.phase,
      mine, opp: oppHand(1 - me0), gex: st.gex[me0].slice(), nExs: st.nEx.slice(), nEx: st.nEx[me0], peeked: known && st.peeked[me0] ? { g: st.peeked[me0].g, cards: st.peeked[me0].cards.slice() } : null,
      peekUsed: known ? st.peekDone[me0] : false, needs: needs(st), over: st.over, winner: st.winner, draw: st.draw, why: st.why, loser: st.loser,
      hands: reveal ? st.hands.map(h => h.map(x => ({ c: x.c, o: x.o }))) : null, ranks: st.over ? ranks(st) : null, score: st.over ? ranks(st).map(x => (x === 0 && !st.draw ? 1 : 0)) : [0, 0], log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
    if (me >= 0 && st.turn === me && !st.over) v.legal = legal(st, me);
    return v;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const cname = c => `${CEM[col(c)]}${c === 0 ? "0" : num(c)}`;
  const NEEDC = h => { const have = new Set(h.map(col)); return [0, 1, 2, 3].filter(c => !have.has(c)).map(c => COLN[c]); };
  function coach(V, me, since, names) {
    const opp = V.opp, openOpp = opp.filter(x => x.c !== null).map(x => x.c);
    if (V.over) return { opp: V.draw ? "둘 다 승부를 못 가려 무승부로 끝났어요." : `${V.winner === me ? "내가" : "상대가"} 이겼어요.`, mine: `내 카드: ${V.mine.map(x => cname(x.c)).join(" ")}`, rec: V.winner === me ? "이겼어요!" : "다음엔 필요한 색부터 모아요", why: "콰트로는 색도 숫자도 모두 달라야 하고, 합이 큰 쪽이 이겨요." };
    const myh = V.mine.map(x => x.c), keep = bestSub(myh, V.rules.zeroLoses), missing = NEEDC(keep.map(i => myh[i]));
    const oppTxt = `상대가 공개한 카드: ${openOpp.length ? openOpp.map(cname).join(" ") : "아직 없어요"}${openOpp.length ? ` — 상대에게 아직 없는 색: ${NEEDC(openOpp).join(" · ") || "없음"}` : ""}. 상대 교환 ${V.nExs[1 - me]}번.`;
    const mineTxt = `내 카드 ${V.mine.map(x => `${cname(x.c)}${x.o ? "(공개)" : ""}`).join(" ")} · 최선 조합 ${keep.length}장${keep.length < 4 ? ` — 필요한 색: ${missing.join(" · ")}` : " — 콰트로예요!"} · 교환 ${V.nEx}/${V.rules.maxEx}번`;
    if (V.turn !== me) return { opp: oppTxt, mine: mineTxt, rec: "상대 차례예요", why: "기다려요." };
    const a = ai(V, me, "hard", sampler(V.log.length * 31 + 5));
    let rec = "카드를 열어요", why = "";
    if (a && a.t === "peek") { rec = "관전 플레이어 한 명 엿보기"; why = "관전 플레이어의 카드 3장을 확인하면, 필요한 카드를 가진 사람과 교환할 수 있어요. 차례는 쓰지 않아요."; }
    else if (a && a.t === "open") { rec = `${cname(myh[a.c])} 카드 열기`; why = V.mine.every(x => !x.o) ? "교환을 시작하려면 카드를 1장 먼저 열어야 해요. 관전 플레이어는 열린 카드와 안 겹치는 가장 큰 카드를 줘요 — 가장 확실한 카드부터 열어요." : "열어 두면 그 카드와 안 겹치는 카드를 받을 수 있어요. 열린 카드는 바꿀 수 없다는 점은 조심해요."; }
    else if (a && a.t === "swap") { rec = `${cname(myh[a.c])} 카드를 ${V.peeked && V.peeked.g === a.g ? `엿본 ${a.g + 1}번 관전 플레이어` : `${a.g + 1}번 관전 플레이어`}와 교환`; why = `내 손에서 가장 쓸모없는 카드예요. 관전 플레이어는 열린 카드(${V.mine.filter(x => x.o).map(x => cname(x.c)).join(" ") || "없음"})와 안 겹치는 가장 큰 카드를 줘요${V.peeked && V.peeked.g === a.g ? " — 엿본 3장 중에서 정확히 받을 수 있어요" : ""}.${V.rules.zeroLoses ? " (0 은 받지 않아요)" : ""}`; }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-quattro", COLN, CEM, VERS, GUESTS: G, col, num, mk, isQ, sumOf, guestPick, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, fval, bestSub, bestSwap, unseen, TIER };
});
