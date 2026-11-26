/* 베니 서바이벌 · 호러 레이스 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 그랜드 파이널 2화 메인 매치 — 12명, 트랙 12칸, 캐릭터 5종 (뱀파이어 · 강시 · 구미호 · 미라 · 좀비)
   · 각자 캐릭터 코인 5종을 1개씩 받고, 우승시키고 싶은 2종을 몰래 제출 · 남은 3종은 코인 박스로 (12명이면 36개)
   · 라운드: 순서대로 박스에서 코인 3개를 무작위로 뽑아 3개 구역(이동 1 · 2 · 4칸)에 마음대로 나눠 놓아요 (뽑은 코인은 그 차례에 다 써요)
   · 모두 놓은 뒤 1구역 → 2구역 → 4구역 순으로, 그 구역에서 코인이 가장 많은 캐릭터가 이동 (최다가 동률이면 그 캐릭터들은 못 가고 그다음으로 많은 캐릭터가 이동, 전부 동률이면 아무도 못 감)
   · 코인 포기: 뽑기 전에 선언하면 다음 라운드의 맨 마지막 순서 · 포기한 사람의 다음 사람이 다음 라운드의 1번 · 한 라운드에 한 명만, 앞 순서가 이미 포기했으면 못 함
   · 한 캐릭터가 골인 지점을 지나면 그 즉시 끝 (1구역에서 골인하면 2 · 4구역은 안 움직임) · 골인 지점에 가까운 순서로 1 · 2 · 3등
   · 응원한 캐릭터가 1등이면 3점, 2등 2점, 3등 1점 (두 캐릭터 점수를 더함) · 공동 2등이면 그 캐릭터 응원자는 1점씩 · 3등 응원자는 0 · 공동 3등이면 1점씩
   · 점수가 가장 높으면 우승 · 가장 낮으면 탈락후보
   우리 판 다듬기: 4~8명 (코인 박스는 3×인원 개) · 골인 = 12칸에 닿거나 넘음 · 연합 · 대화 · 코인 감별(자석 · 무게)이 없어요 ·
   동점은 공동 순위 (방송에서 점수 동률 탈락후보는 우승자가 정했지만 우리는 공동) · 방송 9화의 Ⅱ(웅덩이 · 업히기 · 이동 1·2·3칸)는 만들지 않았어요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-horror"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CHARS = [{ n: "뱀파이어", e: "🧛" }, { n: "강시", e: "👲" }, { n: "구미호", e: "🦊" }, { n: "미라", e: "🤕" }, { n: "좀비", e: "🧟" }];
  const GOAL = 12, MOVES = [1, 2, 4], MAXR = 40;
  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 40) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const rot = (a, k) => a.slice(k).concat(a.slice(0, k));
  const zeros = () => [0, 0, 0, 0, 0];

  function init({ n, seed, cfg }) {
    n = Math.max(4, Math.min(8, n | 0 || 6));
    const c = cfg || {};
    return { n, rs: (seed >>> 0) || 1, cfg: c, phase: "pick", sup: Array(n).fill(null), boxAll: [], box: [], round: 0, order: [...Array(n).keys()], idx: 0, hand: null, skipper: -1, zone: [zeros(), zeros(), zeros()], turns: [], pos: zeros(), hist: [], over: false, ranks: null, pts: Array(n).fill(0), draw: false, score: Array(n).fill(0), log: [], seq: 0, goal: c.goal || GOAL, fin: -1, charRank: null };
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "pick") return [...Array(st.n).keys()].filter(i => !st.sup[i]);
    return [st.order[st.idx]];
  }
  function startRace(st) {
    st.boxAll = []; st.sup.forEach(s => { for (let c = 0; c < 5; c++) if (!s.includes(c)) st.boxAll.push(c); });
    st.box = st.boxAll.slice(); st.phase = "race"; push(st, { k: "start" });
  }
  function pickMover(cnt) {
    const ds = [...new Set(cnt.filter(x => x > 0))].sort((a, b) => b - a);
    for (const d of ds) { const g = cnt.map((x, c) => (x === d ? c : -1)).filter(c => c >= 0); if (g.length === 1) return g[0]; }
    return -1;
  }
  // 골인에 가까운 순서 → 캐릭터별 순위(1등 = 1) · 응원 점수
  function charScores(pos) {
    const rank = pos.map(p => 1 + pos.filter(q => q > p).length), cnt = rank.map(r => rank.filter(x => x === r).length);
    const sc = pos.map((p, c) => (rank[c] === 1 ? 3 : rank[c] === 2 ? (cnt[c] > 1 ? 1 : 2) : rank[c] === 3 ? 1 : 0));
    return { rank, sc };
  }
  function finish(st) {
    st.over = true; st.phase = "over";
    const { rank, sc } = charScores(st.pos); st.charRank = rank;
    st.pts = st.sup.map(s => sc[s[0]] + sc[s[1]]); st.score = st.pts.slice();
    const mx = Math.max(...st.pts), mn = Math.min(...st.pts);
    st.draw = mx === mn; st.ranks = st.draw ? Array(st.n).fill(0) : st.pts.map(x => st.pts.filter(y => y > x).length);
    st.losers = st.draw ? [] : st.pts.map((x, i) => (x === mn ? i : -1)).filter(i => i >= 0);
    push(st, { k: "end" });
  }
  function resolveRound(st) {
    const moves = [];
    for (let z = 0; z < 3; z++) {
      const c = pickMover(st.zone[z]);
      if (c < 0) { moves.push(null); continue; }
      const from = st.pos[c]; st.pos[c] += MOVES[z]; moves.push({ z, c, from, to: st.pos[c] });
      if (st.pos[c] >= st.goal) { st.fin = c; break; }
    }
    st.hist.push({ r: st.round, order: st.order.slice(), skipper: st.skipper, turns: st.turns.map(t => ({ s: t.s, coins: t.coins.slice(), z: t.z.slice() })), zone: st.zone.map(z => z.slice()), moves, pos: st.pos.slice() });
    push(st, { k: "round", r: st.round });
    st.round++;
    if (st.fin >= 0 || st.round >= MAXR) { finish(st); return; }
    if (st.skipper >= 0) st.order = rot(st.order, st.order.indexOf(st.skipper) + 1);
    st.idx = 0; st.hand = null; st.skipper = -1; st.zone = [zeros(), zeros(), zeros()]; st.turns = []; st.box = st.boxAll.slice();
  }
  function nextTurn(st) { st.idx++; st.hand = null; if (st.idx >= st.n) resolveRound(st); }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a) return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "pick") {
      if (a.t !== "sup") return { ok: false, err: "응원할 캐릭터 2개를 골라요" };
      if (st.sup[seat]) return { ok: false, err: "이미 냈어요 — 다른 사람을 기다려요" };
      const s = a.s;
      if (!Array.isArray(s) || s.length !== 2 || !s.every(x => Number.isInteger(x) && x >= 0 && x < 5) || s[0] === s[1]) return { ok: false, err: "서로 다른 캐릭터 2개를 골라요" };
      st.sup[seat] = s.slice().sort((x, y) => x - y);
      if (!needs(st).length) startRace(st);
      return { ok: true };
    }
    if (st.order[st.idx] !== seat) return { ok: false, err: "내 차례가 아니에요" };
    if (!st.hand) {
      if (a.t === "skip") {
        if (st.skipper >= 0) return { ok: false, err: "이번 라운드엔 이미 누가 코인을 포기했어요" };
        st.skipper = seat; push(st, { k: "skip", s: seat }); nextTurn(st); return { ok: true };
      }
      if (a.t !== "draw") return { ok: false, err: "코인을 뽑거나 포기해요" };
      const hand = [];
      for (let k = 0; k < 3; k++) { const j = Math.floor(rnd(st) * st.box.length); hand.push(st.box.splice(j, 1)[0]); }
      st.hand = hand; return { ok: true };
    }
    if (a.t !== "place") return { ok: false, err: "뽑은 코인 3개를 구역에 놓아요" };
    const z = a.z;
    if (!Array.isArray(z) || z.length !== 3 || !z.every(x => Number.isInteger(x) && x >= 0 && x < 3)) return { ok: false, err: "코인 3개를 모두 구역에 놓아요" };
    z.forEach((zz, k) => { st.zone[zz][st.hand[k]]++; });
    st.turns.push({ s: seat, coins: st.hand.slice(), z: z.slice() }); push(st, { k: "place", s: seat });
    nextTurn(st);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) {
    if (st.over) return [];
    if (st.phase === "pick") return !st.sup[seat] ? [{ t: "sup", s: [0, 1] }] : [];
    if (st.order[st.idx] !== seat) return [];
    return st.hand ? [{ t: "place", z: [0, 0, 0] }] : [{ t: "draw" }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const everything = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const turns = st.turns.map(t => ({ s: t.s, coins: t.coins.slice(), z: t.z.slice() }));
    const hist = st.hist.map(h => ({ r: h.r, order: h.order.slice(), skipper: h.skipper, turns: h.turns.map(t => ({ s: t.s, coins: t.coins.slice(), z: t.z.slice() })), zone: h.zone.map(z => z.slice()), moves: h.moves.map(m => (m ? Object.assign({}, m) : null)), pos: h.pos.slice() }));
    const cur = st.over ? -1 : st.order[st.idx];
    const pub = { r: st.round, ph: st.phase, o: st.order, i: st.idx, z: st.zone, p: st.pos, sk: st.skipper, hn: !!st.hand, bl: st.box.length, h: st.hist.map(h => [h.turns, h.moves]), ov: st.over, sub: needs(st) };
    const v = {
      n: st.n, seat, phase: st.phase, round: st.round, goal: st.goal, mySup: me >= 0 && st.sup[me] ? st.sup[me].slice() : null, supDone: st.sup.map(s => !!s),
      order: st.order.slice(), idx: st.idx, cur, hand: me >= 0 && cur === me && st.hand ? st.hand.slice() : null, handOn: !!st.hand, skipper: st.skipper, canSkip: st.phase === "race" && !st.over && !st.hand && st.skipper < 0,
      zone: st.zone.map(z => z.slice()), turns, pos: st.pos.slice(), boxLeft: st.box.length, boxTotal: st.boxAll.length, hist,
      needs: needs(st), over: st.over, draw: !!st.draw, ranks: st.over ? st.ranks.slice() : null, losers: st.over ? st.losers.slice() : [],
      sup: st.over ? st.sup.map(s => s.slice()) : null, charRank: st.over ? st.charRank.slice() : null, pts: st.over ? st.pts.slice() : null,
      score: st.over ? st.score.slice() : Array(st.n).fill(0), log: st.log.slice(-30), pub: hash(JSON.stringify(pub)),
    };
    if (everything) { v.supAll = st.sup.map(s => (s ? s.slice() : null)); v.handAll = st.hand ? st.hand.slice() : null; }
    return v;
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 지금까지 공개된 뽑기(모두 놓은 코인)로 본 캐릭터별 코인 비율 — 박스 안 구성을 어림해요
  function boxShare(V) {
    const c = [2, 2, 2, 2, 2];
    for (const h of V.hist) for (const t of h.turns) t.coins.forEach(x => c[x]++);
    for (const t of V.turns) t.coins.forEach(x => c[x]++);
    const s = c.reduce((a, b) => a + b, 0); return c.map(x => x / s);
  }
  const clonez = z => z.map(a => a.slice());
  // 이번 라운드 결과 위치 (구역 코인을 합쳐 이동) — 순수 함수
  function simMove(zone, pos, goal) {
    const p = pos.slice(); let fin = -1;
    for (let z = 0; z < 3; z++) { const c = pickMover(zone[z]); if (c >= 0) { p[c] += MOVES[z]; if (p[c] >= goal) { fin = c; break; } } }
    return { p, fin };
  }
  // 내 응원 캐릭터들의 지금 순위 가치 (끝났다고 치고 매긴 점수 + 앞선 정도)
  function worth(pos, sup, goal, oth) {
    const { sc } = charScores(pos); let w = 0;
    for (const c of sup) w += sc[c] + 0.18 * Math.min(pos[c], goal) / goal;
    if (oth) for (let c = 0; c < 5; c++) w -= 0.5 * oth[c] * sc[c];   // 남들이 응원하는 캐릭터가 잘 가면 내 상대 순위가 내려가요
    return w;
  }
  // 코인 박스 비율로 본 '다른 사람 한 명이 캐릭터 c 를 응원할 확률' (박스에 든 c 코인 수 = 인원 − 응원자 수)
  function rivalShare(V) {
    const sh = boxShare(V), n = V.n, mine = V.mySup || [];
    return sh.map((q, c) => Math.max(0, Math.min(1, (n - 3 * n * q - (mine.includes(c) ? 1 : 0)) / Math.max(1, n - 1))));
  }
  const PLACE = (() => { const a = []; for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) a.push([x, y, z]); return a; })();
  // 놓는 방법 27가지마다, 뒷사람들이 박스 구성 어림대로 뽑아 무작위로 놓는다고 보고 라운드 끝 가치를 몬테카를로로 어림
  function evPlace(V, me, hand, r, S) {
    S = S || 100;
    const sh = boxShare(V), later = V.order.slice(V.idx + 1).length, n = V.n, oth = rivalShare(V);
    const rolls = []; for (let s = 0; s < S; s++) { const coins = [], zs = []; for (let k = 0; k < later * 3; k++) { const u = r(); let a = 0, c = 0; for (; c < 4; c++) { a += sh[c]; if (u < a) break; } coins.push(c); zs.push(Math.floor(r() * 3) % 3); } rolls.push({ coins, zs }); }
    const out = PLACE.map(pl => {
      let tot = 0;
      for (const ro of rolls) {
        const zone = clonez(V.zone);
        hand.forEach((c, k) => { zone[pl[k]][c]++; });
        for (let k = 0; k < ro.coins.length; k++) zone[ro.zs[k]][ro.coins[k]]++;
        const { p } = simMove(zone, V.pos, V.goal);
        tot += worth(p, V.mySup, V.goal, oth);
      }
      return tot / S;
    });
    return { pl: PLACE, ev: out, n };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "pick") {
      const a = Math.floor(r() * 5) % 5; let b = Math.floor(r() * 4) % 4; if (b >= a) b++;
      return { t: "sup", s: [a, b].sort((x, y) => x - y) };
    }
    if (!V.hand) {
      if (V.canSkip && tier !== "hard" && r() < (tier === "easy" ? 0.08 : 0.04)) return { t: "skip" };
      return { t: "draw" };
    }
    const hand = V.hand;
    if (tier === "easy") return { t: "place", z: hand.map(() => Math.floor(r() * 3) % 3) };
    if (tier === "normal") {
      // 내 응원 코인은 많이 가는 쪽(4칸 구역)으로, 남의 것은 1칸 구역에 흩어 놓아요
      return { t: "place", z: hand.map(c => (V.mySup.includes(c) ? 2 : 0)) };
    }
    const E = evPlace(V, me, hand, r, 100); let bi = 0;
    for (let i = 1; i < E.ev.length; i++) if (E.ev[i] > E.ev[bi] + 1e-9) bi = i;
    return { t: "place", z: E.pl[bi].slice() };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const f2 = x => x.toFixed(2).replace(/0$/, "");
  const zn = z => ["1칸", "2칸", "4칸"][z];
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`), cn = c => CHARS[c].e + CHARS[c].n;
    const seated = typeof V.seat === "number" && V.seat >= 0 && V.seat === me;
    const lead = pos => pos.map((p, c) => [p, c]).sort((a, b) => b[0] - a[0]);
    if (V.over) {
      const fin = lead(V.pos);
      return {
        opp: `최종 위치 ${fin.map(([p, c]) => `${cn(c)} ${p}칸`).join(" · ")} · 응원: ${V.sup.map((s, i) => `${nm(i)} ${cn(s[0])}${cn(s[1])}`).join(" / ")}`,
        mine: seated ? `내 점수 ${V.pts[me]} (${cn(V.sup[me][0])} + ${cn(V.sup[me][1])}) · ${V.draw ? "무승부" : `${V.ranks[me] + 1}위`}` : `점수 ${V.pts.join(" / ")}`,
        rec: V.draw ? "무승부" : seated && V.ranks[me] === 0 ? "이겼어요!" : "아깝네요",
        why: `${V.round}라운드 만에 끝났어요. 응원한 캐릭터가 1등이면 3점 · 2등 2점 · 3등 1점이고, 공동 2등은 1점씩이에요.`,
      };
    }
    const fin = lead(V.pos), curN = V.cur >= 0 ? nm(V.cur) : "";
    const board = `${V.round + 1}라운드 · 위치 ${fin.map(([p, c]) => `${CHARS[c].e}${p}`).join(" ")} (골인 ${V.goal}칸)`;
    const placed = V.turns.map(t => `${nm(t.s)} ${t.coins.map((c, k) => CHARS[c].e + zn(t.z[k])).join("")}`);
    if (!seated) return { opp: `${board} · 지금 ${curN} 차례 · 이번 라운드 놓은 코인: ${placed.join(" / ") || "아직 없음"}`, mine: "구경 중", rec: "자리에 앉으면 내 차례마다 알려 드려요", why: "구역(1 · 2 · 4칸)마다 코인이 가장 많은 캐릭터가 그만큼 가요. 최다가 같으면 못 가요." };
    if (V.phase === "pick") return {
      opp: `${V.supDone.filter(Boolean).length}/${V.n}명이 응원 캐릭터를 냈어요 — 누가 무엇을 골랐는지는 아무도 몰라요.`, mine: V.mySup ? `내 응원 ${cn(V.mySup[0])} · ${cn(V.mySup[1])} (제출함)` : "아직 고르지 않았어요",
      rec: V.mySup ? "다른 사람을 기다려요" : "정보가 없으니 아무 2개나 골라도 같아요",
      why: `응원 캐릭터의 코인은 박스에 안 들어가요 — 박스에는 사람마다 응원하지 않는 3종씩 ${3 * V.n}개가 들어가서, 모두가 같은 캐릭터를 응원하면 그 캐릭터는 코인이 없어 못 달려요. 누가 무엇을 고를지 모르니 한쪽에 몰리지 않게 흩어 고르는 게 좋아요.`,
    };
    const mine = V.mySup, tot = V.zone.map(z => z.reduce((a, b) => a + b, 0));
    const opp = `${board} · 이번 라운드 놓인 코인: ${placed.join(" / ") || "아직 없음"} · 구역별 합 ${tot.map((t, z) => `${zn(z)} ${t}개`).join(" ")}${V.boxLeft !== V.boxTotal ? ` · 박스에 ${V.boxLeft}/${V.boxTotal}개 남음` : ""}`;
    const info = `내 응원 ${cn(mine[0])} · ${cn(mine[1])} (현재 ${V.pos[mine[0]]}칸 · ${V.pos[mine[1]]}칸) · 내 순서 ${V.order.indexOf(me) + 1}/${V.n}`;
    if (V.cur !== me) return { opp, mine: info, rec: "다른 사람 차례예요", why: "기다려요." };
    if (!V.hand) return { opp, mine: info, rec: "코인 3개 뽑기", why: `코인 포기는 이번에 뽑지 않고 다음 라운드 맨 마지막이 되는 건데, 뽑기 전에만 할 수 있고 라운드에 한 명만 해요. 지금은 뽑아서 내 캐릭터 쪽에 놓는 게 이득이에요 (박스 ${V.boxLeft}개 중 3개가 무작위로 나와요).` };
    const sd = V.round * 97 + V.idx * 13 + me * 5 + 7, E = evPlace(V, me, V.hand, sampler(sd), 100), a = ai(V, me, "hard", sampler(sd));
    const bi = E.pl.findIndex(p => p.join() === a.z.join()), allSame = E.ev.every(x => Math.abs(x - E.ev[0]) < 1e-6);
    const base = worth(V.pos, mine, V.goal), same0 = E.pl.findIndex(p => p.join() === "0,0,0");
    return {
      opp, mine: info,
      rec: V.hand.map((c, k) => `${CHARS[c].e}${CHARS[c].n} → ${zn(a.z[k])} 구역`).join(" · "),
      why: `뒷사람 ${V.order.length - V.idx - 1}명이 지금까지 공개된 코인 비율(${boxShareText(V)})대로 뽑아 아무 구역에나 놓는다고 어림했어요. 이번 라운드가 끝났을 때 내 응원 캐릭터의 점수 가치: 지금 ${f2(base)} → 이렇게 놓으면 약 ${f2(E.ev[bi])}${allSame ? "" : ` (전부 1칸 구역에 놓으면 ${f2(E.ev[same0])})`}. 가장 많은 코인을 가진 캐릭터만 가니까, 이길 수 있는 구역에 내 캐릭터 코인을 몰고 남의 코인은 서로 비기게 흩어 놓는 쪽을 골랐어요.`,
    };
    function boxShareText(V) { const s = boxShare(V); return s.map((x, c) => `${CHARS[c].e}${Math.round(x * 100)}%`).join(" "); }
  }
  function evalPlace(V, me, hand, seed) { return evPlace(V, me, hand, sampler(seed), 100); }

  return { id: "gn-horror", CHARS, GOAL, MOVES, MAXR, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, boxShare, pickMover, charScores, simMove, worth, evalPlace, evPlace, sampler, PLACE };
});
