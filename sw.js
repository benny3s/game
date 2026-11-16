/* 베니 아케이드 — 오프라인(비행기 모드) 지원 Service Worker
   · 온라인일 때는 항상 서버에서 최신 파일을 먼저 받고(Network-first) 캐시를 갱신해 배포가 밀리지 않게 함
   · 비행기 모드·통신 음영 지역 등 오프라인일 때는 캐시된 화면·퍼즐 은행으로 즉시 열림 */
const CACHE = "benny-arcade-v11";
const CORE = [
  "./",
  "./index.html",
  "./games.json",
  "./common/cozy.css",
  "./common/cozy.js",
  "./common/tutorial.js",
  "./common/game-tutorials.js",
  "./common/coach.js",
  "./common/hotseat.js",
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
  "./nyang/tutorial.js",
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
  "./genius/",
  "./genius/index.html",
  "./genius/style.css",
  "./genius/core.js",
  "./genius/tutorial.js",
  "./genius/main.js",
  "./brain/",
  "./brain/index.html",
  "./brain/style.css",
  "./brain/core.js",
  "./brain/tutorial.js",
  "./brain/main.js",
  "./escape/",
  "./escape/index.html",
  "./escape/style.css",
  "./escape/core.js",
  "./escape/tutorial.js",
  "./escape/main.js",
  "./escape/assets/wall_north.jpg",
  "./escape/assets/wall_east.jpg",
  "./escape/assets/wall_south.jpg",
  "./escape/assets/wall_west.jpg",
  "./baduk/",
  "./baduk/ai.js",
  "./baduk/core.js",
  "./baduk/index.html",
  "./baduk/main.js",
  "./baduk/model/b6c96.bkn",
  "./baduk/nn.js",
  "./baduk/room.js",
  "./baduk/style.css",
  "./baduk/worker.js",
  "./billiards/",
  "./billiards/ai.js",
  "./billiards/core.js",
  "./billiards/draw.js",
  "./billiards/index.html",
  "./billiards/main.js",
  "./billiards/style.css",
  "./catch/",
  "./catch/core.js",
  "./catch/index.html",
  "./catch/main.js",
  "./catch/style.css",
  "./chess/",
  "./chess/ai-worker.js",
  "./chess/ai.js",
  "./chess/board.js",
  "./chess/core.js",
  "./chess/index.html",
  "./chess/main.js",
  "./chess/read.js",
  "./chess/style.css",
  "./cube/",
  "./cube/ai.js",
  "./cube/core.js",
  "./cube/index.html",
  "./cube/main.js",
  "./cube/style.css",
  "./cube/table.js",
  "./draw/",
  "./draw/core.js",
  "./draw/index.html",
  "./draw/main.js",
  "./draw/pad.js",
  "./draw/style.css",
  "./draw/words.js",
  "./gostop/",
  "./gostop/ai-worker.js",
  "./gostop/ai.js",
  "./gostop/cards.js",
  "./gostop/core.js",
  "./gostop/index.html",
  "./gostop/main.js",
  "./gostop/style.css",
  "./gostop/svg/m01-01.svg",
  "./gostop/svg/m01-02.svg",
  "./gostop/svg/m01-03.svg",
  "./gostop/svg/m01-04.svg",
  "./gostop/svg/m02-01.svg",
  "./gostop/svg/m02-02.svg",
  "./gostop/svg/m02-03.svg",
  "./gostop/svg/m02-04.svg",
  "./gostop/svg/m03-01.svg",
  "./gostop/svg/m03-02.svg",
  "./gostop/svg/m03-03.svg",
  "./gostop/svg/m03-04.svg",
  "./gostop/svg/m04-01.svg",
  "./gostop/svg/m04-02.svg",
  "./gostop/svg/m04-03.svg",
  "./gostop/svg/m04-04.svg",
  "./gostop/svg/m05-01.svg",
  "./gostop/svg/m05-02.svg",
  "./gostop/svg/m05-03.svg",
  "./gostop/svg/m05-04.svg",
  "./gostop/svg/m06-01.svg",
  "./gostop/svg/m06-02.svg",
  "./gostop/svg/m06-03.svg",
  "./gostop/svg/m06-04.svg",
  "./gostop/svg/m07-01.svg",
  "./gostop/svg/m07-02.svg",
  "./gostop/svg/m07-03.svg",
  "./gostop/svg/m07-04.svg",
  "./gostop/svg/m08-01.svg",
  "./gostop/svg/m08-02.svg",
  "./gostop/svg/m08-03.svg",
  "./gostop/svg/m08-04.svg",
  "./gostop/svg/m09-01.svg",
  "./gostop/svg/m09-02.svg",
  "./gostop/svg/m09-03.svg",
  "./gostop/svg/m09-04.svg",
  "./gostop/svg/m10-01.svg",
  "./gostop/svg/m10-02.svg",
  "./gostop/svg/m10-03.svg",
  "./gostop/svg/m10-04.svg",
  "./gostop/svg/m11-01.svg",
  "./gostop/svg/m11-02.svg",
  "./gostop/svg/m11-03.svg",
  "./gostop/svg/m11-04.svg",
  "./gostop/svg/m12-01.svg",
  "./gostop/svg/m12-02.svg",
  "./gostop/svg/m12-03.svg",
  "./gostop/svg/m12-04.svg",
  "./janggi/",
  "./janggi/ai-worker.js",
  "./janggi/ai.js",
  "./janggi/board.js",
  "./janggi/core.js",
  "./janggi/index.html",
  "./janggi/intent.js",
  "./janggi/main.js",
  "./janggi/style.css",
  "./land/",
  "./land/art.js",
  "./land/bots.js",
  "./land/core.js",
  "./land/env.js",
  "./land/index.html",
  "./land/main.js",
  "./land/render.js",
  "./land/sound.js",
  "./omok/",
  "./omok/ai-worker.js",
  "./omok/ai.js",
  "./omok/board.js",
  "./omok/core.js",
  "./omok/index.html",
  "./omok/main.js",
  "./omok/review.js",
  "./omok/seats.js",
  "./omok/style.css",
  "./onecard/",
  "./onecard/ai-worker.js",
  "./onecard/ai.js",
  "./onecard/cards.js",
  "./onecard/core.js",
  "./onecard/index.html",
  "./onecard/main.js",
  "./onecard/style.css",
  "./poker/",
  "./poker/ai.js",
  "./poker/core.js",
  "./poker/index.html",
  "./poker/main.js",
  "./poker/style.css",
  "./seotda/",
  "./seotda/ai.js",
  "./seotda/core.js",
  "./seotda/index.html",
  "./seotda/main.js",
  "./seotda/style.css",
  "./snake/",
  "./snake/ac.js",
  "./snake/brains.json",
  "./snake/core.js",
  "./snake/helper.js",
  "./snake/index.html",
  "./snake/main.js",
  "./snake/net.js",
  "./snake/render.js",
  "./volley/",
  "./volley/bots.js",
  "./volley/core.js",
  "./volley/index.html",
  "./volley/keys.js",
  "./volley/main.js",
  "./volley/render.js",
  "./volley/sound.js",
  "./volley/style.css",
  "./yut/",
  "./yut/ai.js",
  "./yut/core.js",
  "./yut/index.html",
  "./yut/main.js",
  "./yut/style.css",
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
