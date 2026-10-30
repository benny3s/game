/* 땅따먹기 — 게임 규칙 (그리기와 상관없이 브라우저·Node 어디서나 똑같이 돌아감)
   · 상태 = 객체 하나 (칸 배열 owner·trail 은 Uint8Array, toJSON/fromJSON 으로 JSON 변환)
   · 고정 틱: 한 틱에 모두 한 칸씩 (초당 8칸). 난수는 상태 안의 mulberry32 → 같은 씨앗 + 같은 입력 = 같은 결과
   · step(state, actions) 은 state 를 바로 고치고, 소리·효과용 events 배열을 돌려줌
   규칙 요약
   · 내 땅 밖으로 나가면 지나간 칸에 선이 생김. 다시 내 땅에 들어오면 선 + 둘러싸인 칸(남의 땅 포함)이 모두 내 땅
   · 누가 내 선을 밟으면 나만 아웃 (밟은 쪽은 무사). 내 선을 내가 밟아도, 종이 밖으로 나가도 아웃
   · 머리끼리 같은 칸에 들어가면: 그 칸이 둘 중 한 명의 땅이면 땅 주인만 살고, 아니면 모두 아웃
   · 땅을 먹을 때 새로 칠해진 칸 위에 머리가 있던 사람은 포위당해 아웃. 땅이 하나도 안 남아도 아웃
   · 아웃되면 선과 땅이 모두 사라짐. 클래식은 2초 뒤 새 5x5 땅에서 다시, 한 목숨은 그대로 끝 */
(function (root) {
  'use strict';

  const C = { TPS: 8, BASE: 2, RESPAWN: 16, LIMIT: 180, OBS_R: 10, OBS_CH: 6, OBS_SC: 8 };
  C.OBS_S = 2 * C.OBS_R + 1;
  C.OBS_N = C.OBS_S * C.OBS_S * C.OBS_CH + C.OBS_SC;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];                 // 방향: 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽 (화면 좌표, y는 아래로)
  const ACT = { KEEP: 0, LEFT: 1, RIGHT: 2, UP: 3, EAST: 4, DOWN: 5, WEST: 6 };   // 0~2 상대(학습용), 3~6 절대(사람 입력)
  const CAUSES = ['cut', 'self', 'wall', 'crash', 'trap', 'wipe'];

  // ── 난수 (mulberry32 — 상태 안에 보관해서 저장·복원해도 이어짐)
  function rand(st) {
    let t = (st.rng = (st.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const randInt = (st, n) => Math.floor(rand(st) * n);

  // 인원에 맞춘 판 크기 (8명 = 72x72)
  const sizeFor = n => Math.max(30, Math.min(100, Math.round(24 * Math.sqrt(n)) + 4));

  // 행동 → 새 방향 (180도 되돌기는 무시)
  function turn(dir, a) {
    if (a === 1) return (dir + 3) & 3;
    if (a === 2) return (dir + 1) & 3;
    if (a >= 3 && a <= 6) { const d = a - 3; return d === ((dir + 2) & 3) ? dir : d; }
    return dir;
  }

  // ── 작업용 배열 (상태 밖. 쓸 때마다 새 도장 번호로 표시해서 결과에 영향 없음)
  let MARK = new Uint32Array(0), QUEUE = new Int32Array(0), STAMP = 0;
  function stamp(n) {
    if (MARK.length < n) { MARK = new Uint32Array(n); QUEUE = new Int32Array(n); STAMP = 0; }
    if (++STAMP >= 0xFFFFFFF0) { MARK.fill(0); STAMP = 1; }
    return STAMP;
  }

  function newPlayer(id) {
    return {
      id, alive: false, out: false, fresh: false, x: 0, y: 0, dir: 0,
      trail: [], exit: -1,            // trail: 선 칸 번호(순서대로, 마지막 = 머리 칸) · exit: 선을 시작한 내 땅 칸
      area: 0, box: [0, 0, 0, 0],      // box: 내 땅이 들어 있는 사각형 (넉넉하게, 줄지 않음)
      kills: 0, deaths: 0, best: 0, peak: 0, aliveT: 0, lifeT: 0,
      wait: 0, dieT: -1, deadArea: 0, cause: '', killer: -1,
    };
  }

  function setOwner(st, c, k) {
    const o = st.owner[c];
    if (o === k) return;
    if (o) st.players[o - 1].area--;
    if (k) st.players[k - 1].area++;
    st.owner[c] = k;
  }

  // 5x5 새 땅 + 머리를 가운데에 (판 가운데 쪽을 보고 시작)
  function placeBase(st, p, cx, cy) {
    const B = C.BASE, k = p.id + 1, W = st.W;
    if (p.area > 0) {
      for (let i = 0; i < st.owner.length; i++) if (st.owner[i] === k) setOwner(st, i, 0);
    }
    for (const c of p.trail) if (st.trail[c] === k) st.trail[c] = 0;
    for (let y = cy - B; y <= cy + B; y++) for (let x = cx - B; x <= cx + B; x++) setOwner(st, y * W + x, k);
    const dx = (st.W - 1) / 2 - cx, dy = (st.H - 1) / 2 - cy;
    p.dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : 3) : (dy >= 0 ? 2 : 0);
    p.x = cx; p.y = cy; p.alive = true; p.fresh = true; p.trail = []; p.exit = -1;
    p.box = [cx - B, cy - B, cx + B, cy + B]; p.lifeT = 0; p.wait = 0;
    if (p.area > p.peak) p.peak = p.area;
  }

  function create(opts, seed) {
    opts = opts || {};
    const n = Math.max(1, Math.min(32, (opts.n | 0) || 8));
    const W = (opts.size | 0) || sizeFor(n), H = W;
    const st = {
      ver: 1, W, H, n, mode: opts.mode === 'life' ? 'life' : 'classic',
      tick: 0, limit: Math.round((opts.limitSec || C.LIMIT) * C.TPS),
      seed: seed >>> 0, rng: ((seed >>> 0) ^ 0x9E3779B9) >>> 0,
      owner: new Uint8Array(W * H), trail: new Uint8Array(W * H),
      players: [], over: false, results: null,
    };
    for (let i = 0; i < n; i++) st.players.push(newPlayer(i));
    // 처음 자리: 후보 여러 개 중 이미 정한 자리·벽에서 가장 먼 곳
    const lo = C.BASE + 3, span = Math.max(1, W - 2 * lo), spots = [];
    for (let i = 0; i < n; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < 48; k++) {
        const x = lo + randInt(st, span), y = lo + randInt(st, span);
        const wall = Math.min(x, y, W - 1 - x, H - 1 - y) * 2.2;
        let d = wall * wall;
        for (const s of spots) { const dd = (s[0] - x) * (s[0] - x) + (s[1] - y) * (s[1] - y); if (dd < d) d = dd; }
        if (d > bd) { bd = d; best = [x, y]; }
      }
      spots.push(best);
    }
    // 자리 나눠 주는 순서를 섞음 (안 섞으면 0번 = 늘 판 가운데 → 사람·학습 에이전트가 매번 같은 자리)
    for (let i = n - 1; i > 0; i--) { const j = randInt(st, i + 1), t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
    for (let i = 0; i < n; i++) { placeBase(st, st.players[i], spots[i][0], spots[i][1]); st.players[i].fresh = false; }
    return st;
  }

  // ── 한 틱 진행
  function step(st, actions) {
    const ev = [];
    if (st.over) return ev;
    const { W, H, owner, trail, players } = st, n = players.length;
    st.tick++;

    // 1) 다시 태어나기 (클래식만, 2초 뒤. 안전한 자리가 없으면 다음 틱에 다시 시도)
    if (st.mode === 'classic') for (const p of players) {
      if (p.alive) continue;
      if (p.wait > 0) p.wait--;
      if (p.wait <= 0 && respawn(st, p, ev)) ev.push({ t: 'spawn', p: p.id, x: p.x, y: p.y });
    }

    // 2) 방향 바꾸고 다음 칸 정하기 (원인 우선순위: cut > crash > self > wall, 플레이어 번호에 영향받지 않게)
    const PRIO = { wall: 1, self: 2, crash: 3, cut: 4 };
    const tgt = new Array(n).fill(-1), why = new Array(n).fill(null);
    const mark = (id, cause, by, w) => {
      const cur = why[id];
      if (!cur || PRIO[cause] > PRIO[cur.cause]) why[id] = { cause, by, w: w || null };
    };
    for (const p of players) {
      if (!p.alive || p.fresh) continue;
      p.dir = turn(p.dir, actions ? (actions[p.id] | 0) : 0);
      const nx = p.x + DX[p.dir], ny = p.y + DY[p.dir];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) mark(p.id, 'wall', -1);
      else tgt[p.id] = ny * W + nx;
    }

    // 3) 선 밟기 (틱 시작 때의 선 기준): 선 주인만 아웃, 밟은 쪽은 무사. 내 선이면 나도 아웃
    for (let i = 0; i < n; i++) {
      const c = tgt[i];
      if (c < 0) continue;
      const t = trail[c];
      if (t) { if (t - 1 === i) mark(i, 'self', -1); else mark(t - 1, 'cut', i); }
    }
    // 서로 자리를 바꾸며 서로의 선(머리 칸)을 밟음 = 사실상 머리끼리 박음 → 둘 다 아웃, 누구 공도 아님
    //  (둘 다 자기 땅 위에서 자리를 바꾸면 밟은 선이 없으니 아무 일 없이 엇갈려 지나감)
    for (let i = 0; i < n; i++) {
      const a = why[i];
      if (!a || a.cause !== 'cut' || a.by < i) continue;
      const j = a.by, b = why[j];
      if (b && b.cause === 'cut' && b.by === i && tgt[i] === players[j].y * W + players[j].x && tgt[j] === players[i].y * W + players[i].x) {
        why[i] = { cause: 'crash', by: -1, w: [j] }; why[j] = { cause: 'crash', by: -1, w: [i] };
      }
    }

    // 4) 머리끼리 같은 칸: 그 칸 땅 주인이 있으면 주인만 살고, 없으면 모두 아웃
    const done = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      const c = tgt[i];
      if (c < 0 || done[i]) continue;
      let group = null;
      for (let j = i + 1; j < n; j++) if (tgt[j] === c) { (group || (group = [i])).push(j); done[j] = true; }
      if (!group) continue;
      const home = group.find(id => owner[c] === id + 1);
      for (const id of group) {
        if (id === home) continue;
        mark(id, 'crash', home === undefined ? -1 : home, group.filter(o => o !== id));
      }
    }

    // 5) 아웃 처리 (선·땅 지우기)
    for (let i = 0; i < n; i++) if (why[i]) kill(st, players[i], why[i].cause, why[i].by, ev, why[i].w);

    // 6) 살아남은 사람 한 칸 이동. 내 땅 밖이면 선을 긋고, 선을 든 채 내 땅에 들어오면 땅 먹기
    const closing = [];
    for (const p of players) {
      const c = tgt[p.id];
      if (c < 0 || !p.alive) continue;
      const prev = p.y * W + p.x;
      p.x = c % W; p.y = (c - p.x) / W;
      if (owner[c] === p.id + 1) { if (p.trail.length) closing.push(p); }
      else {
        if (!p.trail.length) { p.exit = prev; ev.push({ t: 'leave', p: p.id }); }
        trail[c] = p.id + 1; p.trail.push(c);
      }
    }

    // 7) 땅 먹기 (같은 틱이면 번호 순)
    for (const p of closing) if (p.alive && p.trail.length) capture(st, p, ev);

    // 8) 시간 · 끝났는지
    let alive = 0;
    for (const p of players) { p.fresh = false; if (p.alive) { alive++; p.aliveT++; p.lifeT++; if (p.area > p.peak) p.peak = p.area; } }
    if (st.tick >= st.limit || (st.mode === 'life' && (n > 1 ? alive <= 1 : alive === 0))) finish(st, ev);
    return ev;
  }

  // 선 → 내 땅, 그다음 바깥에서 물 채우기로 닿지 않는 칸(둘러싸인 칸, 주머니 여러 개도)을 모두 내 땅으로
  function capture(st, p, ev) {
    const { W, H, owner, trail, players } = st, k = p.id + 1, b = p.box, cells = [];
    let stolen = 0;
    for (const c of p.trail) {
      trail[c] = 0;
      if (owner[c] !== k) { if (owner[c]) stolen++; setOwner(st, c, k); cells.push(c); }
      const x = c % W, y = (c - x) / W;
      if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x;
      if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y;
    }
    p.trail = []; p.exit = -1;
    // 내 땅 상자보다 한 칸 넓은 테두리(내 땅이 없는 줄)에서 시작 → 판 가장자리 칸도 바깥과 이어진 것으로
    const x0 = Math.max(0, b[0] - 1), y0 = Math.max(0, b[1] - 1), x1 = Math.min(W - 1, b[2] + 1), y1 = Math.min(H - 1, b[3] + 1);
    const s = stamp(W * H);
    let qh = 0, qt = 0;
    const push = c => { if (MARK[c] !== s && owner[c] !== k) { MARK[c] = s; QUEUE[qt++] = c; } };
    for (let x = x0; x <= x1; x++) { push(y0 * W + x); push(y1 * W + x); }
    for (let y = y0 + 1; y < y1; y++) { push(y * W + x0); push(y * W + x1); }
    while (qh < qt) {
      const c = QUEUE[qh++], x = c % W, y = (c - x) / W;
      if (x > x0) push(c - 1);
      if (x < x1) push(c + 1);
      if (y > y0) push(c - W);
      if (y < y1) push(c + W);
    }
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
      const c = y * W + x;
      if (MARK[c] !== s && owner[c] !== k) { if (owner[c]) stolen++; setOwner(st, c, k); cells.push(c); }
    }
    const s2 = stamp(W * H);
    for (const c of cells) MARK[c] = s2;
    if (cells.length > p.best) p.best = cells.length;
    if (p.area > p.peak) p.peak = p.area;
    ev.push({ t: 'capture', p: p.id, n: cells.length, stolen, cells, x: p.x, y: p.y });
    // 새로 칠한 칸 위에 머리가 있던 사람 = 포위당해 아웃 · 땅이 하나도 안 남은 사람도 아웃
    for (const q of players) {
      if (q === p || !q.alive) continue;
      if (MARK[q.y * W + q.x] === s2) kill(st, q, 'trap', p.id, ev);
      else if (q.area <= 0) kill(st, q, 'wipe', p.id, ev);
    }
  }

  function kill(st, p, cause, by, ev, w) {
    if (!p.alive) return;
    const { W, owner, trail, players } = st, k = p.id + 1, b = p.box;
    for (const c of p.trail) if (trail[c] === k) trail[c] = 0;
    const area = p.area;
    for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const c = y * W + x; if (owner[c] === k) owner[c] = 0; }
    p.trail = []; p.exit = -1; p.area = 0; p.alive = false; p.deaths++;
    p.dieT = st.tick; p.deadArea = area; p.cause = cause; p.killer = by;
    if (by >= 0 && by !== p.id) players[by].kills++;
    if (st.mode === 'life') p.out = true; else p.wait = C.RESPAWN;
    ev.push({ t: 'death', p: p.id, by, cause, x: p.x, y: p.y, area, w: w || null });
  }

  // 다시 태어날 자리: 7x7 안에 선이 없고 다른 머리와 6칸 넘게 떨어진 곳 중, 빈 땅이 많고 먼 곳
  function respawn(st, p, ev) {
    const { W, H, owner, trail, players } = st, B = C.BASE;
    let best = -1, bs = -Infinity;
    for (let t = 0; t < 48; t++) {
      const cx = B + 1 + randInt(st, W - 2 * B - 2), cy = B + 1 + randInt(st, H - 2 * B - 2);
      let ok = true, taken = 0;
      for (let y = cy - B - 1; y <= cy + B + 1 && ok; y++) for (let x = cx - B - 1; x <= cx + B + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = y * W + x;
        if (trail[c]) { ok = false; break; }
        if (owner[c] && Math.abs(x - cx) <= B && Math.abs(y - cy) <= B) taken++;
      }
      if (!ok) continue;
      let near = 99;
      for (const q of players) if (q !== p && q.alive) near = Math.min(near, Math.abs(q.x - cx) + Math.abs(q.y - cy));
      if (near < 6) continue;
      const score = Math.min(near, 24) - taken * 4;
      if (score > bs) { bs = score; best = cy * W + cx; }
    }
    if (best < 0) return false;
    const cx = best % W;
    placeBase(st, p, cx, (best - cx) / W);
    for (const q of players) if (q !== p && q.alive && q.area <= 0) kill(st, q, 'wipe', -1, ev);   // 드묾: 남의 마지막 땅 위에 생긴 경우
    return true;
  }

  // 순위: 클래식 = 끝날 때 땅(아웃 상태면 0) · 한 목숨 = 살아남은 사람 먼저(땅 순), 그다음 늦게 아웃된 순
  function finish(st, ev) {
    st.over = true;
    const life = st.mode === 'life';
    const order = st.players.slice().sort((a, b) => {
      if (life) {
        if (a.alive !== b.alive) return a.alive ? -1 : 1;
        if (!a.alive && a.dieT !== b.dieT) return b.dieT - a.dieT;
        const aa = a.alive ? a.area : a.deadArea, ba = b.alive ? b.area : b.deadArea;
        if (aa !== ba) return ba - aa;
      } else if (a.area !== b.area) return b.area - a.area;
      return b.kills - a.kills || a.id - b.id;
    });
    st.results = order.map((p, i) => {
      const area = p.alive ? p.area : (life ? p.deadArea : 0);
      return { id: p.id, rank: i + 1, area, pct: pct(st, area), kills: p.kills, deaths: p.deaths, best: p.best, bestPct: pct(st, p.best), aliveT: p.aliveT, alive: p.alive };
    });
    ev.push({ t: 'end', results: st.results });
  }

  const pct = (st, a) => Math.round(a / (st.W * st.H) * 1000) / 10;

  // 지금 순위 (화면 순위표용): 땅 넓은 순
  function ranking(st) {
    return st.players.map(p => ({ id: p.id, area: p.area, pct: pct(st, p.area), alive: p.alive, out: p.out }))
      .sort((a, b) => b.area - a.area || a.id - b.id);
  }

  // ── 관찰 (학습용): 내 머리를 가운데, 내가 가는 방향을 위로 돌린 21x21 창 6장 + 숫자 8개
  //   채널: 0 내 땅 · 1 내 선 · 2 남의 땅 · 3 남의 선 · 4 남의 머리 · 5 판 밖
  //   숫자: 0 내 땅 비율 · 1 선 길이/64 · 2 남은 시간 비율 · 3·4 가장 가까운 내 땅 (앞·오른쪽, /32) · 5 그 거리/32 · 6 가장 가까운 남의 머리 거리/32 · 7 살아 있음
  function obs(st, pid, out) {
    const R = C.OBS_R, S = C.OBS_S, A = S * S;
    const o = out && out.length === C.OBS_N ? out.fill(0) : new Float32Array(C.OBS_N);
    const p = st.players[pid];
    if (!p || !p.alive) return o;
    const { W, H, owner, trail, players } = st, k = pid + 1;
    const fx = DX[p.dir], fy = DY[p.dir], rx = -fy, ry = fx;          // 앞 · 오른쪽
    for (let r = 0; r < S; r++) {
      const f = R - r;
      for (let c = 0; c < S; c++) {
        const s = c - R, x = p.x + f * fx + s * rx, y = p.y + f * fy + s * ry, i = r * S + c;
        if (x < 0 || y < 0 || x >= W || y >= H) { o[5 * A + i] = 1; continue; }
        const cell = y * W + x, ow = owner[cell], tr = trail[cell];
        if (ow === k) o[i] = 1; else if (ow) o[2 * A + i] = 1;
        if (tr === k) o[A + i] = 1; else if (tr) o[3 * A + i] = 1;
      }
    }
    let near = 999;
    for (const q of players) {
      if (q === p || !q.alive) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.abs(dx) + Math.abs(dy);
      if (d < near) near = d;
      const r = R - (dx * fx + dy * fy), c = R + (dx * rx + dy * ry);
      if (r >= 0 && r < S && c >= 0 && c < S) o[4 * A + r * S + c] = 1;
    }
    let hd = 0, hx = 0, hy = 0;
    if (owner[p.y * W + p.x] !== k) {
      hd = 999;
      const b = p.box;
      for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) {
        if (owner[y * W + x] !== k) continue;
        const d = Math.abs(x - p.x) + Math.abs(y - p.y);
        if (d < hd) { hd = d; hx = x - p.x; hy = y - p.y; }
      }
    }
    const cl = v => v < -1 ? -1 : v > 1 ? 1 : v, base = C.OBS_CH * A;
    o[base] = p.area / (W * H);
    o[base + 1] = Math.min(1, p.trail.length / 64);
    o[base + 2] = Math.max(0, (st.limit - st.tick) / st.limit);
    if (hd < 999) { o[base + 3] = cl((hx * fx + hy * fy) / 32); o[base + 4] = cl((hx * rx + hy * ry) / 32); o[base + 5] = Math.min(1, hd / 32); }
    else o[base + 5] = 1;
    o[base + 6] = Math.min(1, near / 32);
    o[base + 7] = 1;
    return o;
  }

  // ── 저장 · 복원 · 비교
  function toJSON(st) {
    const o = Object.assign({}, st);
    o.owner = Array.from(st.owner); o.trail = Array.from(st.trail);
    o.players = st.players.map(p => Object.assign({}, p, { trail: p.trail.slice(), box: p.box.slice() }));
    o.results = st.results ? st.results.map(r => Object.assign({}, r)) : null;
    return o;
  }
  function fromJSON(o) {
    if (typeof o === 'string') o = JSON.parse(o);
    const st = Object.assign({}, o);
    st.owner = Uint8Array.from(o.owner); st.trail = Uint8Array.from(o.trail);
    st.players = o.players.map(p => Object.assign({}, p, { trail: p.trail.slice(), box: p.box.slice() }));
    st.results = o.results ? o.results.map(r => Object.assign({}, r)) : null;
    return st;
  }
  const clone = st => fromJSON(toJSON(st));
  function hash(st) {
    let h = 0x811c9dc5;
    const mix = v => { h = Math.imul(h ^ (v | 0), 0x01000193) >>> 0; };
    mix(st.tick); mix(st.rng); mix(st.over ? 1 : 0); mix(st.W);
    for (let i = 0; i < st.owner.length; i++) mix(st.owner[i] | (st.trail[i] << 8));
    for (const p of st.players) {
      mix(p.x); mix(p.y); mix(p.dir); mix(p.alive ? 1 : 0); mix(p.area); mix(p.kills); mix(p.deaths);
      mix(p.wait); mix(p.trail.length); mix(p.exit); mix(p.best);
      for (const c of p.trail) mix(c);
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  // ── 작게 묶기 (온라인 중간 참가·다시 맞추기용): 칸 배열을 [값, 개수, …] 로 줄여 JSON 크기를 수십 분의 일로
  function rle(a) {
    const o = [];
    if (!a.length) return o;
    let v = a[0], k = 0;
    for (let i = 0; i < a.length; i++) { if (a[i] === v) k++; else { o.push(v, k); v = a[i]; k = 1; } }
    o.push(v, k);
    return o;
  }
  function unrle(o, len) {
    const a = new Uint8Array(len);
    for (let j = 0, i = 0; j < o.length; j += 2) { a.fill(o[j], i, i + o[j + 1]); i += o[j + 1]; }
    return a;
  }
  function pack(st) {
    const o = toJSON(Object.assign({}, st, { owner: new Uint8Array(0), trail: new Uint8Array(0) }));
    o.owner = rle(st.owner); o.trail = rle(st.trail); o.packed = 1;
    return o;
  }
  function unpack(o) {
    if (typeof o === 'string') o = JSON.parse(o);
    if (!o.packed) return fromJSON(o);
    const st = fromJSON(Object.assign({}, o, { owner: [], trail: [] }));
    delete st.packed;
    st.owner = unrle(o.owner, o.W * o.H); st.trail = unrle(o.trail, o.W * o.H);
    return st;
  }

  const API = {
    C, DX, DY, ACT, CAUSES, sizeFor, turn, create, step, obs, ranking, pct, toJSON, fromJSON, clone, hash, pack, unpack,
    rand,   // 봇·도구가 쓰는 같은 난수 (상태 대신 {rng} 객체를 넘겨도 됨)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Land = API;
})(this);
