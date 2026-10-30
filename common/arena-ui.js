/* 게임 공통 '친구랑' 화면 — 방 만들기 · 코드나 초대 링크로 들어가기 · 열린 방 목록 · 대기실(참가자·설정·시작)
   common/arena.js(연결) + common/me.js(사이트 공통 이름) 위에서 동작. 색·글꼴은 게임의 CSS 변수를 따름
   (--card --ink --soft --accent --line --round --text, 없으면 기본값)
   쓰는 법:
     ArenaUI.open({
       game: "volley", title: "냥냥 배구", max: 2, min: 2,
       settings: { defaults: { pts: 11 }, label: cfg => cfg.pts + "점", render(el, cfg, canEdit, update) { … update({ pts: 15 }) … } },
       onStart(ctx) {},  // 경기 시작: ctx = { net, role: "host"|"guest", code, cfg, players, uid }
       onLobby(ctx) {},  // 방장이 모두를 대기실로 되돌림 (게임 화면 정리)
       onLeave(why) {},  // 방을 나감 (메뉴로)
     });
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
.arn-wait::after{content:"";display:inline-block;width:1.2em;text-align:left;animation:arn-dots 1.2s steps(4) infinite}
@keyframes arn-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  let opt = null, net = null, ov = null, box = null, me = null, listT = null, offs = [], cfg = null, playing = false;
  const clearList = () => { clearInterval(listT); listT = null; };
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

  // ── 첫 화면: 방 만들기(관리자·가족 호스트만) · 코드로 들어가기 · 열린 방
  function home(msg = "") {
    show(); clearList();
    const canHost = Arena.canHost !== false;
    const isAdmin = !!Arena.isAdmin;
    box.innerHTML = `<button class="arn-x" id="arLeave" data-x aria-label="닫기">✕</button>
      <h2>친구랑 ${esc(opt.title)}</h2>
      <div class="arn-me">👤 <b>${esc(me ? me.name : "")}</b>${canHost ? '<span style="font-size:12px;background:rgba(63,174,122,.16);color:#2d8a5e;padding:3px 8px;border-radius:99px">👑 방장 권한</span>' : ''}${window.GME && !Arena.mock ? '<button data-rename>이름 바꾸기</button>' : ""}</div>
      ${canHost
        ? `<button class="arn-btn pri" id="arCreate" data-host>🏠 방 만들기 (친구 초대)</button>`
        : `<div style="background:rgba(0,0,0,.04);border-radius:16px;padding:11px 13px;font-size:13.5px;color:var(--soft,#8b7b70);line-height:1.45">🔒 <b>방 만들기</b>는 관리자(베니·와이프) 전용이에요.<br>초대받은 <b>4자리 방 코드</b>를 입력해 입장하세요!</div>`}
      <div class="arn-row"><input class="arn-code" maxlength="4" placeholder="방 코드" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go"><button class="arn-btn" data-join>들어가기</button></div>
      <div class="arn-msg">${esc(msg)}</div>
      <p class="arn-soft">열린 방</p><div class="arn-list"><p class="arn-soft">찾는 중…</p></div>
      ${isAdmin && !Arena.mock ? `<div style="border-top:1px solid var(--line,rgba(0,0,0,.08));padding-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="arn-soft" style="font-size:12.5px">👑 가족(와이프) 기기에 방 만들기 권한 주기</span><button class="arn-btn" data-mk-host-inv style="padding:8px 12px;font-size:13px">초대 코드 발급</button></div>` : ""}
      ${!canHost ? `<details style="font-size:13px;color:var(--soft,#8b7b70)"><summary style="cursor:pointer">🔑 가족 호스트(방장) 등록 코드가 있나요?</summary><div class="arn-row" style="margin-top:8px"><input class="arn-code" id="arnHostIn" maxlength="6" placeholder="6자리" style="font-size:17px;letter-spacing:4px"><button class="arn-btn" data-claim-host style="padding:10px 14px;font-size:14px">등록</button></div></details>` : ""}`;
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
        const btn = r.empty ? `<button class="arn-btn" data-del="${esc(r.code)}">지우기</button>` : `<button class="arn-btn" data-code="${esc(r.code)}" ${full || busy ? "disabled" : ""}>들어가기</button>`;
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
      <div class="arn-list" data-pl></div>
      <div class="arn-set" data-set></div>
      <div class="arn-msg" data-msg></div>
      ${isHost ? `<button class="arn-btn pri" id="arStart" data-start disabled>시작하기</button>` : `<p class="arn-wait">방장이 시작하면 바로 시작돼요</p>`}
      <button class="arn-btn" id="arLeave" data-leave>나가기</button>`;
    drawPlayers(); drawSettings();
  }
  function drawPlayers() {
    if (!box || !net) return; const el = box.querySelector("[data-pl]"); if (!el) return;
    const pl = net.players || {}, host = net.meta && net.meta.host, peers = net.isHost ? new Map(net.peers()) : null;
    const ids = Object.keys(pl).sort((a, b) => (b === host) - (a === host) || (pl[a].t || 0) - (pl[b].t || 0));
    el.innerHTML = ids.map(uid => {
      const p = pl[uid] || {}, mine = uid === net.uid;
      const dot = uid === host ? "" : peers ? `<span class="dot ${peers.get(uid) ? "ok" : "slow"}" title="${peers.get(uid) ? "직접 연결" : "서버 경유"}"></span>` : "";
      return `<div class="arn-pl">${uid === host ? "👑" : "🙂"} <b>${esc(p.name || "?")}</b>${mine ? "<i>나</i>" : ""}${dot}${net.isHost && !mine ? `<button class="kick" data-kick="${esc(uid)}">내보내기</button>` : ""}</div>`;
    }).join("");
    const btn = box.querySelector("[data-start]");
    if (btn) { const n = ids.length, min = opt.min || opt.minPlayers || 2; btn.disabled = n < min; btn.textContent = n < min ? `친구를 기다리는 중 (${n}/${min}명)` : "시작하기"; }
  }
  function drawSettings() {
    if (!box || !net) return; const el = box.querySelector("[data-set]"); if (!el) return;
    const c = (net.meta && net.meta.cfg) || cfg || (opt.settings && opt.settings.defaults) || {};
    el.innerHTML = "";
    if (opt.settings && opt.settings.render) {
      opt.settings.render(el, c, net.isHost, patch => { if (!net.isHost) return; cfg = { ...c, ...patch }; net.setPhase("lobby", cfg); drawSettings(); });
    } else if (opt.buildConfig && opt.buildConfig.length >= 1 && net.isHost) {
      const fn = opt.buildConfig(el);
      if (typeof fn === "function") {
        opt._getBuiltCfg = fn;
        el.addEventListener("click", () => { cfg = fn(); net.setPhase("lobby", cfg); });
      }
    } else if (opt.extraOptionsHtml && net.isHost) {
      el.innerHTML = opt.extraOptionsHtml;
      el.addEventListener("change", () => {
        if (opt.buildConfig) { cfg = opt.buildConfig(); net.setPhase("lobby", cfg); }
      });
    } else if (opt.renderConfig) {
      el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(opt.renderConfig(c))}</p>`;
    }
  }
  const ctx = () => ({ net, role: net.isHost ? "host" : "guest", code: net.code, cfg: (net.meta && net.meta.cfg) || cfg, players: net.players, uid: net.uid, name: me && me.name });

  function wire() {
    offs.forEach(f => f()); offs = [];
    offs.push(net.on("players", () => { if (!playing) drawPlayers(); }));
    if (net.isHost) offs.push(net.on("p2p", () => { if (!playing) drawPlayers(); }));
    offs.push(net.on("meta", m => {
      if (!m) return;
      if (m.phase === "play" && !playing) { playing = true; hide(); opt.onStart && opt.onStart(ctx()); }
      else if (m.phase === "lobby" && playing) { playing = false; opt.onLobby && opt.onLobby(ctx()); lobby(); }
      else if (!playing) drawSettings();
    }));
    if (!net.isHost) {
      offs.push(net.on("closed", () => end("방장이 방을 닫았어요")));
      offs.push(net.on("kicked", () => end("방장이 방에서 내보냈어요")));
      offs.push(net.on("conn", (c, why) => { const m = box && box.querySelector("[data-msg]"); if (m && !playing) m.textContent = c ? "" : why || ""; }));
    }
  }
  function end(why) {
    const was = net; net = null; playing = false; offs.forEach(f => f()); offs = [];
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
      net = await Arena.host(opt.game, { name: me.name, cfg, max: opt.max || opt.maxPlayers || 2, label: (opt.settings && opt.settings.label) || opt.renderConfig });
      playing = false; wire(); setUrlRoom(net.code); lobby();
    } catch (e) { home("방을 못 만들었어요: " + e.message); }
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
    } catch (e) { setUrlRoom(null); home(e.message); }
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
    else if (t.matches("[data-host]")) doHost();
    else if (t.matches("[data-join]")) doJoin(box.querySelector(".arn-code").value);
    else if (t.matches("[data-mk-host-inv]")) {
      t.disabled = true; t.textContent = "발급 중…";
      Arena.createHostInvite().then(async ({ code, url }) => {
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        home(`가족 호스트 코드 [${code}] 발급 완료! (링크가 복사되었어요)`);
      }).catch(err => home("발급 실패: " + err.message));
    }
    else if (t.matches("[data-claim-host]")) {
      const v = box.querySelector("#arnHostIn") && box.querySelector("#arnHostIn").value;
      t.disabled = true;
      Arena.claimHostInvite(v, me && me.name).then(() => home("👑 가족 호스트 권한이 등록되었어요! 이제 방을 만들 수 있어요.")).catch(err => home("등록 실패: " + err.message));
    }
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
