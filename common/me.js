/* 게임 사이트 공통 '이름 로그인' — PIN 없이 이름만. 다른 폰에서도 같은 이름을 고르면 기록이 이어짐
   gp/players/{pid} = { n: 이름, c: 만든 시각, l: 마지막 접속 }, gp/names/{이름 키} = pid (같은 이름 두 번 못 만들게)
   ?guest(시험) 이면 test/gp/... 를 써서 실제 명단·기록을 더럽히지 않음
   쓰는 법: GME.ensure(db) → { pid, name } (없으면 이름 고르는 창), GME.pick(db, { canClose: true }) 로 바꾸기 */
(() => {
  const GUEST = new URLSearchParams(location.search).has("guest");
  const P = GUEST ? "test/" : "";
  const KEY = GUEST ? "game.me.test" : "game.me";
  const nameKey = n => n.trim().toLowerCase().replace(/\s+/g, "").replace(/[.#$\[\]\/]/g, "_");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let me = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })();
  const save = m => {
    me = m;
    try {
      localStorage.setItem(KEY, JSON.stringify(m));
      if (m && m.name) localStorage.setItem("game.arena.name", m.name);
    } catch (e) {}
    for (const f of listeners) try { f(me); } catch (e) {}
  };
  const listeners = [];

  const css = `
.gme-ov{position:fixed;inset:0;z-index:220;background:rgba(4,9,16,.82);backdrop-filter:blur(8px);display:grid;place-items:center;padding:16px;-webkit-tap-highlight-color:transparent}
.gme-box{background:var(--card,#142030);border:1.5px solid var(--card-border,rgba(255,255,255,.16));color:var(--ink,#f1f5f9);border-radius:22px;padding:22px 20px;width:min(420px,100%);display:grid;gap:12px;box-shadow:0 24px 60px rgba(0,0,0,.7);max-height:calc(100dvh - 32px);overflow:auto;font:15px/1.5 var(--text,system-ui,"Malgun Gothic",sans-serif)}
.gme-box h2{margin:0;font:800 22px/1.2 var(--round,inherit);color:#fde68a}
.gme-box p{margin:0;font-size:13.5px;color:var(--soft,#94a3b8)}
.gme-in{font:600 16px var(--text,inherit);background:rgba(0,0,0,.35);color:var(--ink,#f1f5f9);border:1.5px solid var(--line,rgba(255,255,255,.18));border-radius:12px;padding:11px 14px;width:100%;box-sizing:border-box;outline:none}
.gme-in:focus{border-color:var(--gold,#f59e0b)}
.gme-list{display:grid;gap:7px}
.gme-it{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1.5px solid var(--line,rgba(255,255,255,.14));background:rgba(255,255,255,.06);color:var(--ink,#f1f5f9);border-radius:13px;padding:11px 14px;font:600 15.5px var(--text,inherit);cursor:pointer;transition:background .15s,border-color .15s}
.gme-it:hover{background:rgba(255,255,255,.12);border-color:var(--gold,#f59e0b)}
.gme-it b{font-family:var(--round,inherit);font-weight:700;font-size:16.5px;color:#fff}
.gme-it span{margin-left:auto;font-size:12.5px;color:#fde68a;font-weight:700}
.gme-it.new{border-style:dashed;border-color:var(--accent,#10b981);background:rgba(16,185,129,.12)}
.gme-it:active{transform:translateY(1px)}
.gme-x{justify-self:end;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:var(--ink,#f1f5f9);border-radius:8px;font-size:13px;cursor:pointer;padding:4px 10px}
.gme-msg{min-height:1.2em;font-size:13px;color:var(--bad,#f87171)}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  async function loadAll(db, tries = 2) {
    let v;
    try {
      const p = db.ref(P + "gp/players").get();
      const res = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("시간 초과")), 3500))]);
      v = res.val() || {};
    } catch (e) {
      if (tries <= 1) throw e;
      await new Promise(r => setTimeout(r, 500));
      return loadAll(db, tries - 1);
    }
    return Object.entries(v).filter(([, p]) => p && p.n).map(([pid, p]) => ({ pid, n: p.n, l: p.l || 0 }));
  }
  function touch(db) { if (me && db) db.ref(P + "gp/players/" + me.pid + "/l").set(firebase.database.ServerValue.TIMESTAMP).catch(() => {}); }

  function pick(db, { canClose = false, title = "플레이어 프로필 선택" } = {}) {
    style();
    return new Promise(resolve => {
      const ov = document.createElement("div"); ov.className = "gme-ov";
      ov.innerHTML = `<div class="gme-box">
        ${canClose ? '<button class="gme-x" data-x>닫기 ✕</button>' : ""}
        <h2>👤 ${esc(title)}</h2>
        <p>친구들에게 보이는 이름이에요. 기존 이름을 누르면 전적과 기록이 그대로 이어집니다.</p>
        <input class="gme-in" maxlength="12" placeholder="새 이름 입력 또는 아래에서 선택" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
        <div class="gme-list"></div><div class="gme-msg"></div></div>`;
      document.body.appendChild(ov);
      const inp = ov.querySelector("input"), list = ov.querySelector(".gme-list"), msg = ov.querySelector(".gme-msg");
      let all = null, busy = false;
      const done = m => { ov.remove(); resolve(m); };
      const draw = () => {
        const q = inp.value.trim(), k = q ? nameKey(q) : "";
        if (!all) { list.innerHTML = '<p>명단 불러오는 중…</p>'; return; }
        const hits = q ? all.filter(p => nameKey(p.n).includes(k)).sort((a, b) => (nameKey(b.n) === k) - (nameKey(a.n) === k) || b.l - a.l).slice(0, 8)
                       : all.slice().sort((a, b) => b.l - a.l).slice(0, 6);
        const exact = q && all.some(p => nameKey(p.n) === k);
        list.innerHTML = hits.map(p => `<button class="gme-it" data-pid="${esc(p.pid)}">👤 <b>${esc(p.n)}</b><span>${me && me.pid === p.pid ? "지금 나" : "이어서 하기 →"}</span></button>`).join("")
          + (q && !exact ? `<button class="gme-it new" data-new>✨ <b>${esc(q)}</b><span>새 프로필로 시작</span></button>` : "")
          + (!q && !hits.length ? "<p>위 입력칸에 이름을 적고 시작해 주세요.</p>" : "")
          + (!q && hits.length ? "<p style='font-size:12px;margin-top:2px'>위 목록에서 내 이름을 누르거나, 새 이름을 입력해 주세요.</p>" : "");
      };
      inp.addEventListener("input", () => { msg.textContent = ""; draw(); });
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { const b = list.querySelector(".gme-it"); if (b && inp.value.trim()) b.click(); } });
      ov.addEventListener("click", async e => {
        if (e.target.closest("[data-x]")) { done(me); return; }
        const it = e.target.closest(".gme-it"); if (!it || busy) return;
        if (it.dataset.pid) { const p = all.find(x => x.pid === it.dataset.pid); save({ pid: p.pid, name: p.n }); touch(db); done(me); return; }
        const n = inp.value.trim().slice(0, 12); if (!n) return;
        busy = true; msg.textContent = "";
        try {
          const pid = db.ref(P + "gp/players").push().key;
          const r = await db.ref(P + "gp/names/" + nameKey(n)).transaction(cur => cur == null ? pid : undefined);
          if (!r.committed) {
            const other = r.snapshot.val(), p = (await db.ref(P + "gp/players/" + other).get()).val();
            save({ pid: other, name: (p && p.n) || n });
          } else {
            await db.ref(P + "gp/players/" + pid).set({ n, c: firebase.database.ServerValue.TIMESTAMP, l: firebase.database.ServerValue.TIMESTAMP });
            save({ pid, name: n });
          }
          done(me);
        } catch (err) { msg.textContent = "저장하지 못했어요: " + err.message; busy = false; }
      });
      setTimeout(() => inp.focus(), 50);
      loadAll(db).then(a => { all = a; draw(); }).catch(err => { all = []; msg.textContent = "명단을 못 불러왔어요: " + err.message; draw(); });
      draw();
    });
  }

  let pending = null;
  function ensure(db) { return pending || (pending = ensure1(db).finally(() => { pending = null; })); }
  async function ensure1(db) {
    if (me && me.pid) {
      try {
        const p = (await Promise.race([
          db.ref(P + "gp/players/" + me.pid).get(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))
        ])).val();
        if (!p) { me = null; } else { if (p.n !== me.name) save({ pid: me.pid, name: p.n }); touch(db); return me; }
      } catch (e) { return me; }
    }
    return pick(db, { canClose: true });
  }

  window.GME = { get me() { return me; }, P, ensure, pick, loadAll, onChange: f => listeners.push(f), nameKey };
  if (typeof document !== "undefined" && !window.Gate) {
    const cur = document.currentScript && document.currentScript.src;
    const base = cur ? cur.replace(/\/me\.js.*$/, "/gate.js?v=5") : "../common/gate.js?v=5";
    const gs = document.createElement("script");
    gs.src = base;
    document.head.appendChild(gs);
  }
})();
