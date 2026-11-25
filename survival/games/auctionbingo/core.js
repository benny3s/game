/* 베니 서바이벌 · 경매 빙고 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 4일차 메인 매치 '경매 빙고' (나무위키 '룰' 절 기준)
   · 빙고판 9칸 (○ 4칸 · △ 3칸 · ☆ 2칸, 모두 같은 판), 사람마다 코인 10개 (1원×3 · 2원×3 · 3원×2 · 5원×1 · 10원×1, 쪼갤 수 없음), 7라운드
   · 라운드 = 도형 선택 → 입찰 → 결과 발표
     - 도형 선택: 티켓 1장을 ○ △ ☆ 상자 중 하나에 (남들이 넣는 걸 보고 정할 수 있음)
     - 입찰: 코인을 비공개로 1원 이상 냄 (낸 코인은 결과와 상관없이 회수 · 7라운드 동안 매번 1개 이상 내야 하니 코인이 라운드 수보다 모자라면 안 됨)
     - 도형마다 가장 많이 낸 사람이 낙찰 → 그 도형에 들어간 티켓 수만큼 타일을 받음. 동률이면 똑같이 나누고 나머지는 버림.
     - 누가 무엇을 받았는지는 당사자에게도 비공개. 도형별 낙찰가만 공개되고, 낙찰가가 가장 높은 도형은 가격도 시크릿.
   · 7라운드 뒤 타일 공개 → 빙고가 가장 많아지게 자동 배치 → 순위 = 빙고 줄 수 → 채운 칸 수 → 남은 코인 수
   우리 판: 3~8명 (방송은 8명 중 게스트 1명 · 피스 · 징표 있음) · 피스 · 게스트 · 징표 · 상금 없음 · 도형 선택은 차례대로(라운드마다 시작 자리가 한 칸씩 돎) · 협상 대화 없음
   (칸 배열 △○△ / ○☆○ / ☆○△ 은 방송 결과 표의 글자 순서를 3×3 으로 읽은 것 — 칸 위치는 확인 못 해서 추정) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).auctionbingo = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SHAPES = ["○", "△", "☆"];
  const BOARD = [1, 0, 1, 0, 2, 0, 2, 0, 1];             // 칸마다 도형 번호 (△○△ / ○☆○ / ☆○△)
  const CELLS = [[1, 3, 5, 7], [0, 2, 8], [4, 6]];         // 도형별 칸 번호
  const CAP = [4, 3, 2];
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const COINS = [1, 1, 1, 2, 2, 2, 3, 3, 5, 10];
  const ROUNDS = 7;
  const SUMV = a => a.reduce((x, y) => x + y, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 빙고 자동 배치: 받은 타일(도형별 개수)로 빙고 줄이 가장 많아지게 ────────────
  const combos = (arr, k) => {
    if (k <= 0) return [[]];
    if (k >= arr.length) return [arr.slice()];
    const out = [];
    (function rec(start, acc) { if (acc.length === k) { out.push(acc.slice()); return; } for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); } })(0, []);
    return out;
  };
  function place(tiles) {
    let best = null;
    const ks = [0, 1, 2].map(s => Math.min(tiles[s] | 0, CAP[s]));
    for (const a of combos(CELLS[0], ks[0])) for (const b of combos(CELLS[1], ks[1])) for (const c of combos(CELLS[2], ks[2])) {
      const cells = Array(9).fill(false);
      for (const x of a.concat(b, c)) cells[x] = true;
      const lines = LINES.filter(L => L.every(x => cells[x])).length;
      if (!best || lines > best.lines) best = { lines, cells, fill: ks[0] + ks[1] + ks[2], thrown: [0, 1, 2].map(s => Math.max(0, (tiles[s] | 0) - CAP[s])) };
    }
    return best;
  }

  // ── 판 만들기 ───────────────────────────────────────────────
  function init({ n, seed }) {
    n = Math.max(3, Math.min(8, n | 0));
    const st = {
      n, rs: (seed >>> 0) || 1, round: 1, phase: "pick", over: false, seq: 0, log: [],
      coins: Array.from({ length: n }, () => Array(COINS.length).fill(true)),
      tiles: Array.from({ length: n }, () => [0, 0, 0]),
      myr: Array.from({ length: n }, () => []),   // 사람별 지난 라운드 (고른 도형 · 낸 값)
      rounds: [], res: null, final: null, first: 0,
    };
    st.first = Math.floor(rnd(st) * n);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.phase = "pick"; st.res = null;
    st.picks = Array(st.n).fill(-1); st.bids = Array(st.n).fill(null);
    st.order = Array.from({ length: st.n }, (_, k) => (st.first + st.round - 1 + k) % st.n);
    st.pi = 0; st.turn = st.order[0];
    push(st, { k: "round", r: st.round, f: st.order[0] });
  }
  const coinsLeft = (st, i) => st.coins[i].filter(Boolean).length;
  const coinValue = (st, i) => SUMV(COINS.filter((v, k) => st.coins[i][k]));

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "pick") return [st.turn];
    if (st.phase === "bid") return st.bids.map((b, i) => (b ? -1 : i)).filter(i => i >= 0);
    return [];
  }
  function checkBid(st, seat, c) {
    if (!Array.isArray(c) || !c.length) return "코인을 1개 이상 내야 해요";
    const seen = new Set();
    for (const k of c) {
      if (!Number.isInteger(k) || k < 0 || k >= COINS.length || !st.coins[seat][k]) return "없는 코인이에요";
      if (seen.has(k)) return "같은 코인을 두 번 낼 수 없어요";
      seen.add(k);
    }
    const left = coinsLeft(st, seat) - seen.size;
    if (left < ROUNDS - st.round) return `남은 ${ROUNDS - st.round}라운드에 1개씩은 낼 수 있게 코인 ${ROUNDS - st.round}개는 남겨야 해요`;
    return null;
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "pick") {
      if (a.t !== "pick" || !(a.s >= 0 && a.s < 3) || a.s !== (a.s | 0)) return { ok: false, err: "○ △ ☆ 중에서 골라요" };
      st.picks[seat] = a.s;
      push(st, { k: "pick", s: seat, sh: a.s });
      st.pi++;
      if (st.pi >= st.n) { st.phase = "bid"; st.turn = -1; push(st, { k: "bidstart", r: st.round }); } else st.turn = st.order[st.pi];
      return { ok: true };
    }
    if (st.phase === "bid") {
      if (a.t !== "bid") return { ok: false, err: "코인을 내 주세요" };
      const err = checkBid(st, seat, a.c);
      if (err) return { ok: false, err };
      st.bids[seat] = a.c.map(Number).sort((x, y) => x - y);
      push(st, { k: "bid", s: seat });
      if (!needs(st).length) resolve(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  const bidValue = (c) => SUMV(c.map(k => COINS[k]));

  function resolve(st) {
    const n = st.n;
    const vals = st.bids.map(bidValue);
    const cnt = [0, 1, 2].map(s => st.picks.filter(x => x === s).length);
    const price = [-1, -1, -1];
    const win = Array.from({ length: n }, () => 0);   // 이번 라운드에 받은 타일 수 (비공개)
    for (let s = 0; s < 3; s++) {
      if (!cnt[s]) continue;
      const grp = [...Array(n).keys()].filter(i => st.picks[i] === s);
      const p = Math.max(...grp.map(i => vals[i]));
      price[s] = p;
      const W = grp.filter(i => vals[i] === p), each = Math.floor(cnt[s] / W.length);
      for (const i of W) { st.tiles[i][s] += each; win[i] = each; }
    }
    const top = Math.max(...price);
    const secret = price.map(p => p >= 0 && p === top);
    for (let i = 0; i < n; i++) {
      for (const k of st.bids[i]) st.coins[i][k] = false;
      st.myr[i].push({ r: st.round, sh: st.picks[i], v: vals[i], c: st.bids[i].slice() });
    }
    const rec = { r: st.round, picks: st.picks.slice(), cnt, price, secret, vals, win };
    st.rounds.push(rec);
    st.res = rec;
    push(st, { k: "res", r: st.round, cnt, price: price.map((p, s) => (secret[s] ? -2 : p)) });
    st.phase = "show"; st.turn = -1;
  }
  function finish(st) {
    const n = st.n;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const pl = place(st.tiles[i]);
      rows.push({ i, tiles: st.tiles[i].slice(), lines: pl.lines, fill: pl.fill, cells: pl.cells, thrown: pl.thrown, coins: coinsLeft(st, i), coinValue: coinValue(st, i) });
    }
    const key = x => x.lines * 10000 + x.fill * 100 + x.coins;
    const ranks = rows.map(x => rows.filter(y => key(y) > key(x)).length);
    st.final = { rows, ranks };
    st.over = true; st.phase = "end"; st.turn = -1;
    push(st, { k: "end" });
  }
  const auto = st => (st.phase === "show" ? 5200 : null);
  function advance(st) {
    if (st.phase !== "show") return;
    if (st.round >= ROUNDS) { finish(st); return; }
    st.round++;
    startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : st.tiles.map(() => 0));
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "pick") return [0, 1, 2].map(s => ({ t: "pick", s }));
    const L = [];
    for (let k = 0; k < COINS.length; k++) if (st.coins[seat][k] && !checkBid(st, seat, [k])) L.push({ t: "bid", c: [k] });
    return L;
  }

  // ── 보이는 것 ───────────────────────────────────────────────
  // 내가 지난 라운드에 받았는지 짐작 (공개 낙찰가만으로: 혼자였으면 확실, 내 값 = 낙찰가면 받음 · 시크릿이면 모름)
  function inferMine(myr, hist) {
    return myr.map(m => {
      const h = hist.find(x => x.r === m.r); if (!h) return { ...m, won: null, cnt: 0, sure: 0, maybe: 0 };
      const cnt = h.cnt[m.sh], p = h.price[m.sh];
      // 확실히 받은 타일(sure) · 동률이었는지에 따라 더 받았을 수 있는 타일(maybe)
      //   혼자 골랐으면 1개 확실 · 낙찰가 = 내 입찰값이면 최소 1개(전원 동률일 때 floor(cnt/cnt)) 최대 cnt 개 · 시크릿이면 이겼는지부터 모름
      let won, sure = 0, maybe = 0;
      if (cnt === 1) { won = true; sure = 1; }
      else if (!h.secret[m.sh]) { won = m.v === p; if (won) { sure = 1; maybe = cnt - 1; } }
      else { won = null; maybe = cnt; }
      return { ...m, won, cnt, sure, maybe, price: h.secret[m.sh] ? null : p };
    });
  }
  const pubHist = st => st.rounds.map(h => ({ r: h.r, picks: h.picks.slice(), cnt: h.cnt.slice(), price: h.price.map((p, s) => (h.secret[s] ? null : p)), secret: h.secret.slice() }));
  function view(st, seat) {
    const all = seat === "all", me = all ? -1 : seat;
    const hist = pubHist(st);
    const seen = i => all || i === me;
    const mine = me >= 0 ? inferMine(st.myr[me], hist) : [];
    const pubObj = { r: st.round, p: st.phase, pk: st.picks, t: st.turn, bd: st.bids.map(Boolean), h: hist, ov: st.over, cl: st.coins.map(x => x.filter(Boolean).length) };
    const V = {
      n: st.n, rounds: ROUNDS, round: st.round, phase: st.phase, picks: st.picks.slice(), order: st.order.slice(), turn: st.turn,
      bidDone: st.bids.map(Boolean), coinCnt: st.coins.map(x => x.filter(Boolean).length),
      coins: me >= 0 ? st.coins[me].slice() : null, myBid: me >= 0 && st.bids[me] ? st.bids[me].slice() : null,
      hist, mine, needs: needs(st), over: st.over,
      res: st.phase === "show" ? { r: st.res.r, picks: st.res.picks.slice(), cnt: st.res.cnt.slice(), price: st.res.price.map((p, s) => (st.res.secret[s] ? null : p)), secret: st.res.secret.slice() } : null,
      final: st.final ? { rows: st.final.rows.map(x => ({ ...x, cells: x.cells.slice(), tiles: x.tiles.slice() })), ranks: st.final.ranks.slice() } : null,
      ranks: st.final ? st.final.ranks.slice() : null,
      score: st.final ? st.final.rows.map(x => x.lines * 10 + x.fill) : st.coins.map(x => x.filter(Boolean).length),
      log: st.log.slice(-60).filter(e => e.k !== "bid" || true), seat, pub: hash(JSON.stringify(pubObj)),
    };
    if (all) V.sec = { coins: st.coins.map(x => x.slice()), bids: st.bids.map(b => (b ? b.slice() : null)), tiles: st.tiles.map(x => x.slice()), myr: st.myr.map(x => x.slice()) };
    void seen;
    return V;
  }

  // ── AI (보이는 것만) ────────────────────────────────────────
  // 내가 받았을 타일 개수 짐작 (확실 + 모르는 건 절반)
  function estTiles(V) {
    const e = [0, 0, 0];
    for (const m of V.mine) e[m.sh] += (m.sure || 0) + 0.5 * (m.maybe || 0);
    return e;
  }
  const myCoinValue = V => SUMV(COINS.filter((v, k) => V.coins[k]));
  function pickScores(V, me, tier, r) {
    const est = estTiles(V), left = V.n - 1 - V.order.indexOf(me);   // 내 뒤에 고를 사람 수
    const w = [1.0, 1.1, 1.35];
    return [0, 1, 2].map(s => {
      const need = Math.max(0, CAP[s] - est[s]);
      const early = V.picks.filter(x => x === s).length;
      const exp = early + left / 3;                                  // 나 말고 들어올 사람 수 (짐작)
      const stake = Math.min(need, early + 1 + left / 3);
      let sc = (w[s] * stake) / (1 + exp * (tier === "hard" ? 0.85 : 0.6));
      if (early === 0 && left === 0) sc += 0.4;                      // 마지막이고 아무도 없는 곳 = 거저
      if (tier === "easy") sc = sc * 0.5 + r() * 1.2;
      else sc += r() * (tier === "hard" ? 0.05 : 0.25);
      return sc;
    });
  }
  function bestSubset(V, target, mustKeep, r, tier) {
    const have = []; for (let k = 0; k < COINS.length; k++) if (V.coins[k]) have.push(k);
    let best = null;
    for (let m = 1; m < (1 << have.length); m++) {
      const pick = []; for (let b = 0; b < have.length; b++) if (m & (1 << b)) pick.push(have[b]);
      if (have.length - pick.length < mustKeep) continue;
      const v = SUMV(pick.map(k => COINS[k]));
      const sc = -Math.abs(v - target) * 2.2 - pick.length * (tier === "easy" ? 0.1 : 0.8) + r() * 0.05;
      if (!best || sc > best.sc) best = { sc, pick, v };
    }
    return best;
  }
  function bidPlan(V, me, tier, r) {
    const sh = V.picks[me], cntNow = V.picks.filter(x => x === sh).length;
    const roundsLeft = ROUNDS - V.round + 1;
    const val = myCoinValue(V), nHave = V.coins.filter(Boolean).length;
    const mustKeep = roundsLeft - 1;
    const est = estTiles(V);
    const need = Math.max(0, CAP[sh] - est[sh]);
    const useful = Math.min(need, cntNow);
    let target;
    if (cntNow === 1) target = 1;
    else {
      const per = val / roundsLeft;                                  // 라운드당 쓸 만한 값
      const stakeAvg = Math.max(1, V.n / 3);
      let want = per * (useful / stakeAvg) * (tier === "hard" ? 1.5 : tier === "easy" ? 0.9 : 1.25);
      if (useful === 0) want = 1;                                    // 더 필요 없는 도형이면 버림
      if (roundsLeft === 1) want = useful > 0 ? val : 1;
      target = Math.max(1, Math.round(want));
    }
    if (tier === "easy") target = Math.max(1, Math.round(target * (0.5 + r())));
    return { sh, target, mustKeep, cntNow, useful, need, val, nHave, roundsLeft };
  }
  function ai(V, me, tier, r) {
    if (V.phase === "pick") {
      const sc = pickScores(V, me, tier, r);
      return { t: "pick", s: sc.indexOf(Math.max(...sc)) };
    }
    if (V.phase === "bid") {
      const p = bidPlan(V, me, tier, r);
      const b = bestSubset(V, p.target, p.mustKeep, r, tier);
      return { t: "bid", c: b.pick };
    }
    return null;
  }

  // ── AI 선생님 (모두에게 보인 것 + 내 코인 · 내 입찰만 읽음) ────────────
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) { const f = V.final.rows[me]; return { opp: "7라운드가 끝났어요.", mine: `빙고 ${f.lines}줄 · ${f.fill}칸 · 남은 코인 ${f.coins}개 → ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" }; }
    const r = (() => { let a = 777 + V.round * 31 + me; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    const est = estTiles(V), have = SUMV(est);
    // 👀 상대 흐름
    const picked = V.order.filter(i => V.picks[i] >= 0 && i !== me).map(i => `${nm(i)} ${SHAPES[V.picks[i]]}`);
    const last = V.hist[V.hist.length - 1];
    let opp = picked.length ? `이번 라운드 · ${picked.join(" · ")}` : "아직 아무도 상자에 넣지 않았어요";
    if (last) {
      const ps = [0, 1, 2].filter(s => last.cnt[s]).map(s => `${SHAPES[s]} ${last.secret[s] ? "시크릿" : last.price[s] + "원"}(${last.cnt[s]}명)`);
      opp += ` / 지난 라운드 낙찰가 ${ps.join(" · ")}`;
      const sec = [0, 1, 2].find(s => last.secret[s]);
      if (sec != null) opp += ` — ${SHAPES[sec]} 는 가장 비싸서 가격이 숨겨졌어요 (누군가 크게 썼어요)`;
    }
    // 📊 내 흐름
    const need = [0, 1, 2].map(s => Math.max(0, CAP[s] - est[s]));
    const doneBingo = place(est.map(x => Math.round(x)));
    let mine = `${V.round}/${ROUNDS}라운드 · 내 코인 ${V.coinCnt[me]}개(${SUMV(COINS.filter((v, k) => V.coins[k]))}원) · 받았을 타일 약 ${Math.round(have * 10) / 10}개 (○${Math.round(est[0] * 10) / 10} △${Math.round(est[1] * 10) / 10} ☆${Math.round(est[2] * 10) / 10}) · 지금 짐작 빙고 ${doneBingo.lines}줄`;
    // 💡 추천 + 👉 의미
    let rec = "상대 차례를 기다려요", why = "";
    const mine_ = V.needs.includes(me);
    if (V.phase === "pick" && mine_) {
      const sc = pickScores(V, me, "hard", r), s = sc.indexOf(Math.max(...sc));
      const early = V.picks.filter(x => x === s).length;
      rec = `${SHAPES[s]} 에 넣기`;
      why = early ? `${SHAPES[s]} 에 이미 ${early}명이 들어갔어요 — 이긴다면 타일이 ${early + 1}개 걸린 셈이에요 (${SHAPES[s]} 은 아직 ${Math.round(need[s] * 10) / 10}칸 더 필요).` : `${SHAPES[s]} 은 아직 ${Math.round(need[s] * 10) / 10}칸이 필요한데 경쟁자가 없어요 — 혼자면 1원만 내고도 받아요.`;
    } else if (V.phase === "bid" && !V.bidDone[me]) {
      const p = bidPlan(V, me, "hard", r), b = bestSubset(V, p.target, p.mustKeep, r, "hard");
      rec = `코인 ${b.pick.map(k => COINS[k]).join("+")} = ${b.v}원`;
      why = p.cntNow === 1 ? "이 도형엔 나 혼자라 1원이면 충분해요. 남는 코인은 다음 라운드와 마지막 동점 가림에 써요." : `${SHAPES[p.sh]} 에 ${p.cntNow}명 — 타일 ${p.cntNow}개가 걸렸고 내게 필요한 건 약 ${Math.round(p.need * 10) / 10}칸. 남은 ${p.roundsLeft}라운드에 쓸 값(${p.val}원)을 나눠 이 정도를 내요.${p.roundsLeft === 1 ? " 마지막이라 남은 코인은 다 써도 돼요." : ""}`;
    } else if (V.phase === "bid") rec = "다른 사람 입찰을 기다려요";
    else if (V.phase === "show") rec = "결과를 확인하고 다음 라운드를 준비해요";
    return { opp, mine, rec, why };
  }

  return {
    id: "auctionbingo", SHAPES, BOARD, CELLS, CAP, LINES, COINS, ROUNDS,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach,
    place, checkBid, bidValue, estTiles, pickScores, bidPlan, bestSubset, inferMine,
  };
});
