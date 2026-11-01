/* 모임 칩 '은행' (common/bank.js) — 섯다·홀덤·고스톱 … 돈 거는 게임 공용 장부
   · 실제 돈은 앱 밖에서. 앱은 칩 장부만 쓰고, 끝나면 '누가 누구에게 얼마' (송금 횟수 최소) 를 알려 줌
   · 장부 주인 = 모임(gid). 방은 열고 닫혀도 잔액은 그대로, 초기화(새 회차)는 관리자·허용 기기만
   · 10-31 베니 님: 장부는 하나(🏦 기본 은행 gbasic, 저절로 생김 — 새 모임 만들기 없앰). '정산하고 새로 시작' = 누가 누구에게 얼마 + 돈만 0,
     🏆 승패(records)·장부·정산 기록은 계속 쌓임. 📈 누적 손익 = 'reset' 정산들의 nets 합 (loadTotals)
   · 11-01 💵 오늘 내기 장부 (진짜 돈 내기, 24시간): 대기실 은행 고르기에서 '➕ 오늘 내기 장부 새로' (방장, 점당 원 입력, 기본 100) →
     gid `gbet-YYYYMMDD-HHMM-xxxx` (규칙이 gid 를 g 로 시작하게 요구) · meta {name:"💵 내기 MM/DD HH:MM", chipWon, loanUnit, kind:'bet', expires: 만든 때 + 24h}.
     판 결과는 기존 attach()/chips:report 길 그대로 그 gid 에 씀 (게임 코드 변경 없음) — 처음 앉은 사람은 첫 판에 저절로 멤버로 생김 · 정산은 같은 🧾 패널(방 손님은 '정산 보기' 읽기 전용).
     24시간 뒤: attach 의 load/판 결과/borrow/applyDeltas 가 assertOpen 에서 막고 onEvent({op:'error'}) · 대기실에선 안 보임 · 은행 창 장부 고르기엔 '(끝남)' 으로 남아 보기·정산 가능.
     kind·expires 는 규칙에 없으면 빼고 저장 (createGroup 재시도) — 판별은 gid 모양으로도 되므로(calc.isBet·expiresOf) 규칙 배포 전에도 동작.
   · 데이터 bank/{gid}: meta {name, chipWon(1칩=원), loanUnit(한 번 빌리는 칩), created, by, kind?('bet'), expires?}
       members/{pid} {name, borrowed, balance, updated} · ledger/{id} {t, type: loan|game|adjust|reset|ai, pid, amount, game, round, room, by, name, note, pids(ai: 그 판 사람들)}
       settlements/{id} {t, by, lines:[{from,to,won,fn,tn}], nets:{pid:원}, members(그때 잔액), chipWon, residualWon}
     모임 목록: bank/_list/{gid} {name, t}.  ?guest = test/bank/ · ?mock = 이 브라우저 localStorage (탭끼리 같이 씀, 시험용)
   · 읽기: meta·members 는 누구나(로그인), ledger·settlements 는 관리자·허용 기기만. 쓰기는 관리자·허용 기기만 (친구랑은 방장이 씀)
   API (window.Bank) — arena.js(연결)·me.js(이름) 다음에 넣음
     panel({ game, gid, tab })               은행 창: 모임 고르기·만들기, 잔액, 빌려주기·조정, 정산(카톡 복사), 기록
     lobbyPicker(el, cfg, canEdit, update)   대기실 설정 줄: update({ bank: gid|null, bankName }) · 방장은 💵 내기 장부 새로 만들기도
     createBetLedger({ chipWon })            💵 24시간 내기 장부 만들기 → { gid, name, chipWon, kind, expires }
     label(cfg)                              방 목록·손님 대기실용 짧은 글 ("🏦 금요 모임")
     attach({ game, net, cfg, seats, min, onEvent })  친구랑 판: 방장이면 장부 연결, 손님이면 빌리기 요청만
       방장: s.ready → 자리별 시작 칩 [잔액|null(AI)] · 'chips:report' 를 들어 판마다 장부에 씀 · s.beforeNext({coins,min}) → 빌린 칩 더한 coins
       손님: s.requestLoan() (방장이 다음 판에 넣어 줌) · 둘 다 s.detach()
     askLoan(gid) → Promise<boolean>        "1,000칩 빌릴까요?" 확인 창
     stackFor(pid, gid) → Promise<number>   모임 잔액
     calc                                    정산 계산 (Node 에서도 require) */
const BankCalc = (() => {
  const num = v => (typeof v === "number" && isFinite(v) ? v : Number.isFinite(+v) ? +v : 0);
  const int = v => Math.round(num(v));
  const fmt = n => Math.round(num(n)).toLocaleString("ko-KR");
  const sfmt = n => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
  const norm = m => { m = m || {}; return { name: String(m.name || ""), balance: int(m.balance), borrowed: int(m.borrowed) }; };
  // 장부 계산: 빌리기 = 잔액·빌린 칩 같이 늘림 · 판 결과 = 잔액만 · 새 회차 = 둘 다 0
  const loan = (m, n) => { m = norm(m); n = int(n); return { ...m, balance: m.balance + n, borrowed: m.borrowed + n }; };
  const delta = (m, d) => { m = norm(m); return { ...m, balance: m.balance + int(d) }; };
  const reset = m => ({ ...norm(m), balance: 0, borrowed: 0 });

  // 정확한 원 금액들을 unit 원 단위로 반올림하되 합은 꼭 0 (큰 나머지부터 1단위씩)
  function roundZeroSum(vals, unit) {
    const u = unit > 0 ? unit : 1;
    const x = vals.map(v => Math.round((num(v) / u) * 1e6) / 1e6);
    const f = x.map(Math.floor);
    let need = Math.round(x.reduce((a, b) => a + b, 0)) - f.reduce((a, b) => a + b, 0);
    const order = x.map((v, i) => [v - f[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; k < need && order.length; k++) f[order[k % order.length][1]]++;
    return f.map(v => v * u + 0);
  }

  // 한 묶음(합 0) 안에서: 가장 많이 잃은 사람 → 가장 많이 딴 사람 (묶음 크기 − 1 번 이하)
  function greedy(items) {
    const cr = items.filter(x => x.won > 0).map(x => ({ ...x })).sort((a, b) => b.won - a.won || (a.pid < b.pid ? -1 : 1));
    const db = items.filter(x => x.won < 0).map(x => ({ ...x, won: -x.won })).sort((a, b) => b.won - a.won || (a.pid < b.pid ? -1 : 1));
    const out = [];
    let i = 0, j = 0;
    while (i < db.length && j < cr.length) {
      const pay = Math.min(db[i].won, cr[j].won);
      if (pay > 0) out.push({ from: db[i].pid, to: cr[j].pid, won: pay });
      db[i].won -= pay; cr[j].won -= pay;
      if (db[i].won === 0) i++;
      if (cr[j].won === 0) j++;
    }
    return out;
  }
  // 송금 횟수 최소: 합이 0 인 묶음을 가장 많이 나누면 (사람 수 − 묶음 수) 번. 16명까지는 정확히(비트 DP), 그 이상은 욕심법
  function minTransfers(list) {
    const items = (list || []).filter(x => int(x.won) !== 0).map(x => ({ pid: String(x.pid), won: int(x.won) })).sort((a, b) => (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0));
    const n = items.length;
    if (!n) return [];
    if (n > 16) return greedy(items);
    const N = 1 << n, sum = new Float64Array(N), dp = new Int8Array(N);
    for (let m = 1; m < N; m++) { const lb = m & -m; sum[m] = sum[m ^ lb] + items[31 - Math.clz32(lb)].won; }
    if (sum[N - 1] !== 0) return greedy(items);                 // 합이 0 이 아니면 (잘못 넣음) 욕심법으로라도
    for (let m = 1; m < N; m++) {
      let best = 0;
      for (let r = m; r; r &= r - 1) { const v = dp[m ^ (r & -r)]; if (v > best) best = v; }
      dp[m] = best + (sum[m] === 0 ? 1 : 0);
    }
    // 되짚기: 지나간 '합 0' 집합들의 차이가 묶음
    const zeros = [];
    let m = N - 1;
    while (m) {
      if (sum[m] === 0) zeros.push(m);
      let pick = 0, best = -1;
      for (let r = m; r; r &= r - 1) { const b = r & -r, v = dp[m ^ b]; if (v > best) { best = v; pick = b; } }
      m ^= pick;
    }
    const out = [];
    for (let k = 0; k < zeros.length; k++) {
      const g = zeros[k] & ~(zeros[k + 1] || 0);
      out.push(...greedy(items.filter((_, i) => g & (1 << i))));
    }
    return out;
  }

  // 정산: net = 잔액 − 빌린 칩. AI·조정으로 합이 0 이 아니면 그 몫(residual)을 나눔
  //   opt.pools: [{ pids, chips }] — AI 와 한 판의 사람 쪽 손익(chips)을 그 판에 앉은 사람(pids)끼리 똑같이 나눔 (장부 'ai' 줄에서)
  //   나머지(칩 조정 등)는 이번 회차에 낀 사람 모두가 똑같이
  //   opt.unit: 원 반올림 단위(기본 1) · opt.residual: 'split'(기본) | 'bank'(🏦 은행 자리로 따로 표시)
  function settle(members, chipWon, opt) {
    opt = opt || {};
    const cw = num(chipWon) > 0 ? num(chipWon) : 1;
    const rows = Object.keys(members || {}).sort().map(pid => {
      const m = norm(members[pid]);
      return { pid, name: m.name || pid, balance: m.balance, borrowed: m.borrowed, chips: m.balance - m.borrowed };
    });
    const active = rows.filter(r => r.borrowed || r.balance || r.chips);
    const residualChips = active.reduce((a, r) => a + r.chips, 0);
    const parts = active.map(r => ({ ...r }));
    if (residualChips && opt.residual === "bank") parts.push({ pid: "_bank", name: "🏦 은행(AI)", balance: 0, borrowed: 0, chips: -residualChips, bank: true });
    const shift = {};
    if (residualChips && opt.residual !== "bank" && parts.length) {
      const act = new Set(parts.map(r => r.pid));
      let left = residualChips;
      for (const p of opt.pools || []) {
        const ids = [...new Set((p && p.pids) || [])].filter(pid => act.has(pid)), c = num(p && p.chips);
        if (!ids.length || !c) continue;
        for (const pid of ids) shift[pid] = (shift[pid] || 0) + c / ids.length;
        left -= c;
      }
      if (Math.abs(left) > 1e-9) for (const r of parts) shift[r.pid] = (shift[r.pid] || 0) + left / parts.length;
    }
    const exact = parts.map(r => (r.chips - (shift[r.pid] || 0)) * cw);
    const won = roundZeroSum(exact, opt.unit || 1);
    parts.forEach((r, i) => { r.won = won[i]; r.share = -(shift[r.pid] || 0); });
    const lines = minTransfers(parts.map(r => ({ pid: r.pid, won: r.won })));
    const nameOf = pid => (parts.find(r => r.pid === pid) || {}).name || pid;
    lines.forEach(l => { l.fn = nameOf(l.from); l.tn = nameOf(l.to); });
    return {
      rows: parts, lines, chipWon: cw,
      residualChips, residualWon: Math.round(residualChips * cw), split: residualChips ? (opt.residual === "bank" ? "bank" : "split") : "",
      total: won.reduce((a, b) => a + b, 0),
    };
  }

  // 장부(키 순서) → 마지막 새 회차 뒤의 'ai' 줄들 = AI 와 한 판 묶음 (amount = AI 가 딴 칩, 사람 쪽은 그 반대)
  function poolsFromLedger(lines) {
    const arr = (lines || []).filter(Boolean);
    let start = 0;
    arr.forEach((l, i) => { if (l.type === "reset") start = i + 1; });
    return arr.slice(start).filter(l => l.type === "ai" && l.pids).map(l => ({ pids: String(l.pids).split(",").filter(Boolean), chips: -int(l.amount) }));
  }

  // 카톡에 붙여 넣을 글
  function text(res, meta, when) {
    const d = new Date(when || Date.now());
    const pad = v => String(v).padStart(2, "0");
    const L = [`🏦 ${(meta && meta.name) || "모임"} 정산 (${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())})`, "━━━━━━━━"];
    const rows = res.rows.slice().sort((a, b) => b.won - a.won);
    for (const r of rows) L.push(`${r.name} ${sfmt(r.won)}원`);
    L.push("━━━━━━━━");
    if (res.lines.length) { L.push("💸 보낼 돈"); for (const l of res.lines) L.push(`${l.fn} → ${l.tn} ${fmt(l.won)}원`); }
    else L.push("보낼 돈이 없어요 🙂");
    if (res.split === "split") L.push(`(AI·조정 몫 ${sfmt(-res.residualWon)}원은 같이 한 사람끼리 똑같이 나눴어요)`);
    return L.join("\n");
  }
  // 💵 오늘 내기 장부 (진짜 돈 내기, 24시간): gid = gbet-YYYYMMDD-HHMM-xxxx (규칙이 gid 를 g 로 시작하게 요구 → 'bet-' 가 아니라 'gbet-')
  //   종류·끝나는 때는 meta {kind:'bet', expires} 에 적되, 규칙 배포 전·옛 기기도 되게 gid 만으로도 알 수 있음 (시작 + 24시간)
  const BET_MS = 24 * 3600 * 1000;
  const p2 = v => String(v).padStart(2, "0");
  const betGid = (d, rnd) => `gbet-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}-${String(rnd || "x").replace(/[^a-z0-9]/gi, "").toLowerCase().padEnd(4, "0").slice(0, 4)}`;
  const betName = d => `💵 내기 ${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const isBet = (gid, meta) => (meta && meta.kind === "bet") || /^gbet-\d{8}-\d{4}-/.test(String(gid || ""));
  const betStart = gid => { const m = /^gbet-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-/.exec(String(gid || "")); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0; };
  const expiresOf = (gid, meta) => (!isBet(gid, meta) ? 0 : num(meta && meta.expires) > 0 ? num(meta.expires) : betStart(gid) ? betStart(gid) + BET_MS : 0);
  const isExpired = (gid, meta, now) => { const e = expiresOf(gid, meta); return e > 0 && num(now) >= e; };
  const leftText = (gid, meta, now) => {                       // "11시간 남음" | "40분 남음" | "끝남"
    const e = expiresOf(gid, meta), ms = e - num(now);
    if (!e) return "";
    if (ms <= 0) return "끝남";
    return ms >= 3600000 ? `${Math.floor(ms / 3600000)}시간 남음` : `${Math.max(1, Math.ceil(ms / 60000))}분 남음`;
  };
  return { num, int, fmt, sfmt, norm, loan, delta, reset, roundZeroSum, minTransfers, greedy, settle, poolsFromLedger, text, BET_MS, betGid, betName, isBet, expiresOf, isExpired, leftText };
})();
if (typeof module !== "undefined" && module.exports) module.exports = BankCalc;

if (typeof window !== "undefined") (() => {
  const C = BankCalc, { int, fmt, sfmt } = C;
  const qs = new URLSearchParams(location.search);
  const MOCK = qs.has("mock") || qs.get("arena") === "mock";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
  const nameKey = n => (window.GME && GME.nameKey ? GME.nameKey(n) : String(n).trim().toLowerCase().replace(/\s+/g, "").replace(/[.#$\[\]\/]/g, "_"));
  const strip = o => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k]; return o; };
  const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));

  // ── 저장소 두 가지 (같은 모양): Firebase RTDB / 시험용 localStorage
  function mockStore() {
    const KEY = "bank.mock.v1";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
    const parts = p => String(p).split("/").filter(Boolean);
    const getIn = (t, p) => { let o = t; for (const k of parts(p)) { if (!o || typeof o !== "object") return null; o = o[k]; } return o === undefined ? null : o; };
    const setIn = (t, p, v) => {
      const ks = parts(p), last = ks.pop(); let o = t;
      for (const k of ks) { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; }
      if (v == null) delete o[last]; else o[last] = clone(v);
    };
    const subs = new Set();
    const fire = () => { for (const s of [...subs]) s.check(); };
    const write = t => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} setTimeout(fire, 0); };
    window.addEventListener("storage", e => { if (e.key === KEY || e.key === null) fire(); });
    let n = 0;
    return {
      ready: async () => true,
      get: async p => clone(getIn(read(), p)),
      set: async (p, v) => { const t = read(); setIn(t, p, v); write(t); },
      update: async (p, o) => { const t = read(); for (const k of Object.keys(o)) setIn(t, p + "/" + k, o[k]); write(t); },
      txn: async (p, fn) => { const t = read(); const v = fn(clone(getIn(t, p))); if (v === undefined) return clone(getIn(t, p)); setIn(t, p, v); write(t); return clone(v); },
      key: () => "k" + Date.now().toString(36) + (n++).toString(36).padStart(4, "0") + Math.random().toString(36).slice(2, 6),
      last: async (p, k) => { const o = getIn(read(), p) || {}; return Object.keys(o).sort().slice(-k).map(id => ({ id, ...o[id] })); },
      on: (p, cb) => { let lastJ; const s = { check() { const v = getIn(read(), p); const j = JSON.stringify(v); if (j !== lastJ) { lastJ = j; try { cb(clone(v)); } catch (e) { console.error(e); } } } }; subs.add(s); s.check(); return () => subs.delete(s); },
      now: () => Date.now(),
    };
  }
  function fbStore() {
    let db = null;
    const ROOT = () => (window.Arena && Arena.GUEST ? "test/" : "");
    const ready = async () => { if (db) return db; if (!window.Arena) throw new Error("연결 모듈이 없어요"); await Arena.init(); db = Arena.db(); return db; };
    const ref = p => db.ref(ROOT() + p);
    return {
      ready,
      get: async p => { await ready(); return (await ref(p).get()).val(); },
      set: async (p, v) => { await ready(); return ref(p).set(v); },
      update: async (p, o) => { await ready(); return ref(p).update(o); },
      txn: async (p, fn) => { await ready(); const r = await ref(p).transaction(cur => fn(cur)); return r.snapshot.val(); },
      key: () => db.ref().push().key,
      last: async (p, k) => { await ready(); const v = (await ref(p).orderByKey().limitToLast(k).get()).val() || {}; return Object.keys(v).sort().map(id => ({ id, ...v[id] })); },
      on: (p, cb) => {
        let off = null, dead = false;
        ready().then(() => { if (dead) return; const r = ref(p), f = s => cb(s.val()); r.on("value", f, e => cb(null, e)); off = () => r.off("value", f); }).catch(e => cb(null, e));
        return () => { dead = true; if (off) off(); };
      },
      now: () => (window.Arena && Arena.now ? Arena.now() : Date.now()),
    };
  }
  const S = MOCK ? mockStore() : fbStore();
  const G = gid => "bank/" + gid;

  // 관리 권한: 관리자 또는 허용된 기기 (Gate 한 곳) — 규칙(RTDB)이 진짜 판단
  function canManage() {
    try { if (window.Gate && Gate.canManage && Gate.canManage()) return true; } catch (e) {}
    return !!(window.Arena && Arena.canHost === true && !(window.Gate && Gate.state && Gate.state.role === "room_guest"));
  }
  const byName = () => clean((window.GME && GME.me && GME.me.name) || (window.Gate && Gate.state && Gate.state.name) || (MOCK ? "시험" : "방장"), 20) || "방장";

  // 이름 → pid (사이트 공통 이름 로그인 gp/names). 시험·이름 없음은 이름으로 만든 키
  async function pidFor(name) {
    name = clean(name, 12);
    const key = nameKey(name) || "x";
    if (MOCK) return "m_" + key;
    if (window.GME && GME.me && GME.me.pid && GME.me.name === name) return GME.me.pid;
    try {
      await S.ready();
      const v = (await Arena.db().ref((window.GME ? GME.P : "") + "gp/names/" + key).get()).val();
      if (typeof v === "string" && /^[^.#$\[\]\/]{1,40}$/.test(v)) return v;
    } catch (e) {}
    return ("n_" + key).slice(0, 40);
  }

  // ── 장부 읽기·쓰기
  async function listGroups() {
    const v = (await S.get("bank/_list")) || {};
    return Object.keys(v).map(gid => ({ gid, ...v[gid] })).sort((a, b) => (b.t || 0) - (a.t || 0));
  }
  async function getMeta(gid) { const m = await S.get(G(gid) + "/meta"); if (!m) throw new Error("모임을 찾지 못했어요"); return m; }
  async function getMembers(gid) { return (await S.get(G(gid) + "/members")) || {}; }
  async function stackFor(pid, gid) { const m = await S.get(G(gid) + "/members/" + pid); return m ? int(m.balance) : 0; }
  function ledgerLine(type, pid, amount, info) {
    info = info || {};
    return strip({
      t: S.now(), type, pid: String(pid || "").slice(0, 40), amount: int(amount), by: byName(),
      game: info.game ? clean(info.game, 16) : null, round: Number.isFinite(info.round) ? Math.max(0, Math.min(1e6, Math.round(info.round))) : null,
      room: info.room ? clean(info.room, 8) : null, name: info.name ? clean(info.name, 12) : null, note: info.note ? clean(info.note, 60) : null,
    });
  }
  // 🏦 기본 은행: 따로 안 만들어도 처음부터 있음 (1칩 = 100원, 한 번 빌리면 50칩 = 5,000원 · 칩은 100원·500원 두 가지로 셈)
  const DEFAULT = { gid: "gbasic", name: "기본 은행", chipWon: 100, loanUnit: 50 };
  async function ensureDefault(groups) {
    if (groups.some(g => g.gid === DEFAULT.gid) || !canManage()) return groups;
    try { await createGroup(DEFAULT); return [{ gid: DEFAULT.gid, name: DEFAULT.name, t: 0 }].concat(groups); } catch (e) { return groups; }
  }
  // 원으로 보이기: 500원·100원 칩 묶음 (은행이 알아서 바꿔 줌)
  const won = (chips, meta) => Math.round(int(chips) * ((meta && meta.chipWon) || 0));
  function chipText(chips, meta) {
    if (!meta || !meta.chipWon) return fmt(int(chips)) + "칩";
    const w = won(chips, meta);
    return fmt(w) + "원";
  }
  async function createGroup({ name, chipWon, loanUnit, gid, kind, expires }) {
    await S.ready();
    name = clean(name, 20) || "우리 모임";
    chipWon = Math.min(100000, Math.max(0.01, Number(chipWon) || 10));
    loanUnit = Math.min(1e7, Math.max(10, Math.round(Number(loanUnit) || 1000)));
    gid = gid && /^g[A-Za-z0-9_-]{3,23}$/.test(gid) ? gid : ("g" + S.key().replace(/[^A-Za-z0-9_-]/g, "")).slice(0, 24);
    const t = S.now();
    const meta = { name, chipWon, loanUnit, created: t, by: byName() };
    if (kind) { meta.kind = clean(kind, 8); if (expires) meta.expires = int(expires); }
    const put = m => S.update("bank", { [gid + "/meta"]: m, ["_list/" + gid]: { name, t } });
    try { await put(meta); }
    catch (e) { if (!kind) throw e; delete meta.kind; delete meta.expires; await put(meta); }   // 규칙(meta kind·expires)이 아직 안 올라갔으면 빼고 — 내기 장부는 gid 만으로도 알아봄
    return { gid, name, chipWon, loanUnit, kind: meta.kind || null, expires: meta.expires || 0 };
  }
  // 💵 오늘 내기 장부 만들기: 점당 원(chipWon) 하나만 받음. 24시간 뒤엔 새 결과를 안 씀 (보기·정산만)
  async function createBetLedger({ chipWon } = {}) {
    await S.ready();
    const now = S.now(), d = new Date(now);
    const cw = Math.round(Number(chipWon));
    if (!(cw >= 1 && cw <= 100000)) throw new Error("점당 원은 1~100,000 사이로 적어 주세요");
    const rnd = Math.random().toString(36).replace(/[^a-z0-9]/g, "").padEnd(4, "0").slice(0, 4);
    return createGroup({ gid: C.betGid(d, rnd), name: C.betName(d), chipWon: cw, loanUnit: 50, kind: "bet", expires: now + C.BET_MS });
  }
  // 끝난 내기 장부엔 판 결과·자동 채움을 못 씀 (meta 를 이미 읽었으면 넘겨 줌)
  const closedMsg = "💵 내기 장부(24시간)가 끝났어요 — 이 판은 장부에 안 남고 연습 칩으로 해요. 새 장부는 대기실에서 만들어요";
  async function assertOpen(gid, meta) {
    if (!C.isBet(gid)) return;
    if (!meta) meta = await getMeta(gid);
    if (C.isExpired(gid, meta, S.now())) throw new Error(closedMsg);
  }
  async function borrow(gid, pid, name, n, info) {
    const meta = await getMeta(gid);
    await assertOpen(gid, meta);
    n = int(n || meta.loanUnit);
    if (n <= 0) throw new Error("빌릴 칩이 0이에요");
    const m = await S.txn(G(gid) + "/members/" + pid, cur => {
      const x = C.loan(cur || { name }, n);
      return { name: clean(name || (cur && cur.name), 12) || "?", borrowed: x.borrowed, balance: x.balance, updated: S.now() };
    });
    await S.set(G(gid) + "/ledger/" + S.key(), ledgerLine("loan", pid, n, { ...(info || {}), name: name || (m && m.name) }));
    return m;
  }
  // 판 결과 쓰기. table = 그 판에 앉은 사람 pid 들 — 사람 칩 합이 0 이 아니면(AI 와 주고받음) 'ai' 줄로 남겨 정산 때 그 사람들끼리 나눔
  async function applyDeltas(gid, rows, info, table) {
    await assertOpen(gid);
    let sum = 0;
    for (const r of rows) {
      const d = int(r.delta);
      if (!d) continue;
      sum += d;
      await S.txn(G(gid) + "/members/" + r.pid, cur => { const x = C.delta(cur || { name: r.name }, d); return { name: clean(r.name || (cur && cur.name), 12) || "?", borrowed: x.borrowed, balance: x.balance, updated: S.now() }; });
      await S.set(G(gid) + "/ledger/" + S.key(), ledgerLine("game", r.pid, d, { ...(info || {}), name: r.name }));
    }
    if (sum && table && table.length) {
      const pids = table.join(",").slice(0, 600);
      await S.set(G(gid) + "/ledger/" + S.key(), { ...ledgerLine("ai", "", -sum, { ...(info || {}), name: "AI" }), pids });
    }
  }
  async function adjust(gid, pid, balance, note) {
    let old = 0, nm = "?";
    const nb = Math.max(-1e9, Math.min(1e9, int(balance)));
    await S.txn(G(gid) + "/members/" + pid, cur => { const m = C.norm(cur); old = m.balance; nm = m.name || "?"; return { name: nm, borrowed: m.borrowed, balance: nb, updated: S.now() }; });
    if (nb !== old) await S.set(G(gid) + "/ledger/" + S.key(), ledgerLine("adjust", pid, nb - old, { name: nm, note }));
  }
  async function addMember(gid, name) {
    name = clean(name, 12);
    if (!name) throw new Error("이름을 적어 주세요");
    const pid = await pidFor(name);
    const cur = await S.get(G(gid) + "/members/" + pid);
    if (cur) return { pid, existed: true };
    await S.set(G(gid) + "/members/" + pid, { name, borrowed: 0, balance: 0, updated: S.now() });
    return { pid, existed: false };
  }
  // 🏆 승패 (모임 장부에 같이: 방을 다시 열어도 이어짐, 새 회차면 0)
  async function getRecords(gid) { return (await S.get(G(gid) + "/records")) || {}; }
  async function addRecord(gid, pid, name, win) {
    return S.txn(G(gid) + "/records/" + pid, cur => ({ name: clean(name || (cur && cur.name), 12) || "?", w: int(cur && cur.w) + (win ? 1 : 0), l: int(cur && cur.l) + (win ? 0 : 1), updated: S.now() }));
  }
  // 🆚 상대 전적 (두 사람끼리): pairs/{작은 pid~큰 pid} = { a, b, wa, wb, ma(a 가 b 에게서 딴 칩, 마이너스면 잃음) }
  const pairKey = (x, y) => [x, y].sort().join("~").replace(/[.#$\[\]\/]/g, "_").slice(0, 120);
  // 한 판 칩 변화 → 두 사람끼리 오간 칩 (잃은 사람 몫을 딴 사람들에게 딴 만큼 나눔, 합 = 변화)
  function pairFlows(rows) {
    const pos = rows.filter(r => r.delta > 0), neg = rows.filter(r => r.delta < 0), P = pos.reduce((a, r) => a + r.delta, 0), out = [];
    if (!P) return out;
    for (const n of neg) for (const p of pos) { const f = Math.round((-n.delta * p.delta) / P); if (f) out.push({ win: p.pid, lose: n.pid, chips: f }); }
    return out;
  }
  async function removeMember(gid, pid) { return S.set(G(gid) + "/members/" + pid, null); }
  // 누적: '정산하고 새로 시작'한 회차들의 원 손익 합 (사람별 { name, won, sets }) — 정산 기록은 관리자·허용 기기만 읽힘
  async function loadTotals(gid) {
    const sets = await S.last(G(gid) + "/settlements", 1000);
    const out = {};
    for (const s of sets) {
      if (!s || !s.reset) continue;                           // 저장만 한 정산(예전 단추)은 다음 회차 정산에 이미 들어 있음
      for (const pid of Object.keys(s.nets || {})) {
        const o = out[pid] || (out[pid] = { name: (s.members && s.members[pid] && s.members[pid].name) || pid, won: 0, sets: 0 });
        o.won += int(s.nets[pid]); o.sets++;
      }
    }
    return out;
  }
  // 정산 저장 (+ reset 이면 돈만 0, 기록은 남김)
  async function loadPools(gid) { return C.poolsFromLedger(await S.last(G(gid) + "/ledger", 1000)); }
  async function saveSettlement(gid, { reset } = {}) {
    const [meta, members, pools] = await Promise.all([getMeta(gid), getMembers(gid), loadPools(gid).catch(() => [])]);
    const res = C.settle(members, meta.chipWon, { pools });
    const t = S.now(), by = byName();
    const snapM = {}, nets = {};
    for (const pid of Object.keys(members)) { const m = C.norm(members[pid]); snapM[pid] = { name: clean(m.name, 12) || "?", borrowed: m.borrowed, balance: m.balance }; }
    for (const r of res.rows) nets[r.pid] = r.won;
    const upd = {};
    upd["settlements/" + S.key()] = strip({
      t, by, chipWon: res.chipWon, residualWon: res.residualWon || 0, reset: reset ? true : null,
      lines: res.lines.map(l => ({ from: l.from, to: l.to, won: l.won, fn: clean(l.fn, 12), tn: clean(l.tn, 12) })),
      nets, members: snapM,
    });
    if (reset) {                                              // 돈(칩·빌린 칩)만 0 — 승패·장부·정산 기록은 그대로 쌓임 (10-31 베니 님)
      for (const pid of Object.keys(members)) upd["members/" + pid] = { name: snapM[pid].name, borrowed: 0, balance: 0, updated: t };
      upd["ledger/" + S.key()] = ledgerLine("reset", "", 0, { note: "정산하고 새로 시작 (돈만 0)" });
    }
    await S.update(G(gid), upd);
    if (reset) try { window.dispatchEvent(new CustomEvent("bank:reset", { detail: { gid } })); } catch (e) {}   // 이 기기에서 돌고 있는 판은 다음 판에 새 잔액으로
    return { res, meta, t };
  }

  // ── 화면 (게임의 CSS 변수를 따름, 없으면 기본 어두운 라운지)
  const css = `
.bk-ov{position:fixed;inset:0;z-index:300;background:rgba(4,9,16,.78);backdrop-filter:blur(8px);display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px);-webkit-tap-highlight-color:transparent}
.bk-box{position:relative;background:var(--card,#142030);border:1.5px solid var(--card-border,rgba(255,255,255,.15));color:var(--ink,#f1f5f9);border-radius:20px;padding:18px 16px 16px;width:min(460px,100%);max-height:100%;overflow:auto;display:grid;gap:12px;box-shadow:0 24px 60px rgba(0,0,0,.65);font:14.5px/1.45 var(--text,system-ui,"Malgun Gothic",sans-serif);box-sizing:border-box}
.bk-box *{box-sizing:border-box}
.bk-box h2{margin:0;font:800 21px/1.2 var(--round,inherit);color:#fde68a;padding-right:40px}
.bk-box h3{margin:0;font:800 15px/1.3 var(--round,inherit);color:#fde68a}
.bk-box p{margin:0}
.bk-soft{color:var(--soft,#94a3b8);font-size:12.5px}
.bk-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:var(--ink,#f1f5f9);font-size:16px;cursor:pointer}
.bk-btn{font:700 14px/1 var(--round,inherit);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:11px 14px;cursor:pointer;background:rgba(255,255,255,.08);color:var(--ink,#f1f5f9);white-space:nowrap}
.bk-btn:hover:not(:disabled){background:rgba(255,255,255,.14)}
.bk-btn:disabled{opacity:.42;cursor:default}
.bk-btn.pri{background:linear-gradient(135deg,var(--accent,#10b981),var(--accent-d,#047857));border-color:rgba(255,255,255,.22);color:#fff}
.bk-btn.warn{background:rgba(229,83,107,.18);border-color:rgba(229,83,107,.45)}
.bk-btn.sm{padding:7px 9px;font-size:12.5px;border-radius:9px}
.bk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bk-row>*{min-width:0}
.bk-row[hidden]{display:none}
.bk-grow{flex:1 1 0}
.bk-in,.bk-sel{font:600 15px var(--text,inherit);background:rgba(0,0,0,.32);color:var(--ink,#f1f5f9);border:1.5px solid var(--line,rgba(255,255,255,.18));border-radius:11px;padding:9px 11px;outline:none;width:100%;min-width:0}
.bk-in:focus,.bk-sel:focus{border-color:var(--gold,#f59e0b)}
.bk-sel option{color:#111;background:#fff}
.bk-meta{display:flex;gap:6px;flex-wrap:wrap}
.bk-chip{font-size:12px;font-weight:700;padding:4px 9px;border-radius:99px;background:rgba(0,0,0,.28);border:1px solid var(--line,rgba(255,255,255,.12));color:var(--ink,#f1f5f9)}
.bk-list{display:grid;gap:6px}
.bk-m{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:9px 11px;border-radius:12px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.07)}
.bk-m b{font:700 15px var(--round,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bk-m .nums{grid-column:1/2;font-size:12px;color:var(--soft,#94a3b8)}
.bk-m .net{grid-row:1/3;grid-column:2/3;text-align:right;font:800 15px/1.2 var(--round,inherit)}
.bk-m .net small{display:block;font:600 11.5px var(--text,inherit);color:var(--soft,#94a3b8)}
.bk-m .acts{grid-column:1/3;display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.bk-m.me{border-color:var(--gold,#f59e0b)}
.bk-up{color:#86efac}.bk-down{color:#fca5a5}
.bk-lines{display:grid;gap:6px}
.bk-line{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);font:700 15px var(--round,inherit)}
.bk-line .w{margin-left:auto;color:#fde68a;white-space:nowrap}
.bk-tbl{width:100%;border-collapse:collapse;font-size:13px}
.bk-tbl td{padding:5px 4px;border-bottom:1px solid rgba(255,255,255,.07)}
.bk-tbl td.n{text-align:right;white-space:nowrap}
.bk-msg{min-height:1.2em;font-size:13px;color:var(--bad,#f87171)}
.bk-msg.ok{color:var(--good,#86efac)}
.bk-note{font-size:12.5px;padding:8px 10px;border-radius:10px;background:rgba(127,127,127,.12);border:1px dashed var(--line,rgba(255,255,255,.2))}
.bk-txt{width:100%;min-height:140px;font:12.5px/1.5 ui-monospace,monospace;background:rgba(0,0,0,.35);color:var(--ink,#f1f5f9);border:1px solid var(--line,rgba(255,255,255,.18));border-radius:10px;padding:8px}
.bk-hist{display:grid;gap:5px;max-height:38vh;overflow:auto}
.bk-h{display:flex;gap:8px;align-items:baseline;font-size:12.5px;padding:6px 8px;border-radius:9px;background:rgba(0,0,0,.2)}
.bk-h span:first-child{color:var(--soft,#94a3b8);white-space:nowrap}
.bk-h .a{margin-left:auto;font-weight:800;white-space:nowrap}
.bk-set{display:grid;gap:4px;padding:9px 11px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);font-size:13px}
.bk-tabs{display:flex;gap:6px}
.bk-tabs .bk-btn[aria-pressed="true"]{outline:2px solid var(--gold,#f59e0b)}
.bk-pick{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.2);border:1px solid var(--line,rgba(255,255,255,.1));font:700 14px var(--round,inherit);color:var(--ink,#f1f5f9)}
.bk-pick select{flex:1;min-width:0}
.bk-pick.ro b{margin-left:auto}
.bk-pick-sub{font-size:12px;color:var(--soft,#94a3b8);margin-top:4px}
.bk-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);transform:translateX(-50%);z-index:310;background:rgba(10,14,22,.94);color:#fde68a;border:1px solid rgba(245,158,11,.45);padding:9px 16px;border-radius:99px;font:700 13.5px var(--round,system-ui,sans-serif);max-width:calc(100vw - 32px);text-align:center;pointer-events:none}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };
  let toastEl = null, toastT = null;
  function toast(msg, ms = 2400) {
    style();
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "bk-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, ms);
  }
  const overlay = () => { style(); const ov = document.createElement("div"); ov.className = "bk-ov"; ov.innerHTML = '<div class="bk-box" role="dialog" aria-modal="true"></div>'; document.body.appendChild(ov); return [ov, ov.firstChild]; };
  const when = t => { const d = new Date(t || 0); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const errText = e => (/permission|PERMISSION/.test(String(e && (e.code || e.message))) ? "권한이 없어요 (관리자·허용된 기기만)" : (e && e.message) || "잘 안 됐어요");

  // 새 모임 만들기 창 → { gid, name, … } | null
  function createDialog() {
    return new Promise(resolve => {
      const [ov, box] = overlay();
      box.innerHTML = `<button class="bk-x" data-x aria-label="닫기">✕</button><h2>🏦 새 모임 만들기</h2>
        <p class="bk-soft">모임마다 장부가 따로 있어요. 방을 닫아도 잔액은 남고, 정산하면 새 회차로 시작해요.</p>
        <label class="bk-soft">모임 이름<input class="bk-in" data-n maxlength="20" placeholder="예: 금요 섯다 모임"></label>
        <div class="bk-row"><label class="bk-soft bk-grow">1칩 = 몇 원<input class="bk-in" data-w type="number" inputmode="decimal" min="0.01" step="any" value="10"></label>
        <label class="bk-soft bk-grow">한 번 빌리는 칩<input class="bk-in" data-u type="number" inputmode="numeric" min="10" step="100" value="1000"></label></div>
        <p class="bk-soft" data-hint></p><div class="bk-msg" data-msg></div>
        <div class="bk-row"><button class="bk-btn" data-x>취소</button><button class="bk-btn pri bk-grow" data-ok>만들기</button></div>`;
      const $ = s => box.querySelector(s);
      const hint = () => { const w = Number($("[data-w]").value) || 0, u = Number($("[data-u]").value) || 0; $("[data-hint]").textContent = `한 번 빌리면 ${fmt(u)}칩 = ${fmt(u * w)}원`; };
      box.addEventListener("input", hint); hint();
      const done = v => { ov.remove(); resolve(v); };
      ov.addEventListener("click", async e => {
        if (e.target.closest("[data-x]")) return done(null);
        const ok = e.target.closest("[data-ok]"); if (!ok) return;
        ok.disabled = true;
        try { done(await createGroup({ name: $("[data-n]").value, chipWon: $("[data-w]").value, loanUnit: $("[data-u]").value })); }
        catch (err) { $("[data-msg]").textContent = errText(err); ok.disabled = false; }
      });
      setTimeout(() => { try { $("[data-n]").focus(); } catch (e) {} }, 40);
    });
  }

  // 빌리기 확인 창
  async function askLoan(gid) {
    let meta = null;
    try { meta = await getMeta(gid); } catch (e) { toast("모임 장부를 못 읽었어요"); return false; }
    return new Promise(resolve => {
      const [ov, box] = overlay();
      box.innerHTML = `<h2>💰 은행에서 빌리기</h2>
        <p><b>${fmt(meta.loanUnit)}칩</b> (= ${fmt(meta.loanUnit * meta.chipWon)}원) 을 빌릴까요?</p>
        <p class="bk-soft">다음 판부터 내 칩에 더해져요. 빌린 칩은 정산 때 갚아요 (${esc(meta.name)} · 1칩 = ${fmt(meta.chipWon)}원).</p>
        <div class="bk-row"><button class="bk-btn" data-no>취소</button><button class="bk-btn pri bk-grow" data-yes>💰 빌리기</button></div>`;
      ov.addEventListener("click", e => { const y = e.target.closest("[data-yes]"), n = e.target.closest("[data-no]") || e.target === ov; if (y || n) { ov.remove(); resolve(!!y); } });
    });
  }

  // ── 은행 창
  async function panel(o) {
    o = o || {};
    const [ov, box] = overlay();
    const st = { gid: o.gid || null, tab: o.tab || "main", groups: [], meta: null, members: {}, edit: null, msg: "", ok: false, offs: [], settled: null, hist: null, pools: [], totals: null };
    const refreshTotals = () => { if (st.gid && mgr()) loadTotals(st.gid).then(t => { st.totals = t; draw(); }).catch(() => {}); };
    if (st.tab === "hist" && !boss()) st.tab = "main";
    // AI 와 한 판 묶음 (장부 'ai' 줄) — 정산 화면에서만, 관리자만 읽힘
    const refreshPools = () => { if (!st.gid || st.tab !== "settle" || st.settled) return; loadPools(st.gid).then(p => { st.pools = p; if (st.tab === "settle" && !st.settled) draw(true); }).catch(() => {}); };
    const mgr = () => canManage();
    // 장부를 고치는 손(금액 조정·사람 추가·정산 확정·기록) — 11-01 베니 님: 허용된 친구 기기까지 열 필요 없음 → 관리자만,
    //   💵 내기 장부는 만든 사람도 (그 방 정산). 나머지는 '정산 보기'(읽기만)
    const isAdm = () => { try { return !!((window.Gate && Gate.state && Gate.state.isAdmin) || (window.Arena && Arena.isAdmin === true)); } catch (e) { return false; } };
    const boss = () => isAdm() || (!!st.gid && C.isBet(st.gid) && !!st.meta && st.meta.by === byName() && canManage());
    let myPid = null;                                        // 내 줄 표시 (기다리지 않고 나중에 다시 그림)
    (async () => {
      try { const n = (window.GME && GME.me && GME.me.name) || (MOCK ? localStorage.getItem("game.arena.name") : ""); if (n) { myPid = await pidFor(n); if (st.tab === "main") draw(); } } catch (e) {}
    })();
    const close = () => { st.offs.forEach(f => f()); ov.remove(); if (o.onClose) try { o.onClose(); } catch (e) {} };
    const say = (m, ok) => { st.msg = m; st.ok = !!ok; const el = box.querySelector("[data-msg]"); if (el) { el.textContent = m; el.classList.toggle("ok", !!ok); } };
    const watch = gid => {
      st.offs.forEach(f => f()); st.offs = []; st.meta = null; st.members = {};
      if (!gid) return;
      st.offs.push(S.on(G(gid) + "/meta", v => { st.meta = v; draw(); }));
      st.offs.push(S.on(G(gid) + "/members", v => { st.members = v || {}; draw(); refreshPools(); }));
      st.offs.push(S.on(G(gid) + "/records", v => { st.records = v || {}; draw(); }));
      st.totals = null; refreshTotals();
    };
    const busy = () => box.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

    function draw(force) {
      if (!force && busy() && st.tab !== "settle") return;
      const M = boss();
      const head = `<button class="bk-x" data-x aria-label="닫기">✕</button><h2>🏦 은행 장부</h2>`;
      if (st.tab === "settle") return drawSettle(head);
      if (st.tab === "hist") return drawHist(head);
      // 장부는 하나(🏦 기본 은행, 저절로 생김). 예전에 따로 만든 모임 장부가 있으면 관리자만 골라 볼 수 있게
      const pick = M && st.groups.length > 1
        ? `<label class="bk-pick">📂 장부 <select class="bk-sel" data-g aria-label="장부 고르기">${st.groups.map(g => `<option value="${esc(g.gid)}" ${g.gid === st.gid ? "selected" : ""}>${esc(g.name)}${g.gid === DEFAULT.gid ? "" : C.isBet(g.gid) ? (C.isExpired(g.gid, null, S.now()) ? " (끝남)" : "") : " (예전)"}</option>`).join("")}</select></label>`
        : "";
      let body = "";
      if (st.gid && st.meta) {
        const m = st.meta;
        const res = C.settle(st.members, m.chipWon);
        const tot = st.totals || {};
        const rows = Object.keys(st.members).map(pid => ({ pid, ...C.norm(st.members[pid]) })).map(r => ({ ...r, chips: r.balance - r.borrowed }))
          .sort((a, b) => b.chips - a.chips || (a.name < b.name ? -1 : 1));
        const sumB = rows.reduce((a, r) => a + r.balance, 0), sumL = rows.reduce((a, r) => a + r.borrowed, 0);
        // 11-01 베니 님: 화면은 '원'만 · 빌리기 없음 — 각자 0원에서 시작해 마이너스로도 감 (장부 안의 시작 돈·빌린 칩은 그대로 두고 손익 = 잔액 − 빌린 칩 으로만 보여 줌)
        const bet = C.isBet(st.gid, m), over = bet && C.isExpired(st.gid, m, S.now());
        const betNote = bet ? `<p class="bk-note">💵 <b>진짜 돈 내기 장부</b> · 1점 = ${fmt(m.chipWon)}원 · ${over ? "<b>끝났어요</b> (24시간 지남) — 새 결과는 안 쓰고 보기·정산만 돼요" : esc(C.leftText(st.gid, m, S.now()))}</p>` : "";
        body = betNote + `<p class="bk-soft">큰 글씨 = <b>정산 전 손익</b> (지난 정산 뒤로 따고 잃은 돈, 정산하면 0) · 📈 통산 = 처음부터 모두 · 🏆 승패도 계속 쌓여요</p>
          <div class="bk-list" data-members>${rows.length ? rows.map(r => {
            const cls = r.chips > 0 ? "bk-up" : r.chips < 0 ? "bk-down" : "";
            const ed = M && st.edit === r.pid;
            const rec = st.records && st.records[r.pid], t = tot[r.pid];
            return `<div class="bk-m${r.pid === myPid ? " me" : ""}" data-pid="${esc(r.pid)}"><b>${esc(r.name)}${r.pid === myPid ? ' <span class="bk-soft">(나)</span>' : ""}</b>
              <span class="net ${cls}">${sfmt(r.chips * m.chipWon)}원</span>
              <span class="nums">${rec ? `🏆 ${int(rec.w)}승 ${int(rec.l)}패 · ` : ""}${st.totals ? `📈 통산 ${sfmt((t ? t.won : 0) + r.chips * m.chipWon)}원${t ? ` (${t.sets}번 정산)` : ""}` : ""}</span>
              ${M ? `<div class="acts">${ed
                ? `<input class="bk-in bk-grow" data-adj type="number" inputmode="numeric" step="${m.chipWon}" value="${r.chips * m.chipWon}" aria-label="새 손익 (원)" style="max-width:150px"><span class="bk-soft">원</span><button class="bk-btn sm pri" data-adjok="${esc(r.pid)}">저장</button><button class="bk-btn sm" data-adjno>취소</button>`
                : `<button class="bk-btn sm" data-edit="${esc(r.pid)}">✎ 금액 조정</button>${!r.balance && !r.borrowed ? `<button class="bk-btn sm" data-del="${esc(r.pid)}">빼기</button>` : ""}`}</div>` : ""}
            </div>`;
          }).join("") : `<p class="bk-soft">아직 아무도 없어요. 돈 거는 게임을 친구랑 하면 여기에 생겨요.</p>`}</div>
          ${res.residualChips ? `<p class="bk-soft">AI·조정 몫 ${sfmt(-res.residualChips * m.chipWon)}원 (정산 때 같이 한 사람끼리 나눠요)</p>` : ""}
          ${M ? `<div class="bk-row"><input class="bk-in bk-grow" data-addn maxlength="12" placeholder="사람 추가 (이름)"><button class="bk-btn" data-add>추가</button></div>
          <div class="bk-row"><button class="bk-btn pri bk-grow" data-settle>🧾 정산하고 새로 시작</button><button class="bk-btn" data-hist>📜 기록</button></div>`
          : `<p class="bk-note">각자 0원에서 시작해 잃으면 마이너스로 가요. 금액 조정·정산 확정은 ${bet ? "이 장부를 만든 사람이나 " : ""}관리자가 해요. 누가 누구에게 보낼지는 미리 볼 수 있어요.</p><div class="bk-row"><button class="bk-btn bk-grow" data-settle>🧾 정산 보기</button></div>`}`;
      } else if (st.gid) body = `<p class="bk-soft">장부를 불러오는 중…</p>`;
      else body = `<p class="bk-soft">${M ? "장부를 준비하는 중…" : "아직 장부가 없어요. 돈 거는 게임을 친구랑 하면 저절로 생겨요."}</p>`;
      box.innerHTML = head + pick + body + `<div class="bk-msg${st.ok ? " ok" : ""}" data-msg>${esc(st.msg)}</div>`;
    }

    function drawSettle(head) {
      const m = st.meta || { name: "모임", chipWon: 1 };
      const res = st.settled ? st.settled.res : C.settle(st.members, m.chipWon, { pools: st.pools });
      const txt = C.text(res, m, st.settled ? st.settled.t : Date.now());
      const rows = res.rows.slice().sort((a, b) => b.won - a.won);
      box.innerHTML = `${head}<h3>🧾 정산${st.settled ? " — 끝났어요, 새로 시작해요" : ""}</h3>
        <table class="bk-tbl">${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="n ${r.won > 0 ? "bk-up" : r.won < 0 ? "bk-down" : ""}"><b>${sfmt(r.won)}원</b></td></tr>`).join("") || `<tr><td class="bk-soft">정산할 사람이 없어요</td></tr>`}</table>
        <h3>💸 보낼 돈 (${res.lines.length}번)</h3>
        <div class="bk-lines" data-lines>${res.lines.map(l => `<div class="bk-line"><span>${esc(l.fn)} → ${esc(l.tn)}</span><span class="w">${fmt(l.won)}원</span></div>`).join("") || `<p class="bk-soft">보낼 돈이 없어요 🙂</p>`}</div>
        ${res.split === "split" ? `<p class="bk-note">AI·조정 몫 ${sfmt(-res.residualWon)}원은 같이 한 사람끼리 똑같이 나눴어요 (AI 와 한 판은 그 판에 앉은 사람끼리, 칩 조정은 모두).</p>` : ""}
        <textarea class="bk-txt" data-txt readonly>${esc(txt)}</textarea>
        <div class="bk-row"><button class="bk-btn bk-grow" data-copy>📋 카톡용 복사</button></div>
        ${st.settled ? `<div class="bk-row"><button class="bk-btn pri bk-grow" data-back>장부 보기</button></div>`
          : !boss() ? `<p class="bk-soft">미리 보기예요 (AI 와 한 판이 있으면 방장 화면과 조금 다를 수 있어요). 확정은 방장이 해요.</p><div class="bk-row"><button class="bk-btn bk-grow" data-back>← 뒤로</button></div>`
          : `<p class="bk-soft">확정하면 모두의 손익만 0원이 되고, 🏆 승패·📈 누적·장부 기록은 그대로 남아요.</p>
             <div class="bk-row"><button class="bk-btn" data-back>← 뒤로</button><button class="bk-btn pri bk-grow" data-reset>✅ 정산 확정하고 새로 시작</button></div>`}
        <div class="bk-msg${st.ok ? " ok" : ""}" data-msg>${esc(st.msg)}</div>`;
    }

    function drawHist(head) {
      const h = st.hist;
      const icon = { loan: "🎟️", game: "🎴", adjust: "✎", reset: "🔄", ai: "🤖" };   // loan = 예전 빌리기·시작 돈 (손익엔 안 들어감)
      const nm = pid => (st.members[pid] && st.members[pid].name) || pid;
      const tot = st.totals || {}, recs = st.records || {};
      const cum = [...new Set(Object.keys(tot).concat(Object.keys(recs)))].map(pid => ({
        name: (tot[pid] && tot[pid].name) || (recs[pid] && recs[pid].name) || nm(pid), won: tot[pid] ? tot[pid].won : 0, sets: tot[pid] ? tot[pid].sets : 0,
        w: recs[pid] ? int(recs[pid].w) : 0, l: recs[pid] ? int(recs[pid].l) : 0,
      })).sort((a, b) => b.won - a.won || b.w - a.w);
      box.innerHTML = `${head}<div class="bk-row"><button class="bk-btn" data-back>← 장부</button><h3 class="bk-grow">📜 기록</h3></div>
        ${!h ? `<p class="bk-soft">불러오는 중…</p>` : h.err ? `<p class="bk-note">${esc(h.err)}</p>` : `
        <h3>📈 정산한 것 모두 (통산, 정산 전 손익은 빼고)</h3>
        <table class="bk-tbl">${cum.map(r => `<tr><td>${esc(r.name)}</td><td class="n">🏆 ${r.w}승 ${r.l}패</td><td class="n">${r.sets}번 정산</td><td class="n ${r.won > 0 ? "bk-up" : r.won < 0 ? "bk-down" : ""}"><b>${sfmt(r.won)}원</b></td></tr>`).join("") || `<tr><td class="bk-soft">아직 정산한 적이 없어요</td></tr>`}</table>
        <h3>정산 기록</h3><div class="bk-hist">${h.sets.length ? h.sets.slice().reverse().map(s => {
          const lines = Array.isArray(s.lines) ? s.lines : Object.values(s.lines || {});
          return `<div class="bk-set"><b>${when(s.t)} · ${esc(s.by || "")}${s.reset ? " · 정산하고 새로 시작" : " · (저장만)"}</b>${lines.map(l => `<span>${esc(l.fn || l.from)} → ${esc(l.tn || l.to)} <b>${fmt(l.won)}원</b></span>`).join("") || '<span class="bk-soft">보낼 돈 없음</span>'}</div>`;
        }).join("") : '<p class="bk-soft">아직 정산한 적이 없어요</p>'}</div>
        <h3>장부 (최근 ${h.led.length}줄)</h3><div class="bk-hist">${h.led.slice().reverse().map(l => `<div class="bk-h"><span>${when(l.t)}</span><span>${icon[l.type] || "·"} ${esc(l.type === "reset" ? "정산" : l.name || nm(l.pid))}${l.game ? ` · ${esc(l.game)}${l.round ? " " + l.round + "판" : ""}` : ""}${l.note ? ` · ${esc(l.note)}` : ""}</span><span class="a ${l.type === "loan" ? "bk-soft" : l.amount > 0 ? "bk-up" : l.amount < 0 ? "bk-down" : ""}">${l.type === "reset" ? "" : l.type === "loan" ? "시작 돈 (손익 아님)" : sfmt(l.amount * ((st.meta && st.meta.chipWon) || 1)) + "원"}</span></div>`).join("") || '<p class="bk-soft">비어 있어요</p>'}</div>`}`;
    }

    async function loadGroups() {
      try { st.groups = await listGroups(); if (mgr()) st.groups = await ensureDefault(st.groups); } catch (e) { st.groups = []; say(errText(e)); }
      // 장부는 하나: 방에서 연 장부가 아니면 🏦 기본 은행 (없으면 — 아직 아무도 안 만듦 — 있는 것 중 최근)
      if (!st.gid) st.gid = st.groups.some(g => g.gid === DEFAULT.gid) ? DEFAULT.gid : (st.groups[0] && st.groups[0].gid) || null;
    }
    const setGid = gid => { st.gid = gid || null; st.edit = null; st.settled = null; try { if (gid) localStorage.setItem("bank.last", gid); } catch (e) {} watch(st.gid); draw(true); };

    ov.addEventListener("change", e => { if (e.target.matches("[data-g]")) setGid(e.target.value); });
    ov.addEventListener("click", async e => {
      if (e.target === ov) return close();
      const b = e.target.closest("button"); if (!b) return;
      const gid = st.gid;
      try {
        if (b.matches("[data-x]")) return close();
        if (b.dataset.lend) {
          const r = st.members[b.dataset.lend]; b.disabled = true;
          await borrow(gid, b.dataset.lend, r && r.name, 0, { game: o.game, note: "은행 창" });
          say(`${(r && r.name) || ""} 님에게 ${fmt(st.meta.loanUnit)}칩을 빌려줬어요`, true); return;
        }
        if (b.dataset.edit) { st.edit = b.dataset.edit; draw(true); const i = box.querySelector("[data-adj]"); if (i) { i.focus(); i.select(); } return; }
        if (b.matches("[data-adjno]")) { st.edit = null; draw(true); return; }
        if (b.dataset.adjok) {                               // 원으로 적은 손익 → 장부 잔액 (손익 = 잔액 − 빌린 칩)
          const won = Number(box.querySelector("[data-adj]").value) || 0, mm = C.norm(st.members[b.dataset.adjok]), cw = (st.meta && st.meta.chipWon) || 1;
          st.edit = null; await adjust(gid, b.dataset.adjok, Math.round(won / cw) + mm.borrowed, "직접 조정"); say("금액을 조정했어요", true); draw(true); return;
        }
        if (b.dataset.del) { await removeMember(gid, b.dataset.del); say("뺐어요", true); return; }
        if (b.matches("[data-add]")) { const i = box.querySelector("[data-addn]"); const r = await addMember(gid, i.value); i.value = ""; say(r.existed ? "이미 있는 사람이에요" : "추가했어요", !r.existed); draw(true); return; }
        if (b.matches("[data-settle]")) { st.tab = "settle"; st.settled = null; say(""); draw(true); refreshPools(); return; }
        if (b.matches("[data-back]")) { st.tab = "main"; st.settled = null; say(""); draw(true); return; }
        if (b.matches("[data-hist]")) {
          st.tab = "hist"; st.hist = null; draw(true);
          try { const [sets, led] = await Promise.all([S.last(G(gid) + "/settlements", 20), S.last(G(gid) + "/ledger", 120)]); st.hist = { sets, led }; }
          catch (err) { st.hist = { err: "정산 기록과 장부는 관리자·허용된 기기만 볼 수 있어요" }; }
          if (st.tab === "hist") draw(true); refreshTotals(); return;
        }
        if (b.matches("[data-copy]")) {
          const t = box.querySelector("[data-txt]");
          try { await navigator.clipboard.writeText(t.value); say("복사했어요. 카톡에 붙여 넣어 보내세요", true); }
          catch (err) { t.focus(); t.select(); say("글을 길게 눌러 복사해 주세요"); }
          return;
        }
        if (b.matches("[data-reset]")) {
          if (!boss()) return;                                 // 읽기 전용(관리자·내기 장부 만든 사람 말고)은 확정 못 함
          if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "한 번 더 누르면 돈만 0으로 (기록은 남아요)"; return; }
          b.disabled = true;
          st.settled = await saveSettlement(gid, { reset: true });
          say("정산했어요. 돈은 0부터 새로 시작해요 (기록은 그대로)", true);
          draw(true); refreshTotals(); return;
        }
      } catch (err) { console.warn("[bank]", err); say(errText(err)); b.disabled = false; }
    });

    draw(true);
    await loadGroups();
    if (st.gid) setGid(st.gid); else draw(true);
    return { close };
  }

  // ── 대기실 설정 줄 (ArenaUI settings.render 또는 buildConfig 안에서)
  async function lobbyPicker(el, cfg, canEdit, update) {
    style();
    cfg = cfg || {};
    if (!canEdit) {
      el.innerHTML = `<div class="bk-pick ro">🏦 은행 <b>${cfg.bank ? esc(cfg.bankName || "모임") : "안 씀 (연습 칩)"}</b></div>`;
      return;
    }
    const NEW = "__newbet";
    el.innerHTML = `<label class="bk-pick">🏦 은행 <select class="bk-sel" data-bk-pick aria-label="은행 모임"><option value="">은행 안 씀 (연습 칩)</option></select></label>
      <div class="bk-row" data-bk-new hidden style="margin-top:6px"><label class="bk-soft bk-grow">💵 점당 몇 원<input class="bk-in" data-bk-won type="number" inputmode="numeric" min="1" step="any" value="100"></label><button class="bk-btn pri" data-bk-go type="button">시작</button><button class="bk-btn" data-bk-no type="button">취소</button></div>
      <div class="bk-pick-sub" data-bk-sub></div>`;
    const sel = el.querySelector("select"), sub = el.querySelector("[data-bk-sub]"), nw = el.querySelector("[data-bk-new]");
    let groups = [];
    // 장부: 🏦 기본 은행(게임 돈) + 💵 아직 안 끝난 내기 장부(진짜 돈, 24시간) — 끝난 내기 장부는 안 보여 줌 (보기·정산은 은행 창에서). 이 방이 예전 모임 장부를 쓰던 중이면 그것도.
    const open = g => !C.isBet(g.gid) || !C.isExpired(g.gid, null, S.now());
    const fill = () => {
      const shown = groups.filter(g => g.gid === DEFAULT.gid || (open(g) && (g.gid === cfg.bank || C.isBet(g.gid))));
      sel.innerHTML = `<option value="">은행 안 씀 (연습 칩)</option>${shown.map(g => `<option value="${esc(g.gid)}">${C.isBet(g.gid) ? `${esc(g.name)} · ${esc(C.leftText(g.gid, null, S.now()))}` : `🏦 ${esc(g.gid === DEFAULT.gid ? "은행 장부" : g.name + " (예전)")}`}</option>`).join("")}${canManage() ? `<option value="${NEW}">➕ 💵 오늘 내기 장부 새로 (24시간)</option>` : ""}`;
    };
    const desc = async gid => {
      if (!gid) { sub.textContent = "연습용 — 장부에 안 남아요"; return; }
      try {
        const m = await getMeta(gid);
        sub.textContent = C.isBet(gid, m)
          ? `💵 진짜 돈 내기 · 1점 = ${fmt(m.chipWon)}원 · ${C.leftText(gid, m, S.now())} · 중간에 와도 첫 판부터 자동으로 들어가요 · 정산은 방장이 🏦 정산에서`
          : `1점(칩) = ${fmt(m.chipWon)}원 · 각자 0원에서 시작해 잃으면 마이너스로 · 정산 때 한꺼번에`;
      } catch (e) { sub.textContent = ""; }
    };
    const set = (gid, name) => { update({ bank: gid || null, bankName: gid ? name || "모임" : null }); desc(gid); el.dispatchEvent(new Event("change", { bubbles: true })); };
    sel.disabled = true;
    try { groups = await ensureDefault(await listGroups()); } catch (e) { groups = []; }
    fill(); sel.disabled = false;
    const found = cfg.bank && groups.find(g => g.gid === cfg.bank);
    const ended = found && !open(found);                      // 이 방에 걸어 둔 내기 장부가 24시간 지났으면 기본 은행으로 (지난 장부는 은행 창에서 보기·정산)
    sel.value = found && !ended ? cfg.bank : "";
    if (ended) { const d = groups.find(g => g.gid === DEFAULT.gid); fill(); if (d) { sel.value = d.gid; set(d.gid, d.name); } else set(null); toast("💵 지난 내기 장부(24시간)는 끝났어요 — 기본 은행으로 바꿨어요", 3200); }
    else if (cfg.bank && !found) set(null); else desc(sel.value);
    let prev = sel.value;
    sel.addEventListener("change", async e => {
      e.stopPropagation();
      const v = sel.value;
      if (v === NEW) { nw.hidden = false; const i = nw.querySelector("input"); try { i.focus(); i.select(); } catch (x) {} return; }
      nw.hidden = true; prev = v;
      const g = groups.find(x => x.gid === v);
      cfg = { ...cfg, bank: v || null };
      set(v, g && g.name);
    });
    nw.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-bk-no")) { nw.hidden = true; sel.value = prev; return; }
      b.disabled = true;
      try {
        const g = await createBetLedger({ chipWon: nw.querySelector("input").value });
        groups = [{ gid: g.gid, name: g.name, t: S.now() }].concat(groups);
        fill(); sel.value = g.gid; prev = g.gid; nw.hidden = true;
        cfg = { ...cfg, bank: g.gid };
        set(g.gid, g.name);
        toast("💵 오늘 내기 장부를 시작했어요 (24시간)");
      } catch (err) { toast("🏦 " + errText(err), 3200); }
      b.disabled = false;
    });
  }
  const label = cfg => (cfg && cfg.bank ? (C.isBet(cfg.bank) ? String(cfg.bankName || "💵 내기") : `🏦 ${cfg.bankName || "은행"}`) : "");

  // ── 친구랑 판에 장부 꽂기
  //  방장: seats = 판 자리 [{ ctrl: 'me'|'remote'|'hot'|'ai', uid, name }] (같은 배열을 그대로 넘기면 됨)
  //    · 사람 자리는 시작할 때 이름 → pid 로 묶어 둠 (중간에 나가 AI 가 이어 받아도 그 사람 칩으로 계속 — 합이 맞게)
  //    · 처음부터 AI 인 자리는 장부에 안 닿음
  //  start(원)·negative: 점수로 주고받는 게임(고스톱) — 회차 처음 앉을 때 start 원어치를 한 번 받고, 그 뒤엔 마이너스로 내려가도 됨 (자동 빌리기 없음)
  function attach({ game, net, cfg, seats, role, min, onEvent, start, negative }) {
    const gid = cfg && cfg.bank;
    if (!gid) return null;
    role = role || (net && net.isHost === false ? "guest" : "host");
    const emit = ev => { try { if (onEvent) onEvent(ev); } catch (e) { console.error(e); } };
    const offs = [];
    if (role === "guest") {
      if (net) offs.push(net.on("msg", m => { if (m && m.t === "_bank") emit(m); }));
      return {
        gid, role, bankName: cfg.bankName || "",
        requestLoan() { if (net) net.send({ t: "_bank", op: "loan" }, true); },
        detach() { offs.splice(0).forEach(f => f()); },
      };
    }
    const ses = { gid, role: "host", alive: true, track: [], queue: {}, meta: null, bankName: cfg.bankName || "", minStack: Math.max(1, int(min) || 1), negative: !!negative, pairs: {}, tots: {} };
    let chain = Promise.resolve();
    const run = fn => (chain = chain.then(() => (ses.alive ? fn() : undefined)).catch(e => { console.warn("[bank]", e); emit({ op: "error", msg: errText(e) }); }));
    const info = extra => ({ game, room: net && net.code, ...(extra || {}) });
    async function load() {
      ses.meta = await getMeta(gid);
      ses.bankName = ses.meta.name;
      await assertOpen(gid, ses.meta);                        // 끝난 내기 장부면 여기서 멈춤 → onEvent({op:'error', msg}) + 모두 연습 칩

      const pids = await Promise.all((seats || []).map(s => (s && s.ctrl !== "ai" && s.name ? pidFor(s.name) : null)));
      const ps = [...new Set(pids.filter(Boolean))], pks = [];
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) pks.push(pairKey(ps[a], ps[b]));
      const [members, recs, tots, pairVals] = await Promise.all([getMembers(gid), getRecords(gid).catch(() => ({})), loadTotals(gid).catch(() => ({})),
        Promise.all(pks.map(k => S.get(G(gid) + "/pairs/" + k).catch(() => null)))]);
      ses.pairs = {}; pks.forEach((k, i) => { ses.pairs[k] = pairVals[i] || null; });
      ses.tots = tots || {};
      const seen = new Set();
      const startChips = start ? Math.max(1, Math.round(start / (ses.meta.chipWon || 1))) : 0;
      const stacks = [];
      for (let i = 0; i < (seats || []).length; i++) {
        const pid = pids[i];
        if (!pid || seen.has(pid)) { ses.track[i] = null; stacks.push(null); continue; }
        seen.add(pid);
        const name = clean(seats[i].name, 12);
        let bal = members[pid] ? int(members[pid].balance) : 0, lent = 0;
        if (ses.negative) { if (startChips && (!members[pid] || (!int(members[pid].borrowed) && !bal))) lent = startChips; }   // 이번 회차 처음이면 시작 돈 한 번
        else while (bal + lent < ses.minStack && lent < ses.meta.loanUnit * 20) lent += ses.meta.loanUnit;
        if (lent) { const m = await borrow(gid, pid, name, lent, info({ note: ses.negative ? "시작 돈" : "시작 칩" })); bal = int(m.balance); emit({ op: "loan", seat: i, name, n: lent, auto: true, start: !!ses.negative }); }
        ses.track[i] = { pid, name, last: bal, s0: bal, base: members[pid] ? int(members[pid].borrowed) + lent : lent, w: int(recs[pid] && recs[pid].w), l: int(recs[pid] && recs[pid].l) };
        stacks.push(bal);
      }
      return stacks;
    }
    ses.ready = load().catch(e => { console.warn("[bank]", e); emit({ op: "error", msg: errText(e) }); ses.track = []; return (seats || []).map(() => null); });
    chain = ses.ready.then(() => {});
    // 판이 끝날 때마다: 자리별 칩 변화 → 잔액 + 장부 한 줄
    const onReport = e => {
      const d = (e && e.detail) || {};
      if (!ses.alive || d.game !== game || !Array.isArray(d.coins)) return;
      const coins = d.coins.slice();
      if (ses.reload) return;                                 // 새 회차로 0 이 됐으면 이 판 칩은 버리고 다음 판에 새로 시작
      run(async () => {
        await assertOpen(gid, ses.meta);                      // 판 도중 24시간이 지났으면 이 결과는 안 씀 (승패·전적 포함)
        const rows = [];
        ses.track.forEach((t, i) => { if (!t || coins[i] == null) return; const c = int(coins[i]), dl = c - t.last; t.last = c; if (dl) rows.push({ pid: t.pid, name: t.name, delta: dl }); });
        if (rows.length) await applyDeltas(gid, rows, info({ round: d.round }), ses.track.filter(Boolean).map(t => t.pid));
        const W = Array.isArray(d.win) ? d.win : [], L = Array.isArray(d.lose) ? d.lose : [];
        for (const i of W.concat(L)) { const t = ses.track[i]; if (!t) continue; const win = W.includes(i); if (win) t.w++; else t.l++; await addRecord(gid, t.pid, t.name, win); }
        // 🆚 두 사람끼리: 이긴 사람 → 진 사람마다 1승, 오간 칩
        const inc = {};
        const bump = (x, y, dw, dm) => { const k = pairKey(x, y), a = [x, y].sort()[0], o = inc[k] || (inc[k] = { a, b: a === x ? y : x, wa: 0, wb: 0, ma: 0 }); if (x === a) { o.wa += dw; o.ma += dm; } else { o.wb += dw; o.ma -= dm; } };
        for (const wi of W) for (const li of L) { const tw = ses.track[wi], tl = ses.track[li]; if (tw && tl && tw.pid !== tl.pid) bump(tw.pid, tl.pid, 1, 0); }
        for (const f of pairFlows(rows)) bump(f.win, f.lose, 0, f.chips);
        for (const k of Object.keys(inc)) {
          const o = inc[k];
          await S.txn(G(gid) + "/pairs/" + k, cur => ({ a: o.a, b: o.b, wa: int(cur && cur.wa) + o.wa, wb: int(cur && cur.wb) + o.wb, ma: int(cur && cur.ma) + o.ma, updated: S.now() }))
            .then(v => { ses.pairs[k] = v; }).catch(e => console.warn("[bank pairs]", e));   // 규칙 배포 전엔 조용히 건너뜀
        }
        emit({ op: "saved", rows });
      });
    };
    window.addEventListener("chips:report", onReport);
    offs.push(() => window.removeEventListener("chips:report", onReport));
    const onReset = e => { if (e && e.detail && e.detail.gid === gid) ses.reload = true; };
    window.addEventListener("bank:reset", onReset);
    offs.push(() => window.removeEventListener("bank:reset", onReset));
    const seatOfUid = uid => (seats || []).findIndex(s => s && s.uid === uid);
    // 손님의 빌리기 요청 (방장이 받아서 다음 판에 넣음)
    if (net && net.on) offs.push(net.on("msg", (uid, m) => {
      if (!m || m.t !== "_bank" || m.op !== "loan" || !ses.alive) return;
      ses.ready.then(() => {
        const i = seatOfUid(uid);
        if (i < 0 || !ses.track[i]) { net.send(uid, { t: "_bank", op: "no", msg: "이 자리는 은행을 안 써요" }, true); return; }
        ses.queue[i] = (ses.queue[i] || 0) + 1;
        const n = ses.queue[i] * ((ses.meta && ses.meta.loanUnit) || 0);
        net.send(uid, { t: "_bank", op: "queued", n }, true);
        emit({ op: "queued", seat: i, name: ses.track[i].name, n });
      });
    }));
    Object.assign(ses, {
      records: () => ses.track.map(t => (t ? { w: t.w || 0, l: t.l || 0 } : null)),   // 자리별 통산 승패 (장부)
      // 📊 시작할 때 자리별 판: 통산 승패·통산 원(정산된 것) · 이번 게임 시작 칩(s0) · 정산 전 기준(base=빌린 칩) · 두 사람끼리 승(pw[i][j] = i 가 j 를 이긴 수)·칩(pm[i][j] = i 가 j 에게서 딴 칩)
      rel0() {
        const n = (seats || []).length, T = ses.track, M = () => Array.from({ length: n }, () => Array(n).fill(0));
        const r = { chipWon: (ses.meta && ses.meta.chipWon) || 0, s0: [], base: [], totWon: [], w: [], l: [], pw: M(), pm: M(), on: [] };
        for (let i = 0; i < n; i++) {
          const t = T[i]; r.on[i] = !!t;
          r.s0[i] = t ? t.s0 : null; r.base[i] = t ? t.base : 0; r.w[i] = t ? t.w : 0; r.l[i] = t ? t.l : 0;
          r.totWon[i] = t && ses.tots && ses.tots[t.pid] ? int(ses.tots[t.pid].won) : 0;
          for (let j = 0; j < n; j++) {
            const u = T[j]; if (!t || !u || i === j || t.pid === u.pid) continue;
            const pv = ses.pairs && ses.pairs[pairKey(t.pid, u.pid)]; if (!pv) continue;
            const isA = pv.a === t.pid;
            r.pw[i][j] = int(isA ? pv.wa : pv.wb); r.pm[i][j] = isA ? int(pv.ma) : -int(pv.ma);
          }
        }
        ses.relBase = r.base;                                 // 판 사이 빌리기 때 이 판의 base 도 올림 (자리를 다시 짜면 게임이 새 배열을 써서 안 닿음)
        return r;
      },
      tracks: i => !!ses.track[i],
      pidOf: i => (ses.track[i] ? ses.track[i].pid : null),
      requestLoan(i) {
        return ses.ready.then(() => {
          if (!ses.track[i]) return 0;
          ses.queue[i] = (ses.queue[i] || 0) + 1;
          const n = ses.queue[i] * ses.meta.loanUnit;
          emit({ op: "queued", seat: i, name: ses.track[i].name, n, mine: true });
          return n;
        });
      },
      // 다음 판 직전: 요청한 빌리기 + 칩이 min 보다 적은 사람 자동 빌리기 → { coins, loans:[{seat,name,n}] }
      beforeNext({ coins, min } = {}) {
        const out = (coins || []).slice(), loans = []; let reloaded = false;
        return run(async () => {
          const lim = Math.max(1, int(min) || ses.minStack);
          if (ses.reload) {                                   // 새 회차: 사람 자리 칩 = 새 잔액 (모자라면 자동으로 빌림)
            ses.reload = false; ses.queue = {}; reloaded = true;
            ses.minStack = Math.max(ses.minStack, lim);
            const st = await load();
            st.forEach((v, i) => { if (v != null) out[i] = v; });
            return;
          }
          for (let i = 0; i < ses.track.length; i++) {
            const t = ses.track[i]; if (!t) continue;
            let n = (ses.queue[i] || 0) * ses.meta.loanUnit, guard = 0;
            delete ses.queue[i];
            if (!ses.negative) while (int(out[i]) + n < lim && guard++ < 20) n += ses.meta.loanUnit;   // 마이너스 되는 게임은 자동으로 안 빌림
            if (!n) continue;
            await borrow(gid, t.pid, t.name, n, info({ note: n > 0 && int(out[i]) < lim ? "칩이 모자라 자동" : "빌리기" }));
            out[i] = int(out[i]) + n; t.last += n; t.base += n;   // 빌린 만큼 정산 전 기준도 (안 올리면 '통산 원'이 빌린 만큼 부풂)
            if (ses.relBase && ses.relBase[i] != null) ses.relBase[i] += n;   // 이미 넘겨준 rel0 판(고스톱이 들고 씀)도 같이
            loans.push({ seat: i, name: t.name, n });
            emit({ op: "loan", seat: i, name: t.name, n });
          }
        }).then(() => ({ coins: out, loans, reloaded }));
      },
      // 새 게임(홀덤 '새 게임' 등): 지금 잔액으로 다시 시작 칩
      restart() { return run(() => { ses.reload = false; return load(); }).then(v => v || (seats || []).map(() => null)); },   // 새 잔액으로 다시 읽으니 '새 회차' 표시는 풂 (안 풀면 첫 판 결과를 버림)
      flush: () => chain,
      detach() { ses.alive = false; offs.splice(0).forEach(f => f()); },
    });
    return ses;
  }

  window.Bank = {
    MOCK, calc: C, store: S, canManage, pidFor, toast,
    DEFAULT, chipText, listGroups, createGroup, createBetLedger, getMeta, getMembers, stackFor, borrow, applyDeltas, adjust, addMember, saveSettlement,
    panel, lobbyPicker, label, attach, askLoan, createDialog,
  };
})();
