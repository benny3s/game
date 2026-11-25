/* 베니 서바이벌 · 콰트로 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 2 룰 브레이커 1화 1회전 데스매치 (임윤선 vs 남휘종) · 12화 결승 3회전 (임요환 vs 이상민) — 1:1 + 관전 플레이어 11명(AI)
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
  // ── 초급: 처음 하는 사람처럼 — 열지 교환할지, 어느 카드 · 어느 사람인지 거의 마음 가는 대로 (좋은 카드를 지키려는 생각 없음) ──
  function easyAI(V, r) {
    const R = V.rules, U = [0, 1, 2, 3].filter(i => !V.mine[i].o), nOpen = 4 - U.length, pick = a => a[Math.floor(r() * a.length)];
    if (R.peek && !V.peekUsed) return { t: "peek", g: Math.floor(r() * G) };
    const free = [...Array(G).keys()].filter(g => !V.gex[g]), canSwap = nOpen >= 1 && R.maxEx - V.nEx > 0 && free.length > 0;
    const lastLocked = R.mustAll && U.length === 1 && V.nEx < G;
    if (nOpen === 0 || !canSwap) return { t: "open", c: pick(U) };
    if (!lastLocked && r() < 0.45) return { t: "open", c: pick(U) };
    return { t: "swap", c: pick(U), g: pick(free) };
  }
  // ── 고급: 가능한 수마다 앞으로의 교환을 여러 번 가상으로 끝까지 해 보고(몬테카를로) 콰트로가 될 확률 · 합이 가장 좋은 수를 골라요 ──
  // 모르는 관전 플레이어의 카드는 아직 안 보인 카드에서 무작위로 나눠 가정해요 (상대의 가려진 카드는 쓰지 않음)
  const UB = 10, UW = 8;   // 콰트로면 UB + UW × 합 점, 아니면 0 점 (합이 큰 쪽이 이기므로 합도 값어치가 있어요)
  const utilQ = (h, zl) => (zl && h.includes(0) ? 0 : isQ(h) ? UB + UW * sumOf(h) : 0);
  function contSim(S, thr) {
    const R = S.rules;
    for (let guard = 0; guard < 40; guard++) {
      const U = [0, 1, 2, 3].filter(i => !S.o[i]), nOpen = 4 - U.length;
      if (!U.length) break;
      const freeG = S.gUsed.findIndex(x => !x), canSwap = nOpen >= 1 && R.maxEx - S.nEx > 0 && freeG >= 0;
      const best = bestSub(S.h, R.zeroLoses), keepU = U.filter(i => best.includes(i)).sort((a, b) => num(S.h[b]) - num(S.h[a]));
      const mustSwap = R.mustAll && U.length === 1 && S.nEx < G;
      if (nOpen === 0) { S.o[keepU.length ? keepU[0] : U.slice().sort((a, b) => num(S.h[b]) - num(S.h[a]))[0]] = true; continue; }
      if (!mustSwap && keepU.length && U.length >= 2 && num(S.h[keepU[0]]) >= thr && canSwap) { S.o[keepU[0]] = true; continue; }
      if (!canSwap) { for (const i of U) S.o[i] = true; break; }
      const out = U.filter(i => !best.includes(i)).sort((a, b) => num(S.h[a]) - num(S.h[b]));
      const w = out.length ? out[0] : U.slice().sort((a, b) => num(S.h[a]) - num(S.h[b]))[0];
      const gh = S.gh[freeG], k = guestPick(gh, S.h.filter((_, i) => S.o[i]), R.zeroLoses), got = gh[k];
      gh[k] = S.h[w]; S.h[w] = got; S.gUsed[freeG] = true; S.nEx++;
    }
    return S.h;
  }
  // 아직 모르는 관전 플레이어들의 손을 안 보인 카드에서 무작위로 나눠 가정 (엿본 사람 pg 는 그대로)
  function drawGuests(V, pool, pg, r) {
    const p2 = pool.slice(); for (let i = p2.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p2[i], p2[j]] = [p2[j], p2[i]]; }
    let off = 0; return Array.from({ length: G }, (_, g) => (g === pg ? V.peeked.cards.slice() : [p2[off++], p2[off++], p2[off++]]));
  }
  // 수 a 를 두고 (관전 플레이어 손 gh0 로) 끝까지 가상으로 이어 둔 뒤의 내 4장
  function playOut(V, a, gh0, cont) {
    const R = V.rules, zl = R.zeroLoses, S = { h: V.mine.map(x => x.c), o: V.mine.map(x => x.o), nEx: V.nEx, gUsed: V.gex.slice(), gh: gh0.map(x => x.slice()), rules: R };
    if (a.t === "open") S.o[a.c] = true;
    else { const gh = S.gh[a.g], kk = guestPick(gh, S.h.filter((_, i) => S.o[i]), zl), got = gh[kk]; gh[kk] = S.h[a.c]; S.h[a.c] = got; S.gUsed[a.g] = true; S.nEx++; }
    return (cont || contSim)(S, 6);
  }
  function mcPlan(V, r, K) {
    const R = V.rules, zl = R.zeroLoses;
    const U = [0, 1, 2, 3].filter(i => !V.mine[i].o), nOpen = 4 - U.length;
    const exLeft = R.maxEx - V.nEx, freeGs = [...Array(G).keys()].filter(g => !V.gex[g]);
    const pg = V.peeked && !V.gex[V.peeked.g] ? V.peeked.g : -1, acts = [];
    if (!(R.mustAll && U.length === 1 && V.nEx < G)) for (const i of U) acts.push({ t: "open", c: i });
    if (nOpen >= 1 && exLeft > 0 && freeGs.length) {
      const gG = freeGs.find(g => g !== pg);
      for (const i of U) { if (gG !== undefined) acts.push({ t: "swap", c: i, g: gG }); if (pg >= 0) acts.push({ t: "swap", c: i, g: pg }); }
      if (!acts.some(a => a.t === "swap") && freeGs.length) for (const i of U) acts.push({ t: "swap", c: i, g: freeGs[0] });
    }
    if (!acts.length) return null;
    const pool = unseen(V), sc = acts.map(() => ({ u: 0, q: 0, s: 0 }));
    for (let k = 0; k < K; k++) {
      const gh0 = drawGuests(V, pool, pg, r);
      acts.forEach((a, ai) => {
        const fin = playOut(V, a, gh0), u = utilQ(fin, zl); sc[ai].u += u; if (u > 0) { sc[ai].q++; sc[ai].s += sumOf(fin); }
      });
    }
    let bi = 0; for (let i = 1; i < acts.length; i++) if (sc[i].u > sc[bi].u) bi = i;
    return { act: acts[bi], q: sc[bi].q / K, sum: sc[bi].q ? sc[bi].s / sc[bi].q : 0 };
  }
  // 복기용 이어 두기 규칙 — contSim 과 같지만 '최선 조합'에 이미 연 카드를 꼭 넣어요 (연 카드는 못 바꾸니까).
  // contSim 은 연 카드와 겹치는 더 큰 카드를 지키려 해서 '이미 연 카드와 다른 카드를 바꿔 내보내는 수'를 0% 로 깎는 버릇이 있어서 평가에 쓰면 안 맞아요.
  function bestSubOpen(h, o, zl) {
    let best = null;
    for (let m = 1; m < 16; m++) {
      const sub = []; for (let i = 0; i < h.length; i++) if (m & (1 << i)) sub.push(i);
      if (!o.every((x, i) => !x || sub.includes(i))) continue;
      const cs = sub.map(i => h[i]), c = new Set(cs.map(col)), n = new Set(cs.map(num));
      if (c.size !== cs.length || n.size !== cs.length) continue;
      if (zl && cs.includes(0)) continue;
      const v = cs.length * 1000 + sumOf(cs);
      if (!best || v > best.v) best = { v, idx: sub };
    }
    return best ? best.idx : null;
  }
  function contSimOpen(S, thr) {
    const R = S.rules;
    for (let guard = 0; guard < 40; guard++) {
      const U = [0, 1, 2, 3].filter(i => !S.o[i]), nOpen = 4 - U.length;
      if (!U.length) break;
      const freeG = S.gUsed.findIndex(x => !x), canSwap = nOpen >= 1 && R.maxEx - S.nEx > 0 && freeG >= 0;
      const best = bestSubOpen(S.h, S.o, R.zeroLoses) || bestSub(S.h, R.zeroLoses), keepU = U.filter(i => best.includes(i)).sort((a, b) => num(S.h[b]) - num(S.h[a]));
      const mustSwap = R.mustAll && U.length === 1 && S.nEx < G;
      if (nOpen === 0) { S.o[keepU.length ? keepU[0] : U.slice().sort((a, b) => num(S.h[b]) - num(S.h[a]))[0]] = true; continue; }
      // 이미 콰트로가 됐으면 더 바꾸지 않고 열어요 (1화 판은 마지막 카드를 열려면 11명과 다 바꿔야 해서, 하나만 남을 때까지 열고 나머지는 바꾸며 기다려요)
      if (best.length === 4 && keepU.length === U.length && !mustSwap) { if (R.mustAll && S.nEx < G) { S.o[keepU[0]] = true; continue; } for (const i of U) S.o[i] = true; break; }
      if (!mustSwap && keepU.length && U.length >= 2 && num(S.h[keepU[0]]) >= thr && canSwap) { S.o[keepU[0]] = true; continue; }
      if (!canSwap) { for (const i of U) S.o[i] = true; break; }
      const out = U.filter(i => !best.includes(i)).sort((a, b) => num(S.h[a]) - num(S.h[b]));
      const w = out.length ? out[0] : U.slice().sort((a, b) => num(S.h[a]) - num(S.h[b]))[0];
      const gh = S.gh[freeG], k = guestPick(gh, S.h.filter((_, i) => S.o[i]), R.zeroLoses), got = gh[k];
      gh[k] = S.h[w]; S.h[w] = got; S.gUsed[freeG] = true; S.nEx++;
    }
    return S.h;
  }
  // ── 복기용 평가 (고르는 것은 하지 않아요 · 받은 view 를 바꾸지 않아요 · r 이 정해 주는 난수만 써요) ──
  // 주어진 수들(열기 · 교환)을 '같은 가상 관전 플레이어 손'(공통 표본) K 개로 끝까지 둬 보고 수마다 콰트로가 될 확률 q · 그때 평균 합 sum · 평균 점수 u 를 돌려줘요.
  function evalActs(V, acts, r, K) {
    const zl = V.rules.zeroLoses, pg = V.peeked && !V.gex[V.peeked.g] ? V.peeked.g : -1, pool = unseen(V), sc = acts.map(() => ({ u: 0, q: 0, s: 0 }));
    for (let k = 0; k < K; k++) {
      const gh0 = drawGuests(V, pool, pg, r);
      acts.forEach((a, ai) => { const fin = playOut(V, a, gh0, contSimOpen), u = utilQ(fin, zl); sc[ai].u += u; if (u > 0) { sc[ai].q++; sc[ai].s += sumOf(fin); } });
    }
    return sc.map(x => ({ u: x.u / K, q: x.q / K, sum: x.q ? x.s / x.q : 0 }));
  }
  // 내 수 aMine 과 고급 AI 의 수 aBest 를 같은 표본으로 견줘요. 엿보지 않은(모르는) 관전 플레이어는 서로 구별이 안 되니 같은 사람으로 쳐서
  // '누구와 바꿔도 같은 수'가 표본 잡음 때문에 달라 보이지 않게 해요. 엿보기 수는 여기서 다루지 않아요 (bestPlain 으로 엿보기 없는 최선과 견줘요).
  function compareActs(V, aMine, aBest, seed, K) {
    const pg = V.peeked && !V.gex[V.peeked.g] ? V.peeked.g : -1, gen = [...Array(G).keys()].find(g => !V.gex[g] && g !== pg);
    const canon = a => (a.t === "swap" && a.g !== pg && gen !== undefined ? { t: "swap", c: a.c, g: gen } : { t: a.t, c: a.c, g: a.g });
    const A = canon(aMine), B = canon(aBest);
    if (JSON.stringify(A) === JSON.stringify(B)) return { same: true };
    const ev = evalActs(V, [A, B], sampler(seed), K || 160);
    return { same: false, mine: ev[0], best: ev[1] };
  }
  // 엿보기가 남아 있어도 (고급 AI 는 늘 엿보기부터 해요) 엿보기 없이 둘 수 있는 가장 좋은 수 — 엿보기를 안 쓰고 둔 내 수와 견줄 때 써요.
  function bestPlain(V, seed, K) { const m = mcPlan(V, sampler(seed), K || 24); return m ? m.act : null; }
  const TIER = { easy: { thr: 8, rnd: 0.3, keepMin: 8, keepA: 8, K: 12 }, normal: { thr: 2, rnd: 0.05, keepMin: 6, keepA: 5, K: 30 }, hard: { thr: 0.5, rnd: 0, keepMin: 5, keepA: 0, K: 50 } };
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const T = TIER[tier] || TIER.normal, zl = V.rules.zeroLoses, H = V.mine.map(x => x.c);
    const U = [0, 1, 2, 3].filter(i => !V.mine[i].o), nOpen = 4 - U.length;
    if (tier === "easy") return easyAI(V, r);
    if (V.rules.peek && !V.peekUsed) return { t: "peek", g: Math.floor(r() * G) };
    if (tier === "hard") { const m = mcPlan(V, r, 24); if (m) return m.act; }
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
  const cname = c => (typeof c === "number" ? `${CEM[col(c)]}${c === 0 ? "0" : num(c)}` : "?");
  const NEEDC = h => { const have = new Set(h.map(col)); return [0, 1, 2, 3].filter(c => !have.has(c)).map(c => COLN[c]); };
  // 열린 카드만으로 만들 수 있는 콰트로의 최대 합 (열린 카드끼리 색 · 숫자가 겹치면 콰트로를 못 만들어서 null)
  function qCap(opened) {
    const cs = new Set(opened.map(col)), ns = new Set(opened.map(num));
    if (cs.size !== opened.length || ns.size !== opened.length) return null;
    let s = sumOf(opened), need = 4 - opened.length;
    for (let n = 10; n >= 1 && need > 0; n--) if (!ns.has(n)) { s += n; need--; }
    return s;
  }
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const opp = 1 - me, R = V.rules;
    if (V.over) {
      const hs = V.hands ? V.hands.map(h => h.map(x => x.c)) : null, st = hs ? hs.map(h => `${isQ(h) ? "콰트로" : "콰트로 아님"} · 합 ${sumOf(h)}`) : null;
      return { opp: `${V.draw ? "둘 다 승부를 못 가려 무승부로 끝났어요." : `${V.winner === me ? "내가" : "상대가"} 이겼어요.`}${st ? ` 상대는 ${st[opp]}.` : ""}`, mine: `내 카드: ${V.mine.map(x => cname(x.c)).join(" ")}${st ? ` → ${st[me]}` : ""} · 교환 ${V.nEx}번`, rec: V.winner === me ? "이겼어요!" : "다음엔 필요한 색부터 모아요", why: `콰트로는 색도 숫자도 모두 달라야 하고, 합이 큰 쪽이 이겨요.${st ? ` 이번 판은 내 합 ${sumOf(hs[me])} : 상대 합 ${sumOf(hs[opp])}${isQ(hs[me]) && isQ(hs[opp]) ? "" : ` (${isQ(hs[me]) ? "나만 콰트로" : isQ(hs[opp]) ? "상대만 콰트로" : "둘 다 콰트로 아님"})`}.` : ""}` };
    }
    const openOpp = V.opp.filter(x => x.o && x.c !== null).map(x => x.c), nOpO = openOpp.length, capO = qCap(openOpp), exO = V.nExs[opp];
    const myh = V.mine.map(x => x.c), keep = bestSub(myh, R.zeroLoses), keepC = keep.map(i => myh[i]), missing = NEEDC(keepC);
    const openMine = V.mine.filter(x => x.o).map(x => x.c), nOpM = openMine.length, capM = qCap(openMine);
    // 👀 상대 흐름
    let oppTxt = `상대가 공개한 카드: ${nOpO ? openOpp.map(cname).join(" ") : "아직 없어요"} (열린 ${nOpO}/4 · 교환 ${exO}번, ${R.mustAll ? `마지막 카드를 열려면 ${Math.max(0, G - exO)}명과 더 바꿔야 해요` : `남은 교환 ${Math.max(0, R.maxEx - exO)}번`}).`;
    oppTxt += capO === null ? " 열린 카드끼리 색이나 숫자가 겹쳐 상대는 콰트로를 만들 수 없어요 → 내가 콰트로만 만들면 이겨요." : nOpO ? ` 열린 카드 합 ${sumOf(openOpp)} → 상대가 콰트로를 만들면 합은 최대 ${capO}.` : ` 콰트로를 만들면 합은 최대 ${capO}까지 가능해요.`;
    // 📊 내 흐름
    const mineTxt = `내 카드 ${V.mine.map(x => `${cname(x.c)}${x.o ? "(공개)" : ""}`).join(" ")} · 최선 조합 ${keep.length}장 (합 ${sumOf(keepC)})${keep.length < 4 ? ` — 필요한 색: ${missing.join(" · ")}` : " — 콰트로예요!"} · 교환 ${V.nEx}/${R.maxEx}번 · ${capM === null ? "내 열린 카드끼리 겹쳐 콰트로는 이제 못 만들어요 ⚠️" : `내가 만들 수 있는 최대 합 ${capM}`}`;
    const cmp = capM !== null && capO !== null ? (capM > capO ? `내 최대 합 ${capM} > 상대 최대 합 ${capO} → 합에서 내가 앞설 수 있어요` : capM < capO ? `내 최대 합 ${capM} < 상대 최대 합 ${capO} → 둘 다 콰트로면 상대 합이 더 높을 수 있어요` : `최대 합이 같아요 (둘 다 ${capM})`) : capO === null ? "상대는 콰트로가 불가능해요" : "내 콰트로는 불가능해요";
    if (V.turn !== me) return { opp: oppTxt, mine: mineTxt, rec: `상대 차례예요 — 열린 카드 나 ${nOpM}/4 · 상대 ${nOpO}/4`, why: `둘 다 4장을 열면 바로 판정해요 (남은 오픈 나 ${4 - nOpM}장 · 상대 ${4 - nOpO}장). ${cmp}.` };
    // 💡 추천 + 👉
    const sd = sampler(V.log.length * 31 + 5), mp = R.peek && !V.peekUsed ? null : mcPlan(V, sd, 24), a = mp ? mp.act : ai(V, me, "hard", sd);
    const pool = unseen(V), fit = pool.filter(c => !(R.zeroLoses && c === 0) && !keepC.some(k => col(k) === col(c) || num(k) === num(c))).length;
    let rec = "카드를 열어요", why = `안 연 카드 ${4 - nOpM}장 · 교환 ${V.nEx}/${R.maxEx}번이에요. ${cmp}.`;
    if (a && a.t === "peek") { rec = "관전 플레이어 한 명 엿보기"; why = `관전 플레이어 한 명의 카드 3장을 알면 그 사람과는 정확히 알고 바꿀 수 있어요 (차례는 안 써요). 아직 안 본 카드 ${pool.length}장 중 내 최선 조합 ${keep.length}장에 보탤 수 있는 카드는 ${fit}장(${Math.round(fit / Math.max(1, pool.length) * 100)}%)이라, 모르는 사람과 바꾸면 운에 달려요. ${cmp}.`; }
    else if (a && a.t === "open") { rec = `${cname(myh[a.c])} 카드 열기`; why = (V.mine.every(x => !x.o) ? "교환을 시작하려면 카드를 1장 먼저 열어야 해요. 관전 플레이어는 열린 카드와 안 겹치는 가장 큰 카드를 줘요 — 가장 확실한 카드부터 열어요." : "열어 두면 그 카드와 안 겹치는 카드를 받을 수 있어요. 열린 카드는 바꿀 수 없다는 점은 조심해요.") + ` (열면 열린 카드 ${nOpM + 1}/4)`; }
    else if (a && a.t === "swap") { rec = `${cname(myh[a.c])} 카드를 ${V.peeked && V.peeked.g === a.g ? `엿본 ${a.g + 1}번 관전 플레이어` : `${a.g + 1}번 관전 플레이어`}와 교환`; why = `내 손에서 가장 쓸모없는 카드예요. 관전 플레이어는 열린 카드(${V.mine.filter(x => x.o).map(x => cname(x.c)).join(" ") || "없음"})와 안 겹치는 가장 큰 카드를 줘요${V.peeked && V.peeked.g === a.g ? " — 엿본 3장 중에서 정확히 받을 수 있어요" : ""}.${R.zeroLoses ? " (0 은 받지 않아요)" : ""} (이번이 ${V.nEx + 1}번째 교환 · 최대 ${R.maxEx}번)`; }
    if (a && (a.t === "open" || a.t === "swap")) {   // 확률은 복기와 같은 평가로 (이미 연 카드는 바꿀 수 없다는 것을 반영 · AI 가 수를 고르는 contSim 과는 따로)
      const ev = evalActs(V, [a], sampler(V.log.length * 17 + 3), 120)[0];
      why += ` 이 수를 둔 뒤 끝까지 가상으로 해 보면 콰트로가 될 확률은 약 ${Math.round(ev.q * 100)}%${ev.q ? `, 이때 합은 평균 ${ev.sum.toFixed(0)}` : ""}${ev.q ? (/[013678]$/.test(ev.sum.toFixed(0)) ? "이에요" : "예요") : "예요"}.`;
    }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-quattro", COLN, CEM, VERS, GUESTS: G, col, num, mk, isQ, sumOf, guestPick, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, fval, bestSub, bestSwap, unseen, TIER, compareActs, bestPlain, qCap, UB, UW };
});
