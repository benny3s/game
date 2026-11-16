// 베니 지니어스 — 흑과 백 · 결! 합! · 십이장기 통합 UI · 온라인 아레나 · AI 선생님
(() => {
  "use strict";
  const G = window.GeniusCore;
  const $ = id => document.getElementById(id);

  const GAME_META = {
    bw: {
      title: "⬛⬜ 흑과 백",
      sub: "심리 · 블러핑",
      brief: "<b>규칙 요약:</b> 0~8 타일 중 선공이 낸 패의 <b>색(흑=짝수, 백=홀수)만</b> 공개돼요. 큰 숫자가 +1점! 9라운드 동안 상대 남은 흑·백 개수를 읽고 큰 패(7·8)를 언제 쓸지 심리전을 벌여요.",
      watchMs: 950,
    },
    gh: {
      title: "🔷 결! 합!",
      sub: "도형 · 순발력",
      brief: "<b>규칙 요약:</b> 9장의 카드 중 모양·도형색·배경색 세 가지가 각각 <b>전부 같거나 전부 다른</b> 3장을 찾아 <b>합!(+1점)</b>을 외쳐요. 숨은 합이 하나도 안 남았을 때 <b>결!(+3점)</b>을 누르면 승리!",
      watchMs: 1100,
    },
    12: {
      title: "🦁 십이장기",
      sub: "3×4 전략 보드",
      brief: "<b>규칙 요약:</b> 잡은 상대 말은 내 <b>포로</b>가 되어 빈 칸에 다시 내려놓을 수 있어요. 상대 왕을 잡거나 내 왕이 상대 맨 끝 줄에 들어가 한 턴을 버티면(<b>Try</b>) 승리!",
      watchMs: 950,
    },
  };

  let gameKind = Cozy.store("genius.kind", "bw");
  let playMode = "solo"; // "solo" | "friend" | "watch"
  let aiTier = Cozy.store("genius.tier", "normal");
  let watchMs = 800;

  let seats = [
    { kind: "human", name: "나", emoji: "🙂" },
    { kind: "ai", tier: "normal", name: "🧠 보통 AI", emoji: "🤖" },
  ];
  let mySeat = 0;

  // 게임 상태
  let st = null;
  let bwSelectedTile = null;
  let bwBusy = false;
  let ghSelected = [];
  let ghHintHighlight = [];
  let m12Sel = null;       // { kind:"move", fr, fc } | { kind:"drop", pt }
  let aiTimer = null;
  let resultRecorded = false;
  let matchId = 0;

  // 온라인 아레나
  let arena = null;
  let arenaOffs = [];
  let isHost = false;
  let myUid = null;
  let roomKindMode = "bw";
  let mixQueue = ["bw", "gh", "12"];
  let mixIndex = 0;
  let remoteViewBW = null;

  const coach = window.CoachPanel
    ? CoachPanel.create({ game: "genius", title: "AI 선생님", bottom: 235, icon: "🧑‍🏫", startHidden: true })
    : null;
  if (coach) {
    if ($("coachSlot") && coach.el) $("coachSlot").appendChild(coach.el);
    CoachPanel.button($("coachBtn"), coach);
    coach.onChange(() => { if (st && !$("play").hidden) render(); });
  }

  function stopTimers() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
  }

  function sfx(name, opt) {
    try { if (window.Cozy && Cozy.sfx) Cozy.sfx.play(name, opt); } catch (e) {}
  }

  function svgGH(card) {
    const bgs = ["#131823", "#f1f5f9", "#6b7280"];
    const fgs = ["#ef4444", "#3b82f6", "#facc15"];
    const fill = fgs[card.fg], b = bgs[card.bg];
    let shape = "";
    if (card.s === 0) shape = `<polygon points="32,11 53,51 11,51" fill="${fill}" stroke="#0b0f19" stroke-width="3" stroke-linejoin="round"/>`;
    else if (card.s === 1) shape = `<rect x="13" y="13" width="38" height="38" rx="6" fill="${fill}" stroke="#0b0f19" stroke-width="3"/>`;
    else shape = `<circle cx="32" cy="32" r="20" fill="${fill}" stroke="#0b0f19" stroke-width="3"/>`;
    return `<svg viewBox="0 0 64 64" width="100%" height="100%" style="display:block;border-radius:10px;background:${b};border:1.5px solid rgba(255,255,255,0.18)">${shape}</svg>`;
  }

  // ── 홈 UI 갱신 ──
  function selectKind(k) {
    if (!GAME_META[k]) return;
    gameKind = k;
    Cozy.save("genius.kind", k);
    document.querySelectorAll("#gameCards .g-card").forEach(btn => {
      btn.setAttribute("aria-pressed", btn.dataset.kind === k ? "true" : "false");
    });
    $("gameBrief").innerHTML = GAME_META[k].brief;
  }

  function setModeTab(m) {
    playMode = m === "friend" || m === "watch" ? m : "solo";
    $("tabSolo").setAttribute("aria-pressed", playMode === "solo" ? "true" : "false");
    $("tabFriend").setAttribute("aria-pressed", playMode === "friend" ? "true" : "false");
    $("tabWatch").setAttribute("aria-pressed", playMode === "watch" ? "true" : "false");

    $("soloBox").hidden = (playMode === "watch" || playMode === "friend");
    $("aiOpts").hidden = (playMode !== "solo");
    $("watchBox").hidden = (playMode !== "watch");
    $("startBtn").textContent = playMode === "friend" ? "방 만들기 / 들어가기" : "시작!";
  }

  function buildTiers() {
    const items = [
      { id: "easy", emoji: "🐣", name: "초급", desc: "규칙 익히기 좋아요" },
      { id: "normal", emoji: "🧠", name: "중급", desc: "눈치·수 싸움 대결" },
      { id: "hard", emoji: "👑", name: "고수", desc: "지니어스급 두뇌" },
    ];
    Cozy.tierCards($("tiers"), items, id => {
      aiTier = id;
      Cozy.save("genius.tier", id);
    }, { selected: aiTier });
  }

  // ── 화면 전환 ──
  function showPlay() {
    document.querySelector(".wrap").hidden = true;
    $("play").hidden = false;
  }

  function backToHome(confirmMsg) {
    if (confirmMsg && st && !isFinished()) {
      if (!confirm(confirmMsg)) return;
    }
    matchId++;
    stopTimers();
    if (coach) coach.hide();
    arenaOffs.forEach(f => { try { f(); } catch (e) {} });
    arenaOffs = [];
    if (arena) { try { arena.leave(); } catch (e) {} arena = null; }
    $("play").hidden = true;
    document.querySelector(".wrap").hidden = false;
  }

  function isFinished() {
    if (!st) return true;
    if (st.kind === "bw" && playMode === "friend" && !isHost && remoteViewBW) return remoteViewBW.winner !== null;
    return st.kind === "gh" ? st.done : st.winner !== null;
  }

  function coachBWPublic(pub) {
    return G.coachBWFromPublic(pub);
  }

  // ── AI 선생님 분석 ──
  function updateCoach() {
    if (!coach || !st) return;
    let html = "";
    const viewSeat = playMode === "watch" ? 0 : mySeat;
    if ((st.kind === "bw" || st.kind === "12") && playMode === "friend" && viewSeat >= 2) {
      coach.set("<p><b>관전 중:</b> 두 친구의 대결을 구경하고 있어요.</p>");
      return;
    }
    if (st.kind === "bw") {
      const c = (playMode === "friend" && !isHost && remoteViewBW)
        ? coachBWPublic(remoteViewBW)
        : G.coachBW(st, viewSeat);
      html = `<p><b>상대 흐름:</b> ${c.oppFlow}</p><p><b>내 최선:</b> ${c.myFlow}</p><p class="coach-why">💡 ${c.reason}</p>`;
    } else if (st.kind === "gh") {
      const c = (playMode === "friend" && !isHost)
        ? {
            oppFlow: `발견된 합 ${st.found.length}개 · 남은 합 ${Math.max(0, (st.totalHaps || 0) - st.found.length)}개`,
            myFlow: (st.totalHaps || 0) <= st.found.length ? "지금 '결! (+3점)' 타이밍!" : "모양·도형색·배경색이 전부 같거나 전부 다른 3장을 찾아요.",
            reason: "친구들과 같은 보드를 실시간으로 겨루고 있어요!",
          }
        : G.coachGH(st);
      html = `<p><b>판 현황:</b> ${c.oppFlow}</p><p><b>공략법:</b> ${c.myFlow}</p><p class="coach-why">💡 ${c.reason}</p>`;
      if (c.sampleTriple && playMode !== "friend") {
        html += `<div style="margin-top:6px"><button type="button" class="btn" id="coachShowCell" style="padding:5px 10px;font-size:12px">✨ 첫 번째 카드 위치 힌트</button></div>`;
      }
    } else if (st.kind === "12") {
      const c = G.coach12(st, viewSeat);
      html = `<p><b>상대 위협:</b> ${c.oppFlow}</p><p><b>추천 수:</b> ${c.myFlow}</p><p class="coach-why">💡 ${c.reason}</p>`;
    }
    coach.set(html);
    const hintBtn = document.getElementById("coachShowCell");
    if (hintBtn && st.kind === "gh" && playMode !== "friend") {
      hintBtn.onclick = () => {
        const c = G.coachGH(st);
        ghHintHighlight = c.sampleTriple ? [c.sampleTriple[0]] : [];
        sfx("pop");
        render();
      };
    }
  }

  // ── 랭킹 저장 (1회) ──
  function maybeRecordRank(winner) {
    if (resultRecorded || playMode === "watch" || !window.GRank || !st) return;
    if (playMode !== "solo" && playMode !== "friend") return;
    if ((st.kind === "bw" || st.kind === "12") && mySeat >= 2) return; // 관전자는 랭킹 미집계
    resultRecorded = true;
    const sc = (st.kind === "bw" && playMode === "friend" && !isHost && remoteViewBW) ? remoteViewBW.scores : st.scores;
    const myScore = st.kind === "gh" ? sc[mySeat] : sc ? sc[mySeat] : (winner === mySeat ? 1 : 0);
    const res = winner === mySeat ? "win" : (winner === "draw" ? "draw" : "loss");
    GRank.result("genius", {
      mode: playMode === "friend" ? "friend" : "ai",
      res,
      beat: playMode === "solo" ? aiTier : null,
      score: myScore,
      tier: aiTier,
      opp: seats.find((_, i) => i !== mySeat)?.name || "상대",
    });
  }

  function renderScores() {
    const bar = $("scoreBar");
    bar.innerHTML = "";
    const curTurn = st.kind === "gh"
      ? null
      : (st.kind === "bw" && playMode === "friend" && !isHost && remoteViewBW) ? remoteViewBW.turn : st.turn;
    const bwScores = (st.kind === "bw" && playMode === "friend" && !isHost && remoteViewBW) ? remoteViewBW.scores : st.scores;
    seats.forEach((p, i) => {
      const chip = document.createElement("div");
      chip.className = "sc-chip" + (curTurn === i && !isFinished() ? " active" : "");
      const pt = st.kind === "gh"
        ? (st.scores[i] || 0) + "점"
        : st.kind === "bw"
          ? ((bwScores && bwScores[i]) || 0) + "승"
          : (i === 0 ? "🟢 아랫진영" : "🔴 윗진영");
      chip.innerHTML = `<span class="nm">${Cozy.esc(p.emoji || "🙂")} ${Cozy.esc(p.name)}</span><span class="pts">${pt}</span>`;
      bar.appendChild(chip);
    });
  }

  // ════════════════════════════════════════════════
  //  1. 흑과 백 (BW) 렌더링 & 인터랙션
  // ════════════════════════════════════════════════
  function getBWViewSeat() {
    if (playMode === "friend" && !isHost) return Math.min(1, mySeat);
    return mySeat;
  }

  function renderBW() {
    const stage = $("stage");
    const viewSeat = getBWViewSeat();
    const pub = (playMode === "friend" && !isHost && remoteViewBW) ? remoteViewBW : G.bwPublicView(st, viewSeat);
    const isHumanTurn = pub.winner === null && pub.turn === viewSeat && seats[viewSeat]?.kind === "human" && playMode !== "watch" && !(playMode === "friend" && mySeat >= 2);
    $("playTitle").textContent = "⬛⬜ 흑과 백";
    $("playSub").textContent = pub.winner !== null ? "경기 종료" : `${Math.min(9, pub.round + 1)} / 9 라운드`;

    const c = (coach && coach.visible && mySeat <= 1)
      ? ((playMode === "friend" && !isHost && remoteViewBW) ? coachBWPublic(remoteViewBW) : G.coachBW(st, viewSeat))
      : null;
    const histHtml = Array.from({ length: 9 }, (_, r) => {
      const h = pub.history[r];
      const cur = r === pub.round && pub.winner === null;
      let mark = "·", cls = "";
      if (h) {
        if (h.winner === "draw") { mark = "무"; cls = "dr"; }
        else if (h.winner === viewSeat) { mark = "승"; cls = "w0"; }
        else { mark = "패"; cls = "w1"; }
      }
      const myC = h ? (viewSeat === 0 ? h.c0 : h.c1) : "none";
      const opC = h ? (viewSeat === 0 ? h.c1 : h.c0) : "none";
      return `<div class="bw-rd ${cur ? "cur" : ""}"><span style="color:var(--g-muted)">${r + 1}</span><span class="bw-dot ${opC}" title="상대 색"></span><span class="bw-dot ${myC}" title="내 색"></span><span class="bw-res ${cls}">${mark}</span></div>`;
    }).join("");

    const oppLeadShown = !pub.isLeader && pub.leadColor;
    const myLeadCommitted = pub.isLeader && pub.turn !== viewSeat && pub.winner === null;
    let banner = "";
    if (pub.winner !== null) {
      if (pub.winner === "draw") banner = "🤝 무승부! 팽팽한 수 싸움이었어요!";
      else banner = `🏆 ${Cozy.esc(seats[pub.winner]?.name || "승자")} 최종 승리!`;
    } else if (playMode === "friend" && mySeat >= 2) {
      banner = `👀 ${Cozy.esc(seats[pub.turn]?.name || "플레이어")} 차례 관전 중…`;
    } else if (playMode === "watch") {
      banner = pub.turn === pub.leader ? `선공 ${Cozy.esc(seats[pub.leader].name)} 생각 중…` : `후공 ${Cozy.esc(seats[pub.turn].name)} 응수 중…`;
    } else if (isHumanTurn) {
      banner = oppLeadShown
        ? `상대가 ${pub.leadColor === "B" ? "⬛흑(짝수)" : "⬜백(홀수)"}을 냈어요! 내 타일을 고르세요`
        : "내가 선공! 낼 타일을 고르세요 (색깔만 공개돼요)";
    } else {
      banner = `${Cozy.esc(seats[pub.turn]?.name || "상대")} 차례를 기다리는 중…`;
    }

    const oppCard = oppLeadShown
      ? `<div class="bw-card ${pub.leadColor}">${pub.leadColor === "B" ? "⬛" : "⬜"}</div>`
      : `<div class="bw-card empty">${pub.winner !== null ? "종료" : "대기"}</div>`;
    const myCard = bwSelectedTile !== null
      ? `<div class="bw-card ${G.bwColor(bwSelectedTile)}">${bwSelectedTile}</div>`
      : myLeadCommitted
        ? `<div class="bw-card ${pub.leadColor}">제출</div>`
        : `<div class="bw-card empty">선택</div>`;

    const handHtml = Array.from({ length: 9 }, (_, n) => {
      const has = pub.myHand.includes(n);
      const col = G.bwColor(n);
      const sel = bwSelectedTile === n ? " sel" : "";
      const rec = c && c.bestTile === n ? " coach-rec" : "";
      return `<button type="button" class="bw-tile ${col}${sel}${rec}" data-tile="${n}" ${!has || !isHumanTurn || bwBusy ? "disabled" : ""}>${n}</button>`;
    }).join("");

    stage.innerHTML = `
      <div>
        <div class="bw-hist">${histHtml}</div>
        <div class="bw-opp-info" style="margin-top:6px">상대 남은 패: ⬛흑(짝) ${pub.oppRemain.B}장 · ⬜백(홀) ${pub.oppRemain.W}장</div>
      </div>
      <div class="bw-arena">
        <div class="bw-slot"><span class="lbl">상대</span>${oppCard}</div>
        <div style="font-weight:900;color:var(--g-gold);font-size:18px">VS</div>
        <div class="bw-slot"><span class="lbl">${Cozy.esc(seats[viewSeat]?.name || "나")}</span>${myCard}</div>
      </div>
      <div>
        <div class="bw-banner">${banner}</div>
        <div class="bw-hand" style="margin:8px 0">${handHtml}</div>
        <div class="bw-commit">
          <button type="button" class="btn primary" id="bwSendBtn" ${bwSelectedTile === null || !isHumanTurn || bwBusy ? "disabled" : ""} style="min-width:170px">
            ${bwSelectedTile === null ? "타일을 골라 주세요" : `[${bwSelectedTile}] 제출하기!`}
          </button>
        </div>
      </div>`;

    stage.querySelectorAll(".bw-tile").forEach(btn => {
      btn.onclick = () => {
        bwSelectedTile = Number(btn.dataset.tile);
        sfx("tap");
        renderBW();
      };
    });
    const sendBtn = document.getElementById("bwSendBtn");
    if (sendBtn) {
      sendBtn.onclick = () => commitBWTile(viewSeat, bwSelectedTile);
    }
  }

  async function commitBWTile(seat, tile) {
    if (tile === null || bwBusy) return;
    if (seat === mySeat) bwSelectedTile = null;
    if (playMode === "friend" && !isHost) {
      arena.send({ t: "bw_pick", tile }, true);
      bwBusy = true;
      render();
      return;
    }

    const res = G.playBW(st, seat, tile);
    if (!res.ok) {
      if (playMode === "friend" && isHost && seat !== mySeat && seats[seat]?.uid) {
        arena.send(seats[seat].uid, { t: "bw_err", err: res.err }, true);
        pushBWViews();
      } else {
        Cozy.toast(res.err);
      }
      return;
    }
    sfx(res.resolved ? (res.roundWinner === mySeat ? "good" : res.roundWinner === "draw" ? "tap" : "flip") : "place");

    if (playMode === "friend" && isHost) {
      pushBWViews();
    }

    render();
    checkBWFlow();
  }

  function pushBWViews() {
    if (!arena || !isHost) return;
    seats.forEach((s, idx) => {
      if (!s.uid || s.uid === myUid) return;
      if (idx === 1) {
        arena.send(s.uid, { t: "bw_view", view: G.bwPublicView(st, 1) }, true);
      } else {
        const pub = G.bwPublicView(st, 0);
        pub.myHand = [];
        arena.send(s.uid, { t: "bw_view", view: pub }, true);
      }
    });
  }

  function checkBWFlow() {
    if (st.winner !== null) {
      if (st.winner === mySeat) { sfx("win"); Cozy.confetti(); }
      maybeRecordRank(st.winner);
      return;
    }
    if (playMode === "watch" || seats[st.turn]?.kind === "ai") {
      const delay = playMode === "watch" ? watchMs : 720;
      stopTimers();
      aiTimer = setTimeout(() => {
        if (!st || st.winner !== null) return;
        const t = G.aiPickBW(st, st.turn, playMode === "watch" ? "hard" : aiTier);
        if (t !== null) commitBWTile(st.turn, t);
      }, delay);
    }
  }

  // ════════════════════════════════════════════════
  //  2. 결! 합! (GH) 렌더링 & 인터랙션
  // ════════════════════════════════════════════════
  function renderGH() {
    const stage = $("stage");
    const totalHaps = st.totalHaps !== undefined ? st.totalHaps : st.haps.length;
    const remCount = Math.max(0, totalHaps - st.found.length);
    $("playTitle").textContent = "🔷 결! 합!";
    $("playSub").textContent = st.done
      ? (st.winner === "draw" ? "무승부 종료!" : `🏆 ${seats[st.winner]?.name || "우승"} 승리!`)
      : `찾은 합 ${st.found.length}개` + (playMode === "watch" ? ` (총 ${totalHaps}개)` : "");

    const cellsHtml = st.board.map((card, i) => {
      const isSel = ghSelected.includes(i);
      const isHint = ghHintHighlight.includes(i);
      return `<button type="button" class="gh-cell${isSel ? " sel" : ""}${isHint ? " hint" : ""}" data-idx="${i}" ${st.done || playMode === "watch" ? "disabled" : ""}>
        <span class="num">${i + 1}</span>${svgGH(card)}
      </button>`;
    }).join("");

    const foundHtml = st.found.length
      ? st.found.map(f => `<span class="gh-chip">✅ ${f.triple.map(n => n + 1).join("·")} (${seats[f.by]?.name || ""})</span>`).join("")
      : `<span style="font-size:12px;color:var(--g-muted)">아직 찾은 합이 없어요 · 같은/다른 속성 3장을 눌러 보세요!</span>`;

    const localTip = `<span>합 +1점 · 결 성공 +3점 · 오답 -1점</span>`;

    stage.innerHTML = `
      <div class="gh-top">${localTip}<span>카드 9장 · ${st.found.length}합 발견</span></div>
      <div class="gh-grid">${cellsHtml}</div>
      <div class="gh-found">${foundHtml}</div>
      <div class="gh-actions">
        <button type="button" class="btn primary" id="ghHapBtn" ${st.done || playMode === "watch" || ghSelected.length !== 3 ? "disabled" : ""}>⚡ 합! 외치기 (${ghSelected.length}/3)</button>
        <button type="button" class="btn" id="ghGyulBtn" ${st.done || playMode === "watch" ? "disabled" : ""} style="background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;border:none;font-weight:800">🔔 결! (+3점)</button>
      </div>`;

    stage.querySelectorAll(".gh-cell").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        const pos = ghSelected.indexOf(idx);
        if (pos >= 0) ghSelected.splice(pos, 1);
        else if (ghSelected.length < 3) ghSelected.push(idx);
        sfx("tap");
        render();
      };
    });
    const hapBtn = document.getElementById("ghHapBtn");
    if (hapBtn) hapBtn.onclick = () => triggerHapGH(mySeat, ghSelected.slice());
    const gyulBtn = document.getElementById("ghGyulBtn");
    if (gyulBtn) gyulBtn.onclick = () => triggerGyulGH(mySeat);
  }

  function triggerHapGH(seat, triple) {
    if (seat === mySeat) { ghSelected = []; ghHintHighlight = []; }
    if (playMode === "friend" && !isHost) {
      arena.send({ t: "gh_hap", triple }, true);
      return;
    }
    const r = G.submitHapGH(st, seat, triple);
    if (!r.ok) { Cozy.toast(r.err); return; }
    if (r.hit) {
      sfx("good");
      Cozy.toast(`⚡ 합! ${r.triple.map(n => n + 1).join("·")} (+1점)`, 1100);
    } else {
      sfx("bad");
      Cozy.toast(r.duplicate ? "이미 찾은 합이에요 (-1점)" : "합이 아니에요! (-1점)", 1100);
    }
    if (playMode === "friend" && isHost) syncGH();
    render();
  }

  function triggerGyulGH(seat) {
    if (seat === mySeat) { ghSelected = []; ghHintHighlight = []; }
    if (playMode === "friend" && !isHost) {
      arena.send({ t: "gh_gyul" }, true);
      return;
    }
    const r = G.callGyulGH(st, seat);
    if (!r.ok) { Cozy.toast(r.err); return; }
    if (r.success) {
      sfx("win");
      Cozy.confetti();
      Cozy.toast(`🔔 결! 완벽해요 (+3점)`, 1600);
      maybeRecordRank(st.winner);
    } else {
      sfx("bad");
      Cozy.toast(`아직 남은 합이 있어요! (-1점)`, 1300);
    }
    if (playMode === "friend" && isHost) syncGH();
    render();
  }

  function syncGH() {
    if (!arena || !isHost) return;
    arena.broadcast({
      t: "gh_sync",
      found: st.found,
      scores: st.scores,
      done: st.done,
      winner: st.winner,
      gyulBy: st.gyulBy,
    }, true);
  }

  function scheduleAIGH() {
    if (st.done || (playMode !== "solo" && playMode !== "watch")) return;
    const baseMs = playMode === "watch" ? watchMs * 2 : (aiTier === "hard" ? 3600 : aiTier === "normal" ? 5600 : 8200);
    stopTimers();
    aiTimer = setTimeout(() => {
      if (!st || st.done) return;
      const aiSeat = playMode === "watch" ? (st.found.length % 2) : 1;
      const rem = G.remainingHapsGH(st);
      if (rem.length) {
        G.submitHapGH(st, aiSeat, rem[0]);
        sfx("pop");
        Cozy.toast(`🤖 ${seats[aiSeat].name} 합 발견! (${rem[0].map(n => n + 1).join("·")})`, 1100);
        render();
        scheduleAIGH();
      } else {
        G.callGyulGH(st, aiSeat);
        sfx("lose");
        Cozy.toast(`🤖 ${seats[aiSeat].name} 결! 선언 (+3점)`, 1400);
        maybeRecordRank(st.winner);
        render();
      }
    }, baseMs);
  }

  // ════════════════════════════════════════════════
  //  3. 십이장기 (12) 렌더링 & 인터랙션
  // ════════════════════════════════════════════════
  const DOT_POS = {
    "-1,-1": "top:3px;left:3px",
    "-1,0": "top:2px;left:50%;transform:translateX(-50%)",
    "-1,1": "top:3px;right:3px",
    "0,-1": "top:50%;left:2px;transform:translateY(-50%)",
    "0,1": "top:50%;right:2px;transform:translateY(-50%)",
    "1,-1": "bottom:3px;left:3px",
    "1,0": "bottom:2px;left:50%;transform:translateX(-50%)",
    "1,1": "bottom:3px;right:3px",
  };
  function pieceDirDots(t) {
    let keys = [];
    if (t === "king") keys = Object.keys(DOT_POS);
    else if (t === "jang") keys = ["-1,0", "1,0", "0,-1", "0,1"];
    else if (t === "sang") keys = ["-1,-1", "-1,1", "1,-1", "1,1"];
    else if (t === "ja") keys = ["-1,0"];
    else if (t === "hu") keys = ["-1,0", "1,0", "0,-1", "0,1", "-1,-1", "-1,1"];
    return `<span class="dirs">${keys.map(k => `<i class="dir-dot" style="${DOT_POS[k]}"></i>`).join("")}</span>`;
  }

  function render12() {
    const stage = $("stage");
    const flip = (playMode === "friend" && mySeat === 1);
    const activeSeat = mySeat;
    const isMyTurn = st.winner === null && st.turn === activeSeat && seats[activeSeat]?.kind === "human" && playMode !== "watch";
    $("playTitle").textContent = "🦁 십이장기";
    $("playSub").textContent = st.winner !== null
      ? `${seats[st.winner]?.name || "승자"} ${st.winReason === "try" ? "적진 입성(Try) 승!" : "왕 포획 승!"}`
      : st.pendingTry !== null
        ? `🚨 ${seats[st.pendingTry].name} 왕 입성! 잡지 못하면 즉시 패배!`
        : `${seats[st.turn]?.name || "차례"} 차례 · ${st.moves}수`;

    const c = (coach && coach.visible) ? G.coach12(st, activeSeat) : null;
    const legal = isMyTurn ? G.legalMoves12(st, activeSeat) : [];
    const destSet = new Set();
    if (m12Sel) {
      legal.forEach(m => {
        if (m12Sel.kind === "move" && m.kind === "move" && m.fr === m12Sel.fr && m.fc === m12Sel.fc) destSet.add(`${m.tr},${m.tc}`);
        if (m12Sel.kind === "drop" && m.kind === "drop" && m.pt === m12Sel.pt) destSet.add(`${m.tr},${m.tc}`);
      });
    }

    const topSeat = flip ? 0 : 1;
    const botSeat = flip ? 1 : 0;
    const renderRes = (seat, isMine) => {
      const pcs = st.reserves[seat];
      if (!pcs.length) return `<span style="color:var(--g-muted)">없음</span>`;
      return pcs.map((pt, idx) => {
        const selected = isMine && m12Sel?.kind === "drop" && m12Sel.pt === pt && m12Sel.idx === idx;
        return `<button type="button" class="res-pc ${isMine ? "mine" : "opp"}${selected ? " sel" : ""}" data-drop="${pt}" data-ridx="${idx}" ${!isMine || !isMyTurn ? "disabled" : ""}>${G.P12_NAME[pt]}</button>`;
      }).join("");
    };

    const rows = flip ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const cols = flip ? [2, 1, 0] : [0, 1, 2];
    let gridHtml = "";
    for (const r of rows) {
      for (const cCol of cols) {
        const p = st.board[r][cCol];
        const isSel = m12Sel?.kind === "move" && m12Sel.fr === r && m12Sel.fc === cCol;
        const isDst = destSet.has(`${r},${cCol}`);
        const isCFrom = c?.bestMove?.kind === "move" && c.bestMove.fr === r && c.bestMove.fc === cCol;
        const isCTo = c?.bestMove && c.bestMove.tr === r && c.bestMove.tc === cCol;
        const zone = r === (flip ? 3 : 0) ? " zone-top" : r === (flip ? 0 : 3) ? " zone-bot" : "";
        const pieceCls = p ? (p.s === botSeat ? "p0" : "p1") + (p.t === "hu" ? " hu" : "") : "";
        gridHtml += `<button type="button" class="c12${zone}${p ? " has" : ""}${isSel ? " sel" : ""}${isDst ? " dst" : ""}${isCFrom ? " coach-from" : ""}${isCTo ? " coach-to" : ""}" data-r="${r}" data-c="${cCol}">
          ${p ? `<span class="pc12 ${pieceCls}">${pieceDirDots(p.t)}<span>${G.P12_NAME[p.t]}</span></span>` : ""}
        </button>`;
      }
    }

    stage.innerHTML = `
      <div class="res-tray"><span class="lbl">${seats[topSeat]?.name || "상대"} 포로</span>${renderRes(topSeat, false)}</div>
      <div class="b12">${gridHtml}</div>
      <div class="res-tray"><span class="lbl">${seats[botSeat]?.name || "내"} 포로</span>${renderRes(botSeat, botSeat === activeSeat && isMyTurn)}</div>`;

    stage.querySelectorAll("[data-drop]").forEach(btn => {
      btn.onclick = () => {
        m12Sel = { kind: "drop", pt: btn.dataset.drop, idx: Number(btn.dataset.ridx) };
        sfx("tap");
        render12();
      };
    });

    stage.querySelectorAll(".c12").forEach(btn => {
      btn.onclick = () => {
        if (!isMyTurn) return;
        const r = Number(btn.dataset.r), cCol = Number(btn.dataset.c);
        const key = `${r},${cCol}`;
        if (m12Sel && destSet.has(key)) {
          const mv = m12Sel.kind === "move"
            ? { kind: "move", fr: m12Sel.fr, fc: m12Sel.fc, tr: r, tc: cCol }
            : { kind: "drop", pt: m12Sel.pt, tr: r, tc: cCol };
          m12Sel = null;
          commitMove12(mv);
          return;
        }
        const p = st.board[r][cCol];
        if (p && p.s === activeSeat) {
          m12Sel = (m12Sel?.kind === "move" && m12Sel.fr === r && m12Sel.fc === cCol) ? null : { kind: "move", fr: r, fc: cCol };
          sfx("tap");
          render12();
        } else {
          m12Sel = null;
          render12();
        }
      };
    });
  }

  function commitMove12(mv) {
    if (playMode === "friend" && !isHost) {
      arena.send({ t: "m12_move", mv }, true);
      return;
    }
    const r = G.applyMove12(st, mv);
    if (!r.ok) { Cozy.toast(r.err); return; }
    sfx(r.winner !== null ? "win" : r.captured ? "good" : "place");
    if (r.promoted) Cozy.toast("★ '자'가 '후'로 승급했어요!", 1200);
    if (playMode === "friend" && isHost) {
      arena.broadcast({ t: "m12_sync", state: st }, true);
    }
    render();
    check12Flow();
  }

  function check12Flow() {
    if (st.winner !== null) {
      if (st.winner === mySeat) { sfx("win"); Cozy.confetti(); }
      maybeRecordRank(st.winner);
      return;
    }
    if (playMode === "watch" || seats[st.turn]?.kind === "ai") {
      const delay = playMode === "watch" ? watchMs : 550;
      stopTimers();
      aiTimer = setTimeout(() => {
        if (!st || st.winner !== null) return;
        const mv = G.aiPick12(st, st.turn, playMode === "watch" ? "hard" : aiTier);
        if (mv) commitMove12(mv);
      }, delay);
    }
  }

  // ── 통합 렌더 ──
  function render() {
    if (!st) return;
    renderScores();
    if (st.kind === "bw") renderBW();
    else if (st.kind === "gh") renderGH();
    else if (st.kind === "12") render12();
    updateCoach();
  }

  // ── 게임 시작 ──
  function startNewMatch(kind) {
    matchId++;
    stopTimers();
    gameKind = kind || gameKind;
    bwSelectedTile = null;
    bwBusy = false;
    ghSelected = [];
    ghHintHighlight = [];
    m12Sel = null;
    remoteViewBW = null;
    resultRecorded = false;

    if (playMode === "solo") {
      const tierLbl = aiTier === "hard" ? "👑 고수 AI" : aiTier === "normal" ? "🧠 중급 AI" : "🐣 초급 AI";
      const myNm = (window.GME && GME.me && GME.me.name) || localStorage.getItem("game.arena.name") || "나";
      seats = [
        { kind: "human", name: myNm, emoji: "🙂" },
        { kind: "ai", tier: aiTier, name: tierLbl, emoji: "🤖" },
      ];
      mySeat = 0;
    } else if (playMode === "watch") {
      seats = [
        { kind: "ai", tier: "hard", name: "🧠 지니어스 α", emoji: "🦊" },
        { kind: "ai", tier: "hard", name: "👑 지니어스 β", emoji: "🦉" },
      ];
      mySeat = 0;
    }

    if (gameKind === "bw") st = G.newBW({ firstLead: Math.random() < 0.5 ? 0 : 1 });
    else if (gameKind === "gh") st = G.newGH({ players: seats.length, minHaps: 3, maxHaps: 5 });
    else st = G.new12();

    showPlay();
    render();
    if (gameKind === "bw") checkBWFlow();
    else if (gameKind === "gh") scheduleAIGH();
    else check12Flow();
  }

  // ── 온라인 친구랑 (ArenaUI) ──
  function friendOpts() {
    const kindLbl = cfg => ({ bw: "⬛⬜ 흑과 백", gh: "🔷 결! 합!", 12: "🦁 십이장기", mix: "🎲 3종목 번갈아" }[(cfg && cfg.kind) || "bw"] || "흑과 백");
    return {
      game: "genius",
      title: "🧠 베니 지니어스 친구 대전",
      min: 2,
      max: 8,
      coach: true,
      settings: {
        defaults: { kind: gameKind },
        label: kindLbl,
        render(box, cfg, canEdit, update) {
          const cur = (cfg && cfg.kind) || "bw";
          if (!canEdit) {
            box.innerHTML = `<p class="arn-soft" style="text-align:center">${kindLbl(cfg)}</p>`;
            return;
          }
          box.innerHTML = `<div class="optrow"><span class="small">종목</span><div class="seg" id="arKind">
            <button type="button" class="btn ${cur === "bw" ? "active" : ""}" data-k="bw">흑과 백</button>
            <button type="button" class="btn ${cur === "gh" ? "active" : ""}" data-k="gh">결! 합!</button>
            <button type="button" class="btn ${cur === "12" ? "active" : ""}" data-k="12">십이장기</button>
            <button type="button" class="btn ${cur === "mix" ? "active" : ""}" data-k="mix">번갈아</button>
          </div></div>`;
          box.querySelectorAll("#arKind button").forEach(b => {
            b.onclick = () => {
              if (update) update({ kind: b.dataset.k });
              box.querySelectorAll("#arKind button").forEach(x => x.classList.toggle("active", x === b));
            };
          });
        },
      },
      describe(n, cfg) {
        if (cfg.kind === "gh") return `${n}명이 실시간 9장 카드에서 '합!'과 '결!'을 겨뤄요`;
        if (cfg.kind === "12") return "2명이 3×4 십이장기로 승부해요 (나머지 친구는 관전)";
        if (cfg.kind === "mix") return "매 판 흑과 백 → 결! 합! → 십이장기를 번갈아 해요";
        return "2명이 0~8 흑과 백 수 싸움을 해요 (나머지 친구는 관전)";
      },
      onStart(ctx) {
        playMode = "friend";
        arenaOffs.forEach(f => { try { f(); } catch (e) {} });
        arenaOffs = [];
        arena = ctx.net;
        isHost = ctx.role === "host";
        myUid = ctx.uid || arena.uid;
        const pMap = ctx.players || arena.players || {};
        const hostUid = (arena.meta && arena.meta.host) || (isHost ? myUid : "");
        const uids = Object.keys(pMap).sort((a, b) => (a === hostUid ? -1 : b === hostUid ? 1 : a.localeCompare(b)));
        seats = uids.map((uid, i) => ({
          kind: "human",
          uid,
          name: (pMap[uid] && pMap[uid].name) || ("친구 " + (i + 1)),
          emoji: (pMap[uid] && pMap[uid].emoji) || "🙂",
        }));
        mySeat = Math.max(0, seats.findIndex(s => s.uid === myUid));
        roomKindMode = (ctx.cfg && ctx.cfg.kind) || "bw";
        mixIndex = 0;

        const handleMsg = (from, msg) => {
          if (!msg || !msg.t) return;
          if (msg.t === "init_game") {
            applyRemoteInit(msg);
          } else if (msg.t === "hello" && isHost && st) {
            if (st.kind === "bw") {
              arena.send(from, { t: "init_game", kind: "bw" }, true);
              pushBWViews();
            } else if (st.kind === "gh") {
              arena.send(from, { t: "init_game", kind: "gh", boardIds: st.board.map(c => c.id), totalHaps: st.haps.length, players: seats.length, found: st.found, scores: st.scores, done: st.done, winner: st.winner }, true);
            } else {
              arena.send(from, { t: "init_game", kind: "12", state: st }, true);
            }
          } else if (msg.t === "bw_view") {
            bwBusy = false;
            remoteViewBW = msg.view;
            if (msg.view.winner !== null) maybeRecordRank(msg.view.winner);
            render();
          } else if (msg.t === "bw_err") {
            bwBusy = false;
            Cozy.toast(msg.err || "잘못된 선택이에요");
            render();
          } else if (msg.t === "bw_pick" && isHost) {
            const seatIdx = seats.findIndex(s => s.uid === from);
            if (seatIdx === 0 || seatIdx === 1) commitBWTile(seatIdx, msg.tile);
          } else if (msg.t === "gh_hap" && isHost) {
            const seatIdx = seats.findIndex(s => s.uid === from);
            if (seatIdx >= 0) triggerHapGH(seatIdx, msg.triple);
          } else if (msg.t === "gh_gyul" && isHost) {
            const seatIdx = seats.findIndex(s => s.uid === from);
            if (seatIdx >= 0) triggerGyulGH(seatIdx);
          } else if (msg.t === "gh_sync" && !isHost) {
            st.found = msg.found;
            st.scores = msg.scores;
            st.done = msg.done;
            st.winner = msg.winner;
            st.gyulBy = msg.gyulBy;
            if (st.done) maybeRecordRank(st.winner);
            render();
          } else if (msg.t === "m12_move" && isHost) {
            const seatIdx = seats.findIndex(s => s.uid === from);
            if (seatIdx === st.turn) commitMove12(msg.mv);
          } else if (msg.t === "m12_sync" && !isHost) {
            st = msg.state;
            if (st.winner !== null) maybeRecordRank(st.winner);
            render();
          }
        };

        if (isHost) {
          arenaOffs.push(arena.on("msg", (from, msg) => handleMsg(from, msg)));
        } else {
          arenaOffs.push(arena.on("msg", msg => handleMsg(null, msg)));
        }

        showPlay();
        if (isHost) {
          hostStartOnlineRound();
        } else {
          arena.send({ t: "hello" }, true);
        }
      },
      onLeave() {
        backToHome(false);
      },
    };
  }
  function openFriend() {
    if (!window.ArenaUI) { Cozy.toast("온라인 모듈을 불러오지 못했어요"); return; }
    ArenaUI.open(friendOpts());
  }

  function hostStartOnlineRound() {
    const k = roomKindMode === "mix" ? mixQueue[mixIndex % mixQueue.length] : roomKindMode;
    mixIndex++;
    gameKind = k;
    bwSelectedTile = null;
    bwBusy = false;
    ghSelected = [];
    m12Sel = null;
    resultRecorded = false;

    if (k === "bw") {
      st = G.newBW({ firstLead: Math.random() < 0.5 ? 0 : 1 });
      arena.broadcast({ t: "init_game", kind: "bw" }, true);
      pushBWViews();
      render();
    } else if (k === "gh") {
      st = G.newGH({ players: seats.length, minHaps: 3, maxHaps: 5 });
      arena.broadcast({
        t: "init_game",
        kind: "gh",
        boardIds: st.board.map(c => c.id),
        totalHaps: st.haps.length,
        players: seats.length,
      }, true);
      render();
    } else {
      st = G.new12();
      arena.broadcast({ t: "init_game", kind: "12", state: st }, true);
      render();
    }
  }

  function applyRemoteInit(msg) {
    gameKind = msg.kind;
    bwSelectedTile = null;
    bwBusy = false;
    ghSelected = [];
    m12Sel = null;
    resultRecorded = false;
    if (msg.kind === "bw") {
      st = G.newBW();
      remoteViewBW = G.bwPublicView(st, Math.min(1, mySeat));
    } else if (msg.kind === "gh") {
      st = {
        kind: "gh",
        board: msg.boardIds.map(G.cardAttrs),
        haps: [],
        totalHaps: msg.totalHaps,
        found: msg.found || [],
        scores: msg.scores || new Array(msg.players || seats.length).fill(0),
        mistakes: new Array(msg.players || seats.length).fill(0),
        gyulBy: null,
        done: !!msg.done,
        winner: msg.winner ?? null,
      };
    } else {
      st = msg.state;
    }
    render();
  }

  // ── 이벤트 바인딩 ──
  document.querySelectorAll("#gameCards .g-card").forEach(btn => {
    btn.onclick = () => selectKind(btn.dataset.kind);
  });
  $("tabSolo").onclick = () => setModeTab("solo");
  $("tabFriend").onclick = () => setModeTab("friend");
  $("tabWatch").onclick = () => setModeTab("watch");

  document.querySelectorAll("#watchSpeed button").forEach(btn => {
    btn.onclick = () => {
      watchMs = Number(btn.dataset.spd);
      document.querySelectorAll("#watchSpeed button").forEach(b => b.classList.toggle("active", b === btn));
    };
  });

  $("helpBtn").onclick = () => GeniusTutorial.open(gameKind, {
    onStart: () => { if (playMode === "friend") setModeTab("solo"); startNewMatch(gameKind); },
    onWatch: () => { setModeTab("watch"); startNewMatch(gameKind); },
  });
  $("helpPlayBtn").onclick = () => GeniusTutorial.open(st ? st.kind : gameKind, {});
  $("startBtn").onclick = () => {
    if (playMode === "friend") openFriend();
    else startNewMatch(gameKind);
  };
  $("gRankBtn").onclick = () => { if (window.GRank) Arena.init().then(() => GRank.open("genius")).catch(() => {}); };
  $("coachHintBtn").onclick = () => Cozy.toast("게임 중 하단 '🧑‍🏫 AI 선생님'을 켜면 내 차례마다 최선의 수와 이유를 알려 줘요!", 3000);

  $("backBtn").onclick = () => backToHome("진행 중인 게임을 그만하고 나올까요?");
  $("againBtn").onclick = () => {
    if (playMode === "friend") {
      if (isHost) hostStartOnlineRound();
      else Cozy.toast("방장이 새 판을 시작할 수 있어요");
      return;
    }
    startNewMatch(st ? st.kind : gameKind);
  };
  $("switchBtn").onclick = () => {
    const order = ["bw", "gh", "12"];
    const next = order[(order.indexOf(gameKind) + 1) % order.length];
    if (playMode === "friend") {
      if (!isHost) { Cozy.toast("방장만 종목을 바꿀 수 있어요"); return; }
      roomKindMode = next;
      hostStartOnlineRound();
      return;
    }
    startNewMatch(next);
  };

  if ($("sndBtn") && window.Cozy && Cozy.sfx) {
    Cozy.sfx.button($("sndBtn"));
  }

  // 초기화
  buildTiers();
  selectKind(gameKind);
  setModeTab("solo");
  if (window.ArenaUI && ArenaUI.checkUrl) ArenaUI.checkUrl(friendOpts());

  // 테스트용 읽기/디버그 훅
  window.__genius = {
    kind: () => gameKind,
    mode: () => playMode,
    state: () => st,
    selectKind,
    startNewMatch,
  };
})();
