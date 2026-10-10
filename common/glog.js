/* 게임 기록 (모든 게임 공통) — 관리자만 읽는 logs/{게임}/{날짜}/{세션}
   info 방 정보 · players 참가자 들어옴·나감 · matches 판마다 설정·결과 · net 사람마다 연결 품질 · chat 채팅
   방장(또는 혼자 하는 사람)이 세션을 만들고, 친구는 방 정보의 log 값으로 자기 연결 품질만 씀 */
window.GLOG = (getDb, game) => {
  let base = null, isOwner = false, match = null;
  const seen = new Set();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const kst = () => new Date(Date.now() + 9 * 3600e3).toISOString();                 // 한국 시간 기준 날짜·시각
  const ok = () => !!base;
  const safe = p => p && p.catch && p.catch(() => {});
  return {
    get sid() { return base ? base.key && base.parent.key + "/" + base.key : null; },
    start(info, uid) {                                                               // 방장·혼자: 새 세션
      const t = kst(), sid = `${t.slice(0, 10)}/${t.slice(11, 19).replace(/:/g, "")}_${Math.random().toString(36).slice(2, 5)}`;
      base = getDb().ref(`logs/${game}/${sid}`); isOwner = true; match = null; seen.clear();
      safe(base.child("info").set({ ...info, game, host: uid, created: TS(), updated: TS() }));
      return sid;
    },
    attach(sid) { if (sid && (!base || this.sid !== sid)) { base = getDb().ref(`logs/${game}/${sid}`); isOwner = false; } },   // 친구
    info(p) { if (ok() && isOwner) safe(base.child("info").update({ ...p, updated: TS() })); },
    player(uid, p) { if (ok() && isOwner) safe(base.child(`players/${uid}`).update(p)); },
    joined(uid, p) { this.player(uid, { ...p, joined: TS() }); },
    left(uid) { this.player(uid, { left: TS() }); },
    matchStart(m) { if (!ok() || !isOwner) return; match = base.child("matches").push(); safe(match.set({ ...m, start: TS() })); },
    matchUpdate(m) { if (match) safe(match.update({ ...m, updated: TS() })); },
    matchEnd(m) { if (match) { safe(match.update({ ...m, end: TS() })); match = null; } },
    get inMatch() { return !!match; },
    net(uid, n) { if (ok()) safe(base.child(`net/${uid}`).update({ ...n, updated: TS() })); },
    chat(m) {                                                                        // 방장만 남김 (같은 메시지 두 번 안 남게)
      if (!ok() || !isOwner || !m || !m.m) return;
      const k = `${m.u}|${m.t}|${m.m}`; if (seen.has(k)) return; seen.add(k);
      safe(base.child("chat").push({ u: m.u || "", n: m.n || "", m: m.m, t: m.t || TS() }));
    },
    close() { if (ok() && isOwner) { this.matchEnd({ aborted: true }); safe(base.child("info").update({ closed: TS(), updated: TS() })); } base = null; },
  };
};
// 연결 품질 표본 (평균·최대·흔들림)
window.Samples = (n = 120) => {
  const a = [];
  const r = v => Math.round(v);
  return {
    push(v) { if (Number.isFinite(v)) { a.push(v); if (a.length > n) a.shift(); } },
    get avg() { return a.length ? r(a.reduce((s, x) => s + x, 0) / a.length) : null; },
    get max() { return a.length ? r(Math.max(...a)) : null; },
    get jitter() { if (a.length < 2) return null; const m = a.reduce((s, x) => s + x, 0) / a.length; return r(Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length)); },
    get n() { return a.length; },
  };
};
