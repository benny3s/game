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
  // 같은 계정(예: 관리자로 PC·휴대폰 둘 다 로그인)으로 같은 방에 또 들어오면 한 사람으로 겹치므로, 이 탭만 따로 임시 계정을 씀
  async function separateIdentity() {
    const a = firebase.initializeApp(FB, "tab" + Math.random().toString(36).slice(2, 8));
    await a.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    user = (await a.auth().signInAnonymously()).user; app = a; isAdmin = false;
  }
  const db = () => app.database();
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const r2 = v => Math.round(v * 100) / 100;
  const TS = () => firebase.database.ServerValue.TIMESTAMP;

  // 구독을 모아 두었다가 한 번에 끊기 (ref.off()는 자식 위치 구독을 못 끊어서, 나간 뒤에도 옛 구독이 남던 문제)
  function subs() {
    const list = [];
    return { on(ref, ev, cb) { ref.on(ev, cb); list.push([ref, ev, cb]); return cb; }, off() { for (const [r, e, c] of list.splice(0)) r.off(e, c); } };
  }

  // ── WebRTC: 방장 쪽 연결 하나 (친구 한 명). 통로 두 개: g = 매 틱 상태(늦은 건 버림), r = 2초마다 전체 맞춤(크니까 꼭 도착하게)
  function hostPeer(room, uid, onMsg) {
    const pc = new RTCPeerConnection(ICE);
    const dc = pc.createDataChannel("g", { ordered: false, maxRetransmits: 0 });
    const rc = pc.createDataChannel("r", { ordered: true });
    const ref = room.child(`rtc/${uid}`), S = subs(), born = performance.now();
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_h").push(JSON.stringify(e.candidate)); };
    const recv = e => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
    dc.onmessage = recv; rc.onmessage = recv;
    (async () => {
      await ref.remove();
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      await ref.child("offer").set(JSON.stringify(pc.localDescription));
      S.on(ref.child("answer"), "value", async s => { if (s.exists() && !pc.currentRemoteDescription) { try { await pc.setRemoteDescription(JSON.parse(s.val())); } catch (_) {} } });
      S.on(ref.child("ice_c"), "child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
    })().catch(() => {});
    const age = () => performance.now() - born;
    return {
      dc, pc, open: () => dc.readyState === "open",
      sendSync(o) { const ch = rc.readyState === "open" ? rc : dc; if (ch.readyState === "open" && ch.bufferedAmount < 256e3) ch.send(JSON.stringify(o)); },
      // 다시 붙여야 하나: 연결이 실패·끊김이고 만든 지 8초가 지났거나, 20초가 지나도 안 열렸으면 (너무 자주 새로 만들지 않게)
      dead: () => age() > 8000 && (["failed", "closed", "disconnected"].includes(pc.connectionState) || dc.readyState === "closed" || (dc.readyState !== "open" && age() > 20000)),
      close() { S.off(); try { dc.close(); rc.close(); pc.close(); } catch (_) {} },
    };
  }
  // ── WebRTC: 친구 쪽. 방장이 새 연결 제안(offer)을 올리면 onRenew 로 알려서 새로 만들게 함
  function clientPeer(room, uid, onMsg, onOpen, onRenew) {
    const pc = new RTCPeerConnection(ICE);
    let dc = null, applied = null;
    const ref = room.child(`rtc/${uid}`), S = subs();
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_c").push(JSON.stringify(e.candidate)); };
    pc.ondatachannel = e => {
      const ch = e.channel;
      ch.onmessage = m => { try { onMsg(JSON.parse(m.data)); } catch (_) {} };
      if (ch.label === "g") { dc = ch; dc.onopen = () => onOpen && onOpen(); }
    };
    S.on(ref.child("offer"), "value", async s => {
      if (!s.exists()) return;
      if (applied) { if (s.val() !== applied && onRenew) onRenew(); return; }
      applied = s.val();
      try {
        await pc.setRemoteDescription(JSON.parse(applied));
        const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
        await ref.child("answer").set(JSON.stringify(pc.localDescription));
      } catch (_) {}
    });
    S.on(ref.child("ice_h"), "child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
    return { send: o => { if (dc && dc.readyState === "open") { dc.send(JSON.stringify(o)); return true; } return false; }, open: () => !!dc && dc.readyState === "open", close() { S.off(); try { pc.close(); } catch (_) {} } };
  }

  // ── 방장
  async function host(settings, sim, hooks) {
    await init();
    let code;
    for (let i = 0; i < 5; i++) { code = code4(); if (!(await db().ref(`snake/rooms/${code}/meta`).get()).exists()) break; }
    const room = db().ref(`snake/rooms/${code}`), S = subs();
    let meta = { host: user.uid, created: Date.now(), ai: settings.ai, v: 2, phase: "lobby", cfg: settings.cfg || null };   // 처음엔 대기실
    let mine = { name: settings.name, hue: settings.hue, helper: !!settings.helper };
    await room.child("meta").set(meta);
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set(mine);
    // 방 목록 색인 (방 전체를 읽으면 게임 상태까지 받아서 무거움 → 이름·인원만 따로)
    const idx = db().ref(`snake/index/${code}`);
    let nPlayers = 1;
    const writeIdx = () => idx.set({ h: mine.name, n: nPlayers, ph: meta.phase, m: (meta.cfg && meta.cfg.m) || "free", t: TS() }).catch(() => {});
    idx.onDisconnect().remove(); writeIdx();
    // 방장 인터넷이 잠깐 끊겨 방이 지워졌다가 다시 연결되면: 방 정보와 내 자리를 다시 써 둠 (친구들은 자기 자리를 스스로 다시 씀)
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) { room.child("meta").set(meta).then(writeIdx).catch(() => {}); room.child(`players/${user.uid}`).set(mine).catch(() => {}); room.onDisconnect().remove(); idx.onDisconnect().remove(); }
      conn = c; hooks.conn && hooks.conn(c);
    });
    const peers = new Map();                                                // uid → WebRTC 연결
    const onPeerMsg = uid => m => {
      if (m.t === "i" || (m.t !== "p" && "rs" in m && "b" in m)) { const tg = m.t === "i" ? m.tg : m.t; const v = unpackInput({ ...m, t: Array.isArray(tg) ? tg : null });   // 예전 페이지(종류 표시 없음)도 받음   // 종류 표시(t)와 조준(tg)을 나눔 — 전엔 조준 값이 t를 덮어써서 직접 연결 친구의 입력이 무시됐음
      if (sim) sim.inputs[uid] = v; hooks.input && hooks.input(uid, v); }
      else if (m.t === "p") { const p = peers.get(uid); if (p && p.open()) p.dc.send(JSON.stringify({ t: "q", c: m.c })); }
    };
    const newPeer = uid => { const old = peers.get(uid); if (old) old.close(); if (window.RTCPeerConnection) peers.set(uid, hostPeer(room, uid, onPeerMsg(uid))); };
    S.on(room.child("players"), "child_added", snap => {
      if (snap.key === user.uid) return;
      hooks.join(snap.key, snap.val());
      newPeer(snap.key);
    });
    S.on(room.child("players"), "child_changed", snap => { if (snap.key !== user.uid) hooks.update && hooks.update(snap.key, snap.val()); });
    S.on(room.child("players"), "value", snap => { const v = snap.val() || {}; const k = Object.keys(v).length; if (k && k !== nPlayers) { nPlayers = k; writeIdx(); } hooks.players && hooks.players(v); });   // 대기실 참가자 목록
    S.on(room.child("players"), "child_removed", snap => { if (snap.key === user.uid) return; hooks.leave(snap.key); const p = peers.get(snap.key); if (p) { p.close(); peers.delete(snap.key); } });
    // 방장 자신의 입력 자리는 절대 덮어쓰지 않음 (같은 계정으로 다른 기기가 들어오면 방장 지렁이가 멈추던 문제)
    S.on(room.child("inputs"), "child_added", snap => { if (sim && snap.key !== user.uid) sim.inputs[snap.key] = unpackInput(snap.val()); });
    S.on(room.child("inputs"), "child_changed", snap => { if (snap.key === user.uid) return; const v = unpackInput(snap.val()); if (sim) sim.inputs[snap.key] = v; hooks.input && hooks.input(snap.key, v); });
    S.on(room.child("chat").limitToLast(50), "child_added", s => hooks.chat && hooks.chat(s.val()));
    // 끊긴 직접 연결은 3초마다 살펴서 다시 붙임 (그동안은 Realtime DB로 이어짐)
    const healT = setInterval(() => { for (const [uid, p] of peers) if (p.dead()) newPeer(uid); }, 3000);
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
      setSim(next) { sim = next; n = 0; prevHead.clear(); },               // 새 판(라운드 다시 시작) · null = 대기실
      // 매 틱 호출: 직접 연결된 친구에겐 매 틱, 아직 안 된 친구가 있으면 두 틱마다 Realtime DB에도
      tick() {
        if (!sim) return;                                                   // 대기실: 보낼 판이 없음
        n++;
        const st = stateMsg();
        const sync = n % 30 === 1 ? syncMsg() : null;
        let anyRelay = false;
        for (const [uid, p] of peers) {
          if (p.open()) { p.dc.send(JSON.stringify({ t: "s", ...st })); if (sync) p.sendSync({ t: "y", ...sync }); }
          else anyRelay = true;
        }
        if (peers.size === 0 || anyRelay) {
          if (n % 2 === 0 || sync) { const up = { state: st }; if (sync) up.sync = sync; room.update(up).catch(() => {}); }
        }
        for (const x of sim.snakes) prevHead.set(x.id, x.head);
        // 직접 연결 상태를 방에 기록 (메뉴의 연결 표시용)
        if (n % 40 === 0) for (const [uid, p] of peers) room.child(`players/${uid}/p2p`).set(p.open() ? 1 : 0).catch(() => {});
      },
      peers: () => [...peers].map(([uid, p]) => [uid, p.open()]),
      get connected() { return conn; },
      setPhase(phase, cfg) { meta = { ...meta, phase, cfg: cfg || null }; writeIdx(); return room.child("meta").update({ phase, cfg: cfg || null }); },   // 대기실 ↔ 게임 (친구들 화면도 따라 바뀜)
      setMe(p) { mine = { ...mine, ...p }; if (p.name) writeIdx(); return room.child(`players/${user.uid}`).update(p); },     // 대기실에서 이름·색 바꾸기
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() { clearInterval(healT); S.off(); for (const p of peers.values()) p.close(); room.onDisconnect().cancel(); idx.onDisconnect().cancel(); room.remove(); idx.remove(); },
    };
  }
  const unpackInput = v => v ? { target: v.t ? [v.t[0], v.t[1]] : null, aim: v.a != null ? v.a : null, boost: !!v.b, turn: v.r || 0, respawn: v.rs || 0, at: v.at || 0 } : {};

  // ── 친구 (참가자)
  async function join(code, settings, handlers) {
    await init();
    let room = db().ref(`snake/rooms/${code}`);
    const S = subs();
    const meta = (await room.child("meta").get()).val();
    if (!meta) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    const seated = (await room.child(`players/${user.uid}`).get()).exists();
    if (meta.host === user.uid || seated) { await separateIdentity(); room = db().ref(`snake/rooms/${code}`); }
    const onMsg = m => { if (m.t === "s") handlers.state(m); else if (m.t === "y") handlers.sync(m); else if (m.t === "q") rtt = rtt ? rtt * 0.8 + (performance.now() - m.c) * 0.2 : performance.now() - m.c; };
    let rtt = 0, peer = null, left = false;
    let mine = { name: settings.name, hue: settings.hue, helper: !!settings.helper };
    const newPeer = () => { if (peer) peer.close(); peer = window.RTCPeerConnection ? clientPeer(room, user.uid, onMsg, () => handlers.p2p && handlers.p2p(true), () => setTimeout(newPeer, 0)) : null; };
    // 내 자리 쓰기 + 끊기면 지워지게 예약 (다시 연결될 때마다 다시)
    const seat = () => {
      if (left) return Promise.resolve();
      room.child(`players/${user.uid}`).onDisconnect().remove();
      room.child(`inputs/${user.uid}`).onDisconnect().remove();
      room.child(`rtc/${user.uid}`).onDisconnect().remove();
      return room.child(`players/${user.uid}`).set(mine);
    };
    newPeer();
    await seat();
    S.on(room.child("state"), "value", s => { if (s.exists() && !(peer && peer.open())) handlers.state(s.val()); });
    S.on(room.child("sync"), "value", s => { if (s.exists() && !(peer && peer.open())) handlers.sync(s.val()); });
    // 방이 잠깐 사라져도(방장 인터넷 끊김) 바로 끝내지 않고 20초 기다림
    let goneT = null;
    S.on(room.child("meta"), "value", s => {
      if (!s.exists()) { if (!goneT) goneT = setTimeout(() => { if (!left) handlers.closed(); }, 20000); handlers.conn && handlers.conn(false, "방장 연결을 기다리는 중"); return; }
      if (goneT) { clearTimeout(goneT); goneT = null; handlers.conn && handlers.conn(true, ""); }
      handlers.meta && handlers.meta(s.val());
    });
    // 내 자리가 없어졌으면(내 인터넷이 끊겨 서버가 뺐거나, 방이 다시 만들어짐) 다시 앉음
    let reseatT = null;
    S.on(room.child("players"), "value", s => {
      const v = s.val() || {};
      if (!left && s.exists() && !v[user.uid] && !reseatT) reseatT = setTimeout(() => { reseatT = null; seat().catch(() => {}); newPeer(); }, 800);
      handlers.players && handlers.players(v);
    });
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) { seat().catch(() => {}); if (!(peer && peer.open())) newPeer(); }
      conn = c; handlers.conn && handlers.conn(c, c ? "" : "인터넷 연결이 끊겼어요");
    });
    S.on(room.child("chat").limitToLast(50), "child_added", s => handlers.chat && handlers.chat(s.val()));
    const pingT = setInterval(() => { if (peer && peer.open()) peer.send({ t: "p", c: performance.now() }); }, 1000);
    let last = "", lastAt = 0, pending = null;
    function sendInput(inp) {
      const v = { t: inp.target ? [r2(inp.target[0]), r2(inp.target[1])] : null, a: inp.aim != null ? r2(inp.aim) : null, b: inp.boost ? 1 : 0, r: inp.turn || 0, rs: inp.respawn || 0 };
      const key = JSON.stringify(v), now = performance.now();
      if (peer && peer.open()) {                                             // 직접 연결: 바뀌면 바로, 안 바뀌어도 0.2초마다 (늦게 온 건 버리는 통로라서)
        if (key !== last || now - lastAt > 200) { peer.send({ ...v, t: "i", tg: v.t }); last = key; lastAt = now; }
        return;
      }
      if (key === last && now - lastAt < 1000) return;
      if (now - lastAt < 66) { pending = inp; return; }                         // Realtime DB: 초당 15번까지만
      last = key; lastAt = now; pending = null;
      room.child(`inputs/${user.uid}`).set({ ...v, at: TS() }).catch(() => {});
    }
    const pendT = setInterval(() => { if (pending) sendInput(pending); }, 70);
    return {
      code, meta, sendInput,
      setMe(p) { mine = { ...mine, ...p }; return room.child(`players/${user.uid}`).update(p); },
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      get p2p() { return !!(peer && peer.open()); }, get rtt() { return rtt; }, get connected() { return conn; },
      leave() {
        left = true; clearInterval(pingT); clearInterval(pendT); clearTimeout(goneT); clearTimeout(reseatT); S.off(); if (peer) peer.close();
        room.child(`players/${user.uid}`).remove(); room.child(`inputs/${user.uid}`).remove(); room.child(`rtc/${user.uid}`).remove();
      },
    };
  }

  // ── 방 목록: 색인 + 방마다 참가자(작음)와 방장 확인 → 비었거나 방장이 없으면 '빈 방'
  async function listRooms() {
    await init();
    const idx = (await db().ref("snake/index").get()).val() || {};
    const codes = Object.keys(idx).slice(0, 40);
    const rows = await Promise.all(codes.map(async code => {
      const [m, p] = await Promise.all([db().ref(`snake/rooms/${code}/meta/host`).get(), db().ref(`snake/rooms/${code}/players`).get()]);
      const host = m.val(), players = p.val() || {};
      return { code, ...idx[code], host, players, n: Object.keys(players).length, empty: !host || !players[host] };
    }));
    return rows.sort((a, b) => (a.empty - b.empty) || ((b.t || 0) - (a.t || 0)));
  }
  // 빈 방 지우기 (규칙: 방장이거나, 방에 아무도 없거나 방장이 나간 방만)
  async function deleteRoom(code) {
    await init();
    await db().ref(`snake/rooms/${code}`).remove().catch(() => {});
    return db().ref(`snake/index/${code}`).remove();
  }

  // ── 감지 기록 (관리자만 읽기)
  function report(roomKey, uid, part, data) { if (!app) return; db().ref(`snake/ac/${roomKey}/${uid}/${part}`).set({ ...data, t: TS() }).catch(() => {}); }
  function watchReports(cb) { db().ref("snake/ac").limitToLast(30).on("value", s => cb(s.val() || {}), e => cb({ __error: e.message })); }
  function watchRooms(cb) { db().ref("snake/rooms").on("value", s => { const v = s.val() || {}; cb(Object.fromEntries(Object.entries(v).map(([k, r]) => [k, { meta: r.meta, players: r.players }]))); }); }
  function clearReports() { return db().ref("snake/ac").remove(); }

  return { init, adminLogin, host, join, listRooms, deleteRoom, report, watchReports, watchRooms, clearReports, get uid() { return user && user.uid; }, get isAdmin() { return isAdmin; }, get ready() { return !!app; } };
})();
