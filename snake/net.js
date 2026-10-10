/* 지렁이 대결 — Firebase (친구들과 같이 하기 · 관리자 · 감지 기록)
   · 베니브릿지와 같은 프로젝트(benny-meeting)·같은 기본 앱 → 같은 주소(benny3s.github.io)라 관리자 로그인이 포털·베니브릿지와 공유됨
   · 실시간 게임은 Realtime Database (Firestore는 초당 여러 번 쓰기에 맞지 않음)
   · 방장 컴퓨터가 게임을 계산하고(서버 역할) 초당 10번 상태를 보냄. 다른 사람은 입력만 보냄 */
const NET = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  let app = null, loading = null, user = null, isAdmin = false;
  const load = src => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });

  async function init() {
    if (app) return app;
    if (loading) return loading;
    loading = (async () => {
      await load(SDK + "firebase-app-compat.js");
      await Promise.all(["firebase-auth-compat.js", "firebase-database-compat.js", "firebase-functions-compat.js"].map(f => load(SDK + f)));
      if (new URLSearchParams(location.search).has("guest")) {             // 손님 모드: 이 탭만의 익명 계정 (한 컴퓨터에서 여러 명 시험용)
        app = firebase.initializeApp(FB, "guest" + Math.random().toString(36).slice(2, 7));
        await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
      } else if (firebase.apps.length) { app = firebase.app(); if (!app.options.databaseURL) app = firebase.initializeApp(FB, "snake"); }
      else app = firebase.initializeApp(FB);
      user = await new Promise(ok => { const t = setTimeout(() => ok(null), 8000); const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); }); });
      if (!user) user = (await app.auth().signInAnonymously()).user;         // 손님 토큰 (베니브릿지 손님과 같은 방식)
      try { isAdmin = (await user.getIdTokenResult()).claims.admin === 1; } catch (e) { isAdmin = false; }
      return app;
    })();
    return loading;
  }
  async function adminLogin(pw) {
    const a = await init();
    const res = await a.functions("asia-northeast3").httpsCallable("adminLogin")({ password: pw });
    user = (await a.auth().signInWithCustomToken(res.data.token)).user;    // 베니브릿지·포털도 같이 관리자 상태가 됨
    isAdmin = true;
    return true;
  }
  const db = () => app.database();
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const r2 = v => Math.round(v * 100) / 100;

  // ── 방장
  async function host(settings, sim, hooks) {
    await init();
    let code;
    for (let i = 0; i < 5; i++) { code = code4(); if (!(await db().ref(`snake/rooms/${code}/meta`).get()).exists()) break; }
    const room = db().ref(`snake/rooms/${code}`);
    await room.child("meta").set({ host: user.uid, created: firebase.database.ServerValue.TIMESTAMP, ai: settings.ai, v: 1 });
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set({ name: settings.name, hue: settings.hue, helper: !!settings.helper });
    room.child("players").on("child_added", snap => { if (snap.key !== user.uid) hooks.join(snap.key, snap.val()); });
    room.child("players").on("child_changed", snap => hooks.update && hooks.update(snap.key, snap.val()));
    room.child("players").on("child_removed", snap => hooks.leave(snap.key));
    room.child("inputs").on("child_added", snap => { sim.inputs[snap.key] = unpackInput(snap.val()); });
    room.child("inputs").on("child_changed", snap => { const v = unpackInput(snap.val()); sim.inputs[snap.key] = v; hooks.input && hooks.input(snap.key, v); });
    let n = 0;
    const heads = new Map();
    return {
      code,
      recordHeads() { for (const s of sim.snakes) { const h = heads.get(s.id) || []; h.push(s.head); if (h.length > 2) h.shift(); heads.set(s.id, h); } },
      broadcast() {                                                          // 틱 두 번마다 한 번
        n++;
        const s = sim.snakes.map(x => { const h = heads.get(x.id) || [x.head, x.head]; const a = h[0] || x.head, b = h[1] || x.head;
          return [x.id, r2(a[0]), r2(a[1]), r2(b[0]), r2(b[1]), r2(x.ang), Math.round(x.length * 10), x.alive ? 1 : 0, x.boosting ? 1 : 0, x.deaths, x.kills]; });
        const fd = [...sim.foodChanged].map(i => [i, r2(sim.food[i][0]), r2(sim.food[i][1]), sim.food[i][2]]);
        sim.foodChanged.clear();
        const up = { state: { k: sim.tick, s, fd } };
        if (n % 15 === 1) {                                                   // 1.5초마다 몸 전체·먹이 전체 (놓친 것 맞추기)
          up.sync = { k: sim.tick, b: Object.fromEntries(sim.snakes.map(x => [x.id, x.pts.filter((_, i) => i % 2 === 0).flatMap(p => [r2(p[0]), r2(p[1])])])),
            f: sim.food.map(f => [r2(f[0]), r2(f[1]), f[2]]),
            info: Object.fromEntries(sim.snakes.map(x => [x.id, [x.kind, x.name, x.hue, x.helper ? 1 : 0]])) };
        }
        room.update(up);
      },
      leave() { room.remove(); },
    };
  }
  const unpackInput = v => v ? { target: v.t ? [v.t[0], v.t[1]] : null, boost: !!v.b, turn: v.r || 0, at: v.at || 0 } : {};

  // ── 참가자
  async function join(code, settings, handlers) {
    await init();
    const room = db().ref(`snake/rooms/${code}`);
    const meta = (await room.child("meta").get()).val();
    if (!meta) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    await room.child(`players/${user.uid}`).set({ name: settings.name, hue: settings.hue, helper: !!settings.helper });
    room.child(`players/${user.uid}`).onDisconnect().remove();
    room.child(`inputs/${user.uid}`).onDisconnect().remove();
    room.child("state").on("value", s => s.exists() && handlers.state(s.val()));
    room.child("sync").on("value", s => s.exists() && handlers.sync(s.val()));
    room.child("meta").on("value", s => { if (!s.exists()) handlers.closed(); });
    let last = "", lastAt = 0, pending = null;
    function sendInput(inp) {
      const v = { t: inp.target ? [r2(inp.target[0]), r2(inp.target[1])] : null, b: inp.boost ? 1 : 0, r: inp.turn || 0 };
      const key = JSON.stringify(v), now = performance.now();
      if (key === last) return;
      if (now - lastAt < 66) { pending = inp; return; }                         // 초당 15번까지만
      last = key; lastAt = now; pending = null;
      room.child(`inputs/${user.uid}`).set({ ...v, at: firebase.database.ServerValue.TIMESTAMP });
    }
    setInterval(() => { if (pending) sendInput(pending); }, 70);
    return { code, meta, sendInput, leave() { room.child(`players/${user.uid}`).remove(); room.child(`inputs/${user.uid}`).remove(); room.off(); } };
  }

  // ── 감지 기록 (관리자만 읽기)
  function report(roomKey, uid, part, data) { if (!app) return; db().ref(`snake/ac/${roomKey}/${uid}/${part}`).set({ ...data, t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {}); }
  function watchReports(cb) { db().ref("snake/ac").limitToLast(30).on("value", s => cb(s.val() || {}), e => cb({ __error: e.message })); }
  function watchRooms(cb) { db().ref("snake/rooms").on("value", s => { const v = s.val() || {}; cb(Object.fromEntries(Object.entries(v).map(([k, r]) => [k, { meta: r.meta, players: r.players }]))); }); }
  function clearReports() { return db().ref("snake/ac").remove(); }

  return { init, adminLogin, host, join, report, watchReports, watchRooms, clearReports, get uid() { return user && user.uid; }, get isAdmin() { return isAdmin; }, get ready() { return !!app; } };
})();
