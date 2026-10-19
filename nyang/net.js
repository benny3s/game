/* 냥도쿠 — 친구 대결 (Firebase Realtime DB, 지렁이·스타와 같은 기본 앱·로그인)
   퍼즐은 각자 화면에서 풀고, 서로 '진행 상황'(놓은 고양이 수·실수·끝난 시간)만 주고받음 → 직접 연결 없이 DB 하나로 충분
   nyang/rooms/{코드}: meta(방장만) · players/{uid} · prog/{uid}(본인만) · chat
   nyang/index/{코드}: 방 목록용 (방장 이름·인원·단계) */
const NET = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const MAXP = 8;                                                            // 한 방 최대 인원 (휴대폰 이름표 줄·결과표에 들어가는 만큼)
  let app = null, loading = null, user = null, offset = 0;
  const load = src => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });

  async function init() {
    if (app) return app;
    if (loading) return loading;
    loading = (async () => {
      await load(SDK + "firebase-app-compat.js");
      await Promise.all(["firebase-auth-compat.js", "firebase-database-compat.js"].map(f => load(SDK + f)));
      if (new URLSearchParams(location.search).has("guest")) {             // 시험용: 이 탭만의 익명 계정
        app = firebase.initializeApp(FB, "guest" + Math.random().toString(36).slice(2, 7));
        await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
      } else if (firebase.apps.length) app = firebase.app();
      else app = firebase.initializeApp(FB);
      user = await new Promise(ok => { const t = setTimeout(() => ok(null), 8000); const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); }); });
      if (!user) user = (await app.auth().signInAnonymously()).user;
      app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
      return app;
    })();
    return loading;
  }
  async function separateIdentity() {                                        // 같은 계정으로 같은 방에 두 번 들어올 때 (PC·휴대폰 모두 관리자 등)
    app = firebase.initializeApp(FB, "tab" + Math.random().toString(36).slice(2, 8));
    await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    user = (await app.auth().signInAnonymously()).user;
    app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
  }
  const db = () => app.database();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const now = () => Date.now() + offset;                                     // 서버 시계 (카운트다운을 모두 같게)
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  function subs() { const list = []; return { on(ref, ev, cb) { ref.on(ev, cb); list.push([ref, ev, cb]); }, off() { for (const [r, e, c] of list.splice(0)) r.off(e, c); } }; }

  // 방 하나 (방장·참가자 공통). hooks: meta, players, prog, chat, conn, closed
  function roomApi(code, isHost, hooks) {
    const room = db().ref(`nyang/rooms/${code}`), idx = db().ref(`nyang/index/${code}`), S = subs();
    let left = false, meta = null, mine = null, nPlayers = 0;
    const writeIdx = () => isHost && meta && idx.set({ h: mine.name, n: nPlayers, ph: meta.phase, tier: meta.cfg.tier, m: meta.cfg.mode || "race", t: TS() }).catch(() => {});
    const seat = () => {
      if (left) return Promise.resolve();
      if (!isHost) { room.child(`players/${user.uid}`).onDisconnect().remove(); room.child(`prog/${user.uid}`).onDisconnect().remove(); }
      return room.child(`players/${user.uid}`).set(mine);
    };
    let goneT = null;
    S.on(room.child("meta"), "value", s => {
      if (!s.exists()) { if (!isHost && !goneT) goneT = setTimeout(() => { if (!left) hooks.closed && hooks.closed(); }, 20000); hooks.conn && hooks.conn(false, "방장 연결을 기다리는 중"); return; }
      if (goneT) { clearTimeout(goneT); goneT = null; hooks.conn && hooks.conn(true, ""); }
      meta = s.val(); hooks.meta && hooks.meta(meta);
    });
    let reseatT = null;
    S.on(room.child("players"), "value", s => {
      const v = s.val() || {};
      if (!left && s.exists() && !v[user.uid] && !reseatT) reseatT = setTimeout(() => { reseatT = null; seat().catch(() => {}); }, 800);
      const k = Object.keys(v).length; if (k !== nPlayers) { nPlayers = k; writeIdx(); }
      hooks.players && hooks.players(v);
    });
    S.on(room.child("prog"), "value", s => hooks.prog && hooks.prog(s.val() || {}));
    S.on(room.child("chat").limitToLast(50), "child_added", s => hooks.chat && hooks.chat(s.val()));
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) {
        seat().catch(() => {});
        if (isHost && meta) { room.child("meta").set(meta).catch(() => {}); room.onDisconnect().remove(); idx.onDisconnect().remove(); writeIdx(); }
      }
      conn = c; hooks.conn && hooks.conn(c, c ? "" : "인터넷 연결이 끊겼어요");
    });
    return {
      code, get meta() { return meta; }, get uid() { return user.uid; }, now,
      async start(me, firstMeta) {
        mine = me;
        if (isHost) { meta = firstMeta; await room.child("meta").set(meta); room.onDisconnect().remove(); idx.onDisconnect().remove(); writeIdx(); }
        await seat();
      },
      setMeta(p) { if (!isHost) return; meta = { ...meta, ...p }; writeIdx(); return room.child("meta").update(p); },
      setMe(p) { mine = { ...mine, ...p }; if (isHost && p.name) writeIdx(); return room.child(`players/${user.uid}`).update(p); },
      prog(p) { return room.child(`prog/${user.uid}`).set({ ...p, at: TS() }).catch(() => {}); },
      clearProg() { if (isHost) return room.child("prog").remove().catch(() => {}); },
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() {
        left = true; clearTimeout(goneT); clearTimeout(reseatT); S.off();
        if (isHost) { room.onDisconnect().cancel(); idx.onDisconnect().cancel(); room.remove(); idx.remove(); }
        else { room.child(`players/${user.uid}`).remove(); room.child(`prog/${user.uid}`).remove(); }
      },
    };
  }

  async function host(me, cfg, hooks) {
    await init();
    let code;
    for (let i = 0; i < 6; i++) { code = code4(); if (!(await db().ref(`nyang/rooms/${code}/meta`).get()).exists()) break; }
    const r = roomApi(code, true, hooks);
    await r.start(me, { host: user.uid, created: Date.now(), phase: "lobby", cfg, round: 0, wins: {}, log: hooks.logSid || null });
    return r;
  }
  async function join(code, me, hooks) {
    await init();
    const meta = (await db().ref(`nyang/rooms/${code}/meta`).get()).val();
    if (!meta) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    const pl = (await db().ref(`nyang/rooms/${code}/players`).get()).val() || {};
    if (Object.keys(pl).length >= MAXP && !pl[user.uid]) throw new Error(`방이 꽉 찼어요 (최대 ${MAXP}명)`);
    if (meta.host === user.uid || pl[user.uid]) await separateIdentity();
    const r = roomApi(code, false, hooks);
    await r.start(me);
    return r;
  }
  async function listRooms() {
    await init();
    const idx = (await db().ref("nyang/index").get()).val() || {};
    const rows = await Promise.all(Object.keys(idx).slice(0, 40).map(async code => {
      const [m, p] = await Promise.all([db().ref(`nyang/rooms/${code}/meta/host`).get(), db().ref(`nyang/rooms/${code}/players`).get()]);
      const h = m.val(), players = p.val() || {};
      return { code, ...idx[code], n: Object.keys(players).length, empty: !h || !players[h] };
    }));
    return rows.sort((a, b) => (a.empty - b.empty) || ((b.t || 0) - (a.t || 0)));
  }
  async function deleteRoom(code) { await init(); await db().ref(`nyang/rooms/${code}`).remove().catch(() => {}); return db().ref(`nyang/index/${code}`).remove(); }

  async function isAdmin() { try { return !!user && (await user.getIdTokenResult()).claims.admin === 1; } catch (e) { return false; } }
  return { MAXP, isAdmin, init, host, join, listRooms, deleteRoom, db: () => app && app.database(), get uid() { return user && user.uid; }, now };
})();
