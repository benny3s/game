// 공용 모듈(common/*.js) 자체 시험 — 브라우저 없이 Node vm + 가짜 Firebase(fakefb.js)로
// 실행: node common/test/selftest.js   (브라우저가 필요한 것은 common/test/browser-selftest.js)
//   은행(bank.js) 새 게임·판 사이 빌리기 · 이름 로그인(me.js) 유령 이름·PIN 없는 닉네임 · 시험 방(arena-mock.js) 다시 들어오기 · WebRTC 후보(arena.js)
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const FF = require('./fakefb.js');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ✔ ' + msg); } else { fail++; console.log('  ✘ FAIL: ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const block = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log(`  ✘ FAIL: ${name} 예외 ` + (e.message || e)); } };
const until = async (fn, ms = 2000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(10); } return !!fn(); };

function mkLS(init) {
  const m = new Map(Object.entries(init || {}));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] || null, get length() { return m.size; }, _m: m };
}
// 브라우저 비슷한 맥락 하나 = 기기(탭) 하나
function makeCtx(o = {}) {
  const u = new URL(o.url || 'http://127.0.0.1:1/game/t/');
  const et = new EventTarget();
  const c = {
    console, URL, URLSearchParams, TextEncoder, TextDecoder, crypto, performance, CustomEvent, Event, EventTarget, BroadcastChannel, structuredClone,
    location: { href: u.href, hostname: u.hostname, protocol: u.protocol, pathname: u.pathname, search: u.search, origin: u.origin, hash: '' },
    localStorage: mkLS(o.ls), sessionStorage: mkLS(o.ss), navigator: { userAgent: 'node-selftest' },
    setTimeout, clearTimeout, setInterval: (f, ms) => { const t = setInterval(f, ms); if (t.unref) t.unref(); return t; }, clearInterval,
    addEventListener: et.addEventListener.bind(et), removeEventListener: et.removeEventListener.bind(et), dispatchEvent: et.dispatchEvent.bind(et),
    fetch: () => Promise.reject(new Error('시험: 네트워크 없음')),
    _alerts: [], ...(o.extra || {}),
  };
  c.alert = m => c._alerts.push(String(m));
  c.window = c; c.self = c;
  vm.createContext(c);
  if (o.store || o.user) FF.install(c, { store: o.store, user: o.user });
  for (const f of o.load || []) vm.runInContext(SRC(f), c, { filename: f });
  return c;
}

// ── 1) 은행 (bank.js, ?mock = localStorage 장부)
async function bankTests() {
  console.log('은행 bank.js');
  const c = makeCtx({ url: 'http://127.0.0.1:1/game/poker/?mock', load: ['common/bank.js'] });
  const B = c.Bank;
  const report = (game, coins, round) => c.dispatchEvent(new CustomEvent('chips:report', { detail: { game, coins, round, win: [0], lose: [1] } }));
  const seats = [{ ctrl: 'me', name: '철수' }, { ctrl: 'remote', name: '영희' }];

  // #8 정산하고 새로 시작(새 회차) → 결과 창 '새 게임'(restart) → 첫 판 결과가 장부에 남아야 함
  await B.createGroup({ gid: 'gtest8', name: '시험8', chipWon: 10, loanUnit: 100 });
  const s8 = B.attach({ game: 'poker', cfg: { bank: 'gtest8' }, seats, min: 50 });
  await s8.ready;
  report('poker', [130, 70], 1); await s8.flush();
  await B.saveSettlement('gtest8', { reset: true });           // bank:reset → 이 판은 새 잔액으로
  const st = await s8.restart();
  ok(st[0] === 100 && st[1] === 100, `새 회차 '새 게임' 시작 칩 = 새 잔액 (자동 빌림 100) — ${st}`);
  report('poker', [st[0] + 25, st[1] - 25], 1); await s8.flush();
  const m8 = await B.getMembers('gtest8');
  ok(m8.m_철수.balance === 125 && m8.m_영희.balance === 75, `#8 '새 게임' 뒤 첫 판 결과가 장부에 들어감 (125·75) — ${m8.m_철수.balance}·${m8.m_영희.balance}`);
  const r8 = await s8.beforeNext({ coins: [125, 75] });
  ok(r8.coins[0] === 125 && !r8.reloaded, `#8 다음 판이 첫 판 칩을 그대로 이어감 (다시 불러와 되돌리지 않음) — ${r8.coins} reloaded=${r8.reloaded}`);
  s8.detach();

  // #41 판 사이 빌리기(고스톱: negative, 시작 돈) → '통산 원'(totWon = 정산된 원 + (칩 − base) × 칩값)이 빌린 만큼 부풀면 안 됨
  await B.createGroup({ gid: 'gtest41', name: '시험41', chipWon: 10, loanUnit: 100 });
  const s41 = B.attach({ game: 'gostop', cfg: { bank: 'gtest41' }, seats, min: 1, start: 1000, negative: true });
  const st41 = await s41.ready;
  const rel = s41.rel0();                                        // 고스톱은 이 판을 들고 있다가 계속 씀 (다시 안 부름)
  const totWon = (R, coins, i) => R.totWon[i] + Math.round((coins[i] - R.base[i]) * R.chipWon);
  ok(st41[0] === 100 && rel.base[0] === 100 && totWon(rel, st41, 0) === 0, `시작 돈 100칩 · 통산 0원 — ${st41} base ${rel.base}`);
  await s41.requestLoan(0);
  const r41 = await s41.beforeNext({ coins: st41.slice() });
  ok(r41.coins[0] === 200 && r41.loans.length === 1, `판 사이 빌리기 +100칩 — ${r41.coins}`);
  ok(s41.rel0().base[0] === 200, `#41 빌린 뒤 rel0().base 도 +100 — ${s41.rel0().base[0]}`);
  ok(totWon(rel, r41.coins, 0) === 0, `#41 고스톱이 들고 있던 판의 '통산 원'이 빌린 만큼 안 부풂 (0원) — ${totWon(rel, r41.coins, 0)}원`);
  ok(totWon(rel, r41.coins, 1) === 0 && rel.base[1] === 100, `#41 안 빌린 사람은 그대로 — ${rel.base[1]}`);
  s41.detach();
}

// ── 2) 이름 로그인 (me.js) — 진짜 규칙(gp/*) 흉내
async function meTests() {
  console.log('이름 로그인 me.js');
  const dev = (st, uid, ls) => {
    const c = makeCtx({ url: 'https://benny3s.github.io/game/t/', store: st, user: { uid }, ls, load: ['common/me.js'] });
    c.firebase.initializeApp({ databaseURL: 'fake' });
    return { c, db: c.firebase.app().database(), GME: c.GME };
  };
  // #4 예전 판이 남긴 '유령 이름'(names 만 있고 프로필 없음) → 그 이름으로 이어 받으면 프로필(n)을 채워서 쓸 수 있어야 함
  await block('#4 유령', async () => {
    const st = FF.store({ rules: FF.gpRules });
    st.tree.gp = { names: { 유령이: 'ghostpid' } };
    const { db, GME } = dev(st, 'devA');
    let r = null, err = '';
    try { r = await GME.register(db, '유령이', '1234'); } catch (e) { err = e.message; }
    const p = st.get('gp/players/ghostpid');
    ok(r && r.pid === 'ghostpid' && p && p.n === '유령이' && p.hp === true, `#4 유령 이름 이어 받기 → 프로필 n 채움 — ${r ? JSON.stringify(r) : err} · ${JSON.stringify(p)}`);
  });
  // #4 새 이름: 프로필·PIN 쓰기가 실패(끊김)하면 이름 자리도 안 남아야 함 (규칙상 PIN 없는 이름은 지울 수 없음 → 처음부터 같이 써야)
  await block('#4 새 이름', async () => {
    const st = FF.store({ rules: FF.gpRules });
    const { db, GME } = dev(st, 'devB');
    st.fail = paths => (paths.some(p => /\/pins\//.test(p)) ? new Error('시험: 인터넷 끊김') : null);
    let err = '';
    try { await GME.register(db, '새이름', '1234'); } catch (e) { err = e.message; }
    ok(!!err, `만들기 실패는 오류로 — ${err}`);
    ok(st.get('gp/names/새이름') == null, `#4 실패한 뒤 이름 자리(gp/names)가 안 남음 — ${JSON.stringify(st.get('gp/names'))}`);
    const r = await GME.register(db, '새이름', '1234');
    ok(r && r.isNew && st.get('gp/players/' + r.pid).n === '새이름' && st.get('gp/names/새이름') === r.pid, `다시 하면 새로 만들어짐 — ${JSON.stringify(r)}`);
    // 다른 기기가 같은 이름: PIN 맞으면 이어 받기, 틀리면 거절
    const o = dev(st, 'devC');
    let e2 = ''; try { await o.GME.register(o.db, '새이름', '9999'); } catch (e) { e2 = e.message; }
    ok(/이미 있는 닉네임/.test(e2), `다른 기기 · 틀린 PIN → 거절 — ${e2}`);
    const r2 = await o.GME.register(o.db, '새이름', '1234');
    ok(r2 && r2.pid === r.pid && !r2.isNew, `다른 기기 · 맞는 PIN → 같은 프로필 — ${JSON.stringify(r2)}`);
  });
  // #40 PIN 이 지워진(관리자 초기화) 닉네임 바꾸기 → 'PIN 이 달라요'(틀린 횟수 쌓임)가 아니라 'PIN 을 먼저 정해요' 안내
  await block('#40', async () => {
    const st = FF.store({ rules: FF.gpRules });
    st.tree.gp = { players: { p1: { n: '철수', c: 1, l: 1 } }, names: { 철수: 'p1' } };
    const { db, GME } = dev(st, 'devD', { 'game.me': JSON.stringify({ pid: 'p1', name: '철수' }) });
    const msgs = [];
    for (let i = 0; i < 6; i++) { try { await GME.rename(db, '영수', '0000'); msgs.push('ok'); } catch (e) { msgs.push(e.message); } }
    ok(/PIN 이 없어요/.test(msgs[0]), `#40 PIN 없는 닉네임 바꾸기 → PIN 먼저 정하기 안내 — ${msgs[0]}`);
    ok(!msgs.some(m => /여러 번 틀렸어요|달라요/.test(m)), `#40 틀린 횟수로 안 셈 (6번 해도 잠기지 않음) — ${msgs[5]}`);
    let eb = ''; try { await GME.rename(db, '영수', ''); } catch (e) { eb = e.message; }
    ok(/PIN 이 없어요/.test(eb), `#40 '지금 PIN' 을 비워도 같은 안내 (숫자 4자리 적으라고 안 함) — ${eb}`);
    await GME.changePin(db, '', '4321');                         // PIN 바꾸기 = 처음 정하기 (지금 PIN 안 봄)
    const r = await GME.rename(db, '영수', '4321');
    ok(r && r.name === '영수' && st.get('gp/players/p1').n === '영수' && st.get('gp/names/영수') === 'p1' && st.get('gp/names/철수') == null, `PIN 정한 뒤 닉네임 바꾸기 됨 — ${JSON.stringify(st.get('gp/names'))}`);
  });
}

// ── 3) 시험용 방 (arena-mock.js): 이미 앉은 uid 가 다시 들어오면 (꽉 찬 방이어도) 받아 줌 — 진짜 arena 처럼
async function mockTests() {
  console.log('시험 방 arena-mock.js');
  const util = { cleanCode: s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4), inviteUrl: c => c, roomFromUrl: () => null };
  const tab = uid => makeCtx({ url: 'http://127.0.0.1:1/game/t/?mock', ss: { 'arena.mock.uid': uid }, load: ['common/arena-mock.js'] }).ArenaMock(util);
  const h = await tab('mHOST').host('t', { name: '방장', max: 2 });
  const g = await tab('mGUEST').join('t', h.code, { name: '손님' });
  ok(Object.keys(h.players).length === 2, `둘이 앉음 (꽉 참) — ${Object.keys(h.players)}`);
  let e1 = ''; try { await tab('mGUEST').join('t', h.code, { name: '손님' }); } catch (e) { e1 = e.message; }   // 새로 고침(나간다는 말 없이) = 같은 uid 새 탭
  ok(!e1, `#42 앉아 있던 손님이 다시 들어옴 (꽉 찬 방) — ${e1 || '들어옴'}`);
  let e2 = ''; try { await tab('mOTHER').join('t', h.code, { name: '셋째' }); } catch (e) { e2 = e.message; }
  ok(/꽉 찼어요/.test(e2), `새 사람은 여전히 막힘 — ${e2}`);
  h.leave(); g.leave();
}

// ── 4) WebRTC 후보 (arena.js): 원격 설명보다 먼저 온 ICE 후보를 버리지 않고 모았다가 넣음
async function iceTests() {
  console.log('직접 연결 arena.js');
  const pcs = [];
  class FakePC {                                              // 진짜처럼: 원격 설명 전 addIceCandidate 는 오류 · setRemoteDescription 은 늦게 끝남
    constructor() { this.localDescription = null; this.remoteDescription = null; this.currentRemoteDescription = null; this.added = []; this.early = 0; this.connectionState = 'new'; this.isHost = false; pcs.push(this); }
    createDataChannel(label) { this.isHost = true; return { label, readyState: 'connecting', bufferedAmount: 0, send() {}, close() {} }; }
    async createOffer() { return { type: 'offer', sdp: 'o' }; }
    async createAnswer() { return { type: 'answer', sdp: 'a' }; }
    async setLocalDescription(d) { this.localDescription = d; setTimeout(() => { for (let i = 0; i < 2; i++) if (this.onicecandidate) this.onicecandidate({ candidate: { candidate: 'cand' + i, sdpMid: '0', sdpMLineIndex: 0 } }); }, 0); }
    setRemoteDescription(d) { return new Promise(r => setTimeout(() => { this.remoteDescription = this.currentRemoteDescription = d; r(); }, 40)); }
    addIceCandidate(c) { if (!this.remoteDescription) { this.early++; return Promise.reject(new Error('InvalidStateError: remote description is null')); } this.added.push(c); return Promise.resolve(); }
    close() { this.connectionState = 'closed'; }
  }
  const st = FF.store();
  const H = makeCtx({ store: st, user: { uid: 'uHOST' }, extra: { RTCPeerConnection: FakePC }, load: ['common/arena.js'] });
  const W = makeCtx({ store: st, user: { uid: 'uGUEST' }, extra: { RTCPeerConnection: FakePC }, load: ['common/arena.js'] });
  const h = await H.Arena.host('t', { name: '방장', max: 2 });
  const g = await W.Arena.join('t', h.code, { name: '손님' });
  const hp = () => pcs.find(p => p.isHost), cp = () => pcs.find(p => !p.isHost);
  await until(() => hp() && cp() && hp().added.length + hp().early >= 2 && cp().added.length + cp().early >= 2 && hp().remoteDescription && cp().remoteDescription, 3000);
  await sleep(120);
  ok(!!(hp() && cp()), `방장·손님 연결 객체 생김 — ${pcs.length}`);
  ok(cp() && cp().added.length === 2, `#7 손님: 방장 후보 2개를 원격 설명 뒤에 넣음 (먼저 넣다 버린 것 ${cp() && cp().early}) — 넣은 것 ${cp() && cp().added.length}`);
  ok(hp() && hp().added.length === 2, `#7 방장: 손님 후보 2개를 넣음 (먼저 넣다 버린 것 ${hp() && hp().early}) — 넣은 것 ${hp() && hp().added.length}`);
  h.leave(); g.leave();
}

(async () => {
  const t0 = Date.now();
  for (const t of [bankTests, meTests, mockTests, iceTests]) {
    try { await t(); } catch (e) { fail++; console.log('  ✘ FAIL: 시험 도구 예외 ' + (e.stack || e.message)); }
  }
  console.log(`\n공용 모듈 selftest: 통과 ${pass} · 실패 ${fail} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  process.exit(fail ? 1 : 0);                                  // BroadcastChannel 이 남아 있어도 끝냄
})();
