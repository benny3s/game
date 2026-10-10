/* 지렁이 대결 — 네트워크 (친구들과 같이 하기 · 관리자 · 감지 기록)
   · Firebase(benny-meeting, 베니브릿지와 같은 기본 앱) = 로그인·방 목록·관리자·감지 기록, 그리고 WebRTC '연결 소개' 창구
   · 게임 데이터는 WebRTC 직접 연결(방장 ↔ 친구, 한국 안이면 왕복 0.02~0.05초)로 초당 20번
   · 직접 연결이 안 되는 네트워크면 Realtime Database(싱가포르)로 자동 전환 (초당 10번, 왕복 0.15~0.25초)
   · 방장 컴퓨터가 게임을 계산하고(서버 역할), 친구는 입력만 보냄 */
const NET = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
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
      if (!user) user = (await app.auth().signInAnonymously()).user;
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
  const TS = () => firebase.database.ServerValue.TIMESTAMP;

  // ── WebRTC: 방장 쪽 연결 하나 (친구 한 명)
  function hostPeer(room, uid, onMsg) {
    const pc = new RTCPeerConnection(ICE);
    const dc = pc.createDataChannel("g", { ordered: false, maxRetransmits: 0 });   // 늦게 온 건 버림 (게임 상태는 최신만 중요)
    const ref = room.child(`rtc/${uid}`);
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_h").push(JSON.stringify(e.candidate)); };
    dc.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
    (async () => {
      await ref.remove();
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      await ref.child("offer").set(JSON.stringify(pc.localDescription));
      ref.child("answer").on("value", async s => { if (s.exists() && !pc.currentRemoteDescription) { try { await pc.setRemoteDescription(JSON.parse(s.val())); } catch (_) {} } });
      ref.child("ice_c").on("child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
    })().catch(() => {});
    return { dc, pc, open: () => dc.readyState === "open", close() { ref.off(); try { dc.close(); pc.close(); } catch (_) {} ref.remove().catch(() => {}); } };
  }
  // ── WebRTC: 친구 쪽
  function clientPeer(room, uid, onMsg, onOpen) {
    const pc = new RTCPeerConnection(ICE);
    let dc = null;
    const ref = room.child(`rtc/${uid}`);
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_c").push(JSON.stringify(e.candidate)); };
    pc.ondatachannel = e => { dc = e.channel; dc.onmessage = m => { try { onMsg(JSON.parse(m.data)); } catch (_) {} }; dc.onopen = () => onOpen && onOpen(); };
    ref.child("offer").on("value", async s => {
      if (!s.exists() || pc.currentRemoteDescription) return;
      try {
        await pc.setRemoteDescription(JSON.parse(s.val()));
        const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
        await ref.child("answer").set(JSON.stringify(pc.localDescription));
      } catch (_) {}
    });
    ref.child("ice_h").on("child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
    return { send: o => { if (dc && dc.readyState === "open") { dc.send(JSON.stringify(o)); return true; } return false; }, open: () => !!dc && dc.readyState === "open", close() { ref.off(); try { pc.close(); } catch (_) {} } };
  }

  // ── 방장
  async function host(settings, sim, hooks) {
    await init();
    let code;
    for (let i = 0; i < 5; i++) { code = code4(); if (!(await db().ref(`snake/rooms/${code}/meta`).get()).exists()) break; }
    const room = db().ref(`snake/rooms/${code}`);
    await room.child("meta").set({ host: user.uid, created: TS(), ai: settings.ai, v: 2 });
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set({ name: settings.name, hue: settings.hue, helper: !!settings.helper });
    const peers = new Map();                                                // uid → WebRTC 연결
    const onPeerMsg = uid => m => {
      if (m.t === "i") { const v = unpackInput(m); sim.inputs[uid] = v; hooks.input && hooks.input(uid, v); }
      else if (m.t === "p") { const p = peers.get(uid); if (p && p.open()) p.dc.send(JSON.stringify({ t: "q", c: m.c })); }
    };
    room.child("players").on("child_added", snap => {
      if (snap.key === user.uid) return;
      hooks.join(snap.key, snap.val());
      if (window.RTCPeerConnection) peers.set(snap.key, hostPeer(room, snap.key, onPeerMsg(snap.key)));
    });
    room.child("players").on("child_changed", snap => hooks.update && hooks.update(snap.key, snap.val()));
    room.child("players").on("child_removed", snap => { hooks.leave(snap.key); const p = peers.get(snap.key); if (p) { p.close(); peers.delete(snap.key); } });
    room.child("inputs").on("child_added", snap => { sim.inputs[snap.key] = unpackInput(snap.val()); });
    room.child("inputs").on("child_changed", snap => { const v = unpackInput(snap.val()); sim.inputs[snap.key] = v; hooks.input && hooks.input(snap.key, v); });
    let n = 0;
    const prevHead = new Map();
    function stateMsg() {
      const s = sim.snakes.map(x => { const a = prevHead.get(x.id) || x.head;
        return [x.id, r2(a[0]), r2(a[1]), r2(x.head[0]), r2(x.head[1]), r2(x.ang), Math.round(x.length * 10), x.alive ? 1 : 0, x.boosting ? 1 : 0, x.deaths, x.kills, x.prot ? 1 : 0]; });
      const fd = [...sim.foodChanged].map(i => { const f = sim.food[i]; return f ? [i, r2(f[0]), r2(f[1]), f[2], f[3], f[4] || 0] : [i, null]; });
      sim.foodChanged.clear();
      const g = { m: sim.mode, hz: sim.hz || 20, R: r2(sim.R), tl: sim.timeLeft == null ? -1 : Math.ceil(sim.timeLeft), o: sim.over ? 1 : 0 };   // 게임 방식·경기장 크기·남은 시간·끝남
      if (sim.over) g.res = sim.results;
      return { k: sim.tick, s, fd, g };
    }
    function syncMsg() {
      return { k: sim.tick, b: Object.fromEntries(sim.snakes.map(x => [x.id, x.pts.filter((_, i) => i % 2 === 0).flatMap(p => [r2(p[0]), r2(p[1])])])),
        f: sim.food.map(f => f ? [r2(f[0]), r2(f[1]), f[2], f[3], f[4] || 0] : 0), info: Object.fromEntries(sim.snakes.map(x => [x.id, [x.kind, x.name, x.hue, x.helper ? 1 : 0]])) };
    }
    return {
      code,
      setSim(next) { sim = next; n = 0; prevHead.clear(); },               // 새 판(라운드 다시 시작)
      // 매 틱 호출: 직접 연결된 친구에겐 매 틱, 아직 안 된 친구가 있으면 두 틱마다 Realtime DB에도
      tick() {
        n++;
        const st = stateMsg();
        const sync = n % 30 === 1 ? syncMsg() : null;
        let anyRelay = false;
        for (const [uid, p] of peers) {
          if (p.open()) { p.dc.send(JSON.stringify({ t: "s", ...st })); if (sync) p.dc.send(JSON.stringify({ t: "y", ...sync })); }
          else anyRelay = true;
        }
        if (peers.size === 0 || anyRelay) {
          if (n % 2 === 0 || sync) { const up = { state: st }; if (sync) up.sync = sync; room.update(up); }
        }
        for (const x of sim.snakes) prevHead.set(x.id, x.head);
        // 직접 연결 상태를 방에 기록 (메뉴의 연결 표시용)
        if (n % 40 === 0) for (const [uid, p] of peers) room.child(`players/${uid}/p2p`).set(p.open() ? 1 : 0).catch(() => {});
      },
      peers: () => [...peers].map(([uid, p]) => [uid, p.open()]),
      leave() { for (const p of peers.values()) p.close(); room.remove(); },
    };
  }
  const unpackInput = v => v ? { target: v.t ? [v.t[0], v.t[1]] : null, aim: v.a != null ? v.a : null, boost: !!v.b, turn: v.r || 0, respawn: v.rs || 0, at: v.at || 0 } : {};

  // ── 친구 (참가자)
  async function join(code, settings, handlers) {
    await init();
    const room = db().ref(`snake/rooms/${code}`);
    const meta = (await room.child("meta").get()).val();
    if (!meta) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    const onMsg = m => { if (m.t === "s") handlers.state(m); else if (m.t === "y") handlers.sync(m); else if (m.t === "q") rtt = rtt ? rtt * 0.8 + (performance.now() - m.c) * 0.2 : performance.now() - m.c; };
    let rtt = 0, peer = null;
    if (window.RTCPeerConnection) peer = clientPeer(room, user.uid, onMsg, () => handlers.p2p && handlers.p2p(true));
    await room.child(`players/${user.uid}`).set({ name: settings.name, hue: settings.hue, helper: !!settings.helper });
    room.child(`players/${user.uid}`).onDisconnect().remove();
    room.child(`inputs/${user.uid}`).onDisconnect().remove();
    room.child(`rtc/${user.uid}`).onDisconnect().remove();
    room.child("state").on("value", s => { if (s.exists() && !(peer && peer.open())) handlers.state(s.val()); });
    room.child("sync").on("value", s => { if (s.exists() && !(peer && peer.open())) handlers.sync(s.val()); });
    room.child("meta").on("value", s => { if (!s.exists()) handlers.closed(); });
    const pingT = setInterval(() => { if (peer && peer.open()) peer.send({ t: "p", c: performance.now() }); }, 1000);
    let last = "", lastAt = 0, pending = null;
    function sendInput(inp) {
      const v = { t: inp.target ? [r2(inp.target[0]), r2(inp.target[1])] : null, a: inp.aim != null ? r2(inp.aim) : null, b: inp.boost ? 1 : 0, r: inp.turn || 0, rs: inp.respawn || 0 };
      const key = JSON.stringify(v), now = performance.now();
      if (peer && peer.open()) {                                             // 직접 연결: 바뀌면 바로, 안 바뀌어도 0.2초마다 (늦게 온 건 버리는 통로라서)
        if (key !== last || now - lastAt > 200) { peer.send({ t: "i", ...v }); last = key; lastAt = now; }
        return;
      }
      if (key === last) return;
      if (now - lastAt < 66) { pending = inp; return; }                         // Realtime DB: 초당 15번까지만
      last = key; lastAt = now; pending = null;
      room.child(`inputs/${user.uid}`).set({ ...v, at: TS() });
    }
    const pendT = setInterval(() => { if (pending) sendInput(pending); }, 70);
    return {
      code, meta, sendInput,
      get p2p() { return !!(peer && peer.open()); }, get rtt() { return rtt; },
      leave() { clearInterval(pingT); clearInterval(pendT); if (peer) peer.close(); room.child(`players/${user.uid}`).remove(); room.child(`inputs/${user.uid}`).remove(); room.child(`rtc/${user.uid}`).remove(); room.off(); },
    };
  }

  // ── 감지 기록 (관리자만 읽기)
  function report(roomKey, uid, part, data) { if (!app) return; db().ref(`snake/ac/${roomKey}/${uid}/${part}`).set({ ...data, t: TS() }).catch(() => {}); }
  function watchReports(cb) { db().ref("snake/ac").limitToLast(30).on("value", s => cb(s.val() || {}), e => cb({ __error: e.message })); }
  function watchRooms(cb) { db().ref("snake/rooms").on("value", s => { const v = s.val() || {}; cb(Object.fromEntries(Object.entries(v).map(([k, r]) => [k, { meta: r.meta, players: r.players }]))); }); }
  function clearReports() { return db().ref("snake/ac").remove(); }

  return { init, adminLogin, host, join, report, watchReports, watchRooms, clearReports, get uid() { return user && user.uid; }, get isAdmin() { return isAdmin; }, get ready() { return !!app; } };
})();
