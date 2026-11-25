// 베니 서바이벌 어댑터 — 공용 틀(survival/index.html + shell.js) 로 목록(list/*.js)의 게임을 하나씩 고르고 '혼자(AI)' 로 끝까지.
//  · 게임 목록은 survival/list/*.js 를 그대로 읽어 만듦 (shell 과 같은 순서 · 같은 검사) → 새 게임이 목록에 올라오면 자동으로 검사에 들어옴
//  · 한 게임 = 모드 하나 ('solo:<id>'): 방송 칸 → 시즌 칸 → 카드를 진짜로 눌러 고르고(게임 파일은 그때 불러옴) → [혼자] → [시작] → 내 차례마다 ui.qa(없으면 core.ai) 로 둠 → 결과 창
//  · 폰 검사는 375×667 (phoneViewport) · 판 화면은 한 화면(세로 스크롤 없음, oneScreen) · 콘솔 오류 0 은 공통 검사(absorb)
//  · 손잡이: window.__survival — ready · LIST · pick · fast · pause · autoAct · probe · fp · round · canAct
//  · 친구랑(온라인)은 아케이드 mock 으로 2인 한 판(선생님 꺼짐 · 랭킹 한 번 · 손님 새로 고침) — online 항목. 그 밖은 껍데기 시험 survival/test/*_ui.js 가 가상 틀로 확인
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const LIST_DIR = path.join(__dirname, '..', '..', '..', 'survival', 'list');
const FILES = ['devil', 'devil-s3', 'genius', 'blood'];            // shell.js 의 LIST_FILES 와 같은 순서
const PROGS = ['devil', 'genius', 'blood'];
const READ_ERRS = [];
const readList = () => {
  const out = [], seen = new Set();
  for (const f of FILES) {
    const file = path.join(LIST_DIR, f + '.js');
    if (!fs.existsSync(file)) continue;
    const sb = {}; sb.window = sb;                                  // shell 도 파일마다 window.SVList 를 새로 비우고 읽음
    try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { timeout: 2000 }); } catch (e) { READ_ERRS.push(f + ': ' + String(e.message).slice(0, 80)); continue; }   // 깨진 목록 파일은 shell 도 건너뜀 (보고서에는 남김)
    for (const e of Array.isArray(sb.SVList) ? sb.SVList : []) {
      if (!e || typeof e !== 'object' || !/^[A-Za-z0-9_-]{1,40}$/.test(e.id || '') || !e.title || !PROGS.includes(e.prog) || seen.has(e.id) || e.link) continue;
      seen.add(e.id); out.push({ id: e.id, prog: e.prog, season: String(e.season || ''), title: e.title });
    }
  }
  return out;
};

const ENTRIES = readList();
const withArg = (fn, arg) => new Function('seed', 'return (' + fn.toString() + ')(seed, ' + JSON.stringify(arg) + ');');

// 카드를 눌러 고르고 [혼자] → [시작] (브라우저 안). 게임 파일을 못 불러오면 예외
const startOf = e => withArg(async (seed, E) => {
  const S = window.__survival, qa = window.__qa, sleep = ms => new Promise(r => setTimeout(r, ms));
  await S.ready;
  const until = async (f, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (f()) return true; await sleep(60); } return false; };
  const q = s => document.querySelector(s);
  const click = el => { if (el) el.click(); return !!el; };
  if (!q('#play').hidden || !q('#resOv').hidden) throw new Error('첫 화면이 아님');
  if (!click(q(`#progTabs .prog[data-p="${E.prog}"]`))) throw new Error('방송 칸이 없음: ' + E.prog);
  click(q(`#seasonBar .ssn[data-s="${CSS.escape(E.season)}"]`));           // 시즌 칸이 하나뿐이면 없을 수도 있음
  if (!await until(() => q(`#gameCards .g-card[data-g="${E.id}"]`), 4000)) throw new Error('카드가 없음: ' + E.id);
  click(q(`#gameCards .g-card[data-g="${E.id}"]`));
  if (!await until(() => !q('#panel').hidden && window.SVUI && window.SVUI[E.id] && window.SVCores && window.SVCores[E.id], 15000)) {
    throw new Error('게임을 못 불러옴: ' + E.id + ' — ' + (q('#gameLoad') ? q('#gameLoad').textContent.trim().slice(0, 60) : ''));
  }
  S.fast(1); S.pause(false);
  click(q('#tabSolo'));
  await sleep(120);
  const b = q('#startBtn');
  if (!b || b.disabled) throw new Error('시작 단추가 없거나 꺼져 있음');
  b.click();
  if (!await until(() => !!S.ses, 6000)) throw new Error('시작해도 판이 안 열림');
  window.__qaCoach = 0; window.__qaRev = 0;
  return true;
}, e);

const modes = {};
for (const e of ENTRIES) modes['solo:' + e.id] = { timeout: 120000, stuckMs: 30000, start: startOf(e) };
const keys = Object.keys(modes);

module.exports = {
  id: 'survival',
  path: 'survival/',
  query: '',
  hookName: 'window.__survival',
  phoneViewport: { width: 375, height: 667 },
  oneScreen: true,
  entries: ENTRIES,
  ready: () => !!window.__survival && !!window.__qa && !!window.__survival.LIST && window.__survival.LIST.length > 0 && !!document.querySelector('#gameCards .g-card'),
  menu: () => document.getElementById('play').hidden && document.getElementById('resOv').hidden,
  home: () => {
    const q = id => document.getElementById(id);
    if (!q('resOv').hidden) { const b = q('resBox').querySelector('[data-r="home"], [data-r="leave"]'); if (b) { b.click(); return; } }
    if (!q('play').hidden) { q('backBtn').click(); q('backBtn').click(); return; }       // 두 번 눌러야 나감 (backGuard)
    location.reload();
  },
  setup: () => { window.__qaCoach = 0; window.__qaRev = 0; if (window.__survival) { window.__survival.fast(1); window.__survival.pause(false); } },
  modes,
  quickModes: keys,                         // 빠른 모드도 목록 전 항목 (한 게임이 몇 초)
  monkeyStart: keys.includes('solo:bloodrps') ? 'solo:bloodrps' : keys[0],
  // 친구랑 (아케이드 mock): 선생님 꺼진 2인 판(피의 게임 가위바위보) 하나를 방장 · 손님이 끝까지 → 랭킹은 한 판에 한 번 (끝난 뒤 손님이 새로 고침해도 또 안 불림) · 오류 0.
  //  (cd71c75 이전 shell.js 는 선생님 꺼짐에서 render 무한 재귀 → 판이 깨져 이 검사가 실패함)
  online: {
    open: async () => { const S = window.__survival; await S.ready; if (!(await S.pick('bloodrps', 'friend'))) throw new Error('bloodrps 를 못 고름'); S.fast(1); document.getElementById('startBtn').click(); },
    beforeStart: () => { const i = document.querySelector('.arn-coach input'); if (i && i.checked) i.click(); },   // 선생님 끔 (기본 꺼짐이지만 확실히)
    started: () => { const S = window.__survival; return !!(S && S.ses && S.mode === 'online' && !document.getElementById('play').hidden && S.V); },
    setup: role => {
      window.__qaRole = role; const S = window.__survival; if (S) { S.fast(1); S.pause(false); }
      if (role === 'guest') { try { const m = JSON.stringify({ pid: 'qa-guest', name: '큐에이' }); localStorage.setItem('game.me', m); localStorage.setItem('game.me.test', m); } catch (e) {} }   // 새로 고침 뒤 페이지엔 프로필이 있어서 랭킹이 로컬에 쌓임
      if (!window.__qaWatch) window.__qaWatch = setInterval(() => {        // 끝난 판: 손님이 새로 고침해도 랭킹이 또 안 쌓여야 함 (결과 창에서는 drive 가 안 불려서 타이머로)
        const S2 = window.__survival, V = S2 && S2.V; if (!V || !V.over || window.__qaRole !== 'guest' || window.__qaChk) return;
        window.__qaChk = 1; const stage0 = +sessionStorage.getItem('__qaStage') || 0;
        // 이 기기에 쌓인 '베니 서바이벌' 판 수 (common/rank.js 가 localStorage 에 둠 — 새 페이지가 뜨자마자 불린 것도 셈)
        const played = () => { let t = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!/survival/.test(k) || /^sv-/.test(k)) continue; try { const o = JSON.parse(localStorage.getItem(k)); if (o && o.all && +o.all.n) t += +o.all.n; } catch (e) {} } return t; };
        setTimeout(() => {
          const n = played();
          if (stage0 === 0) { sessionStorage.setItem('__qaStage', '1'); sessionStorage.setItem('__qaN', String(n)); location.reload(); }
          else { sessionStorage.setItem('__qaStage', '2'); if (n !== (+sessionStorage.getItem('__qaN') || 0)) console.error('[qa] 친구랑 랭킹이 새로 고침 뒤 또 쌓임 (' + sessionStorage.getItem('__qaN') + ' → ' + n + ')'); }
        }, 900);
      }, 150);
    },
    round: () => { const S = window.__survival; return S && S.ses ? S.ses.g : -1; },
    fp: () => { const S = window.__survival; return S && S.ses ? S.fp() : null; },
    drive: () => {
      const S = window.__survival, qa = window.__qa;
      if (!S || !S.ses) return;
      if (qa.clickText(/^알겠어요$/)) return;
      const V = S.V;
      if (V && V.over) return;
      for (let i = 0; i < 4; i++) { if (!S.autoAct()) break; }
    },
    stuckMs: 25000,
    roundMs: 150000,
  },
  gaps: (ENTRIES.length ? [] : ['survival/list/*.js 에 게임이 하나도 없음 — 검사할 판이 없음']).concat(READ_ERRS.map(s => '목록 파일을 못 읽음 (그 파일 게임은 검사에서 빠짐) — ' + s)),
  reproHint: (mode, seed) => `${mode.replace('solo:', '')}: 첫 화면에서 방송 칸 → 시즌 칸 → 카드 선택 → [혼자] → [시작] 후 내 차례마다 __survival.autoAct()`,
  // 판이 끝나는 순간 한 번: 🎞️ 복기 열림 · 끝까지 넘김 · 닫으면 결과 창으로 돌아옴 (어긋나면 예외 → 러너가 '멈춤 / probe 오류: 복기 …' 로 보고)
  probe: async () => {
    const S = window.__survival, p = S.probe();
    if (!p.over || window.__qaRev) return p;
    window.__qaRev = 1;
    const q = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
    const b = q('#resBox [data-r="review"]');
    if (!b) throw new Error('복기: 결과 창에 🎞️ 복기 단추가 없음');
    b.click(); await sleep(300);
    if (q('#rev').hidden || !q('#revStage').children.length) throw new Error('복기: 화면이 안 열림 (재생이 달라서 막혔을 수 있음)');
    if (!(+q('#revRange').max > 0)) throw new Error('복기: 수가 0개');
    q('#revBar [data-rv="last"]').click(); await sleep(200);
    if (!/끝/.test(q('#revLbl').textContent)) throw new Error('복기: 끝까지 넘기지 못함');
    q('#revBar [data-rv="first"]').click(); await sleep(100);
    q('#revBar [data-rv="mine"]').click(); await sleep(150);
    const t = (q('.cpn-body') || {}).innerText || '';
    if (/undefined|NaN|\[object/.test(t)) throw new Error('복기: 선생님 글에 깨진 값: ' + t.slice(0, 60));
    q('#revBack').click(); await sleep(250);
    if (!q('#rev').hidden || q('#resOv').hidden) throw new Error('복기: 닫아도 결과 창으로 안 돌아옴');
    return S.probe();
  },
  drive: () => {
    const S = window.__survival, qa = window.__qa;
    if (qa.clickText(/^알겠어요$/)) return;
    let n = 0;
    for (let i = 0; i < 6; i++) { if (S.autoAct()) n++; else break; }
    // 곁가지: AI 선생님 단추를 판마다 한 번 눌러 봄 (coach 가 예외 없이 그려지나)
    if (n && !window.__qaCoach) { window.__qaCoach = 1; qa.click('#coachBtn'); }
  },
};
