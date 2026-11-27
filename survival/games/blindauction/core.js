/* 베니 서바이벌 · 블라인드 경매 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 X · 4일차 3회전 머니 챌린지 <블라인드 경매> (5팀). 나무위키 4일차 문서(규칙 · 매물 카드 표 · 라운드별 낙찰 기록 · 최종 결과)와 공식 클립 자막(입찰 · 특수 카드 장면)을 읽고 우리 말로 옮김.
   · 매물 카드 30장 = 물품 22 (가치 합 1,818억 7,000만 원, 개별 값은 낙찰자만 확인) + 이익 4 + 손해 4. 뒤집힌 번호 카드 중 선 플레이어가 한 장을 고름.
   · 큐브 11개 (1 · 2 · 3 · 4 · 6 · 8 · 10 · 12 · 15 · 20 · 25). 물품 경매 = 공개 입찰 (선부터 직전보다 높게 부르거나 포기, 큐브 조합으로 총합, 낸 큐브는 포기 전엔 회수 못 함, 한 명 남으면 낙찰 · 낙찰자 큐브는 사라짐).
   · 특수 카드 = 효과를 먼저 공개 → 모두 큐브 1개 이상을 비공개로 입찰 (낸 큐브는 모두 사라짐). 이익은 최고, 손해는 최저 입찰자가 받음. 동률이면 그 사람끼리 다시 입찰, 또 같으면 이익은 사라지고 손해는 모두에게 적용.
   · 3번째 특수 카드가 나오면 경매 없이 즉시 종료. 순위 = 가진 물품 가치 합 · 남은 큐브 합이 가장 적은 사람은 가치 50% 삭감 · 큐브를 다 쓴 사람은 꼴찌 · 동률은 남은 큐브 합이 많은 쪽.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 3~5명 개인전 (방송 5팀 · 팀 안 회의 · 아이템 상점 · 협상 · 연합 없음). 큐브는 모두 11개 그대로.
     ② 물품 22장 중 방송 표에 나온 7장(마이클 잭슨 재킷 4.9억 · 파텍 필립 시계 265.5억 · 우주여행 6.5억 · 코비 유니폼 101.5억 · 워렌 버핏 점심 275.3억 · 성수동 아크로 290억 · 오타니 사인 카드 43.5억)은 방송 값 그대로,
        나머지 15장의 이름 · 값은 방송에 안 나와 우리가 지음 (총액은 1,818억 7,000만 원에 맞춤). 값은 끝날 때까지 낙찰자(과 교환 · 강탈로 받은 사람)만 확인.
     ③ 이익 · 손해 카드 효과: 방송에 나온 물품 카드 교환권 · 최고가 물품 카드 반납 · 보유 물품 50% 삭감 + 방송 대사에 나온 '강탈'(다른 팀 물품 1장 가져오기) = 이익 2종 · 손해 2종 (각 2장). 교환 · 강탈은 낙찰 즉시 쓰거나 안 씀 (방송은 보관했다 아무 때나 사용 — 폰이라 단순화). 반납은 보유 물품이 없으면 다음에 얻는 물품에 바로 적용, 50% 삭감은 그 순간 보유 물품에만.
     ④ 아무도 입찰하지 않고 한 명만 남으면 그 사람이 가장 작은 큐브 1개를 내고 가져감 (방송은 최소 입찰 규정이 글에 없음). 낸 큐브 · 낙찰은 공개, 특수 카드 입찰은 '몇 개 썼는지'만 남에게 보임.
     ⑤ 큐브 합 최저가 여럿이면 모두 50% 삭감. 입찰 시간 제한 · 자리 이탈 금지 없음. 2번째 특수 카드 뒤 '물품 총액 순위' 공개는 방송처럼 (값은 안 보여 주고 순서만).
     ⑥ 방송의 히든 아이템 · 아이템 상점 (큐브 5 · 중간 가치 확인권 · 가치 확인권)은 없음. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).blindauction = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CUBES = [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25];
  // 물품 22장 (v = 만 원). 앞 7장은 방송 표 · 뒤 15장은 우리가 지음 — 합계 1,818억 7,000만 원 = 18,187,000만 원
  const ITEMS = [
    { nm: "마이클 잭슨이 입었던 재킷", v: 49000, em: "🧥" }, { nm: "파텍 필립 퍼페추얼 캘린더 시계", v: 2655000, em: "⌚" }, { nm: "버진 갤럭틱 우주여행 티켓", v: 65000, em: "🚀" },
    { nm: "코비 브라이언트 데뷔 매치 유니폼", v: 1015000, em: "🏀" }, { nm: "워렌 버핏과의 점심 식사권", v: 2753000, em: "🍽️" }, { nm: "성수동 아크로 서울포레스트", v: 2900000, em: "🏢" },
    { nm: "오타니 쇼헤이 친필 사인 카드", v: 435000, em: "⚾" },
    { nm: "경매에서 낙찰된 명화 한 점", v: 1320000, em: "🖼️" }, { nm: "제주 해안가 별장", v: 1185000, em: "🏖️" }, { nm: "한정판 슈퍼카", v: 960000, em: "🏎️" },
    { nm: "창간호 신문 원본 세트", v: 710000, em: "📰" }, { nm: "전설적인 뮤지션의 기타", v: 640000, em: "🎸" }, { nm: "빈티지 위스키 컬렉션", v: 525000, em: "🥃" },
    { nm: "프라이빗 요트 한 달 이용권", v: 450000, em: "⛵" }, { nm: "희귀 만화책 초판본", v: 385000, em: "📚" }, { nm: "월드컵 결승전 VIP 관람권", v: 330000, em: "🏟️" },
    { nm: "유명 셰프의 1년 전속 요리", v: 290000, em: "👨‍🍳" }, { nm: "우주 비행 기념 메달", v: 225000, em: "🏅" }, { nm: "공룡 화석 표본", v: 400000, em: "🦖" },
    { nm: "고급 만년필 세트", v: 120000, em: "🖋️" }, { nm: "동네 맛집 평생 이용권", v: 90000, em: "🍜" }, { nm: "달 탐사 기념 금화 세트", v: 685000, em: "🪙" },
  ];
  const TOTAL = ITEMS.reduce((a, x) => a + x.v, 0);
  const SPECIAL = { swap: { k: "gain", nm: "물품 카드 교환권", em: "🔄", d: "내 물품 1장을 다른 사람 물품 1장과 바꿔요 (낙찰하면 바로 · 물품이 없으면 쓸 수 없음)" },
    steal: { k: "gain", nm: "카드 강탈", em: "🫳", d: "다른 사람 물품 1장을 가져와요 (낙찰하면 바로)" },
    drop: { k: "loss", nm: "최고가 물품 카드 반납", em: "⬇️", d: "가진 물품 중 가장 비싼 1장이 사라져요 (없으면 다음에 얻는 물품에 바로)" },
    half: { k: "loss", nm: "보유 물품 50% 삭감", em: "✂️", d: "지금 가진 물품 카드의 가치가 절반이 돼요" } };
  const TOKENS = ITEMS.map((x, i) => ({ k: "item", id: i })).concat(["swap", "swap", "steal", "steal", "drop", "drop", "half", "half"].map(e => ({ k: SPECIAL[e].k, e })));
  const NCARD = TOKENS.length, END_SPECIAL = 3;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const sum = a => a.reduce((x, y) => x + y, 0);
  const val = it => ITEMS[it.id].v * Math.pow(0.5, it.h || 0);          // 만 원
  const itemSum = st => st.items.map(a => sum(a.map(val)));

  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(5, n | 0 || 4)); const rs = (seed >>> 0) || 1, R = seeded(hash(`deck|${rs}`));
    const deck = Array.from({ length: NCARD }, (_, i) => i); for (let i = NCARD - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const st = { n, rs, cfg: Object.assign({}, cfg || {}), deck, avail: Array.from({ length: NCARD }, (_, i) => i), hand: Array.from({ length: n }, () => CUBES.slice()), ghost: Array.from({ length: n }, () => []),
      items: Array.from({ length: n }, () => []), pend: Array(n).fill(0), spec: 0, specSeen: [], round: 0, lead: Math.floor(R() * n), phase: "pick", bid: null, sb: null, sw: null, res: null, finishAfter: "", rankInfo: null,
      over: false, end: "", log: [], seq: 0, itemsSeen: [] };
    st.log.push({ i: st.seq++, k: "start", n, lead: st.lead });
    return st;
  }
  // ── 입찰 (물품 · 공개) ──
  function startBid(st, pos, id) {
    st.phase = "bid";
    st.bid = { pos, id, cur: st.lead, high: 0, hi: -1, tab: Array.from({ length: st.n }, () => []), pass: Array(st.n).fill(false) };
    for (let s = 0; s < st.n; s++) if (!st.hand[s].length) dropOut(st, s, true);   // 큐브가 없으면 처음부터 불 수 없음
    bidNext(st, st.lead - 1);
  }
  const tabSum = (b, s) => sum(b.tab[s]);
  function bidNext(st, from) {
    const b = st.bid, n = st.n;
    for (let g = 0; g < n * 3 + 3; g++) {
      const alive = b.pass.map((p, s) => (p ? -1 : s)).filter(s => s >= 0);
      if (alive.length <= 1) return awardItem(st, alive.length ? alive[0] : (b.hi >= 0 ? b.hi : st.lead));
      from = (from + 1 + n) % n; const s = from; if (b.pass[s]) continue;
      if (tabSum(b, s) + sum(st.hand[s]) <= b.high) { dropOut(st, s, true); continue; }   // 더 높게 부를 수 없으면 자동 포기
      b.cur = s; return;
    }
  }
  function dropOut(st, s, auto) {
    const b = st.bid; st.hand[s] = st.hand[s].concat(b.tab[s]).sort((x, y) => x - y); b.tab[s] = []; b.pass[s] = true;
    st.log.push({ i: st.seq++, k: "pass", s, auto: !!auto });
  }
  function awardItem(st, w) {
    const b = st.bid; let spent;
    if (b.high === 0) { const c = st.hand[w].length ? Math.min(...st.hand[w]) : 0; if (c) { st.hand[w].splice(st.hand[w].indexOf(c), 1); } spent = c ? [c] : []; }
    else { spent = b.tab[w].slice(); b.tab[w] = []; }
    st.items[w].push({ id: b.id, h: 0 }); st.itemsSeen.push(b.id);
    const lost = applyPending(st, w);
    st.log.push({ i: st.seq++, k: "won", s: w, id: b.id, spent: spent.slice(), free: b.high === 0 });
    st.res = { k: "item", id: b.id, w, spent, lost: lost >= 0 ? lost : null, free: b.high === 0 };
    st.lead = w; st.bid = null; st.phase = "show";
  }
  // 반납 대기: 물품을 얻는 순간 가진 것 중 가장 비싼 1장이 사라짐 (id 를 돌려줌)
  function applyPending(st, s) {
    if (!st.pend[s]) return -1; let gone = -1;
    while (st.pend[s] > 0 && st.items[s].length) { gone = dropTop(st, s); st.pend[s]--; }
    return gone;
  }
  function dropTop(st, s) {
    let bi = 0; st.items[s].forEach((it, i) => { if (val(it) > val(st.items[s][bi])) bi = i; });
    const it = st.items[s].splice(bi, 1)[0]; return it.id;
  }
  // ── 특수 카드 (비공개 입찰) ──
  function startSB(st, pos, e) {
    st.phase = "sbid"; st.sb = { pos, e, who: Array.from({ length: st.n }, (_, s) => s), sub: Array(st.n).fill(null), tries: 1, tied: [] };
    for (let s = 0; s < st.n; s++) if (!st.hand[s].length) st.sb.sub[s] = [];
    sbCheck(st);
  }
  const sbNeeds = st => (st.sb ? st.sb.who.filter(s => !st.sb.sub[s]) : []);
  function sbCheck(st) { if (st.sb && !sbNeeds(st).length) sbResolve(st); }
  function sbResolve(st) {
    const sb = st.sb, K = SPECIAL[sb.e].k, tot = s => sum(sb.sub[s] || []);
    for (const s of sb.who) for (const c of sb.sub[s] || []) { const i = st.hand[s].indexOf(c); if (i >= 0) { st.hand[s].splice(i, 1); st.ghost[s].push(c); } }
    const vals = sb.who.map(tot), ext = K === "gain" ? Math.max(...vals) : Math.min(...vals), T = sb.who.filter(s => tot(s) === ext);
    st.log.push({ i: st.seq++, k: "sbid", e: sb.e, who: sb.who.slice(), n: sb.who.map(s => (sb.sub[s] || []).length), tries: sb.tries });
    if (T.length > 1 && sb.tries < 2 && T.some(s => st.hand[s].length)) {                // 동률 → 그 사람끼리 다시 입찰
      sb.tries++; sb.who = T; sb.sub = Array(st.n).fill(null); sb.tied = T.slice();
      for (const s of T) if (!st.hand[s].length) sb.sub[s] = [];
      st.log.push({ i: st.seq++, k: "retie", who: T.slice() });
      if (sbNeeds(st).length) return; return sbResolve(st);
    }
    let win = [], tied = T.length > 1;
    if (!tied) win = T;
    if (tied && K === "loss") win = Array.from({ length: st.n }, (_, s) => s);
    const res = { k: K, e: sb.e, win: win.slice(), tied, detail: [] };
    if (K === "loss") {
      for (const s of win) {
        if (sb.e === "drop") { if (st.items[s].length) { dropTop(st, s); res.detail.push({ s, gone: true }); } else { st.pend[s]++; res.detail.push({ s, pending: true }); } }
        else { for (const it of st.items[s]) it.h = (it.h || 0) + 1; res.detail.push({ s, half: st.items[s].length }); }
      }
      st.lead = win.length === 1 ? win[0] : (st.lead + 1) % st.n;
      st.phase = "show";
    } else if (win.length === 1) { st.lead = win[0]; res.sw = true; }
    else { st.lead = (st.lead + 1) % st.n; st.phase = "show"; }
    st.res = res; st.sb = null;
    if (st.spec === 2) rankPub(st);
    if (K === "gain" && win.length === 1) {
      const w = win[0], other = st.items.some((a, s) => s !== w && a.length);
      const can = sb.e === "steal" ? other : (st.items[w].length && other);
      if (can) { st.phase = "swap"; st.sw = { s: w, e: sb.e }; } else { res.sw = false; res.unused = true; st.phase = "show"; }
    }
    st.log.push({ i: st.seq++, k: "sres", e: sb.e, win: win.slice(), tied });
  }
  function rankPub(st) { const t = itemSum(st), ord = t.map((x, s) => s).sort((a, b) => t[b] - t[a] || a - b); st.rankInfo = { order: ord, after: st.round }; st.log.push({ i: st.seq++, k: "rank", order: ord.slice() }); }

  const needs = st => (st.over ? [] : st.phase === "pick" ? [st.lead] : st.phase === "bid" ? [st.bid.cur] : st.phase === "sbid" ? sbNeeds(st) : st.phase === "swap" ? [st.sw.s] : []);
  const over = st => !!st.over;
  const cubesOk = (hand, cubes) => Array.isArray(cubes) && cubes.length > 0 && new Set(cubes).size === cubes.length && cubes.every(c => hand.includes(c));
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동을 골라요" };
    if (st.phase === "pick") {
      if (a.t !== "card" || !st.avail.includes(a.pos)) return { ok: false, err: "남은 카드 중 한 장을 골라요" };
      st.avail.splice(st.avail.indexOf(a.pos), 1); st.round++;
      const T = TOKENS[st.deck[a.pos]];
      st.log.push({ i: st.seq++, k: "card", s: seat, pos: a.pos, c: T.k === "item" ? "item" : T.e, id: T.k === "item" ? T.id : null });
      if (T.k === "item") { startBid(st, a.pos, T.id); return { ok: true }; }
      st.spec++; st.specSeen.push(T.e);
      if (st.spec >= END_SPECIAL) { st.res = { k: "end3", e: T.e }; st.finishAfter = "special"; st.phase = "show"; return { ok: true }; }
      startSB(st, a.pos, T.e); return { ok: true };
    }
    if (st.phase === "bid") {
      const b = st.bid;
      if (a.t === "pass") { dropOut(st, seat, false); bidNext(st, seat); return { ok: true }; }
      if (a.t !== "bid" || !cubesOk(st.hand[seat], a.cubes)) return { ok: false, err: "가진 큐브를 골라요" };
      const add = sum(a.cubes), nt = tabSum(b, seat) + add;
      if (nt <= b.high) return { ok: false, err: `지금 최고 ${b.high} 보다 높게 불러야 해요` };
      for (const c of a.cubes) st.hand[seat].splice(st.hand[seat].indexOf(c), 1);
      b.tab[seat] = b.tab[seat].concat(a.cubes).sort((x, y) => x - y); b.high = nt; b.hi = seat;
      st.log.push({ i: st.seq++, k: "bid", s: seat, cubes: a.cubes.slice(), total: nt });
      bidNext(st, seat); return { ok: true };
    }
    if (st.phase === "sbid") {
      if (a.t !== "sbid" || !cubesOk(st.hand[seat], a.cubes)) return { ok: false, err: "큐브를 1개 이상 골라요" };
      st.sb.sub[seat] = a.cubes.slice(); sbCheck(st); return { ok: true };
    }
    if (st.phase === "swap") {
      const w = st.sw.s, e = st.sw.e;
      if (a.t === "keep") { st.res.sw = false; st.res.unused = true; st.phase = "show"; st.sw = null; return { ok: true }; }
      if (a.t !== e) return { ok: false, err: e === "swap" ? "바꿀 물품을 골라요" : "가져올 물품을 골라요" };
      if (!Number.isInteger(a.from) || a.from === w || a.from < 0 || a.from >= st.n || !st.items[a.from][a.theirs]) return { ok: false, err: "다른 사람의 물품을 골라요" };
      if (e === "swap" && !st.items[w][a.mine]) return { ok: false, err: "내 물품을 골라요" };
      const got = st.items[a.from].splice(a.theirs, 1)[0]; let give = null;
      if (e === "swap") { give = st.items[w].splice(a.mine, 1)[0]; st.items[a.from].push(give); }
      st.items[w].push(got); const lost = applyPending(st, w);
      st.res.sw = true; st.res.swap = { from: a.from, got: got.id, give: give ? give.id : null, e, lost: lost >= 0 ? lost : null };
      st.log.push({ i: st.seq++, k: "swap", s: w, e, from: a.from, got: got.id, give: give ? give.id : null });
      st.phase = "show"; st.sw = null; return { ok: true };
    }
    return { ok: false, err: "모르는 행동이에요" };
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 5200 : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    if (st.finishAfter) return finish(st, st.finishAfter);
    if (!st.avail.length) return finish(st, "deck");
    if (st.hand.every(h => !h.length)) return finish(st, "cubes");
    st.res = null; st.phase = "pick";
  }
  // ── 끝 · 점수 ──
  function finalScores(st) {
    const t = itemSum(st), cube = st.hand.map(sum), minC = Math.min(...cube);
    return st.hand.map((h, s) => { const half = cube[s] === minC; return { s, items: t[s], cube: cube[s], half, total: half ? t[s] / 2 : t[s], out: !h.length }; });
  }
  function finish(st, why) {
    st.over = true; st.phase = "end"; st.end = why; st.fin = finalScores(st);
    st.log.push({ i: st.seq++, k: "end", why, fin: clone(st.fin) });
  }
  function ranksOf(fin) {
    const key = (a, b) => (a.out !== b.out ? (a.out ? 1 : -1) : b.total - a.total || b.cube - a.cube);
    const ord = fin.slice().sort(key), r = Array(fin.length).fill(0);
    ord.forEach((x, i) => { r[x.s] = i > 0 && key(ord[i - 1], x) === 0 ? r[ord[i - 1].s] : i; });
    return r;
  }
  const ranks = st => (st.over ? ranksOf(st.fin) : (() => { const f = finalScores(st); return ranksOf(f); })());
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "pick") return st.avail.map(pos => ({ t: "card", pos }));
    if (st.phase === "bid") return [{ t: "pass" }];
    if (st.phase === "sbid") return st.hand[seat].slice(0, 1).map(c => ({ t: "sbid", cubes: [c] }));
    if (st.phase === "swap") return [{ t: "keep" }];
    return [];
  }

  // ── 보이는 것 ──
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all", full = isAll || st.over;
    const itemsV = st.items.map((a, s) => a.map(it => { const o = { id: it.id, nm: ITEMS[it.id].nm, em: ITEMS[it.id].em, h: full || s === me ? (it.h || 0) : undefined }; if (full || s === me) o.v = val(it); return o; }));
    const pubHand = st.hand.map((h, s) => (full || s === me ? h.slice() : h.concat(st.ghost[s]).sort((x, y) => x - y)));
    const b = st.bid && { id: st.bid.id, pos: st.bid.pos, cur: st.bid.cur, high: st.bid.high, hi: st.bid.hi, tab: st.bid.tab.map(x => x.slice()), tot: st.bid.tab.map(sum), pass: st.bid.pass.slice() };
    let sb = null;
    if (st.sb) sb = { e: st.sb.e, who: st.sb.who.slice(), got: st.sb.sub.map(x => !!x), tries: st.sb.tries, tied: st.sb.tied.slice(), mine: me >= 0 && st.sb.sub[me] ? st.sb.sub[me].slice() : null };
    const V = {
      n: st.n, round: st.round, lead: st.lead, phase: st.phase, seat: me, avail: st.avail.slice(), left: st.avail.length, spec: st.spec, specSeen: st.specSeen.slice(), itemsSeen: st.itemsSeen.slice(),
      itemsLeft: ITEMS.length - st.itemsSeen.length, endAt: END_SPECIAL, hand: me >= 0 || isAll ? (isAll ? st.hand.map(h => h.slice()) : st.hand[me].slice()) : [], pubHand, hid: st.ghost.map(g => g.length),
      cubeSum: full ? st.hand.map(sum) : null, items: itemsV, bid: b, sb, sw: st.sw ? { s: st.sw.s, e: st.sw.e } : null, pend: st.pend.map((x, s) => (full || s === me ? x : 0)),
      rankInfo: st.rankInfo ? clone(st.rankInfo) : null, res: st.res ? clone(st.res) : null, needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), log: clone(st.log),
    };
    if (st.res && st.res.k === "item" && !(full || st.res.w === me)) { /* 값은 view.items 에 이미 없음 */ }
    if (full) V.fin = st.over ? clone(st.fin) : finalScores(st);
    V.pub = hash(JSON.stringify([V.round, V.lead, V.phase, V.avail, V.items.map(a => a.map(x => x.id)), V.pubHand, V.bid, V.sb && [V.sb.e, V.sb.got], V.spec, V.over, V.res])).toString(36);
    return V;
  }

  // ── AI ──
  // 이름으로 짐작하는 값의 대역 (억) — 사람이 물품 이름만 보고 '비싸 보인다' 하는 정도. 낙찰자만 아는 진짜 값은 view 에 없음.
  const BAND = ITEMS.map(x => { const o = x.v / 10000; return o < 10 ? 5 : o < 30 ? 18 : o < 60 ? 45 : o < 120 ? 90 : o < 200 ? 150 : 280; });
  const AVG = TOTAL / ITEMS.length / 10000;
  const PROF = { easy: { noise: 1.2, k: 0.9, sloppy: 0.5, careful: false, ahead: false, cap: false }, normal: { noise: 0.7, k: 1.0, careful: false, ahead: false, cap: false }, hard: { noise: 0, k: 0.7, careful: true, ahead: true, cap: false } };
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.phase, V.bid && [V.bid.high, V.bid.hi], V.hand, V.items.map(a => a.length), V.sb && V.sb.e]));
  const myTotal = V => V.items[V.seat].reduce((a, x) => a + x.v / 10000, 0);
  // 앞으로 나올 물품 수 (3번째 특수 카드까지) — 공개 정보만
  function itemsAhead(V) {
    const need = V.endAt - V.spec; if (need <= 0) return 0;
    const specLeft = 8 - V.spec; return V.itemsLeft * need / (specLeft + 1);
  }
  const estOf = (V, id, P, R) => BAND[id] * (1 + (R() - 0.5) * 2 * P.noise);
  // 큐브 조합 중 합이 target 이상이면서 가장 작은 것 (부분집합 합 · 11개라 2048)
  function minSubset(hand, target, keep) {
    let best = null; const n = hand.length;
    for (let m = 1; m < (1 << n); m++) {
      let s = 0, c = 0; for (let i = 0; i < n; i++) if (m & (1 << i)) { s += hand[i]; c++; }
      if (s < target) continue;
      if (keep && c === n) continue;
      if (!best || s < best.s || (s === best.s && c < best.c)) best = { s, c, m };
    }
    return best && hand.filter((x, i) => best.m & (1 << i));
  }
  function nearSubset(hand, target) {
    let best = null; const n = hand.length;
    for (let m = 1; m < (1 << n); m++) {
      let s = 0, c = 0; for (let i = 0; i < n; i++) if (m & (1 << i)) { s += hand[i]; c++; }
      const d = Math.abs(s - target) + c * 0.01;
      if (!best || d < best.d) best = { d, m };
    }
    return best && hand.filter((x, i) => best.m & (1 << i));
  }
  // 이 물품에 낼 수 있는 큐브 합의 한도
  // 남들 큐브 합 어림 (공개 정보: 낸 큐브는 보이고, 특수 카드에 몰래 낸 큐브는 개수만 → 평균 8 로 셈)
  function othersMin(V, s) { let m = 1e9; for (let o = 0; o < V.n; o++) if (o !== s) m = Math.min(m, sum(V.pubHand[o]) - V.hid[o] * 8); return m; }
  function willing(V, s, id, P, R) {
    const myC = sum(V.hand), ahead = P.ahead ? itemsAhead(V) * AVG : 650, e = estOf(V, id, P, R), pool = Math.max(40, ahead) + e;
    let w = Math.max(0, myC * 0.9 * P.k * e / pool);
    if (P.cap && V.spec >= 1) w = Math.min(w, Math.max(0, myC - Math.max(0, othersMin(V, s) - (V.spec >= 2 ? 1 : 4))));   // 큐브 합이 맨 꼴찌가 되어 50% 깎이는 것을 피함
    return w;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (V.phase === "pick") return { t: "card", pos: V.avail[Math.floor(R() * V.avail.length)] };
    if (V.phase === "bid") {
      const b = V.bid, w = willing(V, s, b.id, P, R) * (P === PROF.easy ? 0.5 + R() : 1), need = b.high + 1 - b.tot[s];
      if (b.high === 0 && need > 0 && w >= 1) { const c = minSubset(V.hand, 1, P.careful); if (c && b.tot[s] + sum(c) <= Math.max(w, 1)) return { t: "bid", cubes: c.slice(0, 1) }; }
      let c = minSubset(V.hand, need, P.careful);
      if (c && P.sloppy && R() < P.sloppy) { const extra = V.hand.filter(x => !c.includes(x)); if (extra.length) c = c.concat(extra[Math.floor(R() * extra.length)]); }   // 초급: 어림잡아 큐브를 더 얹음
      if (c && b.tot[s] + sum(c) <= w) return { t: "bid", cubes: c };
      return { t: "pass" };
    }
    if (V.phase === "sbid") {
      const e = V.sb.e, myC = sum(V.hand), pool = Math.max(40, itemsAhead(V) * AVG), per = myC * 0.9 * P.k / pool; let gain = 0;
      if (e === "steal" || e === "swap") {
        const opp = V.items.map((a, x) => (x === s ? 0 : Math.max(0, ...a.map(it => BAND[it.id])))), mine = V.items[s].length ? Math.min(...V.items[s].map(it => it.v / 10000)) : null;
        const bo = Math.max(...opp); gain = e === "steal" ? bo : (mine == null ? 0 : Math.max(0, bo - mine));
      } else gain = e === "drop" ? (V.items[s].length ? Math.max(...V.items[s].map(it => it.v / 10000)) : AVG * 0.6) : myTotal(V) * 0.5 + 2;
      let target = Math.max(1, per * gain * (e === "drop" || e === "half" ? 0.5 : 0.6) * (1 + (R() - 0.5) * 0.5 + (P.noise ? (R() - 0.5) * P.noise : 0)));
      target = Math.min(target, myC * 0.45);
      const c = nearSubset(V.hand, target); return { t: "sbid", cubes: c };
    }
    if (V.phase === "swap") {
      const e = V.sw.e, mineIdx = V.items[s].map((it, i) => ({ i, v: it.v / 10000 })).sort((a, b) => a.v - b.v);
      let bestG = -1, pick = null;
      V.items.forEach((a, x) => { if (x === s) return; a.forEach((it, j) => { const gv = BAND[it.id] * (1 + (R() - 0.5) * P.noise), g = e === "steal" ? gv : gv - (mineIdx[0] ? mineIdx[0].v : 0); if (g > bestG) { bestG = g; pick = { from: x, theirs: j }; } }); });
      if (!pick || (e === "swap" && bestG <= 2)) return { t: "keep" };
      return e === "steal" ? { t: "steal", from: pick.from, theirs: pick.theirs } : { t: "swap", from: pick.from, theirs: pick.theirs, mine: mineIdx[0].i };
    }
    return null;
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const a = ai(V, s, "hard"), R = seeded(keyV(V, s)), o = { a };
    if (V.phase === "bid") { o.w = willing(V, s, V.bid.id, PROF.hard, R); o.est = BAND[V.bid.id]; o.ahead = itemsAhead(V); }
    return o;
  }
  // 수 하나의 값: 입찰 = 한도 대비 남는 폭 · 포기 = 0 (한도 안에서 이길 수 있었는데 포기하면 아쉬움)
  function worth(V, s, a) {
    if (V.phase !== "bid" || !a) return null;
    const R = seeded(keyV(V, s)), w = willing(V, s, V.bid.id, PROF.hard, R), b = V.bid;
    if (a.t === "pass") { const c = minSubset(V.hand, b.high + 1 - b.tot[s], true); return { u: c && b.tot[s] + sum(c) <= w ? 0.2 : 0, w, tot: null }; }
    const nt = b.tot[s] + sum(a.cubes || []);
    return { u: Math.max(-1, (w - nt) / Math.max(1, w)), w, tot: nt };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || V.phase !== "bid" || !myA || !bestA) return null;
    return { my: worth(V, s, myA), best: worth(V, s, bestA) };
  }

  return { id: "blindauction", ITEMS, CUBES, TOTAL, SPECIAL, TOKENS, NCARD, END_SPECIAL, BAND, PROF, val, minSubset, nearSubset, itemsAhead, willing, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, worth, judge, finalScores };
});
