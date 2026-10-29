/* 게임 공통 '친구랑' 온라인 방 (냥냥 배구·땅따먹기·오목 …) — snake/net.js 방식을 어느 게임이나 쓰게 일반화
   · Firebase(benny-meeting 기본 앱, 지렁이·냥도쿠와 같은 로그인) = 방 목록·대기실·연결 소개, 그리고 직접 연결이 안 될 때의 대체 통로
   · 방: arena/{게임}/rooms/{코드}
       meta(방장만: 단계 lobby/play·설정·최대 인원) · players/{uid}(본인·방장) · rtc/{uid}(WebRTC 연결 소개)
       up/{uid}(친구 → 방장, 최신 값 하나) · upq(친구 → 방장, 꼭 전할 것 줄) · down(방장 → 모두, 최신 값) · downq(방장 → 모두, 꼭 전할 것 줄)
       shared(방장이 쓰는 게임 기록 — 오목 수순처럼 나중에 들어온 사람도 읽어야 하는 것) · chat
     목록 색인: arena/{게임}/index/{코드} (방장 이름·인원·단계만 — 방 전체를 읽으면 무거움)
   · 게임 데이터는 WebRTC 직접 연결(방장 ↔ 친구): 통로 g = 늦으면 버림(매 틱 상태·입력), r = 꼭 도착·순서대로(득점·수 두기)
     직접 연결이 안 되는 네트워크면 RTDB 로 자동 대체 (최신 값은 초당 10~15번까지)
   · ?guest 이면 탭마다 다른 익명 계정 + test/arena 아래를 씀 (한 컴퓨터에서 여러 명 시험, 실제 방 목록을 안 더럽힘)
   쓰는 법: const h = await Arena.host("volley", { name, cfg, max: 2 }); h.on("msg", (uid, m) => …); h.broadcast({ t: "s", … });
           const c = await Arena.join("volley", "ABCD", { name }); c.on("msg", m => …); c.send({ t: "i", b: 5 });
   이벤트(on): host → join(uid,p) leave(uid) players(전체) msg(uid,m) p2p(uid,열림) conn(연결됨) chat(m) meta(meta)
              guest → msg(m) meta(meta) players(전체) p2p(열림) conn(연결됨, 까닭) closed() kicked() chat(m)
   players·meta 는 나중에 on 해도 마지막 값을 바로 한 번 받음
   게임 기록: h.setShared(키, 값) (방장만) · watchShared(키, cb) (모두, 나중에 들어와도 지금 값부터)
   시험: ?mock + common/arena-mock.js 를 먼저 넣으면 Firebase 없이 같은 브라우저 탭끼리 (지연 흉내 ?mock=80) */
const Arena = (() => {
  const FB = {
    apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting",
    storageBucket: "benny-meeting.firebasestorage.app", messagingSenderId: "925758544707", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6",
    databaseURL: "https://benny-meeting-default-rtdb.asia-southeast1.firebasedatabase.app",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
  const GUEST = new URLSearchParams(location.search).has("guest");
  const ROOT = GUEST ? "test/arena/" : "arena/";
  let app = null, loading = null, user = null, offset = 0;
  const load = src => new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  const watchOffset = () => app.database().ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });

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
      user = await new Promise(ok => { const t = setTimeout(() => ok(null), 8000); const off = app.auth().onAuthStateChanged(u => { clearTimeout(t); off(); ok(u); }); });
      if (!user) user = (await app.auth().signInAnonymously()).user;
      watchOffset();
      return app;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }
  // 같은 계정으로 같은 방에 또 들어오면(관리자로 PC·휴대폰 둘 다 등) 한 사람으로 겹치므로, 이 탭만 임시 계정
  async function separateIdentity() {
    app = firebase.initializeApp(FB, "tab" + Math.random().toString(36).slice(2, 8));
    await app.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    user = (await app.auth().signInAnonymously()).user;
    watchOffset();
  }
  const db = () => app.database();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const now = () => Date.now() + offset;                                     // 서버 시계 (카운트다운을 모두 같게)
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const cleanCode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

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

  // ── WebRTC: 방장 쪽 연결 하나 (친구 한 명). g = 늦은 건 버림, r = 꼭 도착
  function hostPeer(room, uid, onMsg, onOpen) {
    const pc = new RTCPeerConnection(ICE);
    const dc = pc.createDataChannel("g", { ordered: false, maxRetransmits: 0 });
    const rc = pc.createDataChannel("r", { ordered: true });
    const ref = room.child(`rtc/${uid}`), S = subs(), born = performance.now();
    pc.onicecandidate = e => { if (e.candidate) ref.child("ice_h").push(JSON.stringify(e.candidate)); };
    const recv = e => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
    dc.onmessage = recv; rc.onmessage = recv;
    dc.onopen = () => onOpen && onOpen(true); dc.onclose = () => onOpen && onOpen(false);
    (async () => {
      await ref.remove();
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      await ref.child("offer").set(JSON.stringify(pc.localDescription));
      S.on(ref.child("answer"), "value", async s => { if (s.exists() && !pc.currentRemoteDescription) { try { await pc.setRemoteDescription(JSON.parse(s.val())); } catch (_) {} } });
      S.on(ref.child("ice_c"), "child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
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
    const ref = room.child(`rtc/${uid}`), S = subs();
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
        await pc.setRemoteDescription(JSON.parse(applied));
        const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
        await ref.child("answer").set(JSON.stringify(pc.localDescription));
      } catch (_) {}
    });
    S.on(ref.child("ice_h"), "child_added", s => { pc.addIceCandidate(JSON.parse(s.val())).catch(() => {}); });
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
    await init();
    const base = db().ref(ROOT + game);
    let code;
    for (let i = 0; i < 6; i++) { code = code4(); if (!(await base.child(`rooms/${code}/meta`).get()).exists()) break; }
    const room = base.child(`rooms/${code}`), idx = base.child(`index/${code}`), S = subs(), E = emitter(["players", "meta"]);
    let meta = { host: user.uid, created: Date.now(), phase: "lobby", cfg: settings.cfg || null, max: settings.max || 2, v: 1 };
    let mine = { name: String(settings.name || "방장").slice(0, 12), ...(settings.me || {}) };
    const label = settings.label || (() => "");
    let players = {}, closed = false;
    await room.child("meta").set(meta);
    room.onDisconnect().remove();
    await room.child(`players/${user.uid}`).set({ ...mine, t: TS() });
    const writeIdx = () => idx.set({ h: mine.name, n: Object.keys(players).length || 1, max: meta.max, ph: meta.phase, m: String(label(meta.cfg) || "").slice(0, 40), t: TS() }).catch(() => {});
    idx.onDisconnect().remove(); writeIdx();
    E.emit("meta", meta);
    // 방장 인터넷이 잠깐 끊겨 방이 지워졌다가 다시 연결되면: 방 정보와 내 자리를 다시 써 둠 (친구들은 스스로 다시 앉음)
    let conn = true;
    S.on(db().ref(".info/connected"), "value", s => {
      const c = s.val() === true;
      if (c && !conn && !closed) { room.child("meta").set(meta).then(writeIdx).catch(() => {}); room.child(`players/${user.uid}`).set({ ...mine, t: TS() }).catch(() => {}); room.onDisconnect().remove(); idx.onDisconnect().remove(); }
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
      else { downPending = m; if (!downT) downT = setTimeout(flushDown, Math.max(0, 100 - (performance.now() - downAt))); }
    }
    return {
      code, isHost: true, get uid() { return user.uid; }, get meta() { return meta; }, get players() { return players; }, get connected() { return conn; },
      on: E.on,
      // 모두에게: rel=true 면 꼭 도착(순서대로), 아니면 늦으면 버림. 직접 연결 안 된 친구가 있으면 RTDB 로도
      broadcast(m, rel = false) {
        if (rel) m = { ...m, _q: ++qseq };
        let relay = false;
        for (const uid of Object.keys(players)) { if (uid === user.uid) continue; const p = peers.get(uid); if (!(p && p.send(m, rel))) relay = true; }
        if (relay) { if (rel) pushQ(m); else { downPending = m; if (!downT) downT = setTimeout(flushDown, Math.max(0, 100 - (performance.now() - downAt))); } }
      },
      send(uid, m, rel = false) { if (rel) m = { ...m, _q: ++qseq }; sendTo(uid, m, rel); },
      peers: () => [...peers].map(([uid, p]) => [uid, p.open()]),
      get relaying() { return needRelay(); },
      setPhase(phase, cfg) { meta = { ...meta, phase, cfg: cfg === undefined ? meta.cfg : cfg }; writeIdx(); E.emit("meta", meta); return room.child("meta").update({ phase, cfg: meta.cfg }); },
      setMeta(p) { meta = { ...meta, ...p }; writeIdx(); E.emit("meta", meta); return room.child("meta").update(p); },
      setMe(p) { mine = { ...mine, ...p }; if (p.name) writeIdx(); return room.child(`players/${user.uid}`).update(p); },
      setPlayer(uid, p) { return room.child(`players/${uid}`).update(p); },     // 자리·팀 정하기 (방장만)
      kick(uid) { return room.child(`players/${uid}`).remove(); },
      // 게임 기록(오목 수순처럼 나중에 들어온 사람도 읽어야 하는 것): 방장만 씀, 모두 읽음
      setShared(key, value) { return room.child("shared/" + key).set(value === undefined ? null : value); },
      watchShared(key, cb) { S.on(room.child("shared/" + key), "value", s => cb(s.val())); },
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() {
        if (closed) return; closed = true;
        clearInterval(healT); clearTimeout(downT); S.off(); E.clear(); for (const p of peers.values()) p.close(); peers.clear();
        room.onDisconnect().cancel(); idx.onDisconnect().cancel(); room.remove().catch(() => {}); idx.remove().catch(() => {});
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
    if (meta0.host === user.uid || seated) { await separateIdentity(); room = db().ref(`${ROOT}${game}/rooms/${code}`); }
    else if (Object.keys(pl).length >= (meta0.max || 2) && !settings.watch) throw new Error(`방이 꽉 찼어요 (최대 ${meta0.max || 2}명)`);
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
    const seat = () => {
      if (left) return Promise.resolve();
      for (const k of ["players", "up", "rtc"]) room.child(`${k}/${user.uid}`).onDisconnect().remove();
      return room.child(`players/${user.uid}`).set({ ...mine, t: TS() });
    };
    newPeer();
    await seat();
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
        if (wasSeated && conn && players[meta.host]) { E.emit("kicked"); }
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
      chat(text) { return room.child("chat").push({ u: user.uid, n: mine.name, m: String(text).slice(0, 120), t: TS() }); },
      leave() {
        if (left) return; left = true;
        clearInterval(pingT); clearTimeout(goneT); clearTimeout(reseatT); clearTimeout(upT); S.off(); E.clear(); if (peer) peer.close();
        for (const k of ["players", "up", "rtc"]) room.child(`${k}/${user.uid}`).remove().catch(() => {});
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
      return { code, ...idx[code], n: Object.keys(players).length, max: (meta && meta.max) || idx[code].max || 2, ph: (meta && meta.phase) || idx[code].ph, empty: !meta || !players[meta.host] };
    }));
    return rows.sort((a, b) => (a.empty - b.empty) || ((b.t || 0) - (a.t || 0)));
  }
  async function deleteRoom(game, code) {
    await init();
    const base = db().ref(ROOT + game);
    await base.child(`rooms/${code}`).remove().catch(() => {});
    return base.child(`index/${code}`).remove();
  }
  const inviteUrl = code => location.origin + location.pathname + "?room=" + code + (GUEST ? "&guest" : "") + (MOCK ? "&mock" : "");
  const roomFromUrl = () => cleanCode(new URLSearchParams(location.search).get("room")) || null;

  // ?mock (시험 전용): Firebase 대신 같은 브라우저 탭끼리 BroadcastChannel 로 (common/arena-mock.js 를 먼저 넣었을 때만)
  const MOCK = new URLSearchParams(location.search).has("mock");
  if (MOCK && window.ArenaMock) return window.ArenaMock({ inviteUrl, roomFromUrl, cleanCode });
  return { init, host, join, listRooms, deleteRoom, inviteUrl, roomFromUrl, cleanCode, now, GUEST, ROOT, mock: false, db: () => app && app.database(), get uid() { return user && user.uid; }, get ready() { return !!app; } };
})();
