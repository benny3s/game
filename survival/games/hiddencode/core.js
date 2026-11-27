/* 베니 서바이벌 · 히든코드 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 3 · 7일차 데스매치 (1:1:1, 5라운드 · 3점 선승). 나무위키 7일차 문서 '4. 데스매치: 히든코드' (룰 · 1~3라운드 진행 기록)를 읽고 우리 말로 옮김.
   · 별 모양 문제 도형 A~E 칸에 숫자가 적혀 있고, 숨겨진 규칙 하나가 이 숫자들로 '결괏값'을 만들어요. 규칙을 알아내 이 도형의 결괏값을 외치면 1점.
   · 한 번의 숫자 획득: 집사가 주사위를 굴려 숫자를 공개 → 각자 자기 주사위 눈 1개를 골라 동시에 제출 → 숫자 5개를 모두 빈 별에 원하는 칸 조합으로(두 자리 이상 붙이기 가능) 넣어 결괏값을 확인.
   · 오답은 감점 없이 상대에게 30초 발언권. 제한시간 안에 아무도 못 맞히면 숫자 획득 과정을 되풀이. 3점이면 즉시 승, 5라운드 뒤 최다 승점, 동점이면 연장.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 2~3명 (방송 1:1:1 세 명). 집사 주사위 = 5 − 인원 (3명 2개 · 2명 3개), 합쳐 늘 숫자 5개.
     ② 숨겨진 규칙은 12개 목록에서 (방송 예 셋 — 짝수 칸의 합 · 곱 − 합 · 한글 'ㅇ' 개수 — 포함) 라운드마다 하나. 이 목록은 규칙 후보 수첩으로 모두에게 공개.
     ③ 다 같이 동시에 한 단계씩 (한 번에 시험 3번까지 · 시험 결과는 나만 봄 · 외치기 · 넘기기), 시험 · 외치기는 정해진 차례 안에서만 — 방송의 제한시간 · 동시 진행 대신.
     ④ 오답 30초 발언권 = '내 다음 차례엔 정답을 못 외침'. 한 문제에서 오답 2번이면 그 문제는 더 못 외침. 아무도 못 맞힌 채 숫자 획득이 4번 되풀이되면 그 문제는 0점.
     ⑤ 외치는 것은 결괏값만 (규칙 이름은 말하지 않음). 틀린 값은 모두에게 공개 → 그 값이 나오는 규칙은 모두에게 지워짐.
     ⑥ 연장은 5라운드 뒤 동점이면 9라운드까지, 그래도 같으면 공동 순위. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).hiddencode = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const sum = a => a.reduce((x, y) => x + y, 0);
  const digs = x => String(Math.abs(x)).split("").map(Number);
  const OH = { 0: 2, 1: 1, 2: 1, 5: 1, 6: 1 };      // 영(ㅇ 둘) 일 이 오 육 = ㅇ 하나, 나머지는 없음
  // 숨겨진 규칙 12개 — 값 배열(채운 칸만)을 받아 결괏값을 냄
  const RULES = [
    { id: "sumEven", sh: "짝수 칸의 합", nm: "짝수인 칸의 합", src: "방송 1라운드", f: v => sum(v.filter(x => x % 2 === 0)) },
    { id: "pms", sh: "곱 − 합", nm: "모든 칸의 곱 − 모든 칸의 합", src: "방송 2라운드", f: v => v.reduce((a, b) => a * b, 1) - sum(v) },
    { id: "hangulO", sh: "한글 ㅇ 개수 (영 2 · 일 이 오 육 1)", nm: "숫자를 한글로 읽은 'ㅇ' 의 개수 (영 2 · 일 · 이 · 오 · 육 1 · 나머지 0, 한 자리씩 읽음)", src: "방송 3라운드", f: v => sum(v.map(x => sum(digs(x).map(d => OH[d] || 0)))) },
    { id: "sumOdd", sh: "홀수 칸의 합", nm: "홀수인 칸의 합", f: v => sum(v.filter(x => x % 2 !== 0)) },
    { id: "evenCnt", sh: "짝수 칸의 개수", nm: "짝수인 칸의 개수", f: v => v.filter(x => x % 2 === 0).length },
    { id: "sum", sh: "모든 칸의 합", nm: "모든 칸의 합", f: v => sum(v) },
    { id: "prod", sh: "모든 칸의 곱", nm: "모든 칸의 곱", f: v => v.reduce((a, b) => a * b, 1) },
    { id: "maxmin", sh: "최대 − 최소", nm: "가장 큰 칸 − 가장 작은 칸", f: v => Math.max(...v) - Math.min(...v) },
    { id: "max", sh: "가장 큰 칸", nm: "가장 큰 칸의 숫자", f: v => Math.max(...v) },
    { id: "min", sh: "가장 작은 칸", nm: "가장 작은 칸의 숫자", f: v => Math.min(...v) },
    { id: "digsum", sh: "자리 숫자의 합", nm: "모든 칸의 자리 숫자를 하나하나 더한 합", f: v => sum(v.map(x => sum(digs(x)))) },
    { id: "digcnt", sh: "자릿수의 합", nm: "모든 칸 숫자의 자릿수를 더한 값", f: v => sum(v.map(x => digs(x).length)) },
  ];
  const NR = RULES.length, TESTS = 3, MAXW = 2, SETCAP = 4, WIN = 3, NORM = 5, CAPR = 9, CELLS = 5, LET = "ABCDE";
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const targetOf = (ri, star) => RULES[ri].f(star);
  const valsOf = (nums, cells) => cells.filter(c => c.length).map(c => +c.map(i => nums[i].v).join(""));
  const cellVals = (nums, cells) => cells.map(c => (c.length ? +c.map(i => nums[i].v).join("") : null));
  function cellsOk(cells) {
    if (!Array.isArray(cells) || cells.length !== CELLS) return false;
    const seen = Array(5).fill(0);
    for (const c of cells) { if (!Array.isArray(c)) return false; for (const i of c) { if (!Number.isInteger(i) || i < 0 || i > 4) return false; seen[i]++; } }
    return seen.every(x => x === 1);
  }

  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(3, n | 0 || 3)); const rs = (seed >>> 0) || 1, R = seeded(hash(`rules|${rs}`));
    const ord = Array.from({ length: NR }, (_, i) => i); for (let i = NR - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    // 방송 예(짝수 칸의 합 · 곱 − 합 · ㅇ 개수)가 앞 세 문제에 오되 순서는 섞음
    const first = [0, 1, 2], rest = ord.filter(i => i > 2); for (let i = 2; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [first[i], first[j]] = [first[j], first[i]]; }
    const st = { n, rs, cfg: Object.assign({}, cfg || {}), ruleOrd: first.concat(rest), round: 0, set: 0, phase: "pick", score: Array(n).fill(0), star: [], target: 0, rule: 0, butler: [], picks: Array(n).fill(null), nums: null,
      tests: Array.from({ length: n }, () => []), tcnt: Array(n).fill(0), done: Array(n).fill(false), blk: Array(n).fill(0), wrong: Array(n).fill(0), says: [], sub: Array(n).fill(null), step: 0, res: null, over: false, end: "", log: [], seq: 0, hist: [] };
    newRound(st); return st;
  }
  function makeStar(st) {
    const R = seeded(hash(`star|${st.rs}|${st.round}`)), ri = st.rule;
    let best = null;
    for (let t = 0; t < 600; t++) {
      const star = Array.from({ length: CELLS }, () => { const x = R(); return x < 0.06 ? 0 : x < 0.55 ? 1 + Math.floor(R() * 9) : x < 0.9 ? 10 + Math.floor(R() * 40) : 50 + Math.floor(R() * 50); });
      const tg = RULES.map(r => r.f(star)), mine = tg[ri];
      if (Math.abs(mine) > 99999 || !star.some(x => x % 2 === 0) || !star.some(x => x % 2 === 1)) continue;
      const clash = tg.filter((x, i) => i !== ri && x === mine).length;
      if (!best || clash < best.clash) best = { star, clash };
      if (!clash) break;
    }
    return best ? best.star : [3, 12, 7, 20, 9];
  }
  function newRound(st) {
    st.round++; st.set = 0; st.rule = st.ruleOrd[(st.round - 1) % NR]; st.star = makeStar(st); st.target = targetOf(st.rule, st.star);
    st.tests = Array.from({ length: st.n }, () => []); st.wrong = Array(st.n).fill(0); st.blk = Array(st.n).fill(0); st.says = []; st.res = null;
    st.log.push({ i: st.seq++, k: "round", r: st.round, star: st.star.slice() });
    startSet(st);
  }
  function startSet(st) {
    st.set++;
    if (st.set > SETCAP) { endRound(st, []); return; }
    const R = seeded(hash(`dice|${st.rs}|${st.round}|${st.set}`));
    st.butler = Array.from({ length: 5 - st.n }, () => 1 + Math.floor(R() * 6));
    st.picks = Array(st.n).fill(null); st.nums = null; st.tcnt = Array(st.n).fill(0); st.done = Array(st.n).fill(false); st.sub = Array(st.n).fill(null); st.step = 0; st.phase = "pick";
    st.log.push({ i: st.seq++, k: "set", set: st.set, butler: st.butler.slice() });
  }
  // 이번 단계에 낼 수 있는 자리: 아직 안 끝났고 시험이 남았거나 외칠 수 있는 사람
  const canSayAt = (st, s) => st.blk[s] === 0 && st.wrong[s] < MAXW;
  function stepNeeds(st) { return st.done.map((d, s) => (!d && (st.tcnt[s] < TESTS || canSayAt(st, s)) ? s : -1)).filter(s => s >= 0); }
  function nextStep(st) {
    for (let g = 0; g < 4; g++) {
      for (let s = 0; s < st.n; s++) if (!st.done[s] && st.tcnt[s] >= TESTS && st.wrong[s] >= MAXW) st.done[s] = true;
      if (stepNeeds(st).length) return;
      const wait = st.done.map((d, s) => (!d && st.blk[s] > 0 ? s : -1)).filter(s => s >= 0);
      if (!wait.length) break;
      for (const s of wait) st.blk[s]--;                 // 벌 받는 중이고 시험도 없으면 한 단계 건너뜀
    }
    st.log.push({ i: st.seq++, k: "setend", set: st.set });
    startSet(st);
  }
  function endRound(st, wins) {
    st.phase = "show"; st.sub = Array(st.n).fill(null);
    st.res = { r: st.round, win: wins.length ? wins[0] : -1, wins: wins.slice(), target: st.target, rule: st.rule, star: st.star.slice(), tests: st.tests.map(a => clone(a)), nums: st.nums ? clone(st.nums) : null, says: clone(st.says) };
    for (const w of wins) st.score[w]++;
    st.hist.push({ r: st.round, wins: wins.slice(), rule: st.rule, target: st.target });
    st.log.push({ i: st.seq++, k: "result", r: st.round, wins: wins.slice(), rule: st.rule, target: st.target, score: st.score.slice() });
  }
  const needs = st => (st.over ? [] : st.phase === "pick" ? st.picks.map((x, s) => (x == null ? s : -1)).filter(s => s >= 0) : st.phase === "test" ? stepNeeds(st).filter(s => !st.sub[s]) : []);
  const over = st => !!st.over;
  function checkAct(st, seat, a) {
    if (!a || typeof a !== "object") return "행동을 골라요";
    if (a.t === "test") { if (st.tcnt[seat] >= TESTS) return "이번 숫자로는 시험을 다 했어요"; if (!cellsOk(a.cells)) return "숫자 5개를 모두 칸에 넣어요"; return ""; }
    if (a.t === "pass") return "";
    if (a.t === "say") {
      if (!Number.isInteger(a.v) || Math.abs(a.v) > 9999999) return "결괏값은 정수로 적어요";
      if (st.blk[seat] > 0) return "방금 틀려서 이번 단계엔 정답을 외칠 수 없어요 (시험이나 넘기기만)";
      if (st.wrong[seat] >= MAXW) return "이 문제에서 오답이 2번이라 더 외칠 수 없어요";
      return "";
    }
    return "모르는 행동이에요";
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    if (st.phase === "pick") {
      if (!a || a.t !== "pick" || !Number.isInteger(a.v) || a.v < 1 || a.v > 6) return { ok: false, err: "주사위 눈 1~6 을 골라요" };
      st.picks[seat] = a.v;
      if (st.picks.every(x => x != null)) {
        st.nums = st.butler.map(v => ({ v, by: -1 })).concat(st.picks.map((v, s) => ({ v, by: s }))); st.phase = "test"; st.sub = Array(st.n).fill(null);
        st.log.push({ i: st.seq++, k: "nums", set: st.set, nums: clone(st.nums) });
        nextStep(st);
      }
      return { ok: true };
    }
    const e = checkAct(st, seat, a); if (e) return { ok: false, err: e };
    st.sub[seat] = a.t === "test" ? { t: "test", cells: a.cells.map(c => c.slice()) } : a.t === "say" ? { t: "say", v: a.v } : { t: "pass" };
    if (needs(st).length === 0) resolveStep(st);
    return { ok: true };
  }
  function resolveStep(st) {
    const sub = st.sub, blkAt = st.blk.slice(), wins = [], wrongNow = [];
    st.step++;
    for (let s = 0; s < st.n; s++) {
      const a = sub[s]; if (!a) continue;
      if (a.t === "test") {
        const cells = a.cells.map(c => c.slice()), vals = valsOf(st.nums, cells), res = RULES[st.rule].f(vals);
        st.tests[s].push({ set: st.set, cells, vals, res }); st.tcnt[s]++; st.log.push({ i: st.seq++, k: "test", s, set: st.set });
      } else if (a.t === "pass") { st.done[s] = true; st.log.push({ i: st.seq++, k: "pass", s, set: st.set }); }
    }
    for (let s = 0; s < st.n; s++) {
      const a = sub[s]; if (!a || a.t !== "say") continue;
      const ok = a.v === st.target; st.says.push({ s, v: a.v, ok, set: st.set }); st.log.push({ i: st.seq++, k: "say", s, v: a.v, ok, set: st.set });
      if (ok) wins.push(s); else { st.wrong[s]++; wrongNow.push(s); }
    }
    for (let s = 0; s < st.n; s++) if (blkAt[s] > 0 && st.blk[s] > 0) st.blk[s]--;
    for (const s of wrongNow) st.blk[s] = 1;
    st.sub = Array(st.n).fill(null);
    if (wins.length) { endRound(st, wins); return; }
    nextStep(st);
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 7000 : null);
  function leaders(st) { const m = Math.max(...st.score); return st.score.map((x, s) => (x === m ? s : -1)).filter(s => s >= 0); }
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    const L = leaders(st);
    if (Math.max(...st.score) >= WIN && L.length === 1) return finish(st, "win");
    if (st.round >= NORM && L.length === 1) return finish(st, "rounds");
    if (st.round >= CAPR) return finish(st, "cap");
    newRound(st);
  }
  function finish(st, why) { st.over = true; st.phase = "end"; st.end = why; st.log.push({ i: st.seq++, k: "end", why, score: st.score.slice() }); }
  const ranks = st => st.score.map(x => st.score.filter(y => y > x).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "pick") return [1, 2, 3, 4, 5, 6].map(v => ({ t: "pick", v }));
    return [{ t: "pass" }];
  }
  // ── 보이는 것 ──
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all", full = isAll || st.over;
    const show = st.phase === "show" || st.over;
    const allTests = show || isAll;
    const V = {
      n: st.n, round: st.round, set: st.set, setCap: SETCAP, tests: TESTS, maxw: MAXW, win: WIN, phase: st.phase, seat: me, score: st.score.slice(), star: st.star.slice(), butler: st.butler.slice(),
      picked: st.picks.map(x => x != null), myPick: me >= 0 ? st.picks[me] : null, nums: st.nums ? clone(st.nums) : null, sub: st.sub.map(x => !!x), mySub: me >= 0 && st.sub[me] ? clone(st.sub[me]) : null, step: st.step, tcnt: st.tcnt.slice(), tn: st.tests.map(a => a.length),
      wrong: st.wrong.slice(), blk: st.blk.slice(), done: st.done.slice(), says: clone(st.says), my: me >= 0 ? clone(st.tests[me]) : [], res: show && st.res ? clone(st.res) : null,
      needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), hist: clone(st.hist), log: clone(st.log),
    };
    if (!show && !isAll) V.res = null;
    if (allTests) V.all = st.tests.map(a => clone(a));
    if (isAll) { V.rule = st.rule; V.target = st.target; V.picksAll = st.picks.slice(); }
    if (full) { V.rule = st.rule; V.target = st.target; }
    V.pub = hash(JSON.stringify([V.round, V.set, V.phase, V.score, V.star, V.butler, V.picked, V.nums, V.sub, V.tn, V.says, V.blk, V.wrong, V.over])).toString(36);
    return V;
  }

  // ── AI (보이는 것만): 규칙 후보 지우기 ──
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.set, V.my, V.says, V.nums, V.tcnt, V.butler, V.picked]));
  // 후보 규칙: 내 시험 결과와 안 맞거나 틀린 외침 값이 되는 규칙은 지움 (forget = 지난 시험을 잊을 확률 — 보통 · 쉬움)
  function hyp(V, R, forget) {
    const out = [];
    for (let ri = 0; ri < NR; ri++) {
      let ok = true;
      for (const t of V.my) { if (forget && R() < forget) continue; if (RULES[ri].f(t.vals) !== t.res) { ok = false; break; } }
      if (!ok) continue;
      const tg = targetOf(ri, V.star);
      if (V.says.some(x => !x.ok && x.v === tg)) continue;
      out.push(ri);
    }
    return out;
  }
  function targets(V, H) { const m = {}; for (const ri of H) { const t = targetOf(ri, V.star); m[t] = (m[t] || 0) + 1; } return Object.keys(m).map(k => ({ v: +k, n: m[k] })).sort((a, b) => b.n - a.n || a.v - b.v); }
  function randCells(R, nums) {
    const idx = [0, 1, 2, 3, 4]; for (let i = 4; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const groups = [[idx[0]]]; for (let k = 1; k < 5; k++) { if (R() < 0.22) groups[groups.length - 1].push(idx[k]); else groups.push([idx[k]]); }
    const slots = [0, 1, 2, 3, 4]; for (let i = 4; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const cells = [[], [], [], [], []]; groups.forEach((g, k) => { cells[slots[k]] = g; }); return cells;
  }
  // 후보들을 시험 한 번으로 얼마나 가르나: 기대 남는 후보 수 (작을수록 좋음)
  function expRemain(H, nums, cells) {
    const vals = valsOf(nums, cells), m = {}; for (const ri of H) { const r = RULES[ri].f(vals); m[r] = (m[r] || 0) + 1; }
    let e = 0; for (const k in m) e += m[k] * m[k]; return e / Math.max(1, H.length);
  }
  function bestTest(V, H, R, samples) {
    let best = null;
    for (let k = 0; k < samples; k++) { const c = randCells(R, V.nums), e = expRemain(H, V.nums, c); if (!best || e < best.e - 1e-9) best = { cells: c, e }; }
    return best;
  }
  const canSay = V => V.blk[V.seat] === 0 && V.wrong[V.seat] < V.maxw;
  const PROF = {
    easy: { samples: 1, forget: 1, thr: 9 },
    normal: { samples: 10, forget: 0.3, thr: 0.6 },
    hard: { samples: 90, forget: 0, thr: 0.5 },
  };
  function pickValue(V, s, P, R) {
    if (P === PROF.easy) return 1 + Math.floor(R() * 6);
    if (P !== PROF.hard) { const have = V.butler.slice(); const opts = [1, 2, 3, 4, 5, 6].filter(v => !have.includes(v)); return (opts.length ? opts : [1, 2, 3, 4, 5, 6])[Math.floor(R() * (opts.length || 6))]; }
    // 고급: 내가 낸 눈이 시험을 가장 잘 가르도록 — 나머지 사람 눈은 무작위로 가정해 표본
    const H = hyp(V, R, 0); let bestV = 1, bestE = 1e9;
    for (let v = 1; v <= 6; v++) {
      let tot = 0; const T = 5;
      for (let t = 0; t < T; t++) {
        const nums = V.butler.map(x => ({ v: x, by: -1 })).concat([{ v, by: s }]); while (nums.length < 5) nums.push({ v: 1 + Math.floor(R() * 6), by: 9 });
        let e = 1e9; for (let k = 0; k < 8; k++) e = Math.min(e, expRemain(H, nums, randCells(R, nums))); tot += e;
      }
      if (tot / T < bestE - 1e-9) { bestE = tot / T; bestV = v; }
    }
    return bestV;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (V.phase === "pick") return { t: "pick", v: pickValue(V, s, P, R) };
    const say = canSay(V), left = V.tcnt[s] < V.tests;
    if (P === PROF.easy) {   // 쉬움: 시험은 아무렇게나, 지우기는 거의 안 함 — 규칙 하나를 찍어 외침
      if (left && (V.tcnt[s] < 1 || R() < 0.4)) return { t: "test", cells: randCells(R, V.nums) };
      if (say && R() < 0.5) { const ri = Math.floor(R() * NR), tv = targetOf(ri, V.star); if (Math.abs(tv) <= 9999999) return { t: "say", v: tv }; }
      return left ? { t: "test", cells: randCells(R, V.nums) } : { t: "pass" };
    }
    const H = hyp(V, R, P.forget), T = targets(V, H);
    if (say && T.length === 1) return { t: "say", v: T[0].v };
    if (left && H.length > 1) { const b = bestTest(V, H, R, P.samples); if (b && b.e < H.length - 1e-9) return { t: "test", cells: b.cells }; }
    if (say && T.length && T[0].n / Math.max(1, H.length) >= P.thr) return { t: "say", v: T[0].v };
    if (left) return { t: "test", cells: randCells(R, V.nums) };
    return { t: "pass" };
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  // 선생님 · 복기용: 고급 AI 의 수와 근거 숫자
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = seeded(keyV(V, s)), a = ai(V, s, "hard"), H = hyp(V, seeded(1), 0), T = targets(V, H);
    const o = { a, H, T };
    if (a && a.t === "test") o.e = expRemain(H, V.nums, a.cells);
    return o;
  }
  // 수 하나의 값: 시험 = 후보를 지우는 비율 · 외침 = 맞을 확률 · 넘기기 = 0
  function worth(V, s, a) {
    const H = hyp(V, seeded(1), 0), T = targets(V, H);
    if (!a || !H.length) return { u: 0, H: H.length };
    if (a.t === "say") { const f = T.find(x => x.v === a.v); return { u: f ? f.n / H.length : 0, p: f ? f.n / H.length : 0, H: H.length }; }
    if (a.t === "test" && V.nums && cellsOk(a.cells)) { const e = expRemain(H, V.nums, a.cells); return { u: (H.length - e) / H.length, e, H: H.length }; }
    return { u: 0, H: H.length };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA || V.phase !== "test") return null;
    return { my: worth(V, s, myA), best: worth(V, s, bestA) };
  }

  return { id: "hiddencode", RULES, NR, TESTS, MAXW, SETCAP, WIN, NORM, CAPR, CELLS, LET, PROF, targetOf, valsOf, cellVals, cellsOk, hyp, targets, randCells, expRemain, canSay,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, worth };
});
