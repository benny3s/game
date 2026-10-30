/* 베니 프라이빗 게임 포털 — 출입 게이트 & 기기 허용 관리 (common/gate.js)
   · OPEN_SOLO(아래, 기본 true): 혼자 하기는 누구나 바로. 잠금 화면은 '친구 방 만들기'를 누른 허용 안 된 기기에만 떠요
     (false 면 예전처럼 허용 안 된 기기는 모든 게임 페이지가 잠김)
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

  let app = null, loading = null, user = null, offset = 0, watching = false, legacyHost = false;
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
    isHost: false,          // 예전 이름 — 지금은 canHost 와 같음
    expiresAt: 0,
    uid: "",
  };
  const listeners = new Set();
  const notify = () => { state.isHost = state.canHost; for (const fn of listeners) { try { fn(state); } catch (e) {} } };

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
      user = await new Promise(ok => {
        const t = setTimeout(() => ok(null), 7000);
        const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); });
      });
      if (!user) user = (await app.auth().signInAnonymously()).user;
      state.uid = user.uid;
      app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
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
  const durLabel = exp => (exp > 0 ? "⏳ 오늘만" : "♾️ 계속");
  const leftHours = exp => Math.max(1, Math.ceil((exp - now()) / 3600000));

  // ── 허용됨 / 허용 안 됨 상태 반영
  let presenceOn = false;
  function startPresence() {
    if (presenceOn || IS_LOCAL || !user) return;
    presenceOn = true;
    try {
      const ref = db().ref("game_presence/" + user.uid);
      const put = () => ref.set({ name: String(state.name || "?").slice(0, 16), game: detectGameId().slice(0, 20), t: TS(), ua: detectDeviceName().slice(0, 60) }).catch(() => {});
      ref.onDisconnect().remove().then(put, put);
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
    state.unlocked = SOLO_OPEN || state.canHost;
    state.status = status;
    state.reason = reason || "";
    writeCachedPass(null);
    if (!state.unlocked) showLockOverlay({ mode: "lock" });
    notify();
  }

  async function checkPermissionsAndWatch() {
    await ensureFirebase();
    try {
      const tr = await user.getIdTokenResult();
      state.isAdmin = !!(tr && tr.claims && tr.claims.admin === 1);
    } catch (e) { state.isAdmin = false; }
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
    db().ref("game_devices/" + user.uid).on("value", snap => {
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

  async function approveRequest(targetUid, { role = "friend", name = "친구", ua = "" } = {}) {
    await ensureFirebase();
    if (role !== "temp24h") role = "friend";
    const expiresAt = role === "temp24h" ? now() + DAY : 0;
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
        font: 600 12.5px/1.2 inherit; padding: 9px 6px; border-radius: 7px; cursor: pointer;
      }
      .bgate-tab.active { background: #243b55; color: #fff; }
      .bgate-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      .bgate-field label, .bgate-field .lb { font-size: 12.5px; font-weight: 600; color: #cbd5e1; }
      .bgate-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .bgate-seg button {
        border: 1px solid #334155; background: #0c131d; color: #cbd5e1; border-radius: 10px;
        padding: 10px 8px; font: 700 13.5px/1.2 inherit; cursor: pointer;
      }
      .bgate-seg button.on { border-color: #66c0f4; background: #17304a; color: #fff; }
      .bgate-seg small { display: block; font-weight: 500; font-size: 11px; color: #94a3b8; margin-top: 2px; }
      .bgate-inp {
        width: 100%; box-sizing: border-box;
        padding: 11px 13px; border-radius: 10px;
        border: 1px solid #334155; background: #0c131d; color: #fff;
        font: 600 15px/1.2 inherit; outline: none;
      }
      .bgate-inp:focus { border-color: #66c0f4; }
      .bgate-inp.code { text-align: center; letter-spacing: 5px; text-transform: uppercase; font-size: 18px; }
      .bgate-btn {
        width: 100%; border: 0; border-radius: 10px; padding: 12px 16px;
        font: 700 14.5px/1.2 inherit; cursor: pointer;
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
      .bgate-more button { border: 0; background: none; color: #94a3b8; font: 600 12.5px inherit; text-decoration: underline; cursor: pointer; padding: 4px; }
      .bgate-wait {
        margin-top: 12px; padding: 14px; border-radius: 12px;
        background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.35);
        color: #a7f3d0; font-size: 13px; line-height: 1.55; text-align: center;
      }
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
    `;
    document.head.appendChild(s);
  }

  // ── 허용 창 (mode "lock" = 게임 잠금 · "host" = 방 만들기 권한 받기, 닫을 수 있음) ─────
  let lockEl = null, lockMode = "lock", hostWaiters = [];
  const settleHost = ok => { const w = hostWaiters.splice(0); for (const f of w) { try { f(ok); } catch (e) {} } };
  function showLockOverlay({ mode = "lock", title = "" } = {}) {
    injectStyle();
    if (lockEl && !lockEl.hidden && lockMode === "lock" && mode === "host") mode = "lock";
    lockMode = mode;
    if (!lockEl) {
      lockEl = document.createElement("div");
      lockEl.id = "bennyGateOverlay";
      lockEl.className = "bgate-ov";
      document.body.appendChild(lockEl);
    }
    let curTab = "req", want = "week";
    const isHostMode = mode === "host";
    const render = () => {
      lockEl.innerHTML = `
        <div class="bgate-card" role="dialog" aria-modal="true" aria-label="기기 허용">
          ${isHostMode ? `<button class="bgate-x" data-close aria-label="닫기">✕</button>` : ""}
          <div class="bgate-badge">${isHostMode ? "🏠 친구 방 만들기" : "🔒 베니 게임 라운지"}</div>
          <h2 class="bgate-title">${isHostMode ? "이 기기를 허용받으면 방을 만들 수 있어요" : "기기를 허용받아 주세요"}</h2>
          <p class="bgate-sub">${isHostMode
            ? `허용된 기기는 <b>혼자 하기</b>와 <b>친구 방 만들기</b>를 다 할 수 있어요.${title ? ` (${esc(title)})` : ""}`
            : `가족·지인 전용이에요. 한 번 허용받으면 이 기기에서 바로 열려요.`}</p>
          ${state.reason ? `<div class="bgate-warn">${esc(state.reason)}</div>` : ""}
          ${isHostMode ? `<div class="bgate-alt"><span>같이 하기만 할 거면 <b style="color:#e2e8f0">허용이 필요 없어요.</b><br>방장이 보낸 <b style="color:#e2e8f0">방 링크</b>를 누르거나 방 목록에서 들어가세요.</span><button class="bgate-btn ghost" data-close>👍 그냥 들어갈게요</button></div>` : ""}
          ${isHostMode && curTab === "req" ? "" : `<div class="bgate-tabs">
            <button class="bgate-tab ${curTab === "req" ? "active" : ""}" data-tab="req">📲 허용 요청</button>
            <button class="bgate-tab ${curTab === "code" ? "active" : ""}" data-tab="code">🔑 허용 코드</button>
            <button class="bgate-tab ${curTab === "admin" ? "active" : ""}" data-tab="admin">👑 관리자</button>
          </div>`}
          <div id="bgateTabBody"></div>
          ${isHostMode && curTab === "req" ? `<div class="bgate-more"><button type="button" data-tab="code">🔑 허용 코드가 있어요</button><button type="button" data-tab="admin">👑 관리자</button></div>` : ""}
        </div>
      `;
      lockEl.querySelectorAll(".bgate-tab, .bgate-more [data-tab]").forEach(b => {
        b.onclick = () => { curTab = b.dataset.tab; render(); };
      });
      lockEl.querySelectorAll("[data-close]").forEach(b => { b.onclick = () => hideLockOverlay(false); });
      const body = lockEl.querySelector("#bgateTabBody");
      if (curTab === "req") {
        body.innerHTML = `
          <div class="bgate-field">
            <label for="bgReqName">이름 (베니 님 폰 알림에 보여요)</label>
            <input class="bgate-inp" id="bgReqName" maxlength="12" placeholder="예: 철수, 처남, 민수" value="${esc(state.name)}">
          </div>
          <div class="bgate-field">
            <label for="bgReqNote">한마디 (선택)</label>
            <input class="bgate-inp" id="bgReqNote" maxlength="60" placeholder="예: 금요일 고스톱 같이 쳐요">
          </div>
          <div class="bgate-field">
            <span class="lb">얼마나 쓸까요?</span>
            <div class="bgate-seg">
              ${[["day", "⏳ 하루", "24시간"], ["week", "📅 1주", "7일"], ["month", "🗓️ 1달", "30일"], ["always", "♾️ 계속", "기한 없이"]].map(([k, t, sm]) => `<button type="button" data-want="${k}" class="${want === k ? "on" : ""}">${t}<small>${sm}</small></button>`).join("")}
            </div>
          </div>
          <button class="bgate-btn green" id="bgReqBtn">📲 베니에게 허용 요청</button>
          <div id="bgReqWait" hidden class="bgate-wait"></div>
        `;
        body.querySelectorAll("[data-want]").forEach(b => {
          b.onclick = () => { want = b.dataset.want; body.querySelectorAll("[data-want]").forEach(x => x.classList.toggle("on", x === b)); };
        });
        const nameInp = body.querySelector("#bgReqName");
        const reqBtn = body.querySelector("#bgReqBtn");
        const waitBox = body.querySelector("#bgReqWait");
        reqBtn.onclick = async () => {
          const nm = nameInp.value.trim();
          if (!nm) { nameInp.focus(); return; }
          reqBtn.disabled = true;
          reqBtn.textContent = "보내는 중...";
          try {
            await requestDeviceApproval(nm, (st) => {
              waitBox.hidden = false;
              if (st === "pending") {
                waitBox.innerHTML = `<b>📡 요청을 보냈어요!</b><br>베니 님이 허용하면 이 화면이 바로 열려요.`;
                reqBtn.textContent = "⏳ 허용 기다리는 중";
              } else if (st === "rejected") {
                waitBox.innerHTML = `😿 이번에는 허용되지 않았어요.`;
                reqBtn.disabled = false;
                reqBtn.textContent = "다시 요청하기";
              }
            }, want, body.querySelector("#bgReqNote").value);
          } catch (e) {
            alert(e.message || "요청을 보내지 못했어요.");
            reqBtn.disabled = false;
            reqBtn.textContent = "📲 베니에게 허용 요청";
          }
        };
      } else if (curTab === "code") {
        body.innerHTML = `
          <div class="bgate-field">
            <label for="bgCodeName">내 이름 / 별명</label>
            <input class="bgate-inp" id="bgCodeName" maxlength="12" placeholder="예: 철수, 와이프" value="${esc(state.name)}">
          </div>
          <div class="bgate-field">
            <label for="bgCodeVal">6자리 허용 코드</label>
            <input class="bgate-inp code" id="bgCodeVal" maxlength="6" placeholder="ABCDEF" autocomplete="off" autocapitalize="characters" spellcheck="false">
          </div>
          <button class="bgate-btn primary" id="bgCodeBtn">🔓 코드로 허용받기</button>
          <p class="bgate-hint">코드에 따라 오늘만(24시간) 또는 계속 허용돼요.</p>
        `;
        const nameInp = body.querySelector("#bgCodeName");
        const codeInp = body.querySelector("#bgCodeVal");
        const codeBtn = body.querySelector("#bgCodeBtn");
        codeBtn.onclick = async () => {
          codeBtn.disabled = true;
          try {
            await redeemPassCode(codeInp.value, nameInp.value);
          } catch (e) {
            alert(e.message || "코드를 확인하지 못했어요.");
            codeBtn.disabled = false;
          }
        };
      } else {
        body.innerHTML = `
          <div class="bgate-field">
            <label for="bgAdminPw">관리자 비밀번호 (베니 님 전용)</label>
            <input class="bgate-inp" type="password" id="bgAdminPw" placeholder="비밀번호" autocomplete="current-password">
          </div>
          <button class="bgate-btn primary" id="bgAdminBtn">👑 관리자로 들어가기</button>
        `;
        const pwInp = body.querySelector("#bgAdminPw");
        const admBtn = body.querySelector("#bgAdminBtn");
        admBtn.onclick = async () => {
          admBtn.disabled = true;
          try {
            await loginAdminWithPassword(pwInp.value);
          } catch (e) {
            alert(e.message || "관리자 비밀번호가 맞지 않아요.");
            admBtn.disabled = false;
          }
        };
      }
    };
    render();
    lockEl.hidden = false;
  }

  // ok: true = 허용됨, false = 닫음 (방 만들기 기다리는 쪽에 알려 줌)
  function hideLockOverlay(ok) {
    if (lockEl) lockEl.hidden = true;
    settleHost(ok === true || state.canHost);
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
    if (state.allowed) return state.expiresAt > 0 ? `⏳ 오늘만 허용 · ${leftHours(state.expiresAt)}시간 남음` : "♾️ 계속 허용된 기기";
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
        <p class="bgate-sub">혼자 하기는 누구나 돼요. <b>허용된 기기</b>는 친구 방도 만들 수 있어요. 친구는 방 링크로 등록 없이 그 방에만 들어와요.</p>

        <div class="bgate-sec">
          <h4><span>🙋 내 이름 · 이 기기</span> <span class="bgate-pill active">${myPill()}</span></h4>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="bgate-inp" id="bgMyName" maxlength="12" placeholder="온라인 대결 이름" value="${esc(state.name || lsGet(NAME_KEY) || "베니")}" style="flex:1">
            <button class="bgate-btn primary sm" id="bgSaveMyName" style="padding:11px 14px">이름 저장</button>
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
        ` : `
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
          <div class="bgate-sec">
            <h4><span>👑 관리자 로그인 (베니 님)</span></h4>
            <div style="display:flex;gap:8px">
              <input class="bgate-inp" type="password" id="bgModalAdminPw" placeholder="관리자 비밀번호" style="flex:1">
              <button class="bgate-btn ghost sm" id="bgModalAdminBtn" style="padding:11px 16px">인증</button>
            </div>
          </div>
        `}
      </div>
    `;

    adminEl.querySelector("#bgAdmClose").onclick = closeAdminModal;
    adminEl.querySelector("#bgSaveMyName").onclick = () => {
      const v = adminEl.querySelector("#bgMyName").value.trim().slice(0, 12);
      if (v) {
        lsSet(NAME_KEY, v);
        state.name = v;
        notify();
        alert(`이름을 '${v}'(으)로 저장했어요.`);
      }
    };

    if (!canApprove) {
      const rBtn = adminEl.querySelector("#bgModalRedeem");
      if (rBtn) rBtn.onclick = async () => {
        try {
          await redeemPassCode(adminEl.querySelector("#bgModalCode").value, adminEl.querySelector("#bgMyName").value);
          renderAdminModal();
        } catch (e) { alert(e.message); }
      };
      const qBtn = adminEl.querySelector("#bgModalReq");
      if (qBtn) qBtn.onclick = () => { closeAdminModal(); requestHost({}).then(ok => { if (ok) openAdminModal(); }); };
      const aBtn = adminEl.querySelector("#bgModalAdminBtn");
      if (aBtn) aBtn.onclick = async () => {
        try {
          await loginAdminWithPassword(adminEl.querySelector("#bgModalAdminPw").value);
          renderAdminModal();
        } catch (e) { alert(e.message); }
      };
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

    // 허용 요청 목록 구독
    const reqRef = db().ref("game_requests");
    const onReq = snap => {
      const val = snap.val() || {};
      const pendings = Object.entries(val)
        .map(([uid, r]) => Object.assign({ uid }, r))
        .filter(r => r.status === "pending")
        .sort((a, b) => (b.t || 0) - (a.t || 0));
      const cntEl = adminEl.querySelector("#bgReqCount");
      const listEl = adminEl.querySelector("#bgReqList");
      if (!cntEl || !listEl) return;
      cntEl.textContent = `${pendings.length}건`;
      if (!pendings.length) {
        listEl.innerHTML = `<div class="bgate-meta">기다리는 요청이 없어요.</div>`;
        return;
      }
      listEl.innerHTML = pendings.map(r => `
        <div class="bgate-row">
          <div>
            <b>${esc(r.name || "이름없음")}</b> ${r.want ? `<span class="bgate-pill want">${r.want === "today" ? "⏳ 오늘만 원함" : "♾️ 계속 원함"}</span>` : ""}
            <div class="bgate-meta">${esc(r.ua || "기기")} · ${esc(r.game || "portal")} · ${fmtTimeAgo(r.t)}</div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="bgate-btn green sm" data-act="app-friend" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" data-ua="${esc(r.ua)}">♾️ 계속</button>
            <button class="bgate-btn primary sm" data-act="app-24h" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" data-ua="${esc(r.ua)}">⏳ 오늘만</button>
            <button class="bgate-btn ghost sm" data-act="app-rej" data-uid="${esc(r.uid)}">🚫 거절</button>
          </div>
        </div>
      `).join("");
      listEl.querySelectorAll("[data-act]").forEach(b => {
        b.onclick = async () => {
          const { act, uid, name, ua } = b.dataset;
          if (act === "app-rej") await rejectRequest(uid);
          else if (act === "app-24h") await approveRequest(uid, { role: "temp24h", name, ua });
          else await approveRequest(uid, { role: "friend", name, ua });
        };
      });
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
        const expTxt = exp > 0 && !expired ? ` · ${leftHours(exp)}시간 남음` : "";
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
      // 허용된 기기가 아니면 바로 잠금 화면을 띄우고 Firebase 확인
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { if (!state.unlocked) showLockOverlay({ mode: "lock" }); });
      } else {
        showLockOverlay({ mode: "lock" });
      }
    } else {
      state.status = "open";
    }
    // OPEN_SOLO 면 꼭 필요할 때만 서버 확인 (허용 코드 링크 · 허용됐던 기기 · 포털 · 관리자)
    const urlPass = qs.get("pass") || qs.get("host_invite");
    const isPortal = /\/game\/(?:index\.html)?$/.test(location.pathname);
    if (!OPEN_SOLO || cached || urlPass || isPortal || lsGet("game.gate.admin") === "1") {
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
    openAdminModal,
    closeAdminModal,
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
