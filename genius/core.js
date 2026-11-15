// 베니 지니어스 핵심 규칙 · 공정 AI · AI 선생님 분석 엔진 (Node + 브라우저 공용)
// 포함 게임:
//   1) "bw" — ⬛⬜ 흑과 백 (9라운드 수 싸움 · 색만 공개되는 심리전)
//   2) "gh" — 🔷 결! 합! (도형 · 색 · 배경 3속성 조합 탐색)
//   3) "12" — 🦁 십이장기 (3×4 포로 · 승급 · 적진 입성 전략 보드)
(function (root) {
  "use strict";

  function makeRng(seed) {
    let s = (seed >>> 0) || 123456789;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ════════════════════════════════════════════════════════════════
     1. ⬛⬜ 흑과 백 (Black & White)
     - 0~8 타일 (짝수=흑 B, 홀수=백 W)
     - 선공이 낸 타일은 '색깔(B/W)'만 후공에게 공개
     - 더 큰 숫자가 승 (+1점), 무승부 0점, 승자가 다음 선공
     - 과거 라운드의 실제 숫자도 끝까지 공개되지 않음(공정 정보 분리)
     ════════════════════════════════════════════════════════════════ */
  const BW_ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const bwColor = n => (n % 2 === 0 ? "B" : "W");

  function newBW(opts) {
    const o = opts || {};
    const lead = o.firstLead === 1 ? 1 : 0;
    return {
      kind: "bw",
      round: 0, // 0..8
      hands: [BW_ALL.slice(), BW_ALL.slice()],
      scores: [0, 0],
      leader: lead,
      turn: lead,
      leadColor: null,
      _leadTile: null, // 선공의 비밀 숫자 (아레나/로컬 심판 전용)
      history: [],     // [{ round, leader, c0, c1, winner }] (숫자 비공개)
      winner: null,    // 0 | 1 | "draw" | null
    };
  }

  // 공정 정보 뷰: 내 손패 + 공개된 상대 남은 흑/백 개수 + 공개 라운드 기록만 노출
  function bwPublicView(st, seat) {
    const opp = seat ^ 1;
    let oppB = 4, oppW = 5;
    // 원래 흑(짝수)은 0,2,4,6,8 -> 5장, 백(홀수)은 1,3,5,7 -> 4장!
    oppB = 5; oppW = 4;
    for (const h of st.history) {
      const oc = opp === 0 ? h.c0 : h.c1;
      if (oc === "B") oppB--; else oppW--;
    }
    if (st.leader === opp && st.leadColor) {
      if (st.leadColor === "B") oppB--; else oppW--;
    }
    return {
      round: st.round,
      myHand: st.hands[seat].slice(),
      scores: st.scores.slice(),
      leader: st.leader,
      turn: st.turn,
      isMyTurn: st.winner === null && st.turn === seat,
      isLeader: st.leader === seat,
      leadColor: st.leadColor,
      oppRemain: { B: Math.max(0, oppB), W: Math.max(0, oppW), total: Math.max(0, oppB + oppW) },
      history: st.history.map(h => ({ ...h })),
      winner: st.winner,
    };
  }

  function playBW(st, seat, tile) {
    if (st.winner !== null) return { ok: false, err: "이미 끝난 게임이에요" };
    if (st.turn !== seat) return { ok: false, err: "내 차례가 아니에요" };
    const hand = st.hands[seat];
    const idx = hand.indexOf(tile);
    if (idx < 0) return { ok: false, err: "보유한 타일이 아니에요" };

    hand.splice(idx, 1);
    const col = bwColor(tile);

    // 선공 제출: 색만 공개하고 후공 차례로 넘김
    if (st._leadTile === null) {
      st._leadTile = tile;
      st.leadColor = col;
      st.turn = seat ^ 1;
      return { ok: true, resolved: false, color: col };
    }

    // 후공 제출: 판정 (숫자 자체는 공개 기록에 남기지 않음)
    const leadSeat = st.leader;
    const leadTile = st._leadTile;
    const followTile = tile;
    let roundWinner = "draw";
    if (leadTile > followTile) roundWinner = leadSeat;
    else if (followTile > leadTile) roundWinner = seat;

    if (roundWinner === 0 || roundWinner === 1) st.scores[roundWinner] += 1;

    const c0 = leadSeat === 0 ? bwColor(leadTile) : col;
    const c1 = leadSeat === 1 ? bwColor(leadTile) : col;
    st.history.push({ round: st.round, leader: leadSeat, c0, c1, winner: roundWinner });

    st.round += 1;
    st._leadTile = null;
    st.leadColor = null;
    if (roundWinner === 0 || roundWinner === 1) st.leader = roundWinner;
    st.turn = st.leader;

    // 조기 확정 or 9라운드 종료 체크
    const rem = 9 - st.round;
    if (st.round >= 9 || Math.abs(st.scores[0] - st.scores[1]) > rem) {
      if (st.scores[0] > st.scores[1]) st.winner = 0;
      else if (st.scores[1] > st.scores[0]) st.winner = 1;
      else st.winner = "draw";
    }

    return {
      ok: true,
      resolved: true,
      c0, c1,
      roundWinner,
      scores: st.scores.slice(),
      winner: st.winner,
    };
  }

  // 공개 정보만으로 각 타일의 승률 추정 (블라인드 공정성 보장)
  function evalBWFromPublic(pub) {
    const myHand = pub.myHand;
    if (!myHand.length) return [];
    const opp = pub.turn; // meaningless, just need pool
    void opp;
    const pool = [];
    if (!pub.isLeader && pub.leadColor) {
      // 후공: 상대가 이번에 낸 색이 확정됨
      const cands = pub.leadColor === "B" ? [0, 2, 4, 6, 8] : [1, 3, 5, 7];
      for (const v of cands) pool.push(v);
    } else {
      // 선공: 상대 남은 흑/백 비율에 따라 가중 풀 구성
      const bW = pub.oppRemain.B;
      const wW = pub.oppRemain.W;
      for (const v of [0, 2, 4, 6, 8]) for (let k = 0; k < bW; k++) pool.push(v);
      for (const v of [1, 3, 5, 7]) for (let k = 0; k < wW; k++) pool.push(v);
      if (!pool.length) for (const v of BW_ALL) pool.push(v);
    }
    return myHand.map(tile => {
      let win = 0, draw = 0;
      for (const ov of pool) {
        if (tile > ov) win++;
        else if (tile === ov) draw++;
      }
      const n = pool.length || 1;
      return {
        tile,
        color: bwColor(tile),
        winRate: win / n,
        drawRate: draw / n,
        ev: (win + draw * 0.5) / n,
      };
    });
  }

  function aiPickBW(st, seat, tier, rng) {
    const pub = bwPublicView(st, seat);
    const evals = evalBWFromPublic(pub);
    if (!evals.length) return null;
    const r = rng || Math.random;

    if (tier === "easy") {
      return evals[Math.floor(r() * evals.length)].tile;
    }

    const opp = seat ^ 1;
    const rem = 9 - pub.round;
    const myS = pub.scores[seat], opS = pub.scores[opp];
    const mustWinNow = opS + rem <= myS + 1 ? false : (opS - myS >= rem - 1);

    // 점수 상황에 따른 효용 계산
    const scored = evals.map(e => {
      let u = e.ev * 100;
      if (!pub.isLeader && pub.leadColor) {
        // 후공: 이길 수 있는 최소 숫자(경제적 승리) 또는 가망 없을 때 최저 버리기
        if (e.winRate >= 0.78) u += 32 - e.tile * 2.4;
        else if (e.winRate >= 0.52) u += 18 - e.tile * 1.4;
        else if (e.winRate <= 0.22) u += 15 - e.tile * 2.8; // 질 거면 0,1 버리기
      } else {
        // 선공: 강패(7,8)를 아끼며 중패/블러프 적당히 섞기
        if (mustWinNow) u += e.tile * 5;
        else u += (e.tile >= 7 ? -6 : 4) + (r() - 0.5) * (tier === "normal" ? 26 : 12);
        // 초반에는 중위 패(3,4,5)나 미끼(2,3) 선호
        if (pub.round < 3 && (e.tile === 3 || e.tile === 4 || e.tile === 5)) u += 10;
      }
      if (tier === "normal") u += (r() - 0.5) * 18;
      return { ...e, u };
    }).sort((a, b) => b.u - a.u);

    if (tier === "hard") {
      // 승부 쐐기(매치포인트): 최고 확실패 선택
      if (myS - opS >= rem - 1 && myS >= opS) {
        const safest = evals.slice().sort((a, b) => b.winRate - a.winRate || b.tile - a.tile)[0];
        if (safest.winRate >= 0.75) return safest.tile;
      }
      // 상위 2개 중 확률적으로 약간 섞어 예측 불가능성 유지
      if (scored.length >= 2 && Math.abs(scored[0].u - scored[1].u) < 6 && r() < 0.35) {
        return scored[1].tile;
      }
    }
    return scored[0].tile;
  }

  function coachBW(st, seat) {
    const pub = bwPublicView(st, seat);
    if (pub.winner !== null) {
      return { oppFlow: "대국이 끝났어요.", myFlow: "결과를 확인해 보세요.", reason: "수 싸움 복기가 가장 좋아요." };
    }
    const evals = evalBWFromPublic(pub);
    const opp = seat ^ 1;
    const rem = 9 - pub.round;
    const oB = pub.oppRemain.B, oW = pub.oppRemain.W;

    let oppFlow = `상대 남은 타일: ⬛흑(짝) ${oB}장 · ⬜백(홀) ${oW}장`;
    if (!pub.isLeader && pub.leadColor) {
      oppFlow = pub.leadColor === "B"
        ? "상대가 ⬛흑(짝수: 0·2·4·6·8)을 냈어요!"
        : "상대가 ⬜백(홀수: 1·3·5·7)을 냈어요!";
    }
    if (!evals.length) {
      return {
        bestTile: null,
        oppFlow,
        myFlow: "이번 판 패를 모두 냈어요.",
        reason: "상대가 마지막 타일을 내면 최종 결과가 정해져요.",
        evals,
      };
    }

    // 추천 타일 고르기
    let best = evals.slice().sort((a, b) => b.ev - a.ev)[0];
    let modeHint = "";
    if (!pub.isLeader && pub.leadColor) {
      // 이길 확률 65% 이상 중 가장 작은 타일 (가성비 승)
      const econ = evals.filter(e => e.winRate >= 0.65).sort((a, b) => a.tile - b.tile)[0];
      if (econ) {
        best = econ;
        modeHint = `[${best.tile}]이면 ${Math.round(best.winRate * 100)}% 이상 이기면서 큰 패를 아껴요.`;
      } else {
        const dump = evals.slice().sort((a, b) => a.tile - b.tile)[0];
        if (best.winRate < 0.45 && dump) {
          best = dump;
          modeHint = `불리한 색 싸움이라 가장 작은 [${best.tile}]을 버리고 다음 판을 노리는 게 좋아요.`;
        } else {
          modeHint = `[${best.tile}]으로 승부하면 승률 ${Math.round(best.winRate * 100)}%예요.`;
        }
      }
    } else {
      // 선공
      const mid = evals.filter(e => e.tile >= 3 && e.tile <= 6).sort((a, b) => b.ev - a.ev)[0];
      if (mid && pub.round < 5 && pub.scores[seat] <= pub.scores[opp] + 1) {
        best = mid;
        modeHint = `선공에서는 중간 패 [${best.tile}]로 간을 보며 큰 패(7·8)를 지키는 편이 유리해요.`;
      } else {
        modeHint = `남은 ${rem}판 구도에서 [${best.tile}] 추천 (기대 승률 ${Math.round(best.winRate * 100)}%).`;
      }
    }

    return {
      bestTile: best ? best.tile : null,
      oppFlow,
      myFlow: best ? `추천 수: ${best.color === "B" ? "⬛" : "⬜"} [${best.tile}]` : "패 선택 대기",
      reason: modeHint,
      evals,
    };
  }

  /* ════════════════════════════════════════════════════════════════
     2. 🔷 결! 합! (Gyul! Hap!)
     - 27종 카드: 모양(세모/네모/원) × 도형색(빨/파/노) × 배경색(흑/백/회)
     - 3장의 각 속성이 모두 같거나 모두 다르면 "합(Hap)"
     - 남은 합을 모두 찾았으면 "결(Gyul)" (+3점)
     ════════════════════════════════════════════════════════════════ */
  const GH_SHAPES = ["세모", "네모", "동그라미"];
  const GH_FG = ["빨강", "파랑", "노랑"];
  const GH_BG = ["검정", "하양", "회색"];

  function cardAttrs(id) {
    return {
      id,
      s: Math.floor(id / 9),
      fg: Math.floor((id % 9) / 3),
      bg: id % 3,
    };
  }

  function isHap(a, b, c) {
    if (!a || !b || !c || a.id === b.id || b.id === c.id || a.id === c.id) return false;
    return (
      (a.s + b.s + c.s) % 3 === 0 &&
      (a.fg + b.fg + c.fg) % 3 === 0 &&
      (a.bg + b.bg + c.bg) % 3 === 0
    );
  }

  function findAllHaps(board) {
    const out = [];
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        for (let k = j + 1; k < board.length; k++) {
          if (isHap(board[i], board[j], board[k])) {
            out.push([i, j, k]);
          }
        }
      }
    }
    return out;
  }

  function newGH(opts) {
    const o = opts || {};
    const rng = o.rng || makeRng(o.seed || Date.now());
    const minHaps = o.minHaps ?? 2;
    const maxHaps = o.maxHaps ?? 5;
    const players = Math.max(1, Math.min(8, o.players || 2));
    let board = [], haps = [];
    for (let attempt = 0; attempt < 150; attempt++) {
      const deck = Array.from({ length: 27 }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      board = deck.slice(0, 9).map(cardAttrs);
      haps = findAllHaps(board);
      if (haps.length >= minHaps && haps.length <= maxHaps) break;
    }
    return {
      kind: "gh",
      board,
      haps,          // [[i,j,k], ...] sorted triples
      found: [],     // [{ triple:[i,j,k], by:seat }]
      scores: new Array(players).fill(0),
      mistakes: new Array(players).fill(0),
      gyulBy: null,
      done: false,
      winner: null,  // seat | "draw" | null
    };
  }

  const tripleKey = t => t.slice().sort((a, b) => a - b).join("-");

  function remainingHapsGH(st) {
    const used = new Set(st.found.map(f => tripleKey(f.triple)));
    return st.haps.filter(t => !used.has(tripleKey(t)));
  }

  function submitHapGH(st, seat, rawTriple) {
    if (st.done) return { ok: false, err: "라운드가 끝났어요" };
    if (!Array.isArray(rawTriple) || rawTriple.length !== 3) return { ok: false, err: "3장을 골라 주세요" };
    const t = rawTriple.slice().sort((a, b) => a - b);
    if (t[0] < 0 || t[2] >= st.board.length || t[0] === t[1] || t[1] === t[2]) {
      return { ok: false, err: "서로 다른 3장이어야 해요" };
    }
    const key = tripleKey(t);
    const valid = isHap(st.board[t[0]], st.board[t[1]], st.board[t[2]]);
    const already = st.found.some(f => tripleKey(f.triple) === key);

    if (valid && !already) {
      st.found.push({ triple: t, by: seat });
      st.scores[seat] += 1;
      return { ok: true, hit: true, delta: 1, triple: t, remaining: remainingHapsGH(st).length };
    }
    st.scores[seat] -= 1;
    st.mistakes[seat] += 1;
    return {
      ok: true,
      hit: false,
      duplicate: already,
      delta: -1,
      triple: t,
      remaining: remainingHapsGH(st).length,
    };
  }

  function callGyulGH(st, seat) {
    if (st.done) return { ok: false, err: "라운드가 끝났어요" };
    const rem = remainingHapsGH(st).length;
    if (rem === 0) {
      st.scores[seat] += 3;
      st.gyulBy = seat;
      st.done = true;
      const top = Math.max(...st.scores);
      const tops = st.scores.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
      st.winner = tops.length === 1 ? tops[0] : "draw";
      return { ok: true, success: true, delta: 3, winner: st.winner };
    }
    st.scores[seat] -= 1;
    st.mistakes[seat] += 1;
    return { ok: true, success: false, delta: -1, remaining: rem };
  }

  function coachGH(st) {
    const rem = remainingHapsGH(st);
    if (!rem.length) {
      return {
        remaining: 0,
        oppFlow: "남은 합이 0개예요!",
        myFlow: "지금 바로 '결! (🔔)'을 외쳐 +3점을 얻으세요!",
        reason: "이 판에 숨겨진 모든 합을 다 찾았어요.",
        sampleTriple: null,
      };
    }
    const t = rem[0];
    const [a, b, c] = t.map(i => st.board[i]);
    const descAttr = (name, v1, v2, v3) => (v1 === v2 && v2 === v3 ? `${name} 모두 같음` : `${name} 모두 다름`);
    const pattern = [
      descAttr("모양", a.s, b.s, c.s),
      descAttr("색", a.fg, b.fg, c.fg),
      descAttr("배경", a.bg, b.bg, c.bg),
    ].join(" · ");
    return {
      remaining: rem.length,
      oppFlow: `아직 못 찾은 '합'이 ${rem.length}개 남았어요.`,
      myFlow: `패턴 힌트: ${pattern}`,
      reason: `먼저 ${t[0] + 1}번 카드(${GH_BG[a.bg]} 바탕 ${GH_FG[a.fg]} ${GH_SHAPES[a.s]})와 짝을 맞춰 보세요.`,
      sampleTriple: t.slice(),
    };
  }

  /* ════════════════════════════════════════════════════════════════
     3. 🦁 십이장기 (Twelve Janggi, 3×4)
     - 0: 아래(초록, fwd = -1, 적진 = row 0)
     - 1: 위(빨강, fwd = +1, 적진 = row 3)
     - 말: king(왕), jang(장), sang(상), ja(자), hu(후)
     - 승리: 1) 상대 왕 잡기  2) 내 왕 적진(상대 끝줄) 입성 후 한 턴 생존
     ════════════════════════════════════════════════════════════════ */
  const DIR_ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIR_DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const DIR_ALL = DIR_ORTH.concat(DIR_DIAG);
  const P12_NAME = { king: "왕", jang: "장", sang: "상", ja: "자", hu: "후" };
  const P12_VAL = { king: 10000, hu: 340, jang: 310, sang: 270, ja: 120 };

  function new12() {
    const b = Array.from({ length: 4 }, () => [null, null, null]);
    b[0][0] = { t: "sang", s: 1 };
    b[0][1] = { t: "king", s: 1 };
    b[0][2] = { t: "jang", s: 1 };
    b[1][1] = { t: "ja", s: 1 };

    b[2][1] = { t: "ja", s: 0 };
    b[3][0] = { t: "jang", s: 0 };
    b[3][1] = { t: "king", s: 0 };
    b[3][2] = { t: "sang", s: 0 };

    return {
      kind: "12",
      board: b,
      reserves: [[], []], // captured pieces ready to drop (unpromoted type)
      turn: 0,
      moves: 0,
      pendingTry: null,   // seat whose king is in enemy camp waiting 1 surviving turn
      winner: null,
      winReason: null,    // "capture" | "try" | null
    };
  }

  function clone12(st) {
    return {
      kind: "12",
      board: st.board.map(row => row.map(c => (c ? { t: c.t, s: c.s } : null))),
      reserves: [st.reserves[0].slice(), st.reserves[1].slice()],
      turn: st.turn,
      moves: st.moves,
      pendingTry: st.pendingTry,
      winner: st.winner,
      winReason: st.winReason,
    };
  }

  const enemyRow12 = seat => (seat === 0 ? 0 : 3);

  function pieceDirs12(t, seat) {
    const fwd = seat === 0 ? -1 : 1;
    if (t === "king") return DIR_ALL;
    if (t === "jang") return DIR_ORTH;
    if (t === "sang") return DIR_DIAG;
    if (t === "ja") return [[fwd, 0]];
    if (t === "hu") return DIR_ORTH.concat([[fwd, -1], [fwd, 1]]);
    return [];
  }

  function legalMoves12(st, seat) {
    if (st.winner !== null) return [];
    const s = seat === undefined ? st.turn : seat;
    const out = [];
    // 1) 보드 위 말 이동
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const p = st.board[r][c];
        if (!p || p.s !== s) continue;
        for (const [dr, dc] of pieceDirs12(p.t, s)) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= 4 || nc < 0 || nc >= 3) continue;
          const dst = st.board[nr][nc];
          if (dst && dst.s === s) continue;
          out.push({ kind: "move", fr: r, fc: c, tr: nr, tc: nc, cap: dst ? dst.t : null });
        }
      }
    }
    // 2) 포로 내려놓기 (상대 끝줄에는 불가)
    const seenType = new Set();
    const forbidRow = enemyRow12(s);
    for (const pt of st.reserves[s]) {
      if (seenType.has(pt)) continue;
      seenType.add(pt);
      for (let r = 0; r < 4; r++) {
        if (r === forbidRow) continue;
        for (let c = 0; c < 3; c++) {
          if (!st.board[r][c]) {
            out.push({ kind: "drop", pt, tr: r, tc: c });
          }
        }
      }
    }
    return out;
  }

  function applyMove12(st, mv) {
    if (st.winner !== null) return { ok: false, err: "이미 끝난 게임이에요" };
    const s = st.turn;
    const opp = s ^ 1;
    if (mv.kind === "move") {
      const p = st.board[mv.fr]?.[mv.fc];
      if (!p || p.s !== s) return { ok: false, err: "내 말이 아니에요" };
      const legal = legalMoves12(st, s).some(
        m => m.kind === "move" && m.fr === mv.fr && m.fc === mv.fc && m.tr === mv.tr && m.tc === mv.tc
      );
      if (!legal) return { ok: false, err: "이동할 수 없는 칸이에요" };
      const dst = st.board[mv.tr][mv.tc];
      st.board[mv.fr][mv.fc] = null;

      let nextType = p.t;
      let promoted = false;
      if (p.t === "ja" && mv.tr === enemyRow12(s)) {
        nextType = "hu";
        promoted = true;
      }
      st.board[mv.tr][mv.tc] = { t: nextType, s };

      if (dst) {
        if (dst.t === "king") {
          st.winner = s;
          st.winReason = "capture";
          st.moves += 1;
          return { ok: true, captured: "king", promoted, winner: s, winReason: "capture" };
        }
        const capType = dst.t === "hu" ? "ja" : dst.t;
        st.reserves[s].push(capType);
      }

      // 이전 상대 Try가 있었는데 상대 왕을 잡지 못했으면 상대 Try 성공!
      if (st.pendingTry === opp) {
        st.winner = opp;
        st.winReason = "try";
        st.moves += 1;
        return { ok: true, captured: dst ? dst.t : null, promoted, winner: opp, winReason: "try" };
      }

      // 내 왕이 상대 진영에 들어가면 Try 대기 시작
      if (p.t === "king" && mv.tr === enemyRow12(s)) {
        st.pendingTry = s;
      }

      st.turn = opp;
      st.moves += 1;
      return { ok: true, captured: dst ? dst.t : null, promoted, winner: null };
    }

    if (mv.kind === "drop") {
      if (mv.tr === enemyRow12(s)) return { ok: false, err: "상대 끝줄엔 포로를 놓을 수 없어요" };
      if (st.board[mv.tr]?.[mv.tc]) return { ok: false, err: "빈 칸이 아니에요" };
      const ridx = st.reserves[s].indexOf(mv.pt);
      if (ridx < 0) return { ok: false, err: "해당 포로가 없어요" };
      st.reserves[s].splice(ridx, 1);
      st.board[mv.tr][mv.tc] = { t: mv.pt, s };

      if (st.pendingTry === opp) {
        st.winner = opp;
        st.winReason = "try";
        st.moves += 1;
        return { ok: true, dropped: mv.pt, winner: opp, winReason: "try" };
      }

      st.turn = opp;
      st.moves += 1;
      return { ok: true, dropped: mv.pt, winner: null };
    }

    return { ok: false, err: "잘못된 수예요" };
  }

  function eval12(st, perspective) {
    if (st.winner !== null) {
      return st.winner === perspective ? 90000 - st.moves : -90000 + st.moves;
    }
    let score = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const p = st.board[r][c];
        if (!p) continue;
        let v = P12_VAL[p.t] || 0;
        // 전진 보너스 (왕/자 전진 우대)
        const adv = p.s === 0 ? (3 - r) : r;
        if (p.t === "king") v += adv * 18;
        else if (p.t === "ja") v += adv * 16;
        else v += adv * 6;
        if (c === 1) v += 8;
        score += p.s === perspective ? v : -v;
      }
    }
    for (let s = 0; s < 2; s++) {
      let rv = 0;
      for (const pt of st.reserves[s]) rv += Math.round((P12_VAL[pt] || 100) * 0.85);
      score += s === perspective ? rv : -rv;
    }
    if (st.pendingTry === perspective) score += 260;
    else if (st.pendingTry === (perspective ^ 1)) score -= 260;
    return score;
  }

  function orderMoves12(st, moves) {
    return moves.slice().sort((a, b) => {
      const sa = (a.cap === "king" ? 10000 : a.cap ? P12_VAL[a.cap] : 0) + (a.kind === "move" ? 10 : 0);
      const sb = (b.cap === "king" ? 10000 : b.cap ? P12_VAL[b.cap] : 0) + (b.kind === "move" ? 10 : 0);
      return sb - sa;
    });
  }

  function search12(st, depth, alpha, beta, perspective) {
    if (st.winner !== null || depth <= 0) {
      return { score: eval12(st, perspective), move: null };
    }
    const moves = orderMoves12(st, legalMoves12(st, st.turn));
    if (!moves.length) return { score: -80000, move: null };

    const maximizing = st.turn === perspective;
    let bestMove = moves[0];
    if (maximizing) {
      let best = -Infinity;
      for (const mv of moves) {
        const next = clone12(st);
        applyMove12(next, mv);
        const val = search12(next, depth - 1, alpha, beta, perspective).score;
        if (val > best) { best = val; bestMove = mv; }
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return { score: best, move: bestMove };
    } else {
      let best = Infinity;
      for (const mv of moves) {
        const next = clone12(st);
        applyMove12(next, mv);
        const val = search12(next, depth - 1, alpha, beta, perspective).score;
        if (val < best) { best = val; bestMove = mv; }
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return { score: best, move: bestMove };
    }
  }

  function aiPick12(st, seat, tier, rng) {
    const r = rng || Math.random;
    const moves = legalMoves12(st, seat);
    if (!moves.length) return null;
    // 즉승 수(상대 왕 포획) 우선
    const kill = moves.find(m => m.cap === "king");
    if (kill && tier !== "easy") return kill;

    if (tier === "easy") {
      if (kill && r() < 0.7) return kill;
      const top = search12(st, 2, -Infinity, Infinity, seat);
      if (r() < 0.55 && top.move) return top.move;
      return moves[Math.floor(r() * moves.length)];
    }

    const depth = tier === "hard" ? 5 : 3;
    const res = search12(st, depth, -Infinity, Infinity, seat);
    return res.move || moves[0];
  }

  function describeMove12(st, mv) {
    if (!mv) return "";
    const sq = (r, c) => `${"ABC"[c]}${4 - r}`;
    if (mv.kind === "drop") return `포로 [${P12_NAME[mv.pt]}] → ${sq(mv.tr, mv.tc)} 배치`;
    const p = st.board[mv.fr]?.[mv.fc];
    const name = p ? P12_NAME[p.t] : "말";
    return `${name} ${sq(mv.fr, mv.fc)} → ${sq(mv.tr, mv.tc)}${mv.cap ? ` (${P12_NAME[mv.cap]} 잡기)` : ""}`;
  }

  function coach12(st, seat) {
    if (st.winner !== null) {
      return { oppFlow: "승부가 났어요.", myFlow: "다음 판에 새 전술을 시험해 보세요.", reason: "포로 활용과 왕 길목 차단이 핵심이에요." };
    }
    const opp = seat ^ 1;
    // 상대 위협 탐지 (상대 차례로 가정해 왕 잡기 수 확인)
    const probe = clone12(st);
    probe.turn = opp;
    const oppThreat = legalMoves12(probe, opp).find(m => m.cap === "king");
    let oppFlow = "상대가 진형을 다지며 빈틈을 노리고 있어요.";
    if (st.pendingTry === opp) oppFlow = "🚨 지금 상대 왕을 잡지 못하면 적진 입성(Try)으로 바로 패배해요!";
    else if (oppThreat) oppFlow = `⚠️ 상대의 ${describeMove12(probe, oppThreat)} 왕 위협이 있어요!`;
    else if (st.reserves[opp].length) oppFlow = `상대가 포로(${st.reserves[opp].map(t => P12_NAME[t]).join("·")}) 기습 배치를 노려요.`;

    const res = search12(st, 4, -Infinity, Infinity, seat);
    const mv = res.move;
    let reason = "중심(2~3열)을 장악하고 포로를 살려 두는 수예요.";
    if (mv) {
      if (mv.cap === "king") reason = "상대 왕을 바로 잡는 결정타예요!";
      else if (mv.kind === "move" && st.board[mv.fr]?.[mv.fc]?.t === "king" && mv.tr === enemyRow12(seat)) reason = "상대 끝줄에 왕이 들어가 한 턴만 버티면 Try 승리예요!";
      else if (mv.kind === "move" && st.board[mv.fr]?.[mv.fc]?.t === "ja" && mv.tr === enemyRow12(seat)) reason = "'자'가 상대 끝줄에 들어가 강한 '후(6방향)'로 승급해요!";
      else if (mv.cap) reason = `상대 [${P12_NAME[mv.cap]}]을 잡아 내 포로로 만들 수 있어요.`;
      else if (mv.kind === "drop") reason = "잡아 둔 포로를 요충지에 내려 흐름을 뒤집어요.";
    }
    return {
      bestMove: mv,
      oppFlow,
      myFlow: mv ? `추천 수: ${describeMove12(st, mv)}` : "둘 수 있는 수가 없어요",
      reason,
      evalScore: res.score,
    };
  }

  const API = {
    makeRng,
    // 흑과 백
    bwColor,
    newBW,
    bwPublicView,
    playBW,
    evalBWFromPublic,
    aiPickBW,
    coachBW,
    // 결! 합!
    GH_SHAPES,
    GH_FG,
    GH_BG,
    cardAttrs,
    isHap,
    findAllHaps,
    newGH,
    remainingHapsGH,
    submitHapGH,
    callGyulGH,
    coachGH,
    // 십이장기
    P12_NAME,
    new12,
    clone12,
    legalMoves12,
    applyMove12,
    eval12,
    aiPick12,
    describeMove12,
    coach12,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.GeniusCore = API;
})(typeof window !== "undefined" ? window : globalThis);
