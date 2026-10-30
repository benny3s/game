// 정적 파일 서버 (127.0.0.1 만, 8830 부터 빈 포트) — 404 는 따로 모아 둠 (Referer 로 어느 게임인지)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), net = require('net');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

function freePort(start) {
  return new Promise(resolve => {
    const tryPort = p => {
      const s = net.createServer();
      s.once('error', () => tryPort(p + 1));
      s.once('listening', () => s.close(() => resolve(p)));
      s.listen(p, '127.0.0.1');
    };
    tryPort(start);
  });
}

async function serve(root, startPort = 8830) {
  const port = await freePort(startPort);
  const missing = [];                       // { path, referer }
  const srv = http.createServer((q, r) => {
    let rel;
    try { rel = decodeURIComponent(q.url.split('?')[0]); } catch (e) { r.writeHead(400); return r.end(); }
    if (rel.endsWith('/')) rel += 'index.html';
    const f = path.normalize(path.join(root, rel));
    if (!f.startsWith(path.normalize(root))) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => {
      if (e) {
        // 폴더 주소에 / 없이 온 경우 → index.html
        if (e.code === 'EISDIR') { r.writeHead(301, { location: q.url.split('?')[0] + '/' + (q.url.includes('?') ? '?' + q.url.split('?')[1] : '') }); return r.end(); }
        if (!/favicon\.ico$/.test(rel)) missing.push({ path: rel, referer: q.headers.referer || '' });
        r.writeHead(404); return r.end('not found');
      }
      r.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      r.end(d);
    });
  });
  await new Promise(ok => srv.listen(port, '127.0.0.1', ok));
  return { port, base: `http://127.0.0.1:${port}/`, missing, close: () => new Promise(ok => srv.close(() => ok())) };
}

module.exports = { serve, freePort };
