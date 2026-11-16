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
      seat,
      round: st.round,
      myHand: st.hands[seat].slice(),
      scores: st.scores.slice(),
      leader: st.leader,
      turn: st.turn,
      isMyTurn: st.winner === null && st.turn === seat,
      isLeader: st.leader === seat,
      leadColor: st.leadColor,
      oppRemain: { B: Math.max(0, oppB), W: Math.max(0, oppW), total: Math.max(0, oppB + oppW) },
      // 공정 정보 분리: 진행 중에는 본인(seat) 숫자만 포함, 대국 종료 후에만 복기용 oppTile 공개
      history: st.history.map(h => ({
        round: h.round,
        leader: h.leader,
        c0: h.c0,
        c1: h.c1,
        winner: h.winner,
        myTile: seat === 0 ? h.t0 : h.t1,
        oppTile: st.winner !== null ? (seat === 0 ? h.t1 : h.t0) : null,
      })),
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
    const t0 = leadSeat === 0 ? leadTile : followTile;
    const t1 = leadSeat === 1 ? leadTile : followTile;
    st.history.push({ round: st.round, leader: leadSeat, c0, c1, t0, t1, winner: roundWinner });

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

  // 공개 기록(색 + 승패 + 내 과거 제출 숫자)으로 상대 남은 패·이번 판 제출 패의 정확한 베이지안 사후 확률 계산
  const BW_BY_COL = { B: [0, 2, 4, 6, 8], W: [1, 3, 5, 7] };
  function inferColorDist(cards, rounds, oppSeat, needLead) {
    const remW = Object.fromEntries(cards.map(c => [c, 0]));
    const leadW = Object.fromEntries(cards.map(c => [c, 0]));
    let ways = 0;
    const used = new Set();
    const matchRound = (ov, r) => {
      if (r.myTile == null) return true;
      if (r.winner === "draw") return ov === r.myTile;
      if (r.winner === oppSeat) return ov > r.myTile;
      return ov < r.myTile;
    };
    function dfs(idx) {
      if (idx === rounds.length) {
        const left = cards.filter(c => !used.has(c));
        if (needLead) {
          for (const lv of left) {
            ways++;
            leadW[lv]++;
            for (const rv of left) if (rv !== lv) remW[rv]++;
          }
        } else {
          ways++;
          for (const rv of left) remW[rv]++;
        }
        return;
      }
      const r = rounds[idx];
      for (const c of cards) {
        if (used.has(c) || !matchRound(c, r)) continue;
        used.add(c);
        dfs(idx + 1);
        used.delete(c);
      }
    }
    dfs(0);
    if (!ways) {
      // 예외 폴백 (비정상 커스텀 기록 등)
      for (const c of cards) { remW[c] = 1; leadW[c] = needLead ? 1 : 0; }
    }
    return { remW, leadW };
  }

  function inferOppBW(pub) {
    const seat = pub.seat != null ? pub.seat : (pub.isLeader ? pub.leader : pub.turn);
    const opp = seat ^ 1;
    const roundsB = [], roundsW = [];
    for (const h of (pub.history || [])) {
      const oc = opp === 0 ? h.c0 : h.c1;
      const rec = { myTile: h.myTile, winner: h.winner };
      if (oc === "B") roundsB.push(rec); else roundsW.push(rec);
    }
    const isLeadB = !pub.isLeader && pub.leadColor === "B";
    const isLeadW = !pub.isLeader && pub.leadColor === "W";
    const dB = inferColorDist(BW_BY_COL.B, roundsB, opp, isLeadB);
    const dW = inferColorDist(BW_BY_COL.W, roundsW, opp, isLeadW);
    const remW = { ...dB.remW, ...dW.remW };
    const leadW = isLeadB ? dB.leadW : isLeadW ? dW.leadW : null;
    const bCands = BW_BY_COL.B.filter(c => remW[c] > 0);
    const wCands = BW_BY_COL.W.filter(c => remW[c] > 0);
    const leadCands = leadW ? (isLeadB ? BW_BY_COL.B : BW_BY_COL.W).filter(c => leadW[c] > 0) : [];
    const allRem = [...bCands, ...wCands].sort((a, b) => a - b);
    return { seat, opp, remW, leadW, bCands, wCands, leadCands, allRem };
  }

  // 공개 정보만으로 각 타일의 승률 추정 (블라인드 공정성 보장 + 베이지안 추론 반영)
  function evalBWFromPublic(pub) {
    const myHand = pub.myHand;
    if (!myHand.length) return [];
    const inf = inferOppBW(pub);
    let pairs;
    if (!pub.isLeader && pub.leadColor && inf.leadW) {
      pairs = Object.entries(inf.leadW).map(([k, w]) => [Number(k), w]).filter(([, w]) => w > 0);
    } else {
      pairs = Object.entries(inf.remW).map(([k, w]) => [Number(k), w]).filter(([, w]) => w > 0);
    }
    const totalW = pairs.reduce((s, [, w]) => s + w, 0) || 1;
    return myHand.map(tile => {
      let winW = 0, drawW = 0;
      for (const [ov, w] of pairs) {
        if (tile > ov) winW += w;
        else if (tile === ov) drawW += w;
      }
      return {
        tile,
        color: bwColor(tile),
        winRate: winW / totalW,
        drawRate: drawW / totalW,
        ev: (winW + drawW * 0.5) / totalW,
      };
    });
  }

  // 선공 전술 점수 (후공은 색을 본 뒤 흑·백 무관하게 최선 응수할 수 있음을 반영)
  function scoreLeadBW(evals, inf, rem, desperate) {
    const strongCards = evals.filter(e => e.tile >= 7).map(e => e.tile);
    const minOpp = inf.allRem.length ? inf.allRem[0] : 0;
    const totalW = Object.values(inf.remW || {}).reduce((s, w) => s + w, 0) || 1;
    const lowDumpShare = inf.allRem.filter(v => v <= 2).reduce((s, v) => s + (inf.remW[v] || 0), 0) / totalW;

    return evals.map(e => {
      // 같은 색 중 내가 실제로 들고 있는 평균치로 상대의 색 기반 추측 폭 가늠
      const colHand = evals.filter(x => x.color === e.color).map(x => x.tile);
      const colMax = colHand.length ? Math.max(...colHand) : e.tile;
      const oppBeatsAll = inf.allRem.filter(v => v > e.tile).length;

      let s = e.ev * 100;
      if (!desperate) {
        // 선공에서 큰 패(7·8)를 냈는데 상대에게 버릴 저패(0~2)가 많으면 1점과 큰 패를 맞바꾸는 손해 발생
        if (e.tile >= 7) {
          s -= (rem >= 5 ? 24 : 12) + lowDumpShare * 14 + Math.max(0, e.tile - minOpp - 4) * 1.5;
        } else if (e.tile >= 3 && e.tile <= 6) {
          // 중패(3~6)는 상대 버림패를 잡아내면서도 큰 패(7·8)를 보존
          s += 14 - Math.abs(e.tile - 4.5) * 1.5;
        } else {
          // 저패(0~2) 미끼: 내가 해당 색에서 7·8을 쥐고 있어 상대가 높은 색으로 착각할수록 블러핑 효율 상승
          const colorBait = strongCards.length && colMax >= 7 ? 10 : (strongCards.length ? 5 : -5);
          s += colorBait + e.tile * 2;
        }
      } else if (e.tile >= 6) {
        s += 10;
      }
      // 후공은 다른 색으로도 받아칠 수 있으므로 전체 남은 후보(allRem) 기준 우위 반영
      if (oppBeatsAll === 0 && inf.allRem.length) s += 16;
      else if (oppBeatsAll <= 1 && inf.allRem.length >= 3) s += 8;
      return { e, s };
    }).sort((a, b) => b.s - a.s || a.e.tile - b.e.tile);
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
    const matchPoint = (myS + 1 > opS + (rem - 1));
    const desperate = (opS - myS >= rem - 1 && rem <= 5);

    if (tier === "hard") {
      const inf = inferOppBW(pub);
      const byEv = evals.slice().sort((a, b) => b.ev - a.ev || b.winRate - a.winRate || a.tile - b.tile);
      const byWin = evals.slice().sort((a, b) => b.winRate - a.winRate || b.drawRate - a.drawRate || a.tile - b.tile);
      const byLow = evals.slice().sort((a, b) => a.tile - b.tile);

      if (!pub.isLeader && pub.leadColor) {
        const sureWin = byLow.find(e => e.winRate >= 0.999);
        if (sureWin) return sureWin.tile;
        if (matchPoint || rem === 1) return byWin[0].tile;
        if (desperate) return byEv[0].tile;
        const topW = byWin[0].winRate;
        if (topW >= 0.62) {
          return evals.filter(e => e.winRate >= Math.max(0.62, topW - 0.12)).sort((a, b) => a.tile - b.tile)[0].tile;
        }
        if (byEv[0].ev < 0.43 && evals.length > 2) return byLow[0].tile;
        return byEv[0].tile;
      }

      const oppMax = inf.allRem.length ? inf.allRem[inf.allRem.length - 1] : -1;
      const sureLead = oppMax >= 0 ? byLow.find(e => e.tile > oppMax) : null;
      if (sureLead) return sureLead.tile;
      if (matchPoint || rem <= 2) return byWin[0].tile;

      const ranked = scoreLeadBW(evals, inf, rem, desperate);
      if (ranked.length >= 2 && Math.abs(ranked[0].s - ranked[1].s) < 4 && r() < 0.25) {
        return ranked[1].e.tile;
      }
      return ranked[0].e.tile;
    }

    // normal 난이도: 베이지안 확률 + 적당한 인간적 변동성
    const mustWinNow = opS + rem <= myS + 1 ? false : (opS - myS >= rem - 1);
    const scored = evals.map(e => {
      let u = e.ev * 100;
      if (!pub.isLeader && pub.leadColor) {
        if (e.winRate >= 0.78) u += 32 - e.tile * 2.4;
        else if (e.winRate >= 0.52) u += 18 - e.tile * 1.4;
        else if (e.winRate <= 0.22) u += 15 - e.tile * 2.8;
      } else {
        if (mustWinNow) u += e.tile * 5;
        else u += (e.tile >= 7 ? -6 : 4) + (r() - 0.5) * 26;
        if (pub.round < 3 && (e.tile === 3 || e.tile === 4 || e.tile === 5)) u += 10;
      }
      u += (r() - 0.5) * 18;
      return { ...e, u };
    }).sort((a, b) => b.u - a.u);
    return scored[0].tile;
  }

  function coachBWFromPublic(pub) {
    if (!pub || pub.winner !== null) {
      return { bestTile: null, oppFlow: "대국이 끝났어요.", myFlow: "결과를 확인해 보세요.", reason: "수 싸움 복기가 가장 좋아요." };
    }
    const evals = evalBWFromPublic(pub);
    const inf = inferOppBW(pub);
    const seat = inf.seat, opp = inf.opp;
    const rem = 9 - pub.round;
    const oB = pub.oppRemain.B, oW = pub.oppRemain.W;
    const myS = pub.scores[seat], opS = pub.scores[opp];
    const diff = myS - opS;
    const matchPoint = (myS + 1 > opS + (rem - 1));
    const desperate = (opS - myS >= rem - 1 && rem <= 5);

    let oppFlow = `상대 남은 패: ⬛흑 ${oB}장 · ⬜백 ${oW}장`;
    if (inf.bCands.length < 5 || inf.wCands.length < 4) {
      const bTxt = inf.bCands.length ? `[${inf.bCands.join("·")}]` : "없음";
      const wTxt = inf.wCands.length ? `[${inf.wCands.join("·")}]` : "없음";
      oppFlow += ` (후보 ⬛${bTxt} ⬜${wTxt})`;
    }
    if (!pub.isLeader && pub.leadColor) {
      const colName = pub.leadColor === "B" ? "⬛흑(짝수)" : "⬜백(홀수)";
      if (inf.leadCands.length === 1) oppFlow = `상대가 낸 ${colName}은 추론상 [${inf.leadCands[0]}] 확정이에요!`;
      else oppFlow = `상대가 낸 ${colName} 후보: [${inf.leadCands.join("·")}]`;
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

    const byEv = evals.slice().sort((a, b) => b.ev - a.ev || b.winRate - a.winRate || a.tile - b.tile);
    const byWin = evals.slice().sort((a, b) => b.winRate - a.winRate || b.drawRate - a.drawRate || a.tile - b.tile);
    const byLow = evals.slice().sort((a, b) => a.tile - b.tile);
    let best = byEv[0];
    let modeHint = "";
    const pct = v => Math.round(v * 100);

    if (!pub.isLeader && pub.leadColor) {
      const sureWin = byLow.find(e => e.winRate >= 0.999);
      if (sureWin) {
        best = sureWin;
        modeHint = `후보 [${inf.leadCands.join("·")}] 상대로 [${best.tile}]이면 100% 확실히 이기면서 큰 패를 아껴요.`;
      } else if (matchPoint || rem === 1) {
        best = byWin[0];
        modeHint = rem === 1
          ? `마지막 라운드예요! 아낄 필요 없이 승률 ${pct(best.winRate)}%인 [${best.tile}]으로 승부하세요.`
          : `이번 판을 잡으면 승리가 확정돼요! 가장 확실한 [${best.tile}](승률 ${pct(best.winRate)}%)을 내세요.`;
      } else if (desperate) {
        best = byEv[0];
        modeHint = `점수를 따라잡아야 해 아낄 여유가 없어요. 기댓값이 가장 높은 [${best.tile}](승률 ${pct(best.winRate)}%)을 추천해요.`;
      } else {
        const topW = byWin[0].winRate;
        if (topW >= 0.60) {
          best = evals.filter(e => e.winRate >= Math.max(0.60, topW - 0.14)).sort((a, b) => a.tile - b.tile)[0] || byWin[0];
          modeHint = `상대 후보 [${inf.leadCands.join("·")}] 상대로 [${best.tile}]을 쓰면 ${pct(best.winRate)}% 확률로 이기면서 더 큰 패를 남길 수 있어요.`;
        } else if (byEv[0].ev < 0.44 && evals.length > 2) {
          best = byLow[0];
          modeHint = `상대 패가 유리한 색 싸움이라(최고 ${pct(byEv[0].ev)}%) 가장 작은 [${best.tile}]을 버리고 큰 패를 아끼는 게 좋아요.`;
        } else {
          best = byEv[0];
          modeHint = `팽팽한 승부예요! 후보 [${inf.leadCands.join("·")}] 대비 [${best.tile}]의 기대 승률이 ${pct(best.ev)}%로 가장 높아요.`;
        }
      }
    } else {
      const oppMax = inf.allRem.length ? inf.allRem[inf.allRem.length - 1] : -1;
      const sureLead = oppMax >= 0 ? byLow.find(e => e.tile > oppMax) : null;
      if (sureLead) {
        best = sureLead;
        modeHint = `추론상 상대 최대 패가 [${oppMax}] 이하라 선공인데도 [${best.tile}]을 내면 100% 필승이에요!`;
      } else if (matchPoint || rem <= 2) {
        best = byWin[0];
        modeHint = rem <= 2
          ? `종반 승부처예요! 아끼지 말고 승률이 가장 높은 [${best.tile}](${pct(best.winRate)}%)로 밀어붙이세요.`
          : `1점만 추가하면 우승 확정이에요! [${best.tile}](승률 ${pct(best.winRate)}%)로 바로 끝낼 수 있어요.`;
      } else {
        const strongCards = evals.filter(e => e.tile >= 7).map(e => e.tile);
        const scoredLead = scoreLeadBW(evals, inf, rem, desperate);
        best = scoredLead[0].e;
        if (best.tile <= 2 && strongCards.length) {
          modeHint = `선공은 상대가 색을 보고 아무 색으로나 응수할 수 있어요. [${best.tile}] 미끼로 상대 중·강패를 빼내면서 핵심 패(${strongCards.join("·")})를 지키는 전략이 좋아요.`;
        } else if (best.tile >= 7) {
          modeHint = `점수 싸움상 선공에서도 강한 [${best.tile}](기대 승률 ${pct(best.ev)}%)로 정면 승부할 타이밍이에요.`;
        } else {
          modeHint = `선공에선 [${best.tile}]으로 중반 압박을 걸면서 큰 패(7·8)는 후공 카운터로 아끼는 편이 유리해요 (기대 승률 ${pct(best.ev)}%).`;
        }
      }
    }

    return {
      bestTile: best ? best.tile : null,
      oppFlow,
      myFlow: best ? `추천 수: ${best.color === "B" ? "⬛" : "⬜"} [${best.tile}]` : "패 선택 대기",
      reason: modeHint,
      evals,
      inf: {
        bCands: inf.bCands,
        wCands: inf.wCands,
        leadCands: inf.leadCands,
        allRem: inf.allRem,
      },
    };
  }

  function coachBW(st, seat) {
    return coachBWFromPublic(bwPublicView(st, seat));
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
    inferOppBW,
    aiPickBW,
    coachBW,
    coachBWFromPublic,
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
