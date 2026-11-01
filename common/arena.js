/* 게임 공통 '친구랑' 온라인 방 (냥냥 배구·땅따먹기·오목 …) — snake/net.js 방식을 어느 게임이나 쓰게 일반화
   · Firebase(benny-meeting 기본 앱, 지렁이·냥도쿠와 같은 로그인) = 방 목록·대기실·연결 소개, 그리고 직접 연결이 안 될 때의 대체 통로
   · 방: arena/{게임}/rooms/{코드}
       meta(방장만: 단계 lobby/play·설정·최대 인원) · players/{uid}(본인·방장) · rtc/{uid}(WebRTC 연결 소개)
       up/{uid}(친구 → 방장, 최신 값 하나) · upq(친구 → 방장, 꼭 전할 것 줄) · down(방장 → 모두, 최신 값) · downq(방장 → 모두, 꼭 전할 것 줄)
       shared(방장이 쓰는 게임 기록 — 오목 수순처럼 나중에 들어온 사람도 읽어야 하는 것) · chat
     목록 색인: arena/{게임}/index/{코드} (방장 이름·인원·단계·제목 ti·🔒 lk 만 — 방 전체를 읽으면 무거움)
   · 🔒 방 제목(≤20자)·비밀번호(영문·숫자 4~8자, 선택): meta.title · meta.lock(true) 만 공개. 비밀번호 확인값은 읽을 수 없는 곳에 둠
       arena/{게임}/gate/{코드} {h: 비밀번호 해시, k: 초대 토큰}  (방장만 씀, 아무도 못 읽음 — 규칙만 비교)
       arena/{게임}/pass/{코드}/{uid} = h 또는 k  (들어오려는 사람이 먼저 씀 — 맞아야 쓰여짐) → 있어야 players/{uid} 를 새로 쓸 수 있음
     초대 링크(inviteUrl)에는 &rk=토큰 이 붙어서 링크로 온 사람은 비밀번호 없이 들어옴 · 한 번 통과한 열쇠는 이 탭(sessionStorage)에 기억 → 다시 들어올 때 안 물음
   · 게임 데이터는 WebRTC 직접 연결(방장 ↔ 친구): 통로 g = 늦으면 버림(매 틱 상태·입력), r = 꼭 도착·순서대로(득점·수 두기)
     직접 연결이 안 되는 네트워크면 RTDB 로 자동 대체 (최신 값은 초당 10~15번까지)
   · ?guest 이면 탭마다 다른 익명 계정 + test/arena 아래를 씀 (한 컴퓨터에서 여러 명 시험, 실제 방 목록을 안 더럽힘)
   쓰는 법: const h = await Arena.host("volley", { name, cfg, max: 2 }); h.on("msg", (uid, m) => …); h.broadcast({ t: "s", … });
           const c = await Arena.join("volley", "ABCD", { name }); c.on("msg", m => …); c.send({ t: "i", b: 5 });
   이벤트(on): host → join(uid,p) leave(uid) players(전체) msg(uid,m) p2p(uid,열림) conn(연결됨) chat(m) meta(meta)
              guest → msg(m) meta(meta) players(전체) p2p(열림) conn(연결됨, 까닭) closed() kicked() chat(m)
   players·meta 는 나중에 on 해도 마지막 값을 바로 한 번 받음
   방 접근: h.setAccess({ title, pw }) (방장만, pw "" = 없애기) · h.access = {title, lock, pw, token} · 친구는 net.meta.title / net.meta.lock
           join 에서 비밀번호가 필요하면 오류 e.needPw (비밀번호를 settings.pw 로 다시 부름 · e.wrong = 틀림) · host 설정에 title·pw
   게임 기록: h.setShared(키, 값) (방장만) · watchShared(키, cb) (모두, 나중에 들어와도 지금 값부터)
   시험: ?mock + common/arena-mock.js 를 먼저 넣으면 Firebase 없이 같은 브라우저 탭끼리 (지연 흉내 ?mock=80) */
const Arena = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  let ICE = { iceServers: STUN };
  // 🔁 TURN 중계 (Cloudflare Worker infra/turn-worker): 폰끼리 직접 연결이 막혀도 실시간으로. 비어 있으면 STUN 만 (막히면 서버 경유)
  const TURN_URL = "https://benny-turn.benny3s.workers.dev/";
  async function loadIce() {
    if (!TURN_URL) return;
    try { const c = JSON.parse(sessionStorage.getItem("arena.ice") || "null"); if (c && c.exp > Date.now() && Array.isArray(c.s)) { ICE = { iceServers: STUN.concat(c.s) }; return; } } catch (e) {}
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
      const j = await (await fetch(TURN_URL, { signal: ctl.signal })).json(); clearTimeout(t);
      if (j && Array.isArray(j.iceServers) && j.iceServers.length) {
        ICE = { iceServers: STUN.concat(j.iceServers) };
        try { sessionStorage.setItem("arena.ice", JSON.stringify({ s: j.iceServers, exp: Date.now() + (j.ttl || 3600) * 800 })); } catch (e) {}
      }
    } catch (e) {}
  }
  // 🛡️ App Check: 우리 사이트에서 온 요청만 Firebase 가 받게 (reCAPTCHA v3 '사이트 키'는 공개용). 비어 있으면 안 씀
  const APPCHECK_KEY = "";
  async function appCheck(a, load) {
    if (!APPCHECK_KEY || !a || a.__appCheck || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return;
    a.__appCheck = 1;
    try { if (!firebase.appCheck) await load(SDK + "firebase-app-check-compat.js"); firebase.appCheck(a).activate(new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_KEY), true); } catch (e) { console.warn("[appcheck]", e); }
  }

  const GUEST = new URLSearchParams(location.search).has("guest");
  const LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost" || location.protocol === "file:";
  // 11-01: ?guest 는 시험 공간(test/arena)만 바꿈 — 방 만들기 권한까지 주는 건 로컬이나 QA 도구가 연 탭(페이지보다 먼저 window.__qa)만 (gate.js 와 같음)
  const TEST_HOST = GUEST && (LOCAL || !!window.__qa);
  const ROOT = GUEST ? "test/arena/" : "arena/";
  let app = null, loading = null, user = null, offset = 0, adminFlag = false, hostFlag = TEST_HOST || LOCAL;
  const load = src => {
    const map = (window.__fbScriptLoads = window.__fbScriptLoads || {});
    if (map[src]) return map[src];
    return (map[src] = new Promise((ok, bad) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = e => { delete map[src]; bad(e); };
      document.head.appendChild(s);
    }));
  };
  const watchOffset = () => app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });

  async function refreshPerms() {
    if (!user) return;
    try {
      const tr = await Promise.race([user.getIdTokenResult(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2000))]);
      adminFlag = !!(tr && tr.claims && tr.claims.admin === 1);
    } catch (e) { adminFlag = false; }
    // 관리자 = 토큰(admin:1) 또는 Gate 가 토큰으로 확인한 것만 (이 기기의 예전 표시 game.gate.admin 은 안 믿음 — 계정이 바뀌어도 남아서)
    if (!adminFlag && window.Gate && Gate.state && Gate.state.isAdmin === true) adminFlag = true;
    if (adminFlag || TEST_HOST || LOCAL) { hostFlag = true; return; }
    // 방 만들기 = 관리자 · 허용된 기기(game_devices 활성·안 끝남) · 옛 가족 방장(arena_hosts — 계속 허용으로 침)
    const get = path => Promise.race([app.database().ref(path).get(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2000))]);
    let ok = false;
    try { ok = (await get("arena_hosts/" + user.uid + "/ok")).val() === true; }
    catch (e) { try { ok = localStorage.getItem("game.arena.host_ok") === user.uid; } catch (_) {} }
    if (!ok) {
      try {
        const d = (await get("game_devices/" + user.uid)).val();
        const exp = Number((d && d.expiresAt) || 0);
        ok = !!d && d.status === "active" && (!exp || exp > now());
      } catch (e) {}
    }
    if (!ok && window.Gate && Gate.state && (Gate.state.canHost || Gate.state.role === "admin")) ok = true;
    hostFlag = ok;
  }

  async function init() {
    if (app) return app;
    if (loading) return loading;
    loading = (async () => {
      if (!window.firebase || !firebase.initializeApp) await load(SDK + "firebase-app-compat.js");
      await Promise.all(["firebase-auth-compat.js", "firebase-database-compat.js"].filter(f => !(f.startsWith("firebase-auth") ? firebase.auth : firebase.database)).map(f => load(SDK + f)));
      if (GUEST) {                                                            // 손님 모드: 이 탭만의 익명 계정
        app = firebase.initializeApp(FB, "guest" + Math.random().toString(36).slice(2, 7));
        await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
      } else if (firebase.apps.length) { app = firebase.app(); if (!app.options.databaseURL) app = firebase.apps.find(a => a.name === "arena") || firebase.initializeApp(FB, "arena"); }
      else app = firebase.initializeApp(FB);
      await appCheck(app, load);
      loadIce();                                                              // 방에 들어가기 전에 끝나 있으면 TURN 도 씀
      user = await new Promise(ok => { const t = setTimeout(() => ok(null), 8000); const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); }); });
      if (!user) user = (await app.auth().signInAnonymously()).user;
      watchOffset();
      const inv = new URLSearchParams(location.search).get("host_invite");
      if (inv) { try { await claimHostInvite(inv); } catch (e) {} }
      await refreshPerms();
      return app;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }

  // 관리자(베니 님)가 가족(와이프)에게 방 만들기(호스트) 권한을 줄 초대 코드 6자리 발급
  async function createHostInvite() {
    await init();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    await db().ref("arena_invites/" + code).set({ by: user.uid, t: TS() });
    const u = new URL(location.href);
    u.searchParams.delete("room");
    u.searchParams.set("host_invite", code);
    return { code, url: u.toString() };
  }

  // 가족(와이프)이 6자리 초대 코드로 방장(Host) 권한 등록
  async function claimHostInvite(rawCode, name) {
    if (!app) await init();
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) throw new Error("호스트 등록 코드 6자리를 입력해 주세요");
    await db().ref("arena_hosts/" + user.uid).set({ ok: true, token: code, name: String(name || "가족").slice(0, 12), t: TS() });
    try { localStorage.setItem("game.arena.host_ok", user.uid); } catch (e) {}
    hostFlag = true;
    return true;
  }
  // 같은 계정으로 같은 방에 또 들어오면(관리자로 PC·휴대폰 둘 다 등) 한 사람으로 겹치므로, 이 탭만 임시 계정
  const db = () => app.database();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const now = () => Date.now() + offset;                                     // 서버 시계 (카운트다운을 모두 같게)
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

  // ── 🔒 방 제목·비밀번호 도우미
  const cleanTitle = s => String(s || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
  const normPw = s => String(s || "").trim().toLowerCase();                 // 대소문자 구분 안 함 (폰 자동 대문자 때문에)
  const okPw = s => /^[0-9a-z]{4,8}$/.test(normPw(s));
  const h53 = (str, seed) => { let a = 0xdeadbeef ^ seed, b = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return 4294967296 * (2097151 & b) + (a >>> 0); };
  const pwKey = (pw, code) => { const t = "arena|" + code + "|" + normPw(pw); return "p" + h53(t, 1).toString(36) + h53(t, 7).toString(36); };   // 비밀번호+방 코드 → 확인값 (글 그대로는 어디에도 안 씀)
  const rand = n => { const cs = "abcdefghijkmnpqrstuvwxyz23456789"; let o = ""; try { for (const x of crypto.getRandomValues(new Uint8Array(n))) o += cs[x % cs.length]; } catch (e) { for (let i = 0; i < n; i++) o += cs[Math.floor(Math.random() * cs.length)]; } return "t" + o; };   // 초대 토큰 ('t' 로 시작 = 비밀번호 확인값 'p…' 과 구분)
  const accTok = {};                                                         // 코드 → 초대 토큰 (방장·링크로 들어온 사람만 앎 → inviteUrl 에 붙임)
  const ACC = "arena.acc.";
  const keyGet = (game, code) => { try { return sessionStorage.getItem(ACC + game + "." + code) || ""; } catch (e) { return ""; } };
  const keySet = (game, code, k) => { try { if (k) sessionStorage.setItem(ACC + game + "." + code, k); else sessionStorage.removeItem(ACC + game + "." + code); } catch (e) {} };
  const urlKey = code => { try { const sp = new URLSearchParams(location.search); if (cleanCode(sp.get("room")) === code) return String(sp.get("rk") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 32); } catch (e) {} return ""; };
  // 들어가 볼 열쇠들: 방금 친 비밀번호 > 초대 링크 토큰 > 이 탭이 전에 통과한 열쇠
  const candKeys = (game, code, settings) => { const c = []; const add = k => { if (k && !c.includes(k)) c.push(k); }; if (settings && settings.pw) add(pwKey(settings.pw, code)); add(urlKey(code)); add(keyGet(game, code)); return c; };
  const needPwErr = wrong => { const e = new Error(wrong ? "비밀번호가 맞지 않아요" : "🔒 비밀번호가 필요한 방이에요"); e.needPw = true; e.wrong = !!wrong; return e; };
  const ACCESS_API = { okPw, normPw, cleanTitle };

  // 구독을 모아 두었다가 한 번에 끊기 (ref.off()는 자식 위치 구독을 못 끊음)
  function subs() {
    const list = [];
    return { on(ref, ev, cb) { ref.on(ev, cb); list.push([ref, ev, cb]); return cb; }, off() { for (const [r, e, c] of list.splice(0)) r.off(e, c); } };
  }
  // 작은 알림판: players·meta 같은 '현재 상태'는 나중에 붙은 쪽도 마지막 값을 바로 받음
  function emitter(sticky) {
    const fns = {}, last = {};
    return {
      on(ev, fn) { (fns[ev] = fns[ev] || []).push(fn); if (sticky.includes(ev) && ev in last) try { fn(...last[ev]); } catch (e) { console.error(e); } return () => { fns[ev] = (fns[ev] || []).filter(f => f !== fn); }; },
      emit(ev, ...a) { if (sticky.includes(ev)) last[ev] = a; for (const f of (fns[ev] || []).slice()) try { f(...a); } catch (e) { console.error(e); } },
      clear() { for (const k in fns) delete fns[k]; },
    };
  }

  // ICE 후보: 상대 설명(offer·answer)을 넣기 전에 온 것은 모았다가 넣은 뒤 한꺼번에 (먼저 넣으면 오류로 버려져 직접 연결이 안 되고 서버 경유로 감)
  function iceQ(pc) {
    const wait = [];
    const put = c => { pc.addIceCandidate(c).catch(() => {}); };
    return {
      add(v) { let c; try { c = JSON.parse(v); } catch (_) { return; } if (pc.remoteDescription) put(c); else wait.push(c); },
      flush() { for (const c of wait.splice(0)) put(c); },
    };
  }
  // ── WebRTC: 방장 쪽 연결 하나 (친구 한 명). g = 늦은 건 버림, r = 꼭 도착
  function hostPeer(room, uid, onMsg, onOpen) {
    const pc = new RTCPeerConnection(ICE);
    const dc = pc.createDataChannel("g", { ordered: false, maxRetransmits: 0 });
    const rc = pc.createDataChannel("r", { ordered: true });
    const ref = room.child(`rtc/${uid}`), S = subs(), born = performance.now(), ice = iceQ(pc);
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_h").push(JSON.stringify(e.candidate)); };
    const recv = e => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
    dc.onmessage = recv; rc.onmessage = recv;
    dc.onopen = () => onOpen && onOpen(true); dc.onclose = () => onOpen && onOpen(false);
    (async () => {
      await ref.remove();
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      await ref.child("offer").set(JSON.stringify(pc.localDescription));
      S.on(ref.child("answer"), "value", async s => { if (s.exists() && !pc.currentRemoteDescription) { try { await pc.setRemoteDescription(JSON.parse(s.val())); ice.flush(); } catch (_) {} } });
      S.on(ref.child("ice_c"), "child_added", s => ice.add(s.val()));
    })().catch(() => {});
    const age = () => performance.now() - born;
    const ch = rel => rel ? (rc.readyState === "open" ? rc : null) : (dc.readyState === "open" ? dc : null);
    return {
      open: () => dc.readyState === "open" && rc.readyState === "open",
      send(o, rel) { const c = ch(rel); if (!c || c.bufferedAmount > 256e3) return false; c.send(typeof o === "string" ? o : JSON.stringify(o)); return true; },
      // 다시 붙여야 하나: 실패·끊김이고 만든 지 8초 지났거나, 20초가 지나도 안 열렸으면 (너무 자주 새로 만들지 않게)
      dead: () => age() > 8000 && (["failed", "closed", "disconnected"].includes(pc.connectionState) || dc.readyState === "closed" || (dc.readyState !== "open" && age() > 20000)),
      close() { S.off(); try { dc.close(); rc.close(); pc.close(); } catch (_) {} },
    };
  }
  // ── WebRTC: 친구 쪽. 방장이 새 연결 제안(offer)을 올리면 onRenew 로 알려서 새로 만들게 함
  function clientPeer(room, uid, onMsg, onOpen, onRenew) {
    const pc = new RTCPeerConnection(ICE);
    let dc = null, rc = null, applied = null;
    const ref = room.child(`rtc/${uid}`), S = subs(), ice = iceQ(pc);
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_c").push(JSON.stringify(e.candidate)); };
    pc.ondatachannel = e => {
      const c = e.channel;
      c.onmessage = m => { try { onMsg(JSON.parse(m.data)); } catch (_) {} };
      if (c.label === "g") dc = c; else rc = c;
      c.onopen = () => { if (dc && rc && dc.readyState === "open" && rc.readyState === "open") onOpen && onOpen(true); };
      c.onclose = () => onOpen && onOpen(false);
    };
    S.on(ref.child("offer"), "value", async s => {
      if (!s.exists()) return;
      if (applied) { if (s.val() !== applied && onRenew) onRenew(); return; }
      applied = s.val();
      try {
        await pc.setRemoteDescription(JSON.parse(applied)); ice.flush();
        const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
        await ref.child("answer").set(JSON.stringify(pc.localDescription));
      } catch (_) {}
    });
    S.on(ref.child("ice_h"), "child_added", s => ice.add(s.val()));
    const open = () => !!dc && !!rc && dc.readyState === "open" && rc.readyState === "open";
    return {
      open,
      send(o, rel) { const c = rel ? rc : dc; if (!c || c.readyState !== "open" || c.bufferedAmount > 256e3) return false; c.send(JSON.stringify(o)); return true; },
      close() { S.off(); try { pc.close(); } catch (_) {} },
    };
  }

  // ── 방장: 방을 만들고 대기실 단계로 시작
  // settings: { name, cfg, max(최대 인원, 기본 2), me(내 자리 정보 더), label(cfg → 방 목록에 보일 짧은 글) }
  async function host(game, settings = {}) {
    if (settings.pw && !okPw(settings.pw)) throw new Error("비밀번호는 영문·숫자 4~8자로 해 주세요");
    await init();
    const base = db().ref(ROOT + game);
    let code;
    for (let i = 0; i < 6; i++) { code = code4(); if (!(await base.child(`rooms/${code}/meta`).get()).exists()) break; }
    const room = base.child(`rooms/${code}`), idx = base.child(`index/${code}`), S = subs(), E = emitter(["players", "meta"]);
    const gateRef = base.child(`gate/${code}`), passRef = base.child(`pass/${code}`);
    let title = cleanTitle(settings.title), pw = settings.pw ? normPw(settings.pw) : "";
    const tok = rand(10);
    let meta = { host: user.uid, created: Date.now(), phase: "lobby", cfg: settings.cfg || null, max: settings.max || 2, v: 1 };
    if (title) meta.title = title;
    if (pw) { meta.lock = true; accTok[code] = tok; }
    let mine = { name: String(settings.name || "방장").slice(0, 12), ...(settings.me || {}) };
    const label = settings.label || (() => "");
    let players = {}, closed = false;
    // 🔒 비밀번호 방: 확인값(gate)은 방 정보(meta.lock)와 함께 — 이미 앉은 사람(방장이 나중에 건 경우)에게는 통과증(pass)도 줌
    const writeGate = async () => {
      if (!pw) return;
      const h = pwKey(pw, code);
      await gateRef.set({ h, k: tok });
      gateRef.onDisconnect().remove(); passRef.onDisconnect().remove();
      for (const u of Object.keys(players)) if (u !== user.uid) passRef.child(u).set(h).catch(() => {});
    };
    await room.child("meta").set(meta);
    await writeGate();
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set({ ...mine, t: TS() });
    const writeIdx = () => idx.set({ h: mine.name, n: Object.keys(players).length || 1, max: meta.max, ph: meta.phase, m: String(label(meta.cfg) || "").slice(0, 40), t: TS(), ...(title ? { ti: title } : {}), ...(pw ? { lk: 1 } : {}) }).catch(() => {});
    idx.onDisconnect().remove(); writeIdx();
    E.emit("meta", meta);
    // 방장 인터넷이 잠깐 끊겨 방이 지워졌다가 다시 연결되면: 방 정보와 내 자리를 다시 써 둠 (친구들은 스스로 다시 앉음)
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn && !closed) { room.child("meta").set(meta).then(() => { writeIdx(); return writeGate(); }).catch(() => {}); room.child(`players/${user.uid}`).set({ ...mine, t: TS() }).catch(() => {}); room.onDisconnect().remove(); idx.onDisconnect().remove(); }
      conn = c; E.emit("conn", c);
    });
    const peers = new Map();                                                 // uid → WebRTC 연결
    const deliver = (uid, m) => {
      if (!m || typeof m !== "object") return;
      if (m.t === "_p") { const p = peers.get(uid); if (p) p.send({ t: "_q", c: m.c }, false); return; }   // 친구의 왕복 시간 재기
      E.emit("msg", uid, m);
    };
    const newPeer = uid => {
      const old = peers.get(uid); if (old) old.close();
      if (window.RTCPeerConnection) peers.set(uid, hostPeer(room, uid, m => deliver(uid, m), o => { E.emit("p2p", uid, o); room.child(`players/${uid}/p2p`).set(o ? 1 : 0).catch(() => {}); }));
    };
    S.on(room.child("players"), "child_added", s => { if (s.key === user.uid) return; E.emit("join", s.key, s.val()); newPeer(s.key); });
    S.on(room.child("players"), "child_removed", s => { if (s.key === user.uid) return; E.emit("leave", s.key); const p = peers.get(s.key); if (p) { p.close(); peers.delete(s.key); } });
    S.on(room.child("players"), "value", s => { players = s.val() || {}; writeIdx(); E.emit("players", players); });
    // 직접 연결이 안 된 친구의 입력 (RTDB)
    const fromUp = s => { if (s.key === user.uid) return; const p = peers.get(s.key); const v = s.val(); if (v && !(p && p.open())) deliver(s.key, v.m); };
    S.on(room.child("up"), "child_added", fromUp);
    S.on(room.child("up"), "child_changed", fromUp);
    S.on(room.child("upq"), "child_added", s => { const v = s.val(); s.ref.remove().catch(() => {}); if (v && v.u && v.u !== user.uid) deliver(v.u, v.m); });   // 규칙: u = 쓴 사람, 방에 앉은 사람만
    S.on(room.child("chat").limitToLast(50), "child_added", s => E.emit("chat", s.val()));
    // 끊긴 직접 연결은 3초마다 살펴서 다시 붙임 (그동안은 RTDB 로 이어짐)
    const healT = setInterval(() => { for (const [uid, p] of peers) if (p.dead()) newPeer(uid); }, 3000);
    // RTDB 대체 통로: 최신 값은 0.1초에 한 번만, 꼭 전할 것은 순번(_q)을 붙여 바로 (직접 연결된 친구는 순번으로 겹친 걸 버림)
    let qseq = 0, downPending = null, downAt = 0, downT = null;
    const qKeys = [];
    const needRelay = () => Object.keys(players).some(uid => uid !== user.uid && !(peers.get(uid) && peers.get(uid).open()));
    const flushDown = () => { downT = null; if (!downPending || closed) return; downAt = performance.now(); room.child("down").set({ m: downPending, t: TS() }).catch(() => {}); downPending = null; };
    const pushQ = (m, to) => {
      const ref = room.child("downq").push(); qKeys.push([ref, performance.now()]);
      ref.set({ m, to: to || null, t: TS() }).catch(() => {});
      while (qKeys.length && (qKeys.length > 60 || performance.now() - qKeys[0][1] > 30000)) qKeys.shift()[0].remove().catch(() => {});   // 오래된 건 치움
    };
    function sendTo(uid, m, rel) {
      const p = peers.get(uid);
      if (p && p.send(m, rel)) return;
      if (rel) pushQ(m, uid);
      else { downPending = m; if (!downT) downT = setTimeout(flushDown, Math.max(0, 50 - (performance.now() - downAt))); }
    }
    return {
      code, isHost: true, get uid() { return user.uid; }, get meta() { return meta; }, get players() { return players; }, get connected() { return conn; },
      on: E.on,
      // 모두에게: rel=true 면 꼭 도착(순서대로), 아니면 늦으면 버림. 직접 연결 안 된 친구가 있으면 RTDB 로도
      broadcast(m, rel = false) {
        if (rel) m = { ...m, _q: ++qseq };
        let relay = false;
        for (const uid of Object.keys(players)) { if (uid === user.uid) continue; const p = peers.get(uid); if (!(p && p.send(m, rel))) relay = true; }
        if (relay) { if (rel) pushQ(m); else { downPending = m; if (!downT) downT = setTimeout(flushDown, Math.max(0, 50 - (performance.now() - downAt))); } }   // 서버 경유: 초당 20번까지
      },
      send(uid, m, rel = false) { if (rel) m = { ...m, _q: ++qseq }; sendTo(uid, m, rel); },
      peers: () => [...peers].map(([uid, p]) => [uid, p.open()]),
      get relaying() { return needRelay(); },
      setPhase(phase, cfg) { meta = { ...meta, phase, cfg: cfg === undefined ? meta.cfg : cfg }; writeIdx(); E.emit("meta", meta); return room.child("meta").update({ phase, cfg: meta.cfg }); },
      setMeta(p) { meta = { ...meta, ...p }; writeIdx(); E.emit("meta", meta); return room.child("meta").update(p); },
      setMe(p) { mine = { ...mine, ...p }; if (p.name) writeIdx(); return room.child(`players/${user.uid}`).update(p); },
      setPlayer(uid, p) { return room.child(`players/${uid}`).update(p); },     // 자리·팀 정하기 (방장만)
      kick(uid) { passRef.child(uid).remove().catch(() => {}); return room.child(`players/${uid}`).remove(); },
      // 방 제목·비밀번호 바꾸기 (방장만): { title?, pw? } — pw "" = 비밀번호 없애기. 이미 앉은 사람은 그대로 (다시 앉을 때도 안 물음)
      get access() { return { title, lock: !!pw, pw, token: tok }; },
      async setAccess(p = {}) {
        let nt = title, np = pw;
        if ("title" in p) nt = cleanTitle(p.title);
        if ("pw" in p) { np = p.pw ? normPw(p.pw) : ""; if (np && !okPw(np)) throw new Error("비밀번호는 영문·숫자 4~8자로 해 주세요"); }
        const was = pw; title = nt; pw = np;
        if (pw) await writeGate();
        const m2 = { ...meta }; if (title) m2.title = title; else delete m2.title; if (pw) m2.lock = true; else delete m2.lock;
        meta = m2; if (pw) accTok[code] = tok; else delete accTok[code];
        await room.child("meta").update({ title: title || null, lock: pw ? true : null });
        if (!pw && was) { gateRef.remove().catch(() => {}); passRef.remove().catch(() => {}); }
        writeIdx(); E.emit("meta", meta);
      },
      get gone() { return closed; },
      // 게임 기록(오목 수순처럼 나중에 들어온 사람도 읽어야 하는 것): 방장만 씀, 모두 읽음
      setShared(key, value) { return room.child("shared/" + key).set(value === undefined ? null : value); },
      watchShared(key, cb) { S.on(room.child("shared/" + key), "value", s => cb(s.val())); },
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() {
        if (closed) return; closed = true;
        clearInterval(healT); clearTimeout(downT); S.off(); E.clear(); for (const p of peers.values()) p.close(); peers.clear();
        room.onDisconnect().cancel(); idx.onDisconnect().cancel(); gateRef.onDisconnect().cancel(); passRef.onDisconnect().cancel();
        room.remove().catch(() => {}); idx.remove().catch(() => {}); gateRef.remove().catch(() => {}); passRef.remove().catch(() => {}); delete accTok[code];
      },
    };
  }

  // ── 친구 (참가자)
  async function join(game, code, settings = {}) {
    await init();
    code = cleanCode(code);
    let room = db().ref(`${ROOT}${game}/rooms/${code}`);
    const meta0 = (await room.child("meta").get()).val();
    if (!meta0) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    const pl = (await room.child("players").get()).val() || {};
    const seated = !!pl[user.uid];
    // 내가 만든 방: 방장이 새로 고침한 것 → 방장 자리는 이어 받을 수 없음 (부른 쪽이 방을 닫고 새로)
    if (meta0.host === user.uid) { const e = new Error("새로 고침해서 전에 만든 방이 닫혔어요. 방을 다시 만들어 링크를 보내 주세요"); e.own = true; throw e; }
    // 이미 앉아 있던 자리(새로 고침·다시 들어오기)는 같은 사람으로 이어서
    if (seated) {}
    else if (Object.keys(pl).length >= (meta0.max || 2) && !settings.watch) throw new Error(`방이 꽉 찼어요 (최대 ${meta0.max || 2}명)`);
    // 🔒 비밀번호 방(구경도 마찬가지): 열쇠(방금 친 비밀번호 · 초대 링크 토큰 · 이 탭이 전에 통과한 열쇠)를 pass 에 써 보고, 규칙이 받아 주면 통과
    let key = "";
    const passRef = db().ref(`${ROOT}${game}/pass/${code}/${user.uid}`);
    if (meta0.lock && !seated) {
      const cands = candKeys(game, code, settings);
      if (!cands.length) throw needPwErr(false);
      for (const c of cands) { try { await passRef.set(c); key = c; break; } catch (e) {} }
      if (!key) { keySet(game, code, ""); throw needPwErr(!!settings.pw); }
      keySet(game, code, key);
      if (key[0] === "t") accTok[code] = key;
    }
    const S = subs(), E = emitter(["players", "meta"]);
    let meta = meta0, players = pl, left = false, rtt = 0, peer = null;
    let mine = { name: String(settings.name || "친구").slice(0, 12), ...(settings.me || {}) };
    if (settings.watch) mine.watch = 1;                                       // 구경꾼 (인원에 안 셈은 게임이 정함)
    const seen = new Set(), seenQ = [];
    const joinedAt = now();
    const onMsg = m => {
      if (!m || typeof m !== "object") return;
      if (m.t === "_q") { const d = performance.now() - m.c; rtt = rtt ? rtt * 0.8 + d * 0.2 : d; return; }
      if (m._q != null) { if (seen.has(m._q)) return; seen.add(m._q); seenQ.push(m._q); if (seenQ.length > 400) seen.delete(seenQ.shift()); }
      E.emit("msg", m);
    };
    const newPeer = () => {
      if (peer) peer.close();
      peer = window.RTCPeerConnection ? clientPeer(room, user.uid, onMsg, o => E.emit("p2p", o), () => setTimeout(newPeer, 0)) : null;
    };
    // 내 자리 쓰기 + 끊기면 지워지게 예약 (다시 연결될 때마다 다시)
    const seat = async () => {
      if (left) return;
      if (key) await passRef.set(key).catch(() => {});                       // 방장 인터넷이 끊겼다 와서 통과증이 지워졌을 수 있음
      for (const k of ["players", "up", "rtc"]) room.child(`${k}/${user.uid}`).onDisconnect().remove();
      return room.child(`players/${user.uid}`).set({ ...mine, t: TS() });
    };
    newPeer();
    try { await seat(); }
    catch (e) { if (peer) peer.close(); if (!meta0.lock) throw e; keySet(game, code, ""); throw needPwErr(true); }
    S.on(room.child("down"), "value", s => { const v = s.val(); if (v && !(peer && peer.open())) onMsg(v.m); });
    S.on(room.child("downq").orderByChild("t").startAt(joinedAt - 3000), "child_added", s => { const v = s.val(); if (v && (!v.to || v.to === user.uid)) onMsg(v.m); });
    // 방이 잠깐 사라져도(방장 인터넷 끊김) 바로 끝내지 않고 20초 기다림
    let goneT = null;
    S.on(room.child("meta"), "value", s => {
      if (!s.exists()) { if (!goneT) goneT = setTimeout(() => { if (!left) E.emit("closed"); }, 20000); E.emit("conn", false, "방장 연결을 기다리는 중"); return; }
      if (goneT) { clearTimeout(goneT); goneT = null; E.emit("conn", true, ""); }
      meta = s.val(); E.emit("meta", meta);
    });
    // 내 자리가 없어졌으면(내 인터넷이 끊겨 서버가 뺐거나 방이 다시 만들어짐) 다시 앉음 — 방장이 내보낸 경우는 kicked
    let reseatT = null, wasSeated = true;
    S.on(room.child("players"), "value", s => {
      players = s.val() || {};
      if (!left && s.exists() && !players[user.uid] && !reseatT) {
        if (wasSeated && conn && players[meta.host]) { keySet(game, code, ""); E.emit("kicked"); }
        else reseatT = setTimeout(() => { reseatT = null; seat().catch(() => {}); newPeer(); }, 800);
      }
      wasSeated = !!players[user.uid];
      E.emit("players", players);
    });
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) { seat().catch(() => {}); if (!(peer && peer.open())) newPeer(); }
      conn = c; E.emit("conn", c, c ? "" : "인터넷 연결이 끊겼어요");
    });
    S.on(room.child("chat").limitToLast(50), "child_added", s => E.emit("chat", s.val()));
    const pingT = setInterval(() => { if (peer && peer.open()) peer.send({ t: "_p", c: performance.now() }, false); }, 1000);
    let lastUp = 0, upPending = null, upT = null;
    const flushUp = () => { upT = null; if (!upPending || left) return; lastUp = performance.now(); room.child(`up/${user.uid}`).set({ m: upPending, t: TS() }).catch(() => {}); upPending = null; };
    return {
      code, isHost: false, get uid() { return user.uid; }, get meta() { return meta; }, get players() { return players; },
      get p2p() { return !!(peer && peer.open()); }, get rtt() { return rtt; }, get connected() { return conn; },
      on: E.on,
      // 방장에게: rel=true 면 꼭 도착, 아니면 최신 값만 중요 (입력)
      send(m, rel = false) {
        if (peer && peer.send(m, rel)) return true;
        if (rel) { room.child("upq").push({ u: user.uid, m, t: TS() }).catch(() => {}); return true; }
        upPending = m; if (!upT) upT = setTimeout(flushUp, Math.max(0, 66 - (performance.now() - lastUp)));   // RTDB: 초당 15번까지
        return true;
      },
      watchShared(key, cb) { S.on(room.child("shared/" + key), "value", s => cb(s.val())); },
      setMe(p) { mine = { ...mine, ...p }; return room.child(`players/${user.uid}`).update(p); },
      get gone() { return left; },
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() {
        if (left) return; left = true;
        clearInterval(pingT); clearTimeout(goneT); clearTimeout(reseatT); clearTimeout(upT); S.off(); E.clear(); if (peer) peer.close();
        for (const k of ["players", "up", "rtc"]) room.child(`${k}/${user.uid}`).remove().catch(() => {});
        if (key) passRef.remove().catch(() => {});
      },
    };
  }

  // ── 방 목록: 색인 + 방마다 방장 확인 → 방장이 없으면 '빈 방' (누구나 지울 수 있음)
  async function listRooms(game) {
    await init();
    const base = db().ref(ROOT + game);
    const idx = (await base.child("index").get()).val() || {};
    const rows = await Promise.all(Object.keys(idx).slice(0, 40).map(async code => {
      const [m, p] = await Promise.all([base.child(`rooms/${code}/meta`).get(), base.child(`rooms/${code}/players`).get()]);
      const meta = m.val(), players = p.val() || {};
      return { code, ...idx[code], n: Object.keys(players).length, max: (meta && meta.max) || idx[code].max || 2, ph: (meta && meta.phase) || idx[code].ph, ti: (meta && meta.title) || idx[code].ti || "", lk: (meta ? meta.lock : idx[code].lk) ? 1 : 0, empty: !meta || !players[meta.host] };
    }));
    return rows.sort((a, b) => (a.empty - b.empty) || ((b.t || 0) - (a.t || 0)));
  }
  async function deleteRoom(game, code) {
    await init();
    const base = db().ref(ROOT + game);
    await base.child(`rooms/${code}`).remove().catch(() => {});
    base.child(`gate/${code}`).remove().catch(() => {}); base.child(`pass/${code}`).remove().catch(() => {});   // 방이 없어진 뒤라 규칙이 허락
    return base.child(`index/${code}`).remove();
  }
  // 비밀번호 방이면 링크에 토큰(rk)이 붙음 → 링크로 온 사람은 비밀번호 없이 들어옴 (토큰을 아는 방장·링크로 들어온 사람의 링크만)
  const inviteUrl = code => location.origin + location.pathname + "?room=" + code + (accTok[code] ? "&rk=" + accTok[code] : "") + (GUEST ? "&guest" : "") + (MOCK ? "&mock" : "");
  const roomFromUrl = () => {
    const r = new URLSearchParams(location.search).get("room");
    if (!r || r.toLowerCase() === "host") return null;
    return cleanCode(r) || null;
  };

  // ── 시험용(mock) 방 접근 규칙: 진짜 규칙(gate·pass) 대신 방장 탭이 비밀번호 확인값을 들고 있다가 BroadcastChannel 로 '맞나요?' 에 답함
  //   arena-mock.js(안쪽 mock)는 그대로 두고 host·join·listRooms 만 감싸서 제목·🔒·비밀번호·초대 토큰·기억 동작이 진짜와 같게 시험됨
  function mockAccess(api) {
    let bc = null; try { bc = new BroadcastChannel("arena-mock-acc"); } catch (e) {}
    const hosted = {}, waiters = new Set();                                  // "게임/코드" → { title, pw, tok }
    const roomInfo = (g, c, keys) => {
      const a = hosted[g + "/" + c]; if (!a) return null;
      const m = !a.pw ? "" : (keys || []).find(k => k === pwKey(a.pw, c) || k === a.tok) || "";
      return { lock: !!a.pw, ok: !a.pw || !!m, key: m, title: a.title };
    };
    const listInfo = g => Object.keys(hosted).filter(k => k.startsWith(g + "/")).map(k => ({ code: k.split("/")[1], ti: hosted[k].title, lk: hosted[k].pw ? 1 : 0 }));
    if (bc) bc.onmessage = e => {
      const d = e.data || {};
      if (d.k === "acc?") { const r = roomInfo(d.game, d.code, d.keys); if (r) bc.postMessage({ k: "acc!", id: d.id, ...r }); }
      else if (d.k === "accl?") bc.postMessage({ k: "accl!", id: d.id, rows: listInfo(d.game) });
      else for (const w of [...waiters]) w(d);
    };
    const ask = (msg, ms, early) => new Promise(ok => {
      const id = rand(6), got = [];
      const done = () => { waiters.delete(w); clearTimeout(t); ok(got); };
      const w = d => { if (d.id === id) { got.push(d); if (early) done(); } };
      const t = setTimeout(done, ms);
      waiters.add(w); if (bc) bc.postMessage({ ...msg, id }); else done();
    });
    const host0 = api.host, join0 = api.join, list0 = api.listRooms;
    api.host = async (game, settings = {}) => {
      if (settings.pw && !okPw(settings.pw)) throw new Error("비밀번호는 영문·숫자 4~8자로 해 주세요");
      const h = await host0(game, settings), a = { title: cleanTitle(settings.title), pw: settings.pw ? normPw(settings.pw) : "", tok: rand(10) };
      hosted[game + "/" + h.code] = a;
      const apply = () => { if (a.pw) accTok[h.code] = a.tok; else delete accTok[h.code]; h.setMeta({ title: a.title || undefined, lock: a.pw ? true : undefined }); };
      if (a.title || a.pw) apply();
      h.setAccess = async (p = {}) => {
        if ("title" in p) a.title = cleanTitle(p.title);
        if ("pw" in p) { const n = p.pw ? normPw(p.pw) : ""; if (n && !okPw(n)) throw new Error("비밀번호는 영문·숫자 4~8자로 해 주세요"); a.pw = n; }
        apply();
      };
      Object.defineProperty(h, "access", { get: () => ({ title: a.title, lock: !!a.pw, pw: a.pw, token: a.tok }) });
      const lv = h.leave; h.leave = function () { delete hosted[game + "/" + h.code]; delete accTok[h.code]; return lv.apply(this, arguments); };
      return h;
    };
    api.join = async (game, code, settings = {}) => {
      code = cleanCode(code);
      const keys = candKeys(game, code, settings);
      let r = roomInfo(game, code, keys);
      if (!r) r = (await ask({ k: "acc?", game, code, keys }, 500, true))[0] || null;   // 아무도 답 안 하면 안쪽 join 이 '그런 방이 없어요' 를 냄
      if (r && r.lock) {
        if (!keys.length) throw needPwErr(false);
        if (!r.ok) { keySet(game, code, ""); throw needPwErr(!!settings.pw); }
        keySet(game, code, r.key); if (r.key[0] === "t") accTok[code] = r.key;
      }
      return join0(game, code, settings);
    };
    api.listRooms = async game => {
      const [rows, got] = await Promise.all([list0(game), ask({ k: "accl?", game }, 350, false)]);
      const m = {}; for (const d of got) for (const x of d.rows || []) m[x.code] = x;
      return (rows || []).map(r => m[r.code] ? { ...r, ti: m[r.code].ti || "", lk: m[r.code].lk } : r);
    };
    return Object.assign(api, ACCESS_API);
  }

  // ?mock 또는 ?arena=mock (시험 전용): Firebase 대신 같은 브라우저 탭끼리 BroadcastChannel/메모리로 동작
  const sp0 = new URLSearchParams(location.search);
  const MOCK = sp0.has("mock") || sp0.get("arena") === "mock";
  if (MOCK) {
    if (window.ArenaMock) return mockAccess(window.ArenaMock({ inviteUrl, roomFromUrl, cleanCode }));
    const mockUid = "mock_" + Math.random().toString(36).slice(2, 8);
    const mockRooms = {};
    return mockAccess({
      mock: true, canHost: true, isAdmin: true, uid: mockUid, ready: true,
      init: async () => true,
      db: () => null,
      now: () => Date.now(),
      inviteUrl, roomFromUrl, cleanCode,
      listRooms: async (g) => Object.values(mockRooms[g] || {}),
      deleteRoom: async (g, c) => { if (mockRooms[g]) delete mockRooms[g][c]; },
      host: async (game, settings = {}) => {
        const c = code4();
        const E = emitter(["players", "meta"]);
        const meta = { host: mockUid, created: Date.now(), phase: "lobby", cfg: settings.cfg || null, max: settings.max || 2, v: 1 };
        const players = { [mockUid]: { name: settings.name || "방장", slot: 0, t: Date.now() } };
        (mockRooms[game] = mockRooms[game] || {})[c] = { code: c, h: settings.name || "방장", n: 1, max: meta.max, ph: "lobby", m: "" };
        setTimeout(() => { E.emit("meta", meta); E.emit("players", players); }, 0);
        return {
          code: c, isHost: true, uid: mockUid, meta, players, connected: true,
          on: E.on,
          broadcast: () => {},
          send: () => {},
          peers: () => [],
          setPhase(ph, cfg) { meta.phase = ph; if (cfg !== undefined) meta.cfg = cfg; E.emit("meta", meta); },
          setMeta(p) { Object.assign(meta, p); E.emit("meta", meta); },
          setMe(p) { Object.assign(players[mockUid], p); E.emit("players", players); },
          setShared: () => {},
          watchShared: () => {},
          leave() { if (mockRooms[game]) delete mockRooms[game][c]; E.clear(); },
          close() { if (mockRooms[game]) delete mockRooms[game][c]; E.clear(); },
        };
      },
      join: async (game, c, settings = {}) => {
        const E = emitter(["players", "meta"]);
        const meta = { host: "host_mock", phase: "lobby", cfg: {}, max: 2 };
        const players = { host_mock: { name: "방장", slot: 0 }, [mockUid]: { name: settings.name || "친구", slot: 1 } };
        setTimeout(() => { E.emit("meta", meta); E.emit("players", players); }, 0);
        return {
          code: c, isHost: false, uid: mockUid, meta, players, connected: true,
          on: E.on, send: () => {}, watchShared: () => {}, setMe: () => {}, leave: () => E.clear(), close: () => E.clear(),
        };
      },
    });
  }
  return {
    init, host, join, listRooms, deleteRoom, inviteUrl, roomFromUrl, cleanCode, now, GUEST, ROOT, mock: false,
    db: () => app && app.database(), get uid() { return user && user.uid; }, get ready() { return !!app; },
    get canHost() { return hostFlag; }, get isAdmin() { return adminFlag; },
    createHostInvite, claimHostInvite, refreshPerms, ...ACCESS_API,
  };
})();
window.Arena = Arena;   // 은행(bank.js)·포털이 window.Arena 로 찾음 (const 는 window 에 안 붙음)
