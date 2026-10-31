/* 베니 프라이빗 게임 포털 — 출입 게이트 & 기기 허용 관리 (common/gate.js)
   · 10-31: 아케이드(포털)는 누구나 둘러봄. 허용 안 된 기기가 게임을 열면 '로그인' 창 (허용 요청 · 💞 베니브릿지 · 허용 코드)
     관리자 로그인은 창에 없음 — 아케이드 'BENNY ARCADE' 3번 누르기(adminLoginPrompt) 또는 Benny 포털에서 로그인(같은 주소라 이어짐)
   · 💞 베니브릿지 회원(같은 주소라 로그인이 이어짐, 토큰 m:1)은 허용 전에도 하루 FREE_MIN 분 무료 (화면을 보는 시간만, 이 기기에 저장)
   · OPEN_SOLO(아래): true = 혼자 하기는 누구나 바로 · false = 허용된 기기(+브릿지 무료 시간)만 게임 페이지가 열림
   · 방 초대 링크(?room=ABCD): 등록 없이 그 방에만 들어감 (그대로)
   · 기기 허용 = 혼자 하기 + 친구 방 만들기. 기간은 두 가지: '오늘만'(24시간) · '계속'
     1) 허용 요청: game_requests/{uid} → 베니비서 앱 알림 / 포털 관리 창에서 [계속]·[오늘만]·[거절]
     2) 6자리 허용 코드·링크(?pass=XXXXXX): 코드를 만들 때 '오늘만'·'계속'을 고름
     3) 관리자(베니) 비밀번호 로그인
   · 예전 '가족 방장'(arena_hosts, role host)은 '계속 허용된 기기'로 침 (관리 창도 그대로 씀)
   · 허용된 기기(game_devices/{uid})는 베니 님이 언제든 [일시정지] · [오늘만으로] · [차단] 가능
   API: Gate.state { unlocked(혼자 하기), allowed(허용 기기), canHost(방 만들기), canApprove(다른 기기 허용), isAdmin, role, expiresAt, name, status, reason }
        Gate.canManage() → boolean  관리자 또는 허용된 기기(활성·안 끝남) — 방 만들기·(다음) 은행 초기화 같은 '관리' 권한의 한 곳
        Gate.requestHost({ title }) → Promise<boolean>  방 만들기 권한이 없으면 허용 창을 띄우고, 허용되면 true · 닫으면 false
        규칙(RTDB)에서 같은 판단: auth.token.admin === 1 || arena_hosts/{uid}/ok === true ||
          (game_devices/{uid}/status === 'active' && (expiresAt 없음 || 0 || > now))  — arena/$game/rooms/$code/meta 만들기에 씀
        Gate.onChange(fn) · openAdminModal() · createPass({ role: "friend"|"temp24h" }) · redeemPassCode · requestDeviceApproval … */
const Gate = (() => {
  // ── 설정: true = 혼자 하기는 누구나 (잠금은 방 만들기 때만) · false = 허용된 기기만 게임 페이지가 열림
  const OPEN_SOLO = false;   // 10-30 베니 님: 혼자 하기도 허용된 기기만 (방 링크로 초대받은 손님은 그 방에서만)
  const FREE_MIN = 10;       // 💞 베니브릿지 회원 하루 무료 (분, 게임 화면을 보고 있는 시간만 — 고스톱 3판쯤)
  const FREE_KEY = "game.gate.free.v1";
  const MEMBER_KEY = "game.gate.member";
  // ☕ 커피 사 주기 = 베니브릿지 '개발자 응원하기'와 같은 카카오페이
  const COFFEE_URL = "https://qr.kakaopay.com/281006011000080950628454";
  const COFFEE_QR = "https://benny3s.github.io/bridge/coffee-qr.png";
  const BRIDGE_URL = /github\.io$/.test(location.hostname) ? "/bridge/" : "https://benny3s.github.io/bridge/";

  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs",
    authDomain: "benny-meeting.firebaseapp.com",
    projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app",
    messagingSenderId: "925758544707",
    appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const GATE_BASE = (() => { const c = document.currentScript && document.currentScript.src; return c ? c.replace(/gate\.js.*$/, "") : ""; })();
  const PASS_KEY = "game.gate.pass.v1";
  const NAME_KEY = "game.arena.name";
  const DAY = 24 * 3600 * 1000;
  const qs = new URLSearchParams(location.search);
  const FORCE_GATE = qs.get("gate") === "1";
  const IS_MOCK = qs.has("mock");
  const IS_LOCAL = !FORCE_GATE && (
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost" ||
    location.protocol === "file:" ||
    qs.has("guest") ||
    IS_MOCK
  );
  // ?room=ABCD (4자리 방 코드)로 초대받아 들어온 손님은 해당 방 세션 동안 임시 허용
  const roomParam = (qs.get("room") || "").trim().toUpperCase();
  const IS_ROOM_GUEST = !FORCE_GATE && /^[A-Z0-9]{4}$/.test(roomParam) && roomParam !== "HOST";
  const SOLO_OPEN = OPEN_SOLO || IS_LOCAL || IS_ROOM_GUEST;   // 혼자 하기가 열려 있나
  const IS_PORTAL = /(?:^|\/game)\/(?:index\.html)?$/.test(location.pathname);   // 아케이드 첫 화면 = 잠그지 않음 (둘러보기)
  const PORTAL_URL = /\/game\//.test(location.pathname) ? location.pathname.replace(/(\/game\/).*$/, "$1") : "../";

  let app = null, loading = null, user = null, offset = 0, watching = false, legacyHost = false, devWatch = null;
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  let state = {
    unlocked: SOLO_OPEN,
    allowed: false,
    canHost: IS_LOCAL && !qs.has("nohost"),   // 시험: ?mock&nohost = 방 만들기 권한 없는 기기
    canApprove: false,     // 다른 기기 허용·관리 (관리자 · 옛 가족 방장)
    role: IS_LOCAL ? "local" : IS_ROOM_GUEST ? "room_guest" : "none",
    status: "checking",
    reason: "",
    name: lsGet(NAME_KEY) || "",
    isAdmin: false,
    isMember: false,        // 💞 베니브릿지 회원 (토큰 m:1) — 허용 전에도 하루 FREE_MIN 분 (role "bridge_free")
    freeLeft: 0,            // 오늘 남은 무료 초
    isHost: false,          // 예전 이름 — 지금은 canHost 와 같음
    expiresAt: 0,
    uid: "",
  };
  const listeners = new Set();
  const notify = () => {
    state.isHost = state.canHost;
    for (const fn of listeners) { try { fn(state); } catch (e) {} }
    if (presencePut) presencePut(true);                     // 허용·브릿지 상태가 바뀌면 방문자 표도
    // 로그인 창이 떠 있는 중에 브릿지 로그인(다른 탭)·허용이 바뀌면 창 내용도 (입력 중이 아닐 때)
    if (lockRender && lockEl && !lockEl.hidden && lockSig !== sigOf() && !lockEl.contains(document.activeElement)) lockRender();
  };
  const sigOf = () => [state.uid, state.isMember, state.allowed, state.reason].join("|");
  const dayKST = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  function freeUsed(uid) {
    try { const d = JSON.parse(lsGet(FREE_KEY) || "null"); return d && d.uid === uid && d.d === dayKST() ? Math.max(0, +d.s || 0) : 0; } catch (e) { return 0; }
  }
  const freeLeft = uid => Math.max(0, FREE_MIN * 60 - freeUsed(uid));
  let toastEl = null, toastT = 0;
  function gToast(msg, ms = 3200) {
    injectStyle();
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "bgate-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, ms);
  }

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const loadScript = src => {
    const map = (window.__fbScriptLoads = window.__fbScriptLoads || {});
    if (map[src]) return map[src];
    return (map[src] = new Promise((ok, bad) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = e => { delete map[src]; bad(e); };
      document.head.appendChild(s);
    }));
  };

  function detectDeviceName() {
    const ua = navigator.userAgent || "";
    if (/SM-F9|Fold/i.test(ua)) return "Galaxy Fold";
    if (/Samsung|SM-|Galaxy/i.test(ua)) return "Galaxy 폰";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) return "Android 기기";
    if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "웹 브라우저";
  }

  function detectGameId() {
    const m = location.pathname.match(/\/game\/([a-z0-9_-]+)/i) || location.pathname.match(/\/([a-z0-9_-]+)\/(?:index\.html)?$/i);
    if (!m || m[1].toLowerCase() === "game") return "portal";
    return m[1].toLowerCase();
  }

  function readCachedPass() {
    try {
      const raw = localStorage.getItem(PASS_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.status !== "active") return null;
      if (d.expiresAt && d.expiresAt > 0 && Date.now() > d.expiresAt) return null;
      return d;
    } catch (e) { return null; }
  }

  function writeCachedPass(d) {
    try {
      if (!d) localStorage.removeItem(PASS_KEY);
      else localStorage.setItem(PASS_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  // 🛡️ App Check: 우리 사이트에서 온 요청만 Firebase 가 받게 (reCAPTCHA v3 '사이트 키'는 공개용). 비어 있으면 안 씀
  const APPCHECK_KEY = "";
  async function appCheck(a, load) {
    if (!APPCHECK_KEY || !a || a.__appCheck || /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return;
    a.__appCheck = 1;
    try { if (!firebase.appCheck) await load(SDK + "firebase-app-check-compat.js"); firebase.appCheck(a).activate(new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_KEY), true); } catch (e) { console.warn("[appcheck]", e); }
  }
  async function ensureFirebase() {
    if (app && user) return app;
    if (loading) return loading;
    loading = (async () => {
      if (!window.firebase || !firebase.initializeApp) await loadScript(SDK + "firebase-app-compat.js");
      await Promise.all(
        ["firebase-auth-compat.js", "firebase-database-compat.js"]
          .filter(f => !(f.startsWith("firebase-auth") ? firebase.auth : firebase.database))
          .map(f => loadScript(SDK + f))
      );
      if (firebase.apps && firebase.apps.length) {
        app = firebase.app();
        if (!app.options || !app.options.databaseURL) {
          app = firebase.apps.find(a => a.name === "arena") || firebase.initializeApp(FB, "arena");
        }
      } else {
        app = firebase.initializeApp(FB);
      }
      await appCheck(app, loadScript);
      user = await new Promise(ok => {
        const t = setTimeout(() => ok(null), 7000);
        const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); });
      });
      if (!user) user = (await app.auth().signInAnonymously()).user;
      state.uid = user.uid;
      app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
      // 다른 탭에서 베니브릿지에 로그인·로그아웃하면 (같은 주소라 로그인이 이어짐) 이 기기 판단을 새로
      app.auth().onAuthStateChanged(u => { if (u && user && u.uid !== user.uid) switchUser(u); });
      document.addEventListener("visibilitychange", () => { const u = app.auth().currentUser; if (!document.hidden && u && user && u.uid !== user.uid) switchUser(u); });
      return app;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }

  const db = () => app.database();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const now = () => Date.now() + offset;
  const genCode6 = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };
  // 예전 role(host·friend) → 기간은 expiresAt 으로만 판단: 0 = 계속, 숫자 = 오늘만
  const roleOf = hours => (hours > 0 ? "temp24h" : "friend");
  const durLabel = exp => (exp > 0 ? "⏳ 기간 허용" : "♾️ 계속");
  const leftHours = exp => Math.max(1, Math.ceil((exp - now()) / 3600000));
  const leftTxt = exp => { const h = leftHours(exp); return h > 48 ? `${Math.ceil(h / 24)}일 남음` : `${h}시간 남음`; };

  // ── 허용됨 / 허용 안 됨 상태 반영
  // 👥 방문자: 게임·아케이드를 연 모든 기기(둘러보기 손님 포함)를 game_presence/{uid} 에 — 떠날 때 지우지 않고 마지막 시각만 남김
  //   (관리자만 읽음: 아케이드 첫 화면 '👥 방문자' · logs.html) · mode = admin | allowed | bridge | guest
  let presenceOn = false, presencePut = null, presenceSig = "";
  const presMode = () => (state.isAdmin ? "admin" : state.allowed ? "allowed" : state.isMember || state.role === "bridge_free" ? "bridge" : "guest");
  const profName = () => { try { const m = JSON.parse(localStorage.getItem("game.me") || "null"); return (m && m.name) || ""; } catch (e) { return ""; } };
  // 🔥 게임별 '열어 본 수' (아케이드 추천 순서용, 누구나 읽음) — 게임 페이지를 연 탭마다 한 번
  function countPlay() {
    const g = detectGameId();
    if (IS_LOCAL || !user || !g || g === "portal" || !/^[a-z0-9]{2,20}$/.test(g)) return;
    try { if (sessionStorage.getItem("game.play." + g)) return; sessionStorage.setItem("game.play." + g, "1"); } catch (e) { return; }
    db().ref("game_plays/" + g + "/n").transaction(n => (n || 0) + 1).catch(() => {});
  }
  function startPresence() {
    if (presenceOn || IS_LOCAL || !user) return;
    presenceOn = true;
    try {
      const ref = db().ref("game_presence/" + user.uid);
      const put = soft => {
        const name = String(state.name || profName() || "손님").slice(0, 16), mode = presMode(), sig = name + "|" + mode;
        if (soft && sig === presenceSig) return;
        presenceSig = sig;
        ref.set({ name, game: detectGameId().slice(0, 20), t: TS(), ua: detectDeviceName().slice(0, 60), mode }).catch(() => {});
      };
      presencePut = put;
      ref.onDisconnect().update({ t: TS() }).then(() => put(), () => put());
      setInterval(() => { if (!document.hidden) put(); }, 5 * 60 * 1000);   // 5분마다 '아직 있어요'
    } catch (e) { presenceOn = false; }
  }
  function applyAllowed(role, exp, name) {
    state.allowed = true;
    state.canHost = true;
    state.unlocked = true;
    state.status = "active";
    state.reason = "";
    state.role = role || "friend";
    state.expiresAt = Number(exp || 0);
    if (name) state.name = name;
    if (state.uid) writeCachedPass({ uid: state.uid, role: state.role, status: "active", expiresAt: state.expiresAt, name: state.name });
    hideLockOverlay(true);
    startPresence();
    notify();
  }
  function applyNotAllowed(status, reason) {
    state.allowed = false;
    state.canHost = state.isAdmin || legacyHost;
    state.freeLeft = state.isMember ? freeLeft(state.uid) : 0;
    const free = !state.canHost && state.freeLeft > 0;      // 💞 브릿지 회원 무료 시간
    state.unlocked = SOLO_OPEN || state.canHost || free;
    state.role = free ? "bridge_free" : state.role === "bridge_free" ? "none" : state.role;
    state.status = status;
    state.reason = reason || "";
    writeCachedPass(null);
    if (free) {
      if (lockEl && !lockEl.hidden && lockMode === "lock") lockEl.hidden = true;
      startFreeClock();
      startPresence();
    }
    if (!state.unlocked && !IS_PORTAL) showLockOverlay({ mode: "lock" });
    notify();
  }

  // 💞 무료 시간: 게임 화면을 보고 있는 동안 5초씩 (아케이드 첫 화면·숨긴 탭은 안 셈)
  let freeTimer = null, freeWarned = false;
  function startFreeClock() {
    if (freeTimer || IS_PORTAL || IS_LOCAL || IS_ROOM_GUEST) return;
    freeTimer = setInterval(() => {
      if (state.role !== "bridge_free") { clearInterval(freeTimer); freeTimer = null; return; }
      if (document.hidden) return;
      lsSet(FREE_KEY, JSON.stringify({ uid: state.uid, d: dayKST(), s: freeUsed(state.uid) + 5 }));
      state.freeLeft = freeLeft(state.uid);
      if (state.freeLeft <= 60 && !freeWarned) { freeWarned = true; gToast("💞 오늘 무료 시간이 1분 남았어요"); }
      if (state.freeLeft <= 0) {
        clearInterval(freeTimer); freeTimer = null;
        applyNotAllowed("free_over", `⏰ 오늘 무료 ${FREE_MIN}분을 다 썼어요. 허용을 요청하면 시간 제한 없이 할 수 있어요.`);
      }
    }, 5000);
  }

  // 로그인한 사람이 바뀜 (다른 탭에서 브릿지 로그인 등) → 새 uid 로 처음부터 판단
  async function switchUser(u) {
    user = u;
    state.uid = u.uid;
    state.isAdmin = false; state.isMember = false; state.canApprove = false; legacyHost = false;
    if (devWatch) { try { devWatch.off(); } catch (e) {} devWatch = null; }
    watching = false;
    try { if (checkP) await checkP.catch(() => {}); await checkPermissionsAndWatch(); } catch (e) { console.warn("Gate switch error:", e); }
  }

  let checkP = null;                                         // 같은 때 여러 곳에서 불러도 확인은 한 번
  function checkPermissionsAndWatch() { return checkP || (checkP = checkPerm1().finally(() => { checkP = null; })); }
  async function checkPerm1() {
    await ensureFirebase();
    startPresence();
    countPlay();
    try {
      const tr = await user.getIdTokenResult();
      state.isAdmin = !!(tr && tr.claims && tr.claims.admin === 1);
      state.isMember = !!(tr && tr.claims && tr.claims.m === 1);   // 💞 베니브릿지 승인 회원 (uid = 회원 id)
    } catch (e) { state.isAdmin = false; state.isMember = false; }
    lsSet(MEMBER_KEY, state.isMember ? user.uid : null);
    try {
      const cached = readCachedPass();
      if (lsGet("game.gate.admin") === "1" || (cached && cached.role === "admin")) state.isAdmin = true;
    } catch (e) {}

    if (state.isAdmin) {
      state.canApprove = true;
      lsSet("game.gate.admin", "1");
      applyAllowed("admin", 0, state.name);
      writeCachedPass({ uid: user.uid, role: "admin", status: "active", expiresAt: 0 });
      return;
    }

    // 예전 가족 방장(arena_hosts) → 계속 허용된 기기 + 관리 창
    try {
      const hSnap = await db().ref("arena_hosts/" + user.uid + "/ok").get();
      if (hSnap.val() === true) {
        legacyHost = true;
        state.canApprove = true;
        applyAllowed("host", 0, state.name);
      }
    } catch (e) {}

    // URL에 ?pass=XXXXXX 또는 ?host_invite=XXXXXX 가 있으면 자동 등록 시도
    const urlPass = (qs.get("pass") || qs.get("host_invite") || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (urlPass.length === 6 && !state.allowed) {
      try {
        await redeemPassCode(urlPass, state.name || "초대손님");
      } catch (e) {
        console.warn("허용 코드 자동 등록 실패:", e);
      }
    }
    if (urlPass.length === 6) {
      try {
        const cleanUrl = new URL(location.href);
        cleanUrl.searchParams.delete("pass"); cleanUrl.searchParams.delete("host_invite");
        history.replaceState(null, "", cleanUrl.toString());
      } catch (e) {}
    }

    if (watching) return;
    watching = true;
    // 내 기기 상태 실시간 감시 (베니 님이 허용하거나 일시정지/차단하면 바로 반영)
    devWatch = db().ref("game_devices/" + user.uid);
    devWatch.on("value", snap => {
      const d = snap.val();
      if (state.isAdmin || legacyHost) return;
      if (d && typeof d === "object") {
        const exp = Number(d.expiresAt || 0);
        const expired = exp > 0 && now() > exp;
        if (d.status === "active" && !expired) {
          applyAllowed(d.role || "friend", exp, d.name || state.name);
          // 최근 접속 시각 갱신 (조용히)
          db().ref("game_devices/" + user.uid + "/lastSeen").set(TS()).catch(() => {});
        } else {
          state.expiresAt = exp;
          applyNotAllowed(expired ? "expired" : (d.status || "revoked"),
            expired ? "⏰ '오늘만' 허용이 끝났어요. 다시 허용받아 주세요."
            : d.status === "paused" ? "⏸ 베니 님이 이 기기를 잠시 멈춰 두었어요."
            : "🚫 이 기기의 허용이 해제되었어요.");
        }
      } else {
        applyNotAllowed("unregistered", "");
      }
    });
  }

  // ── 1) 6자리 허용 코드로 기기 등록 ──────────────────────────────
  async function redeemPassCode(rawCode, rawName) {
    await ensureFirebase();
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) throw new Error("6자리 허용 코드를 정확히 입력해 주세요.");
    const name = String(rawName || state.name || "친구").trim().slice(0, 12) || "친구";
    lsSet(NAME_KEY, name);
    state.name = name;

    // game_passes/{code} 먼저, 없으면 예전 가족 방장 코드 arena_invites/{code} (→ 계속 허용)
    const pSnap = await db().ref("game_passes/" + code).get();
    let hours = 0;
    if (pSnap.exists()) {
      const p = pSnap.val() || {};
      if (p.revoked) throw new Error("이미 취소된 코드예요.");
      hours = Number(p.hours || (p.role === "temp24h" ? 24 : 0));
    } else {
      const hSnap = await db().ref("arena_invites/" + code).get();
      if (!hSnap.exists()) throw new Error("맞지 않거나 끝난 코드예요.");
    }

    const role = roleOf(hours);
    const expiresAt = hours > 0 ? now() + hours * 3600 * 1000 : 0;
    await db().ref("game_devices/" + user.uid).set({
      name,
      role,
      status: "active",
      passCode: code,
      expiresAt,
      ua: detectDeviceName(),
      t: TS(),
      lastSeen: TS(),
    });
    applyAllowed(role, expiresAt, name);
    return { role, expiresAt, name };
  }

  // 가입 신청: 닉네임 + PIN → 게임 공통 프로필(me.js GME) 만들기·이어 받기. 아케이드 첫 화면처럼 me.js 가 없는 곳은 불러옴
  async function registerProfile(name, pin) {
    await ensureFirebase();
    if (!window.GME && GATE_BASE) { try { await loadScript(GATE_BASE + "me.js?v=12"); } catch (e) {} }
    if (!window.GME || !GME.register) return { name };
    return GME.register(db(), name, pin);
  }

  // ── 2) 베니비서 앱으로 허용 요청 보내기 (want: "always" 계속 | "today" 오늘만 — 정하는 건 베니 님)
  let reqWatch = null;
  async function requestDeviceApproval(rawName, onStatus, want = "always", rawNote = "") {
    await ensureFirebase();
    const name = String(rawName || "").trim().slice(0, 12);
    if (!name) throw new Error("베니 님이 알아볼 수 있게 이름이나 별명을 적어 주세요.");
    lsSet(NAME_KEY, name);
    state.name = name;

    const payload = {
      uid: user.uid,
      name,
      ua: detectDeviceName(),
      game: detectGameId(),
      want: ["day", "week", "month", "always"].includes(want) ? want : want === "today" ? "day" : "always",
      note: String(rawNote || "").trim().slice(0, 60),
      status: "pending",
      t: TS(),
    };
    if (state.isMember) payload.bm = 1;                      // 💞 베니브릿지 회원 (관리 창에 표시)
    await db().ref("game_requests/" + user.uid).set(payload);
    if (onStatus) onStatus("pending");
    // 허용되면 game_devices 감시가 바로 열어 줌
    checkPermissionsAndWatch().catch(() => {});

    const ref = db().ref("game_requests/" + user.uid);
    if (reqWatch) ref.off("value", reqWatch);
    reqWatch = snap => {
      const r = snap.val();
      if (!r) return;
      if (onStatus) onStatus(r.status || "pending", r);
    };
    ref.on("value", reqWatch);
    return payload;
  }

  // ── 3) 관리자 비밀번호 로그인 (Cloud Function adminLogin 연동) ─────
  async function loginAdminWithPassword(password) {
    await ensureFirebase();
    if (!firebase.functions) {
      await loadScript(SDK + "firebase-functions-compat.js");
    }
    const res = await app.functions("asia-northeast3").httpsCallable("adminLogin")({ password: String(password || "") });
    if (!res || !res.data || !res.data.token) throw new Error("관리자 인증에 실패했어요.");
    user = (await app.auth().signInWithCustomToken(res.data.token)).user;
    await user.getIdToken(true);
    state.uid = user.uid;
    state.isAdmin = true;
    state.canApprove = true;
    lsSet("game.gate.admin", "1");
    applyAllowed("admin", 0, state.name);
    writeCachedPass({ uid: user.uid, role: "admin", status: "active", expiresAt: 0 });
    return true;
  }

  // ── 4) 관리자용 허용 코드 발급 & 기기 제어 API ────────────────────
  // role: "friend"(계속) | "temp24h"(오늘만) — 예전 "host" 는 계속으로
  async function createPass({ role = "friend", label = "" } = {}) {
    await ensureFirebase();
    const code = genCode6();
    if (role !== "temp24h") role = "friend";
    const hours = role === "temp24h" ? 24 : 0;
    const item = {
      code,
      role,
      hours,
      label: String(label || (hours ? "오늘만" : "계속")).slice(0, 20),
      by: user.uid,
      t: TS(),
    };
    await db().ref("game_passes/" + code).set(item);
    const u = new URL(location.origin + "/game/");
    u.searchParams.set("pass", code);
    return { code, role, hours, url: u.toString() };
  }

  // days: 1·7·30 = 그만큼, 0 = 계속 (예전 role "temp24h" = 1일)
  async function approveRequest(targetUid, { role = "friend", name = "친구", ua = "", days } = {}) {
    await ensureFirebase();
    if (days == null) days = role === "temp24h" ? 1 : 0;
    days = [1, 7, 30].includes(Number(days)) ? Number(days) : 0;
    role = days ? "temp24h" : "friend";
    const expiresAt = days ? now() + days * DAY : 0;
    await db().ref("game_devices/" + targetUid).set({
      name: String(name || "친구").slice(0, 12),
      role,
      status: "active",
      expiresAt,
      ua: String(ua || "등록 기기").slice(0, 24),
      t: TS(),
      lastSeen: TS(),
    });
    await db().ref("game_requests/" + targetUid).update({ status: "approved", role, approvedAt: TS() });
  }

  async function rejectRequest(targetUid) {
    await ensureFirebase();
    await db().ref("game_requests/" + targetUid).update({ status: "rejected", rejectedAt: TS() });
  }

  async function updateDevice(targetUid, patch) {
    await ensureFirebase();
    await db().ref("game_devices/" + targetUid).update(patch);
  }

  async function removeDevice(targetUid) {
    await ensureFirebase();
    await db().ref("game_devices/" + targetUid).update({ status: "revoked", expiresAt: 0 });
  }

  // ── UI 스타일 주입 ────────────────────────────────────────────────
  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement("style");
    s.textContent = `
      .bgate-ov {
        position: fixed; inset: 0; z-index: 99999;
        background: radial-gradient(circle at 50% 20%, rgba(27,40,56,0.96), rgba(9,13,19,0.99));
        backdrop-filter: blur(14px);
        display: flex; align-items: center; justify-content: center;
        padding: 18px; color: #e2e8f0;
        font-family: 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif;
      }
      .bgate-ov[hidden] { display: none !important; }
      .bgate-card {
        position: relative;
        width: min(460px, 100%);
        max-height: 92dvh; overflow-y: auto;
        background: linear-gradient(165deg, #1b2838 0%, #111924 100%);
        border: 1px solid rgba(102,192,244,0.28);
        border-radius: 18px;
        padding: 24px 22px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.75);
      }
      .bgate-card.wide { width: min(640px, 100%); }
      .bgate-x {
        position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border-radius: 10px;
        border: 1px solid #334155; background: #1e293b; color: #cbd5e1; font-size: 15px; cursor: pointer;
      }
      .bgate-badge {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-weight: 700; color: #66c0f4;
        background: rgba(102,192,244,0.12);
        border: 1px solid rgba(102,192,244,0.3);
        padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
      }
      .bgate-title { margin: 0 0 6px; font-size: 21px; font-weight: 800; color: #fff; letter-spacing: -0.02em; padding-right: 36px; }
      .bgate-sub { margin: 0 0 16px; font-size: 13.5px; color: #94a3b8; line-height: 1.55; }
      .bgate-sub b { color: #e2e8f0; }
      .bgate-warn {
        background: rgba(245,158,11,0.14); border: 1px solid rgba(245,158,11,0.4);
        color: #fde68a; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 14px;
      }
      .bgate-tabs {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
        background: #0c121a; padding: 4px; border-radius: 10px; margin-bottom: 16px;
      }
      .bgate-tab {
        border: 0; background: transparent; color: #94a3b8;
        font: 600 12.5px/1.2 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; padding: 9px 6px; border-radius: 7px; cursor: pointer;
      }
      .bgate-tab.active { background: #243b55; color: #fff; }
      .bgate-tab { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bgate-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      .bgate-field label, .bgate-field .lb { font-size: 12.5px; font-weight: 600; color: #cbd5e1; }
      .bgate-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .bgate-seg button {
        border: 1px solid #334155; background: #0c131d; color: #cbd5e1; border-radius: 10px;
        padding: 10px 8px; font: 700 13.5px/1.2 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; cursor: pointer;
      }
      .bgate-seg button.on { border-color: #66c0f4; background: #17304a; color: #fff; }
      .bgate-seg small { display: block; font-weight: 500; font-size: 11px; color: #94a3b8; margin-top: 2px; }
      .bgate-inp {
        width: 100%; box-sizing: border-box;
        padding: 11px 13px; border-radius: 10px;
        border: 1px solid #334155; background: #0c131d; color: #fff;
        font: 600 15px/1.2 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; outline: none;
      }
      .bgate-inp:focus { border-color: #66c0f4; }
      .bgate-inp.code { text-align: center; letter-spacing: 5px; text-transform: uppercase; font-size: 18px; }
      .bgate-btn {
        width: 100%; border: 0; border-radius: 10px; padding: 12px 16px;
        font: 700 14.5px/1.2 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        transition: filter 0.15s, transform 0.08s;
      }
      .bgate-btn:active { transform: scale(0.98); }
      .bgate-btn:disabled { opacity: .6; cursor: default; }
      .bgate-btn.primary { background: linear-gradient(90deg, #3b82f6, #2563eb); color: #fff; }
      .bgate-btn.green { background: linear-gradient(90deg, #10b981, #059669); color: #fff; }
      .bgate-btn.ghost { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
      .bgate-btn.sm { width: auto; padding: 6px 10px; font-size: 12px; border-radius: 7px; }
      .bgate-hint { margin: 8px 0 0; font-size: 12px; color: #94a3b8; text-align: center; }
      .bgate-alt {
        margin: 2px 0 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08);
        display: grid; gap: 8px; font-size: 12.5px; color: #94a3b8; text-align: center;
      }
      .bgate-more { display: flex; justify-content: center; gap: 14px; margin-top: 12px; }
      .bgate-more button { border: 0; background: none; color: #94a3b8; font: 600 12.5px 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; text-decoration: underline; cursor: pointer; padding: 4px; }
      .bgate-wait {
        margin-top: 12px; padding: 14px; border-radius: 12px;
        background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.35);
        color: #a7f3d0; font-size: 13px; line-height: 1.55; text-align: center;
      }
      .bgate-mem {
        margin: 0 0 14px; padding: 12px 13px; border-radius: 12px; display: grid; gap: 8px;
        background: rgba(236,72,153,0.09); border: 1px solid rgba(236,72,153,0.35); color: #fbcfe8; font-size: 13px; line-height: 1.5;
      }
      .bgate-mem[hidden] { display: none; }
      .bgate-mem small, .bgate-field label small, .bgate-chk small { color: #94a3b8; font-weight: 500; font-size: 11.5px; }
      .bgate-chk { display: flex; align-items: center; gap: 9px; margin: 0 0 10px; padding: 10px 12px; border-radius: 11px; border: 1px solid #334155; background: #0c131d; color: #e2e8f0; font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .bgate-chk input { width: 18px; height: 18px; accent-color: #ec4899; flex: none; }
      .bgate-chk span { display: grid; gap: 1px; }
      .bgate-err { min-height: 0; font-size: 12.5px; color: #fca5a5; margin: -4px 0 8px; }
      .bgate-err:empty { display: none; }
      .bgate-visl { display: flex; flex-wrap: wrap; gap: 6px; }
      .bgate-vis { font-size: 12.5px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); color: #e2e8f0; }
      .bgate-vis.on { border-color: #10b981; background: rgba(16,185,129,0.12); }
      .bgate-vis small { color: #94a3b8; font-size: 11px; }
      .bgate-sec {
        background: rgba(12,19,29,0.75); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 14px; margin-bottom: 14px;
      }
      .bgate-sec h4 { margin: 0 0 10px; font-size: 14px; color: #66c0f4; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
      .bgate-row {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        padding: 9px 10px; border-radius: 9px; background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06); margin-bottom: 7px; flex-wrap: wrap;
      }
      .bgate-row:last-child { margin-bottom: 0; }
      .bgate-meta { font-size: 11.5px; color: #94a3b8; }
      .bgate-pill {
        display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 11px; font-weight: 700;
      }
      .bgate-pill.active { background: rgba(16,185,129,0.2); color: #6ee7b7; }
      .bgate-pill.paused { background: rgba(245,158,11,0.2); color: #fcd34d; }
      .bgate-pill.revoked { background: rgba(239,68,68,0.2); color: #fca5a5; }
      .bgate-pill.want { background: rgba(102,192,244,0.16); color: #93c5fd; }
      .bgate-foot {
        margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;
        font-size: 12px; color: #94a3b8; text-align: center;
      }
      .bgate-coffee {
        border: 1px solid rgba(245,158,11,0.55); background: rgba(245,158,11,0.14); color: #fcd34d;
        border-radius: 99px; padding: 7px 12px; font: 700 12.5px/1.2 'Pretendard Variable', 'Noto Sans KR', system-ui, sans-serif; cursor: pointer;
      }
      .bgate-toast {
        position: fixed; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 12px); transform: translateX(-50%);
        z-index: 100001; background: rgba(10,14,22,0.94); color: #fde68a; border: 1px solid rgba(245,158,11,0.45);
        padding: 9px 16px; border-radius: 99px; font: 700 13.5px/1.3 system-ui, sans-serif;
        max-width: calc(100vw - 32px); text-align: center; pointer-events: none;
      }
      .bgate-toast[hidden] { display: none; }
      a.bgate-btn { text-decoration: none; box-sizing: border-box; }
    `;
    document.head.appendChild(s);
  }

  // ── 로그인 창 (mode "lock" = 게임 화면 잠금 · "login" = 아케이드에서 연 창(닫기 됨, next = 허용되면 갈 곳) · "host" = 방 만들기 권한 받기(닫기 됨))
  //    탭: 📲 허용 요청 · 💞 베니브릿지(회원이면 하루 FREE_MIN 분 무료) · 🔑 허용 코드. 관리자 로그인은 여기 없음 (adminLoginPrompt)
  let lockEl = null, lockMode = "lock", lockNext = "", lockRender = null, lockSig = "", hostWaiters = [];
  const settleHost = ok => { const w = hostWaiters.splice(0); for (const f of w) { try { f(ok); } catch (e) {} } };
  function showLockOverlay({ mode = "lock", title = "", next = "" } = {}) {
    injectStyle();
    if (lockEl && !lockEl.hidden && lockMode === "lock" && mode !== "lock") mode = "lock";
    lockMode = mode;
    lockNext = next || "";
    if (!lockEl) {
      lockEl = document.createElement("div");
      lockEl.id = "bennyGateOverlay";
      lockEl.className = "bgate-ov";
      document.body.appendChild(lockEl);
    }
    const isHostMode = mode === "host", canClose = mode !== "lock";
    // 10-31 베니 님: 탭 대신 '가입 신청' 한 장 — 닉네임(게임 프로필) · PIN · 한마디 · 기간. 💞 베니브릿지 회원은 기본 권한 안내(체크), 허용 코드는 아래 작은 링크
    let want = "week", bmOpen = false, codeOpen = false;
    const form = { name: (() => { try { const m = JSON.parse(localStorage.getItem("game.me") || "null"); return (m && m.name) || ""; } catch (e) { return ""; } })() || state.name || "", pin: "", note: "", code: "" };
    const myProfName = () => { try { const m = JSON.parse(localStorage.getItem("game.me") || "null"); return (m && m.name) || ""; } catch (e) { return ""; } };
    const render = () => {
      lockSig = sigOf();
      const left = Math.ceil(freeLeft(state.uid) / 60);
      lockEl.innerHTML = `
        <div class="bgate-card" role="dialog" aria-modal="true" aria-label="가입 신청">
          ${canClose ? `<button class="bgate-x" data-close aria-label="닫기">✕</button>` : ""}
          <div class="bgate-badge">${isHostMode ? "🏠 친구 방 만들기" : "🎮 베니 아케이드"}</div>
          <h2 class="bgate-title">${isHostMode ? "가입이 허용되면 방을 만들 수 있어요" : "가입하고 같이 해요"}</h2>
          <p class="bgate-sub">${isHostMode
            ? `허용된 회원은 <b>혼자 하기</b>와 <b>친구 방 만들기</b>를 다 할 수 있어요.${title ? ` (${esc(title)})` : ""}`
            : `가족·지인 전용이에요. 가입 신청을 보내면 베니가 확인하고 허용해요. 허용된 뒤로는 <b>이 기기에서 계속</b> 할 수 있어요. 둘러보기는 가입 없이 돼요.`}</p>
          ${state.reason ? `<div class="bgate-warn">${esc(state.reason)}</div>` : ""}
          ${isHostMode ? `<div class="bgate-alt"><span>같이 하기만 할 거면 <b style="color:#e2e8f0">가입이 필요 없어요.</b><br>방장이 보낸 <b style="color:#e2e8f0">방 링크</b>를 누르거나 방 목록에서 들어가세요.</span><button class="bgate-btn ghost" data-close>👍 그냥 들어갈게요</button></div>` : ""}
          <div id="bgateTabBody"></div>
          <div class="bgate-foot"><span>🖥️ 서버·통신 비용은 베니가 내고 있어요.</span><button type="button" class="bgate-coffee" data-coffee>☕ 커피 사 주기</button></div>
          ${mode === "lock" ? `<a class="bgate-btn ghost" href="${esc(PORTAL_URL)}" style="margin-top:12px">← 아케이드 둘러보기</a>` : ""}
        </div>
      `;
      const body = lockEl.querySelector("#bgateTabBody");
      let bridgeHtml;
      if (state.isMember) {
        bridgeHtml = state.allowed ? ""
          : isHostMode ? `<div class="bgate-mem">💞 <b>베니브릿지 회원</b>이라 혼자 하기는 하루 ${FREE_MIN}분 무료예요. 친구 방 만들기는 가입이 허용된 뒤에 돼요.</div>`
          : left > 0 ? `<div class="bgate-mem">💞 <b>베니브릿지 회원</b>이라 <b>기본 권한</b>이 있어요 — 허용 전에도 하루 ${FREE_MIN}분 무료 (오늘 ${left}분 남음)<button class="bgate-btn green sm" id="bgFreeGo">▶ 지금 무료로 하기</button><small>가입이 허용되면 시간 제한이 없어요.</small></div>`
          : `<div class="bgate-mem">💞 베니브릿지 회원 · 오늘 무료 ${FREE_MIN}분을 다 썼어요. 가입이 허용되면 시간 제한이 없어요.</div>`;
      } else {
        bridgeHtml = `<label class="bgate-chk"><input type="checkbox" id="bgBm"${bmOpen ? " checked" : ""}><span>💞 베니브릿지 회원이에요 <small>기본 권한: 허용 전에도 하루 ${FREE_MIN}분 무료</small></span></label>
          <div class="bgate-mem" id="bgBmBox"${bmOpen ? "" : " hidden"}>베니브릿지에 로그인하면 허용을 기다리지 않고 바로 하루 ${FREE_MIN}분 무료예요.<a class="bgate-btn primary sm" href="${esc(BRIDGE_URL)}" target="_blank" rel="noopener">💞 베니브릿지에서 로그인</a><small>같은 브라우저에서 로그인하고 이 화면으로 돌아오면 저절로 열려요. 가입 신청도 같이 보내 두면 허용 뒤엔 시간 제한이 없어요.</small></div>`;
      }
      body.innerHTML = `
        ${bridgeHtml}
        <div class="bgate-field">
          <label for="bgReqName">닉네임 <small>6자까지 · 게임에서 친구들에게 보여요</small></label>
          <input class="bgate-inp" id="bgReqName" maxlength="6" placeholder="예: 철수, 처남" value="${esc(form.name)}" autocomplete="nickname" spellcheck="false">
        </div>
        <div class="bgate-field">
          <label for="bgReqPin">PIN 4자리 <small id="bgPinHint"></small></label>
          <input class="bgate-inp code" id="bgReqPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••" autocomplete="off" value="${esc(form.pin)}">
        </div>
        <div class="bgate-field">
          <label for="bgReqNote">베니에게 한마디 <small>선택</small></label>
          <input class="bgate-inp" id="bgReqNote" maxlength="60" placeholder="예: 금요일 고스톱 같이 쳐요" value="${esc(form.note)}">
        </div>
        <div class="bgate-field">
          <span class="lb">얼마나 쓸까요?</span>
          <div class="bgate-seg">
            ${[["day", "⏳ 하루", "24시간"], ["week", "📅 1주", "7일"], ["month", "🗓️ 1달", "30일"], ["always", "♾️ 계속", "기한 없이"]].map(([k, t, sm]) => `<button type="button" data-want="${k}" class="${want === k ? "on" : ""}">${t}<small>${sm}</small></button>`).join("")}
          </div>
        </div>
        <div class="bgate-err" id="bgReqMsg"></div>
        <button class="bgate-btn green" id="bgReqBtn">📮 가입 신청 보내기</button>
        <div id="bgReqWait" hidden class="bgate-wait"></div>
        <div class="bgate-more"><button type="button" id="bgCodeTgl">🔑 베니에게 코드를 받았어요</button></div>
        <div id="bgCodeBox"${codeOpen ? "" : " hidden"}><div style="display:flex;gap:8px;margin-top:4px">
          <input class="bgate-inp code" id="bgCodeVal" maxlength="6" placeholder="6자리 코드" autocomplete="off" autocapitalize="characters" spellcheck="false" style="flex:1" value="${esc(form.code)}">
          <button class="bgate-btn primary sm" id="bgCodeBtn" style="padding:11px 14px">🔓 시작</button>
        </div><p class="bgate-hint">코드를 넣으면 기다리지 않고 바로 허용돼요 (닉네임도 위에 적어 주세요).</p></div>
      `;
      const nameInp = body.querySelector("#bgReqName"), pinInp = body.querySelector("#bgReqPin"), noteInp = body.querySelector("#bgReqNote");
      const msgEl = body.querySelector("#bgReqMsg"), reqBtn = body.querySelector("#bgReqBtn"), waitBox = body.querySelector("#bgReqWait");
      const sameDev = () => !!myProfName() && nameInp.value.trim() === myProfName();
      const hint = () => { body.querySelector("#bgPinHint").textContent = sameDev() ? "이 기기에서 쓰던 닉네임이라 비워도 돼요" : "새 닉네임이면 정하고, 다른 기기에서 쓰던 닉네임이면 그 PIN"; };
      hint();
      nameInp.oninput = () => { form.name = nameInp.value; msgEl.textContent = ""; hint(); };
      pinInp.oninput = () => { pinInp.value = pinInp.value.replace(/\D/g, "").slice(0, 4); form.pin = pinInp.value; msgEl.textContent = ""; };
      noteInp.oninput = () => { form.note = noteInp.value; };
      body.querySelectorAll("[data-want]").forEach(b => {
        b.onclick = () => { want = b.dataset.want; body.querySelectorAll("[data-want]").forEach(x => x.classList.toggle("on", x === b)); };
      });
      const bm = body.querySelector("#bgBm");
      if (bm) bm.onchange = () => { bmOpen = bm.checked; body.querySelector("#bgBmBox").hidden = !bmOpen; };
      const freeGo = body.querySelector("#bgFreeGo");
      if (freeGo) freeGo.onclick = () => hideLockOverlay(true);
      reqBtn.onclick = async () => {
        const nm = nameInp.value.trim().slice(0, 6), pin = pinInp.value;
        if (!nm) { msgEl.textContent = "닉네임을 적어 주세요."; nameInp.focus(); return; }
        if (!sameDev() && pin.length !== 4) { msgEl.textContent = "PIN 숫자 4자리를 적어 주세요."; pinInp.focus(); return; }
        reqBtn.disabled = true;
        reqBtn.textContent = "보내는 중...";
        try {
          const prof = await registerProfile(nm, pin);
          await requestDeviceApproval(prof.name || nm, st => {
            waitBox.hidden = false;
            if (st === "pending") {
              waitBox.innerHTML = `<b>📮 '${esc(prof.name || nm)}' 가입 신청을 보냈어요!</b><br>베니가 허용하면 이 화면이 바로 열려요.`;
              reqBtn.textContent = "⏳ 허용 기다리는 중";
            } else if (st === "rejected") {
              waitBox.innerHTML = "😿 이번에는 허용되지 않았어요.";
              reqBtn.disabled = false;
              reqBtn.textContent = "다시 신청하기";
            }
          }, want, noteInp.value);
        } catch (e) {
          msgEl.textContent = e.message || "신청을 보내지 못했어요.";
          reqBtn.disabled = false;
          reqBtn.textContent = "📮 가입 신청 보내기";
        }
      };
      body.querySelector("#bgCodeTgl").onclick = () => { codeOpen = !codeOpen; body.querySelector("#bgCodeBox").hidden = !codeOpen; if (codeOpen) body.querySelector("#bgCodeVal").focus(); };
      const codeInp = body.querySelector("#bgCodeVal"), codeBtn = body.querySelector("#bgCodeBtn");
      codeInp.oninput = () => { form.code = codeInp.value; };
      codeBtn.onclick = async () => {
        const nm = nameInp.value.trim().slice(0, 6);
        if (!nm) { msgEl.textContent = "닉네임을 먼저 적어 주세요."; nameInp.focus(); return; }
        codeBtn.disabled = true;
        try {
          if (pinInp.value.length === 4 || sameDev()) await registerProfile(nm, pinInp.value).catch(() => {});
          await redeemPassCode(codeInp.value, nm);
        } catch (e) {
          msgEl.textContent = e.message || "코드를 확인하지 못했어요.";
          codeBtn.disabled = false;
        }
      };
      lockEl.querySelectorAll("[data-close]").forEach(b => { b.onclick = () => hideLockOverlay(false); });
      lockEl.querySelector("[data-coffee]").onclick = openCoffee;
    };
    lockRender = render;
    render();
    lockEl.onclick = e => { if (e.target === lockEl && canClose) hideLockOverlay(false); };
    lockEl.hidden = false;
    // 아케이드에서 연 창: 아직 확인 전이면 서버 확인 (브릿지 회원·허용된 기기면 창이 바뀜)
    if (!IS_LOCAL && !watching) checkPermissionsAndWatch().catch(e => console.warn("Gate check error:", e));
  }

  // ☕ 커피 사 주기 (카카오페이 QR · 열기 · 링크 복사)
  function openCoffee() {
    injectStyle();
    const ov = document.createElement("div");
    ov.className = "bgate-ov";
    ov.style.zIndex = "100000";
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    ov.innerHTML = `
      <div class="bgate-card" role="dialog" aria-modal="true" aria-label="커피 사 주기" style="text-align:center">
        <button class="bgate-x" data-x aria-label="닫기">✕</button>
        <div class="bgate-badge">☕ 베니에게 커피 사 주기</div>
        <p class="bgate-sub">게임 서버·통신 비용은 베니가 내고 있어요.<br>재밌게 하셨다면 커피 한 잔이면 충분해요 🙏</p>
        <img src="${COFFEE_QR}" alt="카카오페이 QR" style="width:210px;max-width:75%;border-radius:12px;background:#fff;padding:6px">
        <p class="bgate-hint">${mobile ? "아래 단추를 누르거나 QR 을 찍으면 카카오페이로 보내져요." : "휴대폰 카메라로 QR 을 찍으면 카카오페이로 보내져요."}</p>
        <div style="display:grid;gap:8px;margin-top:12px">
          ${mobile ? `<a class="bgate-btn green" href="${COFFEE_URL}" target="_blank" rel="noopener">☕ 카카오페이 열기</a>` : ""}
          <button class="bgate-btn ghost" data-copy>🔗 링크 복사</button>
        </div>
      </div>`;
    ov.onclick = e => {
      if (e.target === ov || e.target.closest("[data-x]")) { ov.remove(); return; }
      const c = e.target.closest("[data-copy]");
      if (c) navigator.clipboard.writeText(COFFEE_URL).then(() => { c.textContent = "✅ 링크를 복사했어요"; }, () => { window.prompt("카카오페이 링크", COFFEE_URL); });
    };
    document.body.appendChild(ov);
  }

  // 👑 관리자 로그인 (숨은 입구: 아케이드 'BENNY ARCADE' 3번 누르기) — 이미 관리자면 관리 창
  function adminLoginPrompt() {
    if (state.isAdmin) { openAdminModal(); return; }
    injectStyle();
    const ov = document.createElement("div");
    ov.className = "bgate-ov";
    ov.style.zIndex = "100000";
    ov.innerHTML = `
      <div class="bgate-card" role="dialog" aria-modal="true" aria-label="관리자">
        <button class="bgate-x" data-x aria-label="닫기">✕</button>
        <div class="bgate-badge">👑 관리자</div>
        <div class="bgate-field"><label for="bgAdmPw2">비밀번호</label><input class="bgate-inp" type="password" id="bgAdmPw2" autocomplete="current-password"></div>
        <button class="bgate-btn primary" data-go>들어가기</button>
      </div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector("input"), go = ov.querySelector("[data-go]");
    const run = async () => {
      go.disabled = true;
      try { await loginAdminWithPassword(inp.value); ov.remove(); openAdminModal(); }
      catch (e) { alert(e.message || "비밀번호가 맞지 않아요."); go.disabled = false; inp.select(); }
    };
    go.onclick = run;
    inp.onkeydown = e => { if (e.key === "Enter") run(); };
    ov.onclick = e => { if (e.target === ov || e.target.closest("[data-x]")) ov.remove(); };
    setTimeout(() => inp.focus(), 40);
  }

  // ok: true = 허용됨(또는 무료로 하기), false = 닫음 (방 만들기 기다리는 쪽에 알려 줌)
  function hideLockOverlay(ok) {
    if (lockEl) lockEl.hidden = true;
    settleHost(!!state.canHost);
    if (ok === true && lockNext && state.unlocked) { const n = lockNext; lockNext = ""; location.href = n; }
  }

  // ── 방 만들기 권한 받기: 이미 있으면 true, 없으면 허용 창 → 허용되면 true · 닫으면 false
  async function requestHost(o = {}) {
    if (state.canHost) return true;
    const p = new Promise(ok => hostWaiters.push(ok));
    showLockOverlay({ mode: "host", title: o.title || "" });
    if (!IS_LOCAL) {
      // 서버에는 이미 허용돼 있을 수 있음 (캐시가 지워진 기기 등) — 확인되면 창이 저절로 닫힘
      checkPermissionsAndWatch().catch(e => console.warn("Gate check error:", e));
    }
    return p;
  }

  // ── 허용 요청 줄 (관리 창 · 아케이드 첫 화면 목록이 같이 씀) — 원하는 기간 단추를 맨 앞·초록으로
  const REQ_DUR = [["day", 1, "⏳ 하루"], ["week", 7, "📅 1주"], ["month", 30, "🗓️ 1달"], ["always", 0, "♾️ 계속"]];
  const wantKey = w => (w === "today" ? "day" : REQ_DUR.some(d => d[0] === w) ? w : "always");
  function pendingReqs(val) {
    return Object.entries(val || {})
      .map(([uid, r]) => Object.assign({ uid }, r))
      .filter(r => r && r.status === "pending" && now() - (r.t || 0) < 7 * DAY)   // 일주일 넘은 요청은 안 보임 (비서와 같은 기준)
      .sort((a, b) => (b.t || 0) - (a.t || 0));
  }
  function fillReqList(listEl, pendings) {
    if (!pendings.length) { listEl.innerHTML = `<div class="bgate-meta">기다리는 요청이 없어요.</div>`; return; }
    listEl.innerHTML = pendings.map(r => {
      const w = wantKey(r.want);
      const durs = REQ_DUR.filter(d => d[0] === w).concat(REQ_DUR.filter(d => d[0] !== w));
      const btns = durs.map(([k, days, label], i) =>
        `<button class="bgate-btn ${i ? "ghost" : "green"} sm" data-days="${days}" data-uid="${esc(r.uid)}" data-name="${esc(r.name || "")}" data-ua="${esc(r.ua || "")}">${label}</button>`).join("");
      return `
        <div class="bgate-row">
          <div>
            <b>${esc(r.name || "이름없음")}</b> <span class="bgate-pill want">${REQ_DUR.find(d => d[0] === w)[2]} 원함</span>${r.bm ? ` <span class="bgate-pill active">💞 브릿지 회원</span>` : ""}
            ${r.note ? `<div style="font-size:12.5px;color:#e2e8f0;margin-top:2px">💬 ${esc(r.note)}</div>` : ""}
            <div class="bgate-meta">${esc(r.ua || "기기")} · ${esc(r.game || "portal")} · ${fmtTimeAgo(r.t)}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">${btns}
            <button class="bgate-btn ghost sm" data-rej="1" data-uid="${esc(r.uid)}" style="color:#fca5a5">🚫 거절</button>
          </div>
        </div>`;
    }).join("");
    listEl.querySelectorAll("button[data-uid]").forEach(b => {
      b.onclick = async () => {
        const { uid, name, ua, days, rej } = b.dataset;
        b.disabled = true;
        try {
          if (rej) await rejectRequest(uid);
          else await approveRequest(uid, { days: Number(days), name, ua });
        } catch (e) { b.disabled = false; alert("처리하지 못했어요: " + (e.message || e)); }
      };
    });
  }

  // 아케이드 첫 화면 '🔔 허용 요청' 목록 — 허용할 수 있는 사람(관리자·예전 가족 방장)만, 요청이 있을 때만 보임
  // el 안을 채우고 onCount(n) 로 개수를 알림. 돌려주는 함수 = 구독 끊기
  async function mountRequests(el, onCount) {
    injectStyle();
    await ensureFirebase();
    if (!(state.isAdmin || state.canApprove)) return () => {};
    const ref = db().ref("game_requests");
    const fn = snap => {
      const p = pendingReqs(snap.val());
      el.hidden = !p.length;
      if (p.length) {
        el.innerHTML = `<div class="bgate-sec" style="margin:0"><h4><span>🔔 허용 요청 ${p.length}건</span><span class="bgate-meta">누르면 바로 허용돼요</span></h4><div data-list></div></div>`;
        fillReqList(el.querySelector("[data-list]"), p);
      }
      if (onCount) onCount(p.length);
    };
    ref.on("value", fn, () => { el.hidden = true; });
    return () => ref.off("value", fn);
  }

  // 아케이드 첫 화면 '👥 방문자' (관리자만): 지금 · 오늘 · 7일 수와 오늘 온 사람 → 📊 자세히(logs.html)
  const GAME_KO = { portal: "아케이드", gostop: "고스톱", seotda: "섯다", onecard: "원카드", poker: "포커", baduk: "바둑", omok: "오목", chess: "체스", janggi: "장기", yut: "윷", billiards: "당구", volley: "배구", land: "땅따먹기", nyang: "냥도쿠", snake: "지렁이", cube: "큐브", sc: "스타" };
  async function mountVisitors(el) {
    injectStyle();
    await ensureFirebase();
    if (!state.isAdmin) return () => {};
    const ref = db().ref("game_presence"), MODE = { admin: "👑", allowed: "✅", bridge: "💞", guest: "👀" };
    let val = {};
    const draw = () => {
      const now = Date.now(), d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const all = Object.entries(val || {}).map(([uid, p]) => Object.assign({ uid }, p)).filter(p => p && p.t);
      const live = all.filter(p => now - p.t < 6 * 60000), today = all.filter(p => p.t >= d0.getTime()), week = all.filter(p => now - p.t < 7 * DAY);
      const rows = today.sort((a, b) => b.t - a.t).slice(0, 16).map(p =>
        `<span class="bgate-vis${now - p.t < 6 * 60000 ? " on" : ""}" title="${esc(p.ua || "")}">${MODE[p.mode] || "👀"} ${esc(p.name || "손님")} <small>${esc(GAME_KO[p.game] || p.game || "")} · ${fmtTimeAgo(p.t)}</small></span>`).join("");
      el.hidden = false;
      el.innerHTML = `<div class="bgate-sec" style="margin:0"><h4><span>👥 방문자 · 🟢 지금 ${live.length} · 오늘 ${today.length} · 7일 ${week.length}</span><a href="logs.html" style="color:#93c5fd;font-size:12.5px;text-decoration:none">📊 자세히 ›</a></h4>
        <div class="bgate-visl">${rows || '<span class="bgate-meta">오늘은 아직 아무도 안 왔어요.</span>'}</div>
        <div class="bgate-meta" style="margin-top:7px">👑 관리자 · ✅ 허용 · 💞 브릿지 회원 · 👀 둘러보기 · 🟢 테두리 = 지금 · 기기마다 한 줄 (10-31부터 모음)</div></div>`;
    };
    const fn = snap => { val = snap.val() || {}; draw(); };
    ref.on("value", fn, () => { el.hidden = true; });
    const iv = setInterval(draw, 60000);
    return () => { ref.off("value", fn); clearInterval(iv); };
  }

  // ── 포털 [👑 출입·기기 관리] 모달 ─────────────────────────────────
  let adminEl = null, adminSubs = [];
  function clearAdminSubs() {
    for (const [r, ev, fn] of adminSubs.splice(0)) {
      try { r.off(ev, fn); } catch (e) {}
    }
  }

  async function openAdminModal() {
    injectStyle();
    await ensureFirebase();
    if (!watching && !IS_LOCAL) { try { await checkPermissionsAndWatch(); } catch (e) {} }
    if (!adminEl) {
      adminEl = document.createElement("div");
      adminEl.className = "bgate-ov";
      adminEl.onclick = e => { if (e.target === adminEl) closeAdminModal(); };
      document.body.appendChild(adminEl);
    }
    adminEl.hidden = false;
    renderAdminModal();
  }

  function closeAdminModal() {
    clearAdminSubs();
    if (adminEl) adminEl.hidden = true;
  }

  function fmtTimeAgo(ts) {
    if (!ts) return "-";
    const diff = Math.max(0, Math.floor((now() - ts) / 1000));
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  function myPill() {
    if (state.isAdmin) return "👑 관리자(베니)";
    if (state.allowed) return state.expiresAt > 0 ? `⏳ 기간 허용 · ${leftTxt(state.expiresAt)}` : "♾️ 계속 허용된 기기";
    if (state.role === "bridge_free") return `💞 브릿지 회원 · 오늘 무료 ${Math.ceil(freeLeft(state.uid) / 60)}분 남음`;
    return "🔒 허용 안 된 기기";
  }

  function renderAdminModal() {
    clearAdminSubs();
    const canApprove = state.isAdmin || state.canApprove || IS_LOCAL;
    adminEl.innerHTML = `
      <div class="bgate-card wide" role="dialog" aria-modal="true">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="bgate-badge">👑 기기 허용 관리</div>
          <button class="bgate-btn ghost sm" id="bgAdmClose">✕ 닫기</button>
        </div>
        <h2 class="bgate-title">출입 · 기기 허용</h2>
        <p class="bgate-sub">둘러보기는 누구나, 게임은 <b>허용된 기기</b>만 (💞 베니브릿지 회원은 허용 전에도 하루 ${FREE_MIN}분). 허용된 기기는 친구 방도 만들 수 있어요. 친구는 방 링크로 등록 없이 그 방에만 들어와요.</p>

        <div class="bgate-sec">
          <h4><span>🙋 내 닉네임 · 이 기기</span> <span class="bgate-pill active">${myPill()}</span></h4>
          <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
            <b id="bgMyName" style="font-size:16px;color:#fde68a">${esc(profName() || state.name || lsGet(NAME_KEY) || "아직 없음")}</b>
            <button class="bgate-btn primary sm" id="bgProfile" style="padding:10px 14px">👤 닉네임·PIN 바꾸기</button>
          </div>
        </div>

        ${canApprove ? `
          <div class="bgate-sec">
            <h4><span>🔔 허용 요청</span> <span class="bgate-meta" id="bgReqCount">불러오는 중...</span></h4>
            <div id="bgReqList"><div class="bgate-meta">기다리는 요청이 없어요.</div></div>
          </div>

          <div class="bgate-sec">
            <h4><span>🔑 허용 코드 · 링크 만들기</span></h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
              <button class="bgate-btn green sm" data-mkpass="friend" style="padding:10px">♾️ 계속 허용 코드</button>
              <button class="bgate-btn primary sm" data-mkpass="temp24h" style="padding:10px">⏳ 오늘만 코드 (24시간)</button>
            </div>
            <div id="bgPassResult" hidden style="margin-top:10px;padding:12px;border-radius:10px;background:#090e15;border:1px solid #334155"></div>
          </div>

          <div class="bgate-sec">
            <h4><span>📱 허용된 기기</span> <span class="bgate-meta" id="bgDevCount">0대</span></h4>
            <div id="bgDevList"><div class="bgate-meta">기기를 불러오는 중...</div></div>
          </div>
        ` : state.allowed ? "" : `
          <div class="bgate-sec">
            <h4><span>🔑 허용 코드가 있나요?</span></h4>
            <div style="display:flex;gap:8px">
              <input class="bgate-inp code" id="bgModalCode" maxlength="6" placeholder="6자리 코드" style="flex:1">
              <button class="bgate-btn primary sm" id="bgModalRedeem" style="padding:11px 16px">등록</button>
            </div>
          </div>
          <div class="bgate-sec">
            <h4><span>📲 코드가 없으면</span></h4>
            <button class="bgate-btn green" id="bgModalReq">베니에게 허용 요청하기</button>
          </div>
        `}
        <div class="bgate-foot"><span>🖥️ 서버·통신 비용은 베니가 내고 있어요.</span><button type="button" class="bgate-coffee" data-coffee>☕ 커피 사 주기</button></div>
      </div>
    `;
    adminEl.querySelector("[data-coffee]").onclick = openCoffee;

    adminEl.querySelector("#bgAdmClose").onclick = closeAdminModal;
    // 👤 닉네임·PIN: 게임 공통 프로필(me.js) 창 — 없는 곳(아케이드 첫 화면)은 불러옴
    adminEl.querySelector("#bgProfile").onclick = async () => {
      try {
        await ensureFirebase();
        if (!window.GME && GATE_BASE) await loadScript(GATE_BASE + "me.js?v=12");
        if (!window.GME) throw new Error("프로필을 불러오지 못했어요");
        const m = GME.me ? await GME.manage(db()) : await GME.pick(db(), { canClose: true });
        if (m && m.name) { state.name = m.name; lsSet(NAME_KEY, m.name); notify(); }
        renderAdminModal();
      } catch (e) { alert(e.message || e); }
    };

    if (!canApprove) {
      const rBtn = adminEl.querySelector("#bgModalRedeem");
      if (rBtn) rBtn.onclick = async () => {
        try {
          await redeemPassCode(adminEl.querySelector("#bgModalCode").value, profName() || state.name);
          renderAdminModal();
        } catch (e) { alert(e.message); }
      };
      const qBtn = adminEl.querySelector("#bgModalReq");
      if (qBtn) qBtn.onclick = () => { closeAdminModal(); requestHost({}).then(ok => { if (ok) openAdminModal(); }); };
      return;
    }

    // 허용 코드 발급 버튼
    adminEl.querySelectorAll("[data-mkpass]").forEach(btn => {
      btn.onclick = async () => {
        const role = btn.dataset.mkpass;
        try {
          const res = await createPass({ role });
          const box = adminEl.querySelector("#bgPassResult");
          box.hidden = false;
          const roleLabel = role === "temp24h" ? "⏳ 오늘만 코드 (24시간)" : "♾️ 계속 허용 코드";
          box.innerHTML = `
            <div style="font-size:12.5px;color:#66c0f4;font-weight:700;margin-bottom:4px">${roleLabel} 만들었어요!</div>
            <div style="font-size:22px;font-weight:800;letter-spacing:5px;color:#fbbf24;margin:4px 0">${esc(res.code)}</div>
            <div style="font-size:11.5px;color:#94a3b8;word-break:break-all;margin-bottom:8px">${esc(res.url)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="bgate-btn primary sm" id="bgCopyLink">📋 링크 복사 (누르면 바로 허용)</button>
              <button class="bgate-btn ghost sm" id="bgCopyCode">📋 코드만 복사</button>
            </div>
          `;
          box.querySelector("#bgCopyLink").onclick = () => {
            navigator.clipboard.writeText(res.url).catch(() => {});
            box.querySelector("#bgCopyLink").textContent = "✅ 링크 복사됨!";
          };
          box.querySelector("#bgCopyCode").onclick = () => {
            navigator.clipboard.writeText(res.code).catch(() => {});
            box.querySelector("#bgCopyCode").textContent = "✅ 코드 복사됨!";
          };
        } catch (e) {
          alert("코드를 만들지 못했어요 (관리자 권한 필요): " + (e.message || e));
        }
      };
    });

    // 허용 요청 목록 구독 (아케이드 첫 화면 목록과 같은 줄)
    const reqRef = db().ref("game_requests");
    const onReq = snap => {
      const pendings = pendingReqs(snap.val());
      const cntEl = adminEl.querySelector("#bgReqCount");
      const listEl = adminEl.querySelector("#bgReqList");
      if (!cntEl || !listEl) return;
      cntEl.textContent = `${pendings.length}건`;
      fillReqList(listEl, pendings);
    };
    reqRef.on("value", onReq);
    adminSubs.push([reqRef, "value", onReq]);

    // 허용된 기기 목록 구독
    const devRef = db().ref("game_devices");
    const onDev = snap => {
      const val = snap.val() || {};
      const devs = Object.entries(val)
        .map(([uid, d]) => Object.assign({ uid }, d))
        .sort((a, b) => (b.lastSeen || b.t || 0) - (a.lastSeen || a.t || 0));
      const cntEl = adminEl.querySelector("#bgDevCount");
      const listEl = adminEl.querySelector("#bgDevList");
      if (!cntEl || !listEl) return;
      cntEl.textContent = `${devs.length}대`;
      if (!devs.length) {
        listEl.innerHTML = `<div class="bgate-meta">아직 허용된 기기가 없어요.</div>`;
        return;
      }
      listEl.innerHTML = devs.map(d => {
        const exp = Number(d.expiresAt || 0);
        const expired = exp > 0 && now() > exp;
        const st = expired ? "revoked" : (d.status || "active");
        const stLabel = expired ? "끝남" : st === "active" ? "허용" : st === "paused" ? "멈춤" : "차단";
        const expTxt = exp > 0 && !expired ? ` · ${leftTxt(exp)}` : "";
        return `
          <div class="bgate-row">
            <div>
              <b>${esc(d.name || "기기")}</b>
              <span class="bgate-pill ${st}">${stLabel}</span>
              <div class="bgate-meta">${durLabel(exp)}${expTxt} · ${esc(d.ua || "브라우저")} · 최근 ${fmtTimeAgo(d.lastSeen || d.t)}</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              ${st === "active"
                ? `<button class="bgate-btn ghost sm" data-dact="pause" data-uid="${esc(d.uid)}">⏸ 멈춤</button>`
                : `<button class="bgate-btn green sm" data-dact="resume" data-uid="${esc(d.uid)}">▶ 다시 허용 (계속)</button>`}
              ${st === "active" && exp > 0 ? `<button class="bgate-btn ghost sm" data-dact="always" data-uid="${esc(d.uid)}">♾️ 계속으로</button>` : ""}
              <button class="bgate-btn ghost sm" data-dact="24h" data-uid="${esc(d.uid)}">⏳ 오늘만</button>
              <button class="bgate-btn ghost sm" data-dact="revoke" data-uid="${esc(d.uid)}" style="color:#fca5a5">🗑 차단</button>
            </div>
          </div>
        `;
      }).join("");
      listEl.querySelectorAll("[data-dact]").forEach(b => {
        b.onclick = async () => {
          const { dact, uid } = b.dataset;
          if (dact === "pause") await updateDevice(uid, { status: "paused" });
          else if (dact === "resume" || dact === "always") await updateDevice(uid, { status: "active", role: "friend", expiresAt: 0 });
          else if (dact === "24h") await updateDevice(uid, { status: "active", role: "temp24h", expiresAt: now() + DAY });
          else if (dact === "revoke") await removeDevice(uid);
        };
      });
    };
    devRef.on("value", onDev);
    adminSubs.push([devRef, "value", onDev]);
  }

  function init() {
    if (IS_LOCAL || IS_ROOM_GUEST) {
      state.unlocked = true;
      state.status = "active";
      return;
    }
    const cached = readCachedPass();
    if (cached) {
      // 서버 확인 전까지는 마지막으로 알던 대로 (규칙이 진짜 판단)
      state.allowed = true;
      state.canHost = true;
      state.unlocked = true;
      state.role = cached.role || "friend";
      state.expiresAt = Number(cached.expiresAt || 0);
      state.status = "active";
      state.name = cached.name || state.name;
      state.isHost = true;
    } else if (!OPEN_SOLO) {
      const memUid = lsGet(MEMBER_KEY);
      if (memUid && freeLeft(memUid) > 0) {
        // 지난번 브릿지 회원 + 오늘 무료 시간 남음 → 서버 확인 전까지 열어 둠 (확인되면 그대로 또는 로그인 창)
        Object.assign(state, { unlocked: true, isMember: true, uid: memUid, role: "bridge_free", freeLeft: freeLeft(memUid) });
      } else if (!IS_PORTAL) {
        // 게임 화면: 허용된 기기가 아니면 바로 로그인 창을 띄우고 Firebase 확인 (아케이드 첫 화면은 둘러보기라 안 띄움)
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => { if (!state.unlocked) showLockOverlay({ mode: "lock" }); });
        } else {
          showLockOverlay({ mode: "lock" });
        }
      }
    } else {
      state.status = "open";
    }
    // OPEN_SOLO 면 꼭 필요할 때만 서버 확인 (허용 코드 링크 · 허용됐던 기기 · 포털 · 관리자)
    const urlPass = qs.get("pass") || qs.get("host_invite");
    if (!OPEN_SOLO || cached || urlPass || IS_PORTAL || lsGet("game.gate.admin") === "1") {
      checkPermissionsAndWatch().catch(e => console.warn("Gate init error:", e));
    }
  }

  init();

  const api = {
    get state() { return state; },
    OPEN_SOLO,
    onChange(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    // 관리 권한 한 곳: 관리자 또는 허용된 기기 (오늘만이면 아직 안 끝났을 때만)
    canManage() {
      if (state.isAdmin || (IS_LOCAL && state.canHost)) return true;
      if (!state.canHost) return false;
      return !(state.expiresAt > 0 && now() > state.expiresAt);
    },
    requestHost,
    FREE_MIN,
    // 아케이드에서 로그인 창 (next = 허용되면/무료로 하기 누르면 갈 주소)
    showLogin(o = {}) { showLockOverlay({ mode: "login", next: o.next || "" }); },
    adminLoginPrompt,
    openCoffee,
    openAdminModal,
    closeAdminModal,
    mountRequests,
    mountVisitors,
    createPass,
    redeemPassCode,
    requestDeviceApproval,
    loginAdminWithPassword,
    approveRequest,
    rejectRequest,
    updateDevice,
    removeDevice,
  };
  // 시험 전용 (?mock): 서버 없이 '허용됨'을 흉내
  if (IS_MOCK && IS_LOCAL) api._mockAllow = (hours = 0) => applyAllowed(roleOf(hours), hours ? Date.now() + hours * 3600000 : 0, state.name || "시험");
  return api;
})();
window.Gate = Gate;
