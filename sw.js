/* 베니 아케이드 — 오프라인(비행기 모드) 지원 Service Worker
   · 온라인일 때는 항상 서버에서 최신 파일을 먼저 받고(Network-first) 캐시를 갱신해 배포가 밀리지 않게 함
   · 비행기 모드·통신 음영 지역 등 오프라인일 때는 캐시된 화면·퍼즐 은행으로 즉시 열림 */
const CACHE = "benny-arcade-v4";
const CORE = [
  "./",
  "./index.html",
  "./games.json",
  "./common/cozy.css",
  "./common/cozy.js",
  "./common/fit.js",
  "./common/backnav.js",
  "./common/glog.js",
  "./common/me.js",
  "./common/gate.js",
  "./common/rank.js",
  "./common/arena-mock.js",
  "./common/arena.js",
  "./common/arena-ui.js",
  "./common/bank.js",
  "./common/mistakes.js",
  "./nyang/",
  "./nyang/index.html",
  "./nyang/manifest.json",
  "./nyang/icon-192.png",
  "./nyang/icon.svg",
  "./nyang/style.css",
  "./nyang/main.js",
  "./nyang/core.js",
  "./nyang/banban.js",
  "./nyang/banban-ui.js",
  "./nyang/zip.js",
  "./nyang/zip-ui.js",
  "./nyang/sound.js",
  "./nyang/watch.js",
  "./nyang/puzzles.json",
  "./nyang/bank/index.json",
  "./nyang/bank/master-1.json",
  "./nyang/bank/master-2.json",
  "./nyang/bank/master-3.json",
  "./nyang/bank/master-4.json",
  "./nyang/bank/master-5.json",
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u))))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

async function fromCache(req, u) {
  const c = await caches.open(CACHE);
  let r = (await c.match(req)) || (await c.match(u.origin + u.pathname)) || (await c.match(req, { ignoreSearch: true }));
  if (!r && (u.pathname.endsWith("/") || req.mode === "navigate")) {
    const idx = u.origin + u.pathname.replace(/\/?$/, "/index.html");
    r = (await c.match(idx)) || (await c.match(idx, { ignoreSearch: true }));
  }
  return r;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  const sameOrigin = u.origin === self.location.origin;
  const staticCdn = /^(www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(u.hostname);
  if (!sameOrigin && !staticCdn) return;
  if (sameOrigin && /\/(firebase-debug\.log|test\/)/.test(u.pathname)) return;

  e.respondWith((async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3500);
      const res = await fetch(req, { signal: ctl.signal });
      clearTimeout(t);
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => {
          c.put(req, copy.clone());
          if (sameOrigin && u.search) c.put(u.origin + u.pathname, copy);
        }).catch(() => {});
        return res;
      }
    } catch (_) {}
    const cached = await fromCache(req, u);
    if (cached) return cached;
    return fetch(req);
  })());
});
