// AI 실력 3단계가 실제로 다른가 재는 시험 — 목록 전 항목, '고급(또는 --a) 한 명 vs 나머지 초급(--b)', 같은 씨앗 N판
//   node survival/test/tier_bench.js                      목록 전 항목 · 인원 최소/기본/최대 · 200판씩
//   node survival/test/tier_bench.js --g hilo,formula     자기 게임만
//   node survival/test/tier_bench.js --runs 60 --n 2,4    판 수 · 인원 고르기
//   node survival/test/tier_bench.js --a normal --b easy  다른 단계끼리 (사다리: hard>normal>easy 가 다 성립하는지)
//   --jobs 6   동시에 돌릴 게임 수 (기본 CPU 수 - 2)   --out 파일.json   --md 파일.md   --strict  기준 미달이 있으면 종료 코드 1
// 읽는 법
//   · 같은 씨앗을 고급이 앉는 자리만 돌려 가며(i % n) 쓰므로 자리 순서 이점은 평균에서 빠짐. AI 는 shell 과 같게 core.ai(view, seat, tier, rnd) 만 씀.
//   · 승률 = 1등(공동이면 나눔). 2명이면 이 값이 기준 값. 3명 이상이면 '남 한 명 한 명을 이긴 비율'(상대 이김)이 기준 값 — 무작위 기대치 1/n 이 낮아서.
//   · 기준 = 실력 게임 65% 이상, 운이 큰 게임(아래 LUCK 표) 55% 이상. ±는 95% 오차(표본 오차) — 기준에서 ±만큼 모자란 정도면 판 수를 늘려 다시.
//   · 운이 큰 게임은 아래 LUCK 표에 한 줄(id: 까닭)로 올려요 — 표를 늘리는 것은 자기 게임 몫.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const LIST_DIR = path.join(ROOT, 'list');
const FILES = ['devil', 'devil-s3', 'genius', 'blood'];
const PROGS = ['devil', 'genius', 'blood'];

// 운이 큰 게임 (기준 55%). 까닭 한 줄.
const LUCK = {
  formula: '카드가 와야 식이 나옴 · 베팅 · 스윙 심리',
  hitstay: '다음 카드가 무작위(HIT/STAY 도박)',
  bloodrps: '가위바위보 + 카드 — 읽기 싸움',
  blindbet: '모르는 상대 베팅을 읽는 심리 싸움',
  hilo: '숨긴 카드 · 점수 카드 공개 순서가 운',
  gemmarket: '최종 점수 = 내 점수 × 모르는 마니또의 점수라 내 점수만 올려서는 못 이김 (내 점수만 비교하면 고급 승률 63~68%)',
};

const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = n => argv.includes('--' + n);

function readList() {
  const out = [], seen = new Set();
  for (const f of FILES) {
    const file = path.join(LIST_DIR, f + '.js');
    if (!fs.existsSync(file)) continue;
    const sb = {}; sb.window = sb;
    try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { timeout: 2000 }); } catch (e) { continue; }
    for (const e of Array.isArray(sb.SVList) ? sb.SVList : []) {
      if (!e || typeof e !== 'object' || !/^[A-Za-z0-9_-]{1,40}$/.test(e.id || '') || !e.title || !PROGS.includes(e.prog) || seen.has(e.id) || e.link) continue;
      seen.add(e.id); out.push({ id: e.id, prog: e.prog, season: String(e.season || ''), title: e.title });
    }
  }
  return out;
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── 게임 하나 (워커 안) ────────────────────────────────────────
function loadGame(id) {
  const core = require(path.join(ROOT, 'games', id, 'core.js'));
  let ui = null;
  try {
    global.window = { SVCores: { [id]: core }, SVUI: {} };
    require(path.join(ROOT, 'games', id, 'ui.js'));
    ui = global.window.SVUI[id] || null;
  } catch (e) { ui = null; }
  return { core, ui };
}
const cfgOf = ui => { const o = {}; for (const it of (ui && ui.opts) || []) o[it.k] = it.def; return o; };

function playOne(core, n, cfg, seed, tiers, deadlineMs) {
  const st = core.init({ n, seed, cfg: Object.assign({}, cfg) });
  const r = mulberry(seed ^ 0x9e3779b9);
  let steps = 0, err = '';
  const t0 = Date.now();
  while (!core.over(st) && steps++ < 30000) {
    if (Date.now() - t0 > deadlineMs) { err = '시간 초과'; break; }
    const need = core.needs(st);
    if (!need.length) {
      const ms = core.auto ? core.auto(st) : null;
      if (ms == null) { err = '멈춤(needs 비고 auto 없음)'; break; }
      core.advance(st); continue;
    }
    for (const s of need) {
      if (!core.needs(st).includes(s)) continue;
      let a = null;
      try { a = core.ai(core.view(st, s), s, tiers[s], r); } catch (e) { err = 'ai 예외: ' + String(e.message).slice(0, 60); }
      let res = a != null ? core.apply(st, s, a) : { ok: false };
      if (!res.ok && core.legal) { const L = core.legal(st, s); if (L.length) res = core.apply(st, s, L[Math.floor(r() * L.length)]); }
      if (!res.ok) { err = err || ('동작이 안 먹음: ' + (res.err || '')).slice(0, 60); return { st, err, steps }; }
    }
  }
  if (!core.over(st) && !err) err = '끝나지 않음';
  return { st, err, steps };
}

function benchGame(id, opt) {
  const { core, ui } = loadGame(id);
  const min = ui ? ui.min : 2, max = ui ? ui.max : 2, def = ui ? (ui.defN || min) : 2;
  const ns = opt.ns ? opt.ns.filter(n => n >= min && n <= max) : [...new Set([min, def, max])].sort((a, b) => a - b);
  const cfg = cfgOf(ui);
  const rows = [];
  for (const n of ns) {
    let games = 0, win = 0, pair = 0, rankSum = 0, errs = 0, ms = 0, ties = 0; const errNote = {};
    for (let i = 0; i < opt.runs; i++) {
      const seed = 101 + i * 13;
      const hs = i % n, tiers = Array(n).fill(opt.b); tiers[hs] = opt.a;
      const t0 = Date.now();
      let res; try { res = playOne(core, n, cfg, seed, tiers, 30000); } catch (e) { res = { err: '예외: ' + String(e.message).slice(0, 60) }; }
      ms += Date.now() - t0;
      if (res.err || !core.over(res.st)) { errs++; errNote[res.err || '?'] = (errNote[res.err || '?'] || 0) + 1; continue; }
      const R = core.ranks(res.st), mine = R[hs], first = R.filter(x => x === 0).length;
      games++; rankSum += mine;
      if (mine === 0) { win += 1 / first; if (first > 1) ties++; }
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += R[j] > mine ? 1 : R[j] === mine ? 0.5 : 0;
      pair += p / (n - 1);
    }
    const winP = games ? win / games : NaN, pairP = games ? pair / games : NaN;
    const main = n === 2 ? winP : pairP, se = games ? 1.96 * Math.sqrt(Math.max(1e-9, main * (1 - main)) / games) : NaN;
    rows.push({ id, n, games, errs, errNote, win: winP, pair: pairP, main, se, base: 1 / n, rank: games ? rankSum / games : NaN, ties, msPer: opt.runs ? ms / opt.runs : 0, sec: ms / 1000 });
  }
  return rows;
}

// ── 바깥 (목록 → 워커들 → 표) ──────────────────────────────────
const pct = x => Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '-';
function judge(row) {
  const need = LUCK[row.id] ? 0.55 : 0.65;
  if (!row.games) return { need, ok: false, mark: '❌ 판이 안 끝남' };
  if (row.main >= need) return { need, ok: true, mark: '✅' };
  if (row.main + row.se < 0.5) return { need, ok: false, mark: '🔴 역전(고급이 초급보다 약함)' };
  if (row.main + row.se >= need) return { need, ok: false, mark: '🟡 경계(판 수 늘려 보기)' };
  return { need, ok: false, mark: '🔴 미달' };
}
function table(all, a, b) {
  const lines = [];
  lines.push(`| 종목 | 인원 | 고급(${a}) 승률 | 상대 이김 | 기준 값(±) | 기준 | 판정 | 판 수 | 걸린 시간 |`);
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of all) {
    const j = judge(r), luck = LUCK[r.id] ? ` (운: ${LUCK[r.id]})` : '';
    lines.push(`| ${r.id}${luck} | ${r.n} | ${pct(r.win)} | ${pct(r.pair)} | ${pct(r.main)} ±${Number.isFinite(r.se) ? (r.se * 100).toFixed(1) : '-'} | ${(j.need * 100) | 0}% | ${j.mark}${r.errs ? ` · 오류 ${r.errs}판 ${JSON.stringify(r.errNote)}` : ''} | ${r.games}${r.errs ? '/' + (r.games + r.errs) : ''} | ${r.sec.toFixed(1)}초 (판당 ${r.msPer.toFixed(0)}ms) |`);
  }
  return lines.join('\n');
}

async function main() {
  const opt = { runs: +val('runs', flag('quick') ? 40 : 200), a: val('a', 'hard'), b: val('b', 'easy'), ns: val('n', '') ? val('n', '').split(',').map(Number).filter(Boolean) : null };
  if (argv.includes('--worker')) {          // 자식 프로세스: 게임 하나를 재고 결과를 부모에게
    const id = val('worker', '');
    let rows; try { rows = benchGame(id, opt); } catch (e) { rows = [{ id, n: 0, games: 0, errs: 1, errNote: { 불러오기: String(e.message).slice(0, 80) }, win: NaN, pair: NaN, main: NaN, se: NaN, base: 0, rank: NaN, ties: 0, msPer: 0, sec: 0 }]; }
    process.send({ id, rows }); process.exit(0);
  }
  let list = readList();
  const only = val('g', '') ? val('g', '').split(',') : null;
  if (only) list = list.filter(e => only.includes(e.id));
  if (!list.length) { console.error('잰 게임이 없음 (list/*.js 또는 --g 확인)'); process.exit(1); }
  const jobs = Math.max(1, +val('jobs', Math.max(1, Math.min(8, require('os').cpus().length - 2))));
  const results = {}; let next = 0, running = 0, done = 0; const t0 = Date.now();
  await new Promise(resolve => {
    const pump = () => {
      while (running < jobs && next < list.length) {
        const e = list[next++]; running++;
        const args = ['--worker', e.id, '--runs', String(opt.runs), '--a', opt.a, '--b', opt.b].concat(opt.ns ? ['--n', opt.ns.join(',')] : []);
        const ch = cp.fork(__filename, args, { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
        let got = false;
        ch.on('message', m => { got = true; results[m.id] = m.rows; });
        ch.on('exit', () => { running--; done++; if (!got) results[e.id] = [{ id: e.id, n: 0, games: 0, errs: 1, errNote: { 워커: '죽음' }, win: NaN, pair: NaN, main: NaN, se: NaN, base: 0, rank: NaN, ties: 0, msPer: 0, sec: 0 }]; process.stderr.write(`\r${done}/${list.length} ${e.id}      `); if (done === list.length) resolve(); else pump(); });
      }
    };
    pump();
  });
  process.stderr.write('\n');
  const all = []; for (const e of list) for (const r of results[e.id] || []) all.push(r);
  const md = `### 고급(${opt.a}) 1 : 나머지 ${opt.b} — 같은 씨앗 ${opt.runs}판씩 (전체 ${((Date.now() - t0) / 1000).toFixed(0)}초)\n\n` + table(all, opt.a, opt.b) + '\n';
  console.log(md);
  const bad = all.filter(r => { const j = judge(r); return !j.ok; });
  console.log(bad.length ? `기준 미달 · 확인 필요 ${bad.length}줄: ` + [...new Set(bad.map(r => r.id))].join(', ') : '모두 기준 이상');
  if (val('out', '')) fs.writeFileSync(val('out', ''), JSON.stringify({ opt, rows: all }, null, 1));
  if (val('md', '')) fs.writeFileSync(val('md', ''), md);
  if (flag('strict') && bad.length) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
