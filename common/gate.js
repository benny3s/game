/* 베니 프라이빗 게임 포털 — 출입 게이트 & 기기 등록 관리 (common/gate.js)
   · 비공개 지인/가족 전용 라운지 보호 (외부인 무단 솔로 플레이·랭킹 오염·심의 이슈 원천 차단)
   · 3가지 입장 경로:
     1) 베니비서 앱 실시간 기기 승인 요청 (game_requests/{uid} → 폰 비서 알림 카드 [허용] 탭 즉시 자동 잠금 해제)
     2) 6자리 초대 패스 코드 / 링크 (?pass=XXXXXX → 영구 지인 기기 / 24시간 손님 / 가족 방장 등록)
     3) 활성 방 초대 링크 (?room=ABCD → 해당 대결 방 참가 세션 임시 허용)
   · 한 번 등록된 기기(game_devices/{uid})는 쿠키/로컬 토큰과 연동되어 영구 프리패스되며,
     베니 님이 언제든 [일시정지(paused)] · [시간제한(expiresAt)] · [해제(revoked)] 가능 */
const Gate = (() => {
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
  const qs = new URLSearchParams(location.search);
  const FORCE_GATE = qs.get("gate") === "1";
  const IS_LOCAL = !FORCE_GATE && (
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost" ||
    location.protocol === "file:" ||
    qs.has("guest") ||
    qs.has("mock")
  );
  // ?room=ABCD (4자리 방 코드)로 초대받아 들어온 손님은 해당 방 세션 동안 임시 허용
  const roomParam = (qs.get("room") || "").trim().toUpperCase();
  const IS_ROOM_GUEST = !FORCE_GATE && /^[A-Z0-9]{4}$/.test(roomParam) && roomParam !== "HOST";

  let app = null, loading = null, user = null, offset = 0;
  let state = {
    unlocked: IS_LOCAL || IS_ROOM_GUEST,
    role: IS_LOCAL ? "local" : IS_ROOM_GUEST ? "room_guest" : "none",
    status: "checking",
    reason: "",
    name: localStorage.getItem(NAME_KEY) || "",
    isAdmin: false,
    isHost: false,
    expiresAt: 0,
    uid: "",
  };
  const listeners = new Set();
  const notify = () => { for (const fn of listeners) { try { fn(state); } catch (e) {} } };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const loadScript = src => new Promise((ok, bad) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = bad;
    document.head.appendChild(s);
  });

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

  async function checkPermissionsAndWatch() {
    await ensureFirebase();
    try {
      const tr = await user.getIdTokenResult();
      state.isAdmin = !!(tr && tr.claims && tr.claims.admin === 1);
    } catch (e) { state.isAdmin = false; }

    if (state.isAdmin) {
      state.isHost = true;
      state.unlocked = true;
      state.role = "admin";
      state.status = "active";
      writeCachedPass({ uid: user.uid, role: "admin", status: "active", expiresAt: 0 });
      hideLockOverlay();
      notify();
      return;
    }

    // 가족 호스트 여부 확인
    try {
      const hSnap = await db().ref("arena_hosts/" + user.uid + "/ok").get();
      if (hSnap.val() === true) {
        state.isHost = true;
        state.unlocked = true;
        state.role = "host";
        state.status = "active";
        writeCachedPass({ uid: user.uid, role: "host", status: "active", expiresAt: 0 });
        hideLockOverlay();
        notify();
      }
    } catch (e) {}

    // URL에 ?pass=XXXXXX 또는 ?host_invite=XXXXXX 가 있으면 자동 등록 시도
    const urlPass = (qs.get("pass") || qs.get("host_invite") || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (urlPass.length === 6) {
      try {
        await redeemPassCode(urlPass, state.name || "초대손님");
        const cleanUrl = new URL(location.href);
        cleanUrl.searchParams.delete("pass");
        history.replaceState(null, "", cleanUrl.toString());
      } catch (e) {
        console.warn("패스 자동 등록 실패:", e);
      }
    }

    // 내 기기 상태 실시간 감시 (베니 님이 승인하거나 일시정지/차단하면 즉시 반영)
    db().ref("game_devices/" + user.uid).on("value", snap => {
      const d = snap.val();
      if (state.isAdmin || state.isHost) return;
      if (d && typeof d === "object") {
        const exp = Number(d.expiresAt || 0);
        const expired = exp > 0 && now() > exp;
        state.name = d.name || state.name;
        state.expiresAt = exp;
        state.role = d.role || "friend";
        if (d.role === "host") state.isHost = true;
        if (d.status === "active" && !expired) {
          state.unlocked = true;
          state.status = "active";
          state.reason = "";
          writeCachedPass({ uid: user.uid, role: state.role, status: "active", expiresAt: exp, name: state.name });
          hideLockOverlay();
          // 최근 접속 시각 갱신 (조용히)
          db().ref("game_devices/" + user.uid + "/lastSeen").set(TS()).catch(() => {});
        } else {
          state.unlocked = IS_LOCAL || IS_ROOM_GUEST;
          state.status = expired ? "expired" : (d.status || "revoked");
          state.reason = expired
            ? "⏰ 시간제 손님 이용권(24시간)이 만료되었어요. 베니 님에게 연장을 요청해 주세요."
            : d.status === "paused"
            ? "⏸ 베니 님이 이 기기의 이용을 잠시 일시정지했어요."
            : "🚫 기기 등록이 해제되었어요.";
          writeCachedPass(null);
          if (!state.unlocked) showLockOverlay();
        }
      } else {
        // 등록된 기기 정보가 없음
        writeCachedPass(null);
        if (!state.isAdmin && !state.isHost && !IS_LOCAL && !IS_ROOM_GUEST) {
          state.unlocked = false;
          state.status = "unregistered";
          showLockOverlay();
        }
      }
      notify();
    });
  }

  // ── 1) 6자리 패스 코드로 기기 등록 ──────────────────────────────
  async function redeemPassCode(rawCode, rawName) {
    await ensureFirebase();
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) throw new Error("6자리 초대 코드를 정확히 입력해 주세요.");
    const name = String(rawName || state.name || "친구").trim().slice(0, 12) || "친구";
    localStorage.setItem(NAME_KEY, name);
    state.name = name;

    // game_passes/{code} 먼저 확인, 없으면 arena_invites/{code} 확인
    const pSnap = await db().ref("game_passes/" + code).get();
    let role = "friend", durationHours = 0;
    if (pSnap.exists()) {
      const p = pSnap.val() || {};
      if (p.revoked) throw new Error("이미 취소된 초대 코드입니다.");
      role = p.role || "friend";
      durationHours = Number(p.hours || (role === "temp24h" ? 24 : 0));
    } else {
      const hSnap = await db().ref("arena_invites/" + code).get();
      if (!hSnap.exists()) throw new Error("유효하지 않거나 만료된 초대 코드입니다.");
      role = "host";
    }

    const expiresAt = durationHours > 0 ? now() + durationHours * 3600 * 1000 : 0;
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
    if (role === "host") {
      await db().ref("arena_hosts/" + user.uid).set({ ok: true, token: code, name, t: TS() });
      try { localStorage.setItem("game.arena.host_ok", user.uid); } catch (e) {}
      state.isHost = true;
    }
    state.unlocked = true;
    state.role = role;
    state.status = "active";
    state.expiresAt = expiresAt;
    writeCachedPass({ uid: user.uid, role, status: "active", expiresAt, name });
    hideLockOverlay();
    notify();
    return { role, expiresAt, name };
  }

  // ── 2) 베니비서 앱으로 실시간 기기 등록 승인 요청 보내기 ────────────
  async function requestDeviceApproval(rawName, onStatus) {
    await ensureFirebase();
    const name = String(rawName || "").trim().slice(0, 12);
    if (!name) throw new Error("베니 님이 알아볼 수 있게 이름이나 별명을 입력해 주세요.");
    localStorage.setItem(NAME_KEY, name);
    state.name = name;

    const payload = {
      uid: user.uid,
      name,
      ua: detectDeviceName(),
      game: detectGameId(),
      status: "pending",
      t: TS(),
    };
    await db().ref("game_requests/" + user.uid).set(payload);
    if (onStatus) onStatus("pending");

    db().ref("game_requests/" + user.uid).on("value", snap => {
      const r = snap.val();
      if (!r) return;
      if (onStatus) onStatus(r.status || "pending", r);
    });
    return payload;
  }

  // ── 3) 관리자 비밀번호 로그인 (Cloud Function adminLogin 연동) ─────
  async function loginAdminWithPassword(password) {
    await ensureFirebase();
    if (!firebase.functions) {
      await loadScript(SDK + "firebase-functions-compat.js");
    }
    const res = await app.functions("asia-northeast3").httpsCallable("adminLogin")({ password: String(password || "") });
    if (!res || !res.data || !res.data.token) throw new Error("관리자 인증에 실패했습니다.");
    user = (await app.auth().signInWithCustomToken(res.data.token)).user;
    await user.getIdToken(true);
    state.uid = user.uid;
    state.isAdmin = true;
    state.isHost = true;
    state.unlocked = true;
    state.role = "admin";
    state.status = "active";
    writeCachedPass({ uid: user.uid, role: "admin", status: "active", expiresAt: 0 });
    hideLockOverlay();
    notify();
    return true;
  }

  // ── 4) 관리자/방장용 패스 발급 & 기기 제어 API ────────────────────
  async function createPass({ role = "friend", label = "" } = {}) {
    await ensureFirebase();
    const code = genCode6();
    const hours = role === "temp24h" ? 24 : 0;
    const item = {
      code,
      role,
      hours,
      label: String(label || (role === "host" ? "가족 방장" : role === "temp24h" ? "24시간 손님" : "지인 기기")).slice(0, 20),
      by: user.uid,
      t: TS(),
    };
    await db().ref("game_passes/" + code).set(item);
    if (role === "host") {
      await db().ref("arena_invites/" + code).set({ by: user.uid, t: TS() });
    }
    const u = new URL(location.origin + "/game/");
    u.searchParams.set("pass", code);
    return { code, role, hours, url: u.toString() };
  }

  async function approveRequest(targetUid, { role = "friend", name = "친구", ua = "" } = {}) {
    await ensureFirebase();
    const hours = role === "temp24h" ? 24 : 0;
    const expiresAt = hours > 0 ? now() + hours * 3600 * 1000 : 0;
    await db().ref("game_devices/" + targetUid).set({
      name: String(name || "친구").slice(0, 12),
      role,
      status: "active",
      expiresAt,
      ua: String(ua || "등록 기기").slice(0, 24),
      t: TS(),
      lastSeen: TS(),
    });
    if (role === "host") {
      await db().ref("arena_hosts/" + targetUid).set({ ok: true, token: "ADMIN", name: String(name || "가족").slice(0, 12), t: TS() });
    }
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
        width: min(460px, 100%);
        max-height: 92dvh; overflow-y: auto;
        background: linear-gradient(165deg, #1b2838 0%, #111924 100%);
        border: 1px solid rgba(102,192,244,0.28);
        border-radius: 18px;
        padding: 24px 22px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.75);
      }
      .bgate-card.wide { width: min(640px, 100%); }
      .bgate-badge {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-weight: 700; color: #66c0f4;
        background: rgba(102,192,244,0.12);
        border: 1px solid rgba(102,192,244,0.3);
        padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
      }
      .bgate-title { margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
      .bgate-sub { margin: 0 0 16px; font-size: 13.5px; color: #94a3b8; line-height: 1.55; }
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
      .bgate-field label { font-size: 12.5px; font-weight: 600; color: #cbd5e1; }
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
      .bgate-btn.primary { background: linear-gradient(90deg, #3b82f6, #2563eb); color: #fff; }
      .bgate-btn.green { background: linear-gradient(90deg, #10b981, #059669); color: #fff; }
      .bgate-btn.ghost { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
      .bgate-btn.sm { width: auto; padding: 6px 10px; font-size: 12px; border-radius: 7px; }
      .bgate-wait {
        margin-top: 12px; padding: 14px; border-radius: 12px;
        background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.35);
        color: #a7f3d0; font-size: 13px; line-height: 1.55; text-align: center;
      }
      .bgate-sec {
        background: rgba(12,19,29,0.75); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 14px; margin-bottom: 14px;
      }
      .bgate-sec h4 { margin: 0 0 10px; font-size: 14px; color: #66c0f4; display: flex; align-items: center; justify-content: space-between; }
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
    `;
    document.head.appendChild(s);
  }

  // ── 잠금 화면 오버레이 ───────────────────────────────────────────
  let lockEl = null;
  function showLockOverlay() {
    injectStyle();
    if (!lockEl) {
      lockEl = document.createElement("div");
      lockEl.id = "bennyGateOverlay";
      lockEl.className = "bgate-ov";
      document.body.appendChild(lockEl);
    }
    let curTab = "req";
    const render = () => {
      lockEl.innerHTML = `
        <div class="bgate-card" role="dialog" aria-modal="true" aria-label="베니 프라이빗 게임 라운지">
          <div class="bgate-badge">🔒 PRIVATE FAMILY &amp; FRIENDS LOUNGE</div>
          <h2 class="bgate-title">베니 프라이빗 게임 포털</h2>
          <p class="bgate-sub">이곳은 베니 님과 가족·초대받은 지인만 입장할 수 있는 비공개 게임 공간입니다. <b>한 번만 기기를 등록</b>하면 다음부터는 별도 입력 없이 모든 게임을 자유롭게 즐길 수 있어요!</p>
          ${state.reason ? `<div class="bgate-warn">${esc(state.reason)}</div>` : ""}
          <div class="bgate-tabs">
            <button class="bgate-tab ${curTab === "req" ? "active" : ""}" data-tab="req">📲 승인 요청</button>
            <button class="bgate-tab ${curTab === "code" ? "active" : ""}" data-tab="code">🔑 패스 코드</button>
            <button class="bgate-tab ${curTab === "admin" ? "active" : ""}" data-tab="admin">👑 관리자</button>
          </div>
          <div id="bgateTabBody"></div>
        </div>
      `;
      lockEl.querySelectorAll(".bgate-tab").forEach(b => {
        b.onclick = () => { curTab = b.dataset.tab; render(); };
      });
      const body = lockEl.querySelector("#bgateTabBody");
      if (curTab === "req") {
        body.innerHTML = `
          <div class="bgate-field">
            <label>내 이름 / 별명 (베니비서 앱 알림에 표시됩니다)</label>
            <input class="bgate-inp" id="bgReqName" maxlength="12" placeholder="예: 철수, 처남, 민수" value="${esc(state.name)}">
          </div>
          <button class="bgate-btn green" id="bgReqBtn">📲 베니에게 기기 등록 요청 보내기</button>
          <div id="bgReqWait" hidden class="bgate-wait"></div>
        `;
        const nameInp = body.querySelector("#bgReqName");
        const reqBtn = body.querySelector("#bgReqBtn");
        const waitBox = body.querySelector("#bgReqWait");
        reqBtn.onclick = async () => {
          const nm = nameInp.value.trim();
          if (!nm) { nameInp.focus(); return; }
          reqBtn.disabled = true;
          reqBtn.textContent = "전송 중...";
          try {
            await requestDeviceApproval(nm, (st) => {
              waitBox.hidden = false;
              if (st === "pending") {
                waitBox.innerHTML = `<b>📡 베니비서 앱으로 승인 요청을 보냈어요!</b><br>베니 님이 휴대폰 알림에서 <b>[✅ 기기 계속 허용]</b>을 누르면 이 화면이 즉시 자동으로 열립니다. 잠시만 기다려 주세요...`;
                reqBtn.textContent = "⏳ 승인 대기 중 (자동 열림)";
              } else if (st === "rejected") {
                waitBox.innerHTML = `😿 승인 요청이 거절되었어요.`;
                reqBtn.disabled = false;
                reqBtn.textContent = "다시 요청 보내기";
              }
            });
          } catch (e) {
            alert(e.message || "요청 전송에 실패했습니다.");
            reqBtn.disabled = false;
            reqBtn.textContent = "📲 베니에게 기기 등록 요청 보내기";
          }
        };
      } else if (curTab === "code") {
        body.innerHTML = `
          <div class="bgate-field">
            <label>내 이름 / 별명</label>
            <input class="bgate-inp" id="bgCodeName" maxlength="12" placeholder="예: 철수, 와이프" value="${esc(state.name)}">
          </div>
          <div class="bgate-field">
            <label>6자리 초대 패스 코드</label>
            <input class="bgate-inp code" id="bgCodeVal" maxlength="6" placeholder="ABCDEF">
          </div>
          <button class="bgate-btn primary" id="bgCodeBtn">🔓 기기 등록 및 바로 입장</button>
        `;
        const nameInp = body.querySelector("#bgCodeName");
        const codeInp = body.querySelector("#bgCodeVal");
        const codeBtn = body.querySelector("#bgCodeBtn");
        codeBtn.onclick = async () => {
          codeBtn.disabled = true;
          try {
            await redeemPassCode(codeInp.value, nameInp.value);
          } catch (e) {
            alert(e.message || "코드 확인에 실패했습니다.");
            codeBtn.disabled = false;
          }
        };
      } else {
        body.innerHTML = `
          <div class="bgate-field">
            <label>관리자 비밀번호 (베니 님 전용)</label>
            <input class="bgate-inp" type="password" id="bgAdminPw" placeholder="비밀번호 입력">
          </div>
          <button class="bgate-btn primary" id="bgAdminBtn">👑 관리자 인증 및 기기 영구 등록</button>
        `;
        const pwInp = body.querySelector("#bgAdminPw");
        const admBtn = body.querySelector("#bgAdminBtn");
        admBtn.onclick = async () => {
          admBtn.disabled = true;
          try {
            await loginAdminWithPassword(pwInp.value);
          } catch (e) {
            alert(e.message || "관리자 비밀번호가 맞지 않습니다.");
            admBtn.disabled = false;
          }
        };
      }
    };
    render();
    lockEl.hidden = false;
  }

  function hideLockOverlay() {
    if (lockEl) lockEl.hidden = true;
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

  function renderAdminModal() {
    clearAdminSubs();
    const canManage = state.isAdmin || state.isHost || IS_LOCAL;
    adminEl.innerHTML = `
      <div class="bgate-card wide" role="dialog" aria-modal="true">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="bgate-badge">👑 ACCESS &amp; DEVICE CONTROL</div>
          <button class="bgate-btn ghost sm" id="bgAdmClose">✕ 닫기</button>
        </div>
        <h2 class="bgate-title">베니 게임 포털 · 출입 및 기기 관리</h2>
        <p class="bgate-sub">베니비서 앱(알림 → 게임 탭)에서도 승인 요청에 바로 답할 수 있으며, 이곳에서 초대 패스 발급과 등록된 친구 기기의 일시정지·해제를 한눈에 관리합니다.</p>

        <div class="bgate-sec">
          <h4><span>🙋 내 프로필 &amp; 현재 기기 상태</span> <span class="bgate-pill active">${state.isAdmin ? "👑 관리자(베니)" : state.isHost ? "🏠 가족 방장" : state.unlocked ? "✅ 등록 기기" : "🔒 미등록"}</span></h4>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="bgate-inp" id="bgMyName" maxlength="12" placeholder="온라인 대결 닉네임" value="${esc(state.name || localStorage.getItem(NAME_KEY) || "베니")}" style="flex:1">
            <button class="bgate-btn primary sm" id="bgSaveMyName" style="padding:11px 14px">이름 저장</button>
          </div>
        </div>

        ${canManage ? `
          <div class="bgate-sec">
            <h4><span>🔔 실시간 승인 대기 요청</span> <span class="bgate-meta" id="bgReqCount">불러오는 중...</span></h4>
            <div id="bgReqList"><div class="bgate-meta">대기 중인 승인 요청이 없습니다.</div></div>
          </div>

          <div class="bgate-sec">
            <h4><span>🔑 원클릭 초대 패스 · 링크 발급</span></h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
              <button class="bgate-btn green sm" data-mkpass="friend" style="padding:10px">👥 지인 영구 기기 패스</button>
              <button class="bgate-btn primary sm" data-mkpass="temp24h" style="padding:10px">⏳ 24시간 손님 패스</button>
              <button class="bgate-btn ghost sm" data-mkpass="host" style="padding:10px">👑 가족 방장(와이프) 패스</button>
            </div>
            <div id="bgPassResult" hidden style="margin-top:10px;padding:12px;border-radius:10px;background:#090e15;border:1px solid #334155"></div>
          </div>

          <div class="bgate-sec">
            <h4><span>📱 등록된 기기 목록 (실시간 제어)</span> <span class="bgate-meta" id="bgDevCount">0대</span></h4>
            <div id="bgDevList"><div class="bgate-meta">등록된 기기를 불러오는 중...</div></div>
          </div>
        ` : `
          <div class="bgate-sec">
            <h4><span>🔑 초대 코드로 권한 등록</span></h4>
            <div style="display:flex;gap:8px">
              <input class="bgate-inp code" id="bgModalCode" maxlength="6" placeholder="6자리 코드" style="flex:1">
              <button class="bgate-btn primary sm" id="bgModalRedeem" style="padding:11px 16px">코드 등록</button>
            </div>
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
        localStorage.setItem(NAME_KEY, v);
        state.name = v;
        notify();
        alert(`닉네임을 '${v}'(으)로 저장했습니다.`);
      }
    };

    if (!canManage) {
      const rBtn = adminEl.querySelector("#bgModalRedeem");
      if (rBtn) rBtn.onclick = async () => {
        try {
          await redeemPassCode(adminEl.querySelector("#bgModalCode").value, adminEl.querySelector("#bgMyName").value);
          renderAdminModal();
        } catch (e) { alert(e.message); }
      };
      const aBtn = adminEl.querySelector("#bgModalAdminBtn");
      if (aBtn) aBtn.onclick = async () => {
        try {
          await loginAdminWithPassword(adminEl.querySelector("#bgModalAdminPw").value);
          renderAdminModal();
        } catch (e) { alert(e.message); }
      };
      return;
    }

    // 패스 발급 버튼
    adminEl.querySelectorAll("[data-mkpass]").forEach(btn => {
      btn.onclick = async () => {
        const role = btn.dataset.mkpass;
        try {
          const res = await createPass({ role });
          const box = adminEl.querySelector("#bgPassResult");
          box.hidden = false;
          const roleLabel = role === "host" ? "👑 가족 방장 패스" : role === "temp24h" ? "⏳ 24시간 손님 패스" : "👥 지인 기기 영구 패스";
          box.innerHTML = `
            <div style="font-size:12.5px;color:#66c0f4;font-weight:700;margin-bottom:4px">${roleLabel} 발급 완료!</div>
            <div style="font-size:22px;font-weight:800;letter-spacing:5px;color:#fbbf24;margin:4px 0">${esc(res.code)}</div>
            <div style="font-size:11.5px;color:#94a3b8;word-break:break-all;margin-bottom:8px">${esc(res.url)}</div>
            <div style="display:flex;gap:6px">
              <button class="bgate-btn primary sm" id="bgCopyLink">📋 자동등록 링크 복사</button>
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
          alert("패스 발급 실패 (관리자 또는 가족 방장 권한 필요): " + (e.message || e));
        }
      };
    });

    // 실시간 승인 요청 목록 구독
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
      cntEl.textContent = `${pendings.length}건 대기 중`;
      if (!pendings.length) {
        listEl.innerHTML = `<div class="bgate-meta">대기 중인 승인 요청이 없습니다.</div>`;
        return;
      }
      listEl.innerHTML = pendings.map(r => `
        <div class="bgate-row">
          <div>
            <b>${esc(r.name || "이름없음")}</b> <span class="bgate-meta">(${esc(r.ua || "기기")} · ${esc(r.game || "portal")} · ${fmtTimeAgo(r.t)})</span>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="bgate-btn green sm" data-act="app-friend" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" data-ua="${esc(r.ua)}">✅ 계속 허용</button>
            <button class="bgate-btn primary sm" data-act="app-24h" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" data-ua="${esc(r.ua)}">⏳ 24시간</button>
            <button class="bgate-btn ghost sm" data-act="app-host" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" data-ua="${esc(r.ua)}">👑 가족 방장</button>
            <button class="bgate-btn ghost sm" data-act="app-rej" data-uid="${esc(r.uid)}">🚫 거절</button>
          </div>
        </div>
      `).join("");
      listEl.querySelectorAll("[data-act]").forEach(b => {
        b.onclick = async () => {
          const { act, uid, name, ua } = b.dataset;
          if (act === "app-rej") await rejectRequest(uid);
          else if (act === "app-24h") await approveRequest(uid, { role: "temp24h", name, ua });
          else if (act === "app-host") await approveRequest(uid, { role: "host", name, ua });
          else await approveRequest(uid, { role: "friend", name, ua });
        };
      });
    };
    reqRef.on("value", onReq);
    adminSubs.push([reqRef, "value", onReq]);

    // 등록된 기기 목록 구독
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
        listEl.innerHTML = `<div class="bgate-meta">아직 등록된 기기가 없습니다.</div>`;
        return;
      }
      listEl.innerHTML = devs.map(d => {
        const exp = Number(d.expiresAt || 0);
        const expired = exp > 0 && now() > exp;
        const st = expired ? "revoked" : (d.status || "active");
        const stLabel = expired ? "만료됨" : st === "active" ? "활성" : st === "paused" ? "일시정지" : "차단됨";
        const roleLabel = d.role === "host" ? "👑 가족 방장" : d.role === "temp24h" ? "⏳ 24시간" : "👥 지인";
        const expTxt = exp > 0 && !expired ? ` · 남은 ${Math.max(1, Math.ceil((exp - now()) / 3600000))}시간` : "";
        return `
          <div class="bgate-row">
            <div>
              <b>${esc(d.name || "기기")}</b>
              <span class="bgate-pill ${st}">${stLabel}</span>
              <div class="bgate-meta">${roleLabel} · ${esc(d.ua || "브라우저")} · 최근 ${fmtTimeAgo(d.lastSeen || d.t)}${expTxt}</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              ${st === "active"
                ? `<button class="bgate-btn ghost sm" data-dact="pause" data-uid="${esc(d.uid)}">⏸ 일시정지</button>`
                : `<button class="bgate-btn green sm" data-dact="resume" data-uid="${esc(d.uid)}">▶ 다시 허용</button>`}
              <button class="bgate-btn ghost sm" data-dact="24h" data-uid="${esc(d.uid)}">⏳ 24시간</button>
              <button class="bgate-btn ghost sm" data-dact="revoke" data-uid="${esc(d.uid)}" style="color:#fca5a5">🗑 차단</button>
            </div>
          </div>
        `;
      }).join("");
      listEl.querySelectorAll("[data-dact]").forEach(b => {
        b.onclick = async () => {
          const { dact, uid } = b.dataset;
          if (dact === "pause") await updateDevice(uid, { status: "paused" });
          else if (dact === "resume") await updateDevice(uid, { status: "active", expiresAt: 0 });
          else if (dact === "24h") await updateDevice(uid, { status: "active", role: "temp24h", expiresAt: now() + 24 * 3600 * 1000 });
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
      state.unlocked = true;
      state.role = cached.role || "friend";
      state.status = "active";
      state.name = cached.name || state.name;
    } else {
      // 캐시된 이용권이 없으면 즉시 잠금 오버레이를 띄우고 Firebase 확인
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { if (!state.unlocked) showLockOverlay(); });
      } else {
        showLockOverlay();
      }
    }
    checkPermissionsAndWatch().catch(e => console.warn("Gate init error:", e));
  }

  init();

  return {
    get state() { return state; },
    onChange(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
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
})();
window.Gate = Gate;
