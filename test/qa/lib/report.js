// report/index.html + report.json
'use strict';
const fs = require('fs'), path = require('path');

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SEV = { high: 0, medium: 1, low: 2, info: 3 };
const SEVK = { high: '높음', medium: '중간', low: '낮음', info: '참고' };
const CAT = { bug: '게임 문제', env: '환경', harness: '검사 도구 한계' };

function writeReport(D, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const rel = f => f ? path.relative(dir, f).replace(/\\/g, '/') : '';
  for (const g of Object.values(D.games)) {
    for (const i of g.issues) { i.shot = rel(i.shot); delete i._key; }
    for (const c of g.checks) c.shot = rel(c.shot);
    g.issues.sort((a, b) => (a.cat === 'bug' ? 0 : 1) - (b.cat === 'bug' ? 0 : 1) || SEV[a.sev] - SEV[b.sev]);
  }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(D, null, 1));

  // 표: 게임 × 검사 (같은 검사는 엔진·화면·모드를 묶어 가장 나쁜 결과 하나 + 통과 수, 마우스를 올리면 하나하나)
  const grp = n => n.startsWith('play:') ? 'play' : n;
  const NAMES = ['menu', 'links', 'play', 'game-layout', 'monkey', 'online', 'spectate', 'next-round'];
  const LABEL = { menu: '메뉴', links: '링크', play: '한 판 끝까지', 'game-layout': 'PC 화면', monkey: '몽키', online: '친구랑', spectate: '구경꾼', 'next-round': '준비→다음 판' };
  const present = new Set(); for (const g of Object.values(D.games)) for (const c of g.checks) present.add(grp(c.name));
  const cols = NAMES.filter(n => present.has(n)).concat([...present].filter(n => !NAMES.includes(n)));
  const ICON = { pass: '✅', fail: '❌', warn: '⚠️', skip: '➖' };
  const st = D.selftests;
  const ids = Object.keys(D.games).sort((a, b) => D.meta.games.indexOf(a) - D.meta.games.indexOf(b));
  const head = `<tr><th>게임</th><th>selftest</th>${cols.map(c => `<th>${esc(LABEL[c] || c)}</th>`).join('')}<th>문제</th></tr>`;
  const rows = ids.map(id => {
    const g = D.games[id];
    const sts = st.filter(s => s.game === id);
    const stCell = sts.length ? `<td title="${esc(sts.map(s => s.file + ': ' + s.summary).join('\n'))}">${sts.every(s => s.ok) ? ICON.pass : ICON.fail}</td>` : '<td>➖</td>';
    const cells = cols.map(k => {
      const cs = g.checks.filter(c => grp(c.name) === k);
      if (!cs.length) return '<td class="na"></td>';
      const worst = cs.find(c => c.status === 'fail') || cs.find(c => c.status === 'warn') || cs.find(c => c.status === 'skip') || cs[0];
      const ok = cs.filter(c => c.status === 'pass').length;
      const tip = cs.map(c => `${ICON[c.status]} ${c.name} ${c.engine}/${c.vp} — ${c.note}${c.ms ? ` (${(c.ms / 1000).toFixed(1)}s)` : ''}`).join('\n');
      return `<td title="${esc(tip)}"><a href="#g-${id}">${ICON[worst.status]}</a><small>${ok}/${cs.length}</small></td>`;
    }).join('');
    const bugs = g.issues.filter(i => i.cat === 'bug');
    const n = s => bugs.filter(i => i.sev === s).length;
    return `<tr><th><a href="#g-${id}">${esc(id)}</a></th>${stCell}${cells}<td class="cnt">${n('high') ? `<b class="s-high">${n('high')}</b>` : ''} ${n('medium') ? `<b class="s-medium">${n('medium')}</b>` : ''} ${n('low') ? `<b class="s-low">${n('low')}</b>` : ''}</td></tr>`;
  }).join('');

  const issueHtml = i => `<div class="iss ${i.cat}">
    <div class="ih"><span class="sev s-${i.sev}">${SEVK[i.sev]}</span>${i.cat !== 'bug' ? `<span class="cat">${CAT[i.cat]}</span>` : ''}<b>${esc(i.title)}</b>${i.count > 1 ? ` <small>×${i.count}</small>` : ''}</div>
    <div class="where">${esc(i.where.join(' · '))}</div>
    ${i.detail ? `<pre>${esc(String(i.detail).slice(0, 1600))}</pre>` : ''}
    ${i.repro ? `<div class="repro">재현: ${esc(i.repro)}</div>` : ''}
    ${i.shot ? `<a href="${esc(i.shot)}"><img loading="lazy" src="${esc(i.shot)}" alt="스크린샷"></a>` : ''}
  </div>`;
  const per = ids.map(id => {
    const g = D.games[id];
    const sts = st.filter(s => s.game === id);
    return `<section id="g-${id}"><h2>${esc(id)}</h2>
      ${sts.length ? `<p class="st">${sts.map(s => `${s.ok ? '✅' : '❌'} ${esc(s.file)} — ${esc(s.summary)} (${(s.ms / 1000).toFixed(1)}s)`).join('<br>')}</p>` : ''}
      <details><summary>검사 ${g.checks.length}개</summary><table class="ck">${g.checks.map(c => `<tr><td>${ICON[c.status]}</td><td>${esc(c.name)}</td><td>${esc(c.engine + '/' + c.vp)}</td><td>${esc(c.note)}</td><td>${c.ms ? (c.ms / 1000).toFixed(1) + 's' : ''}</td><td>${c.shot ? `<a href="${esc(c.shot)}">📷</a>` : ''}</td></tr>`).join('')}</table></details>
      ${g.issues.length ? g.issues.map(issueHtml).join('') : '<p>문제 없음</p>'}
    </section>`;
  }).join('');

  const all = Object.values(D.games).flatMap(g => g.issues);
  const cnt = (s, c = 'bug') => all.filter(i => i.sev === s && i.cat === c).length;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>게임 QA 보고서</title><style>
:root{--bg:#fbfaf7;--fg:#222;--soft:#666;--line:#e3dfd6;--card:#fff;--hi:#d33;--md:#e08a00;--lo:#3a7bd5;--in:#888}
@media (prefers-color-scheme:dark){:root{--bg:#18181a;--fg:#eee;--soft:#aaa;--line:#333;--card:#222226}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
h1{font-size:20px;margin:0 0 4px}.meta{color:var(--soft);font-size:12.5px;margin-bottom:12px}
.wrap{overflow-x:auto;max-width:100%}table.sum{border-collapse:collapse;background:var(--card);font-size:13px}
.sum th,.sum td{border:1px solid var(--line);padding:4px 6px;text-align:center;white-space:nowrap}.sum th small{color:var(--soft);font-weight:400}
.sum td.na{background:repeating-linear-gradient(45deg,transparent 0 4px,var(--line) 4px 5px)}.cnt b{display:inline-block;min-width:18px;border-radius:9px;color:#fff;padding:0 5px}
.s-high{background:var(--hi)}.s-medium{background:var(--md)}.s-low{background:var(--lo)}.s-info{background:var(--in)}
section{margin-top:22px}h2{font-size:17px;border-bottom:2px solid var(--line);padding-bottom:3px}
.iss{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:8px 0}.iss.harness,.iss.env{opacity:.75}
.ih{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.sev{color:#fff;border-radius:4px;padding:0 6px;font-size:12px}.cat{border:1px solid var(--line);border-radius:4px;padding:0 5px;font-size:12px;color:var(--soft)}
.where{color:var(--soft);font-size:12px}pre{white-space:pre-wrap;word-break:break-all;font-size:12px;background:rgba(127,127,127,.08);padding:6px;border-radius:6px;margin:6px 0;max-height:220px;overflow:auto}
.repro{font-size:12px;color:var(--soft);word-break:break-all}img{max-width:220px;max-height:300px;border:1px solid var(--line);border-radius:6px;margin-top:6px}
table.ck{font-size:12.5px;border-collapse:collapse}.ck td{padding:2px 6px;border-bottom:1px solid var(--line)}.st{font-size:12.5px;color:var(--soft)}
.harn li{color:var(--soft)}
.sum td small{color:var(--soft);font-size:11px;margin-left:3px}.sum td a{text-decoration:none}
ul.top{padding-left:18px}ul.top li{margin:4px 0}ul.top small{color:var(--soft)}
</style></head><body>
<h1>게임 QA 보고서</h1>
<div class="meta">${esc(D.meta.started)} · ${(D.meta.durationMs / 1000).toFixed(0)}초 · ${esc(D.meta.mode)} · ${esc(D.meta.base)} · 엔진 ${esc(D.meta.engines.join(', '))} · seed ${D.meta.seed}<br>
게임 문제: <b class="sev s-high">높음 ${cnt('high')}</b> <b class="sev s-medium">중간 ${cnt('medium')}</b> <b class="sev s-low">낮음 ${cnt('low')}</b> <b class="sev s-info">참고 ${cnt('info')}</b> · 검사 도구 한계 ${all.filter(i => i.cat === 'harness').length} · 환경 ${all.filter(i => i.cat === 'env').length}</div>
<div class="wrap"><table class="sum">${head}${rows}</table></div>
${(() => { const L = ids.flatMap(id => D.games[id].issues.filter(i => i.cat === 'bug' && i.sev !== 'info').map(i => [id, i])).sort((x, y) => SEV[x[1].sev] - SEV[y[1].sev]);
  return L.length ? `<h2>게임 문제 모아 보기 (${L.length})</h2><ul class="top">${L.map(([id, i]) => `<li><span class="sev s-${i.sev}">${SEVK[i.sev]}</span> <a href="#g-${id}"><b>${esc(id)}</b></a> ${esc(i.title)} <small>${esc(i.where.join(' · '))}</small></li>`).join('')}</ul>` : '<p>게임 문제 없음 ✅</p>'; })()}
${D.harness.length ? `<ul class="harn">${D.harness.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
${per}
</body></html>`;
  const f = path.join(dir, 'index.html');
  fs.writeFileSync(f, html);
  return f;
}

module.exports = { writeReport };
