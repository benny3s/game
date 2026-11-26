/* 베니 서바이벌 · 핼러윈 몬스터 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 3일차 메인 매치 (11명). 나무위키 3일차 문서(규칙 · 몬스터 표 · 무기 · 라운드 기록)를 읽고 우리 말로 옮김.
   · 승점 5 · 단검(공격 3, 돌려받음) 으로 시작. 전장 3칸에 몬스터가 서 있고 나머지는 대기열 (죽으면 대기열 맨 왼쪽이 그 칸을 채움).
   · 몬스터 체력 = 처치 승점. 마지막 일격을 넣은 사람이 승점 + 전리품(특수 무기 · 피스)을 가짐.
   · 라운드: 공격 순서 = 승점 높은 순 (동점: 1라운드 추첨, 이후 지난 라운드에 먼저 공격한 사람이 뒤로) → 모두 몰래 전장 번호 + 무기 1장을 냄 → 순서대로 적용.
   · 무기: 단검 3 · 독 1 (죽을 때까지 모든 사람의 순서마다 1 피해) · 얼음 3 (내 다음 순서까지 대상은 피해 안 받음) · 쌍검 4 (두 전장이면 각 2) · 수류탄 6 · 시한폭탄 10 (내 다음 라운드 순서에 그 전장에 피해). 특수 무기는 쓰면 사라짐.
   · 한 사람의 순서 안에서 피해 순서 = 얼음 풀림 → 무기 → 시한폭탄 → 독 (나무위키 각주). 남은 공격력은 몬스터가 죽으면 사라짐.
   · 모든 몬스터가 죽으면 끝, 승점 1등.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 3~6명 개인전 (방송 11명 · 동맹) — 동맹 · 승점 양도 · 스카우터 · 순서 바꾸기 · 피스 아이템 없음. 피스는 모으기만 하고 순위에는 안 셈.
     ② 인원이 적으면 몬스터 일부만 (대기열을 방송 순서로 자르고 사신은 마지막에 꼭 — 옵션으로 13마리 전부).
     ③ 라운드 제출 2분 제한 없음, 라운드 상한 (일부 20 · 전부 30). 승점 같으면 공동 순위.
     ④ 방송 글에 없는 것: 독은 겹쳐 놓을 수 있고 각각 1 피해 · 독으로 죽이면 독 놓은 사람이 처치 · 독은 내 순서에도 틱 · 시한폭탄은 그 순간 그 전장에 서 있는 몬스터가 맞음 · 이미 얼어 있는 몬스터에 얼음은 헛수.
     ⑤ 라운드가 끝나면 모든 공격(누가 · 어느 전장 · 무슨 무기)과 처치가 공개돼 남은 체력을 기록으로 계산할 수 있음 (방송은 노트에 적어 셈, 우리는 화면이 합계를 대신 셈). 라운드 중 남의 선택은 안 보임.
   숨은 정보: 이번 라운드 남의 제출 (적용 전까지). 그 밖은 기록으로 모두 알 수 있음. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).halloween = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // 몬스터 13종 (방송 표) — 처음 3마리가 전장, 나머지는 이 순서의 대기열 (사신 마지막)
  const MON = [
    { nm: "잭오랜턴", hp: 5, loot: ["poison"], em: "🎃" }, { nm: "나무 괴물", hp: 9, loot: ["grenade", "twin"], em: "🌳" }, { nm: "마녀", hp: 15, loot: ["bomb", "peace"], em: "🧙" },
    { nm: "드라큘라", hp: 10, loot: ["ice", "twin"], em: "🧛" }, { nm: "늑대인간", hp: 5, loot: ["grenade"], em: "🐺" }, { nm: "미라유령", hp: 7, loot: ["grenade", "poison"], em: "👻" },
    { nm: "프랑켄슈타인", hp: 9, loot: ["bomb", "twin"], em: "⚡" }, { nm: "좀비", hp: 13, loot: ["ice", "grenade"], em: "🧟" }, { nm: "가고일", hp: 9, loot: ["bomb"], em: "🗿" },
    { nm: "삐에로", hp: 12, loot: ["grenade", "grenade"], em: "🤡" }, { nm: "도깨비", hp: 18, loot: ["grenade", "peace"], em: "👹" }, { nm: "메두사", hp: 15, loot: ["peace"], em: "🐍" },
    { nm: "사신", hp: 20, loot: ["peace", "peace"], em: "💀" },
  ];
  const WP = {
    dagger: { nm: "단검", em: "🗡️", dmg: 3, d: "공격 3 · 돌려받음" }, poison: { nm: "독", em: "☠️", dmg: 1, d: "공격 1 + 죽을 때까지 모든 순서마다 1 피해" },
    ice: { nm: "얼음", em: "🧊", dmg: 3, d: "공격 3 + 내 다음 순서까지 그 몬스터는 피해를 안 받음" }, twin: { nm: "쌍검", em: "⚔️", dmg: 4, d: "공격 4 · 두 전장이면 각 2" },
    grenade: { nm: "수류탄", em: "🧨", dmg: 6, d: "공격 6" }, bomb: { nm: "시한폭탄", em: "💣", dmg: 10, d: "내 다음 라운드 순서에 그 전장에 10 피해" },
  };
  const SPECIAL = ["poison", "ice", "twin", "grenade", "bomb"], WORDER = ["dagger"].concat(SPECIAL), FIELD = 3, REAPER = 12;
  const OPTS = { mons: ["fit", "all"] };
  const optsOf = cfg => { const v = cfg && cfg.mons; return { mons: OPTS.mons.includes(v) ? v : "fit" }; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const mk = i => ({ i, hp: MON[i].hp, max: MON[i].hp, ice: -1, poison: [] });
  // 인원에 맞춘 대기열: 방송 순서로 자르고 사신은 꼭 마지막
  function lineup(n, mode) {
    if (mode === "all") return MON.map((m, i) => i);
    const budget = 20 * n, out = [0, 1, 2]; let tot = 29;
    for (let i = 3; i < REAPER; i++) { if (tot + MON[i].hp + MON[REAPER].hp > budget) break; out.push(i); tot += MON[i].hp; }
    out.push(REAPER); return out;
  }
  const capOf = o => (o.mons === "all" ? 30 : 20);

  // ── 순서 · 피해 엔진 (st 와 AI 의 모의 상태가 같이 씀) ──
  function kill(S, f, by, ev) {
    const m = S.field[f], D = MON[m.i];
    S.score[by] += m.max;
    const got = [];
    for (const l of D.loot) { if (l === "peace") S.pieces[by]++; else { S.inv[by][l] = (S.inv[by][l] || 0) + 1; } got.push(l); }
    ev.push({ k: "kill", f, mon: m.i, by, gain: m.max, loot: got });
    S.field[f] = S.queue.length ? mk(S.queue.shift()) : null;
    if (S.field[f]) ev.push({ k: "enter", f, mon: S.field[f].i });
  }
  function hit(S, f, amt, by, ev, w) {
    const m = S.field[f];
    if (!m) { ev.push({ k: "miss", f, by, w }); return; }
    if (m.ice >= 0) { ev.push({ k: "block", f, by, w, amt }); return; }
    m.hp -= amt; ev.push({ k: "dmg", f, by, w, amt });
    if (m.hp <= 0) kill(S, f, by, ev);
  }
  function runTurn(S, s, a, ev) {
    for (const m of S.field) if (m && m.ice === s) { m.ice = -1; ev.push({ k: "thaw", s }); }
    const w = a.w, f = a.f;
    if (w !== "dagger") S.inv[s][w]--;
    if (w === "dagger") hit(S, f, 3, s, ev, w);
    else if (w === "grenade") hit(S, f, 6, s, ev, w);
    else if (w === "twin") { if (a.f2 != null) { hit(S, f, 2, s, ev, w); hit(S, a.f2, 2, s, ev, w); } else hit(S, f, 4, s, ev, w); }
    else if (w === "poison") { const m = S.field[f]; hit(S, f, 1, s, ev, w); if (m && S.field[f] === m && m.ice < 0) { m.poison.push(s); ev.push({ k: "poison", f, s }); } }
    else if (w === "ice") { const m = S.field[f]; hit(S, f, 3, s, ev, w); if (m && S.field[f] === m && m.ice < 0) { m.ice = s; ev.push({ k: "freeze", f, s }); } }
    else if (w === "bomb") { S.bombs.push({ s, f, r: S.round }); ev.push({ k: "plant", f, s }); }
    // 시한폭탄 (지난 라운드에 놓은 것)
    for (const b of S.bombs.filter(b => b.s === s && b.r < S.round)) { S.bombs.splice(S.bombs.indexOf(b), 1); ev.push({ k: "boom", f: b.f, s }); hit(S, b.f, 10, s, ev, "bomb"); }
    // 독: 모든 사람의 순서가 끝날 때마다
    for (let f2 = 0; f2 < FIELD; f2++) {
      const m = S.field[f2];
      if (m && m.poison.length && m.ice < 0) for (const o of m.poison.slice()) { if (S.field[f2] !== m) break; hit(S, f2, 1, o, ev, "poison"); }
    }
    S.done = S.field.every(m => !m) && !S.queue.length;
  }
  const alive = S => S.field.map((m, f) => (m ? f : -1)).filter(f => f >= 0);

  function init({ n, seed, cfg }) {
    cfg = cfg || {}; n = Math.max(3, Math.min(6, n | 0 || 4));
    const o = optsOf(cfg), rs = (seed >>> 0) || 1, line = lineup(n, o.mons);
    const st = { n, rs, cfg: Object.assign({}, cfg), opt: o, cap: capOf(o), field: line.slice(0, FIELD).map(mk), queue: line.slice(FIELD), bombs: [],
      inv: Array.from({ length: n }, () => ({})), score: Array(n).fill(5), pieces: Array(n).fill(0), round: 0, phase: "pick", order: [], lastPos: Array(n).fill(0), tieKey: [],
      sub: Array(n).fill(null), res: null, done: false, over: false, end: "", log: [], seq: 0, total: line.reduce((a, i) => a + MON[i].hp, 0) };
    const R = seeded(hash(`ord|${rs}`)); st.tieKey = Array.from({ length: n }, () => R());
    st.log.push({ i: st.seq++, k: "start", n, mons: line.slice(), cap: st.cap });
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    if (st.round > st.cap) return finish(st, "cap");
    const key = s => (st.round === 1 ? st.tieKey[s] : -st.lastPos[s]);
    st.order = Array.from({ length: st.n }, (_, s) => s).sort((a, b) => st.score[b] - st.score[a] || key(a) - key(b) || a - b);
    st.sub = Array(st.n).fill(null); st.phase = "pick";
    st.log.push({ i: st.seq++, k: "round", r: st.round, order: st.order.slice() });
  }
  const needs = st => (st.over || st.phase !== "pick" ? [] : st.sub.map((x, s) => (x ? -1 : s)).filter(s => s >= 0));
  const over = st => !!st.over;
  function check(S, seat, a) {
    if (!a || typeof a !== "object" || a.t !== "atk") return "전장과 무기를 골라요";
    if (!Number.isInteger(a.f) || !S.field[a.f]) return "몬스터가 있는 전장을 골라요";
    if (!WP[a.w]) return "모르는 무기예요";
    if (a.w !== "dagger" && !(S.inv[seat][a.w] > 0)) return "그 무기가 없어요";
    if (a.f2 != null) { if (a.w !== "twin") return "쌍검만 두 전장을 칠 수 있어요"; if (!Number.isInteger(a.f2) || a.f2 === a.f || !S.field[a.f2]) return "다른 전장의 몬스터를 골라요"; }
    return "";
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    const e = check(st, seat, a); if (e) return { ok: false, err: e };
    st.sub[seat] = { f: a.f, w: a.w, f2: a.f2 == null ? null : a.f2 };
    if (st.sub.every(x => x)) resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const turns = [];
    for (let p = 0; p < st.n; p++) {
      const s = st.order[p]; if (st.done) break;
      const x = st.sub[s], ev = [];
      // 이 순서에 오기 전에 전장 몬스터가 바뀌었어도 번호 그대로 (빈 전장이면 헛수)
      runTurn(st, s, { w: x.w, f: x.f, f2: x.f2 }, ev);
      const t = { k: "turn", s, p, f: x.f, w: x.w, f2: x.f2, ev };
      turns.push(t); st.log.push(Object.assign({ i: st.seq++ }, clone(t)));
    }
    st.order.forEach((s, p) => { st.lastPos[s] = p; });
    st.res = { r: st.round, turns, score: st.score.slice() };
    st.phase = "show";
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 6200 : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    if (st.done) return finish(st, "clear");
    startRound(st);
  }
  function finish(st, why) { st.over = true; st.phase = "end"; st.end = why; st.log.push({ i: st.seq++, k: "end", why, score: st.score.slice() }); }
  const ranks = st => st.score.map(x => st.score.filter(y => y > x).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const o = [], fs = alive(st), ws = WORDER.filter(w => w === "dagger" || st.inv[seat][w] > 0);
    for (const f of fs) for (const w of ws) { o.push({ t: "atk", f, w }); if (w === "twin") for (const g of fs) if (g > f) o.push({ t: "atk", f, w, f2: g }); }
    return o;
  }
  // ── 보이는 것 ──
  function viewField(S) { return S.field.map(m => (m ? { i: m.i, nm: MON[m.i].nm, hp: m.hp, max: m.max, ice: m.ice, poison: m.poison.slice() } : null)); }
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all";
    const subbed = st.sub.map(x => !!x);
    const pubObj = { r: st.round, p: st.phase, sc: st.score, f: st.field.map(m => m && [m.i, m.hp, m.ice, m.poison]), q: st.queue, b: st.bombs, o: st.order, sb: subbed, inv: st.inv };
    const V = {
      n: st.n, round: st.round, cap: st.cap, phase: st.phase, seat: me, order: st.order.slice(), pos: me >= 0 ? st.order.indexOf(me) : -1, score: st.score.slice(), pieces: st.pieces.slice(),
      inv: st.inv.map(o => Object.assign({}, o)), field: viewField(st), queue: st.queue.slice(), bombs: st.bombs.map(b => Object.assign({}, b)), total: st.total,
      sub: me >= 0 && st.sub[me] ? Object.assign({}, st.sub[me]) : null, subbed, res: st.res ? clone(st.res) : null,
      needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), log: st.log.map(e => clone(e)), pub: hash(JSON.stringify(pubObj)).toString(36),
    };
    if (isAll) V.subs = st.sub.map(x => (x ? Object.assign({}, x) : null));
    return V;
  }

  // ── AI: 보이는 것(공개 기록으로 계산한 체력 · 순서 · 무기)만으로 모의 ──
  function simOf(V) {
    return { field: V.field.map(m => (m ? { i: m.i, hp: m.hp, max: m.max, ice: m.ice, poison: m.poison.slice() } : null)), queue: V.queue.slice(), bombs: V.bombs.map(b => Object.assign({}, b)),
      inv: V.inv.map(o => Object.assign({}, o)), score: V.score.slice(), pieces: V.pieces.slice(), round: V.round, done: false };
  }
  const lootVal = D => D.loot.reduce((a, l) => a + (l === "peace" ? 0.3 : l === "grenade" || l === "ice" ? 1.3 : 1.1), 0);
  const WCOST = { poison: 1.0, ice: 1.4, twin: 1.2, grenade: 1.7, bomb: 1.7 };
  // 상대가 라운드 처음 상태만 보고 고를 법한 수 (보이는 것만으로 · 모의용)
  function oppAct(S, s, R) {
    const fs = alive(S), ws = fs.map(f => { const m = S.field[f]; return 1 + (m.ice >= 0 ? -0.8 : 0) + (m.hp <= 3 ? 5 : m.hp <= 6 ? 2 : 0) + (m.max >= 12 ? 0.4 : 0); });
    let tot = ws.reduce((a, b) => a + b, 0), x = R() * tot, k = 0; while (k < fs.length - 1 && x > ws[k]) { x -= ws[k]; k++; }
    const f = fs[k], m = S.field[f], inv = S.inv[s];
    let w = "dagger";
    if (m.hp > 3 && m.hp <= 6 && inv.grenade > 0 && R() < 0.6) w = "grenade";
    else if (m.hp > 3 && m.hp <= 4 && inv.twin > 0 && R() < 0.5) w = "twin";
    else if (inv.poison > 0 && R() < 0.15) w = "poison"; else if (inv.ice > 0 && R() < 0.15) w = "ice"; else if (inv.bomb > 0 && R() < 0.2) w = "bomb";
    return { f, w, f2: null };
  }
  const PROF = {
    easy: { samples: 0, noise: 0 },
    normal: { samples: 6, noise: 1.6, combo: false },
    hard: { samples: 24, noise: 0, combo: true },
  };
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.score, V.field, V.queue, V.bombs, V.order, V.inv]));
  // 후보 수 → 기대 효용 (모의 표본 평균). 같은 표본으로 모든 후보를 비교
  function evalActs(V, me, P, R) {
    const cands = []; const mineInv = V.inv[me], base = simOf(V);
    const fs = alive(base), ws = WORDER.filter(w => w === "dagger" || mineInv[w] > 0);
    for (const f of fs) for (const w of ws) { cands.push({ t: "atk", f, w }); if (w === "twin") for (const g of fs) if (g > f) cands.push({ t: "atk", f, w, f2: g }); }
    const U = cands.map(() => 0), K = cands.map(() => 0), S0 = Math.max(1, P.samples);
    const remHP = base.field.reduce((a, m) => a + (m ? m.hp : 0), 0) + base.queue.reduce((a, i) => a + MON[i].hp, 0), endF = Math.min(1, remHP / 40);
    for (let sm = 0; sm < S0; sm++) {
      const acts = V.order.map(s => (s === me ? null : oppAct(base, s, R)));
      for (let c = 0; c < cands.length; c++) {
        const S = clone(base), a = cands[c], before = S.score[me];
        let killed = 0, dealt = 0;
        for (let p = 0; p < V.order.length && !S.done; p++) {
          const s = V.order[p], ev = [], x = s === me ? { w: a.w, f: a.f, f2: a.f2 } : Object.assign({}, acts[p]);
          if (s !== me && x.w !== "dagger" && !(S.inv[s][x.w] > 0)) x.w = "dagger";
          runTurn(S, s, x, ev);
          if (s === me) for (const e of ev) if (e.k === "kill" && e.by === me) killed += MON[e.mon].hp + lootVal(MON[e.mon]) + 0.0;
          if (s === me) for (const e of ev) if (e.k === "dmg" && e.by === me) dealt += e.amt;
        }
        // 이번 라운드 끝에 남은 것: 내가 건 독 · 얼음 · 시한폭탄의 값
        let ext = 0, steal = 0;
        for (let f = 0; f < FIELD; f++) {
          const m = S.field[f]; if (!m) continue;
          if (P.combo) {
            if (a.w === "ice" && m.ice === me) { const can = 3 + (S.inv[me].grenade > 0 ? 3 : 0) + (S.inv[me].twin > 0 ? 1 : 0); if (m.hp <= can) ext += 0.85 * (m.max + lootVal(MON[m.i])); else ext += 0.1 * m.max; }
            if (a.w === "poison" && m.poison.includes(me)) ext += 0.22 * m.max * Math.min(1, V.n * 2 / Math.max(1, m.hp));
          }
        }
        if (a.w === "bomb" && P.combo) { const m = S.field[a.f]; ext += m ? (m.hp <= 10 ? 0.62 * (m.max + lootVal(MON[m.i])) : 0.3 * m.max) : 0; }
        // 내가 안 죽이고 때렸다면: 낮은 체력으로 남겨 남이 막타를 먹을 위험
        if (!killed && P.combo && (a.w === "dagger" || a.w === "grenade" || a.w === "twin")) {
          for (let f = 0; f < FIELD; f++) { const m = S.field[f], m0 = base.field[f]; if (m && m0 && m.hp < m0.hp && m.hp <= 3 && m.ice < 0) steal += 0.5 * (m.max * 0.6); }
        }
        const cost = a.w === "dagger" ? 0 : WCOST[a.w] * endF;
        // 헛수 방지: 하나도 못 때린 수는 효용 0 이하
        U[c] += killed + 0.06 * dealt + ext - steal - cost; K[c] += killed > 0 ? 1 : 0;
      }
    }
    return cands.map((a, c) => ({ a, u: U[c] / S0, kill: K[c] / S0 }));
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    const fs = V.field.map((m, f) => (m ? f : -1)).filter(f => f >= 0);
    if (!fs.length) return null;
    if (!P.samples) {   // 쉬움: 아무 전장 · 대부분 단검
      const f = fs[Math.floor(R() * fs.length)], sp = SPECIAL.filter(w => V.inv[s][w] > 0);
      const w = sp.length && R() < 0.35 ? sp[Math.floor(R() * sp.length)] : "dagger", a = { t: "atk", f, w };
      if (w === "twin" && fs.length > 1 && R() < 0.5) a.f2 = fs.filter(g => g !== f)[Math.floor(R() * (fs.length - 1))];
      return a;
    }
    const rows = evalActs(V, s, P, R);
    if (P.noise) for (const r of rows) r.u += (R() - 0.5) * 2 * P.noise;
    rows.sort((x, y) => y.u - x.u || x.a.f - y.a.f);
    const a = Object.assign({}, rows[0].a); if (a.f2 == null) delete a.f2;
    return a;
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  // 선생님 · 복기용: 후보별 (효용 · 처치 확률) 상위
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, R = seeded(keyV(V, s)), rows = evalActs(V, s, P, R).sort((x, y) => y.u - x.u || x.a.f - y.a.f);
    return { a: ai(V, s, "hard"), rows: rows.slice(0, 4) };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA) return null;
    const P = PROF.hard, rows = evalActs(V, s, P, seeded(keyV(V, s))), key = a => JSON.stringify({ f: a.f, w: a.w, f2: a.f2 == null ? null : a.f2 });
    const find = a => rows.find(r => key(r.a) === key(a));
    const m = find(myA), b = find(bestA);
    return m && b ? { my: m, best: b } : null;
  }
  // 이 순서 앞에서 몬스터가 맞을 피해(상대 모의 평균) — 선생님 글용
  function expectBefore(V, me) {
    const base = simOf(V), R = seeded(keyV(V, me) ^ 77), N = 12, hp = base.field.map(() => 0), dead = base.field.map(() => 0);
    for (let k = 0; k < N; k++) {
      const S = clone(base);
      for (let p = 0; p < V.order.length && !S.done; p++) {
        const s = V.order[p]; if (s === me) break;
        const x = oppAct(S, s, R); if (!S.field[x.f]) continue;
        runTurn(S, s, x, []);
      }
      S.field.forEach((m, f) => { if (base.field[f] && (!m || m.i !== base.field[f].i)) dead[f]++; });
      S.field.forEach((m, f) => { if (m && base.field[f] && m.i === base.field[f].i) hp[f] += m.hp; else if (base.field[f]) hp[f] += 0; });
    }
    return { hp: hp.map((x, f) => (base.field[f] ? x / N : null)), dead: dead.map(x => x / N) };
  }

  return { id: "halloween", MON, WP, WORDER, SPECIAL, FIELD, OPTS, PROF, optsOf, lineup, capOf, runTurn, kill, hit, simOf, oppAct, evalActs, expectBefore,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, lootVal };
});
