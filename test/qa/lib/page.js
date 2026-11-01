// 페이지 계측: 오류·콘솔·실패 요청 모으기, 화면 넘침·가려짐·잘림 검사, 작은 스크린샷
'use strict';
const fs = require('fs'), path = require('path');

// 페이지 안에 먼저 심는 도우미 (adapter 의 브라우저 함수에서 __qa.* 로 씀)
const HELPERS = `(() => {
  if (window.__qa) return;
  const qa = window.__qa = { rej: [], muts: 0 };
  // 🔇 시험은 소리 없이 (베니 님 스피커로 나감 — 11-01 다시 들림): Web Audio 는 0 볼륨 마디로 거쳐 내보내고, <audio> 는 음소거, 읽어 주기는 안 함 (게임 소리 설정은 그대로)
  try {
    const P = (window.BaseAudioContext || window.AudioContext || window.webkitAudioContext || function () {}).prototype, d = Object.getOwnPropertyDescriptor(P, 'destination');
    if (d && d.get) Object.defineProperty(P, 'destination', { configurable: true, get() { if (!this.__qaMute) { const g = this.createGain(); g.gain.value = 0; g.connect(d.get.call(this)); this.__qaMute = g; } return this.__qaMute; } });
    const mp = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return mp.apply(this, arguments); };
    if (window.speechSynthesis) window.speechSynthesis.speak = () => {};
  } catch (e) {}
  addEventListener('unhandledrejection', e => { const r = e.reason; qa.rej.push(String((r && (r.stack || r.message)) || r)); });
  qa.shown = el => { if (!el || !el.isConnected || el.closest('[hidden]')) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  qa.vis = el => { if (!qa.shown(el)) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  qa.$$ = (sel, root) => [...(root || document).querySelectorAll(sel)].filter(qa.vis);
  qa.click = (sel, root) => { const el = qa.$$(sel, root).find(e => !e.disabled); if (el) { el.click(); return true; } return false; };
  qa.clickText = (re, sel, root) => { re = re instanceof RegExp ? re : new RegExp(re); const el = qa.$$(sel || 'button, .btn, [role=button]', root).find(b => !b.disabled && re.test((b.textContent || "").trim())); if (el) { el.click(); return true; } return false; };
  qa.hot = () => { if (window.HotSeat && HotSeat.isOpen) { HotSeat.close(); return true; } return false; };
  qa.hash = s => { s = typeof s === 'string' ? s : JSON.stringify(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const mo = new MutationObserver(l => { qa.muts += l.length; });
  const go = () => mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go);
})();`;

function short(s, n = 300) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

// 이벤트를 sink 배열에 쌓음. origin 밖(폰트 CDN 등) 실패는 env 로 표시
function instrument(page, sink, tag, base) {
  const own = u => base && String(u).startsWith(base);
  page.on('pageerror', e => sink.push({ kind: 'pageerror', tag, text: short(e.stack || e.message, 600), t: Date.now() }));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    const text = m.text();
    // 실패한 요청은 response 이벤트로 따로 잡으니 콘솔 중복은 표시만
    const e = { kind: 'console', tag, text: short(text, 500), url: loc.url ? loc.url + ':' + (loc.lineNumber + 1) : '', dupReq: /Failed to load resource/.test(text), t: Date.now() };
    sink.push(e);
    // console.error(err) 이면 err.stack 도 붙임 (어디서 났는지)
    const a0 = m.args()[0];
    if (a0) a0.evaluate(x => (x && x.stack) ? String(x.stack) : '').then(st => { if (st) e.text = short(text + '\n' + st.split('\n').slice(1, 6).join('\n'), 900); }).catch(() => {});
  });
  page.on('requestfailed', r => {
    const f = r.failure(); const err = (f && f.errorText) || '';
    if (/ERR_ABORTED|cancelled|NS_BINDING_ABORTED|Load request cancelled/i.test(err)) return;   // 이동·취소는 무시
    sink.push({ kind: 'reqfail', tag, text: err, url: r.url(), env: !own(r.url()), t: Date.now() });
  });
  page.on('response', r => { if (r.status() >= 400) sink.push({ kind: 'http', tag, text: String(r.status()), url: r.url(), env: !own(r.url()), t: Date.now() }); });
  page.on('crash', () => sink.push({ kind: 'crash', tag, text: 'page crashed', t: Date.now() }));
  page.on('dialog', d => { sink.push({ kind: 'dialog', tag, text: d.type() + ': ' + short(d.message(), 120), t: Date.now() }); d.dismiss().catch(() => {}); });
}

async function pullRejections(page, sink, tag) {
  try {
    const rej = await page.evaluate(() => { const r = (window.__qa && __qa.rej.splice(0)) || []; return r; });
    for (const r of rej) sink.push({ kind: 'pageerror', tag, text: 'unhandledrejection: ' + short(r, 600), t: Date.now() });
  } catch (e) {}
}

// 화면 검사 (브라우저 안). modalOk: 전체를 덮는 창이 열려 있으면 가려짐 검사 건너뜀
function layoutProbe(opts) {
  const qa = window.__qa;
  const W = innerWidth, H = innerHeight, se = document.scrollingElement || document.documentElement;
  const out = { W, H, scrollW: se.scrollWidth, scrollH: se.scrollHeight, overflowX: se.scrollWidth > W + 1, wide: [], offscreen: [], clipped: [], covered: [], toasted: [], tiny: [], modal: '' };
  const desc = el => { if (!el) return ''; let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); const t = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24); return t ? s + ' "' + t + '"' : s; };
  const scrollableAncestor = el => { for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return p; } return null; };
  // 가로 넘침 범인: 화면보다 오른쪽으로 나간 요소
  if (out.overflowX) {
    for (const el of document.body.querySelectorAll('*')) {
      if (!qa.shown(el)) continue; const r = el.getBoundingClientRect();
      if (r.right > W + 1 && !scrollableAncestor(el)) { out.wide.push(desc(el) + ' right=' + Math.round(r.right)); if (out.wide.length >= 5) break; }
    }
  }
  // 전체를 덮는 창(모달)이 열려 있나
  const cx = W / 2, cy = H / 2, top = document.elementFromPoint(cx, cy);
  for (let p = top; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
    if ((cs.position === 'fixed' || cs.position === 'absolute') && r.width >= W * 0.9 && r.height >= H * 0.9 && +cs.zIndex > 0) { out.modal = desc(p).slice(0, 60); break; }
  }
  const ctrls = [...document.querySelectorAll('button, .btn, [role=button], a.btn, select, input[type=button], input[type=submit]')].filter(qa.shown);
  const docScrollY = se.scrollHeight > H + 1;
  for (const b of ctrls) {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    // 화면 밖 (가로로 잘리거나, 스크롤 없이 아래로 나가서 못 누름)
    if (!scrollableAncestor(b)) {
      if (r.left < -1 || r.right > W + 1) out.offscreen.push(desc(b) + ` x=${Math.round(r.left)}..${Math.round(r.right)}`);
      else if (!docScrollY && r.top >= H - 2) out.offscreen.push(desc(b) + ` y=${Math.round(r.top)} (스크롤 없음)`);
      else if (!docScrollY && r.bottom > H + 4 && r.top < H) out.offscreen.push(desc(b) + ` 아래 ${Math.round(r.bottom - H)}px 잘림`);
    }
    if (!qa.vis(b)) continue;
    // 글자 잘림/넘침
    const txt = (b.textContent || '').trim();
    if (txt && (b.scrollWidth > b.clientWidth + 2 || b.scrollHeight > b.clientHeight + 3) && b.clientWidth > 0) {
      const hid = /(hidden|clip)/.test(cs.overflowX + cs.overflowY);
      out.clipped.push(desc(b) + (hid ? ' 잘림' : ' 넘침') + (cs.textOverflow === 'ellipsis' ? '(…)' : '') + ` ${b.scrollWidth}x${b.scrollHeight}>${b.clientWidth}x${b.clientHeight}`);
    }
    // 작은 터치 대상
    if (opts.phone && !b.disabled && (r.width < 28 || r.height < 28)) out.tiny.push(desc(b) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    // 가려짐: 가운데 점을 누르면 다른 것이 먼저 받음
    if (!out.modal && !b.disabled && cs.pointerEvents !== 'none') {
      const x = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(H - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(x, y);
      if (hit && hit !== b && !b.contains(hit) && !hit.contains(b)) {
        const hcs = getComputedStyle(hit);
        if (hcs.pointerEvents !== 'none') { const toast = hit.closest('.toast, [class*=toast]'); out[toast ? 'toasted' : 'covered'].push(desc(b) + ' ← ' + desc(toast || hit)); }
      }
    }
  }
  for (const k of ['offscreen', 'clipped', 'covered', 'toasted', 'tiny']) out[k] = out[k].slice(0, 8);
  return out;
}

async function shot(page, dir, name) {
  const file = path.join(dir, name.replace(/[^\w.-]+/g, '_') + '.jpg');
  try { await page.screenshot({ path: file, type: 'jpeg', quality: 50, scale: 'css', timeout: 15000 }); return file; } catch (e) { return ''; }
}

module.exports = { HELPERS, instrument, pullRejections, layoutProbe, shot, short };
