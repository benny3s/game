/* 땅따먹기 — 그리기 (canvas 2D). 규칙 상태(st)는 읽기만 함
   층: 책상 → 모눈종이 → 땅 캐시(바뀐 곳만 다시 그림) → 칠해지는 칸(물결) → 선 → 낙서 자국 → 종이 테두리 → 머리 → 파편·글자
   틱마다 beforeTick() → Land.step → afterTick(evs) 를 불러 주면 움직임·효과를 만듦. frame(alpha, dt) 는 매 화면
   · 땅 칸 꼭짓점을 잡음으로 살짝 흔들어 손으로 칠한 모양 (같은 꼭짓점 = 같은 흔들림 → 다시 그려도 이음매 없음)
   · rough.js(MIT) 가 있으면 종이 테두리·낙서 자국·다시 태어나는 동그라미를 손그림으로 */
(function () {
  'use strict';
  const A = window.LandArt, PAL = A.PAL;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const backOut = t => { const c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  const cubicOut = t => 1 - (1 - t) * (1 - t) * (1 - t);
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const U = 20;                                           // rough.js 그림 단위: 1칸 = 20
  const HEAD_R = 0.82;
  const lum = h => { const v = h.replace('#', ''); return (0.2126 * parseInt(v.slice(0, 2), 16) + 0.7152 * parseInt(v.slice(2, 4), 16) + 0.0722 * parseInt(v.slice(4, 6), 16)) / 255; };

  function create(canvas, mini) {
    const ctx = canvas.getContext('2d');
    const mctx = mini ? mini.getContext('2d') : null;
    const RG = window.rough ? window.rough : null;
    const rc = RG ? RG.canvas(canvas) : null, gen = RG ? RG.generator() : null;

    let st = null, W = 0, H = 0, N = 0, NP = 0;
    let me = -1, follow = -1, animals = [], names = [];
    let rt = 0;                                            // 그리기 시계 (멈춤 중엔 안 감)
    // 땅 캐시
    let cache = null, cc = null, cs = 0;
    let disp = null, claim = null, JX = null, JY = null, CX = null, CY = null;
    let patC = [], patW = [], trailW = [], paperC = null, border = null, deskPat = null;
    // 책상 무늬: 옅은 빗금 (종이 밖 = 나가면 아웃인 곳)
    function deskTile() {
      const c = document.createElement('canvas'), T = 24; c.width = c.height = T;
      const g = c.getContext('2d');
      g.fillStyle = '#f4e3cf'; g.fillRect(0, 0, T, T);
      g.strokeStyle = 'rgba(205,165,130,0.32)'; g.lineWidth = 3.5;
      g.beginPath(); for (let k = 0; k <= 2; k++) { g.moveTo(k * T, 0); g.lineTo(k * T - T, T); } g.stroke();
      return c;
    }
    let quality = 1;                                       // 느린 기기면 화면 해상도를 낮춤 (1 → 0.75 → 0.6)
    let groups = [], gid = 0, dirty = [];
    // 사람마다 그리기 정보
    let P = [];
    let ghosts = [], decals = [], parts = [], texts = [], rings = [];
    let danger = false, overview = false, fast = false, hint = false;   // fast: 빨리 감기 중엔 칸 움직임·파편 없이 바로 · hint: 카운트다운 중 '나' 표시 통통
    let lightTrail = [];                                         // 밝은 색(노랑·연두) 선은 크림 종이 위에서 흐려서 테두리를 더함
    // rough.js 그림(낙서 자국 · 동그라미)은 동물마다 한 장씩만 만들어 판이 바뀌어도 다시 씀 (아웃마다 새로 그리면 느린 폰에서 끊김)
    const sprCache = new Map(); let warm = [];
    const cam = { x: 0, y: 0, k: 1, kT: 1, shake: 0, lx: 0, ly: 0, ready: false };
    let vw = 1, vh = 1, dpr = 1, baseZ = 20, z = 20;
    let mm = null, mmCtx = null, mmImg = null, mmDirty = true, mmCss = 0;
    const stats = { frames: 0, slow: 0, maxMs: 0, redraws: 0, redrawMax: 0, hist: [0, 0, 0, 0, 0, 0] };   // 점검용 (화면엔 안 보임)

    // ── 꼭짓점 흔들림 (칸 단위) · 칸 가운데
    function jitter() {
      const nz = A.noise(), n2 = nz.n2, VW = W + 1;
      JX = new Float32Array(VW * (H + 1)); JY = new Float32Array(VW * (H + 1));
      for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
        const v = y * VW + x;
        let jx = 0.13 * n2(x * 0.29, y * 0.29) + 0.045 * n2(x * 1.31 + 40, y * 1.31);
        let jy = 0.13 * n2(x * 0.29 + 91, y * 0.29 + 17) + 0.045 * n2(x * 1.31 + 140, y * 1.31 + 30);
        if (x === 0 || x === W) jx = 0;
        if (y === 0 || y === H) jy = 0;
        JX[v] = jx; JY[v] = jy;
      }
      CX = new Float32Array(N); CY = new Float32Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = y * VW + x, c = y * W + x;
        CX[c] = x + 0.5 + (JX[v] + JX[v + 1] + JX[v + VW] + JX[v + VW + 1]) / 4;
        CY[c] = y + 0.5 + (JY[v] + JY[v + 1] + JY[v + VW] + JY[v + VW + 1]) / 4;
      }
    }
    const vX = (x, y) => x + JX[y * (W + 1) + x], vY = (x, y) => y + JY[y * (W + 1) + x];

    // ── 땅 캐시 만들기 · 다시 그리기
    function makeCache() {
      // 칸당 화소: 화면 확대에 맞추되 휴대폰 메모리를 생각해 28 · 캔버스 2048 까지 (조금 키워 그려도 크레파스라 티 안 남)
      //  캔버스는 판이 바뀌어도 다시 씀 (아이폰은 큰 캔버스 메모리를 늦게 돌려줌) · 색 무늬만 판마다 새로
      const want = clamp(Math.round(baseZ), 12, 28), c2 = Math.min(want, Math.floor(2048 / Math.max(W, H)));
      const same = cache && c2 === cs && cache.width === W * c2 && cache.height === H * c2;
      if (!same) {
        cs = c2;
        if (!cache) cache = document.createElement('canvas');
        cache.width = W * cs; cache.height = H * cs;
        cc = cache.getContext('2d', { alpha: false });
        paperC = cc.createPattern(A.paper(), 'repeat');
      }
      patC = []; patW = []; trailW = [];
      const inv = new DOMMatrix([1 / cs, 0, 0, 1 / cs, 0, 0]);
      for (let i = 0; i < NP; i++) {
        const pal = PAL[animals[i]];
        patC[i] = cc.createPattern(A.crayon(pal.land), 'repeat');
        const pw = ctx.createPattern(A.crayon(pal.land), 'repeat'), tw = ctx.createPattern(A.crayon(pal.trail), 'repeat');
        if (pw.setTransform) { pw.setTransform(inv); tw.setTransform(inv); }
        patW[i] = pw; trailW[i] = tw;
      }
      return !same;
    }
    function redraw(x0, y0, x1, y1) {
      stats.redraws++;
      const g = cc, px0 = x0 * cs, py0 = y0 * cs, pw = (x1 - x0 + 1) * cs, ph = (y1 - y0 + 1) * cs;
      g.save();
      g.beginPath(); g.rect(px0, py0, pw, ph); g.clip();
      // 종이 + 모눈도 캐시에 (매 화면 전체를 여러 번 칠하지 않게)
      g.fillStyle = paperC || '#fffaf1'; g.fillRect(px0, py0, pw, ph);
      const glw = Math.max(1, cs / 26);
      g.fillStyle = 'rgba(205,172,140,0.26)';
      for (let x = x0; x <= x1 + 1; x++) if (x % 6) g.fillRect(x * cs - glw / 2, py0, glw, ph);
      for (let y = y0; y <= y1 + 1; y++) if (y % 6) g.fillRect(px0, y * cs - glw / 2, pw, glw);
      g.fillStyle = 'rgba(205,160,128,0.42)';
      for (let x = x0; x <= x1 + 1; x++) if (x % 6 === 0) g.fillRect(x * cs - glw * 0.75, py0, glw * 1.5, ph);
      for (let y = y0; y <= y1 + 1; y++) if (y % 6 === 0) g.fillRect(px0, y * cs - glw * 0.75, pw, glw * 1.5);
      const ax0 = Math.max(0, x0 - 1), ay0 = Math.max(0, y0 - 1), ax1 = Math.min(W - 1, x1 + 1), ay1 = Math.min(H - 1, y1 + 1);
      const lists = [];
      for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) { const k = disp[y * W + x]; if (k) (lists[k] || (lists[k] = [])).push(y * W + x); }
      // 칠하기
      for (let k = 1; k < lists.length; k++) {
        const L = lists[k]; if (!L) continue;
        g.beginPath();
        for (const c of L) {
          const x = c % W, y = (c - x) / W;
          g.moveTo(vX(x, y) * cs, vY(x, y) * cs); g.lineTo(vX(x + 1, y) * cs, vY(x + 1, y) * cs);
          g.lineTo(vX(x + 1, y + 1) * cs, vY(x + 1, y + 1) * cs); g.lineTo(vX(x, y + 1) * cs, vY(x, y + 1) * cs); g.closePath();
        }
        g.fillStyle = patC[k - 1]; g.fill();
      }
      // 아래쪽 그늘 (살짝 도톰하게) · 테두리 (안쪽으로 붙여서 이웃 땅 테두리와 나란히)
      const lw = 0.13 * cs, ins = lw * 0.55;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 1; k < lists.length; k++) {
        const L = lists[k]; if (!L) continue;
        const same = (x, y) => x >= 0 && y >= 0 && x < W && y < H && disp[y * W + x] === k;
        g.beginPath();
        for (const c of L) {
          const x = c % W, y = (c - x) / W;
          if (!same(x, y + 1)) { g.moveTo(vX(x, y + 1) * cs, (vY(x, y + 1) - 0.16) * cs); g.lineTo(vX(x + 1, y + 1) * cs, (vY(x + 1, y + 1) - 0.16) * cs); }
        }
        g.lineWidth = 0.22 * cs; g.strokeStyle = 'rgba(74,52,38,0.07)'; g.stroke();
        g.beginPath();
        for (const c of L) {
          const x = c % W, y = (c - x) / W;
          if (!same(x, y - 1)) { g.moveTo(vX(x, y) * cs, vY(x, y) * cs + ins); g.lineTo(vX(x + 1, y) * cs, vY(x + 1, y) * cs + ins); }
          if (!same(x, y + 1)) { g.moveTo(vX(x, y + 1) * cs, vY(x, y + 1) * cs - ins); g.lineTo(vX(x + 1, y + 1) * cs, vY(x + 1, y + 1) * cs - ins); }
          if (!same(x - 1, y)) { g.moveTo(vX(x, y) * cs + ins, vY(x, y) * cs); g.lineTo(vX(x, y + 1) * cs + ins, vY(x, y + 1) * cs); }
          if (!same(x + 1, y)) { g.moveTo(vX(x + 1, y) * cs - ins, vY(x + 1, y) * cs); g.lineTo(vX(x + 1, y + 1) * cs - ins, vY(x + 1, y + 1) * cs); }
        }
        g.lineWidth = lw; g.strokeStyle = PAL[animals[k - 1]].edge; g.globalAlpha = 0.85; g.stroke(); g.globalAlpha = 1;
      }
      g.restore();
    }
    function markDirty(x0, y0, x1, y1) {
      // 한 칸이 바뀌면 이웃 칸의 테두리도 바뀜 → 한 칸 넓게
      x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
      if (x1 < x0 || y1 < y0) return;
      for (const d of dirty) {                                         // 겹치거나 붙어 있으면 합침
        if (x0 <= d[2] + 2 && x1 >= d[0] - 2 && y0 <= d[3] + 2 && y1 >= d[1] - 2) {
          d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); return;
        }
      }
      dirty.push([x0, y0, x1, y1]);
    }
    function flushDirty() {
      if (!dirty.length) return;
      const t = performance.now();
      for (const d of dirty) redraw(d[0], d[1], d[2], d[3]);
      dirty.length = 0;
      const ms = performance.now() - t; if (ms > stats.redrawMax) stats.redrawMax = ms;
    }
    function bboxOf(cells) {
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const c of cells) { const x = c % W, y = (c - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return [x0, y0, x1, y1];
    }

    // ── 칸 움직임 묶음: in = 새 땅이 톡톡 솟음(끝나면 캐시에 넣음) · out = 사라짐(캐시는 바로 비우고 위에 흐려지며 그림)
    function addIn(cells, k, ox, oy, spread) {
      if (!cells.length) return;
      const id = ++gid, n = cells.length, dl = new Float32Array(n);
      let dmax = 0;
      for (let i = 0; i < n; i++) { const c = cells[i]; const d = Math.hypot(CX[c] - ox, CY[c] - oy); dl[i] = d; if (d > dmax) dmax = d; claim[c] = id; }
      const per = dmax > 0 ? Math.min(spread || 0.018, 0.46 / dmax) : 0;
      for (let i = 0; i < n; i++) dl[i] *= per;
      groups.push({ id, kind: 'in', k, cells: Int32Array.from(cells), dl, t0: rt, dur: 0.34, end: dmax * per + 0.34, box: bboxOf(cells) });
    }
    function addOut(cells, k) {
      if (!cells.length) return;
      const id = ++gid, n = cells.length, dl = new Float32Array(n);
      for (let i = 0; i < n; i++) { const c = cells[i]; claim[c] = id; dl[i] = Math.random() * 0.16; disp[c] = st.owner[c]; }
      const b = bboxOf(cells);
      markDirty(b[0], b[1], b[2], b[3]);
      groups.push({ id, kind: 'out', k, cells: Int32Array.from(cells), dl, t0: rt, dur: 0.42, end: 0.6, box: b });
    }
    function commit(g) {
      let any = false;
      for (const c of g.cells) if (claim[c] === g.id) { claim[c] = 0; if (disp[c] !== st.owner[c]) { disp[c] = st.owner[c]; any = true; } }
      if (any) markDirty(g.box[0], g.box[1], g.box[2], g.box[3]);
    }
    function sweep() {                                                  // 움직임 없이 바뀐 칸은 바로 캐시에
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      const o = st.owner;
      for (let c = 0; c < N; c++) if (disp[c] !== o[c] && claim[c] === 0) {
        disp[c] = o[c];
        const x = c % W, y = (c - x) / W;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 >= 0) markDirty(x0, y0, x1, y1);
    }
    function quad(g, c, s) {                                            // 칸 하나 (가운데 기준 s배)
      const x = c % W, y = (c - x) / W, mx = CX[c], my = CY[c];
      g.moveTo(mx + (vX(x, y) - mx) * s, my + (vY(x, y) - my) * s);
      g.lineTo(mx + (vX(x + 1, y) - mx) * s, my + (vY(x + 1, y) - my) * s);
      g.lineTo(mx + (vX(x + 1, y + 1) - mx) * s, my + (vY(x + 1, y + 1) - my) * s);
      g.lineTo(mx + (vX(x, y + 1) - mx) * s, my + (vY(x, y + 1) - my) * s);
      g.closePath();
    }

    // ── 새 판
    function reset(state, opt) {
      opt = opt || {};
      st = state; W = st.W; H = st.H; N = W * H; NP = st.players.length;
      me = opt.me == null ? -1 : opt.me; follow = opt.follow == null ? me : opt.follow;
      animals = opt.animals || st.players.map((p, i) => i % A.ANIMALS.length);
      names = opt.names || animals.map(a => A.ANIMALS[a].name);
      rt = 0; groups = []; gid = 0; dirty = []; ghosts = []; decals = []; parts = []; texts = []; rings = [];
      danger = false; overview = false; fast = false; hint = false;
      lightTrail = animals.map(a => lum(PAL[a].land) > 0.7);
      disp = Uint8Array.from(st.owner); claim = new Int32Array(N);
      jitter();
      measure();
      makeCache();
      redraw(0, 0, W - 1, H - 1);
      P = st.players.map((p, i) => {
        const c = p.y * W + p.x;
        return { alive: p.alive, px: CX[c], py: CY[c], cx: CX[c], cy: CY[c], dir: p.dir, lx: DIR[p.dir][0], ly: DIR[p.dir][1], born: 0.15 + i * 0.07, turnT: -9, happyT: -9, blinkT: -9, nextBlink: 1 + Math.random() * 3, trail: [], exit: -1, wasAlive: p.alive };
      });
      // 종이 테두리 (손그림)
      border = gen ? gen.rectangle(0, 0, W * U, H * U, { stroke: '#ee9d95', strokeWidth: 3.2, roughness: 1.1, bowing: 0.7, seed: 11 }) : null;
      if (!deskPat) deskPat = ctx.createPattern(deskTile(), 'repeat');
      // 작은 지도
      if (mini) { mm = document.createElement('canvas'); mm.width = W; mm.height = H; mmCtx = mm.getContext('2d'); mmImg = mmCtx.createImageData(W, H); mmDirty = true; }
      // 낙서 자국 · 동그라미 그림은 카운트다운 동안 한 화면에 하나씩 미리 만들어 둠
      warm = [];
      if (gen) for (const a of new Set(animals)) warm.push(['splat', a], ['ring', a]);
      // 카메라는 바로 그 자리에서 시작
      const t = target(0);
      cam.x = t[0]; cam.y = t[1]; cam.k = cam.kT = 1; cam.shake = 0; cam.lx = cam.ly = 0; cam.ready = true;
      clampCam();
    }

    // ── 크기 (무대 크기 바뀔 때)
    function measure() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1) * quality);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      vw = w; vh = h;
      baseZ = clamp(Math.sqrt(vw * vh / 880), 11 * dpr, 40 * dpr);
      if (mini) {
        const mr = mini.getBoundingClientRect(), s = Math.round(mr.width * dpr);
        if (s > 0 && mini.width !== s) { mini.width = s; mini.height = s; }
        mmCss = s;
      }
    }
    function resize() {
      if (!st) { measure(); return; }
      measure();
      if (makeCache()) redraw(0, 0, W - 1, H - 1);
      clampCam();
    }

    // ── 틱 앞뒤
    function beforeTick() {
      for (let i = 0; i < NP; i++) {
        const p = st.players[i], q = P[i];
        q.wasAlive = p.alive; q.trail = p.trail.slice(); q.exit = p.exit;
      }
    }
    function trailPts(cells, exit, hx, hy) {                            // 선 그릴 점들: 나간 칸 → 선 칸들 → 머리
      const pts = [];
      if (exit >= 0) pts.push(CX[exit], CY[exit]);
      for (let j = 0; j < cells.length - 1; j++) pts.push(CX[cells[j]], CY[cells[j]]);
      pts.push(hx, hy);
      return pts;
    }
    function afterTick(evs) {
      for (let i = 0; i < NP; i++) {
        const p = st.players[i], q = P[i], c = p.y * W + p.x;
        q.px = q.cx; q.py = q.cy;
        q.cx = CX[c]; q.cy = CY[c];
        if (!q.wasAlive && p.alive) { q.px = q.cx; q.py = q.cy; }
        if (p.dir !== q.dir) { q.dir = p.dir; if (p.alive && q.wasAlive) q.turnT = rt; }
        q.alive = p.alive;
      }
      if (!fast) for (const e of evs) {
        if (e.t === 'capture') onCapture(e);
        else if (e.t === 'death') onDeath(e);
        else if (e.t === 'spawn') onSpawn(e);
      } else for (const e of evs) if (e.t === 'spawn') P[e.p].born = rt - 1;
      sweep();
      mmDirty = true;
    }
    function setFast(v) {
      v = !!v; if (v === fast) return;
      fast = v;
      if (fast) { for (const g of groups) commit(g); groups = []; ghosts = []; parts = []; rings = []; texts = []; }
    }
    // 새로 먹은 칸들의 가운데 (+% 글자 자리)
    function centroid(cells) {
      let sx = 0, sy = 0;
      for (const c of cells) { sx += CX[c]; sy += CY[c]; }
      return [sx / cells.length, sy / cells.length];
    }
    function onCapture(e) {
      const q = P[e.p], c = e.y * W + e.x;
      addIn(e.cells, e.p + 1, CX[c], CY[c]);
      ghosts.push({ i: e.p, pts: trailPts(q.trail.concat([c]), q.exit, CX[c], CY[c]), t0: rt, life: 0.3 });
      q.happyT = rt;
      // 반짝이
      const n = Math.min(16, 3 + Math.floor(e.n / 12));
      for (let j = 0; j < n; j++) {
        const cc2 = e.cells[Math.floor(Math.random() * e.cells.length)];
        parts.push({ kind: 'star', x: CX[cc2], y: CY[cc2], vx: (Math.random() - 0.5) * 0.6, vy: -0.9 - Math.random() * 1.2, r: 0.16 + Math.random() * 0.14, c: j % 3 ? '#fffbe8' : '#ffd36e', t0: rt + Math.random() * 0.25, life: 0.7 + Math.random() * 0.3, spin: Math.random() * TAU });
      }
    }
    function onDeath(e) {
      const k = e.p + 1, q = P[e.p], pal = PAL[animals[e.p]];
      const c0 = e.y * W + e.x, x = CX[c0], y = CY[c0], seen = visible(x, y, 4);
      // 땅 사라짐: 지금 그려진 내 땅 + 솟는 중이던 내 땅 (같은 틱에 남이 먹은 칸은 빼고 → 그 사람 물결로)
      const cells = [];
      for (const g of groups) if (g.kind === 'in' && g.k === k) {
        for (const c of g.cells) if (claim[c] === g.id) { if (st.owner[c] === 0) cells.push(c); else claim[c] = 0; }   // 남은 칸은 놓아줌 (그 칸을 먹은 사람 물결이 가져감)
        g.end = -1;
      }
      const b = st.players[e.p].box;
      for (let yy = Math.max(0, b[1]); yy <= Math.min(H - 1, b[3]); yy++) for (let xx = Math.max(0, b[0]); xx <= Math.min(W - 1, b[2]); xx++) {
        const c = yy * W + xx; if (disp[c] === k && st.owner[c] === 0 && claim[c] === 0) cells.push(c);
      }
      groups = groups.filter(g => g.end >= 0);
      addOut(cells, k);
      if (q.trail.length) ghosts.push({ i: e.p, pts: trailPts(q.trail, q.exit, x, y), t0: rt, life: 0.5 });
      // 철퍽: 크레파스 조각 + 낙서 자국 (화면 근처일 때만 — 안 보이는 곳 효과는 만들지 않음)
      if (seen) {
        for (let j = 0; j < 18; j++) {
          const a = Math.random() * TAU, sp = 2.5 + Math.random() * 6;
          parts.push({ kind: 'blob', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.12 + Math.random() * 0.22, c: j % 3 === 0 ? pal.edge : j % 3 === 1 ? pal.land : pal.head, t0: rt, life: 0.55 + Math.random() * 0.35 });
        }
        decals.push({ x, y, d: cachedSprite('splat', animals[e.p]), c: pal.land, e: pal.edge, t0: rt, life: 2.6, rot: Math.random() * TAU, flip: Math.random() < 0.5 ? -1 : 1 });
        rings.push({ x, y, c: pal.edge, t0: rt, life: 0.45, r0: 0.6, r1: 2.2, d: null });
      }
      const onScreen = visible(x, y, 2);
      if (e.p === follow && follow >= 0) cam.shake = Math.max(cam.shake, 0.5);
      else if (e.by === follow && follow >= 0) cam.shake = Math.max(cam.shake, 0.28);
      else if (onScreen) cam.shake = Math.max(cam.shake, 0.08);
    }
    function onSpawn(e) {
      const k = e.p + 1, q = P[e.p], cells = [];
      for (let y = e.y - 3; y <= e.y + 3; y++) for (let x = e.x - 3; x <= e.x + 3; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = y * W + x; if (st.owner[c] === k && disp[c] !== k) cells.push(c);
      }
      const c0 = e.y * W + e.x;
      addIn(cells, k, CX[c0], CY[c0], 0.06);
      q.born = rt; q.px = q.cx = CX[c0]; q.py = q.cy = CY[c0];
      if (visible(CX[c0], CY[c0], 4)) rings.push({ x: CX[c0], y: CY[c0], c: PAL[animals[e.p]].edge, t0: rt, life: 0.65, r0: 0.7, r1: 3.2, d: cachedSprite('ring', animals[e.p]), rot: Math.random() * TAU });
    }
    // rough.js 그림을 작은 캔버스에 한 번만 그려 둠 (매 화면은 붙이기만) · size = 칸 단위 한 변
    function sprite(drawable, size) {
      const px = Math.max(8, Math.round(baseZ)), n = Math.ceil(size * px), c = document.createElement('canvas');
      c.width = c.height = n;
      const g2 = c.getContext('2d');
      g2.translate(n / 2, n / 2); g2.scale(px / U, px / U);
      RG.canvas(c).draw(drawable);
      return { c, px, n };
    }
    // 동물(색)마다 한 장: 'splat' 낙서 자국 · 'ring' 다시 태어날 때 동그라미. 그릴 때 돌려서 매번 달라 보이게
    function cachedSprite(kind, ai) {
      if (!gen) return null;
      const px = Math.max(8, Math.round(baseZ)), key = kind + ai + ':' + px;
      let s = sprCache.get(key);
      if (!s) {
        if (sprCache.size >= 48) sprCache.delete(sprCache.keys().next().value);
        const pal = PAL[ai];
        s = kind === 'splat'
          ? sprite(gen.ellipse(0, 0, 2.5 * U, 2.1 * U, { fill: pal.land, fillStyle: 'zigzag', hachureGap: 0.3 * U, fillWeight: 0.13 * U, hachureAngle: -35, roughness: 2.6, stroke: pal.edge, strokeWidth: 0.07 * U, seed: 11 + ai * 97 }), 3.4)
          : sprite(gen.circle(0, 0, 2 * U, { stroke: pal.edge, strokeWidth: 0.12 * U, roughness: 1.4, seed: 5 + ai * 31 }), 2.6);
        sprCache.set(key, s);
      }
      return s;
    }

    // ── 카메라
    function headPos(i, alpha) { const q = P[i]; return [q.px + (q.cx - q.px) * alpha, q.py + (q.cy - q.py) * alpha]; }
    function target(alpha) {
      if (overview || !st) return [W / 2, H / 2];
      if (follow >= 0 && P[follow] && P[follow].alive) {
        const h = headPos(follow, alpha);
        return [h[0] + cam.lx, h[1] + cam.ly];
      }
      return [cam.x, cam.y];
    }
    function clampCam() {
      const hw = vw / (2 * z), hh = vh / (2 * z);
      const mx = hw * 0.62, my = hh * 0.62;                            // 화면의 38% 넘게 종이 밖이 보이지 않게
      cam.x = W + 2 * mx - 2 * hw < 0 ? W / 2 : clamp(cam.x, hw - mx, W - hw + mx);
      cam.y = H + 2 * my - 2 * hh < 0 ? H / 2 : clamp(cam.y, hh - my, H - hh + my);
    }
    function visible(x, y, m) {
      const hw = vw / (2 * z) + m, hh = vh / (2 * z) + m;
      return Math.abs(x - cam.x) < hw && Math.abs(y - cam.y) < hh;
    }

    // ── 한 화면
    function frame(alpha, dt) {
      if (!st) return;
      const t0 = performance.now();
      rt += dt;
      flushDirty();
      // 카메라: 따라가는 머리 + 가는 쪽으로 조금 앞을 봄
      const f = follow >= 0 && P[follow] && P[follow].alive ? P[follow] : null;
      const la = Math.min(vw, vh) / baseZ * 0.16;
      cam.lx += ((f ? f.lx * la : 0) - cam.lx) * (1 - Math.exp(-dt * 2.2));
      cam.ly += ((f ? f.ly * la : 0) - cam.ly) * (1 - Math.exp(-dt * 2.2));
      if (overview) cam.kT = Math.min(1, Math.min(vw, vh) / (Math.max(W, H) + 4) / baseZ);
      else cam.kT = f ? (me < 0 ? 0.86 : 1) : 0.9;                      // 구경은 조금 더 넓게
      cam.k += (cam.kT - cam.k) * (1 - Math.exp(-dt * 2.6));
      z = baseZ * cam.k;
      const tg = target(alpha), ease = 1 - Math.exp(-dt * (overview ? 2.5 : 6));
      cam.x += (tg[0] - cam.x) * ease; cam.y += (tg[1] - cam.y) * ease;
      clampCam();
      cam.shake *= Math.exp(-dt * 8);
      const sx = cam.shake > 0.01 ? (Math.random() - 0.5) * 2 * cam.shake * z * 0.5 : 0, sy = cam.shake > 0.01 ? (Math.random() - 0.5) * 2 * cam.shake * z * 0.5 : 0;
      const ox = vw / 2 - cam.x * z + sx, oy = vh / 2 - cam.y * z + sy;
      const L = cam.x - vw / (2 * z) - 1, R = cam.x + vw / (2 * z) + 1, T = cam.y - vh / (2 * z) - 1, B = cam.y + vh / (2 * z) + 1;

      const g = ctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 책상: 종이 밖으로 보이는 곳만 (전체를 칠하지 않음)
      const pl = ox, pt = oy, pr = ox + W * z, pb = oy + H * z;
      if (deskPat && deskPat.setTransform) deskPat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy]));
      g.fillStyle = deskPat || '#f4e3cf';
      if (pt > 0) g.fillRect(0, 0, vw, Math.ceil(pt));
      if (pb < vh) g.fillRect(0, Math.floor(pb), vw, vh - Math.floor(pb));
      if (pl > 0) g.fillRect(0, Math.max(0, pt), Math.ceil(pl), Math.min(vh, pb) - Math.max(0, pt));
      if (pr < vw) g.fillRect(Math.floor(pr), Math.max(0, pt), vw - Math.floor(pr), Math.min(vh, pb) - Math.max(0, pt));
      g.setTransform(z, 0, 0, z, ox, oy);
      // 종이 그림자 (오른쪽·아래 가장자리만)
      g.fillStyle = 'rgba(140,98,70,0.16)';
      if (pb < vh + z) g.fillRect(0.25, H, W, 0.32);
      if (pr < vw + z) g.fillRect(W, 0.3, 0.22, H);
      // 종이 + 모눈 + 땅 = 캐시 한 장 (보이는 곳만)
      const sx0 = Math.max(0, Math.floor(L)), sy0 = Math.max(0, Math.floor(T)), sx1 = Math.min(W, Math.ceil(R)), sy1 = Math.min(H, Math.ceil(B));
      if (sx1 > sx0 && sy1 > sy0) {
        g.imageSmoothingEnabled = true;
        g.drawImage(cache, sx0 * cs, sy0 * cs, (sx1 - sx0) * cs, (sy1 - sy0) * cs, sx0, sy0, sx1 - sx0, sy1 - sy0);
      }
      // 칸 움직임
      for (let gi = groups.length - 1; gi >= 0; gi--) {
        const gr = groups[gi], t = rt - gr.t0;
        if (t > gr.end) { commit(gr); groups.splice(gi, 1); continue; }
        const b = gr.box;
        if (b[2] + 1 < L || b[0] > R || b[3] + 1 < T || b[1] > B) continue;
        g.beginPath();
        let any = false;
        if (gr.kind === 'in') {
          for (let i = 0; i < gr.cells.length; i++) {
            const c = gr.cells[i]; if (claim[c] !== gr.id) continue;
            const u = (t - gr.dl[i]) / gr.dur; if (u <= 0) continue;
            quad(g, c, u >= 1 ? 1 : Math.max(0.01, backOut(u))); any = true;
          }
          if (any) { g.fillStyle = patW[gr.k - 1]; g.fill(); }
        } else {
          const u0 = t / gr.dur;
          for (let i = 0; i < gr.cells.length; i++) {
            const c = gr.cells[i]; if (claim[c] !== gr.id) continue;
            const u = clamp((t - gr.dl[i]) / gr.dur, 0, 1); if (u >= 1) continue;
            quad(g, c, 1 - 0.55 * cubicOut(u)); any = true;
          }
          if (any) { g.globalAlpha = clamp(1 - u0, 0, 1); g.fillStyle = patW[gr.k - 1]; g.fill(); g.globalAlpha = 1; }
        }
      }
      // 낙서 자국 (아웃된 자리)
      for (let i = decals.length - 1; i >= 0; i--) {
        const d = decals[i], t = rt - d.t0;
        if (t > d.life) { decals.splice(i, 1); continue; }
        if (!visible(d.x, d.y, 3)) continue;
        const a = t < 0.12 ? t / 0.12 : clamp((d.life - t) / 0.9, 0, 1);
        g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.globalAlpha = a * 0.85;
        const s = 0.75 + 0.25 * backOut(clamp(t / 0.25, 0, 1));
        if (d.d) { const k = s / d.d.px; g.scale(k * d.flip, k); g.drawImage(d.d.c, -d.d.n / 2, -d.d.n / 2); }
        else { g.fillStyle = d.c; g.beginPath(); g.ellipse(0, 0, 1.2 * s, 1.0 * s, 0, 0, TAU); g.fill(); }
        g.restore();
      }
      // 선 (지금 긋는 중 + 막 닫힌 선의 잔상)
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i], t = rt - gh.t0;
        if (t > gh.life) { ghosts.splice(i, 1); continue; }
        drawTrail(g, gh.i, gh.pts, clamp(1 - t / gh.life, 0, 1), false);
      }
      for (let i = 0; i < NP; i++) {
        const p = st.players[i], q = P[i];
        if (!p.alive || !p.trail.length) continue;
        const h = headPos(i, alpha);
        drawTrail(g, i, trailPts(p.trail, p.exit, h[0], h[1]), 1, i === me && danger);
      }
      // 종이 테두리 (손그림 빨간 크레파스: 닿으면 아웃)
      if (border && rc) { g.save(); g.scale(1 / U, 1 / U); rc.draw(border); g.restore(); }
      else { g.strokeStyle = '#ee9d95'; g.lineWidth = 0.16; g.strokeRect(0, 0, W, H); }
      // 동그라미 (다시 태어남 · 아웃)
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i], t = (rt - r.t0) / r.life;
        if (t > 1) { rings.splice(i, 1); continue; }
        const rr = r.r0 + (r.r1 - r.r0) * cubicOut(t);
        g.globalAlpha = (1 - t) * 0.9;
        if (r.d) { const k = rr / r.d.px; g.save(); g.translate(r.x, r.y); g.rotate(r.rot || 0); g.scale(k, k); g.drawImage(r.d.c, -r.d.n / 2, -r.d.n / 2); g.restore(); }
        else { g.strokeStyle = r.c; g.lineWidth = 0.12; g.beginPath(); g.arc(r.x, r.y, rr, 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }
      // 머리 (아래쪽에 있는 것을 나중에 → 겹칠 때 자연스럽게)
      const order = [];
      for (let i = 0; i < NP; i++) if (P[i].alive && st.players[i].alive) order.push(i);
      order.sort((a, b) => P[a].cy - P[b].cy);
      for (const i of order) drawHead(g, i, alpha, dt);
      // 크레파스 조각 · 반짝이
      for (let i = parts.length - 1; i >= 0; i--) {
        const pt = parts[i], t = rt - pt.t0;
        if (t < 0) continue;
        if (t > pt.life) { parts.splice(i, 1); continue; }
        const dr = Math.exp(-dt * (pt.kind === 'blob' ? 4.5 : 1.2));
        pt.vx *= dr; pt.vy *= dr; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        const u = t / pt.life;
        if (!visible(pt.x, pt.y, 1)) continue;
        if (pt.kind === 'blob') {
          g.fillStyle = pt.c; g.globalAlpha = 1 - u * u;
          g.beginPath(); g.arc(pt.x, pt.y, pt.r * (1 - 0.5 * u), 0, TAU); g.fill();
        } else {
          g.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.2));
          star(g, pt.x, pt.y, pt.r * (0.6 + 0.4 * Math.sin(u * Math.PI)), pt.spin + t * 3, pt.c);
        }
        g.globalAlpha = 1;
      }
      // 화면 글자 (+3.4% · 나 표시)
      g.setTransform(1, 0, 0, 1, 0, 0);
      // 이름표: 나 (혼자) · 따라가는 친구 (구경)
      const ti = me >= 0 && P[me] && P[me].alive ? me : follow;
      if (ti >= 0 && P[ti] && P[ti].alive && st.players[ti].alive && !overview) {
        // 카운트다운 중엔 통통 크게 (내가 누구인지 바로 보이게)
        const hop = hint ? Math.abs(Math.sin(rt * 6)) : 0;
        const h = headPos(ti, alpha), x = h[0] * z + ox, y = (h[1] - HEAD_R * 1.7) * z + oy + Math.sin(rt * 5) * dpr * 1.5 - hop * 6 * dpr;
        tag(g, x, y, ti === me ? '나' : (names[ti] || ''), hint ? 1.18 + hop * 0.12 : 1);
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const tx = texts[i], t = (rt - tx.t0) / tx.life;
        if (t > 1) { texts.splice(i, 1); continue; }
        const x = tx.x * z + ox, y = (tx.y - 1.6 * cubicOut(t)) * z + oy;
        const s = t < 0.25 ? backOut(t / 0.25) : 1;
        g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        const fs = Math.round(tx.size * dpr * s);
        if (fs > 1) {
          g.font = `${fs}px Jua, "Gowun Dodum", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = Math.max(2, fs * 0.2); g.strokeStyle = '#ffffff'; g.strokeText(tx.text, x, y);
          g.fillStyle = tx.color; g.fillText(tx.text, x, y);
        }
        g.globalAlpha = 1;
      }
      drawMini();
      if (warm.length) { const w = warm.shift(); cachedSprite(w[0], w[1]); }   // 미리 만들기: 한 화면에 하나
      const ms = performance.now() - t0;
      if (rt > 1.5) {
        stats.frames++; if (ms > 8) stats.slow++; if (ms > stats.maxMs) stats.maxMs = ms;
        stats.hist[ms < 2 ? 0 : ms < 4 ? 1 : ms < 8 ? 2 : ms < 16 ? 3 : ms < 33 ? 4 : 5]++;
      }
    }

    function drawTrail(g, i, pts, a, warn) {
      if (pts.length < 4) return;
      const pal = PAL[animals[i]];
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (let j = 2; j < pts.length; j += 2) g.lineTo(pts[j], pts[j + 1]);
      g.globalAlpha = a;
      if (warn) { g.lineWidth = 0.95; g.strokeStyle = `rgba(242,100,126,${0.22 + 0.18 * Math.sin(rt * 14)})`; g.stroke(); }
      g.lineWidth = 0.52; g.strokeStyle = 'rgba(74,52,38,0.16)'; g.save(); g.translate(0, 0.07); g.stroke(); g.restore();
      if (lightTrail[i]) { g.lineWidth = 0.6; g.strokeStyle = A.rgba(pal.edge, 0.55); g.stroke(); }   // 밝은 색은 가는 테두리
      g.lineWidth = 0.48; g.strokeStyle = trailW[i] || pal.trail; g.stroke();
      g.lineWidth = 0.17; g.strokeStyle = A.rgba(pal.trailHi, 0.55); g.stroke();
      g.globalAlpha = 1;
    }
    function star(g, x, y, r, rot, c) {
      g.beginPath();
      for (let j = 0; j < 10; j++) { const a = rot + j * Math.PI / 5, rr = j % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = c; g.fill();
      g.lineWidth = r * 0.25; g.strokeStyle = 'rgba(230,170,60,0.55)'; g.stroke();
    }
    function tag(g, x, y, text, s) {
      const fs = Math.round(13 * dpr * (s || 1));
      g.font = `${fs}px Jua, "Gowun Dodum", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText(text).width + fs * 1.1, h = fs * 1.55;
      g.fillStyle = 'rgba(91,70,54,0.18)'; rrect(g, x - w / 2, y - h / 2 + dpr * 1.5, w, h, h / 2); g.fill();
      g.fillStyle = '#ffffff'; rrect(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill();
      g.beginPath(); g.moveTo(x - fs * 0.32, y + h / 2 - 1); g.lineTo(x + fs * 0.32, y + h / 2 - 1); g.lineTo(x, y + h / 2 + fs * 0.38); g.closePath(); g.fill();
      g.fillStyle = '#e07a5c'; g.fillText(text, x, y + dpr * 0.5);
    }
    function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    // 얼굴 그림 모아 두기: (동물·기분·보는 쪽·눈 깜빡) 마다 한 번 그려 두고 매 화면은 붙이기만
    //  보는 쪽은 8방향 + 가운데로만 나눔 (동물 8 × 기분 3 × 9 × 깜빡 3 = 최대 648장) · 넘치면 가장 오래된 것부터 버림
    const faces = new Map(); let faceR = 0, scratch = null;
    function faceSprite(idx, mood, lx, ly, blink) {
      const r = Math.max(8, Math.round(HEAD_R * baseZ * 1.1));
      if (r !== faceR) { faces.clear(); faceR = r; scratch = null; }
      const m = Math.hypot(lx, ly), qd = m < 0.35 ? 8 : (Math.round(Math.atan2(ly, lx) / (Math.PI / 4)) + 8) & 7;
      const qb = blink > 0.66 ? 2 : blink > 0.25 ? 1 : 0;
      const key = ((idx * 3 + mood) * 9 + qd) * 3 + qb;
      let s = faces.get(key);
      if (!s) {
        if (faces.size >= 1200) faces.delete(faces.keys().next().value);
        const w = Math.ceil(r * 2.6), h = Math.ceil(r * 3.2), mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
        if (!scratch) scratch = { face: mk(), sil: mk() };            // 얼굴·하얀 그림자는 그릴 때만 쓰는 판 두 장 (다시 씀)
        const face = scratch.face, sil = scratch.sil, c = mk();
        const look = qd === 8 ? [0, 0] : [Math.cos(qd * Math.PI / 4), Math.sin(qd * Math.PI / 4)];
        s = { c, cx: w / 2, cy: r * 1.66, r };
        const gf = face.getContext('2d'); gf.clearRect(0, 0, w, h);
        A.face(gf, s.cx, s.cy, r, idx, { look, blink: qb ? (qb === 2 ? 1 : 0.5) : 0, mood });
        // 스티커처럼 하얀 테두리: 얼굴 모양을 하얗게 칠해 둘레로 조금씩 밀어 찍고 그 위에 얼굴 (자기 땅 위에서도 또렷)
        const gs = sil.getContext('2d');
        gs.globalCompositeOperation = 'source-over'; gs.clearRect(0, 0, w, h);
        gs.drawImage(face, 0, 0); gs.globalCompositeOperation = 'source-in'; gs.fillStyle = 'rgba(255,253,248,0.92)'; gs.fillRect(0, 0, w, h);
        gs.globalCompositeOperation = 'source-over';
        const g2 = c.getContext('2d'), d = Math.max(1.2, r * 0.1);
        for (let a = 0; a < 8; a++) g2.drawImage(sil, Math.cos(a * Math.PI / 4) * d, Math.sin(a * Math.PI / 4) * d);
        g2.drawImage(face, 0, 0);
        faces.set(key, s);
        stats.faces = (stats.faces || 0) + 1;
      }
      return s;
    }
    function drawHead(g, i, alpha, dt) {
      const q = P[i], h = headPos(i, alpha);
      // 보는 쪽을 부드럽게
      const d = DIR[q.dir], e = 1 - Math.exp(-dt * 16);
      q.lx += (d[0] - q.lx) * e; q.ly += (d[1] - q.ly) * e;
      const sp = rt - q.born, s = sp < 0 ? 0 : sp < 0.42 ? backOut(sp / 0.42) : 1;
      if (s <= 0.01) return;
      const tq = Math.exp(-(rt - q.turnT) * 9), wob = Math.sin((rt - q.turnT) * 26) * tq;
      const sx = 1 + 0.13 * wob, sy = 1 - 0.1 * wob;
      if (rt > q.nextBlink) { q.blinkT = rt; q.nextBlink = rt + 2.2 + Math.random() * 2.6; }
      const bt = rt - q.blinkT, blink = bt < 0.16 ? 1 - Math.abs(bt - 0.08) / 0.08 : 0;
      const mood = rt - q.happyT < 0.6 ? 1 : (i === me && danger) ? 2 : 0;
      const bob = Math.sin(rt * 9 + i * 1.7) * 0.035, r = HEAD_R * s, x = h[0], y = h[1] - 0.08 + bob;
      g.fillStyle = 'rgba(91,70,54,0.2)';
      g.beginPath(); g.ellipse(x, y + r * 0.86, r * 0.86, r * 0.3, 0, 0, TAU); g.fill();
      const sp2 = faceSprite(animals[i], mood, q.lx, q.ly, blink), k = r / sp2.r;
      g.save(); g.translate(x, y); g.rotate(q.lx * 0.08); g.scale(k * sx, k * sy);
      g.drawImage(sp2.c, -sp2.cx, -sp2.cy);
      g.restore();
    }

    // ── 작은 지도
    function drawMini() {
      if (!mini || !mctx || !mmCss) return;
      if (mmDirty) {
        mmDirty = false;
        const d = mmImg.data, o = st.owner, tr = st.trail;
        const cols = [[255, 250, 241]];
        for (let i = 0; i < NP; i++) { const p = PAL[animals[i]]; cols.push(hexRgb(p.mini)); }
        const tcols = [null];
        for (let i = 0; i < NP; i++) tcols.push(hexRgb(PAL[animals[i]].edge));
        for (let c = 0; c < N; c++) {
          const col = tr[c] ? tcols[tr[c]] : cols[o[c]] || cols[0], j = c * 4;
          d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
        }
        mmCtx.putImageData(mmImg, 0, 0);
      }
      const s = mmCss, k = s / Math.max(W, H);
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, s, s);
      mctx.imageSmoothingEnabled = true;
      mctx.drawImage(mm, 0, 0, W * k, H * k);
      // 보이는 곳
      const hw = vw / (2 * z), hh = vh / (2 * z);
      mctx.strokeStyle = 'rgba(91,70,54,0.55)'; mctx.lineWidth = Math.max(1, s / 70);
      mctx.strokeRect((cam.x - hw) * k, (cam.y - hh) * k, hw * 2 * k, hh * 2 * k);
      // 머리
      for (let i = 0; i < NP; i++) {
        if (!st.players[i].alive) continue;
        const p = st.players[i], big = i === me || (me < 0 && i === follow);
        const r = big ? s / 26 + Math.sin(rt * 6) * s / 160 : s / 40;
        mctx.beginPath(); mctx.arc((p.x + 0.5) * k, (p.y + 0.5) * k, r + s / 120, 0, TAU); mctx.fillStyle = '#ffffff'; mctx.fill();
        mctx.beginPath(); mctx.arc((p.x + 0.5) * k, (p.y + 0.5) * k, r, 0, TAU); mctx.fillStyle = PAL[animals[i]].edge; mctx.fill();
      }
    }
    const rgbCache = {};
    function hexRgb(h) { if (rgbCache[h]) return rgbCache[h]; const v = h.replace('#', ''); return (rgbCache[h] = [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]); }

    // ── 밖에서 쓰는 것
    function floatText(x, y, text, color, size, avoid) {
      if (fast) return;
      // 머리 바로 옆이면 머리에서 2칸 넘게 비켜서 (글자가 얼굴을 가리지 않게)
      if (avoid >= 0 && P[avoid]) {
        const hx = P[avoid].cx, hy = P[avoid].cy;
        let vx = x - hx, vy = y - hy, d = Math.hypot(vx, vy);
        if (d < 2.2) { if (d < 0.3) { vx = 0; vy = -1; d = 1; } x = hx + vx / d * 2.4; y = hy + vy / d * 2.4; }
      }
      // 보이는 곳 안쪽으로 (가장자리 글자가 잘리지 않게)
      const hw = vw / (2 * z), hh = vh / (2 * z);
      x = clamp(x, cam.x - hw + 2.2, cam.x + hw - 2.2); y = clamp(y, cam.y - hh + 3.5, cam.y + hh - 1.5);
      texts.push({ x, y, text, color, size: size || 22, t0: rt, life: 1.15 });
    }
    function cellCenter(c) { return [CX[c], CY[c]]; }
    function screenOf(x, y) { return [((x - cam.x) * z + vw / 2) / dpr, ((y - cam.y) * z + vh / 2) / dpr]; }
    return {
      reset, resize, beforeTick, afterTick, frame, floatText, cellCenter, screenOf, centroid, setFast, visible,
      setFollow(i) { follow = i; },
      setQuality(q) { quality = q; resize(); },
      get quality() { return quality; },
      get follow() { return follow; },
      setDanger(v) { danger = !!v; },
      setHint(v) { hint = !!v; },
      setOverview(v) { overview = !!v; },
      shake(a) { cam.shake = Math.max(cam.shake, a); },
      get stats() { return stats; },
      // 점검: 그려 둔 땅이 규칙 상태와 다른 칸 수 · 묶음 없이 남은 표시 수 (움직임이 다 끝나면 둘 다 0 이어야 함)
      check() {
        const live = new Set(groups.map(g => g.id));
        let diff = 0, stale = 0;
        for (let c = 0; c < N; c++) { if (claim[c] && !live.has(claim[c])) stale++; if (!claim[c] && disp[c] !== st.owner[c]) diff++; }
        return { diff, stale, groups: groups.length, dirty: dirty.length };
      },
      get busy() { return groups.length; },
    };
  }

  window.LandRender = { create };
})();
