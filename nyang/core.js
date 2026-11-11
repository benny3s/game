/* 냥도쿠 — 규칙 · 판 상태 · 단계별 힌트 (화면과 상관없는 부분)
   규칙: 색 묶음·가로줄·세로줄마다 고양이 1마리, 고양이끼리 대각선 포함 닿으면 안 됨. 정답 칸이 아닌 곳에 놓으면 실수 (3번이면 실패)
   힌트는 사람이 푸는 순서대로: 틀린 X 알려 주기 → 고양이 주변 정리 → 하나 남음 → 한 줄에 갇힘 → 여러 묶음이 여러 줄에 갇힘 → 가정해 보기
   (ai-practice/rl-15-meowdoku/trace_solver.py 와 같은 생각 순서) */
const NY = (() => {
  const L = "ABCDEFGHIJKLMNOP", DIG = "0123456789AB";
  const COLORS = [   // 색 묶음 색 (이름은 힌트 문장에 씀). 11-06 예전 파스텔로 되돌림 — 밝은 판에서 오래 봐도 편한 색
    ["#f4a6a6", "분홍"], ["#9fd8a8", "초록"], ["#a7c7f2", "하늘"], ["#f6d58b", "노랑"], ["#c7b0ee", "보라"], ["#f6b98a", "주황"],
    ["#8fd6d0", "청록"], ["#d9c2a5", "모래"], ["#b9c4cf", "회색"], ["#e8a7d4", "자주"], ["#c8df8a", "연두"], ["#9fb3e8", "파랑"],
  ];

  function decode(p) {
    const n = p.n, reg = [];
    for (let r = 0; r < n; r++) reg.push([...p.r.slice(r * n, r * n + n)].map(ch => L.indexOf(ch)));
    return { n, reg, ans: [...p.a].map(ch => DIG.indexOf(ch)), tech: p.t || 0 };
  }

  // 같은 문제도 달라 보이게: seed 로 돌리기·뒤집기(8가지) + 색 묶음 순서 섞기. 같은 seed 면 누구나 같은 판 (대결용)
  function variant(p, seed) {
    if (!seed) return p;
    const n = p.n, d = decode(p);
    let s = seed >>> 0 || 1; const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const t = Math.floor(rnd() * 8);
    const map = (r, c) => { let a = r, b = c; if (t & 4) [a, b] = [b, a]; if (t & 1) a = n - 1 - a; if (t & 2) b = n - 1 - b; return [a, b]; };
    const perm = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const reg = Array.from({ length: n }, () => Array(n)), ans = Array(n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [a, b] = map(r, c); reg[a][b] = perm[d.reg[r][c]]; }
    for (let r = 0; r < n; r++) { const [a, b] = map(r, d.ans[r]); ans[a] = b; }
    return { n, r: reg.flat().map(g => L[g]).join(""), a: ans.map(c => DIG[c]).join(""), t: p.t };
  }
  const rseed = () => 1 + Math.floor(Math.random() * 2147483646);

  // ── 판 상태 (한 사람의 한 판)
  class Game {
    constructor(p, opt = {}) {
      Object.assign(this, decode(p));
      this.cats = new Set(); this.xs = new Set(); this.bad = new Set();
      this.mistakes = 0; this.maxMistakes = opt.maxMistakes ?? 3; this.autoX = !!opt.autoX;
      this.hints = 0; this.over = false; this.won = false;
      this.t0 = performance.now(); this.t1 = null;
    }
    k(r, c) { return r * this.n + c; }
    rc(k) { return [Math.floor(k / this.n), k % this.n]; }
    isAns(k) { const [r, c] = this.rc(k); return this.ans[r] === c; }
    regionOf(k) { const [r, c] = this.rc(k); return this.reg[r][c]; }
    // 고양이가 막는 칸 (같은 줄·묶음·이웃)
    blockedBy(k) {
      const n = this.n, [r, c] = this.rc(k), g = this.reg[r][c], out = [];
      for (let i = 0; i < n * n; i++) {
        if (i === k) continue;
        const [a, b] = this.rc(i);
        if (a === r || b === c || this.reg[a][b] === g || (Math.abs(a - r) <= 1 && Math.abs(b - c) <= 1)) out.push(i);
      }
      return out;
    }
    toggleX(k) {
      if (this.over || this.cats.has(k) || this.bad.has(k)) return false;
      if (this.xs.has(k)) this.xs.delete(k); else this.xs.add(k);
      return true;
    }
    setX(k, on) { if (this.over || this.cats.has(k) || this.bad.has(k)) return; if (on) this.xs.add(k); else this.xs.delete(k); }
    // 고양이 놓기: "ok" | "miss" | "fail" | "win" | null(놓을 수 없음)
    place(k) {
      if (this.over || this.cats.has(k) || this.bad.has(k)) return null;
      if (this.isAns(k)) {
        this.cats.add(k); this.xs.delete(k);
        if (this.autoX) for (const b of this.blockedBy(k)) if (!this.cats.has(b) && !this.bad.has(b)) this.xs.add(b);
        if (this.cats.size === this.n) { this.over = true; this.won = true; this.t1 = performance.now(); return "win"; }
        return "ok";
      }
      this.mistakes++; this.bad.add(k); this.xs.delete(k);
      if (this.mistakes >= this.maxMistakes) { this.over = true; this.t1 = performance.now(); return "fail"; }
      return "miss";
    }
    get secs() { return ((this.t1 ?? performance.now()) - this.t0) / 1000; }
  }

  // ── 힌트 엔진 ─────────────────────────────────────────────
  const colorName = g => COLORS[g % COLORS.length][1];
  const cellName = (g, k) => { const [r, c] = g.rc(k); return `${r + 1}번째 줄 ${c + 1}번째 칸`; };
  const ord = i => `${i + 1}번째`;

  // 지금 아는 것: 고양이로 막힌 칸·실수 칸·(정답이 아닌) X 칸을 뺀 '놓을 수 있는 칸'
  function knowledge(g) {
    const n = g.n, cand = new Uint8Array(n * n).fill(1);
    for (const k of g.cats) { cand[k] = 0; for (const b of g.blockedBy(k)) cand[b] = 0; }
    for (const k of g.bad) cand[k] = 0;
    for (const k of g.xs) if (!g.isAns(k)) cand[k] = 0;
    return cand;
  }
  function groups(g, cand, catsRow) {
    const n = g.n, out = [];
    const doneReg = new Set(), doneCol = new Set();
    for (let r = 0; r < n; r++) if (catsRow[r] >= 0) { doneReg.add(g.reg[r][catsRow[r]]); doneCol.add(catsRow[r]); }
    for (let q = 0; q < n; q++) {
      if (!doneReg.has(q)) out.push({ type: "reg", id: q, cells: [...Array(n * n).keys()].filter(k => cand[k] && g.regionOf(k) === q), all: [...Array(n * n).keys()].filter(k => g.regionOf(k) === q) });
    }
    for (let r = 0; r < n; r++) if (catsRow[r] < 0) out.push({ type: "row", id: r, cells: [...Array(n).keys()].map(c => r * n + c).filter(k => cand[k]), all: [...Array(n).keys()].map(c => r * n + c) });
    for (let c = 0; c < n; c++) if (!doneCol.has(c)) out.push({ type: "col", id: c, cells: [...Array(n).keys()].map(r => r * n + c).filter(k => cand[k]), all: [...Array(n).keys()].map(r => r * n + c) });
    return out;
  }
  const lineName = (ax, i) => ax === 0 ? `위에서 ${ord(i)} 가로줄` : `왼쪽에서 ${ord(i)} 세로줄`;
  const gname = (gp) => gp.type === "reg" ? `${colorName(gp.id)} 묶음` : lineName(gp.type === "row" ? 0 : 1, gp.id);
  const catsRowOf = g => { const a = Array(g.n).fill(-1); for (const k of g.cats) { const [r, c] = g.rc(k); a[r] = c; } return a; };
  const NUM = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

  // 가정해 보기: 이 칸에 놓고 '빈칸이 하나만 남은 곳'만 계속 따라가면 어떤 묶음·줄이 비는가
  //   → null(안 막힘) | { steps: [{ k, gp }](따라 놓게 되는 칸과 그 까닭), dead: 놓을 칸이 없어지는 묶음·줄 }
  function supposeTrace(g, cand0, catsRow0, k) {
    const n = g.n, cand = Uint8Array.from(cand0), cr = catsRow0.slice(), steps = [];
    const put = q => { const [r, c] = g.rc(q); cr[r] = c; cand[q] = 0; for (let i = 0; i < n * n; i++) { const [a, b] = g.rc(i); if (a === r || b === c || g.reg[a][b] === g.reg[r][c] || (Math.abs(a - r) <= 1 && Math.abs(b - c) <= 1)) cand[i] = 0; } };
    put(k);
    for (let guard = 0; guard < n * 2; guard++) {
      if (cr.every(v => v >= 0)) return null;
      const gs = groups(g, cand, cr);
      const dead = gs.find(x => x.cells.length === 0);
      if (dead) return { steps, dead };
      const one = gs.find(x => x.cells.length === 1);
      if (!one) return null;
      steps.push({ k: one.cells[0], gp: one }); put(one.cells[0]);
    }
    return null;
  }

  /* 다음 힌트 하나. 못 찾으면 null
       { kind, act:"x"|"cat"|"unx", target:[바꿀 칸](주황 테두리),
         look:[칸](1단계: 어디를 볼지 반짝), ask:"스스로 찾아보게 하는 물음"(1단계),
         look2:[칸](2단계: 까닭이 되는 칸 반짝), why:"까닭"(2단계), ghost:[칸](2단계: ①②③ 번호), say:"짧은 말"(AI 구경) }
     11-12 베니 님 '힌트가 정답을 아는 AI 가 설명하는 느낌, 눈높이에 안 맞음' → 까닭은 판에 보이는 것(✕ 없는 빈칸 · 반짝이는 칸 · 주황 테두리 · 번호)만으로 말하고,
       '따라가다 보면 막힌다'는 어디에 놓게 되고 어디가 막히는지 번호로 보여 줌. 쉬운 생각부터: 하나 남음 → 한 줄에 모임 → 놓으면 바로 막힘 → 여러 묶음 → 가정해 보기(가장 짧은 것) */
  function nextHint(g) {
    const n = g.n, all = [...Array(n * n).keys()];
    for (const k of g.xs) if (g.isAns(k)) return { kind: "wrongX", look: [k], target: [k], act: "unx",
      ask: "반짝이는 ✕를 다시 보세요. 이 칸은 아직 막으면 안 돼요.",
      why: "이 칸은 고양이가 올 수 있는 자리예요. 여기를 막아 두면 나중에 놓을 곳이 모자라요. ✕를 지울게요.",
      say: `${cellName(g, k)}의 ✕는 잘못됐어요. 지울게요.` };
    const cand = knowledge(g), cr = catsRowOf(g);
    // 고양이 주변 정리 (자동 ✕를 안 쓸 때)
    for (const k of g.cats) {
      const miss = g.blockedBy(k).filter(b => !g.cats.has(b) && !g.bad.has(b) && !g.xs.has(b));
      if (miss.length) return { kind: "clean", look: [k], target: miss, act: "x",
        ask: "반짝이는 고양이 둘레를 보세요. ✕를 칠 칸이 남았어요.",
        why: "고양이가 놓이면 같은 가로줄·세로줄·같은 색 묶음, 그리고 바로 옆 칸(대각선 포함)에는 다른 고양이가 못 와요. 그런 칸(주황 테두리)에 ✕를 쳐요.",
        say: `${cellName(g, k)} 고양이와 같은 줄·묶음·바로 옆 칸은 ✕.` };
    }
    const gs = groups(g, cand, cr);
    // 하나 남음
    for (const gp of gs) if (gp.cells.length === 1) return { kind: "single", look: gp.all, target: gp.cells, act: "cat",
      ask: `반짝이는 ${gname(gp)}을 보세요. ✕가 없는 빈칸이 몇 개 남았나요?`,
      why: `${gname(gp)}에는 고양이가 꼭 한 마리 있어야 해요. 그런데 빈칸이 하나뿐이에요. 그 칸(주황 테두리)이 고양이 자리예요.`,
      say: `${gname(gp)}에 빈칸이 하나만 남았어요 → ${cellName(g, gp.cells[0])}에 고양이.` };
    // 한 묶음의 빈칸이 한 줄에 모임
    for (const gp of gs) {
      if (gp.type !== "reg" || !gp.cells.length) continue;
      for (const ax of [0, 1]) {
        const lines = new Set(gp.cells.map(k => g.rc(k)[ax]));
        if (lines.size !== 1) continue;
        const line = [...lines][0], ln = lineName(ax, line), cn = colorName(gp.id);
        const kill = all.filter(k => cand[k] && g.rc(k)[ax] === line && g.regionOf(k) !== gp.id);
        if (kill.length) return { kind: "confine", look: gp.all, look2: gp.cells, target: kill, act: "x",
          ask: `반짝이는 ${cn} 묶음을 보세요. 빈칸이 어느 줄에 모여 있나요?`,
          why: `${cn} 묶음의 빈칸(반짝이는 칸)이 모두 ${ln}에 있어요. 어디에 놓든 이 줄의 고양이는 ${cn} 묶음 차지예요. 한 줄에 한 마리뿐이니, 이 줄의 다른 색 빈칸(주황 테두리)은 ✕.`,
          say: `${cn} 묶음의 빈칸이 모두 ${ln}에 있어요 → 그 줄의 다른 색 칸은 ✕.` };
      }
    }
    // 한 줄의 빈칸이 한 묶음에 모임
    for (const gp of gs) {
      if (gp.type === "reg" || !gp.cells.length) continue;
      const regs = new Set(gp.cells.map(k => g.regionOf(k)));
      if (regs.size !== 1) continue;
      const q = [...regs][0], cn = colorName(q);
      const kill = all.filter(k => cand[k] && g.regionOf(k) === q && !gp.cells.includes(k));
      if (kill.length) return { kind: "confine2", look: gp.all, look2: gp.cells, target: kill, act: "x",
        ask: `반짝이는 ${gname(gp)}을 보세요. 빈칸이 무슨 색 묶음에 있나요?`,
        why: `${gname(gp)}의 빈칸(반짝이는 칸)이 전부 ${cn} 묶음 칸이에요. 이 줄의 고양이는 ${cn} 묶음 안에 놓이게 돼요. 묶음에도 한 마리뿐이니, ${cn} 묶음의 다른 빈칸(주황 테두리)은 ✕.`,
        say: `${gname(gp)}의 빈칸이 모두 ${cn} 묶음이에요 → 그 묶음의 다른 칸은 ✕.` };
    }
    // 가정해 보기 후보: 모든 빈칸을 놓아 보고 가장 짧게 막히는 것 (0 = 놓자마자 어떤 묶음·줄이 통째로 막힘)
    let sup = null;
    for (const k of all) {
      if (!cand[k]) continue;
      const t = supposeTrace(g, cand, cr, k);
      if (t && (!sup || t.steps.length < sup.steps.length)) { sup = { k, steps: t.steps, dead: t.dead }; if (!t.steps.length) break; }
    }
    if (sup && !sup.steps.length) {
      const dn = gname(sup.dead), dc = sup.dead.all.filter(k => cand[k]);
      return { kind: "block", look: sup.dead.all, look2: dc, target: [sup.k], act: "x",
        ask: `반짝이는 ${dn}을 보세요. 빈칸이 얼마 없어요. 근처 어느 칸에 고양이를 놓으면 여기가 전부 막힐까요?`,
        why: `주황 테두리 칸에 고양이를 놓으면, 그 고양이와 같은 줄·같은 색 묶음이거나 바로 옆이라서 ${dn}의 빈칸(반짝이는 칸)이 전부 막혀요. ${dn}에도 고양이가 꼭 있어야 하니 이 칸은 ✕.`,
        say: `${cellName(g, sup.k)}에 놓으면 ${dn}의 빈칸이 전부 막혀요 → 이 칸은 ✕.` };
    }
    // 여러 묶음이 여러 줄에 갇힘 (2~3개)
    const regs = gs.filter(x => x.type === "reg" && x.cells.length);
    const combos = (arr, k, s = 0, cur = [], out = []) => { if (cur.length === k) { out.push(cur.slice()); return out; } for (let i = s; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); } return out; };
    for (const kk of [2, 3]) {
      for (const cb of combos(regs, kk)) {
        for (const ax of [0, 1]) {
          const lines = new Set(cb.flatMap(x => x.cells.map(k => g.rc(k)[ax])));
          if (lines.size !== kk) continue;
          const ids = new Set(cb.map(x => x.id));
          const kill = all.filter(k => cand[k] && lines.has(g.rc(k)[ax]) && !ids.has(g.regionOf(k)));
          if (kill.length) {
            const ln = `${ax === 0 ? "위에서" : "왼쪽에서"} ${[...lines].sort((a, b) => a - b).map(v => v + 1).join("·")}번째 ${ax === 0 ? "가로줄" : "세로줄"}`, cn = cb.map(x => colorName(x.id)).join("·");
            return { kind: "kgroup", look: cb.flatMap(x => x.all), look2: cb.flatMap(x => x.cells), target: kill, act: "x",
              ask: `반짝이는 색 묶음 ${kk}개를 보세요. 빈칸이 몇 줄에 걸쳐 있나요?`,
              why: `${cn} 묶음의 빈칸(반짝이는 칸)은 전부 ${ln} 안에 있어요. 이 ${kk}줄에 들어갈 고양이는 ${kk}마리인데, 이 묶음 ${kk}개가 한 마리씩 다 차지해요. 그래서 이 ${kk}줄의 다른 색 빈칸(주황 테두리)은 ✕.`,
              say: `${cn} 묶음 ${kk}개가 ${ln} ${kk}줄 안에만 들어가요 → 그 줄들의 다른 색 칸은 ✕.` };
          }
        }
      }
    }
    // 가정해 보기: 놓으면 '빈칸이 하나만 남는 곳'이 차례로 생기다가 어딘가 막힘 — 놓게 되는 칸을 ①②③ 으로 보여 줌
    if (sup) {
      const st = sup.steps, dn = gname(sup.dead);
      const mid = st.length <= 3
        ? st.map((s, i) => i ? `그다음 ${gname(s.gp)}에는 ${NUM[i + 1]} 칸만 남아요.` : `그러면 ${gname(s.gp)}에는 ② 칸만 남아서 거기에 놓아야 해요.`).join(" ")
        : `그러면 빈칸이 하나만 남는 곳이 차례로 생겨서 ${st.map((s, i) => NUM[i + 1] || "…").join(" → ")} 순서로 놓게 돼요.`;
      return { kind: "suppose", look: [sup.k], look2: sup.dead.all, target: [sup.k], act: "x", ghost: [sup.k, ...st.map(s => s.k)],
        ask: "반짝이는 칸에 고양이를 놓는다고 상상해 보세요. 그다음 어디에 놓게 되고, 어디가 막힐까요?",
        why: `① 칸에 고양이를 놓는다고 해 볼게요. ${mid} 그러고 나면 ${dn}(반짝이는 곳)에 놓을 칸이 하나도 없어요. 그래서 ① 칸에는 못 놓아요 → ✕.`,
        say: `${cellName(g, sup.k)}에 놓아 보면 ${st.length}번 따라 놓은 뒤 ${dn}에 놓을 칸이 없어져요 → 이 칸은 ✕.` };
    }
    return null;
  }

  return { COLORS, decode, variant, rseed, Game, nextHint, colorName };
})();
if (typeof module !== "undefined") module.exports = NY;
