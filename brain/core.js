/* 베니 두뇌 랩 코어 (brain/core.js) — Node · 브라우저 공용 (UMD)
   · 4대 영역: 도형·공간(shape) · 수·패턴(num) · 추리·논리(logic) · 기억·집중(mem)
   · 시드 기반 결정적 생성 (혼자 챌린지 · 친구랑 같은 문제 대결 · selftest 공용) */
((root, factory) => {
  const mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.BrainCore = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const CATS = [
    { id: "shape", name: "도형 · 공간", icon: "🔷", short: "도형", desc: "3×3 행렬 규칙 · 회전 도형 찾기" },
    { id: "num",   name: "수 · 패턴",   icon: "🔢", short: "수리", desc: "수열 추론 · 마방진 · 기호 연산" },
    { id: "logic", name: "추리 · 논리", icon: "🕵️", short: "추리", desc: "참/거짓 추론 · 조건표 연역" },
    { id: "mem",   name: "기억 · 집중", icon: "🧠", short: "기억", desc: "순서 기억 · 패턴 위치 복원" },
  ];
  const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

  function hashSeed(s) {
    if (typeof s === "number" && Number.isFinite(s)) return (s >>> 0) || 1;
    const str = String(s || "benny");
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }

  function mulberry32(seed) {
    let a = hashSeed(seed);
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const randInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  function shuffled(r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hasBatchim(word) {
    const s = String(word || "").trim();
    if (!s) return false;
    const ch = s.charCodeAt(s.length - 1);
    return ch >= 0xAC00 && ch <= 0xD7A3 && (ch - 0xAC00) % 28 !== 0;
  }
  function josa(word, pair) {
    const [a, b] = pair.split("/");
    return hasBatchim(word) ? a : b;
  }

  function distinctNumChoices(r, ans, stepHint = 2) {
    const set = new Set([ans]);
    const offsets = shuffled(r, [-4, -3, -2, -1, 1, 2, 3, 4, -stepHint, stepHint, stepHint * 2, -stepHint * 2, 5, -5, 6, -6, 8, -8, 10]);
    for (const d of offsets) {
      if (set.size >= 4) break;
      const cand = ans + d;
      if (cand >= 0 || ans < 0) set.add(cand);
    }
    let k = 1;
    while (set.size < 4) { set.add(ans + k++); }
    const arr = shuffled(r, [...set]);
    return { choices: arr.map(v => ({ label: String(v), val: v })), answer: arr.indexOf(ans) };
  }

  // ── 1) 도형 · 공간 (shape) ─────────────────────────────────────────────────
  const SHAPES = ["circle", "triangle", "square", "diamond", "star"];
  const FILLS = ["solid", "outline", "stripe"];
  const COLORS = ["#38bdf8", "#fbbf24", "#f472b6"];

  function drawCellGlyph(cell, idxSuffix, size = 76) {
    const cx = size / 2, cy = size / 2;
    const fillId = `st_${idxSuffix}`;
    const col = COLORS[cell.c % COLORS.length];
    const patDef = cell.f === "stripe"
      ? `<defs><pattern id="${fillId}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${col}" stroke-width="3"/></pattern></defs>`
      : "";
    const fillAttr = cell.f === "solid" ? col : cell.f === "stripe" ? `url(#${fillId})` : "none";
    const strokeAttr = col;
    const sw = cell.f === "outline" ? 3.5 : 2.2;

    const one = (ox, oy, sc) => {
      const r = 18 * sc;
      const rot = cell.rot || 0;
      let body = "";
      if (cell.s === "circle") body = `<circle cx="0" cy="0" r="${r}"/>`;
      else if (cell.s === "square") body = `<rect x="${-r * 0.88}" y="${-r * 0.88}" width="${r * 1.76}" height="${r * 1.76}" rx="3"/>`;
      else if (cell.s === "diamond") body = `<polygon points="0,${-r * 1.05} ${r * 0.95},0 0,${r * 1.05} ${-r * 0.95},0"/>`;
      else if (cell.s === "triangle") body = `<polygon points="0,${-r * 1.05} ${r * 0.95},${r * 0.82} ${-r * 0.95},${r * 0.82}"/>`;
      else {
        // 별 또는 비대칭 방향 화살표형 별
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const rad = i % 2 === 0 ? r * 1.08 : r * 0.46;
          pts.push(`${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad).toFixed(1)}`);
        }
        body = `<polygon points="${pts.join(" ")}"/>`;
      }
      // 회전 규칙이 보일 수 있도록 상단에 작은 기준점(rot != 0 이거나 비원형 회전 시) 표시
      const notch = cell.hasDir
        ? `<circle cx="0" cy="${-r * 1.22}" r="3.4" fill="#f8fafc"/>`
        : "";
      return `<g transform="translate(${ox},${oy}) rotate(${rot})" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linejoin="round">${body}${notch}</g>`;
    };

    const n = cell.n || 1;
    let shapes = "";
    if (n === 1) shapes = one(cx, cy, 1);
    else if (n === 2) shapes = one(cx - 15, cy, 0.68) + one(cx + 15, cy, 0.68);
    else shapes = one(cx, cy - 13, 0.56) + one(cx - 15, cy + 12, 0.56) + one(cx + 15, cy + 12, 0.56);

    return `${patDef}${shapes}`;
  }

  function cellKey(c) {
    return `${c.s}|${c.f}|${c.c}|${c.n}|${c.rot}|${c.hasDir ? 1 : 0}`;
  }

  function renderTileSvg(cell, idTag) {
    return `<svg viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="72" height="72" rx="10" fill="#131c2e" stroke="#334155" stroke-width="2"/>${drawCellGlyph(cell, idTag, 76)}</svg>`;
  }

  function genShapeMatrix(r, tier, seedStr) {
    const shapes3 = shuffled(r, SHAPES.slice(0, 4)).slice(0, 3);
    const fills3 = shuffled(r, FILLS);
    const cols3 = [0, 1, 2];
    const modeRot = tier !== "easy" && r() < 0.45;
    const modeCount = tier === "hard" || (tier === "normal" && !modeRot);

    // 3x3 규칙 생성: 각 가로줄마다 속성별 [모두 같음] 또는 [모두 다름] 또는 [+1 순열]
    const shapeRule = r() < 0.7 ? "all_diff" : "row_same";
    const fillRule = tier === "easy" ? "row_same" : (r() < 0.65 ? "all_diff" : "col_diff");
    const colRule = tier === "easy" ? "same" : "row_diff";
    const rotBase = [0, 90, 180, 270][randInt(r, 0, 3)];

    const grid = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const s = shapeRule === "all_diff" ? shapes3[(row + col) % 3] : shapes3[row];
        const f = fillRule === "row_same" ? fills3[row] : fillRule === "all_diff" ? fills3[(col + row) % 3] : fills3[col];
        const c = colRule === "same" ? 0 : cols3[(row + col) % 3];
        const n = modeCount ? (col + 1) : 1;
        const rot = modeRot ? (rotBase + (row + col) * 90) % 360 : 0;
        grid.push({ s, f, c, n, rot, hasDir: modeRot });
      }
    }

    const ansCell = grid[8];
    const cellsHtml = grid.map((cell, idx) => {
      const rx = 6 + (idx % 3) * 96;
      const ry = 6 + Math.floor(idx / 3) * 96;
      if (idx === 8) {
        return `<g transform="translate(${rx},${ry})"><rect width="88" height="88" rx="12" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4"/><text x="44" y="57" font-size="38" font-weight="900" fill="#fbbf24" text-anchor="middle" font-family="sans-serif">?</text></g>`;
      }
      return `<g transform="translate(${rx},${ry})"><rect width="88" height="88" rx="12" fill="#101827" stroke="#334155" stroke-width="2"/><g transform="translate(6,6)">${drawCellGlyph(cell, `${seedStr}_m${idx}`, 76)}</g></g>`;
    }).join("");

    const boardSvg = `<svg viewBox="0 0 292 292" xmlns="http://www.w3.org/2000/svg" class="br-svg-board"><rect width="292" height="292" rx="16" fill="#0b1120"/>${cellsHtml}</svg>`;

    // 정답과 겹치지 않는 오답 보기 3개 만들기
    const seen = new Set([cellKey(ansCell)]);
    const opts = [ansCell];
    const altShapes = shuffled(r, shapes3);
    const altFills = shuffled(r, fills3);
    let guard = 0;
    while (opts.length < 4 && guard++ < 120) {
      const cand = {
        s: r() < 0.65 ? pick(r, altShapes) : pick(r, SHAPES),
        f: r() < 0.65 ? pick(r, altFills) : pick(r, FILLS),
        c: colRule === "same" ? 0 : randInt(r, 0, 2),
        n: modeCount ? randInt(r, 1, 3) : 1,
        rot: modeRot ? (rotBase + randInt(r, 0, 3) * 90) % 360 : 0,
        hasDir: modeRot,
      };
      const k = cellKey(cand);
      if (!seen.has(k)) { seen.add(k); opts.push(cand); }
    }
    for (const fs of SHAPES) {
      for (const ff of FILLS) {
        if (opts.length >= 4) break;
        const cand = { s: fs, f: ff, c: 0, n: 1, rot: 0, hasDir: modeRot };
        const k = cellKey(cand);
        if (!seen.has(k)) { seen.add(k); opts.push(cand); }
      }
    }
    const mixed = shuffled(r, opts);
    const answer = mixed.findIndex(c => cellKey(c) === cellKey(ansCell));

    const ruleDesc = [
      shapeRule === "all_diff" ? "가로·세로줄마다 3가지 모양이 한 번씩 등장" : "각 가로줄마다 같은 모양 유지",
      fillRule === "row_same" ? "가로줄별 채움(속참/테두리/빗금) 고정" : fillRule === "col_diff" ? "세로줄별 채움(속참/테두리/빗금) 고정" : "채움 무늬가 칸마다 순환",
      modeCount ? "오른쪽으로 갈수록 개수가 1→2→3개로 증가" : "",
      modeRot ? "오른쪽·아래로 갈수록 90°씩 시계 방향 회전" : "",
    ].filter(Boolean);

    return {
      cat: "shape", sub: "matrix", tier, type: "choice",
      title: "규칙을 찾아 빈칸(?)에 알맞은 도형을 고르세요",
      visualSvg: boardSvg,
      choices: mixed.map((c, i) => ({ svg: renderTileSvg(c, `${seedStr}_o${i}`) })),
      answer,
      explain: {
        rule: "3×3 멘사 행렬 규칙",
        hint1: "가로줄(또는 세로줄) 3칸에서 모양과 채움이 어떻게 바뀌는지 각각 따로 살펴보세요.",
        hint2: ruleDesc.slice(0, 2).join(" / "),
        steps: ruleDesc,
      },
    };
  }

  // 비대칭 폴리오미노 회전 vs 거울 반전 찾기
  function rotPts(pts, times) {
    let cur = pts.map(([x, y]) => [x, y]);
    for (let t = 0; t < times; t++) cur = cur.map(([x, y]) => [3 - y, x]);
    const minX = Math.min(...cur.map(p => p[0])), minY = Math.min(...cur.map(p => p[1]));
    return cur.map(([x, y]) => [x - minX, y - minY]);
  }
  function flipPts(pts) {
    const cur = pts.map(([x, y]) => [3 - x, y]);
    const minX = Math.min(...cur.map(p => p[0])), minY = Math.min(...cur.map(p => p[1]));
    return cur.map(([x, y]) => [x - minX, y - minY]);
  }
  const polyKey = pts => pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => `${p[0]},${p[1]}`).join(";");

  const POLY_BASES = [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], // L
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], // P
    [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3]], // Y
    [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]], // N
    [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], // F
  ];

  function renderPolySvg(pts, color = "#38bdf8") {
    const maxX = Math.max(...pts.map(p => p[0])), maxY = Math.max(...pts.map(p => p[1]));
    const cell = 18;
    const ox = (96 - (maxX + 1) * cell) / 2, oy = (96 - (maxY + 1) * cell) / 2;
    const rects = pts.map(([x, y]) => `<rect x="${ox + x * cell + 1}" y="${oy + y * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="${color}" stroke="#0f172a" stroke-width="1.5"/>`).join("");
    return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="92" height="92" rx="12" fill="#131c2e" stroke="#334155" stroke-width="2"/>${rects}</svg>`;
  }

  function genShapeRotate(r, tier) {
    const base = rotPts(pick(r, POLY_BASES), 0);
    const rotSet = new Set([0, 1, 2, 3].map(t => polyKey(rotPts(base, t))));
    const ansTimes = randInt(r, 1, 3);
    const ansPts = rotPts(base, ansTimes);

    const flipped = flipPts(base);
    const decoys = [];
    const usedKeys = new Set(rotSet);
    for (let t = 0; t < 4; t++) {
      const f = rotPts(flipped, t);
      const k = polyKey(f);
      if (!usedKeys.has(k)) { usedKeys.add(k); decoys.push(f); }
    }
    // 혹시 비대칭성 부족 시 변형 1칸 이동 오답 보강
    let g = 0;
    while (decoys.length < 3 && g++ < 30) {
      const alt = rotPts(pick(r, POLY_BASES), randInt(r, 0, 3));
      const k = polyKey(alt);
      if (!usedKeys.has(k)) { usedKeys.add(k); decoys.push(alt); }
    }

    const opts = shuffled(r, [{ pts: ansPts, ok: true }, ...decoys.slice(0, 3).map(pts => ({ pts, ok: false }))]);
    const answer = opts.findIndex(o => o.ok);
    const col = tier === "hard" ? "#f472b6" : "#38bdf8";

    return {
      cat: "shape", sub: "rotate", tier, type: "choice",
      title: "보기 중 왼쪽 도형을 회전(뒤집기 X)하여 만들 수 있는 것은?",
      promptHtml: `<div class="br-rot-target">${renderPolySvg(base, "#fbbf24")}<span>기준 도형을 시계·반시계로 돌리기만 했을 때 같은 모양은?</span></div>`,
      choices: opts.map(o => ({ svg: renderPolySvg(o.pts, col) })),
      answer,
      explain: {
        rule: "평면 회전과 거울 반전 구별",
        hint1: "머릿속으로 도형의 '툭 튀어나온 끝'이 시계 방향으로 돌렸을 때 어느 쪽을 향하는지 따라가 보세요.",
        hint2: `정답은 기준 도형을 시계 방향으로 ${ansTimes * 90}° 회전한 모양입니다 (나머지는 뒤집힌 거울상).`,
        steps: [`기준 도형을 시계 방향으로 ${ansTimes * 90}° 회전하면 정답과 완전히 겹칩니다.`, "나머지 3개는 좌우가 뒤집혀 회전만으로는 겹치지 않습니다."],
      },
    };
  }

  // ── 2) 수 · 패턴 (num) ─────────────────────────────────────────────────────
  function genNumSeq(r, tier) {
    const kind = tier === "easy" ? pick(r, ["arith", "step"]) : tier === "normal" ? pick(r, ["step", "alt", "mulAdd"]) : pick(r, ["alt", "fibMix", "square"]);
    let seq = [], ruleTxt = "", hint1 = "", hint2 = "";

    if (kind === "arith") {
      const s = randInt(r, 2, 15), d = randInt(r, 3, 9) * (r() < 0.25 ? -1 : 1) || 4;
      seq = Array.from({ length: 6 }, (_, i) => s + i * d);
      ruleTxt = `앞 수에 일정하게 ${d >= 0 ? "+" + d : d}씩 변하는 등차수열`;
      hint1 = "이웃한 두 수의 차이(뺄셈)가 모두 같은지 확인해 보세요.";
      hint2 = `매번 ${d >= 0 ? "+" + d : d}씩 더해집니다.`;
    } else if (kind === "step") {
      const s = randInt(r, 1, 10), d0 = randInt(r, 2, 5), dd = randInt(r, 2, 4);
      seq = [s];
      for (let i = 0; i < 5; i++) seq.push(seq[i] + d0 + i * dd);
      ruleTxt = `계차가 ${d0}, ${d0 + dd}, ${d0 + 2 * dd}... 로 ${dd}씩 커지는 수열`;
      hint1 = "인접한 두 수 사이의 '차이'를 먼저 나열해 보세요.";
      hint2 = `차이가 ${d0}부터 시작해서 매 단계 +${dd}씩 커집니다.`;
    } else if (kind === "alt") {
      const a0 = randInt(r, 3, 12), da = randInt(r, 3, 7);
      const b0 = randInt(r, 20, 45), db = -randInt(r, 2, 5);
      seq = [a0, b0, a0 + da, b0 + db, a0 + 2 * da, b0 + 2 * db];
      ruleTxt = `홀수 번째(+${da})와 짝수 번째(${db})가 번갈아 진행하는 이중 수열`;
      hint1 = "한 칸씩 건너뛰며(1·3·5번째 / 2·4·6번째) 따로 살펴보세요.";
      hint2 = `6번째(짝수 번째) 자리이므로 2·4번째 흐름(${db})을 이어가면 됩니다.`;
    } else if (kind === "mulAdd") {
      const s = randInt(r, 1, 4), m = 2, add = randInt(r, 1, 3);
      seq = [s];
      for (let i = 0; i < 5; i++) seq.push(seq[i] * m + add);
      ruleTxt = `앞 수 × ${m} + ${add}`;
      hint1 = "수가 빠르게 커지므로 두 배(×2) 근처 규칙을 의심해 보세요.";
      hint2 = `직전 수에 ${m}을 곱한 뒤 ${add}을 더합니다.`;
    } else if (kind === "fibMix") {
      const a = randInt(r, 1, 5), b = randInt(r, 2, 7), c = randInt(r, 1, 3);
      seq = [a, b];
      for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2] + c);
      ruleTxt = `앞의 두 수를 더한 뒤 +${c}`;
      hint1 = "바로 앞 두 숫자를 서로 더해 보세요. 공통으로 남는 숫자가 있나요?";
      hint2 = `앞 두 수의 합에 항상 +${c}을 더합니다.`;
    } else {
      const off = randInt(r, 1, 5);
      seq = Array.from({ length: 6 }, (_, i) => (i + 2) * (i + 2) + off);
      ruleTxt = `(2², 3², 4², 5², 6², 7²)에 각각 +${off}`;
      hint1 = "제곱수(4, 9, 16, 25, 36, 49)와 비교해 보세요.";
      hint2 = `자연수의 제곱에 모두 +${off}을 더한 값입니다.`;
    }

    const ans = seq[5];
    const { choices, answer } = distinctNumChoices(r, ans, Math.max(2, Math.abs(seq[4] - seq[3])));
    const boxes = seq.slice(0, 5).map(n => `<span class="br-seq-n">${n}</span>`).join("") + `<span class="br-seq-n q">?</span>`;

    return {
      cat: "num", sub: "seq", tier, type: "choice",
      title: "수열의 규칙을 찾아 ?에 알맞은 수를 고르세요",
      promptHtml: `<div class="br-seq">${boxes}</div>`,
      choices, answer,
      explain: { rule: ruleTxt, hint1, hint2, steps: [ruleTxt, `따라서 6번째 수는 ${ans}입니다.`] },
    };
  }

  function genNumGrid(r, tier) {
    const sum = tier === "easy" ? randInt(r, 15, 24) : randInt(r, 24, 42);
    const a = randInt(r, 2, Math.floor(sum / 3));
    const b = randInt(r, 2, Math.floor((sum - a) / 2));
    const c = sum - a - b;
    // 각 행의 합이 sum 이고 열도 규칙이 되도록 3x3 생성
    const d = randInt(r, 1, Math.floor(sum / 3));
    const e = randInt(r, 1, Math.floor((sum - d) / 2));
    const f = sum - d - e;
    const g = randInt(r, 2, Math.floor(sum / 3));
    const h = randInt(r, 2, Math.floor((sum - g) / 2));
    const ans = sum - g - h;

    const cells = [a, b, c, d, e, f, g, h, "?"];
    const html = `<div class="br-ngrid">${cells.map(v => `<div class="br-ncell${v === "?" ? " q" : ""}">${v}</div>`).join("")}</div>`;
    const { choices, answer } = distinctNumChoices(r, ans, 3);
    return {
      cat: "num", sub: "grid", tier, type: "choice",
      title: "각 가로줄 3개 숫자의 합이 모두 같을 때, ?에 들어갈 수는?",
      promptHtml: html,
      choices, answer,
      explain: {
        rule: `가로줄 합이 모두 ${sum}으로 일정`,
        hint1: "위 첫째·둘째 줄의 숫자 3개를 각각 모두 더해 보세요.",
        hint2: `모든 가로줄의 합이 ${sum}입니다. 마지막 줄 ${g} + ${h} + ? = ${sum}`,
        steps: [`첫째 줄: ${a}+${b}+${c} = ${sum}`, `마지막 줄: ${sum} - ${g} - ${h} = ${ans}`],
      },
    };
  }

  function genNumEq(r, tier = "normal") {
    const hi = tier === "easy" ? 6 : tier === "hard" ? 16 : 11;
    const lo = tier === "easy" ? 1 : tier === "hard" ? 4 : 2;
    const x = randInt(r, lo + 1, hi);
    const y = randInt(r, lo, hi - 1);
    const z = randInt(r, 1, Math.max(4, hi - 2));
    const line1 = x + x;
    const line2 = x + y;
    const line3 = y + z;
    const ans = x + z;
    const { choices, answer } = distinctNumChoices(r, ans, 2);
    const html = `<div class="br-eq">
      <div>★ + ★ = <b>${line1}</b></div>
      <div>★ + ◆ = <b>${line2}</b></div>
      <div>◆ + ● = <b>${line3}</b></div>
      <div class="ask">★ + ● = <b>?</b></div>
    </div>`;
    return {
      cat: "num", sub: "eq", tier, type: "choice",
      title: "기호가 나타내는 값을 구해 ?를 맞히세요",
      promptHtml: html,
      choices, answer,
      explain: {
        rule: "기호 방정식 순차 대입",
        hint1: "맨 윗줄(★+★)부터 ★ 하나가 얼마인지 먼저 구하세요.",
        hint2: `★=${x}, ◆=${y}, ●=${z}입니다.`,
        steps: [`★ = ${x}`, `◆ = ${line2} - ${x} = ${y}`, `● = ${line3} - ${y} = ${z}`, `★ + ● = ${x} + ${z} = ${ans}`],
      },
    };
  }

  // ── 3) 추리 · 논리 (logic) ──────────────────────────────────────────────────
  const PEOPLE = ["민수", "지민", "규호", "서연"];

  function genLogicLiar(r, tier) {
    const names = PEOPLE.slice(0, 4);
    const n = names.length;
    const truthMode = tier === "easy" ? true : r() < 0.5; // true = 정확히 1명만 참, false = 정확히 1명만 거짓

    // 유일해가 나오는 진술 조합을 시드 기반으로 결정적 탐색 (4지선다 고정)
    for (let attempt = 0; attempt < 90; attempt++) {
      const statements = names.map((speaker, idx) => {
        const targetIdx = (idx + 1 + Math.floor(r() * (n - 1))) % n;
        const type = (tier === "easy" ? r() < 0.7 : r() < 0.5) ? "is" : "not";
        return {
          speaker,
          targetIdx,
          type,
          text: type === "is" ? `"범인은 <b>${names[targetIdx]}</b>예요."` : `"<b>${names[targetIdx]}</b>${josa(names[targetIdx], "은/는")} 범인이 아니에요."`,
        };
      });

      const matchingCulprits = [];
      for (let c = 0; c < n; c++) {
        let trues = 0;
        for (const st of statements) {
          const isTrue = st.type === "is" ? c === st.targetIdx : c !== st.targetIdx;
          if (isTrue) trues++;
        }
        const ok = truthMode ? trues === 1 : trues === n - 1;
        if (ok) matchingCulprits.push(c);
      }

      if (matchingCulprits.length === 1) {
        const ansIdx = matchingCulprits[0];
        const condTxt = truthMode ? `이 중 <b>정확히 1명만 참</b>을 말하고 나머지는 거짓입니다.` : `이 중 <b>정확히 1명만 거짓</b>을 말하고 나머지는 참입니다.`;
        const promptHtml = `<div class="br-logic-box"><p class="cond">🔍 ${condTxt}</p>${statements.map(s => `<div class="br-quote"><b>${s.speaker}</b>: ${s.text}</div>`).join("")}</div>`;
        const ansName = names[ansIdx];
        const choices = names.map(nm => ({ label: nm }));
        const truesList = statements.map(s => {
          const isT = s.type === "is" ? ansIdx === s.targetIdx : ansIdx !== s.targetIdx;
          return `${s.speaker}(${isT ? "참" : "거짓"})`;
        }).join(", ");

        return {
          cat: "logic", sub: "liar", tier, type: "choice",
          title: "논리적으로 따졌을 때 범인은 누구인가요?",
          promptHtml,
          choices,
          answer: ansIdx,
          explain: {
            rule: "가정법 연역 추론",
            hint1: "각 사람을 한 명씩 '범인'이라고 가정했을 때 참/거짓 인원 조건이 맞는지 세어 보세요.",
            hint2: `범인이 ${ansName}일 때만 조건(${truthMode ? "참 1명" : "거짓 1명"})이 정확히 성립합니다.`,
            steps: [`${ansName}${josa(ansName, "이/가")} 범인이라고 가정하면 진술 진위가 [${truesList}]로 조건을 만족합니다.`, "다른 사람을 범인으로 두면 참/거짓 개수가 맞지 않아 모순입니다."],
          },
        };
      }
    }
    return genLogicZebra(r, tier);
  }

  function permArr(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permArr(rest)) out.push([arr[i], ...p]);
    }
    return out;
  }

  function genLogicZebra(r, tier) {
    const activeNames = ["민수", "지민", "규호", "서연"];
    const activeRooms = ["파랑 방", "초록 방", "노랑 방", "빨강 방"];
    const activePets = ["고양이", "강아지", "부엉이", "토끼"];
    const roomPerms = permArr(activeRooms); // 24
    const petPerms = tier === "easy" ? [activePets] : permArr(activePets); // easy: 2속성, normal/hard: 3속성

    for (let attempt = 0; attempt < 40; attempt++) {
      const solR = shuffled(r, activeRooms);
      const solP = shuffled(r, activePets);
      const targetIdx = randInt(r, 0, 3);
      const askedRoom = solR[targetIdx];
      const ansName = activeNames[targetIdx];

      // 후보 단서 풀 생성 (정답 인물↔방 직접 스포일러는 제외)
      const pool = [];
      for (let i = 0; i < 4; i++) {
        // 사람 ↔ 방 긍정(최대 일부), 부정
        if (i !== targetIdx) {
          pool.push({
            kind: "pr_yes",
            text: `<b>${activeNames[i]}</b>${josa(activeNames[i], "은/는")} <b>${solR[i]}</b>에 있습니다.`,
            test: (R) => R[i] === solR[i],
          });
        }
        for (let j = 0; j < 4; j++) {
          if (solR[i] !== activeRooms[j]) {
            pool.push({
              kind: "pr_no",
              text: `<b>${activeNames[i]}</b>${josa(activeNames[i], "은/는")} <b>${activeRooms[j]}</b>에 있지 않습니다.`,
              test: (R) => R[i] !== activeRooms[j],
            });
          }
        }
        if (tier !== "easy") {
          // 사람 ↔ 동물
          pool.push({
            kind: "pp_yes",
            usesPet: true,
            text: `<b>${activeNames[i]}</b>${josa(activeNames[i], "은/는")} <b>${solP[i]}</b>의 주인입니다.`,
            test: (_R, P) => P[i] === solP[i],
          });
          // 방 ↔ 동물
          pool.push({
            kind: "rp_yes",
            usesPet: true,
            text: `<b>${solR[i]}</b>에 있는 사람은 <b>${solP[i]}</b>${josa(solP[i], "과/와")} 함께 있습니다.`,
            test: (R, P) => R.some((rm, k) => rm === solR[i] && P[k] === solP[i]),
          });
          for (let j = 0; j < 4; j++) {
            if (activeRooms[j] !== solR[i]) {
              pool.push({
                kind: "rp_no",
                usesPet: true,
                text: `<b>${solP[i]}</b>${josa(solP[i], "은/는")} <b>${activeRooms[j]}</b>에 있지 않습니다.`,
                test: (R, P) => R.every((rm, k) => !(P[k] === solP[i] && rm === activeRooms[j])),
              });
            }
          }
        }
      }

      // 셔플 후 1) 긍정 사람↔방 단서는 최대 1개, 2) 유일해 달성까지 단서 수집
      const picked = [];
      let prYesCount = 0;
      for (const c of shuffled(r, pool)) {
        if (c.kind === "pr_yes" && prYesCount >= 1) continue;
        // normal/hard는 연결 추리를 유도하기 위해 직접 방 긍정은 최소화
        if (tier === "hard" && c.kind === "pr_yes") continue;
        picked.push(c);
        if (c.kind === "pr_yes") prYesCount++;
      }

      const checkUnique = (list) => {
        const roomOnly = list.filter(c => !c.usesPet);
        let count = 0;
        for (const Rp of roomPerms) {
          if (!roomOnly.every(c => c.test(Rp, activePets))) continue;
          for (const Pp of petPerms) {
            if (list.every(c => c.test(Rp, Pp))) {
              count++;
              if (count > 1) return false;
            }
          }
        }
        return count === 1;
      };

      // 앞쪽 일부에서 유일해가 되는 접두사를 찾고 불필요한 중복 조건을 1개씩 제거 (최소 단서 집합!)
      let minimal = null;
      const built = [];
      for (const c of picked) {
        built.push(c);
        if (checkUnique(built)) {
          minimal = built.slice();
          break;
        }
      }
      if (!minimal) continue;

      for (let idx = minimal.length - 1; idx >= 0; idx--) {
        const trial = minimal.filter((_, j) => j !== idx);
        if (checkUnique(trial)) minimal = trial;
      }

      // normal/hard에서는 반려동물 조건이 실제로 답에 기여해야(더미 조건 금지!) 채택
      if (tier !== "easy") {
        const nonPet = minimal.filter(c => !c.usesPet);
        const targetAmbiguousWithoutPet = new Set(
          roomPerms.filter(Rp => nonPet.every(c => c.test(Rp, activePets))).map(Rp => Rp.indexOf(askedRoom))
        ).size > 1;
        if (!targetAmbiguousWithoutPet) continue;
      }
      if (minimal.length < 3 || minimal.length > 7) continue;

      const finalClues = shuffled(r, minimal);
      const premiseHtml = tier === "easy"
        ? `🏠 <b>민수·지민·규호·서연</b> 네 사람이 <b>파랑·초록·노랑·빨강 방</b>에 각각 한 명씩 있습니다.`
        : `🏠 <b>민수·지민·규호·서연</b>이 <b>파랑·초록·노랑·빨강 방</b>에 하나씩 있고, <b>고양이·강아지·부엉이·토끼</b>를 한 마리씩 데리고 있습니다.`;

      const opts = shuffled(r, activeNames);
      const fullPairs = activeNames.map((n, i) =>
        tier === "easy" ? `${n}=${solR[i]}` : `${n}=${solR[i]}(${solP[i]})`
      ).join(" · ");

      return {
        cat: "logic", sub: "zebra", tier, type: "choice",
        title: `전제와 조건을 모두 만족할 때, '${askedRoom}'에 있는 사람은 누구인가요?`,
        promptHtml: `<div class="br-logic-box"><p class="cond">${premiseHtml}</p>${finalClues.map((c, i) => `<div class="br-quote">${i + 1}. ${c.text}</div>`).join("")}</div>`,
        choices: opts.map(nm => ({ label: nm })),
        answer: opts.indexOf(ansName),
        explain: {
          rule: "조건표(아인슈타인) 연역",
          hint1: tier === "easy"
            ? "각 방에 들어갈 수 없는 사람을 하나씩 지워 보면서 소거해 보세요."
            : "같은 동물이나 방으로 바로 이어지는 두 조건을 먼저 짝지어 보세요.",
          hint2: tier === "easy"
            ? `확정된 방과 소거 조건을 차례로 적용하면 '${askedRoom}'의 주인이 남습니다.`
            : `'${askedRoom}'에 있는 동물('${solP[targetIdx]}')${josa(solP[targetIdx], "과/와")} 그 주인을 연결해 보세요.`,
          steps: [
            `전체 짝: ${fullPairs}`,
            `따라서 '${askedRoom}'에 있는 사람은 ${ansName}입니다.`,
          ],
        },
      };
    }

    // 극단적 시드 대비 안전 폴백 (전제 포함 유일해 고정 패턴)
    const fallbackNames = shuffled(r, activeNames);
    const fallbackRooms = shuffled(r, activeRooms);
    const ansName = fallbackNames[3];
    const askedRoom = fallbackRooms[3];
    const clues = [
      `<b>${fallbackNames[0]}</b>${josa(fallbackNames[0], "은/는")} <b>${fallbackRooms[0]}</b>에 있습니다.`,
      `<b>${fallbackNames[1]}</b>${josa(fallbackNames[1], "은/는")} <b>${fallbackRooms[1]}</b>에 있습니다.`,
      `<b>${fallbackNames[2]}</b>${josa(fallbackNames[2], "은/는")} <b>${fallbackRooms[3]}</b>에 있지 않습니다.`,
    ];
    const opts = shuffled(r, activeNames);
    return {
      cat: "logic", sub: "zebra", tier, type: "choice",
      title: `전제와 조건을 모두 만족할 때, '${askedRoom}'에 있는 사람은 누구인가요?`,
      promptHtml: `<div class="br-logic-box"><p class="cond">🏠 <b>민수·지민·규호·서연</b> 네 사람이 <b>파랑·초록·노랑·빨강 방</b>에 각각 한 명씩 있습니다.</p>${clues.map((txt, i) => `<div class="br-quote">${i + 1}. ${txt}</div>`).join("")}</div>`,
      choices: opts.map(nm => ({ label: nm })),
      answer: opts.indexOf(ansName),
      explain: {
        rule: "조건표(아인슈타인) 연역",
        hint1: "이미 정해진 두 사람부터 자리를 채운 뒤 남은 두 방에 대입해 보세요.",
        hint2: `${fallbackNames[2]}${josa(fallbackNames[2], "은/는")} '${fallbackRooms[3]}'이 아니므로 '${fallbackRooms[2]}'에 들어갑니다.`,
        steps: [
          `전체 짝: ${fallbackNames.map((n, i) => `${n}=${fallbackRooms[i]}`).join(" · ")}`,
          `따라서 '${askedRoom}'에 있는 사람은 ${ansName}입니다.`,
        ],
      },
    };
  }

  // ── 4) 기억 · 집중 (mem) ───────────────────────────────────────────────────
  function genMemory(r, tier, idxHint = 0) {
    const gridSize = tier === "easy" ? 3 : 4;
    const total = gridSize * gridSize;
    const kind = (idxHint % 2 === 0) ? "order" : "pattern";
    const count = kind === "order"
      ? (tier === "easy" ? 4 : tier === "normal" ? 5 : 6)
      : (tier === "easy" ? 4 : tier === "normal" ? 5 : 6);
    const viewMs = tier === "easy" ? 2400 : tier === "normal" ? 1900 : 1450;

    const allIdx = Array.from({ length: total }, (_, i) => i);
    const targets = shuffled(r, allIdx).slice(0, count);

    return {
      cat: "mem",
      sub: kind,
      tier,
      type: "memory",
      gridSize,
      kind,
      targets,
      viewMs,
      title: kind === "order"
        ? `숫자 1부터 ${count}까지의 위치를 기억해 순서대로 눌러 주세요!`
        : `반짝이는 ${count}개 칸의 위치를 기억해 모두 찾아 눌러 주세요!`,
      explain: {
        rule: kind === "order" ? "시공간 순서 작업기억" : "시각 패턴 위치 기억",
        hint1: kind === "order" ? "칸을 하나씩 보지 말고 1→2→3을 선으로 이어 모양을 그려 기억하세요." : "반짝이는 칸들을 큰 도형(삼각형·기역자 등)으로 묶어서 외우면 오래 남습니다.",
        hint2: `목표 칸 위치(1행1열=1번 기준): ${targets.map(t => `(${Math.floor(t / gridSize) + 1}행${(t % gridSize) + 1}열)`).join(" → ")}`,
        steps: [`격자 크기 ${gridSize}×${gridSize}, 기억할 칸 ${count}개 (${(viewMs / 1000).toFixed(1)}초 노출)`],
      },
    };
  }

  function generateQuestion(cat, tier = "normal", seed = 1, seqIdx = 0, subIdx = seqIdx) {
    const r = mulberry32(`${seed}|${cat}|${tier}|${seqIdx}`);
    const sTag = `${hashSeed(seed)}_${seqIdx}`;
    if (cat === "shape") {
      return subIdx % 2 === 0 ? genShapeMatrix(r, tier, sTag) : genShapeRotate(r, tier);
    }
    if (cat === "num") {
      const m = ((subIdx % 3) + 3) % 3;
      return m === 0 ? genNumSeq(r, tier) : m === 1 ? genNumGrid(r, tier) : genNumEq(r, tier);
    }
    if (cat === "logic") {
      return subIdx % 2 === 0 ? genLogicLiar(r, tier) : genLogicZebra(r, tier);
    }
    return genMemory(r, tier, subIdx);
  }

  // 종합 챌린지 8문제: 4대 영역 각 2문제씩 (영역별 하위 유형도 모두 출제되도록 subIdx 분리)
  function generateExam(seed, tier = "normal") {
    const order = ["shape", "num", "logic", "mem", "shape", "num", "logic", "mem"];
    const numShift = hashSeed(seed) % 3;
    return order.map((cat, i) => {
      const roundIdx = Math.floor(i / 4);
      const subIdx = cat === "num" ? numShift + roundIdx : roundIdx;
      return {
        ...generateQuestion(cat, tier, seed, i, subIdx),
        qIndex: i,
      };
    });
  }

  function gradeOf(total) {
    if (total >= 90) return { label: "🏆 그랜드마스터", cls: "s" };
    if (total >= 75) return { label: "👑 전략가", cls: "a" };
    if (total >= 60) return { label: "🧭 분석가", cls: "b" };
    if (total >= 40) return { label: "🌱 탐험가", cls: "c" };
    return { label: "🐾 새싹", cls: "d" };
  }

  // 100점 만점 (각 영역 25점 = 정답 1개당 11점 + 빠른 풀이 보너스 최대 1.5점 -> 합산 반올림 max 25)
  function scoreExam(results, tier = "normal") {
    const domains = { shape: 0, num: 0, logic: 0, mem: 0 };
    const counts = { shape: 0, num: 0, logic: 0, mem: 0 };
    let correct = 0;
    const targetMs = tier === "hard" ? 22000 : tier === "normal" ? 18000 : 15000;

    for (const row of results || []) {
      if (!row || !(row.cat in domains)) continue;
      counts[row.cat]++;
      if (row.ok) {
        correct++;
        const ms = Math.max(800, Number(row.ms) || targetMs);
        const speedBonus = ms <= targetMs ? 1.5 * Math.max(0, 1 - ms / (targetMs * 1.4)) : 0;
        domains[row.cat] += 11 + speedBonus;
      }
    }
    for (const k of Object.keys(domains)) {
      domains[k] = Math.min(25, Math.round(domains[k]));
    }
    const total = domains.shape + domains.num + domains.logic + domains.mem;
    return { total, domains, correct, count: (results || []).length, grade: gradeOf(total) };
  }

  function summarizeHistory(records) {
    const arr = Array.isArray(records) ? records.filter(x => x && Number.isFinite(+x.total)) : [];
    if (!arr.length) return { count: 0, latest: null, prev: null, delta: null, best: null, avg5: null, domainDelta: {} };
    const latest = arr[arr.length - 1];
    const prev = arr.length >= 2 ? arr[arr.length - 2] : null;
    const best = Math.max(...arr.map(x => +x.total));
    const last5 = arr.slice(-5);
    const avg5 = Math.round(last5.reduce((s, x) => s + (+x.total), 0) / last5.length);
    const domainDelta = {};
    for (const c of CATS) {
      const id = c.id;
      const curV = (latest.domains && latest.domains[id]) ?? 0;
      const prevV = prev && prev.domains ? (prev.domains[id] ?? 0) : null;
      domainDelta[id] = prevV == null ? null : curV - prevV;
    }
    return {
      count: arr.length,
      latest,
      prev,
      delta: prev ? latest.total - prev.total : null,
      best,
      avg5,
      domainDelta,
    };
  }

  return {
    CATS, CAT_MAP, mulberry32, hashSeed,
    generateQuestion, generateExam, scoreExam, summarizeHistory, gradeOf,
  };
});
