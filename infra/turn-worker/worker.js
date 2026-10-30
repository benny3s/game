/* 친구랑 실시간 게임용 TURN 자격 발급기 (Cloudflare Worker)
   폰끼리 직접 연결(WebRTC)이 막힐 때 Cloudflare TURN 으로 중계 → 서버 경유(RTDB)보다 훨씬 빠름.
   비밀값 두 개는 코드에 없음: `npx wrangler secret put TURN_KEY_ID` · `npx wrangler secret put TURN_KEY_TOKEN` (베니 님이 직접 넣음)
   GET /  → { iceServers: [...], ttl }  (우리 사이트에서 부를 때만) */
const ALLOW = [/^https:\/\/benny3s\.github\.io$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/];
const TTL = 4 * 3600;   // 자격 유효 4시간

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const ok = ALLOW.some(r => r.test(origin));
    const cors = { "Access-Control-Allow-Origin": ok ? origin : "https://benny3s.github.io", "Vary": "Origin", "Cache-Control": "no-store" };
    if (req.method === "OPTIONS") return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    if (!ok || req.method !== "GET") return new Response("forbidden", { status: 403, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return json({ error: "not configured" }, 503, cors);
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TTL }),
    });
    if (!r.ok) return json({ error: "turn " + r.status }, 502, cors);
    const j = await r.json();
    let servers = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
    // 브라우저가 막는 53번 포트 주소는 뺌
    servers = servers.map(s => ({ ...s, urls: [].concat(s.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length);
    return json({ iceServers: servers, ttl: TTL }, 200, cors);
  },
};
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { ...headers, "Content-Type": "application/json" } });
