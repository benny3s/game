/* slither-autopilot.js — v2 (2026-10-30)
 * 자동조향 "토글 하네스" — 실제 slither.io 페이지에 붙여 채널별(var / event) 주입을 비교하는 실험용 코드.
 * ⚠ slither.io 약관은 봇·자동화를 금지합니다. 관찰/학습용으로만, 짧게, 본인 확인 창에서만 사용하세요.
 *   조작은 이 파일에만 있고, 읽기 전용 패널(slither-overlay.js)과는 완전히 분리되어 있습니다.
 *
 * 사용: F12 콘솔에 붙여넣기  →  H 토글 / 1 var모드 / 2 event모드 / 0 상태
 * 조회: window.__ap  (on, mode, writes, deaths, maxLen, angHist, err)
 */
(function () {
  const W = window;
  const S = (W.__ap = Object.assign(
    {
      on: false,
      mode: 'var',      // 'var' = 페이지 내부 xm/ym 직접 대입, 'event' = 캔버스에 MouseEvent 주입
      writes: 0,
      deaths: 0,
      spawns: 0,
      maxLen: 0,
      angHist: [],      // 각도 갱신 시 |Δheading| (rad)
      lastAng: null,
      lastAt: 0,
      aim: 0,
      err: null,
      alive: false,
      len: 0,
      gapMs: 33,
      radius: 300,
    },
    W.__ap || {}
  ));

  // ---- 패널 ----
  let el = document.getElementById('__ap');
  if (!el) {
    el = document.createElement('div');
    el.id = '__ap';
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;' +
      'font:11px/1.35 ui-monospace,Consolas,monospace;color:#9fe;background:rgba(0,0,0,.62);' +
      'padding:6px 8px;border:1px solid #3a6;border-radius:6px;white-space:pre';
    el.innerHTML =
      '<div id="__apt"></div>' +
      '<div id="__apb" style="pointer-events:auto;cursor:pointer;margin-top:4px;padding:2px 6px;' +
      'border:1px solid #3a6;border-radius:4px;display:inline-block">toggle (H)</div>';
    document.body.appendChild(el);
    const b = document.getElementById('__apb');
    if (b) b.addEventListener('click', (ev) => { ev.stopPropagation(); S.on = !S.on; S.redraw = true; });
  }

  const heading = (s) => (s.eang != null ? s.eang : s.ang) || 0;
  const len = (s) => Math.round((s.sct || 0) + (s.fam || 0));

  function decide(me, all, fd, R) {
    const hx = me.xx, hy = me.yy;
    const h = heading(me);
    let best = null, bestScore = -1e9;

    const consider = (x, y, w) => {
      if (!isFinite(x) || !isFinite(y)) return;
      const d = Math.hypot(x - hx, y - hy);
      if (d < 1) return;
      const a = Math.atan2(y - hy, x - hx);
      // 전방 우선 + 가까울수록 가중
      let dd = Math.abs(((a - h + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const sc = w * Math.cos(dd) * 120 - d * 0.08;
      if (sc > bestScore) { bestScore = sc; best = a; }
    };

    // 먹이
    if (fd && fd.length) {
      for (let i = 0; i < fd.length; i++) {
        const f = fd[i];
        if (!f) continue;
        const fx = f.xx != null ? f.xx : f[0];
        const fy = f.yy != null ? f.yy : f[1];
        consider(fx, fy, 1);
      }
    }

    // 다른 뱀 머리 회피(가까우면 강한 감점)
    if (all) {
      const arr = Array.isArray(all) ? all : Object.keys(all).map((k) => all[k]);
      for (let j = 0; j < arr.length; j++) {
        const s = arr[j];
        if (!s || s === me) continue;
        const sx = s.xx != null ? s.xx : s[0];
        const sy = s.yy != null ? s.yy : s[1];
        if (!isFinite(sx) || !isFinite(sy)) continue;
        const d = Math.hypot(sx - hx, sy - hy);
        if (d < 700) consider(hx - (sx - hx), hy - (sy - hy), 0.4);
      }
    }

    // 경계 회피
    const cx = R / 2, cy = R / 2;
    const dEdge = Math.min(hx, hy, R - hx, R - hy);
    if (dEdge < 900) consider(cx, cy, 2.2);

    return best == null ? h : best;
  }

  S.decide = decide;
  S.headingOf = heading;

  function push(aim) {
    const R = S.radius;
    if (S.mode === 'var') {
      // ① 페이지 내부 변수 직접 대입 — isTrusted 개념 자체가 없음
      //    주의: 게임은 mousemove 가 세팅하는 want_e 플래그가 true 일 때만 xm/ym 을 소비한다.
      //    (번들: `if(want_e && ctm-last_e_mtm>33){ want_e=false; ... atan2(ym,xm) ... }`)
      W.xm = Math.cos(aim) * R;
      W.ym = Math.sin(aim) * R;
      W.want_e = true;
    } else {
      // ② 캔버스에 합성 MouseEvent — isTrusted=false
      const ev = new MouseEvent('mousemove', {
        clientX: (W.innerWidth >> 1) + Math.cos(aim) * R,
        clientY: (W.innerHeight >> 1) + Math.sin(aim) * R,
        bubbles: true,
        cancelable: true,
        view: W,
      });
      (W.mc || W.canvas || document.body).dispatchEvent(ev);
    }
    S.writes++;
  }

  function frame() {
    try {
      const me = W.slither;
      if (me && (me.xx != null)) {
        const L = len(me);
        S.alive = true;
        S.len = L;
        if (L > S.maxLen) S.maxLen = L;

        const h = heading(me);
        if (S.lastAng != null) {
          let d = h - S.lastAng;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          S.angHist.push(Math.abs(d));
          if (S.angHist.length > 900) S.angHist.shift();
        }
        S.lastAng = h;

        if (S.on) {
          const now = performance.now();
          if (now - S.lastAt >= S.gapMs) {
            S.lastAt = now;
            const R = W.grd || 21600;
            const aim = S.decide(me, W.slithers, W.foods, R);
            S.aim = aim;
            push(aim);
          }
        }
      } else {
        if (S.alive) S.deaths++;
        S.alive = false;
        S.lastAng = null;
      }

      if ((frame.n = (frame.n || 0) + 1) % 6 === 0 || S.redraw) {
        S.redraw = false;
        const t = document.getElementById('__apt');
        if (t) t.textContent =
          'AUTOPILOT ' + (S.on ? 'ON ' : 'OFF') + ' [' + S.mode + ']\n' +
          'len ' + S.len + '  max ' + S.maxLen + '  deaths ' + S.deaths + '\n' +
          'writes ' + S.writes + (S.err ? '\nERR ' + S.err : '');
      }
    } catch (e) {
      S.err = String(e && e.message ? e.message : e).slice(0, 80);
      S.on = false; // 오류 시 자동 정지(안전)
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- 키 토글 ----
  if (!S._key) {
    S._key = true;
    addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') S.on = !S.on;
      else if (e.key === '1') { S.mode = 'var'; S.on = true; }
      else if (e.key === '2') { S.mode = 'event'; S.on = true; }
      else if (e.key === '0') S.on = false;
    });
  }
  if (!S._spawnWatch) {
    S._spawnWatch = true;
    setInterval(() => {
      const a = !!W.slither;
      if (a && !S.was) S.spawns++;
      S.was = a;
    }, 200);
  }

  console.log('[slither-autopilot v2] ready — H 토글 / 1 var / 2 event / 0 off');
})();
