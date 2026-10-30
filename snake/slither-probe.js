/* slither.io 관찰 전용 진단기 (공부용) — 읽기만 합니다. 조작·전송 코드 없음.
   ─────────────────────────────────────────────────────────────────────
   helper.js(내 게임 전용)와 같은 3층 구조를 slither.io 필드에 맞춰 다시 쓴 것.
     ① 읽기 : window.slither / slithers / foods / grd  (클래식 스크립트의 전역 var)
     ② 판단 : 16구역 × 4 관찰 벡터 → brains.json 순전파 (전이 실험용, 의미 없음 경고 포함)
     ③ 조작 : ✗ 없음. ws.send·xm·ym·want_e·eang 어디에도 쓰지 않음.
             (여기서 조작을 붙이는 게 다음 단계이고, 그건 약관 위반이라 따로 설명)

   쓰는 법
     · slither.io 게임 페이지 F12 콘솔에 이 파일 전체 붙여넣기
     · 로컬 실습: slither-fixture.html 열고 콘솔 없이 자동 로드
     · 두뇌 전이 실험을 slither.io에서 하려면 (CORS 허용된 정적 호스트):
         window.__probePreset = { brainsUrl: 'https://benny3s.github.io/game/snake/brains.json?v=v2a-2m' }
*/
(() => {
  const W = window;
  if (!("slithers" in W) && !("gotPacket" in W)) {
    alert("slither.io 게임 페이지에서 실행하세요 — window.slithers / window.gotPacket 이 없습니다");
    return;
  }
  if (W.__slitherProbe) { W.__slitherProbe.update(); return; }

  const TAU = Math.PI * 2, N = 16;
  const CFG = Object.assign({ view: 200, brainsUrl: "brains.json?v=v2a-2m", every: 250 }, W.__probePreset || {});
  const num = v => (typeof v === "number" && isFinite(v) ? v : null);
  const pt = p => (Array.isArray(p) ? [p[0], p[1]] : [num(p && p.xx), num(p && p.yy)]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // ── ① 읽기: slither.io 전역에서 상태를 읽음 (game.js 최상위 var → window 프로퍼티)
  function readState() {
    const me = W.slither, all = W.slithers || [], food = W.foods || [];
    const head = me ? [num(me.xx), num(me.yy)] : null;
    return {
      playing: !!(me && me.xx != null),
      R: num(W.grd) || 21600,
      ang: me ? (num(me.ang) ?? num(me.eang)) : null,
      head,
      len: me ? (num(me.tl) ?? (num(me.sct) || 0) + (num(me.fam) || 0)) : 0,
      bodies: all.filter(s => s && s !== me).map(s => ({
        head: [num(s.xx), num(s.yy)], ang: num(s.ang), len: num(s.tl) ?? num(s.sct) ?? 0,
        pts: (s.pts || []).map(pt).filter(p => p[0] != null && p[1] != null),
      })),
      foods: food.map(f => Array.isArray(f) ? f : [num(f && f.xx), num(f && f.yy)]).filter(p => p[0] != null && p[1] != null),
      snakes: all.length, ws: !!W.ws, wsState: W.ws ? W.ws.readyState : null,
    };
  }

  // ── ② 관찰 벡터: helper.js observe()와 같은 66칸 배치 (16구역 × 4 + 길이 2)
  function observe(st) {
    if (!st.playing) return null;
    const [hx, hy] = st.head, V = CFG.view, R = st.R, o = new Float32Array(N * 4 + 2);
    const minF = Array(N).fill(V), cnt = Array(N).fill(0), minB = Array(N).fill(V);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - st.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N) % N; };
    for (const f of st.foods) { const dx = f[0] - hx, dy = f[1] - hy, d = Math.hypot(dx, dy); if (d < V) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const s of st.bodies) for (const p of s.pts) {
      const dx = p[0] - hx, dy = p[1] - hy, d = Math.hypot(dx, dy);       // slither는 몸통 굵기를 안 줘서 반경 보정 없이 씀
      if (d < V) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], d); }
    }
    for (let k = 0; k < N; k++) {
      const mid = st.ang + (k + 0.5) / N * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = hx * dx + hy * dy, c = hx * hx + hy * hy - R * R;
      const wall = -b + Math.sqrt(Math.max(b * b - c, 0));
      o[k * 4] = 1 - minF[k] / V; o[k * 4 + 1] = Math.min(cnt[k] / 8, 1);
      o[k * 4 + 2] = 1 - minB[k] / V; o[k * 4 + 3] = 1 - Math.min(wall, V) / V;
    }
    o[64] = Math.min(st.len / 100, 1); o[65] = st.len > 7 ? 1 : 0;
    return o;
  }
  function decide(brain, o) {
    let h = o;
    brain.forEach((L, li) => {
      const y = new Float32Array(L.b.length);
      for (let i = 0; i < L.b.length; i++) { let s = L.b[i]; const w = L.W[i]; for (let j = 0; j < h.length; j++) s += w[j] * h[j]; y[i] = li < 2 ? Math.tanh(s) : s; }
      h = y;
    });
    const out = Array.from(h).map(v => +v.toFixed(2));
    let best = 0; for (let i = 1; i < 6; i++) if (h[i] > h[best]) best = i;
    return { out, best };
  }

  // ── ④ 패킷: gotPacket을 감싸서 타입만 셈 (원본 호출은 그대로 유지)
  const pk = { total: 0, byType: {}, at: 0, rate: 0, hooked: false };
  (function hook() {
    const orig = W.gotPacket;
    if (typeof orig !== "function" || orig.__probeWrapped) return;
    const wrapped = function (a) {
      pk.total++; pk.at = performance.now();
      const t = String.fromCharCode(a[0] || 0); pk.byType[t] = (pk.byType[t] || 0) + 1;
      return orig.apply(this, arguments);
    };
    wrapped.__probeWrapped = true;
    try { W.gotPacket = wrapped; pk.hooked = true; } catch (e) {}
  })();

  // ── 패널
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;left:8px;top:8px;z-index:2147483647;background:rgba(18,14,26,.93);color:#e8e8ef;border:1px solid #7a5aa8;border-radius:10px;padding:8px 10px;font:12px/1.5 'Malgun Gothic',system-ui,sans-serif;width:270px;max-height:92vh;overflow:auto;box-shadow:0 6px 24px rgba(0,0,0,.4)";
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px"><b style="color:#c9a6ff">🔬 slither 관찰</b>
      <span style="margin-left:auto;font-size:11px;color:#8d8798">읽기 전용</span>
      <button data-off style="font:inherit;background:none;border:0;color:#c9a6ff;cursor:pointer">✕</button></div>
    <div data-st style="color:#a8a2b4;margin-top:2px">…</div>
    <div style="color:#8d8798;margin-top:6px">관찰 16구역 (먹이 / 위험)</div>
    <div data-bars style="display:flex;gap:1px;align-items:flex-end;height:38px;margin-top:2px"></div>
    <div style="color:#8d8798;margin-top:6px">두뇌 전이 실험 → 행동 6개 점수</div>
    <div data-brain style="color:#e0d7f5">불러오는 중…</div>
    <div data-warn style="color:#ffb86b;font-size:11px;margin-top:2px"></div>
    <div style="color:#8d8798;margin-top:6px">수신 패킷 (디코드 실습)</div>
    <div data-pk style="color:#9fd6ff">…</div>
    <div style="color:#8d8798;margin-top:6px">내가 남기는 흔적 (감지 관점)</div>
    <div data-fp style="color:#ffb0c0;font-size:11px">…</div>`;
  document.body.appendChild(panel);
  const q = s => panel.querySelector(s);
  const off = () => { clearInterval(timer); panel.remove(); delete W.__slitherProbe; };
  q("[data-off]").onclick = off;

  // ── 두뇌 로드 (CORS 되는 정적 호스트면 어디든 가능 — 서버 로직 불필요)
  let brain = null, brainMsg = "불러오는 중…";
  fetch(new URL(CFG.brainsUrl, location.href).href).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(b => { brain = b.trained; brainMsg = `가중치 ${brain.length}층 로드 (${brain[0].W[0].length} → ${brain[0].b.length} → ${brain[1].b.length} → ${brain[2].b.length})`; })
    .catch(e => { brainMsg = "두뇌 없음: " + e.message + " (관찰·패킷은 정상)"; });

  const bars = Array.from({ length: N }, () => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%";
    const f = document.createElement("div"); f.style.cssText = "background:#ffd666;border-radius:1px 1px 0 0";
    const d = document.createElement("div"); d.style.cssText = "background:#ff5a78;border-radius:1px 1px 0 0";
    wrap.append(d, f); q("[data-bars]").appendChild(wrap);
    return { f, d };
  });

  let o0 = null, fps = [];
  const API = { panel, off, update: null, snapshot: null, cfg: CFG, readState, observe, decide };
  W.__slitherProbe = API;                      // update()가 자기 스냅샷을 남길 수 있게 먼저 등록
  function update() {
    const st = readState(), o = observe(st);
    q("[data-st]").innerHTML = st.playing
      ? `게임 중 · 존 R=${st.R} · 내 뱀 (${st.head[0].toFixed(0)}, ${st.head[1].toFixed(0)}) 각 ${(st.ang ?? 0).toFixed(2)} · 길이 ${st.len.toFixed(1)}<br>
         남의 뱀 ${st.bodies.length} · 먹이 ${st.foods.length} · 소켓 ${st.ws ? "readyState " + st.wsState : "없음"}`
      : `대기 중 — 게임 시작 전 (window.slither 없음)<br>전역은 있음: slithers ${st.snakes} · foods ${st.foods.length} · grd ${num(W.grd) ?? "?"}`;
    if (o) {
      o0 = o;
      for (let k = 0; k < N; k++) { bars[k].f.style.height = Math.round(o[k * 4] * 100) + "%"; bars[k].d.style.height = Math.round(Math.max(o[k * 4 + 2], o[k * 4 + 3]) * 100) + "%"; }
      const d = brain ? decide(brain, o) : null;
      q("[data-brain]").innerHTML = d
        ? d.out.map((v, i) => `<span style="color:${i === d.best ? "#9dffa0" : "#8d8798"}">${v}</span>`).join(" · ") + `<br>선택 ${d.best} (${["좌", "직진", "우", "좌+부스트", "직진+부스트", "우+부스트"][d.best]})`
        : brainMsg;
      q("[data-warn]").textContent = "⚠ 이 두뇌는 내 클론(존 100·시야 15) 좌표계로 학습됨. slither(R=" + st.R + ", 시야 " + CFG.view + ")에선 입력 분포가 달라 판단은 무의미 — 전이 실패를 눈으로 보는 게 목적";
    } else { q("[data-brain]").textContent = brainMsg; }
    const rate = pk.total ? (pk.total / ((performance.now() - (fps[0] || performance.now())) / 1000 || 1)) : 0;
    if (!fps.length) fps[0] = performance.now();
    q("[data-pk]").innerHTML = pk.hooked
      ? `총 ${pk.total} · 평균 ${rate.toFixed(1)}/s<br>` + Object.entries(pk.byType).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([t, n]) => `<code>${t}</code> ${n}`).join(" · ")
      : "gotPacket 없음 (게임 시작 전이면 정상)";
    const canv = document.querySelectorAll("canvas").length;
    const known = [...document.scripts].filter(s => (s.src || "").includes("game")).length;
    q("[data-fp]").textContent = `주입 스크립트 1개 · DOM 패널 1개 · fetch 1회 · setInterval ${CFG.every}ms · canvas ${canv}개(게임 것이 원래 몇 개인지 대조) · gotPacket 래핑 ${pk.hooked ? "O" : "X"} · 조작 호출 0회`;
    W.__slitherProbe.snapshot = { st, o: o0 ? Array.from(o0) : null, packets: { ...pk.byType }, total: pk.total };
  }
  const timer = setInterval(update, CFG.every);
  update();
  API.update = update;
})();
