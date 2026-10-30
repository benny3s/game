/* slither.io 관찰 패널 (읽기 전용) — 붙이는 법: F12 콘솔에 통째로 붙여넣기.
   읽는 것: window.slither / slithers / foods / ws / grd
   쓰지 않는 것: ws.send, xm, ym, want_e, eang, 어떤 입력도 조작하지 않음.
   pointer-events:none 이라 마우스 조향을 가로채지 않습니다. */
(function () {
  var W = window, old = document.getElementById('__ov'); if (old) old.remove();
  if (!W.slithers) { alert('slither.io 게임 페이지에서 실행하세요'); return; }
  var d = document.createElement('div');
  d.id = '__ov';
  d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483000;pointer-events:none;'
    + 'font:11px/1.5 ui-monospace,Consolas,monospace;color:#cfe3ff;background:rgba(6,10,16,.84);'
    + 'border:1px solid #22374d;border-radius:8px;padding:8px 9px;width:198px;box-shadow:0 4px 18px rgba(0,0,0,.55)';
  d.innerHTML = '<div id="__ovt"></div>'
    + '<canvas id="__ovc" width="180" height="180" style="display:block;margin-top:6px;border-radius:4px;background:rgba(0,0,0,.35)"></canvas>';
  document.body.appendChild(d);
  var t = document.getElementById('__ovt'), c = document.getElementById('__ovc'), g = c.getContext('2d');
  var last = 0, frames = 0, fps = 0, fpsAt = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 90) return; last = now;
    frames++; if (now - fpsAt > 1000) { fps = frames * 1000 / (now - fpsAt); frames = 0; fpsAt = now; }
    var me = W.slither, all = W.slithers || [], fd = W.foods || [];
    var ws = (typeof W.ws !== 'undefined') ? W.ws : null;
    var len = me ? Math.round((me.sct || 0) + (me.fam || 0)) : 0;
    var heading = me ? (typeof me.eang === 'number' ? me.eang : me.ang) || 0 : 0;
    var rank = 1, i, s;
    if (me) for (i = 0; i < all.length; i++) { s = all[i]; if (s && s !== me && ((s.sct || 0) + (s.fam || 0)) > len) rank++; }
    var near = [];
    if (me && me.xx != null) for (i = 0; i < all.length; i++) {
      s = all[i]; if (!s || s === me || s.xx == null) continue;
      var dx = s.xx - me.xx, dy = s.yy - me.yy, dst = Math.sqrt(dx * dx + dy * dy);
      if (dst < 2500) near.push({ d: dst, dx: dx, dy: dy, l: Math.round((s.sct || 0) + (s.fam || 0)) });
    }
    near.sort(function (a, b) { return a.d - b.d; });
    var rows = ['len <b>' + len + '</b>   score <b>' + (me ? Math.round(9 * len + 11) : 0) + '</b>',
      'rank ' + rank + '/' + all.length + '   foods ' + fd.length,
      'ws ' + (ws ? (ws.readyState === 1 ? 'OPEN' : ws.readyState) : 'n/a') + '   ' + fps.toFixed(0) + 'fps'];
    for (i = 0; i < Math.min(3, near.length); i++) {
      var n = near[i], rel = Math.atan2(n.dy, n.dx) - heading;
      rel = ((rel * 180 / Math.PI) + 540) % 360 - 180;
      rows.push('↗ ' + Math.round(n.d) + 'u ' + rel.toFixed(0) + '° len' + n.l);
    }
    if (!me) rows.push('<span style="color:#f88">not in game</span>');
    t.innerHTML = rows.join('<br>');
    g.clearRect(0, 0, 180, 180);
    g.strokeStyle = 'rgba(90,140,200,.35)'; g.lineWidth = 1;
    g.beginPath(); g.arc(90, 90, 86, 0, 6.283); g.stroke();
    g.beginPath(); g.moveTo(4, 90); g.lineTo(176, 90); g.moveTo(90, 4); g.lineTo(90, 176); g.stroke();
    if (me && me.xx != null) {
      var ch = Math.cos(heading), sh = Math.sin(heading), sc = 86 / 2500;
      for (i = 0; i < near.length; i++) {
        var q = near[i], fx = q.dx * ch + q.dy * sh, ry = -q.dx * sh + q.dy * ch;
        g.fillStyle = q.l > len ? 'rgba(255,110,110,.9)' : 'rgba(120,220,160,.9)';
        g.beginPath(); g.arc(90 + ry * sc, 90 - fx * sc, q.l > len ? 3 : 2.4, 0, 6.283); g.fill();
      }
      g.fillStyle = '#8fd0ff';
      g.beginPath(); g.moveTo(90, 80); g.lineTo(85, 96); g.lineTo(95, 96); g.closePath(); g.fill();
    }
  }
  requestAnimationFrame(tick);
  W.__ov = { stop: function () { d.remove(); } };
  return 'panel on';
})();
