/* 게임 사이트 공통 '이름 로그인' — 이름(6자까지) + 🔒 PIN 4자리는 '다른 기기에서 이미 있는 이름을 고를 때'만 물음 (10-31 베니 님)
   gp/players/{pid} = { n: 이름, c: 만든 시각, l: 마지막 접속, h: PIN 지문(SHA-256 앞 32자) }, gp/names/{이름 키} = pid (같은 이름 두 번 못 만들게)
   · 새 이름은 PIN 을 정해서 만듦 · PIN 없는 예전 이름은 다른 기기에서 처음 고를 때 정함 · 한 번 정한 PIN 은 관리자만 지움(규칙)
   · 서버 확인 없이 기기에서 맞춰 보는 '실수·사칭 막기' 수준 (진짜 잠금은 아님)
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
        <input class="gme-in" maxlength="6" placeholder="새 이름 (6자까지) 또는 아래에서 선택" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
        <div class="gme-list"></div><div class="gme-msg"></div>
        ${me ? `<button class="gme-it" data-mg style="justify-content:center;font-size:14px">⚙️ 내 프로필 — 닉네임·PIN 바꾸기</button>` : ""}</div>`;
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
        if (e.target.closest("[data-mg]")) { ov.remove(); resolve(await manage(db)); return; }
        const it = e.target.closest(".gme-it"); if (!it || busy) return;
        if (it.dataset.pid) {
          const p = all.find(x => x.pid === it.dataset.pid);
          if (me && me.pid === p.pid) { touch(db); done(me); return; }   // 이 기기에서 쓰던 이름은 PIN 안 물음
          busy = true; msg.textContent = "";
          try { if (await claim(db, p.pid, p.n)) { save({ pid: p.pid, name: p.n }); touch(db); done(me); return; } }
          catch (err) { msg.textContent = "확인하지 못했어요: " + err.message; }
          busy = false; return;
        }
        const n = inp.value.trim().slice(0, 6); if (!n) return;
        busy = true; msg.textContent = "";
        try {
          // 11-01: 새 이름은 PIN 을 먼저 받고 이름·프로필을 한 번에 씀 (예전엔 이름부터 잡아서, PIN 치다 새로 고침하면 '유령 이름'이 남음 — 규칙상 PIN 없는 이름은 못 지움)
          let other = (await db.ref(P + "gp/names/" + nameKey(n)).get()).val();
          if (!other) {
            const pin = await askPin({ title: `🔒 '${n}' PIN 4자리 정하기`, sub: "다른 기기에서 이 이름으로 이어 할 때만 물어요. 이 기기에서는 다시 안 물어요." });
            if (!pin) { busy = false; return; }
            const r = await createNamed(db, n, pin);
            if (r.pid) { save({ pid: r.pid, name: n }); done(me); return; }
            other = r.other;                                    // 그 사이 누가 먼저 만듦 → 있는 이름 고르기
          }
          const p = (await db.ref(P + "gp/players/" + other).get()).val();
          if (await claim(db, other, (p && p.n) || n)) save({ pid: other, name: (p && p.n) || n }); else { busy = false; return; }
          done(me);
        } catch (err) { msg.textContent = "저장하지 못했어요: " + err.message; busy = false; }
      });
      setTimeout(() => inp.focus(), 50);
      loadAll(db).then(a => { all = a; draw(); }).catch(err => { all = []; msg.textContent = "명단을 못 불러왔어요: " + err.message; draw(); });
      draw();
    });
  }

  // 🔒 PIN: 지문 = SHA-256('bennygame:' + pid + ':' + PIN) 앞 32자 (같은 PIN 이라도 사람마다 다름)
  async function pinHash(pid, pin) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bennygame:" + pid + ":" + pin));
    return Array.from(new Uint8Array(b)).slice(0, 16).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  function askPin({ title, sub }) {
    style();
    return new Promise(resolve => {
      const ov = document.createElement("div"); ov.className = "gme-ov"; ov.style.zIndex = "230";
      ov.innerHTML = `<div class="gme-box"><h2>${esc(title)}</h2><p>${esc(sub)}</p>
        <input class="gme-in gme-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="숫자 4자리">
        <div class="gme-msg"></div><div style="display:flex;gap:8px"><button class="gme-it" data-no style="justify-content:center">취소</button><button class="gme-it new" data-ok style="justify-content:center"><b>확인</b></button></div></div>`;
      document.body.appendChild(ov);
      const inp = ov.querySelector("input"), m = ov.querySelector(".gme-msg");
      const fin = v => { ov.remove(); resolve(v); };
      const ok = () => { const v = inp.value.replace(/\D/g, ""); if (v.length !== 4) { m.textContent = "숫자 4자리로 적어 주세요"; inp.focus(); return; } fin(v); };
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 4); m.textContent = ""; if (inp.value.length === 4) setTimeout(ok, 120); });
      inp.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
      ov.querySelector("[data-ok]").onclick = ok;
      ov.querySelector("[data-no]").onclick = () => fin(null);
      setTimeout(() => inp.focus(), 50);
    });
  }
  // 🔒 PIN 확인은 서버 규칙이 함 (11-01): 지문은 gp/pins/{pid} — 아무도 못 읽음. 맞춰 보기 = gp/pinchk/{pid}/{내 uid} 에 지문을 써 봄
  //   → 규칙이 gp/pins 와 같을 때만 받아 줌. 받아 준 기록(pinchk)이 있어야 닉네임·PIN 을 바꿀 수 있음 (PIN 을 바꾸면 다른 기기 기록은 저절로 무효)
  const uidOf = db => { try { return ((db && db.app) ? db.app.auth() : firebase.auth()).currentUser.uid; } catch (e) { return null; } };   // 게임마다 이름 붙은 앱(arena·guest…)을 쓰니 넘겨받은 db 의 앱으로
  const hasPin = rec => !!(rec && (rec.hp || rec.h));
  const isDenied = e => /permission|PERMISSION_DENIED/i.test(String((e && (e.code || e.message)) || ""));
  async function prove(db, pid, pin) {
    const uid = uidOf(db);
    if (!uid) throw new Error("로그인 확인 중이에요. 잠시 뒤에 다시 해 주세요.");
    try { await db.ref(P + "gp/pinchk/" + pid + "/" + uid).set(await pinHash(pid, pin)); return true; }
    catch (e) { if (isDenied(e)) return false; throw e; }
  }
  // PIN 이 없던 프로필에 처음 정함 (지문 · 이 기기 확인 · '있음' 표시를 한 번에)
  //   n: 프로필에 이름(n)이 없으면(예전 판이 남긴 '유령 이름' — names 만 있음) 같이 채움 (규칙이 n 없는 프로필을 안 받음)
  async function setFirstPin(db, pid, pin, n) {
    const h = await pinHash(pid, pin), uid = uidOf(db);
    if (!uid) throw new Error("로그인 확인 중이에요. 잠시 뒤에 다시 해 주세요.");
    const up = { ["pins/" + pid]: h, ["pinchk/" + pid + "/" + uid]: h, ["players/" + pid + "/hp"]: true };
    if (n) up["players/" + pid + "/n"] = String(n).slice(0, 6);
    await db.ref(P + "gp").update(up);
  }
  // 새 닉네임: 이름 자리(names)·프로필·PIN 을 한 번에 씀 → 끊겨도 반쯤 남지 않음 → { pid } · 이미 있는 이름이면(규칙이 거절) { other: 그 pid }
  async function createNamed(db, n, pin) {
    const pid = db.ref(P + "gp/players").push().key, key = nameKey(n);
    const TS = firebase.database.ServerValue.TIMESTAMP, h = await pinHash(pid, pin), uid = uidOf(db);
    if (!uid) throw new Error("로그인 확인 중이에요. 잠시 뒤에 다시 해 주세요.");
    try { await db.ref(P + "gp").update({ ["names/" + key]: pid, ["players/" + pid]: { n, c: TS, l: TS, hp: true }, ["pins/" + pid]: h, ["pinchk/" + pid + "/" + uid]: h }); return { pid }; }
    catch (e) {
      const other = isDenied(e) ? (await db.ref(P + "gp/names/" + key).get().catch(() => null)) : null;
      if (other && other.val()) return { other: other.val() };
      throw e;
    }
  }
  // 예전 PIN(gp/players/{pid}/h — 누구나 읽던 지문) → 새 자리(gp/pins)로 옮김. 이 기기가 그 이름을 쓰고 있거나 방금 PIN 을 맞췄을 때만
  const isLegacy = rec => !!(rec && rec.h && !rec.hp);
  async function migrateLegacy(db, pid, h) {
    const uid = uidOf(db); if (!uid || !h) return;
    try { await db.ref(P + "gp").update({ ["pins/" + pid]: h, ["pinchk/" + pid + "/" + uid]: h, ["players/" + pid + "/hp"]: true, ["players/" + pid + "/h"]: null }); }
    catch (e) { if (!isDenied(e)) throw e; await db.ref(P + "gp/pinchk/" + pid + "/" + uid).set(h).catch(() => {}); }   // 이미 옮겨졌으면 이 기기 확인만
  }
  // 다른 기기에서 이미 있는 이름 고르기: PIN 이 있으면 맞춰 보고, 없으면(예전 이름) 지금 정함 → true = 써도 됨
  let missN = 0, missUntil = 0;
  const missMsg = () => `PIN 이 여러 번 틀렸어요. ${Math.ceil((missUntil - Date.now()) / 1000)}초 뒤에 다시 해 주세요.`;
  const miss = () => { if (++missN >= 5) { missN = 0; missUntil = Date.now() + 30000; } };
  async function claim(db, pid, name) {
    const rec = (await db.ref(P + "gp/players/" + pid).get()).val() || {};
    if (!hasPin(rec)) {
      const pin = await askPin({ title: `🔒 '${name}' PIN 정하기`, sub: "이 이름에 아직 PIN 이 없어요. 4자리를 정하면 다른 기기에서 이어 할 때 물어요." });
      if (!pin) return false;
      await setFirstPin(db, pid, pin, rec.n ? "" : name);
      return true;
    }
    for (;;) {
      if (Date.now() < missUntil) { alert(missMsg()); return false; }
      const pin = await askPin({ title: `🔒 '${name}' PIN 4자리`, sub: "다른 기기에서 이 이름으로 이어 해요. PIN 을 잊었으면 베니(관리자)에게 말하면 지워 줘요." });
      if (!pin) return false;
      if (isLegacy(rec)) { if ((await pinHash(pid, pin)) === rec.h) { missN = 0; await migrateLegacy(db, pid, rec.h).catch(() => {}); return true; } }
      else if (await prove(db, pid, pin)) { missN = 0; return true; }
      miss();
      if (Date.now() >= missUntil) alert("PIN 이 달라요. 다시 적어 주세요.");
    }
  }

  // 가입 신청 창(gate.js)에서: 닉네임 + PIN 으로 프로필 만들기 또는 이어 받기 (창 없이) → { pid, name, isNew }
  //   이 기기에서 쓰던 닉네임이면 PIN 안 봄 · 새 닉네임이면 PIN 으로 만듦 · 남의(이미 있는) 닉네임이면 PIN 이 맞아야 함
  async function register(db, rawName, pin) {
    const n = String(rawName || "").trim().slice(0, 6);
    if (!n) throw new Error("닉네임을 적어 주세요.");
    if (me && me.pid && nameKey(me.name) === nameKey(n)) { touch(db); return { pid: me.pid, name: me.name, isNew: false }; }
    if (!/^\d{4}$/.test(String(pin || ""))) throw new Error("PIN 숫자 4자리를 적어 주세요.");
    if (Date.now() < missUntil) throw new Error(missMsg());
    const r = await createNamed(db, n, pin);                  // 이름·프로필·PIN 한 번에 (실패해도 이름만 남지 않음)
    if (r.pid) { save({ pid: r.pid, name: n }); return { pid: r.pid, name: n, isNew: true }; }
    const other = r.other, rec = (await db.ref(P + "gp/players/" + other).get()).val() || {};
    if (!hasPin(rec)) await setFirstPin(db, other, pin, rec.n ? "" : n);
    else if (isLegacy(rec) && (await pinHash(other, pin)) === rec.h) await migrateLegacy(db, other, rec.h).catch(() => {});
    else if (isLegacy(rec) || !(await prove(db, other, pin))) {
      miss();
      throw new Error(`'${rec.n || n}' 은(는) 이미 있는 닉네임이에요. 내 닉네임이면 PIN 을 다시 확인해 주세요 (잊었으면 베니에게).`);
    }
    missN = 0;
    save({ pid: other, name: rec.n || n });
    touch(db);
    return { pid: other, name: rec.n || n, isNew: false };
  }

  // ✏️ 닉네임 바꾸기 · 🔒 PIN 바꾸기 — 둘 다 '지금 PIN' 으로 본인 확인 (서버 규칙이 pinchk 로 확인)
  async function proveOrThrow(db, pid, pin) {
    if (Date.now() < missUntil) throw new Error(missMsg());
    const rec = (await db.ref(P + "gp/players/" + pid).get()).val() || {};
    if (!hasPin(rec)) throw new Error("이 닉네임은 아직 PIN 이 없어요. 먼저 '🔒 PIN 바꾸기'에서 새 PIN 만 적어 정해 주세요.");   // PIN 이 지워진 이름 — 틀린 횟수로 안 셈
    if (!/^\d{4}$/.test(String(pin || ""))) throw new Error("지금 PIN 숫자 4자리를 적어 주세요.");
    if (isLegacy(rec)) {
      if ((await pinHash(pid, pin)) !== rec.h) { miss(); throw new Error("지금 PIN 이 달라요."); }
      await migrateLegacy(db, pid, rec.h);
    } else if (!(await prove(db, pid, pin))) { miss(); throw new Error("지금 PIN 이 달라요."); }
    missN = 0;
  }
  async function rename(db, newName, pin) {
    if (!me || !me.pid) throw new Error("먼저 닉네임을 골라 주세요.");
    const n = String(newName || "").trim().slice(0, 6), oldKey = nameKey(me.name), key = n ? nameKey(n) : "";
    if (!n) throw new Error("새 닉네임을 적어 주세요.");
    if (key === oldKey) { if (n !== me.name) { await proveOrThrow(db, me.pid, pin); await db.ref(P + "gp/players/" + me.pid + "/n").set(n); save({ pid: me.pid, name: n }); } return me; }
    await proveOrThrow(db, me.pid, pin);
    const r = await db.ref(P + "gp/names/" + key).transaction(cur => cur == null ? me.pid : undefined);
    if (!r.committed && r.snapshot.val() !== me.pid) throw new Error(`'${n}' 은(는) 이미 누가 쓰고 있어요.`);
    try { await db.ref(P + "gp/players/" + me.pid + "/n").set(n); }
    catch (e) { await db.ref(P + "gp/names/" + key).remove().catch(() => {}); throw e; }
    await db.ref(P + "gp/names/" + oldKey).remove().catch(() => {});      // 예전 닉네임은 다른 사람이 쓸 수 있게
    save({ pid: me.pid, name: n });
    return me;
  }
  async function changePin(db, oldPin, newPin) {
    if (!me || !me.pid) throw new Error("먼저 닉네임을 골라 주세요.");
    if (!/^\d{4}$/.test(String(newPin || ""))) throw new Error("새 PIN 숫자 4자리를 적어 주세요.");
    const rec = (await db.ref(P + "gp/players/" + me.pid).get()).val() || {};
    if (!hasPin(rec)) { await setFirstPin(db, me.pid, newPin); return; }
    await proveOrThrow(db, me.pid, oldPin);
    const h = await pinHash(me.pid, newPin);
    await db.ref(P + "gp").update({ ["pins/" + me.pid]: h, ["pinchk/" + me.pid + "/" + uidOf(db)]: h });
  }
  // 👤 내 프로필 창: 닉네임 바꾸기 · PIN 바꾸기 · 다른 닉네임으로
  function manage(db) {
    style();
    return new Promise(resolve => {
      const ov = document.createElement("div"); ov.className = "gme-ov";
      const pinIn = (id, ph) => `<input class="gme-in" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="${ph}">`;
      let tab = "";
      const draw = () => {
        ov.innerHTML = `<div class="gme-box">
          <button class="gme-x" data-x>닫기 ✕</button>
          <h2>👤 내 프로필</h2>
          <p>${me ? `지금 닉네임 <b style="color:#fde68a">${esc(me.name)}</b> · 이 기기` : "아직 닉네임이 없어요"}</p>
          <div class="gme-list">
            <button class="gme-it" data-t="name">✏️ <b>닉네임 바꾸기</b><span>전적·기록은 그대로</span></button>
            ${tab === "name" ? `<input class="gme-in" id="gmeNew" maxlength="6" placeholder="새 닉네임 (6자까지)" autocomplete="off">${pinIn("gmeOld", "지금 PIN 4자리")}<button class="gme-it new" data-do="name" style="justify-content:center"><b>바꾸기</b></button>` : ""}
            <button class="gme-it" data-t="pin">🔒 <b>PIN 바꾸기</b><span>다른 기기는 새 PIN 을 물어요</span></button>
            ${tab === "pin" ? `${pinIn("gmeOld", "지금 PIN 4자리")}${pinIn("gmeNewPin", "새 PIN 4자리")}<button class="gme-it new" data-do="pin" style="justify-content:center"><b>바꾸기</b></button>` : ""}
            <button class="gme-it" data-t="pick">👥 <b>다른 닉네임으로</b><span>목록에서 고르기</span></button>
          </div>
          <div class="gme-msg"></div>
          <p style="font-size:12px">PIN 을 잊었으면 베니(관리자)에게 말하면 지워 줘요. 그 뒤 새로 정하면 돼요.</p></div>`;
        ov.querySelectorAll("input").forEach(x => { if (x.inputMode === "numeric") x.oninput = () => { x.value = x.value.replace(/\D/g, "").slice(0, 4); }; });
        const f = ov.querySelector("#gmeNew") || ov.querySelector("#gmeOld"); if (f) setTimeout(() => f.focus(), 40);
      };
      const fin = v => { ov.remove(); resolve(v); };
      ov.addEventListener("click", async e => {
        if (e.target === ov || e.target.closest("[data-x]")) return fin(me);
        const t = e.target.closest("[data-t]");
        if (t) { if (t.dataset.t === "pick") { ov.remove(); resolve(await pick(db, { canClose: true })); return; } tab = tab === t.dataset.t ? "" : t.dataset.t; draw(); return; }
        const d = e.target.closest("[data-do]"); if (!d || d.disabled) return;
        const msg = ov.querySelector(".gme-msg"), v = id => (ov.querySelector("#" + id) || {}).value || "";
        d.disabled = true; msg.textContent = "";
        try {
          if (d.dataset.do === "name") { await rename(db, v("gmeNew"), v("gmeOld")); tab = ""; draw(); ov.querySelector(".gme-msg").style.color = "#86efac"; ov.querySelector(".gme-msg").textContent = `✅ 닉네임을 '${me.name}' (으)로 바꿨어요`; }
          else { await changePin(db, v("gmeOld"), v("gmeNewPin")); tab = ""; draw(); ov.querySelector(".gme-msg").style.color = "#86efac"; ov.querySelector(".gme-msg").textContent = "✅ PIN 을 바꿨어요"; }
        } catch (err) { msg.textContent = err.message || "바꾸지 못했어요"; d.disabled = false; }
      });
      draw();
      document.body.appendChild(ov);
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
        if (!p) { me = null; } else { if (p.n !== me.name) save({ pid: me.pid, name: p.n }); if (isLegacy(p)) migrateLegacy(db, me.pid, p.h).catch(() => {}); touch(db); return me; }
      } catch (e) { return me; }
    }
    return pick(db, { canClose: true });
  }

  window.GME = { get me() { return me; }, P, ensure, pick, register, manage, rename, changePin, loadAll, onChange: f => listeners.push(f), nameKey };
  if (typeof document !== "undefined" && !window.Gate) {
    const cur = document.currentScript && document.currentScript.src;
    const base = cur ? cur.replace(/\/me\.js.*$/, "/gate.js?v=16") : "../common/gate.js?v=16";
    const gs = document.createElement("script");
    gs.src = base;
    document.head.appendChild(gs);
  }
})();
