// slither-brain.js — brains.json(trained) RL 두뇌 → slither.io 어댑터
// ⚠ slither.io 약관은 봇·자동화를 금지합니다. 관찰/학습용으로만, 짧게, 본인 확인 창에서만 사용하세요.
// 필요: window.__BRAIN = {trained:{W,b},...}  (mkbrain.js 가 만들어 주는 인라인 가중치)
(function () {
  const W = window;
  const S = (W.__bp = Object.assign({
    on: false, mode: 'var', k: 10, gapMs: 72, writes: 0, deaths: 0, maxLen: 0,
    len: 0, alive: false, auto: false, runs: [], restarting: false, act: [0, 0, 0, 0, 0, 0], lastAt: 0, err: null, boost: false, src: 'trained',
  }, W.__bp || {}));

  const TAU = Math.PI * 2, N_SECT = 16, VIEW = 15, L_MIN = 6;
  const heading = (s) => (s.eang != null ? s.eang : s.ang) || 0;
  const lenOf = (s) => Math.round((s.sct || 0) + (s.fam || 0));

  // ── 신경망 순전파 (은닉 tanh, 출력 선형 → argmax) ──
  function net(brain, inp) {
    let x = inp;
    for (let li = 0; li < brain.length; li++) {
      const L = brain[li], M = L.W, bs = L.b, out = new Array(M.length);
      for (let o = 0; o < M.length; o++) {
        const row = M[o];
        let s = bs[o];
        for (let i = 0; i < row.length; i++) s += row[i] * x[i];
        out[o] = li < brain.length - 1 ? Math.tanh(s) : s;
      }
      x = out;
    }
    let best = 0;
    for (let i = 1; i < x.length; i++) if (x[i] > x[best]) best = i;
    return best;
  }

  // ── 66차원 관측(클론 helper.js / env2 와 동일 규약) ──
  function observe(me) {
    const k = S.k, VIEWPX = VIEW * k, h = heading(me);
    const fd = new Array(N_SECT).fill(Infinity), fc = new Array(N_SECT).fill(0);
    const bd = new Array(N_SECT).fill(Infinity), wl = new Array(N_SECT).fill(Infinity);
    const sect = (dx, dy) => {
      let a = Math.atan2(dy, dx) - h;
      while (a < 0) a += TAU;
      while (a >= TAU) a -= TAU;
      return Math.min(N_SECT - 1, Math.floor((a / TAU) * N_SECT));
    };
    // 먹이
    const foods = W.foods;
    if (foods) {
      for (let i = 0; i < foods.length; i++) {
        const f = foods[i];
        if (!f) continue;
        const fx = f.xx != null ? f.xx : f[0], fy = f.yy != null ? f.yy : f[1];
        if (!isFinite(fx) || !isFinite(fy)) continue;
        const dx = fx - me.xx, dy = fy - me.yy, d = Math.hypot(dx, dy);
        if (d > VIEWPX || d < 0.01) continue;
        const s = sect(dx, dy);
        fc[s]++;
        if (d < fd[s]) fd[s] = d;
      }
    }
    // 몸통(다른 뱀 + 내 몸)
    const sl = W.slithers || {};
    const list = Array.isArray(sl) ? sl : Object.keys(sl).map((q) => sl[q]);
    for (let j = 0; j < list.length; j++) {
      const s = list[j];
      if (!s || !s.pts || s.dying) continue;
      if (s === me && !S.selfBody) continue;      // 학습 데이터는 내 몸 제외(밧줄 모델). 필요 시 selfBody=true
      const rad = (11 * (s.sc || 1) + 16) / k;      // px → 클론 단위
      const P = s.pts;
      for (let i = 0; i < P.length; i += 2) {
        const p = P[i];
        if (!p) continue;
        const dx = p.xx - me.xx, dyy = p.yy - me.yy, d = Math.hypot(dx, dyy);
        if (d > VIEWPX + rad || d < 0.01) continue;
        const g = sect(dx, dyy);
        const nd = d - rad;
        if (nd < bd[g]) bd[g] = nd;
      }
    }
    // 벽(중심원)
    const C = W.grd || 32550, RR = W.flux_grd || C * 0.98;
    const ox = me.xx - C, oy = me.yy - C;
    const proj = ox * ox + oy * oy - RR * RR;
    for (let s = 0; s < N_SECT; s++) {
      const a = h + ((s + 0.5) / N_SECT) * TAU;
      const ux = Math.cos(a), uy = Math.sin(a);
      const b = ox * ux + oy * uy;
      const disc = proj > 0 ? 0 : b * b - proj;      // 원 밖이면 0(즉시 벽)
      let t = disc > 0 ? -b + Math.sqrt(disc) : 0;
      wl[s] = Math.max(0, t) / k;                      // 클론 단위
    }
    const o = new Float32Array(N_SECT * 4 + 2);
    for (let s = 0; s < N_SECT; s++) {
      o[4 * s] = 1 - Math.min(fd[s] / k, VIEW) / VIEW;
      o[4 * s + 1] = Math.min(fc[s] / 8, 1);
      o[4 * s + 2] = 1 - Math.min(Math.max(0, bd[s]), VIEW) / VIEW;
      o[4 * s + 3] = 1 - Math.min(wl[s], VIEW) / VIEW;
    }
    // 길이 프록시: 굵기(px)를 클론 단위로 환산해 클론의 length 축에 맞춤
    const radC = (11 * (me.sc || 1) + 16) / k;
    const Lv = S.lenMode === 'raw' ? lenOf(me) : Math.max(0, Math.min(400, (radC - 0.5) / 0.01));
    o[64] = Math.min(Lv / 100, 1);
    o[65] = Lv > L_MIN + 1 ? 1 : 0;
    return o;
  }

  function push(aim) {
    const R = S.radius || 300;
    if (S.mode === 'var') {
      W.xm = Math.cos(aim) * R; W.ym = Math.sin(aim) * R; W.want_e = true;
    } else {
      const ev = new MouseEvent('mousemove', {
        clientX: (W.innerWidth >> 1) + Math.cos(aim) * R,
        clientY: (W.innerHeight >> 1) + Math.sin(aim) * R,
        bubbles: true, cancelable: true, view: W,
      });
      (W.mc || W.canvas || document.body).dispatchEvent(ev);
    }
    S.writes++;
  }

  function step(me) {
    const B = W.__BRAIN;
    const brain = B && (B[S.src] || B.trained);
    if (!brain) { S.err = 'no __BRAIN'; return null; }
    const o = observe(me);
    const a = net(brain, o);
    S.act[a] = (S.act[a] || 0) + 1;
    S.lastAct = a;
    const h = heading(me);
    // env2: turn = a%3-1, 한 스텝 회전량 = turn_rate(length) ≤ 0.25rad
    const Lr = lenOf(me), xx = Math.min(1, Math.max(0, (Lr - 10) / 250));
    const tr = 0.25 * (0.35 + 0.65 * (1 - xx) * (1 - xx));
    const aim = h + ((a % 3) - 1) * tr;
    if (S.boost && a >= 3) W.boosting = true; else W.boosting = false;
    return aim;
  }

  let el = document.getElementById('__bp');
  if (!el) {
    el = document.createElement('div');
    el.id = '__bp';
    el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;' +
      'font:11px/1.35 ui-monospace,Consolas,monospace;color:#fd9;background:rgba(0,0,0,.62);' +
      'padding:6px 8px;border:1px solid #a83;border-radius:6px;white-space:pre';
    document.body.appendChild(el);
  }

  function frame() {
    try {
      const me = W.slither;
      if (me && me.xx != null && me.pts) {
        const L = lenOf(me);
        S.alive = true; S.len = L;
        if (L > S.maxLen) S.maxLen = L;
        const now = performance.now();
        if (S.on && now - S.lastAt >= S.gapMs) {
          S.lastAt = now;
          const aim = step(me);
          if (aim != null) { S.aim = aim; push(aim); }
        }
      } else {
        if (S.alive) { S.deaths++; (S.runs = S.runs || []).push(S.len); S.len = 0; }
        S.alive = false;
        // 자동 재시작 (측정/장시간 관찰용, S.auto=false 면 끔)
        if (S.auto && !S.restarting) {
          S.restarting = true;
          setTimeout(() => {
            S.restarting = false;
            const n = document.getElementById('nick');
            if (n) { n.value = 'benny'; n.dispatchEvent(new Event('input', { bubbles: true })); }
            const el2 = document.querySelector('#playh .nsi') || document.getElementById('playh');
            if (el2) { el2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); el2.click(); }
            W.want_play = true;
          }, 2200);
        }
      }
      if ((frame.n = (frame.n || 0) + 1) % 10 === 0) {
        el.textContent = 'BRAIN ' + S.src + ' ' + (S.on ? 'ON ' : 'OFF') + ' [' + S.mode + '] k' + S.k +
          '\nlen ' + S.len + ' max ' + S.maxLen + ' deaths ' + S.deaths +
          '\nwrites ' + S.writes + ' act ' + S.act.join('/') + (S.err ? '\nERR ' + S.err : '');
      }
    } catch (e) {
      S.err = String(e && e.message ? e.message : e).slice(0, 90);
      S.on = false;
    }
    S._raf = requestAnimationFrame(frame);
  }
  cancelAnimationFrame(S._raf); S._raf = requestAnimationFrame(frame);   // 다시 붙여넣어도 그리기 반복은 하나만 (S._raf 에 ID 를 두고, 새로 붙이면 예전 반복을 멈추고 새 코드로)
  console.log('[slither-brain] ready — __bp.on / __bp.src');
})();
