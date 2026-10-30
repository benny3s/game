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
  const save = m => { me = m; try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} for (const f of listeners) try { f(me); } catch (e) {} };
  const listeners = [];

  const css = `
.gme-ov{position:fixed;inset:0;z-index:50;background:rgba(60,45,35,.42);display:grid;place-items:center;padding:16px}
.gme-box{background:var(--card,#fff);color:var(--ink,#333);border-radius:24px;padding:20px;width:min(420px,100%);display:grid;gap:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);max-height:calc(100dvh - 32px);overflow:auto}
.gme-box h2{margin:0;font:24px/1.2 var(--round,inherit)}
.gme-box p{margin:0;font-size:14px;color:var(--soft,#888)}
.gme-in{font:17px var(--text,inherit);background:#fffaf4;color:var(--ink,#333);border:2px solid var(--line,#eee);border-radius:14px;padding:11px 13px;width:100%;box-sizing:border-box;outline:none}
.gme-in:focus{border-color:var(--accent,#f90)}
.gme-list{display:grid;gap:6px}
.gme-it{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:2px solid var(--line,#eee);background:#fffaf4;color:var(--ink,#333);border-radius:14px;padding:10px 12px;font:16px var(--text,inherit);cursor:pointer}
.gme-it b{font-family:var(--round,inherit);font-weight:400;font-size:17px}
.gme-it span{margin-left:auto;font-size:13px;color:var(--soft,#888)}
.gme-it.new{border-style:dashed;border-color:var(--accent,#f90)}
.gme-it:active{transform:translateY(1px)}
.gme-x{justify-self:end;border:0;background:none;color:var(--soft,#888);font-size:14px;cursor:pointer;padding:4px}
.gme-msg{min-height:1.2em;font-size:13px;color:var(--bad,#e55)}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  async function loadAll(db, tries = 3) {
    let v;
    try { v = (await db.ref(P + "gp/players").get()).val() || {}; }
    catch (e) { if (tries <= 1) throw e; await new Promise(r => setTimeout(r, 900)); return loadAll(db, tries - 1); }   // 막 로그인한 직후엔 권한이 늦게 붙기도 함
    return Object.entries(v).filter(([, p]) => p && p.n).map(([pid, p]) => ({ pid, n: p.n, l: p.l || 0 }));
  }
  function touch(db) { if (me && db) db.ref(P + "gp/players/" + me.pid + "/l").set(firebase.database.ServerValue.TIMESTAMP).catch(() => {}); }

  function pick(db, { canClose = false, title = "이름을 알려 주세요" } = {}) {
    style();
    return new Promise(resolve => {
      const ov = document.createElement("div"); ov.className = "gme-ov";
      ov.innerHTML = `<div class="gme-box">
        ${canClose ? '<button class="gme-x" data-x>닫기 ✕</button>' : ""}
        <h2>${esc(title)}</h2>
        <p>친구들에게 보이는 이름이에요. 다른 폰에서도 같은 이름을 고르면 기록이 이어져요.</p>
        <input class="gme-in" maxlength="12" placeholder="이름 (12자까지)" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
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
        list.innerHTML = hits.map(p => `<button class="gme-it" data-pid="${esc(p.pid)}">👤 <b>${esc(p.n)}</b><span>${me && me.pid === p.pid ? "지금 나" : "이어서 하기"}</span></button>`).join("")
          + (q && !exact ? `<button class="gme-it new" data-new>✨ <b>${esc(q)}</b><span>새로 시작</span></button>` : "")
          + (!q && !hits.length ? "<p>아직 아무도 없어요. 이름을 적어 주세요.</p>" : "")
          + (!q && hits.length ? "<p style='font-size:12.5px'>최근에 온 사람들이에요. 내 이름을 적어서 찾거나 새로 시작하세요.</p>" : "");
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
          if (!r.committed) {                                                // 그새 누가 같은 이름을 만들었으면 그 이름으로
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

  let pending = null;                                                       // 이름 창이 두 번 뜨지 않게
  function ensure(db) { return pending || (pending = ensure1(db).finally(() => { pending = null; })); }
  async function ensure1(db) {
    if (me && me.pid) {                                                      // 관리자가 이름을 바꿨거나 지웠으면 따라감
      try {
        const p = (await db.ref(P + "gp/players/" + me.pid).get()).val();
        if (!p) { me = null; } else { if (p.n !== me.name) save({ pid: me.pid, name: p.n }); touch(db); return me; }
      } catch (e) { return me; }
    }
    return pick(db);
  }

  window.GME = { get me() { return me; }, P, ensure, pick, loadAll, onChange: f => listeners.push(f), nameKey };
  if (typeof document !== "undefined" && !window.Gate) {
    const cur = document.currentScript && document.currentScript.src;
    const base = cur ? cur.replace(/\/me\.js.*$/, "/gate.js?v=1") : "../common/gate.js?v=1";
    const gs = document.createElement("script");
    gs.src = base;
    document.head.appendChild(gs);
  }
})();
