/* 냥도쿠 — 규칙 · 판 상태 · 단계별 힌트 (화면과 상관없는 부분)
   규칙: 색 묶음·가로줄·세로줄마다 고양이 1마리, 고양이끼리 대각선 포함 닿으면 안 됨. 정답 칸이 아닌 곳에 놓으면 실수 (3번이면 실패)
   힌트는 사람이 푸는 순서대로: 틀린 X 알려 주기 → 고양이 주변 정리 → 하나 남음 → 한 줄에 갇힘 → 여러 묶음이 여러 줄에 갇힘 → 가정해 보기
   (ai-practice/rl-15-meowdoku/trace_solver.py 와 같은 생각 순서) */
const NY = (() => {
  const L = "ABCDEFGHIJKLMNOP", DIG = "0123456789AB";
  const COLORS = [   // 색 묶음 색 (이름은 힌트 문장에 씀)
    ["#f4a6a6", "분홍"], ["#9fd8a8", "초록"], ["#a7c7f2", "하늘"], ["#f6d58b", "노랑"], ["#c7b0ee", "보라"], ["#f6b98a", "주황"],
    ["#8fd6d0", "청록"], ["#d9c2a5", "모래"], ["#b9c4cf", "회색"], ["#e8a7d4", "자주"], ["#c8df8a", "연두"], ["#9fb3e8", "파랑"],
  ];

  function decode(p) {
    const n = p.n, reg = [];
    for (let r = 0; r < n; r++) reg.push([...p.r.slice(r * n, r * n + n)].map(ch => L.indexOf(ch)));
    return { n, reg, ans: [...p.a].map(ch => DIG.indexOf(ch)), tech: p.t || 0 };
  }

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
  const gname = (gp) => gp.type === "reg" ? `${colorName(gp.id)} 묶음` : gp.type === "row" ? `${ord(gp.id)} 가로줄` : `${ord(gp.id)} 세로줄`;
  const catsRowOf = g => { const a = Array(g.n).fill(-1); for (const k of g.cats) { const [r, c] = g.rc(k); a[r] = c; } return a; };

  // 가정해 보기: 이 칸에 놓고 '하나 남음'만 계속 따라가면 어떤 묶음·줄이 비는가
  function contradicts(g, cand0, catsRow0, k) {
    const n = g.n, cand = Uint8Array.from(cand0), cr = catsRow0.slice();
    const put = q => { const [r, c] = g.rc(q); cr[r] = c; cand[q] = 0; for (let i = 0; i < n * n; i++) { const [a, b] = g.rc(i); if (a === r || b === c || g.reg[a][b] === g.reg[r][c] || (Math.abs(a - r) <= 1 && Math.abs(b - c) <= 1)) cand[i] = 0; } };
    put(k);
    for (let guard = 0; guard < n * 2; guard++) {
      if (cr.every(v => v >= 0)) return false;
      const gs = groups(g, cand, cr);
      if (gs.some(x => x.cells.length === 0)) return true;
      const one = gs.find(x => x.cells.length === 1);
      if (!one) return false;
      put(one.cells[0]);
    }
    return false;
  }

  /* 다음 힌트 하나: { kind, look:[칸들](1단계: 어디를 볼지), why:"문장"(2단계), target:[칸들], act:"x"|"cat"|"unx" }
     못 찾으면 null */
  function nextHint(g) {
    const n = g.n;
    for (const k of g.xs) if (g.isAns(k)) return { kind: "wrongX", look: [k], target: [k], act: "unx", why: `${cellName(g, k)}의 X는 잘못됐어요. 이 칸은 고양이 자리일 수 있어요 — X를 지울게요.` };
    const cand = knowledge(g), cr = catsRowOf(g);
    // 고양이 주변 정리 (자동 X를 안 쓸 때)
    for (const k of g.cats) {
      const miss = g.blockedBy(k).filter(b => !g.cats.has(b) && !g.bad.has(b) && !g.xs.has(b));
      if (miss.length) return { kind: "clean", look: [k], target: miss, act: "x", why: `${cellName(g, k)}의 고양이와 같은 가로줄·세로줄·색 묶음, 그리고 바로 옆(대각선 포함) 칸에는 고양이를 놓을 수 없어요. 그 칸들을 X로 표시해요.` };
    }
    const gs = groups(g, cand, cr);
    // 하나 남음
    for (const gp of gs) if (gp.cells.length === 1) return { kind: "single", look: gp.all, target: gp.cells, act: "cat", why: `${gname(gp)}에 고양이를 놓을 수 있는 칸이 하나만 남았어요 → ${cellName(g, gp.cells[0])}.` };
    // 한 줄에 갇힘
    for (const gp of gs) {
      if (gp.type !== "reg" || !gp.cells.length) continue;
      for (const [ax, label] of [[0, "가로줄"], [1, "세로줄"]]) {
        const lines = new Set(gp.cells.map(k => g.rc(k)[ax]));
        if (lines.size !== 1) continue;
        const line = [...lines][0];
        const kill = [...Array(n * n).keys()].filter(k => cand[k] && g.rc(k)[ax] === line && g.regionOf(k) !== gp.id);
        if (kill.length) return { kind: "confine", look: gp.all, target: kill, act: "x", why: `${gname(gp)}의 남은 칸이 모두 ${ord(line)} ${label}에 있어요. 그 줄의 고양이는 이 묶음 차지 → 같은 줄의 다른 색 칸은 X.` };
      }
    }
    for (const gp of gs) {
      if (gp.type === "reg" || !gp.cells.length) continue;
      const regs = new Set(gp.cells.map(k => g.regionOf(k)));
      if (regs.size !== 1) continue;
      const q = [...regs][0];
      const kill = [...Array(n * n).keys()].filter(k => cand[k] && g.regionOf(k) === q && !gp.cells.includes(k));
      if (kill.length) return { kind: "confine2", look: gp.all, target: kill, act: "x", why: `${gname(gp)}의 남은 칸이 모두 ${colorName(q)} 묶음이에요. ${colorName(q)} 묶음의 고양이는 이 줄에 있어야 하니 → 그 묶음의 다른 칸은 X.` };
    }
    // 여러 묶음이 여러 줄에 갇힘 (2~3개)
    const regs = gs.filter(x => x.type === "reg" && x.cells.length);
    const combos = (arr, k, s = 0, cur = [], out = []) => { if (cur.length === k) { out.push(cur.slice()); return out; } for (let i = s; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); } return out; };
    for (const kk of [2, 3]) {
      for (const cb of combos(regs, kk)) {
        for (const [ax, label] of [[0, "가로줄"], [1, "세로줄"]]) {
          const lines = new Set(cb.flatMap(x => x.cells.map(k => g.rc(k)[ax])));
          if (lines.size !== kk) continue;
          const ids = new Set(cb.map(x => x.id));
          const kill = [...Array(n * n).keys()].filter(k => cand[k] && lines.has(g.rc(k)[ax]) && !ids.has(g.regionOf(k)));
          if (kill.length) {
            const ln = [...lines].sort((a, b) => a - b).map(v => v + 1).join("·");
            return { kind: "kgroup", look: cb.flatMap(x => x.all), target: kill, act: "x", why: `${cb.map(x => colorName(x.id)).join("·")} 묶음 ${kk}개가 ${ln}번째 ${label} ${kk}줄 안에만 들어갈 수 있어요. 그 ${kk}줄의 고양이는 이 묶음들 차지 → 그 줄들의 다른 칸은 X.` };
          }
        }
      }
    }
    // 가정해 보기 (칸이 적은 묶음·줄부터)
    for (const gp of gs.slice().sort((a, b) => a.cells.length - b.cells.length)) {
      for (const k of gp.cells) if (contradicts(g, cand, cr, k)) return { kind: "suppose", look: gp.all, target: [k], act: "x", why: `${cellName(g, k)}에 고양이가 있다고 해 보면, 그다음 '하나만 남은' 자리들을 따라가다 어떤 묶음이나 줄에 놓을 칸이 없어져요. 그래서 이 칸은 X.` };
    }
    return null;
  }

  return { COLORS, decode, Game, nextHint, colorName };
})();
if (typeof module !== "undefined") module.exports = NY;
