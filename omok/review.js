/* 오목 복기 선생님 — '🤔 노린 것'(실제로 둔 수가 한 일 + 같은 쪽이 한 번 더 둔다면 둘 곳) · 손해 판단. 화면과 상관없는 순수 함수 (Node 시험도 같은 코드)
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
  // s 실제 수 전 상태 · a 실제 수 · t 노림 (같은 쪽이 한 번 더 둔다면 · 없으면 -1) · tKind 그때 AI 가 본 종류 · name 칸 → 이름
  // → { done, next, text }
  function aimWhy(s, a, t, tKind, name) {
    name = name || (i => String(i));
    const f = fx(s, a);
    let done = '';
    if (f.atk === 'five') done = DONE.five;
    else if (f.def && f.atk && f.atk !== 'connect') done = `${BLOCK[f.def]} 막으면서 ${SHORT[f.atk]}`;
    else if (f.def) done = `${BLOCK[f.def]} 막았어요`;
    else if (f.atk) done = DONE[f.atk];
    if (f.atk === '33' && f.restricted) done += ' (금수 규칙이면 주의)';
    let next = '';
    if (f.atk !== 'five' && t >= 0) {
      const s1 = O.clone(s); O.play(s1, a);
      if (!s1.over) {
        s1.turn = s.turn;                                                // 상대가 손 뺐다고 보고 같은 쪽 차례
        const g = fx(s1, t);
        let lab;
        if (g.atk === 'five') lab = NEXT.five;
        else if (NEXT_KIND[tKind] && !(g.atk === 'open4' || g.atk === '43')) lab = NEXT_KIND[tKind];
        else if (g.atk && g.atk !== 'connect') lab = NEXT[g.atk] + (g.atk === '33' && g.restricted ? ' (금수 주의)' : '');
        else if (g.def) lab = BLOCK_NEXT[g.def];
        else lab = NEXT.connect;
        next = `다음 ${name(t)} ${lab}`;
      }
    }
    return { done, next, text: [done, next].filter(Boolean).join(' · ') };
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

  const API = { shape, fx, aimWhy, judge, WIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.OmokReview = API;
})(typeof window !== 'undefined' ? window : globalThis);
