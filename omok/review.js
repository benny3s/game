/* 오목 복기 선생님 — '🤔 노린 것'(실제로 둔 수가 한 일 + 같은 쪽이 한 번 더 둔다면 둘 곳) · 손해 판단. 화면과 상관없는 순수 함수 (Node 시험도 같은 코드)
   대국 중 AI 선생님도 같은 계산을 씀: aimWhy(…, opp) = 👀 상대가 방금 둔 수 · advise = 추천 까닭을 상대 노림과 견줌 · flow = 📊 흐름
   판 위 사실(사·열린 삼·막기)로만 말함 · 손해는 AI 수읽기가 찾은 '반드시 이기는 길'(오목·열린 사·VCF·VCT)이 생기거나 사라졌을 때만 */
(function (root) {
  'use strict';
  const O = root.Omok || require('./core.js');
  const WIN = { win: 1, open4: 1, vcf: 1, vct: 1 };                  // think() 가 '이 쪽이 반드시 이김' 이라고 본 종류

  // 판 b(그 칸에 c 가 놓였다고 봄)에서 idx 를 지나는 c 의 모양: 오목 · 열린 사 · 사(막힌 사, 한 줄 사사는 2) · 열린 삼 개수 · 이웃 돌
  function shape(b, N, idx, c, rule) {
    const x = idx % N, y = (idx - x) / N, exact = O.exactFive(rule, c), ks = [0, 0, 0, 0, 0, 0, 0, 0, 0], k2 = ks.slice();
    const straight = (d) => O.completions(b, N, x, y, d, c, exact, k2) === 2 && k2[1] - k2[0] === 5;
    let five = false, open4 = 0, four = 0, three = 0, near = 0;
    const was = b[idx]; b[idx] = c;
    for (let d = 0; d < 4; d++) {
      const run = O.runThrough(b, N, x, y, d, c);
      if (exact ? run === 5 : run >= 5) { five = true; continue; }
      if (run >= 2) near++;
      const n = O.completions(b, N, x, y, d, c, exact, ks);
      if (n >= 2) { if (n === 2 && ks[1] - ks[0] === 5) open4++; else four += 2; continue; }
      if (n === 1) { four++; continue; }
      for (let k = -3; k <= 3; k++) {                                   // 한 수 더 두면 열린 사가 되는 방향 = 열린 삼
        if (!k) continue;
        const ex = x + k * O.DX[d], ey = y + k * O.DY[d];
        if (ex < 0 || ey < 0 || ex >= N || ey >= N || b[ey * N + ex] !== 0) continue;
        b[ey * N + ex] = c; const st = straight(d); b[ey * N + ex] = 0;
        if (st) { three++; break; }
      }
    }
    b[idx] = was;
    return { five, open4, four, three, near };
  }
  // 상태 s 에서 둘 차례(c)가 idx 에 두면: 공격 종류 · 막기 종류
  function fx(s, idx) {
    const N = s.size, c = s.turn, o = 3 - c, b = s.board.slice();
    if (!(idx >= 0 && idx < N * N) || b[idx]) return { atk: '', def: '' };
    const m = shape(b, N, idx, c, s.rule), t = shape(b, N, idx, o, s.rule);
    const atk = m.five ? 'five' : (m.open4 || m.four >= 2) ? 'open4' : (m.four && m.three) ? '43' : m.three >= 2 ? '33' : m.four ? 'four' : m.three ? 'three' : m.near ? 'connect' : '';
    const def = t.five ? 'five' : (t.open4 || t.four >= 2) ? 'open4' : (t.four && t.three) ? '43' : t.three >= 2 ? '33' : t.four ? 'four' : t.three ? 'three' : '';
    return { atk, def, restricted: O.restricted(s.rule, c) };
  }
  const DONE = { five: '오목 완성!', open4: '열린 사(4)를 만들었어요 — 다음에 오목', '43': '4-3을 만들었어요 — 막기 어려워요', '33': '삼삼(열린 삼 둘)을 만들었어요',
    four: '사(4)를 만들어 상대가 막게 했어요', three: '열린 삼을 만들었어요', connect: '내 돌과 이었어요' };
  const BLOCK = { five: '상대 사(4)를', open4: '상대 열린 삼을', '43': '상대 4-3 자리를', '33': '상대 삼삼 자리를', four: '상대 사(4) 자리를', three: '상대 열린 삼 자리를' };
  const BLOCK_NEXT = { five: '상대 사(4) 막기', open4: '상대 열린 삼 막기', '43': '상대 4-3 막기', '33': '상대 삼삼 막기', four: '상대 사(4) 자리 막기', three: '상대 삼 자리 막기' };
  const SHORT = { open4: '열린 사(4)를 만들었어요', '43': '4-3을 만들었어요', '33': '삼삼을 만들었어요', four: '사(4)를 만들었어요', three: '열린 삼을 만들었어요' };
  const NEXT = { five: '오목', open4: '열린 사(4)', '43': '4-3', '33': '삼삼', four: '사(4)', three: '열린 삼', connect: '모양 넓히기' };
  const NEXT_KIND = { vcf: '부터 사(4)로 몰아 이기기', vct: '부터 몰아붙여 이기기' };
  // ── 대국 중 AI 선생님: 방금 상대가 둔 수를 '지금 둘 사람' 쪽에서 읽는 말투 (me = 지금 둘 사람을 부르는 말: '내', 둘이서면 '흑'·'백')
  const NEXT_KIND_OPP = { vcf: '사(4)로 몰아 이기기', vct: '몰아붙여 이기기' };
  const KIND_SHORT = { vcf: '사(4) 연속 공격', vct: '연속 공격' };
  const RANK = { five: 5, open4: 4, '43': 4, '33': 3, four: 2, three: 1 };   // 노림이 얼마나 매운가 (vcf 는 4 · vct 는 3 으로 침)
  const oppTexts = me => ({
    DONE: { five: '오목을 완성했어요', open4: '열린 사(4)를 만들었어요 — 양쪽을 다 막을 수 없어요', '43': '4-3을 만들었어요 — 막기 어려워요', '33': '삼삼(열린 삼 둘)을 만들었어요',
      four: '사(4)를 만들었어요 — 꼭 막아야 해요', three: '열린 삼을 만들었어요', connect: '자기 돌과 이어 모양을 넓혔어요' },
    BLOCK: { five: `${me} 사(4)를`, open4: `${me} 열린 삼을`, '43': `${me} 4-3이 될 자리를`, '33': `${me} 삼삼이 될 자리를`, four: `${me} 사(4)가 될 자리를`, three: `${me} 열린 삼이 될 자리를` },
    SHORT, KIND: NEXT_KIND_OPP,
    BLOCK_NEXT: { five: `${me} 사(4) 막기`, open4: `${me} 열린 삼 막기`, '43': `${me} 4-3 막기`, '33': `${me} 삼삼 막기`, four: `${me} 사(4) 자리 막기`, three: `${me} 삼 자리 막기` },
  });
  const selfTexts = { DONE, BLOCK, SHORT, KIND: NEXT_KIND, BLOCK_NEXT };
  // s 실제 수 전 상태 · a 실제 수 · t 노림 (같은 쪽이 한 번 더 둔다면 · 없으면 -1) · tKind 그때 AI 가 본 종류 · name 칸 → 이름
  // opp = 상대가 둔 수를 지금 둘 사람(me) 쪽에서 읽음: true(= '내') 또는 me 이름 · 안 주면 복기 (둔 쪽에서 말함)
  // → { done, next, text, thr, sharp }  (thr = 노림이 위협일 때만 { t, atk, kind, lab, short, rank } — advise 가 씀 · sharp = 위협이거나 상대 막기라 판에 '!' 를 찍을 만함)
  function aimWhy(s, a, t, tKind, name, opp) {
    name = name || (i => String(i));
    const X = opp ? oppTexts(opp === true ? '내' : opp) : selfTexts;
    const demote = f => (opp && f.atk === '33' && f.restricted ? Object.assign({}, f, { atk: 'three' }) : f);   // 금수 규칙에서 둔(둘) 수가 진짜 삼삼일 리는 없음 (거짓 삼)
    const f = demote(fx(s, a));
    let done = '';
    if (f.atk === 'five') done = X.DONE.five;
    else if (f.def && f.atk && f.atk !== 'connect') done = `${X.BLOCK[f.def]} 막으면서 ${X.SHORT[f.atk]}`;
    else if (f.def) done = `${X.BLOCK[f.def]} 막았어요`;
    else if (f.atk) done = X.DONE[f.atk];
    else if (opp) done = s.moves.length ? '뚜렷한 위협은 없는 수예요' : '첫 돌을 놓았어요';
    if (!opp && f.atk === '33' && f.restricted) done += ' (금수 규칙이면 주의)';
    let next = '', thr = null, sharp = false;
    if (f.atk !== 'five' && t >= 0) {
      const s1 = O.clone(s); O.play(s1, a);
      if (!s1.over) {
        s1.turn = s.turn;                                                // 상대가 손 뺐다고 보고 같은 쪽 차례
        const g = demote(fx(s1, t));
        let lab, rank = RANK[g.atk] || 0, short = '';
        if (g.atk === 'five') lab = NEXT.five;
        else if (X.KIND[tKind] && !(g.atk === 'open4' || g.atk === '43')) { lab = X.KIND[tKind]; rank = Math.max(rank, tKind === 'vcf' ? 4 : 3); short = KIND_SHORT[tKind]; }
        else if (g.atk && g.atk !== 'connect') lab = NEXT[g.atk] + (!opp && g.atk === '33' && g.restricted ? ' (금수 주의)' : '');
        else if (g.def) { lab = X.BLOCK_NEXT[g.def]; rank = 0; }
        else { lab = NEXT.connect; rank = 0; }
        next = !opp ? `다음 ${name(t)} ${lab}` : rank >= 1 || g.def ? `다음 노림 ${name(t)} → ${lab}` : s.moves.length >= 4 ? `다음엔 ${name(t)} 쪽으로 모양을 넓힐 것 같아요` : '';   // 초반 몇 수는 노림이랄 게 없음
        if (opp && rank >= 1) thr = { t, atk: g.atk || '', kind: tKind || '', lab, short: short || NEXT[g.atk] || lab, rank };
        sharp = rank >= 1 || !!g.def;
      }
    }
    return { done, next, text: [done, next].filter(Boolean).join(' · '), thr, sharp };
  }
  // 내 수 mv 가 상대 노림(thr)을 약하게 하나: 노림 자리를 차지하거나, 거기 둬도 공격이 한 단계 이상 약해지거나, 상대 사(4)를 막는 수(kind: block · lost)
  function defuses(s, mv, thr, kind) {
    if (!thr) return false;
    if (mv === thr.t || kind === 'block' || kind === 'lost') return true;
    const s2 = O.clone(s);
    if (O.play(s2, mv)[0].type === 'illegal' || s2.over) return false;
    if (s2.board[thr.t]) return true;
    let g = fx(s2, thr.t);
    if (g.atk === '33' && g.restricted) g = { atk: 'three' };
    return (RANK[g.atk] || 0) < (RANK[thr.atk] || 0);
  }
  // 추천 수 mv(kind = think 가 알려 준 종류)의 까닭을 상대 노림(thr, thr.tn = 자리 이름)과 견줘 한 줄로. base = 노림과 상관없는 기본 까닭 (노림이 없으면 그대로)
  //  막는 수 → '…을 막는 자리예요' · 내 공격이 먼저인 수(열린 사·사 연속·사(4)·4-3) → '내 사(4)가 먼저라 막지 않아도 돼요' · 그 밖엔 기본 까닭 + 노림과 견줌
  function advise(s, mv, kind, thr, base) {
    if (!thr || thr.rank < 1 || kind === 'win') return base;
    const f = fx(s, mv), T = `상대 노림(${thr.tn || thr.t} ${thr.short})`;
    if (f.atk === 'five') return base;
    const blocks = defuses(s, mv, thr, kind);
    if (kind === 'open4' || kind === 'vcf' || kind === 'vct') {                    // 내가 먼저 이기는 길: 상대 노림이 매울 때만 '막지 않아도 돼요' 를 덧붙임
      if (blocks || thr.rank < 2) return base;
      return `${base} — ` + (kind === 'open4' ? `내 열린 사(4)가 먼저라 ${T}은 막지 않아도 돼요` : kind === 'vcf' ? `내 사(4) 연속이 먼저라 ${T}은 막지 않아도 돼요` : `내 공격이 더 빨라서 ${T}은 막지 않아도 돼요`);
    }
    if (blocks) {
      if (kind === 'block') return `${T}을 꼭 막아야 해요`;
      if (kind === 'lost') return `${T}을 막아 봐요… 그래도 어려운 판이라 버티는 자리예요`;
      const ex = f.atk === 'four' ? ' · 사(4)로 공격도 돼요' : f.atk === 'three' ? ' · 열린 삼도 만들어요' : f.atk === '43' ? ' · 4-3 공격도 돼요' : f.atk === '33' ? ' · 삼삼 공격도 돼요' : '';
      return `${T}을 막는 자리예요${ex}`;
    }
    if (/^defend/.test(kind)) {                                                    // 상대의 이기는 길(연속 사·몰아붙이기)을 끊는 수: 노림 자리 자체는 안 막아도 AI 가 이쪽을 급하다고 봄
      const what = kind === 'defend-vcf' ? '사(4) 연속 공격을' : '몰아붙이기를';
      return `상대의 ${what} 미리 끊는 자리예요` + (thr.kind === 'vcf' || thr.kind === 'vct' ? '' : ` · ${T}도 잊지 마세요`);
    }
    if ((f.atk === 'four' || f.atk === '43') && thr.rank <= 3) return `${base} — 내 ${f.atk === 'four' ? '사(4)가' : '4-3이'} 먼저라 ${T}은 바로 막지 않아도 돼요`;
    return thr.rank >= 3 ? `${base} · ${T}도 잊지 마세요` : thr.rank === 2 ? `${base} · ${T}보다 이 자리가 먼저예요` : base;
  }
  // c 쪽이 한 수 두면 만들 수 있는 것을 판 전체에서 센 것: five(오목 자리) · strong(열린 사·4-3·삼삼 = 막기 어려운 결정타 자리) · four(사) · three(열린 삼). 금수 자리는 뺌
  function power(s, c) {
    const N = s.size, b = s.board.slice(), rs = O.restricted(s.rule, c), p = { five: 0, strong: 0, four: 0, three: 0 };
    for (let i = 0; i < N * N; i++) {
      if (b[i]) continue;
      if (rs && O.forbiddenAt(b, N, i, c, s.rule)) continue;
      const m = shape(b, N, i, c, s.rule);
      if (m.five) p.five++;
      else if (m.open4 || m.four >= 2 || (m.four && m.three) || m.three >= 2) p.strong++;
      else if (m.four) p.four++;
      else if (m.three) p.three++;
    }
    return p;
  }
  // 📊 흐름: 지금 둘 차례(s.turn)가 본 판 — 누가 결정타 자리를 더 갖고 있나 / 공격 자리(두면 사(4)·열린 삼이 되는 곳)가 누가 더 많나. 의미 있는 차이가 없으면 ''
  //  nm = { me: '내', op: '상대' } (둘이서는 흑·백 이름)
  function flow(s, nm) {
    nm = nm || {};
    const me = nm.me || '내', op = nm.op || '상대';
    if (s.over || s.moves.length < 6) return '';
    const a = power(s, s.turn), b = power(s, 3 - s.turn);
    if (a.five || b.five) return '';                                     // 오목·사(4)가 걸린 판은 추천 까닭이 더 급함
    if (a.strong || b.strong) {
      if (a.strong && b.strong) return `📊 흐름: 서로 결정타 자리가 있어요 (${me} ${a.strong}곳 · ${op} ${b.strong}곳) — 지금은 ${me} 차례예요`;
      return a.strong ? `📊 흐름: ${me} 쪽이 앞서요 — 막기 어려운 결정타 자리가 ${me} ${a.strong}곳 · ${op} 0곳`
        : `📊 흐름: ${op} 쪽이 앞서요 — 막기 어려운 결정타 자리가 ${op} ${b.strong}곳 · ${me} 0곳`;
    }
    const wa = a.four + a.three, wb = b.four + b.three, sa = 2 * a.four + a.three, sb = 2 * b.four + b.three;
    if (wa + wb < 5) return '';
    const cnt = `공격 자리 ${me} ${wa}곳 · ${op} ${wb}곳`;
    return sa >= sb + 4 ? `📊 흐름: ${me} 쪽이 조금 앞서요 — ${cnt}` : sb >= sa + 4 ? `📊 흐름: ${op} 쪽이 조금 앞서요 — ${cnt}` : `📊 흐름: 팽팽해요 — ${cnt}`;
  }
  // 손해 판단: recKind = 그 장면 추천의 종류 · afterKind = 실제 수 뒤 상대 차례에서 AI 가 본 종류 (상대 기준)
  //  miss: 이길 길(오목·열린 사·VCF·VCT)이 있었는데 놓침 · allow: 지지 않던 판에서 상대에게 이기는 길을 열어 줌
  function judge(o) {
    const { a, recMove, recKind, afterKind } = o, f = o.fx || { atk: '' };
    if (a === recMove || f.atk === 'five') return null;
    const keepsWin = afterKind === 'lost' || f.atk === 'open4' || f.atk === '43' || f.atk === 'four';   // 다른 길로도 이길 수 있는 수는 봐줌
    const miss = !!WIN[recKind] && !keepsWin;
    const allow = recKind !== 'lost' && !!WIN[afterKind];
    if (!miss && !allow) return null;
    const how = k => (k === 'vcf' ? '사(4)로 몰아 ' : k === 'vct' ? '몰아붙여 ' : k === 'win' ? '바로 ' : k === 'open4' ? '열린 사(4)로 ' : '');
    return {
      miss, allow,
      sev: miss && allow ? 100 : allow ? 90 : recKind === 'vct' ? 70 : 80,
      lossText: miss && allow ? '이길 수 놓침 · 지는 길' : allow ? '지는 길을 열어 줌' : '이길 수를 놓침',
      why: allow ? `이 수 뒤로 상대가 ${how(afterKind)}이길 수 있었어요` : `추천 자리로 두면 ${how(recKind)}이길 수 있었어요`,
    };
  }

  const API = { shape, fx, aimWhy, advise, defuses, power, flow, judge, WIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.OmokReview = API;
})(typeof window !== 'undefined' ? window : globalThis);
