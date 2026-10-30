/* 게임 공통 '친구랑' 화면 — 방 만들기 · 코드나 초대 링크로 들어가기 · 열린 방 목록 · 대기실(참가자·설정·시작)
   common/arena.js(연결) + common/me.js(사이트 공통 이름) 위에서 동작. 색·글꼴은 게임의 CSS 변수를 따름
   (--card --ink --soft --accent --line --round --text, 없으면 기본값)
   쓰는 법:
     ArenaUI.open({
       game: "volley", title: "냥냥 배구", max: 2, min: 2,
       settings: { defaults: { pts: 11 }, label: cfg => cfg.pts + "점", render(el, cfg, canEdit, update) { … update({ pts: 15 }) … } },
       describe(count, cfg) { return count >= 3 ? "3명이면 고스톱" : "2명이면 맞고"; },   // (선택) 지금 인원이면 어떻게 되는지 한 줄
       coach: true,      // (선택) 대기실에 'AI 선생님 (모두에게 보이기)' 켜기 — 방장만 바꿈, cfg.coach(true/false, 기본 false)
       onStart(ctx) {},  // 경기 시작: ctx = { net, role: "host"|"guest", code, cfg, players, uid } — 실제 인원은 ctx.players 로
       onLobby(ctx) {},  // 방장이 모두를 대기실로 되돌림 (게임 화면 정리)
       onLeave(why) {},  // 방을 나감 (메뉴로)
     });
   · 인원은 미리 정하지 않음: 방장이 방을 열면 최대(max) 인원까지 들어오고, min 명 이상이면 방장이 아무 때나 시작
     describe 가 { text, ok: false } 를 돌려주면 시작 버튼을 잠금 (예: 이 설정은 4명이어야 해요)
   · 방 만들기는 관리자·허용된 기기만. 권한이 없으면 Gate.requestHost() 창(기기 허용 / 방 링크 받기)을 띄움
     ArenaUI.toLobby()  — 방장: 판이 끝난 뒤 모두 대기실로 · ArenaUI.leave() · ArenaUI.net (지금 연결) */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = `
.arn-ov{position:fixed;inset:0;z-index:60;background:rgba(4,9,16,.76);backdrop-filter:blur(8px);display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 12px) 14px calc(env(safe-area-inset-bottom,0px) + 12px);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.arn-box{position:relative;background:var(--card,#142030);border:1.5px solid var(--card-border,rgba(255,255,255,.15));color:var(--ink,#f1f5f9);border-radius:22px;padding:22px 18px 18px;width:min(440px,100%);max-height:100%;overflow:auto;display:grid;gap:14px;box-shadow:0 24px 60px rgba(0,0,0,.65);font:15px/1.5 var(--text,system-ui,"Malgun Gothic",sans-serif)}
.arn-box h2{margin:0;font:800 22px/1.2 var(--round,inherit);color:#fde68a;padding-right:40px}
.arn-box p{margin:0}
.arn-soft{color:var(--soft,#94a3b8);font-size:13.5px}
.arn-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:var(--ink,#f1f5f9);font-size:16px;cursor:pointer}
.arn-btn{font:700 15px/1 var(--round,inherit);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:13px 16px;cursor:pointer;background:rgba(255,255,255,.08);color:var(--ink,#f1f5f9);transition:transform .08s,background .15s}
.arn-btn:hover:not(:disabled){background:rgba(255,255,255,.14)}
.arn-btn:active{transform:translateY(1px)}
.arn-btn:disabled{opacity:.42;cursor:default}
.arn-btn.pri{background:linear-gradient(135deg,var(--accent,#10b981),var(--accent-d,#047857));border-color:rgba(255,255,255,.22);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.arn-row{display:flex;gap:8px;align-items:center}
.arn-row>*{min-width:0}
.arn-me{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:9px 12px}
.arn-me b{font:700 15.5px var(--round,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arn-me button{margin-left:auto;border:0;background:none;color:var(--soft,#94a3b8);font:600 13px var(--text,inherit);cursor:pointer;padding:4px 6px}
.arn-code{flex:1;font:800 20px/1 var(--round,inherit);letter-spacing:6px;text-transform:uppercase;text-align:center;border:1.5px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.28);color:var(--ink,#f1f5f9);border-radius:12px;padding:11px 10px;outline:none;width:100%}
.arn-code:focus{border-color:var(--gold,#f59e0b)}
.arn-list{display:grid;gap:8px}
.arn-room{display:flex;align-items:center;gap:10px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.22);border-radius:14px;padding:10px 12px}
.arn-room .who{display:grid;line-height:1.3;min-width:0}
.arn-room .who b{font:700 15.5px var(--round,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arn-room .who span{font-size:12.5px;color:var(--soft,#94a3b8)}
.arn-room .arn-btn{margin-left:auto;padding:9px 14px;font-size:14px;white-space:nowrap}
.arn-big{display:grid;justify-items:center;gap:4px;background:rgba(0,0,0,.32);border:1px solid rgba(245,158,11,.35);border-radius:16px;padding:14px}
.arn-big span{font-size:12.5px;color:var(--soft,#94a3b8)}
.arn-big b{font:900 36px/1.05 var(--round,inherit);color:#fde68a;letter-spacing:8px}
.arn-pl{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.07)}
.arn-pl b{font:700 15px var(--round,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arn-pl i{font-style:normal;font-size:12px;color:var(--soft,#8b7b70);white-space:nowrap}
.arn-pl .dot{width:9px;height:9px;border-radius:50%;flex:none;background:#c9c0b8}
.arn-pl .dot.ok{background:#3fae7a}.arn-pl .dot.slow{background:#f5b942}
.arn-pl .kick{margin-left:auto;border:0;background:none;color:var(--soft,#8b7b70);cursor:pointer;font-size:13px;padding:4px}
.arn-set:empty{display:none}
.arn-set{display:grid;gap:8px}
.arn-msg{min-height:1.3em;font-size:13.5px;color:var(--bad,#e5536b)}
.arn-wait{text-align:center;color:var(--soft,#8b7b70);font-size:14px;padding:4px 0}
.arn-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px;color:var(--soft,#94a3b8)}
.arn-desc{text-align:center;font:700 14px/1.4 var(--round,inherit);color:var(--ink,#f1f5f9);background:rgba(127,127,127,.12);border:1px dashed var(--line,rgba(255,255,255,.2));border-radius:12px;padding:8px 10px}
.arn-desc.no{color:var(--bad,#e5536b)}
.arn-coach{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(0,0,0,.2);border:1px solid var(--line,rgba(255,255,255,.1));font-size:14px;cursor:pointer;user-select:none}
.arn-coach.ro{cursor:default}
.arn-coach span{flex:1;min-width:0}
.arn-coach small{display:block;font-size:12px;color:var(--soft,#94a3b8)}
.arn-sw{position:relative;flex:none;width:44px;height:26px;border-radius:99px;background:rgba(127,127,127,.35);transition:background .15s}
.arn-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .15s}
.arn-coach input{position:absolute;opacity:0;pointer-events:none}
.arn-coach input:checked+.arn-sw{background:var(--accent,#10b981)}
.arn-coach input:checked+.arn-sw::after{transform:translateX(18px)}
.arn-coach input:focus-visible+.arn-sw{outline:2px solid var(--gold,#f59e0b);outline-offset:2px}
.arn-coach .st{font-weight:800;font-size:13px}
.arn-wait::after{content:"";display:inline-block;width:1.2em;text-align:left;animation:arn-dots 1.2s steps(4) infinite}
@keyframes arn-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
.arn-ctab{position:fixed;left:0;top:44%;z-index:55;width:38px;height:46px;border:1px solid rgba(255,255,255,.22);border-left:0;border-radius:0 14px 14px 0;background:rgba(15,23,42,.72);color:#fff;font-size:19px;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent}
.arn-ctab i{position:absolute;top:-5px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ef4444;color:#fff;font:800 11px/18px system-ui,sans-serif;font-style:normal;text-align:center}
.arn-cbub{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);z-index:56;max-width:min(86vw,420px);display:grid;gap:6px;pointer-events:none}
.arn-cbub div{background:rgba(15,23,42,.9);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:7px 12px;font:600 14.5px/1.35 var(--text,system-ui,"Malgun Gothic",sans-serif);box-shadow:0 6px 18px rgba(0,0,0,.4);animation:arn-bub .25s ease-out;overflow-wrap:anywhere}
.arn-cbub b{color:#fde68a;margin-right:6px}
@keyframes arn-bub{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.arn-cpan{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:57;width:min(440px,100%);background:var(--card,#142030);color:var(--ink,#f1f5f9);border:1.5px solid rgba(255,255,255,.15);border-bottom:0;border-radius:20px 20px 0 0;padding:12px 12px calc(env(safe-area-inset-bottom,0px) + 12px);display:grid;gap:8px;box-shadow:0 -12px 40px rgba(0,0,0,.5);font:15px/1.45 var(--text,system-ui,"Malgun Gothic",sans-serif)}
.arn-cpan .hd{display:flex;align-items:center;justify-content:space-between;font:800 16px var(--round,inherit)}
.arn-cpan .hd button{width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:inherit;cursor:pointer}
.arn-clog{max-height:min(34vh,260px);overflow:auto;display:grid;gap:4px;align-content:start;background:rgba(0,0,0,.22);border-radius:12px;padding:8px 10px;font-size:14px}
.arn-clog:empty::before{content:"아직 대화가 없어요";color:var(--soft,#94a3b8)}
.arn-clog div{overflow-wrap:anywhere}.arn-clog b{color:#fde68a;margin-right:6px}.arn-clog .me b{color:#86efac}
.arn-cq{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.arn-cq button{flex:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:inherit;border-radius:99px;padding:7px 11px;font:600 13.5px var(--text,inherit);cursor:pointer;white-space:nowrap}
.arn-cin{flex:1;min-width:0;border:1.5px solid var(--line,rgba(255,255,255,.18));background:rgba(0,0,0,.28);color:inherit;border-radius:12px;padding:10px 12px;font:15px var(--text,inherit);outline:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  let opt = null, net = null, ov = null, box = null, me = null, listT = null, offs = [], cfg = null, playing = false;
  const clearList = () => { clearInterval(listT); listT = null; };
  // ── 💬 채팅 (방에 있는 동안 모든 게임 공통): 왼쪽 가장자리 손잡이 · 새 말은 위에 말풍선
  const QUICK = ["👍 좋아요", "😂 ㅋㅋㅋ", "⏰ 빨리 해요~", "🤔 잠깐만요", "🔥 고!", "✋ 스톱!", "😭 아이고", "🎉 한 판 더!"];
  let chat = null;
  function chatOn() {
    style();
    if (!chat) {
      const tab = document.createElement("button"); tab.className = "arn-ctab"; tab.type = "button"; tab.setAttribute("aria-label", "채팅"); tab.innerHTML = "💬";
      const bub = document.createElement("div"); bub.className = "arn-cbub";
      const pan = document.createElement("div"); pan.className = "arn-cpan"; pan.hidden = true;
      pan.innerHTML = `<div class="hd"><span>💬 채팅</span><button type="button" data-cx aria-label="닫기">✕</button></div><div class="arn-clog"></div>
        <div class="arn-cq">${QUICK.map(q => `<button type="button">${esc(q)}</button>`).join("")}</div>
        <div class="arn-row"><input class="arn-cin" maxlength="120" placeholder="말 보내기" enterkeyhint="send"><button class="arn-btn pri" type="button" data-cs>보내기</button></div>`;
      document.body.append(tab, bub, pan);
      chat = { tab, bub, pan, log: pan.querySelector(".arn-clog"), inp: pan.querySelector(".arn-cin"), unread: 0, quietUntil: 0 };
      const badge = () => { tab.innerHTML = "💬" + (chat.unread ? `<i>${chat.unread > 9 ? "9+" : chat.unread}</i>` : ""); };
      chat.badge = badge;
      const send = t => { t = String(t || "").trim().slice(0, 120); if (!t || !net || !net.chat) return; net.chat(t).catch(() => {}); };
      tab.onclick = () => { pan.hidden = !pan.hidden; if (!pan.hidden) { chat.unread = 0; badge(); chat.log.scrollTop = 1e9; } };
      pan.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.matches("[data-cx]")) pan.hidden = true;
        else if (b.matches("[data-cs]")) { send(chat.inp.value); chat.inp.value = ""; }
        else if (b.parentNode.classList.contains("arn-cq")) { send(b.textContent); pan.hidden = true; }
      });
      chat.inp.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { send(chat.inp.value); chat.inp.value = ""; } });
    }
    chat.log.innerHTML = ""; chat.unread = 0; chat.badge(); chat.pan.hidden = true; chat.tab.hidden = false;
    chat.quietUntil = Date.now() + 1500;                      // 들어올 때 받는 지난 대화는 말풍선 없이 기록에만
  }
  // ── 📊 방 기록 (모든 게임 공통, 관리자만 읽음): logs/{게임}/{날짜}/{세션} — 방 · 참가자 들어옴·나감 · 판 시작 · 채팅. 방장만 씀
  let log = null, logSeen = new Set();
  const logTS = () => firebase.database.ServerValue.TIMESTAMP;
  const logSafe = p => { if (p && p.catch) p.catch(() => {}); };
  function logStart() {
    log = null; logSeen = new Set();
    if (!net || !net.isHost || Arena.mock || Arena.GUEST || !window.firebase || !Arena.db) return;
    try {
      const t = new Date(Date.now() + 9 * 3600e3).toISOString();
      const sid = `${t.slice(0, 10)}/${t.slice(11, 19).replace(/:/g, "")}_${net.code}`;
      log = Arena.db().ref(`logs/${opt.game}/${sid}`);
      logSafe(log.child("info").set({ game: opt.game, room: net.code, host: net.uid, hostName: (me && me.name) || "", created: logTS(), updated: logTS() }));
    } catch (e) { log = null; }
  }
  function logPlayers(pl) {
    if (!log) return;
    const now = new Set(Object.keys(pl || {}));
    for (const u of now) if (!logSeen.has(u)) logSafe(log.child(`players/${u}`).update({ name: (pl[u] && pl[u].name) || "?", role: u === net.uid ? "방장" : pl[u] && pl[u].watch ? "구경" : "참가", joined: logTS() }));
    for (const u of logSeen) if (!now.has(u)) logSafe(log.child(`players/${u}`).update({ left: logTS() }));
    logSeen = now;
  }
  function logMatch() {
    if (!log || !net) return;
    const pl = net.players || {};
    logSafe(log.child("matches").push({ start: logTS(), players: Object.keys(pl).map(u => (pl[u] && pl[u].name) || "?").join(", "), cfg: opt.settings && opt.settings.label ? String(opt.settings.label(curCfg()) || "").slice(0, 80) : "" }));
  }
  function logChat(c) { if (log && c && c.m) logSafe(log.child("chat").push({ u: c.u || "", n: c.n || "", m: String(c.m).slice(0, 120), t: c.t || logTS() })); }
  function logEnd() { if (log) logSafe(log.child("info").update({ closed: logTS(), updated: logTS() })); log = null; }

  function chatOff() { if (!chat) return; chat.tab.hidden = true; chat.pan.hidden = true; chat.bub.innerHTML = ""; }
  function onChat(c) {
    if (!chat || !c || !c.m) return;
    const mine = net && c.u === net.uid;
    const d = document.createElement("div"); if (mine) d.className = "me";
    d.innerHTML = `<b>${esc(c.n || "?")}</b>${esc(c.m)}`;
    chat.log.appendChild(d); while (chat.log.children.length > 60) chat.log.firstChild.remove();
    chat.log.scrollTop = 1e9;
    if (mine || Date.now() < chat.quietUntil) return;
    if (chat.pan.hidden) { chat.unread++; chat.badge(); }
    const b = document.createElement("div"); b.innerHTML = `<b>${esc(c.n || "?")}</b>${esc(c.m)}`;
    chat.bub.appendChild(b); while (chat.bub.children.length > 3) chat.bub.firstChild.remove();
    setTimeout(() => b.remove(), 4500);
  }

  const show = () => { style(); if (!ov) { ov = document.createElement("div"); ov.className = "arn-ov"; ov.innerHTML = '<div class="arn-box"></div>'; document.body.appendChild(ov); box = ov.firstChild; } ov.hidden = false; };
  const hide = () => { clearList(); if (ov) ov.hidden = true; };
  const setUrlRoom = code => { try { const u = new URL(location.href); if (code) u.searchParams.set("room", code); else u.searchParams.delete("room"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash); } catch (e) {} };

  async function myName() {
    if (window.GME && !Arena.mock) {
      if (!GME.me && ov) ov.hidden = true;
      me = await GME.ensure(Arena.db());
      if (!me) return null;
      if (ov) ov.hidden = false;
      return me.name;
    }
    let n = ""; try { n = localStorage.getItem("game.arena.name") || ""; } catch (e) {}
    me = { name: n || "친구" + Math.floor(Math.random() * 90 + 10) }; return me.name;
  }

  // ── 첫 화면: 방 만들기(관리자·허용된 기기 — 아니면 누를 때 기기 허용 창) · 코드로 들어가기 · 열린 방
  function home(msg = "") {
    show(); clearList();
    const canHost = Arena.canHost !== false;
    const isAdmin = !!Arena.isAdmin;
    box.innerHTML = `<button class="arn-x" id="arLeave" data-x aria-label="닫기">✕</button>
      <h2>친구랑 ${esc(opt.title)}</h2>
      <div class="arn-me">👤 <b>${esc(me ? me.name : "")}</b>${canHost ? '<span style="font-size:12px;background:rgba(63,174,122,.16);color:#2d8a5e;padding:3px 8px;border-radius:99px;white-space:nowrap">✅ 방 만들기 가능</span>' : ''}${window.GME && !Arena.mock ? '<button data-rename>이름 바꾸기</button>' : ""}</div>
      <button class="arn-btn${canHost ? " pri" : ""}" id="arCreate" data-host>🏠 방 만들기 (친구 초대)</button>
      ${canHost ? "" : `<p class="arn-soft" style="margin-top:-6px">방 만들기는 허용된 기기만 돼요. 친구가 보낸 <b>방 링크</b>나 <b>코드</b>로는 바로 들어갈 수 있어요.</p>`}
      <div class="arn-row"><input class="arn-code" maxlength="4" placeholder="방 코드" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go"><button class="arn-btn" data-join>들어가기</button></div>
      <div class="arn-msg">${esc(msg)}</div>
      <p class="arn-soft">열린 방</p><div class="arn-list"><p class="arn-soft">찾는 중…</p></div>
      ${isAdmin && !Arena.mock && window.Gate && Gate.openAdminModal ? `<div style="border-top:1px solid var(--line,rgba(0,0,0,.08));padding-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="arn-soft" style="font-size:12.5px">👑 다른 기기 허용하기 (코드·요청)</span><button class="arn-btn" data-admin style="padding:8px 12px;font-size:13px">기기 관리</button></div>` : ""}`;
    const inp = box.querySelector(".arn-code");
    inp.addEventListener("input", () => { inp.value = Arena.cleanCode(inp.value); });
    inp.addEventListener("keydown", e => { if (e.key === "Enter") box.querySelector("[data-join]").click(); });
    const draw = async () => {
      const el = box && box.querySelector(".arn-list"); if (!el) return;
      let rows = [];
      try { rows = await Arena.listRooms(opt.game); } catch (e) { el.innerHTML = `<p class="arn-soft">목록을 못 불러왔어요</p>`; return; }
      if (!box || !box.contains(el)) return;
      el.innerHTML = rows.length ? rows.map(r => {
        const full = r.n >= r.max, busy = r.ph === "play";
        const state = r.empty ? "빈 방" : busy ? "게임 중" : full ? "꽉 참" : "기다리는 중";
        const btn = r.empty ? `<button class="arn-btn" data-del="${esc(r.code)}">지우기</button>` : `<button class="arn-btn" data-code="${esc(r.code)}" ${full ? "disabled" : ""}>${busy ? "구경하기" : "들어가기"}</button>`;   // 게임 중인 방도 들어가면 게임이 구경·다음 판으로 받음
        return `<div class="arn-room"><div class="who"><b>${esc(r.h || "?")}의 방</b><span>${esc(state)} · ${r.n}/${r.max}명${r.m ? " · " + esc(r.m) : ""}</span></div>${btn}</div>`;
      }).join("") : `<p class="arn-soft">${canHost ? "아직 열린 방이 없어요. 방을 만들고 친구에게 초대 링크를 보내 보세요." : "지금 열린 방이 없어요. 초대 링크나 방 코드를 받으면 들어갈 수 있어요."}</p>`;
    };
    draw(); listT = setInterval(draw, 4000);
  }

  // ── 대기실
  function lobby() {
    show(); clearList();
    const isHost = net.isHost;
    box.innerHTML = `<button class="arn-x" data-leave aria-label="나가기">✕</button>
      <h2>${esc(opt.title)} 대기실</h2>
      <div class="arn-big"><span>방 코드</span><b id="arCode">${esc(net.code)}</b></div>
      <button class="arn-btn" data-share>🔗 초대 링크 보내기</button>
      <div class="arn-head"><span>참가자</span><span data-count></span></div>
      <div class="arn-list" data-pl></div>
      <div class="arn-desc" data-desc hidden></div>
      <div class="arn-set" data-set></div>
      ${opt.coach ? `<div data-coach></div>` : ""}
      <div class="arn-msg" data-msg></div>
      ${isHost ? `<button class="arn-btn pri" id="arStart" data-start disabled>시작하기</button>` : `<p class="arn-wait">방장이 시작하면 바로 시작돼요</p>`}
      <button class="arn-btn" id="arLeave" data-leave>나가기</button>`;
    drawPlayers(); drawSettings(); drawCoach();
  }
  const maxOf = () => (net && net.meta && net.meta.max) || opt.max || opt.maxPlayers || 2;
  const minOf = () => opt.min || opt.minPlayers || 2;
  const curCfg = () => (net && net.meta && net.meta.cfg) || cfg || (opt.settings && opt.settings.defaults) || {};
  // 게임이 새 설정을 만들 때도 공통 설정(AI 선생님)은 그대로 이어감
  const keepCommon = next => { const c = curCfg(); next = { ...(next || {}) }; if (opt.coach && !("coach" in next)) next.coach = !!c.coach; return next; };
  // 실제 인원 (구경꾼 제외)
  const seatedIds = () => { const pl = (net && net.players) || {}; return Object.keys(pl).filter(u => !(pl[u] && pl[u].watch)); };
  function describe(n) {
    if (typeof opt.describe !== "function") return null;
    try {
      const r = opt.describe(n, curCfg());
      if (r == null || r === "") return null;
      return typeof r === "object" ? { text: String(r.text || ""), ok: r.ok !== false } : { text: String(r), ok: true };
    } catch (e) { console.error(e); return null; }
  }
  function drawPlayers() {
    if (!box || !net) return; const el = box.querySelector("[data-pl]"); if (!el) return;
    const pl = net.players || {}, host = net.meta && net.meta.host, peers = net.isHost ? new Map(net.peers()) : null;
    const ids = Object.keys(pl).sort((a, b) => (b === host) - (a === host) || (pl[a].t || 0) - (pl[b].t || 0));
    el.innerHTML = ids.map(uid => {
      const p = pl[uid] || {}, mine = uid === net.uid;
      const dot = uid === host ? "" : peers ? `<span class="dot ${peers.get(uid) ? "ok" : "slow"}" title="${peers.get(uid) ? "직접 연결" : "서버 경유"}"></span>` : "";
      return `<div class="arn-pl">${uid === host ? "👑" : "🙂"} <b>${esc(p.name || "?")}</b>${mine ? "<i>나</i>" : ""}${p.watch ? "<i>구경</i>" : ""}${dot}${net.isHost && !mine ? `<button class="kick" data-kick="${esc(uid)}">내보내기</button>` : ""}</div>`;
    }).join("");
    const n = seatedIds().length, min = minOf(), max = maxOf();
    const cnt = box.querySelector("[data-count]"); if (cnt) cnt.textContent = min === max ? `${n}/${max}명` : `${n}명 · ${min}~${max}명까지`;
    const d = describe(n), dEl = box.querySelector("[data-desc]");
    if (dEl) { dEl.hidden = !d || !d.text; if (d) { dEl.textContent = d.text; dEl.classList.toggle("no", !d.ok); } }
    const btn = box.querySelector("[data-start]");
    if (btn) {
      const okDesc = !d || d.ok;
      btn.disabled = n < min || !okDesc;
      btn.textContent = n < min ? `친구를 기다리는 중 (${n}/${min}명)` : !okDesc ? "지금 인원으로는 못 해요" : `시작하기 (${n}명)`;
    }
  }
  function drawSettings() {
    if (!box || !net) return; const el = box.querySelector("[data-set]"); if (!el) return;
    const c = curCfg();
    if (opt.settings && opt.settings.render) {
      el.innerHTML = "";
      opt.settings.render(el, c, net.isHost, patch => { if (!net.isHost) return; cfg = { ...c, ...patch }; net.setPhase("lobby", cfg); drawSettings(); });
    } else if (opt.buildConfig && opt.buildConfig.length >= 1 && net.isHost) {
      if (el._built) return;                                  // 한 번만 그림 (다시 그리면 고른 값이 처음으로 돌아가고 듣기가 겹침)
      el._built = true; el.innerHTML = "";
      const fn = opt.buildConfig(el);
      if (typeof fn === "function") {
        opt._getBuiltCfg = fn;
        const upd = () => setTimeout(() => { if (!net || !net.isHost || playing) return; cfg = keepCommon(fn()); net.setPhase("lobby", cfg); }, 0);
        el.addEventListener("click", upd); el.addEventListener("change", upd);
        upd();                                                // 보이는 값 = 쓰는 값 (대기실로 돌아왔을 때도)
      }
    } else if (opt.extraOptionsHtml && net.isHost) {
      if (el._built) return;
      el._built = true; el.innerHTML = opt.extraOptionsHtml;
      el.addEventListener("change", () => {
        if (opt.buildConfig) { cfg = keepCommon(opt.buildConfig()); net.setPhase("lobby", cfg); }
      });
    } else if (opt.renderConfig) {
      el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(opt.renderConfig(c))}</p>`;
    } else el.innerHTML = "";
    drawPlayers();                                            // 설정이 바뀌면 describe 글도 다시
  }
  // 'AI 선생님 (모두에게 보이기)' — 방장만 바꾸고, 친구는 보기만
  function drawCoach() {
    if (!box || !net || !opt.coach) return; const el = box.querySelector("[data-coach]"); if (!el) return;
    const on = !!curCfg().coach;
    if (net.isHost) {
      const inp = el.querySelector("input");
      if (inp) { inp.checked = on; return; }
      el.innerHTML = `<label class="arn-coach"><span>🧑‍🏫 AI 선생님 (모두에게 보이기)<small>켜면 모두의 화면에 추천 수와 까닭이 떠요</small></span><input type="checkbox" data-coach-sw ${on ? "checked" : ""}><i class="arn-sw" aria-hidden="true"></i></label>`;
      el.querySelector("input").addEventListener("change", e => {
        if (!net || !net.isHost) return;
        cfg = { ...curCfg(), coach: !!e.target.checked }; net.setPhase("lobby", cfg);
      });
    } else {
      el.innerHTML = `<div class="arn-coach ro"><span>🧑‍🏫 AI 선생님 (모두에게 보이기)<small>방장이 정해요</small></span><b class="st" style="color:${on ? "var(--good,#3fae7a)" : "var(--soft,#94a3b8)"}">${on ? "켜짐" : "꺼짐"}</b></div>`;
    }
  }
  const ctx = () => ({ net, role: net.isHost ? "host" : "guest", code: net.code, cfg: (net.meta && net.meta.cfg) || cfg, players: net.players, uid: net.uid, name: me && me.name });

  function wire() {
    offs.forEach(f => f()); offs = [];
    chatOn(); offs.push(net.on("chat", onChat));
    if (net.isHost) { logStart(); offs.push(net.on("players", logPlayers)); offs.push(net.on("chat", logChat)); }
    offs.push(net.on("players", () => { if (!playing) drawPlayers(); }));
    if (net.isHost) offs.push(net.on("p2p", () => { if (!playing) drawPlayers(); }));
    offs.push(net.on("meta", m => {
      if (!m) return;
      if (m.phase === "play" && !playing) { playing = true; hide(); logMatch(); opt.onStart && opt.onStart(ctx()); }
      else if (m.phase === "lobby" && playing) { playing = false; opt.onLobby && opt.onLobby(ctx()); lobby(); }
      else if (!playing) { drawSettings(); drawCoach(); }
    }));
    if (!net.isHost) {
      offs.push(net.on("closed", () => end("방장이 방을 닫았어요")));
      offs.push(net.on("kicked", () => end("방장이 방에서 내보냈어요")));
      offs.push(net.on("conn", (c, why) => { const m = box && box.querySelector("[data-msg]"); if (m && !playing) m.textContent = c ? "" : why || ""; }));
    }
  }
  function end(why) {
    logEnd();
    const was = net; net = null; playing = false; offs.forEach(f => f()); offs = []; chatOff();
    if (was) was.leave();
    setUrlRoom(null);
    hide();
    opt.onLeave && opt.onLeave(why || "");
    if (why) { home(why); }
  }

  async function doHost() {
    const b = box.querySelector("[data-host]"); if (b) { b.disabled = true; b.textContent = "방 만드는 중…"; }
    try {
      let built = {};
      if (opt.buildConfig) {
        if (opt.buildConfig.length >= 1) {
          const tmp = document.createElement("div");
          const fn = opt.buildConfig(tmp);
          built = typeof fn === "function" ? fn() : (fn || {});
        } else {
          built = opt.buildConfig() || {};
        }
      }
      cfg = { ...(opt.settings && opt.settings.defaults || {}), ...built, ...(cfg || {}) };
      if (opt.coach) cfg.coach = false;                       // 새 방은 AI 선생님 꺼진 채로 시작
      net = await Arena.host(opt.game, { name: me.name, cfg, max: opt.max || opt.maxPlayers || 2, label: (opt.settings && opt.settings.label) || opt.renderConfig });
      playing = false; wire(); setUrlRoom(net.code); lobby();
    } catch (e) { home("방을 못 만들었어요: " + e.message); }
  }
  // 방 만들기 권한이 없으면 기기 허용 창(Gate) → 허용되면 바로 방 만들기
  async function tryHost() {
    if (Arena.canHost !== false) return doHost();
    if (!window.Gate || !Gate.requestHost) { home("방 만들기는 허용된 기기만 돼요. 친구에게 방 링크를 받아 주세요"); return; }
    if (ov) ov.hidden = true;
    let ok = false;
    try { ok = await Gate.requestHost({ game: opt.game, title: opt.title }); } catch (e) { console.warn(e); }
    if (ok && Arena.refreshPerms) { try { await Arena.refreshPerms(); } catch (e) {} }
    if (net) return;                                          // 그 사이 다른 방에 들어감
    if (ok && Arena.canHost !== false) { show(); doHost(); }
    else home(ok ? "허용은 됐는데 확인이 늦어요. 잠시 뒤 다시 눌러 주세요" : "");
  }
  async function doJoin(code) {
    code = Arena.cleanCode(code);
    if (code.length !== 4) { const m = box.querySelector(".arn-msg"); if (m) m.textContent = "코드 4글자를 적어 주세요"; return; }
    show(); box.innerHTML = `<h2>들어가는 중…</h2><p class="arn-wait">방 ${esc(code)}</p>`;
    try {
      net = await Arena.join(opt.game, code, { name: me.name });
      playing = false; wire(); setUrlRoom(net.code);
      if (net.meta && net.meta.phase === "play") { playing = true; hide(); opt.onStart && opt.onStart(ctx()); }   // 판이 이미 진행 중이면 바로 (게임이 알아서 구경·다음 판)
      else lobby();
    } catch (e) {
      net = null; setUrlRoom(null);
      if (e && e.own) Arena.deleteRoom(opt.game, code).catch(() => {});   // 내가 만든 방 (방장이 새로 고침) → 닫고 처음 화면으로
      home(e.message);
    }
  }
  async function share() {
    const url = Arena.inviteUrl(net.code), m = box.querySelector("[data-msg]");
    const text = `${opt.title} 같이 해요! 방 코드 ${net.code}`;
    try { if (navigator.share) { await navigator.share({ title: opt.title, text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); if (m) { m.style.color = "var(--good,#3fae7a)"; m.textContent = "링크를 복사했어요. 친구에게 붙여 넣어 보내세요"; } }
    catch (e) { if (m) { m.style.color = ""; m.textContent = url; } }
  }

  function onClick(e) {
    const t = e.target.closest("button"); if (!t || !ov || !ov.contains(t)) return;
    if (t.matches("[data-x]")) { hide(); opt.onLeave && opt.onLeave(""); }
    else if (t.matches("[data-rename]")) { if (ov) ov.hidden = true; GME.pick(Arena.db(), { canClose: true }).then(m => { if (m) me = m; home(); }); }
    else if (t.matches("[data-host]")) tryHost();
    else if (t.matches("[data-join]")) doJoin(box.querySelector(".arn-code").value);
    else if (t.matches("[data-admin]")) { if (window.Gate && Gate.openAdminModal) Gate.openAdminModal(); }
    else if (t.dataset.code) doJoin(t.dataset.code);
    else if (t.dataset.del) { t.disabled = true; Arena.deleteRoom(opt.game, t.dataset.del).catch(() => {}).then(() => home()); }
    else if (t.matches("[data-share]")) share();
    else if (t.matches("[data-start]")) { if (net && net.isHost) { const c = (net.meta && net.meta.cfg) || cfg; net.setPhase("play", c); } }
    else if (t.dataset.kick) { if (net && net.isHost) net.kick(t.dataset.kick); }
    else if (t.matches("[data-leave]")) end("");
  }

  async function open(o) {
    opt = o; style(); show();
    box.innerHTML = `<button class="arn-x" data-x aria-label="닫기">✕</button><h2>친구랑 ${esc(o.title)}</h2><p class="arn-wait">연결하는 중</p>`;
    if (!ov.dataset.wired) { ov.addEventListener("click", onClick); ov.dataset.wired = "1"; }
    try {
      await Arena.init();
      const picked = await myName();
      if (!picked) { hide(); opt.onLeave && opt.onLeave(""); return; }
    } catch (e) {
      show();
      box.innerHTML = `<button class="arn-x" data-x>✕</button><h2>연결하지 못했어요</h2><p class="arn-soft">인터넷 연결을 확인하고 다시 해 주세요. (${esc(e.message)})</p>`;
      return;
    }
    if (net && net.gone) { offs.forEach(f => f()); offs = []; net = null; playing = false; chatOff(); }   // 게임 쪽에서 이미 나간 방이면 잊고 새로
    if (net) { playing ? hide() : lobby(); return; }
    const code = Arena.roomFromUrl();
    if (code) doJoin(code); else home();
  }

  window.ArenaUI = {
    open,
    toLobby() { if (net && net.isHost) { playing = false; net.setPhase("lobby"); opt.onLobby && opt.onLobby(ctx()); lobby(); } },
    leave() { if (net) end(""); },
    get net() { return net; }, get playing() { return playing; }, get me() { return me; },
    hasInvite: () => !!Arena.roomFromUrl(),
    checkUrl(fn) {
      const sp = new URLSearchParams(location.search);
      if (Arena.roomFromUrl() || sp.get("room") === "host" || sp.has("host_invite")) {
        setTimeout(() => {
          if (typeof fn === "function") fn();
          else if (fn && typeof fn === "object") open(fn);
        }, 60);
      }
    },
  };
})();
