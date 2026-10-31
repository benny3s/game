/* 스타 대결 — 네트워크 (지렁이 net.js 와 같은 방식)
   · 방장 = 회원님 PC의 localhost 페이지. 엔진 서버(127.0.0.1)와 친구들 사이를 이어 줌
   · 친구 ↔ 방장: WebRTC 직접 연결(상태는 늦은 건 버리는 통로, 명령은 꼭 도착하는 통로), 안 되면 Realtime DB로
   · 방 = sc/rooms/{코드}: meta(방장·단계·판 종류·카운트다운), players(이름·색·팀), chat, rtc, state·cmds(직접 연결 안 될 때) */
const NET = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  let ICE = { iceServers: STUN };
  // 🔁 TURN 중계 (common/arena.js 와 같은 Cloudflare Worker · 같은 저장 칸): 직접 연결이 막혀도 서울 중계로
  const TURN_URL = "https://benny-turn.benny3s.workers.dev/";
  async function loadIce() {
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
  let app = null, loading = null, user = null;
  const load = src => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  async function init(separate) {
    if (app) return app;
    if (loading) return loading;
    loading = (async () => {
      if (!window.firebase) await load(SDK + "firebase-app-compat.js");                      // 이미 있으면 다시 안 불러옴 (다시 부르면 앱이 초기화됨)
      await Promise.all([!firebase.auth && "firebase-auth-compat.js", !firebase.database && "firebase-database-compat.js"].filter(Boolean).map(f => load(SDK + f)));
      // 탭마다 따로 된 임시 계정 (같은 PC에서 방장·친구 시험, 같은 관리자 계정 겹침 방지)
      app = firebase.initializeApp(FB, "sc" + Math.random().toString(36).slice(2, 8));
      loadIce();                                                              // 방에 들어가기 전에 끝나 있으면 TURN 도 씀
      await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
      user = (await app.auth().signInAnonymously()).user;
      return app;
    })();
    return loading;
  }
  const db = () => app.database();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  function subs() { const l = []; return { on(r, e, c) { r.on(e, c); l.push([r, e, c]); return c; }, off() { for (const [r, e, c] of l.splice(0)) r.off(e, c); } }; }

  // ── WebRTC 방장 쪽 (친구 한 명): g = 상태(늦은 건 버림), r = 명령·소유·채팅 알림(꼭 도착)
  function hostPeer(room, uid, onMsg) {
    const pc = new RTCPeerConnection(ICE);
    const dc = pc.createDataChannel("g", { ordered: false, maxRetransmits: 0 }), rc = pc.createDataChannel("r", { ordered: true });
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
      open: () => dc.readyState === "open",
      fast(o) { if (dc.readyState === "open" && dc.bufferedAmount < 64e3) dc.send(typeof o === "string" ? o : JSON.stringify(o)); },
      sure(o) { const ch = rc.readyState === "open" ? rc : dc; if (ch.readyState === "open") ch.send(JSON.stringify(o)); },
      dead: () => age() > 8000 && (["failed", "closed", "disconnected"].includes(pc.connectionState) || dc.readyState === "closed" || (dc.readyState !== "open" && age() > 20000)),
      close() { S.off(); try { dc.close(); rc.close(); pc.close(); } catch (_) {} },
    };
  }
  function clientPeer(room, uid, onMsg, onRenew) {
    const pc = new RTCPeerConnection(ICE);
    let dc = null, rc = null, applied = null;
    const ref = room.child(`rtc/${uid}`), S = subs();
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_c").push(JSON.stringify(e.candidate)); };
    pc.ondatachannel = e => { const ch = e.channel; ch.onmessage = m => { try { onMsg(JSON.parse(m.data)); } catch (_) {} }; if (ch.label === "g") dc = ch; else rc = ch; };
    S.on(ref.child("offer"), "value", async s => {
      if (!s.exists()) return;
      if (applied) { if (s.val() !== applied) onRenew(); return; }
      applied = s.val();
      try { await pc.setRemoteDescription(JSON.parse(applied)); const a = await pc.createAnswer(); await pc.setLocalDescription(a); await ref.child("answer").set(JSON.stringify(pc.localDescription)); } catch (_) {}
    });
    S.on(ref.child("ice_h"), "child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
    return {
      open: () => !!dc && dc.readyState === "open",
      fast(o) { if (dc && dc.readyState === "open") { dc.send(JSON.stringify(o)); return true; } return false; },
      sure(o) { const ch = rc && rc.readyState === "open" ? rc : dc; if (ch && ch.readyState === "open") { ch.send(JSON.stringify(o)); return true; } return false; },
      close() { S.off(); try { pc.close(); } catch (_) {} },
    };
  }

  // ── 방장
  async function host(me, hooks) {
    await init();
    let code;
    for (let i = 0; i < 5; i++) { code = code4(); if (!(await db().ref(`sc/rooms/${code}/meta`).get()).exists()) break; }
    const room = db().ref(`sc/rooms/${code}`), S = subs();
    let meta = { host: user.uid, created: Date.now(), phase: "lobby", scn: me.scn || "corsair", cd: 0 };
    let mine = { name: me.name, hue: me.hue, team: 0 };
    await room.child("meta").set(meta);
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set(mine);
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) { room.child("meta").set(meta).catch(() => {}); room.child(`players/${user.uid}`).set(mine).catch(() => {}); room.onDisconnect().remove(); }
      conn = c; hooks.conn && hooks.conn(c);
    });
    const peers = new Map();
    const newPeer = uid => { const o = peers.get(uid); if (o) o.close(); peers.set(uid, hostPeer(room, uid, m => hooks.msg(uid, m))); };
    S.on(room.child("players"), "child_added", s => { if (s.key !== user.uid) { newPeer(s.key); hooks.join && hooks.join(s.key, s.val()); } });
    S.on(room.child("players"), "child_removed", s => { if (s.key === user.uid) return; const p = peers.get(s.key); if (p) { p.close(); peers.delete(s.key); } hooks.leave && hooks.leave(s.key); });
    S.on(room.child("players"), "value", s => hooks.players(s.val() || {}));
    S.on(room.child("chat").limitToLast(60), "child_added", s => hooks.chat(s.val()));
    S.on(room.child("cmds"), "child_added", s => { const v = s.val(); s.ref.remove(); if (v && v.u) hooks.msg(v.u, v.m); });   // 직접 연결 안 된 친구의 명령
    const healT = setInterval(() => { for (const [uid, p] of peers) if (p.dead()) newPeer(uid); }, 3000);
    let relayN = 0;
    return {
      code, uid: user.uid,
      // 상태 보내기: 직접 연결된 친구는 매번, 아닌 친구가 있으면 Realtime DB에 두 번에 한 번
      state(str) {
        let relay = false;
        for (const p of peers.values()) { if (p.open()) p.fast(str); else relay = true; }
        if (relay && ++relayN % 2 === 0) room.child("state").set(str).catch(() => {});
      },
      sure(uid, o) { const p = peers.get(uid); if (p && p.open()) p.sure(o); else room.child(`note/${uid}`).set(JSON.stringify(o)).catch(() => {}); },
      sureAll(o) { for (const uid of peers.keys()) this.sure(uid, o); },
      peers: () => [...peers].map(([uid, p]) => [uid, p.open()]),
      setMeta(p) { meta = { ...meta, ...p }; return room.child("meta").update(p); },
      setMe(p) { mine = { ...mine, ...p }; return room.child(`players/${user.uid}`).update(p); },
      setPlayer(uid, p) { return room.child(`players/${uid}`).update(p); },
      chat(t) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(t).slice(0, 120), t: TS() }); },
      get connected() { return conn; },
      leave() { clearInterval(healT); S.off(); for (const p of peers.values()) p.close(); room.onDisconnect().cancel(); room.remove(); },
    };
  }

  // ── 친구
  async function join(code, me, handlers) {
    await init();
    const room = db().ref(`sc/rooms/${code}`), S = subs();
    const meta = (await room.child("meta").get()).val();
    if (!meta) throw new Error("그런 방이 없어요. 방장이 PC에서 게임을 열어 둔 동안만 들어올 수 있어요.");
    let peer = null, left = false, mine = { name: me.name, hue: me.hue, team: me.team ?? 1 };
    const onMsg = m => handlers.msg(m);
    const newPeer = () => { if (peer) peer.close(); peer = clientPeer(room, user.uid, onMsg, () => setTimeout(newPeer, 0)); };
    const seat = () => {
      if (left) return Promise.resolve();
      ["players", "rtc", "note"].forEach(k => room.child(`${k}/${user.uid}`).onDisconnect().remove());
      return room.child(`players/${user.uid}`).set(mine);
    };
    newPeer(); await seat();
    S.on(room.child("state"), "value", s => { if (s.exists() && !(peer && peer.open())) { try { handlers.msg(JSON.parse(s.val())); } catch (_) {} } });
    S.on(room.child(`note/${user.uid}`), "value", s => { if (s.exists()) { try { handlers.msg(JSON.parse(s.val())); } catch (_) {} } });
    let goneT = null;
    S.on(room.child("meta"), "value", s => {
      if (!s.exists()) { if (!goneT) goneT = setTimeout(() => { if (!left) handlers.closed(); }, 20000); handlers.conn && handlers.conn(false, "방장 연결을 기다리는 중"); return; }
      if (goneT) { clearTimeout(goneT); goneT = null; handlers.conn && handlers.conn(true); }
      handlers.meta(s.val());
    });
    let reseatT = null;
    S.on(room.child("players"), "value", s => {
      const v = s.val() || {};
      if (!left && s.exists() && !v[user.uid] && !reseatT) reseatT = setTimeout(() => { reseatT = null; seat().catch(() => {}); newPeer(); }, 800);
      if (v[user.uid]) mine = { ...mine, ...v[user.uid] };
      handlers.players(v);
    });
    S.on(room.child("chat").limitToLast(60), "child_added", s => handlers.chat(s.val()));
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn) { seat().catch(() => {}); if (!(peer && peer.open())) newPeer(); }
      conn = c; handlers.conn && handlers.conn(c, c ? "" : "인터넷 연결이 끊겼어요");
    });
    return {
      code, uid: user.uid, meta,
      send(o) { if (!(peer && peer.sure(o))) room.child("cmds").push({ u: user.uid, m: o }).catch(() => {}); },   // 명령: 꼭 도착하게
      ping(o) { return peer && peer.fast(o); },
      get p2p() { return !!(peer && peer.open()); }, get connected() { return conn; },
      setMe(p) { mine = { ...mine, ...p }; return room.child(`players/${user.uid}`).update(p); },
      chat(t) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(t).slice(0, 120), t: TS() }); },
      leave() { left = true; clearTimeout(goneT); clearTimeout(reseatT); S.off(); if (peer) peer.close(); ["players", "rtc", "note"].forEach(k => room.child(`${k}/${user.uid}`).remove()); },
    };
  }
  return { db: () => app && app.database(), host, join, get uid() { return user && user.uid; } };
})();
