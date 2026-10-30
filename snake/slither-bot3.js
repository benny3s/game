// slither-bot3.js — v3: 몸통 회피 + 32방향 레이 + 먹이 정렬
// ⚠ slither.io 약관은 봇·자동화를 금지합니다. 관찰/학습용으로만, 짧게, 본인 확인 창에서만 사용하세요.
(function () {
  const W = window;
  const S = (W.__ap = Object.assign({
    on: false, mode: 'var', writes: 0, deaths: 0, spawns: 0, maxLen: 0,
    angHist: [], lastAng: null, lastAt: 0, aim: 0, err: null, alive: false,
    len: 0, gapMs: 33, radius: 300, dng: 0, fd: 0, v: 3,
  }, W.__ap || {}));
  S.v = 3;

  let el = document.getElementById('__ap');
  if (!el) {
    el = document.createElement('div');
    el.id = '__ap';
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;' +
      'font:11px/1.35 ui-monospace,Consolas,monospace;color:#9fe;background:rgba(0,0,0,.62);' +
      'padding:6px 8px;border:1px solid #3a6;border-radius:6px;white-space:pre';
    el.innerHTML = '<div id="__apt"></div>' +
      '<div id="__apb" style="pointer-events:auto;cursor:pointer;margin-top:4px;padding:2px 6px;' +
      'border:1px solid #3a6;border-radius:4px;display:inline-block">toggle (H)</div>';
    document.body.appendChild(el);
    const b = document.getElementById('__apb');
    if (b) b.addEventListener('click', (ev) => { ev.stopPropagation(); S.on = !S.on; S.redraw = true; });
  }

  const TAU = Math.PI * 2;
  const heading = (s) => (s.eang != null ? s.eang : s.ang) || 0;
  const lenOf = (s) => Math.round((s.sct || 0) + (s.fam || 0));
  const adiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  // 몸통 청크(≈10px 간격)를 원으로 근사해 각도 점유맵으로 변환
  function obstacles(me) {
    const out = [];
    const sl = W.slithers || {};
    const list = Array.isArray(sl) ? sl : Object.keys(sl).map((k) => sl[k]);
    for (let k = 0; k < list.length; k++) {
      const s = list[k];
      if (!s || !s.pts || s.dying) continue;
      const isMe = s === me;
      const r = 11 * (s.sc || 1) + 16;
      const P = s.pts;
      for (let i = isMe ? 6 : 0; i < P.length; i += 2) {
        const p = P[i];
        if (!p) continue;
        const dx = p.xx - me.xx, dy = p.yy - me.yy;
        const d = Math.hypot(dx, dy);
        if (d > 900 || d < 1) continue;
        out.push({ dx: dx, dy: dy, d: d, r: r, w: isMe ? 1.6 : 1 });
      }
    }
    return out;
  }

  function decide(me, fd, R) {
    const obs = obstacles(me);
    const h = heading(me);
    const cx = Math.cos, sy = Math.sin;
    // 먹이는 근처 500px만, 상위 후보로 축약
    const foods = [];
    if (fd) {
      for (let i = 0; i < fd.length; i++) {
        const f = fd[i];
        if (!f) continue;
        const fx = f.xx != null ? f.xx : f[0], fy = f.yy != null ? f.yy : f[1];
        if (!isFinite(fx) || !isFinite(fy)) continue;
        const dx = fx - me.xx, dy = fy - me.yy, d = Math.hypot(dx, dy);
        if (d > 520 || d < 1) continue;
        foods.push({ dx: dx, dy: dy, d: d });
      }
    }
    const C = W.grd || 32550;
    const RR = W.flux_grd || C * 0.98;
    const dEdge = RR - Math.hypot(me.xx - C, me.yy - C);
    let bestA = h, bestS = -1e18, bestD = 0, bestF = 0;
    for (let k = 0; k < 33; k++) {
      const a = h - 1.45 + (k * 2.9) / 32;
      const ca = cx(a), sa = sy(a);
      let danger = 0;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i];
        const proj = o.dx * ca + o.dy * sa;
        if (proj <= 0) continue;
        const perp = Math.abs(-o.dx * sa + o.dy * ca);
        const lim = o.r + 14;
        if (perp >= lim) continue;
        danger += o.w * (1 - perp / lim) * (1 - Math.min(1, o.d / 700)) * 100;
      }
      let food = 0;
      for (let i = 0; i < foods.length; i++) {
        const f = foods[i];
        const proj = f.dx * ca + f.dy * sa;
        if (proj <= 0.35 * f.d) continue;
        food += (6 * (proj / f.d)) / (1 + f.d / 150);
      }
      // 벽: 세계는 (grd,grd) 중심원, 반지름 flux_grd. 350px 앞 지점이 원 밖이면 감점
      const px = me.xx + ca * 350, py = me.yy + sa * 350;
      const pd = Math.hypot(px - C, py - C);
      let wall = 0;
      if (pd > RR - 400) wall = 120 + (pd - RR) * 0.5;
      else if (dEdge < 900) wall = 60 * (1 - dEdge / 900);
      const s = -danger + food - wall - 3 * Math.abs(adiff(a, h));
      if (s > bestS) { bestS = s; bestA = a; bestD = danger; bestF = food; }
    }
    S.dng = Math.round(bestD); S.fd = Math.round(bestF);
    return bestA;
  }
  S.decide = decide;
  S.headingOf = heading;

  function push(aim) {
    const R = S.radius;
    if (S.mode === 'var') {
      W.xm = Math.cos(aim) * R;
      W.ym = Math.sin(aim) * R;
      W.want_e = true;
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

  function diag(me, R) {
    let minAhead = 1e9, minAny = 1e9;
    const h = heading(me), ca = Math.cos(h), sa = Math.sin(h);
    const sl = W.slithers || {};
    const list = Array.isArray(sl) ? sl : Object.keys(sl).map((k) => sl[k]);
    for (let k = 0; k < list.length; k++) {
      const s = list[k];
      if (!s || !s.pts || s === me) continue;
      const P = s.pts;
      for (let i = 0; i < P.length; i += 2) {
        const p = P[i];
        if (!p) continue;
        const dx = p.xx - me.xx, dy = p.yy - me.yy;
        const d = Math.hypot(dx, dy);
        if (d < minAny) minAny = d;
        if (dx * ca + dy * sa > 0 && d < minAhead) minAhead = d;
      }
    }
    const C = W.grd || 32550, RR = W.flux_grd || C * 0.98;
    return {
      obs: Math.round(minAny), ahead: Math.round(minAhead),
      wall: Math.round(RR - Math.hypot(me.xx - C, me.yy - C)),
      len: lenOf(me), aim: +S.aim.toFixed(2), h: +h.toFixed(2),
    };
  }

  function frame() {
    try {
      const me = W.slither;
      if (me && me.xx != null && me.pts) {
        const L = lenOf(me);
        S.alive = true; S.len = L;
        if (L > S.maxLen) S.maxLen = L;
        if ((frame.n || 0) % 6 === 0) S.diag = diag(me, W.grd || 21600);
        const h = heading(me);
        if (S.on) {
          const now = performance.now();
          if (now - S.lastAt >= S.gapMs) {
            S.lastAt = now;
            const R = W.grd || 21600;
            const aim = decide(me, W.foods, R);
            S.aim = aim;
            push(aim);
          }
        }
        S.lastAng = h;
      } else {
        if (S.alive) { S.deaths++; S.lastDeath = S.diag || null; }
        S.alive = false;
        // 자동 재시작
        if (S.auto !== false && !S.restarting && S.on) {
          S.restarting = true;
          setTimeout(() => {
            S.restarting = false;
            const n = document.getElementById('nick');
            if (n) { n.value = 'benny'; n.dispatchEvent(new Event('input', { bubbles: true })); }
            const el2 = document.querySelector('#playh .nsi') || document.getElementById('playh');
            if (el2) { el2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); el2.click(); }
            W.want_play = true;
          }, 1800);
        }
      }
      if ((frame.n = (frame.n || 0) + 1) % 6 === 0 || S.redraw) {
        S.redraw = false;
        const t = document.getElementById('__apt');
        if (t) t.textContent = 'BOT v3 ' + (S.on ? 'ON ' : 'OFF') + ' [' + S.mode + ']\n' +
          'len ' + S.len + ' max ' + S.maxLen + ' deaths ' + S.deaths + '\n' +
          'writes ' + S.writes + ' dng ' + S.dng + ' fd ' + S.fd + (S.err ? '\nERR ' + S.err : '');
      }
    } catch (e) {
      S.err = String(e && e.message ? e.message : e).slice(0, 80);
      S.on = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (!S._key) {
    S._key = true;
    addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') S.on = !S.on;
      else if (e.key === '1') { S.mode = 'var'; S.on = true; }
      else if (e.key === '2') { S.mode = 'event'; S.on = true; }
      else if (e.key === '0') S.on = false;
    });
  }
  console.log('[slither-bot v3] ready — H / 1 var / 2 event / 0 off');
})();
