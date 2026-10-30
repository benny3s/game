/* 시험 전용 가짜 Arena — Firebase 없이 같은 브라우저(같은 프로필)의 탭끼리 BroadcastChannel 로 방·메시지를 주고받음
   진짜 common/arena.js 와 같은 모양(host·join·listRooms·on·broadcast·send·setShared·watchShared …)이라 게임 코드는 그대로
   쓰는 법: arena.js 보다 먼저 이 파일을 넣고(시험 스크립트의 addInitScript 등) 주소에 ?mock — 지연 흉내는 ?mock=80 (0.08초 ±)
   서버를 거치지 않으니 '직접 연결'은 늘 열린 것으로 침 */
window.ArenaMock = util => {
  const LAT = Number(new URLSearchParams(location.search).get("mock")) || 0;
  const bc = new BroadcastChannel("arena-mock");
  const uid = "m" + Math.random().toString(36).slice(2, 9);
  const handlers = new Set();
  bc.onmessage = e => { for (const h of [...handlers]) try { h(e.data); } catch (err) { console.error(err); } };
  // 꼭 전할 것(rel)은 늘 같은 지연이라 순서가 지켜지고, 나머지는 흔들림(±40%)이 있어 순서가 바뀔 수도 있음 (진짜와 비슷하게)
  const post = (d, rel) => { const ms = LAT ? (rel ? LAT : LAT * (0.6 + Math.random() * 0.8)) : 0; const s = JSON.parse(JSON.stringify(d)); if (ms) setTimeout(() => bc.postMessage(s), ms); else bc.postMessage(s); };
  const code4 = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  function emitter(sticky) {
    const fns = {}, last = {};
    return {
      on(ev, fn) { (fns[ev] = fns[ev] || []).push(fn); if (sticky.includes(ev) && ev in last) try { fn(...last[ev]); } catch (e) { console.error(e); } return () => { fns[ev] = (fns[ev] || []).filter(f => f !== fn); }; },
      emit(ev, ...a) { if (sticky.includes(ev)) last[ev] = a; for (const f of (fns[ev] || []).slice()) try { f(...a); } catch (e) { console.error(e); } },
      clear() { for (const k in fns) delete fns[k]; },
    };
  }

  async function host(game, settings = {}) {
    const code = code4(), E = emitter(["players", "meta"]), shWatch = [];
    let meta = { host: uid, created: Date.now(), phase: "lobby", cfg: settings.cfg || null, max: settings.max || 2, v: 1 };
    let players = { [uid]: { name: String(settings.name || "방장").slice(0, 12), ...(settings.me || {}), t: Date.now() } };
    const shared = {}, label = settings.label || (() => "");
    let closed = false;
    const sync = () => post({ k: "room", game, code, meta, players }, true);
    const h = d => {
      if (d.game !== game) return;
      if (d.k === "list?") { post({ k: "list!", game, to: d.from, row: { code, h: players[uid].name, n: Object.keys(players).length, max: meta.max, ph: meta.phase, m: String(label(meta.cfg) || ""), t: meta.created, empty: false } }); return; }
      if (d.code !== code) return;
      if (d.k === "join?") {
        if (Object.keys(players).length >= meta.max && !d.watch) { post({ k: "join!", game, code, to: d.from, err: `방이 꽉 찼어요 (최대 ${meta.max}명)` }); return; }
        players[d.from] = { ...d.me, t: Date.now(), p2p: 1 };
        post({ k: "join!", game, code, to: d.from, meta, players, shared }, true);
        E.emit("join", d.from, players[d.from]); E.emit("p2p", d.from, true); sync(); E.emit("players", players);
      } else if (d.k === "up") { if (players[d.from]) E.emit("msg", d.from, d.m); }
      else if (d.k === "bye") { if (players[d.from]) { delete players[d.from]; E.emit("leave", d.from); sync(); E.emit("players", players); } }
      else if (d.k === "me") { if (players[d.from]) { players[d.from] = { ...players[d.from], ...d.p }; sync(); E.emit("players", players); } }
      else if (d.k === "chat") E.emit("chat", d.c);
    };
    handlers.add(h);
    E.emit("meta", meta); E.emit("players", players);
    return {
      code, isHost: true, uid, get meta() { return meta; }, get players() { return players; }, connected: true, relaying: false,
      on: E.on,
      broadcast(m, rel = false) { post({ k: "down", game, code, m }, rel); },
      send(to, m, rel = false) { post({ k: "down", game, code, m, to }, rel); },
      peers: () => Object.keys(players).filter(u => u !== uid).map(u => [u, true]),
      setPhase(phase, cfg) { meta = { ...meta, phase, cfg: cfg === undefined ? meta.cfg : cfg }; E.emit("meta", meta); sync(); return Promise.resolve(); },
      setMeta(p) { meta = { ...meta, ...p }; E.emit("meta", meta); sync(); return Promise.resolve(); },
      setMe(p) { players[uid] = { ...players[uid], ...p }; sync(); E.emit("players", players); return Promise.resolve(); },
      setPlayer(u, p) { if (players[u]) { players[u] = { ...players[u], ...p }; sync(); E.emit("players", players); } return Promise.resolve(); },
      kick(u) { if (!players[u]) return Promise.resolve(); delete players[u]; post({ k: "kick", game, code, to: u }, true); E.emit("leave", u); sync(); E.emit("players", players); return Promise.resolve(); },
      setShared(key, v) { shared[key] = v === undefined ? null : v; post({ k: "sh", game, code, key, v: shared[key] }, true); for (const [k, cb] of shWatch) if (k === key) cb(shared[key]); return Promise.resolve(); },
      watchShared(key, cb) { shWatch.push([key, cb]); cb(key in shared ? shared[key] : null); },
      chat(text) { const c = { u: uid, n: players[uid].name, m: String(text).slice(0, 120), t: Date.now() }; E.emit("chat", c); post({ k: "chat", game, code, c }); return Promise.resolve(); },
      leave() { if (closed) return; closed = true; handlers.delete(h); post({ k: "closed", game, code }, true); E.clear(); },
    };
  }

  async function join(game, code, settings = {}) {
    code = util.cleanCode(code);
    const me = { name: String(settings.name || "친구").slice(0, 12), ...(settings.me || {}), ...(settings.watch ? { watch: 1 } : {}) };
    const res = await new Promise(ok => {
      const w = d => { if (d.k === "join!" && d.to === uid && d.code === code && d.game === game) { clearTimeout(t); handlers.delete(w); ok(d); } };
      const t = setTimeout(() => { handlers.delete(w); ok(null); }, 1500 + LAT * 3);
      handlers.add(w); post({ k: "join?", game, code, from: uid, me, watch: !!settings.watch }, true);
    });
    if (!res) throw new Error("그런 방이 없어요 (코드를 확인하거나 방장이 나갔을 수 있어요)");
    if (res.err) throw new Error(res.err);
    let meta = res.meta, players = res.players, left = false;
    const shared = res.shared || {}, shWatch = [], E = emitter(["players", "meta"]);
    const h = d => {
      if (d.game !== game || d.code !== code) return;
      if (d.k === "room") { meta = d.meta; players = d.players; E.emit("meta", meta); E.emit("players", players); }
      else if (d.k === "down") { if (!d.to || d.to === uid) E.emit("msg", d.m); }
      else if (d.k === "sh") { shared[d.key] = d.v; for (const [k, cb] of shWatch) if (k === d.key) cb(d.v); }
      else if (d.k === "kick") { if (d.to === uid) E.emit("kicked"); }
      else if (d.k === "closed") E.emit("closed");
      else if (d.k === "chat") E.emit("chat", d.c);
    };
    handlers.add(h);
    setTimeout(() => { if (!left) { E.emit("meta", meta); E.emit("players", players); E.emit("p2p", true); } }, 0);
    return {
      code, isHost: false, uid, get meta() { return meta; }, get players() { return players; }, p2p: true, rtt: LAT * 2 || 1, connected: true,
      on: E.on,
      send(m, rel = false) { post({ k: "up", game, code, from: uid, m }, rel); return true; },
      watchShared(key, cb) { shWatch.push([key, cb]); cb(key in shared ? shared[key] : null); },
      setMe(p) { post({ k: "me", game, code, from: uid, p }, true); return Promise.resolve(); },
      chat(text) { const c = { u: uid, n: me.name, m: String(text).slice(0, 120), t: Date.now() }; E.emit("chat", c); post({ k: "chat", game, code, c }); return Promise.resolve(); },
      leave() { if (left) return; left = true; handlers.delete(h); post({ k: "bye", game, code, from: uid }, true); E.clear(); },
    };
  }

  async function listRooms(game) {
    const rows = [];
    const w = d => { if (d.k === "list!" && d.game === game && d.to === uid) rows.push(d.row); };
    handlers.add(w); post({ k: "list?", game, from: uid });
    await new Promise(r => setTimeout(r, 300 + LAT * 2));
    handlers.delete(w);
    return rows.sort((a, b) => (b.t || 0) - (a.t || 0));
  }

  // ?mock&nohost: 방 만들기 권한이 없는 기기 흉내 (Gate 허용 창 시험) — Gate.state.canHost 가 켜지면 권한 생김
  let canHost = !new URLSearchParams(location.search).has("nohost");
  return {
    init: async () => null, host, join, listRooms, deleteRoom: async () => null,
    inviteUrl: util.inviteUrl, roomFromUrl: util.roomFromUrl, cleanCode: util.cleanCode,
    now: () => Date.now(), GUEST: false, ROOT: "mock/", mock: true, db: () => null, uid, ready: true,
    get canHost() { return canHost; }, get isAdmin() { return canHost; },
    refreshPerms: async () => { if (window.Gate && Gate.state && Gate.state.canHost) canHost = true; },
    createHostInvite: async () => ({ code: "MOCK77", url: location.href }), claimHostInvite: async () => true,
  };
};
