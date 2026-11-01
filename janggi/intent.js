/* 장기 수 읽기 (intent.js) — 둔 수가 '바로 한 일'과 '다음에 노리는 것'을 판 위 사실로 짧게 말함
   쓰는 곳: 🎞️ 복기 '🤔 노린 것' · 대국 중 '👀 상대가 방금 둔 수 읽기'(opp) · 추천 수 까닭에 '상대 노림을 막는 수예요'
   수 찾기(탐색)는 ai.js 몫 — 여기는 이미 나온 판 · 수 · 점수로 말만 만듦. Node·브라우저 공용 (브라우저 전역 JanggiIntent)
     why(s0, s1, nx, { opp })   → { term, text } | null   s0 = 그 수 전 판 · s1 = 뒤 판 · nx = 기록 한 줄 { side, from, to, piece, captured, uci, pass, bik }
                                  opp = 상대가 둔 수를 내 쪽에서 읽음 ('내 차' · '자기 포') — 이때만 조용한 수도 짧게 말함
     aim(me, th, nxt, { opp, via })  → { term, text, lab, arrow } | null   me = 둔 쪽 · th = 둔 쪽이 한 번 더 둔다면의 수 { move, from, to, piece, captured, check, score, mate } · via = 그 수가 하는 일(why 결과, 조용한 수 설명용)
                                  nxt = 그 수 뒤 판(상대 차례)의 추천 { score, mate } — 뚜렷할 때만 (외통 · 기물 따기 · 장군 · 아주 큰 조용한 수)
     counter(s, rec, th, info)  → { kind, text } | null   s = 내 차례 판 · rec = 추천 { move, why } · th = 상대 노림 · info = aim() 결과 — 추천이 노림에 어떻게 맞서나
                                  (막기 · 피하기 · 지키기 · 잡기는 '상대 노림(이름)' 을 넣고, 덧붙이는 말 bigger · recap · other 는 위 '👀' 줄이 이미 이름을 말해 짧게)
     recText(base, ctr) → 추천 수 까닭 한 줄 · formText(res, c, { duo, d }) → { text, delta } 📊 형세 말
     hangingOf(b, side) · eul · ro · wa · iga (받침 따라 조사) */
(function (root, factory) {
  const core = typeof module === 'object' && module && module.exports ? require('./core.js') : root.JanggiCore;
  const m = factory(core);
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.JanggiIntent = m;
})(typeof self !== 'undefined' ? self : this, function (J) {
  'use strict';
  const L = J.lo, V = J.VAL, K = J.K, P = J.P;
  const VQ = [0, 99, 3, 3, 5, 13, 7, 2];                                  // 잡힘 판단용 값 (궁은 크게)
  // 조사: 마지막 글자 받침으로 (ㄹ 받침은 '로')
  const bat = n => { const c = String(n).charCodeAt(String(n).length - 1) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : 0; };
  const eul = n => n + (bat(n) ? '을' : '를'), wa = n => n + (bat(n) ? '과' : '와'), iga = n => n + (bat(n) ? '이' : '가');
  const ro = n => n + (bat(n) && bat(n) !== 8 ? '으로' : '로');
  const nm = J.pieceName;

  // 이 편 기물 중 공짜로(또는 손해 보고) 잡힐 것: [자리, 종류, 노리는 상대 자리들]
  function hangingOf(b0, side) {
    const b = b0.slice(), out = [];
    for (let q = 0; q < 90; q++) {
      const p = b[q]; if (!p || (p >> 3) !== side || (p & 7) === K) continue;
      const atk = L.attackers(b, q, side ^ 1); if (!atk.length) continue;
      const low = Math.min(...atk.map(x => VQ[b[x] & 7]));
      b[q] = J.mk(P, side ^ 1); const def = L.attackers(b, q, side).filter(x => x !== q).length; b[q] = p;
      if (!def || low < VQ[p & 7]) out.push([q, p & 7, atk]);
    }
    return out;
  }

  // 둔 수(s0 → s1)가 한 일: 판에서 바로 보이는 것만 (모르면 null — 복기는 '자리 잡기'로 둠). opp = 상대가 둔 수를 내 쪽에서 읽음
  function why(s0, s1, nx, opt) {
    const opp = !!(opt && opt.opp), me = nx.side, op = me ^ 1;
    const mine = t => nm(t, me), own = t => (opp ? '자기 ' : '') + nm(t, me), his = t => (opp ? '내 ' : '') + nm(t, op);
    if (nx.pass) return { term: '한수 쉼', text: '움직이지 않고 넘겼어요' };
    const b0 = s0.b, b1 = s1.b, f = nx.from, t = nx.to, pc = nx.piece, cap = nx.captured;
    if (s1.over && s1.reason === 'mate') return { term: '외통', text: '이 수로 외통이에요' };
    if (s0.check) {
      if (cap && L.attackers(b0, L.kingSq(b0, me), op).includes(t)) return { term: '장군 피하기', text: `장군을 건 ${eul(his(cap))} 잡았어요` };
      if (pc === K) return { term: '장군 피하기', text: '궁을 옮겨 피했어요' };
      return { term: '길 막기', text: `${ro(mine(pc))} 장군을 막았어요 (멍군)${s1.check ? ' · 장군까지' : ''}` };
    }
    const safe = !L.attacked(b1, t, op);
    if (cap) {
      if (safe) return { term: '기물 따기', text: `${eul(his(cap))} 공짜로 땄어요${s1.check ? ' · 장군까지' : ''}` };
      if (V[cap] > V[pc]) return { term: '교환', text: `${ro(mine(pc))} 더 비싼 ${eul(his(cap))} 땄어요 (${opp ? '내가 다시 잡아도 상대가 이득' : '다시 잡혀도 이득'})` };
      if (V[cap] === V[pc]) return { term: '교환', text: `${wa(mine(pc))} ${eul(his(cap))} ${opp ? '맞바꿨어요' : '맞바꿔요'}` };
      return { term: '기물 따기', text: opp ? `${eul(his(cap))} 땄지만 그 ${eul(mine(pc))} 되잡을 수 있어요` : `${eul(his(cap))} 땄지만 ${iga(mine(pc))} 다시 잡힐 수 있어요` };
    }
    if (s1.check) return { term: '장군', text: opp ? `${ro(mine(pc))} 내 궁에 장군을 걸었어요` : `${ro(mine(pc))} 궁을 몰아요` };
    if (nx.bik) return { term: '빅장', text: '궁끼리 마주 보게 했어요' };
    const h0 = hangingOf(b0, me), h1 = hangingOf(b1, me);
    if (h0.some(([q]) => q === f) && safe) return { term: '피하기', text: `잡힐 뻔한 ${eul(own(pc))} 옮겼어요`, next: `${eul(own(pc))} 옮겨 피해요` };
    const saved = h0.filter(([q]) => q !== f && !h1.some(([x]) => x === q)).sort((x, y) => V[y[1]] - V[x[1]]);
    if (saved.length) {
      const [q, tp, atk] = saved[0];
      const blocked = atk.some(a => b1[a] === b0[a] && !L.attackers(b1, q, op).includes(a));     // 노리던 기물은 그대로인데 이제 못 노림 = 길을 막음
      return blocked ? { term: '길 막기', text: `${ro(mine(pc))} 길을 막아 ${eul(own(tp))} 지켰어요`, next: `${ro(mine(pc))} 길을 막아 ${eul(own(tp))} 지켜요` } : { term: '지키기', text: `노려지던 ${eul(own(tp))} 지켰어요`, next: `노려지는 ${eul(own(tp))} 지켜요` };
    }
    if (!opp) return null;
    // 상대가 둔 수를 읽을 때만: 이 수로 새로 노리게 된 내 기물 · 잡힐 자리에 놓았는지 · 그 밖의 조용한 수
    const tg = [];
    for (let q = 0; q < 90; q++) {
      const p = b1[q]; if (!p || (p >> 3) !== op || (p & 7) === K) continue;
      if (L.attackers(b1, q, me).includes(t) && !L.attackers(b0, q, me).includes(f)) tg.push(p & 7);
    }
    tg.sort((x, y) => V[y] - V[x]);
    if (tg.length && V[tg[0]] >= 3) return { term: '노림', text: `${ro(mine(pc))} 내 ${eul(nm(tg[0], op))} 노려요`, next: `${ro(mine(pc))} 내 ${eul(nm(tg[0], op))} 노려요`, tg };
    if (h1.some(([q]) => q === t)) return { term: '무리수', text: `${iga(mine(pc))} 잡힐 수 있는 자리에 놓였어요` };
    if (pc === P) return { term: '졸', text: Math.abs(((t / 9) | 0) - ((f / 9) | 0)) ? `${eul(mine(pc))} 앞으로 내보냈어요` : `${eul(mine(pc))} 옆으로 옮겼어요` };
    if (pc === K || pc === J.A) return { term: '궁성', text: '궁성 안을 다졌어요' };
    return { term: '자리 잡기', text: `${eul(mine(pc))} 좋은 자리로 옮겼어요` };
  }

  // 다음 노림 (뚜렷할 때만): 외통 위협 · 기물 따기 · 장군 · 그 밖의 큰 수 — 한 번 더 두면 1.5점 넘게 좋아질 때 (gain = th.score + nxt.score · 100 = 1점)
  function aim(me, th, nxt, opt) {
    const opp = !!(opt && opt.opp);
    if (!nxt) return null;
    if (nxt.mate < 0) return { term: '외통 위협', text: opp ? `어떻게 받아도 ${-nxt.mate}수 안에 외통을 당해요` : `상대가 어떻게 받아도 ${-nxt.mate}수 안에 외통이에요`, lab: '외통', arrow: th && th.mate > 0 ? [th.from, th.to] : null };
    if (!th) return null;
    const gain = th.score + nxt.score, pn = nm(th.piece, me), arrow = [th.from, th.to];
    const tgt = th.captured ? (opp ? '내 ' : '') + nm(th.captured, me ^ 1) : '';
    if (th.mate > 0) return { term: '외통 위협', text: opp ? `막지 않으면 ${th.mate}수 안에 외통이에요` : `그냥 두면 ${th.mate}수 안에 외통이에요`, lab: '외통', arrow };
    if (th.captured && gain >= 150) return { term: '기물 따기', text: `다음에 ${ro(pn)} ${eul(tgt)} 따려고 해요`, lab: `${ro(pn)} ${tgt} 따기`, arrow };
    if (th.check && gain >= 200) return { term: '장군', text: `다음에 ${ro(pn)} 장군을 노려요`, lab: '장군', arrow };
    if (!th.captured && !th.check && gain >= 400) { const lb = `${J.sqName(th.from)}${pn}${J.sqName(th.to)}`, v = opt && opt.via && opt.via.next || ''; return { term: '노림', text: v ? `다음에 ${v}` : `다음에 ${lb} 수를 노려요`, lab: v && opt.via.term === '노림' ? v.replace(/노려요$/, '노리기') : lb, arrow }; }   // 조용한 수는 아주 클 때만
    return null;
  }

  // 추천 수가 상대 노림에 맞서는 방법을 한 줄로 (s = 내 차례 판) — kind: escape(노려진 기물을 옮김) · take(노리던 기물을 잡음) · block(길을 막음) · check(장군으로 먼저) · defend(노려진 기물을 받침) · bigger(더 큰 수) · recap(원래 잡혀도 되잡음) · other
  function counter(s, rec, th, info) {
    if (!rec || !rec.move || rec.move === 'pass' || !th || !th.move || !info) return null;
    const op = s.turn ^ 1, lab = `상대 노림(${info.lab})`, m = J.parseMove(rec.move), f = m >> 7, t = m & 127, kind = rec.why && rec.why.kind;
    if (th.captured && f === th.to) return { kind: 'escape', text: `${lab}을 피하는 수예요` };
    if (t === th.from) return { kind: 'take', text: `노리던 상대 ${eul(nm(th.piece, op))} 잡아 없애요` };
    const s2 = J.fastClone(s);
    if (J.step(s2, rec.move)[0].type === 'illegal' || s2.over) return null;
    if (!J.legal(s2).some(x => x.uci === th.move)) return s2.check ? { kind: 'check', text: `장군으로 ${lab}을 먼저 막아요` } : { kind: 'block', text: `${lab}을 막는 수예요` };
    if (kind === 'mate' || kind === 'free' || kind === 'trade' || kind === 'check') return { kind: 'bigger', text: '상대 노림보다 이 수가 더 커요' };
    if (th.captured) {                                                    // 잡혀도 되잡을 수 있나 — 이 수 덕분이면 '지킴', 원래 그랬으면 '되잡음'
      const s3 = J.fastClone(s2); J.step(s3, th.move);
      if (!s3.over && L.attackers(s3.b, th.to, s.turn).length) {
        const sa = J.create({ rules: s.rules, fen: J.toFen(s.b, op) }); J.step(sa, th.move);      // 내가 손 뺐다면
        return !sa.over && !L.attackers(sa.b, th.to, s.turn).length ? { kind: 'defend', text: `${lab}에 대비해 지켜 주는 수예요` } : { kind: 'recap', text: '상대 노림은 잡혀도 되잡을 수 있어요' };
      }
    }
    return { kind: 'other', text: '상대 노림은 받지 않아도 된다고 읽었어요' };
  }

  // 추천 수 까닭 한 줄: 엔진이 준 까닭(base { kind, text }) + 상대 노림에 맞서는 법(ctr) — 막기 · 피하기 · 지키기 · 잡기는 그 말이 주인공, 덧붙이는 말(bigger · recap · other)은 뒤에 붙임
  function recText(base, ctr) {
    const bt = base ? base.text : '';
    if (!ctr) return bt;
    if (ctr.kind === 'bigger' || ctr.kind === 'recap' || ctr.kind === 'other') return bt ? `${bt} — ${ctr.text}` : ctr.text;
    return bt && base && ['mate', 'free', 'trade', 'check', 'evade', 'bik'].includes(base.kind) ? `${bt} · ${ctr.text}` : ctr.text;   // 이미 뚜렷한 까닭(잡기 · 장군 …)이 있으면 같이
  }
  // 📊 형세 말 (c 편 차례 기준, 점수 100 = 1점): res = { score, mate } · opt = { duo(둘이서면 '초가·한이'), d(지난 차례보다 바뀐 점수) } → { text, delta('' | '지난 차례보다 −1.2점') }
  const SIDE_IGA = ['초가', '한이'], pts = x => (Math.abs(x) / 100).toFixed(1);
  function formText(res, c, opt) {
    opt = opt || {};
    const me = opt.duo ? SIDE_IGA[c] : '내가', op = opt.duo ? SIDE_IGA[c ^ 1] : '상대가';
    let text;
    if (res.mate) text = res.mate > 0 ? `${me} ${res.mate}수 안에 외통을 만들 수 있어요` : `${op} ${-res.mate}수 안에 외통을 만들 수 있어요 — 조심!`;
    else if (Math.abs(res.score) > 15000) text = `이대로면 ${res.score > 0 ? me : op} 점수로 이겨요`;
    else if (Math.abs(res.score) < 60) text = '팽팽해요';
    else text = `${me} 약 ${pts(res.score)}점 ${res.score > 0 ? '앞서요' : '뒤져요'}`;
    const d = opt.d;
    return { text, delta: d != null && Math.abs(d) >= 100 ? `지난 차례보다 ${d > 0 ? '+' : '−'}${pts(d)}점` : '' };
  }

  return { why, aim, counter, recText, formText, hangingOf, eul, ro, wa, iga };
});
