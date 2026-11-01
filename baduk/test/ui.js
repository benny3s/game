// 바둑 화면 시험 (브라우저, 소리 없음): node baduk/test/ui.js
//   61 친구랑에서 u·Backspace·Ctrl+Z 가 숨긴 무르기 단추를 눌러 내 판만 수가 빠지던 것
//   75 계가 확정(confirm)에 점수가 안 실려 두 기기가 각자 자기 점수로 끝나던 것
//   57 방장이 보낸 이름(G.names)이 esc 없이 innerHTML 에 들어가던 것 (길이 제한도 없었음)
// 항목마다 새 방 (앞 시험이 판을 망가뜨려도 다음 시험에 안 번지게)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/baduk');

const canMove = () => { const G = __baduk.G; return !!(G && G.phase === 'play' && !G.st.over && G.players[G.st.toPlay] === 'human'); };

// 방장 H + 손님 W 가 7줄판에서 네 수 둔 상태
async function room(T) {
  const { H, W } = await T.pair(A);
  for (const p of [H, W]) await p.evaluate(() => { for (let i = 0; i < 3; i++) { const b = [...document.querySelectorAll('.overlay button')].find(x => /^알겠어요$/.test(x.textContent.trim())); if (b) b.click(); } });
  const play = async pt => {                                      // 둘 차례인 쪽이 둠
    for (let t = 0; t < 80; t++) {
      for (const p of [H, W]) { if (await p.evaluate(canMove)) { await p.evaluate(pt => __baduk.play(pt), pt); return true; } }
      await T.sleep(100);
    }
    return false;
  };
  for (const pt of [10, 38, 24, 12]) T.ok(await play(pt), `${pt} 번 점에 둠`);
  for (const p of [H, W]) T.ok(!!(await T.waitFor(p, () => __baduk.G.st.moves.length === 4, null, 5000)), '4수 맞음');
  return { H, W, play };
}
const moves = p => p.evaluate(() => __baduk.G.st.moves.length);

U.main(async T => {
  // ── 61) 키로 무르기
  {
    const { H, W } = await room(T);
    for (const p of [H, W]) {
      for (const [key, mod] of [['u', null], ['U', null], ['Backspace', null], ['z', 'Control'], ['z', 'Meta']]) {
        if (mod) await p.keyboard.down(mod);
        await p.keyboard.press(key);
        if (mod) await p.keyboard.up(mod);
        await T.sleep(150);
        T.ok((await moves(p)) === 4, `61 친구랑에서 ${mod ? mod + '+' : ''}${key} 키로 무르기가 되면 안 됨 (${await moves(p)}수)`);
      }
    }
    await T.sleep(300);
    T.ok((await moves(H)) === 4 && (await moves(W)) === 4, '61 두 화면의 수가 그대로');
  }

  // ── 57) 방장이 보낸 이름 → 손님 화면의 status·말풍선에 HTML 이 들어가면 안 됨
  //   (방장 차례여야 손님 status 에 방장 이름이 찍힘: 손님 차례면 손님이 한 수 둠)
  {
    const { H, W } = await room(T);
    while (await W.evaluate(canMove)) { const pt = await W.evaluate(() => { const G = __baduk.G, L = __baduk.B.legal(G.st); for (let i = 0; i < L.length; i++) if (L[i]) return i; return -1; }); await W.evaluate(pt => __baduk.play(pt), pt); await T.sleep(300); }
    const bad = '<img id=pwn src=x onerror="window.__pwn=1">' + 'ㅋ'.repeat(40);
    const send = bad => H.evaluate(bad => {
      const G = __baduk.G, B = __baduk.B;
      G.net.broadcast({ t: 'snap', g: G.g, st: B.toJSON(G.st), phase: G.phase, dead: null, seats: { 1: G.seats[1] || null, 2: G.seats[2] || null }, names: { 1: bad, 2: bad } }, true);
    }, bad);
    await send(bad);
    await T.sleep(600);
    let r = await W.evaluate(() => ({ pwn: !!document.getElementById('pwn'), ran: !!window.__pwn, names: __baduk.G.names, status: document.getElementById('status').textContent }));
    T.ok(!r.pwn && !r.ran, `57 이름의 HTML 이 status 에 태그로 들어감 (img#pwn=${r.pwn}, 실행=${r.ran})`);
    T.ok(r.names && [1, 2].every(c => String(r.names[c]).length <= 12), `57 이름 길이 제한 (${r.names && r.names[1] && r.names[1].length}자)`);
    // 패스 말풍선: 방장이 패스 → 손님 화면 말풍선에 이름
    await H.evaluate(() => { const G = __baduk.G; if (G.phase === 'play' && G.players[G.st.toPlay] === 'human') __baduk.play(G.st.size * G.st.size); });
    await T.sleep(500);
    r = await W.evaluate(() => ({ pwn: !!document.getElementById('pwn'), ran: !!window.__pwn, bubble: document.getElementById('bubble').textContent }));
    T.ok(!r.pwn && !r.ran, `57 이름의 HTML 이 패스 말풍선에 태그로 들어감 (img#pwn=${r.pwn})`);
  }

  // ── 75) 계가 확정: 두 기기가 같은 점수로 끝나야 함 (손님 쪽 죽은 돌 표시가 어긋난 상태를 일부러 만듦)
  {
    const { H, W } = await room(T);
    for (let k = 0; k < 2; k++) {                                  // 두 사람이 차례로 패스 → 계가
      for (let t = 0; t < 60; t++) {
        let done = false;
        for (const p of [H, W]) if (await p.evaluate(canMove)) { await p.evaluate(() => __baduk.play(__baduk.G.st.size * __baduk.G.st.size)); done = true; break; }
        if (done) break;
        await T.sleep(100);
      }
      await T.sleep(200);
    }
    const both = async () => (await Promise.all([H, W].map(p => T.waitFor(p, () => __baduk.G.phase === 'score' && !!__baduk.G.score, null, 15000)))).every(Boolean);
    T.ok(await both(), '75 두 화면 모두 계가 화면');
    await W.evaluate(() => { const G = __baduk.G, B = __baduk.B; for (let i = 0; i < G.dead.length; i++) G.dead[i] = G.st.board[i] ? 1 : 0; G.score = B.scoreKorean(G.st, G.dead); });   // 손님만 모든 돌을 죽은 돌로 봄
    const sc0 = await Promise.all([H, W].map(p => p.evaluate(() => JSON.stringify(__baduk.G.score))));
    T.ok(sc0[0] !== sc0[1], '75 (시험 조건) 확정 전엔 두 기기의 점수가 다름');
    await H.evaluate(() => document.getElementById('confirmBtn').click());
    const fin = async () => (await Promise.all([H, W].map(p => T.waitFor(p, () => __baduk.G.phase === 'done', null, 10000)))).every(Boolean);
    T.ok(await fin(), '75 두 화면 모두 끝남');
    const sc = await Promise.all([H, W].map(p => p.evaluate(() => ({ score: JSON.stringify(__baduk.G.score), res: (document.getElementById('resBox').textContent || '').replace(/\s+/g, ' ').slice(0, 120) }))));
    T.ok(sc[0].score === sc[1].score, '75 방장 점수 ' + sc[0].score.slice(0, 80) + ' / 손님 점수 ' + sc[1].score.slice(0, 80));
    T.ok(sc[0].res === sc[1].res, '75 결과 창 글이 같음: ' + sc[0].res + ' / ' + sc[1].res);
  }
}, '바둑 화면');
