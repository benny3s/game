// 🎞️ 복기 약속 시험 — 목록의 모든 게임이 '같은 씨앗 + 같은 행동 순서 = 같은 판' 인지 (review.js · 📒 연습 판이 이 약속 위에 서 있음)
//   node survival/test/replay_check.js                 목록 전 게임 · 인원 최소/기본/최대 · 판당 2번
//   node survival/test/replay_check.js --g hilo,formula   자기 게임만
//   node survival/test/replay_check.js --runs 4 --verbose
// 게임마다 AI 끼리(초급·중급·고급 섞어서) 한 판을 두며 행동(apply)과 단계 넘김(advance)을 기록 → 처음부터 다시 재생해
//   ① 끝 상태 전체의 지문(숨은 패 · 덱 순서까지)이 같은가   ② 재생 중 Math.random · Date.now 를 안 쓰는가(쓰면 던지게 함정을 걸어 둠)
//   ③ view(st, 자리 | -1 | 'all') 가 st 를 안 바꾸는가       ④ 안 먹은 apply(엉뚱한 행동 · 차례 아닌 자리)가 st 를 안 바꾸는가
//   ⑤ ai(view 사본, …) 가 view 를 안 바꾸는가 (복기가 같은 view 로 고급 AI 를 다시 부르기 때문)
// 하나라도 어긋나면 종료 코드 1 — 어긋난 게임은 core 가 시계 · 무작위를 st.rng 같은 씨앗 기반으로만 쓰도록 고쳐야 복기가 켜짐.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const FILES = ['devil', 'devil-s3', 'genius', 'blood'], PROGS = ['devil', 'genius', 'blood'];
const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const only = val('g', '') ? val('g', '').split(',') : null, RUNS = +val('runs', 2) || 2, verbose = argv.includes('--verbose');

function readList() {
  const out = [], seen = new Set();
  for (const f of FILES) {
    const file = path.join(ROOT, 'list', f + '.js'); if (!fs.existsSync(file)) continue;
    const sb = {}; sb.window = sb;
    try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { timeout: 2000 }); } catch (e) { continue; }
    for (const e of Array.isArray(sb.SVList) ? sb.SVList : []) {
      if (!e || typeof e !== 'object' || !/^[A-Za-z0-9_-]{1,40}$/.test(e.id || '') || !e.title || !PROGS.includes(e.prog) || seen.has(e.id) || e.link) continue;
      seen.add(e.id); out.push(e.id);
    }
  }
  return out;
}
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
const fp = st => hash(JSON.stringify(st));                          // review.js 의 fp 와 같은 식
const clone = v => JSON.parse(JSON.stringify(v));
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function loadGame(id) {
  const core = require(path.join(ROOT, 'games', id, 'core.js'));
  let ui = null;
  try { global.window = { SVCores: { [id]: core }, SVUI: {} }; require(path.join(ROOT, 'games', id, 'ui.js')); ui = global.window.SVUI[id] || null; } catch (e) { ui = null; }
  return { core, ui };
}
const cfgOf = ui => { const o = {}; for (const it of (ui && ui.opts) || []) o[it.k] = it.def; return o; };

// 한 판 기록하며 두기 (shell 의 makeTable 과 같은 길 — apply / advance 만으로 st 를 바꿈)
function record(core, n, cfg, seed, tiers) {
  const st = core.init({ n, seed, cfg: clone(cfg) }), r = mulberry(seed ^ 0x9e3779b9), acts = [];
  let guard = 0, err = '';
  while (!core.over(st) && guard++ < 30000) {
    const need = core.needs(st);
    if (!need.length) { if (!core.auto || core.auto(st) == null) { err = '멈춤'; break; } acts.push({ adv: 1 }); core.advance(st); continue; }
    for (const s of need) {
      if (!core.needs(st).includes(s)) continue;
      let a = null; try { a = core.ai(core.view(st, s), s, tiers[s], r); } catch (e) { err = 'ai 예외'; }
      let res = a != null ? core.apply(st, s, clone(a)) : { ok: false };
      if (res && res.ok) { acts.push({ s, a: clone(a) }); continue; }
      if (core.legal) { const L = core.legal(st, s); if (L.length) { const b = L[Math.floor(r() * L.length)]; res = core.apply(st, s, clone(b)); if (res && res.ok) { acts.push({ s, a: clone(b) }); continue; } } }
      return { st, acts, err: err || '동작이 안 먹음' };
    }
  }
  if (!core.over(st) && !err) err = '끝나지 않음';
  return { st, acts, err };
}

function checkGame(id) {
  const { core, ui } = loadGame(id), min = ui ? ui.min : 2, max = ui ? ui.max : 2, def = ui ? (ui.defN || min) : 2;
  const ns = [...new Set([min, def, max])].sort((a, b) => a - b), cfg = cfgOf(ui), TI = ['hard', 'normal', 'easy'];
  const out = { id, runs: 0, steps: 0, fails: [], warns: new Set() };
  const fail = m => { if (out.fails.length < 6 && !out.fails.includes(m)) out.fails.push(m); };
  const realRandom = Math.random, realNow = Date.now;
  for (const n of ns) for (let i = 0; i < RUNS; i++) {
    const seed = 7001 + i * 31 + n, tiers = Array.from({ length: n }, (_, k) => TI[(k + i) % 3]);
    const tag = `n=${n} #${i}`;
    let rec; try { rec = record(core, n, cfg, seed, tiers); } catch (e) { fail(`${tag} 기록 중 예외 ${String(e.message).slice(0, 60)}`); continue; }
    if (rec.err) { fail(`${tag} ${rec.err}`); continue; }
    out.runs++; out.steps += rec.acts.length;
    const F = fp(rec.st), ranks = JSON.stringify(core.ranks(rec.st));
    // ① ② 다시 재생 (Math.random · Date.now 함정) + ③ ④ ⑤ 중간 점검
    let st = null, bad = '';
    try {
      Math.random = () => { throw new Error('Math.random'); }; Date.now = () => { throw new Error('Date.now'); };
      st = core.init({ n, seed, cfg: clone(cfg) });
      const stride = Math.max(1, Math.floor(rec.acts.length / 40));
      for (let k = 0; k < rec.acts.length; k++) {
        const e = rec.acts[k];
        if (k % stride === 0) {                                       // 중간 점검 (최대 40 곳)
          const before = fp(st);
          for (const seat of [-1, 'all', e.adv ? 0 : e.s]) { try { const v = core.view(st, seat); JSON.stringify(v); } catch (er) { bad = bad || `view(${seat}) 예외 ${String(er.message).slice(0, 50)}`; } if (fp(st) !== before) bad = bad || `view(${seat}) 가 st 를 바꿈`; }
          if (!e.adv) {
            for (const x of [{ t: '__bad__' }, null, 12345, 'zzz']) { try { core.apply(st, e.s, x); } catch (er) { out.warns.add('엉뚱한 행동에 예외(shell 이 잡음)'); } if (fp(st) !== before) { bad = bad || `안 먹은 apply(${JSON.stringify(x)}) 가 st 를 바꿈`; break; } }
            const vb = core.view(st, e.s), vs = JSON.stringify(vb);
            try { core.ai(clone(vb), e.s, 'hard', mulberry(seed ^ k)); } catch (er) { out.warns.add('ai 예외'); }
            try { const v2 = clone(vb); core.ai(v2, e.s, 'hard', mulberry(seed ^ k)); if (JSON.stringify(v2) !== vs) bad = bad || 'ai 가 view 를 바꿈'; } catch (er) {}
          }
        }
        if (e.adv) core.advance(st); else { const r = core.apply(st, e.s, clone(e.a)); if (!r || !r.ok) { bad = bad || `${k + 1}번째 수가 재생에서 안 먹음`; break; } }
      }
    } catch (er) { bad = bad || `재생 중 ${/Math\.random|Date\.now/.test(er.message) ? er.message + ' 사용 (씨앗 기반으로 바꿔야 함)' : '예외 ' + String(er.message).slice(0, 60)}`; }
    finally { Math.random = realRandom; Date.now = realNow; }
    if (bad) { fail(`${tag} ${bad}`); continue; }
    if (fp(st) !== F) fail(`${tag} 끝 상태 지문이 다름 (같은 씨앗 · 같은 행동인데 결과가 달라짐)`);
    else if (JSON.stringify(core.ranks(st)) !== ranks) fail(`${tag} ranks 가 다름`);
  }
  return out;
}

const ids = readList().filter(id => !only || only.includes(id));
let bad = 0;
console.log(`🎞️ 복기 약속 시험 — ${ids.length}개 게임 · 인원 최소/기본/최대 × ${RUNS}판`);
for (const id of ids) {
  let r; try { r = checkGame(id); } catch (e) { r = { id, runs: 0, steps: 0, fails: ['시험 중 예외: ' + String(e.message).slice(0, 80)], warns: new Set() }; }
  const ok = !r.fails.length && r.runs > 0;
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '❌'} ${id.padEnd(14)} ${r.runs}판 · ${r.steps}수 재생${r.warns.size ? ' · 참고: ' + [...r.warns].join(', ') : ''}`);
  for (const f of r.fails) console.log('     - ' + f);
  if (verbose && ok) console.log('     (지문 · view · 안 먹은 apply · ai 모두 통과)');
}
console.log(bad ? `\n❌ ${bad}개 게임이 복기 약속을 못 지켜요` : '\n✅ 전부 통과');
process.exit(bad ? 1 : 0);
