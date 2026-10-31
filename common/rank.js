/* 🏆 게임별 랭킹 (모든 게임 공통) — 프로필(pid) 기준이라 폰·PC 어디서 해도 한 기록
   rank/{게임}/{pid} = { name, t,
     m: { f: 친구 판 · a: AI 판 · h: 한 기기 } 각각 { n 판, w 승, l 패, d 비김, p 승점(이긴 사람 수), s 점수 합(칩·점), b 최고 점수 },
     base: { {기기}: { n, w, l, b } }   ← 예전에 기기에만 있던 기록을 한 번 옮긴 것 (AI 판으로 셈)
     vs: { {상대 pid}: { n, w, l, d } }  ← 친구 판 상대 전적 }
   rank_days/{YYYY-MM-DD}/{게임}/{pid} = 그날 판 수 (얼마나 활발한지)
   ?guest(시험) 이면 test/ 아래

   게임에서 쓰는 법 (판이 끝날 때 한 번, 각자 자기 기기에서):
     GRank.result('gostop', { mode: 'friend'|'ai'|'hot', res: 'w'|'l'|'d', beat: 이긴 사람 수, score: 이번 판 점수·칩(선택),
                              opp: [{ uid, res }] (친구 판: 다른 사람마다 '나'의 결과 w·l·d) })
     GRank.migrateLocal('gostop', () => ({ n, w, l, b }))   — 예전 기기 기록 한 번 올리기 (게임 처음 열 때)
     GRank.open('gostop')                                     — 랭킹 창 */
(() => {
  const GUEST = new URLSearchParams(location.search).has("guest");
  const MOCK = new URLSearchParams(location.search).has("mock");
  const P = GUEST ? "test/" : "";
  const MODES = { friend: "f", ai: "a", hot: "h", f: "f", a: "a", h: "h" };
  const MONEY = new Set(["gostop", "seotda", "poker"]);                       // 돈 게임: 친구 판은 점수(칩) 합으로 줄 세움
  const NAMES = { gostop: "고스톱", seotda: "섯다", onecard: "원카드", poker: "홀덤", baduk: "바둑", omok: "오목", cube: "베니큐브", chess: "체스", janggi: "장기", yut: "윷놀이", billiards: "당구", volley: "냥냥 배구", land: "땅따먹기", nyang: "냥도쿠", snake: "지렁이", sc: "스타" };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = v => (Number.isFinite(+v) ? +v : 0);
  const kstDay = (ms = Date.now()) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
  const devId = () => { try { let d = localStorage.getItem("rank.dev"); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem("rank.dev", d); } return d; } catch (e) { return "x"; } };

  async function db() {
    if (MOCK || !window.firebase) return null;
    try {
      if (window.Arena && Arena.init && !Arena.mock) { await Arena.init(); return Arena.db(); }
      if (window.NET && NET.db) { try { return NET.db(); } catch (e) {} }
      return firebase.apps.length ? firebase.app().database() : null;
    } catch (e) { return null; }
  }
  const me = () => (window.GME && GME.me && GME.me.pid ? GME.me : null);
  const add = (ref, f) => ref.transaction(cur => f(cur || {})).catch(e => console.warn("[rank]", e && e.message));

  // 친구 판 상대 uid → pid (방 참가자 목록에서)
  function pidOf(uid) {
    try { const pl = (window.ArenaUI && ArenaUI.net && ArenaUI.net.players) || {}; const p = pl[uid]; return (p && (p.pid || (p.me && p.me.pid))) || null; } catch (e) { return null; }
  }

  async function result(game, r = {}) {
    try {
      const m = me(), mode = MODES[r.mode] || "a", res = r.res === "w" || r.res === "l" || r.res === "d" ? r.res : null;
      if (!m || !res) return;
      const d = await db(); if (!d) return;
      const base = d.ref(`${P}rank/${game}/${m.pid}`);
      const beat = r.beat != null ? Math.max(0, Math.round(num(r.beat))) : res === "w" ? 1 : 0;
      const sc = r.score != null && Number.isFinite(+r.score) ? Math.round(+r.score) : null;
      base.child("name").set(String(m.name || "").slice(0, 12)).catch(() => {});
      base.child("t").set(Date.now()).catch(() => {});
      add(base.child(`m/${mode}`), c => {
        c.n = num(c.n) + 1; c[res] = num(c[res]) + 1; c.p = num(c.p) + beat;
        if (sc != null) { c.s = num(c.s) + sc; c.b = c.b == null ? sc : Math.max(num(c.b), sc); }
        return c;
      });
      if (mode === "f") for (const o of r.opp || []) {
        const op = o.pid || pidOf(o.uid); const orr = o.res === "w" || o.res === "l" || o.res === "d" ? o.res : null;
        if (!op || op === m.pid || !orr) continue;
        add(base.child(`vs/${op}`), c => { c.n = num(c.n) + 1; c[orr] = num(c[orr]) + 1; return c; });
      }
      d.ref(`${P}rank_days/${kstDay()}/${game}/${m.pid}`).transaction(v => num(v) + 1).catch(() => {});
    } catch (e) { console.warn("[rank]", e); }
  }

  // 예전 기기 기록 한 번 올리기 (이 기기·이 프로필·이 게임마다 한 번). sum() → { n, w, l, b }
  async function migrateLocal(game, sum) {
    try {
      const m = me(); if (!m) return;
      const flag = `rank.mig1.${game}.${m.pid}`;
      if (localStorage.getItem(flag)) return;
      const v = sum && sum(); if (!v || !(num(v.n) || num(v.w) || num(v.l))) return;   // 비었으면 표시 안 함 (다른 곳에서 맞는 키로 다시 올릴 수 있게)
      const d = await db(); if (!d) return;
      const o = { n: Math.max(num(v.n), num(v.w) + num(v.l)), w: num(v.w), l: num(v.l) };
      if (v.b != null && Number.isFinite(+v.b)) o.b = Math.round(+v.b);
      await d.ref(`${P}rank/${game}/${m.pid}/base/${devId()}`).set(o);
      d.ref(`${P}rank/${game}/${m.pid}/name`).set(String(m.name || "").slice(0, 12)).catch(() => {});
      localStorage.setItem(flag, "1");
    } catch (e) { console.warn("[rank] migrate", e); }
  }
  // 이름 로그인(프로필)이 생긴 뒤에 다시 시도
  const pending = [];
  function migrateWhenReady(game, sum) {
    if (me()) return migrateLocal(game, sum);
    pending.push([game, sum]);
    if (pending.length === 1 && window.GME && GME.onChange) GME.onChange(() => { if (me()) for (const [g, s] of pending.splice(0)) migrateLocal(g, s); });
  }

  // ── 합치기
  const Z = () => ({ n: 0, w: 0, l: 0, d: 0, p: 0, s: 0, b: null });
  function merge(t, x) { if (!x) return t; for (const k of ["n", "w", "l", "d", "p", "s"]) t[k] += num(x[k]); if (x.b != null) t.b = t.b == null ? num(x.b) : Math.max(t.b, num(x.b)); return t; }
  // view: "" 전체 · f 친구 판 · a AI 판 (예전 기기 기록 base 는 AI 판으로 셈 — 고스톱처럼 기기 기록에 친구 판이 섞인 게임은
  //   은행 장부로 채운 친구 판만큼을 base/_ledger 에 마이너스로 넣어 빼 둠, 11-01)
  function totalOf(rec, view) {
    const t = Z(), m = rec.m || {};
    if (view !== "a") merge(t, m.f);
    if (view !== "f") {
      merge(t, m.a); merge(t, m.h);
      const o = Z(); for (const b of Object.values(rec.base || {})) merge(o, { ...b, p: num(b.w) });
      for (const k of ["n", "w", "l", "d", "p"]) t[k] += Math.max(0, o[k]); if (o.b != null) t.b = t.b == null ? o.b : Math.max(t.b, o.b);
    }
    return t;
  }

  // ── 랭킹 창
  const css = `
.rk-ov{position:fixed;inset:0;z-index:210;background:rgba(4,9,16,.8);backdrop-filter:blur(6px);display:grid;place-items:center;padding:12px}
.rk-box{position:relative;background:var(--card,#142030);color:var(--ink,#f1f5f9);border:1.5px solid rgba(255,255,255,.15);border-radius:20px;width:min(520px,100%);max-height:100%;overflow:auto;padding:18px 14px 14px;display:grid;gap:12px;font:14px/1.45 var(--text,system-ui,"Malgun Gothic",sans-serif)}
.rk-box>*{min-width:0}.rk-body{display:grid;gap:10px;min-width:0}
.rk-box h2{margin:0;font:800 20px var(--round,inherit);color:#fde68a}
.rk-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;font-size:16px;cursor:pointer}
.rk-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.rk-chips::-webkit-scrollbar{display:none}
.rk-chips button,.rk-seg button{flex:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;border-radius:99px;padding:6px 11px;font:700 13px inherit;cursor:pointer;white-space:nowrap}
.rk-chips button.on,.rk-seg button.on{background:#f59e0b;color:#1c1917;border-color:#f59e0b}
.rk-seg{display:flex;gap:6px}
.rk-t{width:100%;border-collapse:collapse;font-size:13px}
.rk-t th{font-size:12px;color:var(--soft,#94a3b8);font-weight:700;text-align:right;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.1)}
.rk-t td{text-align:right;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap}
.rk-t th:nth-child(-n+2),.rk-t td:nth-child(-n+2){text-align:left}
.rk-t tr.me td{background:rgba(245,158,11,.12)}.rk-t td b{color:#fde68a}
.rk-sub{font:800 14px var(--round,inherit);margin:4px 0 -4px}
.rk-soft{color:var(--soft,#94a3b8);font-size:12.5px;margin:0}
.rk-bars{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-items:end;height:64px}
.rk-bars div{background:#3fae7a;border-radius:4px 4px 0 0;min-height:2px;position:relative}
.rk-bars span{position:absolute;bottom:100%;left:0;right:0;text-align:center;font-size:10.5px;color:var(--soft,#94a3b8)}
.rk-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:10.5px;color:var(--soft,#94a3b8);text-align:center}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  async function open(game, opt = {}) {
    style();
    const ov = document.createElement("div"); ov.className = "rk-ov";
    ov.innerHTML = `<div class="rk-box"><button class="rk-x" aria-label="닫기">✕</button><h2>🏆 랭킹</h2><div class="rk-body"><p class="rk-soft">불러오는 중…</p></div></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    addEventListener("keydown", onKey, true);
    ov.addEventListener("click", e => { if (e.target === ov || e.target.closest(".rk-x")) close(); });
    const body = ov.querySelector(".rk-body");
    const d = await db();
    if (!d) { body.innerHTML = `<p class="rk-soft">랭킹은 인터넷에 연결된 실제 사이트에서 보여요</p>`; return; }
    const games = opt.games || Object.keys(NAMES).filter(g => g !== "sc");
    let cur = game && games.includes(game) ? game : games[0], view = "all", recs = {}, days = {};
    const day7 = Array.from({ length: 7 }, (_, i) => kstDay(Date.now() - (6 - i) * 864e5));
    try {
      const [r, ...ds] = await Promise.all([d.ref(`${P}rank`).get(), ...day7.map(x => d.ref(`${P}rank_days/${x}`).get())]);
      recs = r.val() || {}; ds.forEach((s, i) => { days[day7[i]] = s.val() || {}; });
    } catch (e) { body.innerHTML = `<p class="rk-soft">랭킹을 못 불러왔어요 (${esc(e.message)})</p>`; return; }
    const my = me();
    const draw = () => {
      const g = recs[cur] || {}, money = MONEY.has(cur);
      const rows = Object.entries(g).map(([pid, rec]) => ({ pid, name: rec.name || "?", t: totalOf(rec, view === "all" ? "" : view) })).filter(r => r.t.n > 0);
      const key = money && view === "f" ? r => r.t.s : r => r.t.p * 1000 + (r.t.n ? r.t.w / r.t.n : 0);
      rows.sort((a, b) => key(b) - key(a) || b.t.n - a.t.n);
      const plays = day7.map(x => Object.values((days[x] || {})[cur] || {}).reduce((s, v) => s + num(v), 0));
      const mx = Math.max(1, ...plays);
      const vs = my && g[my.pid] && g[my.pid].vs ? Object.entries(g[my.pid].vs) : [];
      const lastCol = money && view === "f" ? "딴 돈" : "승점";
      body.innerHTML = `
        <div class="rk-chips">${games.map(x => `<button data-g="${x}" class="${x === cur ? "on" : ""}">${esc(NAMES[x] || x)}</button>`).join("")}</div>
        <div class="rk-seg">${[["all", "전체"], ["f", "👥 친구 판"], ["a", "🤖 AI 판"]].map(([v, l]) => `<button data-v="${v}" class="${v === view ? "on" : ""}">${l}</button>`).join("")}</div>
        ${rows.length ? `<table class="rk-t"><tr><th>#</th><th>이름</th><th>판</th><th>승</th><th>패</th><th>승률</th><th>${lastCol}</th></tr>
          ${rows.map((r, i) => `<tr class="${my && r.pid === my.pid ? "me" : ""}"><td>${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td><td>${esc(r.name)}</td><td>${r.t.n}</td><td>${r.t.w}</td><td>${r.t.l}</td><td>${r.t.n ? Math.round(r.t.w / r.t.n * 100) + "%" : "-"}</td><td><b>${money && view === "f" ? (r.t.s > 0 ? "+" : "") + (r.t.s * 100).toLocaleString() + "원" : r.t.p.toLocaleString()}</b></td></tr>`).join("")}</table>`
        : `<p class="rk-soft">아직 기록이 없어요. 한 판 하면 여기에 올라와요.</p>`}
        <p class="rk-soft">${money && view === "f" ? "친구 판은 딴 돈 합으로 줄 세워요" : "승점 = 이긴 사람 수 (셋이서 1등이면 2점)"} · 🤖 AI 판에는 랭킹 전 기기에 있던 혼자 하기 기록도 들어 있어요</p>
        ${vs.length ? `<div class="rk-sub">⚔️ 내 상대 전적 (친구 판)</div><table class="rk-t"><tr><th></th><th>상대</th><th>판</th><th>승</th><th>패</th><th>비김</th><th></th></tr>
          ${vs.map(([op, v]) => `<tr><td></td><td>${esc((g[op] && g[op].name) || "?")}</td><td>${num(v.n)}</td><td>${num(v.w)}</td><td>${num(v.l)}</td><td>${num(v.d)}</td><td></td></tr>`).join("")}</table>` : ""}
        <div class="rk-sub">📅 최근 7일 판 수 · ${esc(NAMES[cur] || cur)}</div>
        <div class="rk-bars">${plays.map(v => `<div style="height:${Math.round(v / mx * 100)}%"><span>${v || ""}</span></div>`).join("")}</div>
        <div class="rk-days">${day7.map(x => `<span>${+x.slice(8)}일</span>`).join("")}</div>`;
      const ch = body.querySelector(".rk-chips"), on = ch && ch.querySelector(".on"); if (on) ch.scrollLeft = on.offsetLeft - ch.offsetLeft - (ch.clientWidth - on.offsetWidth) / 2;   // 칩 줄만 옆으로 (창 전체가 밀리지 않게)
    };
    body.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.g) { cur = b.dataset.g; draw(); } else if (b.dataset.v) { view = b.dataset.v; draw(); }
    });
    draw();
  }

  window.GRank = { result, migrateLocal: migrateWhenReady, open, NAMES };
})();
