// 시험용 가짜 Firebase (RTDB · 로그인) — Node(vm)와 브라우저(addInitScript) 둘 다. 진짜 서버엔 아무것도 안 감
//   store = FakeFB.store({ rules }) 를 여러 '기기'(vm·탭)가 같이 쓰면 한 서버처럼 · FakeFB.install(global, { store, user: { uid, claims } })
//   rules(w) → false 면 PERMISSION_DENIED (w = { path, data, newData, root(p), newRoot(p), uid, claims }) · 여러 곳 update 는 한 번에(하나라도 막히면 다 안 씀)
//   store.log = 쓴 것 [{ path, v, uid }] · store.denied = 막힌 것 · store.fail = (paths) => Error|null (네트워크 끊김 흉내)
(function (G) {
  const TS = { ".sv": "timestamp" };
  const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
  const parts = p => String(p == null ? "" : p).split("/").filter(Boolean);
  const join = (...a) => a.map(parts).reduce((x, y) => x.concat(y), []).join("/");
  const getIn = (t, p) => { let o = t; for (const k of parts(p)) { if (o == null || typeof o !== "object") return null; o = o[k]; } return o === undefined ? null : o; };
  const fix = v => (v && typeof v === "object" ? (v[".sv"] === "timestamp" ? Date.now() : Object.keys(v).reduce((o, k) => { const x = fix(v[k]); if (x != null) o[k] = x; return o; }, {})) : v);
  const empty = o => o && typeof o === "object" && !Object.keys(o).length;
  function setIn(t, p, v) {                                   // 빈 칸은 없앰 (RTDB 처럼)
    const ks = parts(p); if (!ks.length) return v == null ? {} : clone(v);
    const go = (o, i) => {
      o = o && typeof o === "object" ? { ...o } : {};
      const k = ks[i];
      if (i === ks.length - 1) { if (v == null || empty(v)) delete o[k]; else o[k] = clone(v); }
      else { const c = go(o[k], i + 1); if (empty(c)) delete o[k]; else o[k] = c; }
      return o;
    };
    return go(t, 0);
  }
  const later = (fn, ms) => setTimeout(fn, ms || 0);
  const denyErr = () => { const e = new Error("PERMISSION_DENIED: Permission denied"); e.code = "PERMISSION_DENIED"; return e; };

  function store(opts) {
    opts = opts || {};
    const S = { tree: { ".info": { connected: true, serverTimeOffset: 0 } }, subs: new Set(), log: [], denied: [], rules: opts.rules || null, fail: null, n: 0 };
    S.get = p => clone(getIn(S.tree, p));
    S.key = () => "k" + Date.now().toString(36) + String(S.n++).padStart(5, "0");
    S.write = (upd, who) => new Promise((ok, bad) => later(() => {
      const paths = Object.keys(upd);
      const f = S.fail && S.fail(paths, upd);
      if (f) { S.fail = null; return bad(f); }
      let nt = S.tree; for (const p of paths) nt = setIn(nt, p, fix(upd[p]));
      if (S.rules) for (const p of paths) {
        const w = { path: p, data: clone(getIn(S.tree, p)), newData: clone(getIn(nt, p)), root: q => clone(getIn(S.tree, q)), newRoot: q => clone(getIn(nt, q)), uid: who && who.uid, claims: (who && who.claims) || {} };
        let okRule = false; try { okRule = S.rules(w) !== false; } catch (e) { okRule = false; }
        if (!okRule) { S.denied.push({ path: p, v: clone(upd[p]), uid: w.uid }); return bad(denyErr()); }
      }
      S.tree = nt;
      for (const p of paths) S.log.push({ path: p, v: S.get(p), uid: who && who.uid });
      S.notify(); ok();
    }));
    S.notify = () => { for (const s of [...S.subs]) s.check(); };
    return S;
  }

  function snap(path, v, ref) {
    return { key: parts(path).slice(-1)[0] || null, ref, val: () => clone(v), exists: () => v != null, child: k => snap(join(path, k), getIn(v, k), ref && ref.child(k)), forEach(fn) { for (const k of Object.keys(v || {})) if (fn(snap(join(path, k), v[k]))) return true; return false; } };
  }

  function makeRef(S, path, app, q) {
    q = q || {};
    const who = () => { const u = app && app.auth().currentUser; return u ? { uid: u.uid, claims: u._claims || {} } : null; };
    const view = () => {                                     // 질의(orderByChild·startAt·limitToLast) 적용한 값
      let v = S.get(path);
      if (v && typeof v === "object" && (q.by || q.last || q.byKey)) {
        let ks = Object.keys(v);
        if (q.by) { if (q.start != null) ks = ks.filter(k => v[k] && v[k][q.by] >= q.start); ks.sort((a, b) => ((v[a] || {})[q.by] || 0) - ((v[b] || {})[q.by] || 0)); }
        else ks.sort();
        if (q.last) ks = ks.slice(-q.last);
        v = ks.reduce((o, k) => { o[k] = v[k]; return o; }, {});
        if (empty(v)) v = null;
      }
      return v;
    };
    const ref = {
      key: parts(path).slice(-1)[0] || null, path,
      child: k => makeRef(S, join(path, k), app),
      get: () => new Promise(ok => later(() => ok(snap(path, view(), ref)))),
      once: () => ref.get(),
      set: v => S.write({ [path]: v }, who()),
      update: o => S.write(Object.keys(o).reduce((m, k) => { m[join(path, k)] = o[k]; return m; }, {}), who()),
      remove: () => S.write({ [path]: null }, who()),
      push(v) {
        const c = makeRef(S, join(path, S.key()), app);
        const p = v === undefined ? Promise.resolve() : c.set(v);
        c.then = (a, b) => p.then(a, b); c.catch = b => p.catch(b);
        return c;
      },
      transaction(fn) {
        return new Promise((ok, bad) => later(() => {
          const cur = S.get(path), nv = fn(clone(cur));
          if (nv === undefined) return ok({ committed: false, snapshot: snap(path, cur, ref) });
          S.write({ [path]: nv }, who()).then(() => ok({ committed: true, snapshot: snap(path, S.get(path), ref) }), bad);
        }));
      },
      on(ev, cb, errCb) {
        const s = { ref: path, ev, cb, last: undefined, kids: null };
        s.check = () => {
          const v = view();
          if (ev === "value") { const j = JSON.stringify(v); if (j !== s.last) { s.last = j; try { cb(snap(path, v, ref)); } catch (e) { console.error(e); } } return; }
          const now = v && typeof v === "object" ? v : {}, was = s.kids || {};
          for (const k of Object.keys(now)) {
            const j = JSON.stringify(now[k]);
            if (!(k in was)) { if (ev === "child_added") try { cb(snap(join(path, k), now[k], ref.child(k))); } catch (e) { console.error(e); } }
            else if (was[k] !== j && ev === "child_changed") try { cb(snap(join(path, k), now[k], ref.child(k))); } catch (e) { console.error(e); }
          }
          if (ev === "child_removed") for (const k of Object.keys(was)) if (!(k in now)) try { cb(snap(join(path, k), JSON.parse(was[k]), ref.child(k))); } catch (e) { console.error(e); }
          s.kids = Object.keys(now).reduce((o, k) => { o[k] = JSON.stringify(now[k]); return o; }, {});
        };
        s.off = () => S.subs.delete(s);
        S.subs.add(s); later(() => { if (S.subs.has(s)) s.check(); });
        (ref._subs = ref._subs || []).push(s);
        return cb;
      },
      off(ev, cb) { for (const s of [...S.subs]) if (s.ref === path && (!ev || s.ev === ev) && (!cb || s.cb === cb)) S.subs.delete(s); },
      onDisconnect: () => ({ remove: () => Promise.resolve(), set: () => Promise.resolve(), update: () => Promise.resolve(), cancel: () => Promise.resolve() }),
      orderByChild: k => makeRef(S, path, app, { ...q, by: k }),
      orderByKey: () => makeRef(S, path, app, { ...q, byKey: true }),
      startAt: v => makeRef(S, path, app, { ...q, start: v }),
      limitToLast: n => makeRef(S, path, app, { ...q, last: n }),
    };
    return ref;
  }

  function user(uid, claims) {
    return { uid, isAnonymous: !claims || !Object.keys(claims).length, _claims: claims || {}, getIdTokenResult: async () => ({ claims: { ...(claims || {}) } }), getIdToken: async () => "fake-token-" + uid };
  }

  // global(window 또는 vm 맥락)에 firebase 를 심음 — 기본 앱의 처음 로그인 = o.user, 이름 붙은 앱(arena guest 등)은 익명으로 새로
  function install(g, o) {
    o = o || {};
    const S = o.store || store(o);
    let anon = 0;
    const apps = [];
    function makeApp(cfg, name) {
      const ls = new Set();
      const auth = {
        currentUser: name === "[DEFAULT]" && o.user ? user(o.user.uid, o.user.claims) : null,
        onAuthStateChanged(cb) { ls.add(cb); later(() => { if (ls.has(cb)) cb(auth.currentUser); }); return () => ls.delete(cb); },
        async signInAnonymously() { auth.currentUser = user((o.anonPrefix || "anon") + (++anon) + "_" + Math.random().toString(36).slice(2, 6)); for (const f of [...ls]) f(auth.currentUser); return { user: auth.currentUser }; },
        async setPersistence() {},
        async signInWithCustomToken() { throw new Error("시험: 관리자 로그인 없음"); },
        _switch(uid, claims) { auth.currentUser = user(uid, claims); for (const f of [...ls]) f(auth.currentUser); },
      };
      const app = { name, options: cfg || {}, auth: () => auth };
      const db = { ref: p => makeRef(S, p || "", app), app };
      app.database = () => db;
      return app;
    }
    const fb = {
      apps,
      initializeApp(cfg, name) { const a = makeApp(cfg, name || "[DEFAULT]"); apps.push(a); return a; },
      app(name) { const a = apps.find(x => x.name === (name || "[DEFAULT]")); if (!a) throw new Error("no app " + name); return a; },
    };
    fb.auth = Object.assign(() => fb.app().auth(), { Auth: { Persistence: { NONE: "none", LOCAL: "local", SESSION: "session" } } });
    fb.database = Object.assign(() => fb.app().database(), { ServerValue: { TIMESTAMP: TS } });
    g.firebase = fb;
    return S;
  }

  // firebase/database.rules.json 의 gp/*(이름·프로필·PIN) 규칙을 그대로 흉내 (test/gp 도 같음). 다른 곳은 다 허용
  //   쓴 경로를 규칙 칸(players/$pid · names/$key · pins/$pid · pinchk/$pid/$uid)으로 올려서 판단
  function gpRules(w) {
    const m = /^((?:test\/)?gp)\/(players|names|pins|pinchk)\/([^/]+)(?:\/([^/]+))?/.exec(w.path);
    if (!m) return true;
    if (!w.uid) return false;
    const [, base, kind, id, sub] = m, adm = w.claims.admin === 1;
    const node = kind === "pinchk" ? `${base}/pinchk/${id}/${sub}` : `${base}/${kind}/${id}`;
    const data = w.root(node), nd = w.newRoot(node), root = p => w.root(base + "/" + p);
    const pinOk = pid => root("pins/" + pid) != null && root("pinchk/" + pid + "/" + w.uid) === root("pins/" + pid);
    if (kind === "players") {
      const wr = adm || (nd != null && (data == null || (nd.n === (data && data.n)) || pinOk(id)));
      const va = nd == null || (typeof nd.n === "string" && nd.n.length >= 1 && nd.n.length <= 12 && (nd.h == null || adm) && (nd.hp == null || nd.hp === true));
      return wr && va;
    }
    if (kind === "names") return (data == null || adm || (nd == null && pinOk(data))) && (nd == null || typeof nd === "string");
    if (kind === "pins") return (adm || (data == null && nd != null) || (data != null && nd != null && root("pinchk/" + id + "/" + w.uid) === data)) && (nd == null || (typeof nd === "string" && nd.length === 32));
    return w.uid === sub && typeof nd === "string" && nd === w.newRoot(base + "/pins/" + id);
  }

  const api = { store, install, user, TS, getIn, gpRules };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else G.FakeFB = api;
})(typeof window !== "undefined" ? window : globalThis);
