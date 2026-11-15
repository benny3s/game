/* 베니 두뇌 랩 컨트롤러 (brain/main.js)
   · 혼자 (100점 종합 평가 + 영역별 자유 연습) · 성장/감소 이력 · 친구랑 같은 문제 동시 대결 · 🧑‍🏫 AI 선생님 */
(() => {
  "use strict";
  const B = window.BrainCore;
  const $ = id => document.getElementById(id);

  const LS_HIST = () => `benny.brain.hist.${(window.GME && GME.me && GME.me.pid) || "guest"}`;
  const esc = s => (window.Cozy && Cozy.esc ? Cozy.esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

  function readHistory() {
    try {
      const a = JSON.parse(localStorage.getItem(LS_HIST()) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function pushHistory(entry) {
    const arr = readHistory();
    arr.push(entry);
    try { localStorage.setItem(LS_HIST(), JSON.stringify(arr.slice(-100))); } catch (e) {}
    renderHomeSummary();
  }

  // 간단한 효과음 (WebAudio)
  let actx = null;
  let muted = false;
  function beep(type) {
    if (muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const o = actx.createOscillator(), g = actx.createGain();
      const t = actx.currentTime;
      o.connect(g); g.connect(actx.destination);
      if (type === "ok") {
        o.type = "triangle"; o.frequency.setValueAtTime(523, t); o.frequency.exponentialRampToValueAtTime(784, t + 0.11);
        g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.23);
      } else if (type === "no") {
        o.type = "sawtooth"; o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(160, t + 0.14);
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.19);
      } else {
        o.type = "sine"; o.frequency.setValueAtTime(620, t);
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.start(t); o.stop(t + 0.09);
      }
    } catch (e) {}
  }

  // 상태
  let mainTab = "solo";        // 'solo' | 'friend'
  let soloMode = "exam";       // 'exam' | 'practice'
  let practiceCat = "mix";
  let tier = "normal";
  let mutedUi = false;

  let run = null;              // 현재 진행 중 판 상태
  let memTimer = null;
  let coach = null;
  let coachBtnCtl = null;
  let arenaCtl = null;
  let myUid = "me";
  const clampNum = (v, hi) => (Number.isFinite(+v) ? Math.max(0, Math.min(hi, Math.round(+v))) : 0);

  function clearMemTimer() {
    if (memTimer) { clearInterval(memTimer); clearTimeout(memTimer); memTimer = null; }
  }

  function renderHomeSummary() {
    const sm = B.summarizeHistory(readHistory());
    const box = $("homeHistPill");
    if (!box) return;
    if (!sm.count) {
      box.querySelector("span").textContent = "📈 아직 100점 종합 평가 기록이 없어요";
      return;
    }
    const dStr = sm.delta == null ? "첫 기록" : sm.delta > 0 ? `+${sm.delta}점 상승 ▲` : sm.delta < 0 ? `${sm.delta}점 감소 ▼` : "직전과 동일";
    box.querySelector("span").innerHTML = `📈 최근 <b>${sm.latest.total}점</b> (${dStr}) · 최고 <b>${sm.best}점</b>`;
  }

  function setTab(next) {
    mainTab = next;
    $("tabSolo").setAttribute("aria-pressed", String(next === "solo"));
    $("tabFriend").setAttribute("aria-pressed", String(next === "friend"));
    $("soloBox").hidden = next !== "solo";
    $("startBtn").textContent = next === "friend" ? "친구 방 만들기" : (soloMode === "exam" ? "100점 평가 시작!" : "연습 시작!");
  }

  function setSoloMode(m) {
    soloMode = m;
    document.querySelectorAll("#soloModeRow .b-mode-card").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.smode === m));
    });
    $("catWrap").hidden = m !== "practice";
    if (mainTab === "solo") $("startBtn").textContent = m === "exam" ? "100점 평가 시작!" : "연습 시작!";
  }

  function initSetupUI() {
    const tiersEl = $("tiers");
    const defs = [
      ["easy", "🐣 초급", "가벼운 규칙"],
      ["normal", "🐱 중급", "표준 두뇌 시험"],
      ["hard", "🐯 고급", "복합 규칙"],
    ];
    tiersEl.innerHTML = defs.map(([id, nm, sub]) => `<button type="button" class="tier" data-tier="${id}" aria-pressed="${id === tier}"><b>${nm}</b><small>${sub}</small></button>`).join("");
    tiersEl.addEventListener("click", e => {
      const b = e.target.closest(".tier"); if (!b) return;
      tier = b.dataset.tier;
      tiersEl.querySelectorAll(".tier").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    });

    document.querySelectorAll("#soloModeRow .b-mode-card").forEach(b => {
      b.onclick = () => setSoloMode(b.dataset.smode);
    });
    document.querySelectorAll("#catCards .b-cat").forEach(b => {
      b.onclick = () => {
        practiceCat = b.dataset.cat;
        document.querySelectorAll("#catCards .b-cat").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      };
    });
    $("tabSolo").onclick = () => setTab("solo");
    $("tabFriend").onclick = () => setTab("friend");
    $("histBtn").onclick = () => openHistoryModal();
    $("histQuickBtn").onclick = () => openHistoryModal();
    $("histPlayBtn").onclick = () => openHistoryModal();
    $("histCloseBtn").onclick = () => { $("histModal").hidden = true; };
    $("histModal").onclick = e => { if (e.target === $("histModal")) $("histModal").hidden = true; };
    $("gRankBtn").onclick = () => { if (window.GRank) GRank.open("brain"); };
    $("helpBtn").onclick = () => window.BrainTutorial && BrainTutorial.open(true);
    $("helpPlayBtn").onclick = () => window.BrainTutorial && BrainTutorial.open(true);
    $("sndBtn").onclick = () => {
      muted = !muted;
      $("sndBtn").textContent = muted ? "🔇" : "🔊";
    };
    $("backBtn").onclick = leavePlay;
    $("againBtn").onclick = () => {
      if (!run) return;
      if (run.mode === "friend") return;
      if (run.mode === "exam") startExam(Date.now());
      else startPractice();
    };
    $("startBtn").onclick = () => {
      if (mainTab === "friend") openFriendLobby();
      else if (soloMode === "exam") startExam(Date.now());
      else startPractice();
    };

    if (window.GME && GME.onChange) GME.onChange(() => renderHomeSummary());
    renderHomeSummary();
  }

  function setupCoach() {
    if (!window.CoachPanel) return;
    if (coachBtnCtl) { coachBtnCtl.destroy(); coachBtnCtl = null; }
    if (coach) coach.destroy();
    coach = CoachPanel.create({ game: "brain", title: "AI 선생님", startHidden: true });
    const slot = $("coachSlot");
    if (slot && coach.el) slot.appendChild(coach.el);
    coachBtnCtl = CoachPanel.button($("coachBtn"), coach, { remember: false });
    updateCoachText();
  }

  function updateCoachText() {
    if (!coach) return;
    if (!run || !run.curQ) {
      coach.set("종합 평가 결과 화면입니다. 약한 영역부터 다시 도전해 보세요!");
      return;
    }
    const q = run.curQ;
    if (run.answered) {
      coach.set(`<b>${esc(q.explain.rule)}</b><br>${q.explain.steps.map(s => `• ${esc(s)}`).join("<br>")}`);
    } else if (run.mode === "practice") {
      coach.set(`<b>💡 1단계 힌트</b><br>${esc(q.explain.hint1)}<br><br><b>🔎 핵심 접근</b><br>${esc(q.explain.hint2)}`);
    } else {
      coach.set(`<b>💡 접근 힌트</b><br>${esc(q.explain.hint1)}<br><small style="color:var(--soft)">※ 평가·대결에서는 제출 후 상세 해설이 공개됩니다.</small>`);
    }
  }

  // ── 혼자: 100점 종합 평가 (8문제) & 영역별 연습 ─────────────────────────────
  function startExam(seed) {
    clearMemTimer();
    const qs = B.generateExam(seed, tier);
    run = {
      mode: "exam",
      seed,
      tier,
      questions: qs,
      idx: 0,
      results: [],
      curQ: qs[0],
      qStart: Date.now(),
      answered: false,
      memPhase: null,
      scoreMap: {},
    };
    enterPlay("100점 종합 평가", `1 / ${qs.length} 문제`);
    renderQuestion();
  }

  function startPractice() {
    clearMemTimer();
    const catPick = practiceCat === "mix" ? B.CATS[0].id : practiceCat;
    const seed = Date.now();
    const q = B.generateQuestion(catPick, tier, seed, 0);
    run = {
      mode: "practice",
      seed,
      tier,
      cat: practiceCat,
      seqIdx: 0,
      solved: 0,
      correct: 0,
      curQ: q,
      qStart: Date.now(),
      answered: false,
      memPhase: null,
      scoreMap: {},
    };
    enterPlay("자유 연습", `${B.CAT_MAP[catPick].icon} 1번 문제`);
    renderQuestion();
  }

  function enterPlay(title, sub) {
    $("home").closest(".wrap").hidden = true;
    $("play").hidden = false;
    $("playTitle").textContent = title;
    $("playSub").textContent = sub;
    $("againBtn").hidden = run.mode === "friend";
    $("scoreBar").innerHTML = "";
    setupCoach();
  }

  function maybeSubmitFriendRank(force = false) {
    if (!run || run.mode !== "friend" || run.rankSent || run.myTotal == null) return;
    const players = (arenaCtl && arenaCtl.players) || (arenaCtl && arenaCtl.net && arenaCtl.net.players) || {};
    const uids = Object.keys(players);
    const others = uids.filter(u => u !== myUid);
    const allDone = others.every(u => run.scoreMap[u] && run.scoreMap[u].total != null);
    if (!allDone && !force) return;
    run.rankSent = true;
    const rivalTotals = others.map(u => (run.scoreMap[u] && run.scoreMap[u].total != null ? run.scoreMap[u].total : -1)).filter(v => v >= 0);
    const won = rivalTotals.length ? run.myTotal >= Math.max(...rivalTotals) : run.myTotal >= 60;
    if (window.GRank) GRank.result("brain", { mode: "friend", res: won ? "w" : "l", score: run.myTotal, tier: run.tier });
  }

  function leavePlay() {
    if (run && run.mode === "friend" && run.myTotal != null && !run.rankSent) {
      maybeSubmitFriendRank(true);
    }
    clearMemTimer();
    if (coachBtnCtl) { coachBtnCtl.destroy(); coachBtnCtl = null; }
    if (coach) { coach.destroy(); coach = null; }
    arenaOffs.forEach(f => { try { f(); } catch (e) {} });
    arenaOffs = [];
    if (run && run.mode === "friend" && arenaCtl && arenaCtl.net && arenaCtl.net.leave) {
      try { arenaCtl.net.leave(); } catch (e) {}
    }
    arenaCtl = null;
    run = null;
    $("play").hidden = true;
    $("home").closest(".wrap").hidden = false;
    renderHomeSummary();
  }

  function renderScores() {
    const bar = $("scoreBar");
    if (!run || run.mode !== "friend") { bar.innerHTML = ""; return; }
    const players = (arenaCtl && arenaCtl.players) || (arenaCtl && arenaCtl.net && arenaCtl.net.players) || {};
    const qTotal = (run.questions && run.questions.length) || 8;
    bar.innerHTML = Object.entries(players).map(([uid, p]) => {
      const sc = run.scoreMap[uid] || { done: 0, ok: 0, total: null };
      const done = clampNum(sc.done, qTotal);
      const ok = clampNum(sc.ok, qTotal);
      const tot = sc.total == null ? null : clampNum(sc.total, 100);
      const txt = tot != null ? `${tot}점 완료` : `${done}/${qTotal} · ${ok}정답`;
      return `<span class="sc-pill${uid === myUid ? " me" : ""}">${esc(p.name || uid)} · <b>${txt}</b></span>`;
    }).join("");
  }

  function renderQuestion() {
    clearMemTimer();
    if (!run) return;
    const q = run.curQ;
    run.answered = false;
    run.qStart = Date.now();
    const catInfo = B.CAT_MAP[q.cat];
    $("playSub").textContent = run.mode === "practice"
      ? `${catInfo.icon} #${run.seqIdx + 1} (${run.correct}/${run.solved} 정답)`
      : `${run.idx + 1} / ${run.questions.length} 문제`;

    const st = $("stage");
    st.innerHTML = `
      <article class="br-qcard" id="qCard">
        <div class="br-qmeta">
          <span class="br-tag">${catInfo.icon} ${esc(catInfo.name)}</span>
          <span>${run.tier === "easy" ? "🐣 초급" : run.tier === "hard" ? "🐯 고급" : "🐱 중급"}</span>
        </div>
        <h3 class="br-qtitle">${esc(q.title)}</h3>
        <div id="qVisual"></div>
        <div id="qInteract"></div>
        <div id="qFeed"></div>
      </article>`;

    const vis = $("qVisual");
    if (q.visualSvg) vis.innerHTML = q.visualSvg;
    else if (q.promptHtml) vis.innerHTML = q.promptHtml;

    if (q.type === "choice") renderChoiceUI(q);
    else renderMemoryUI(q);

    updateCoachText();
    renderScores();
  }

  function renderChoiceUI(q) {
    const box = $("qInteract");
    box.innerHTML = `<div class="br-opts">${q.choices.map((c, i) => `
      <button type="button" class="br-opt" data-idx="${i}">
        ${c.svg ? c.svg : `<span>${esc(c.label)}</span>`}
      </button>`).join("")}</div>`;

    box.querySelectorAll(".br-opt").forEach(btn => {
      btn.onclick = () => {
        if (run.answered) return;
        const pickIdx = +btn.dataset.idx;
        const ok = pickIdx === q.answer;
        box.querySelectorAll(".br-opt").forEach((b, i) => {
          b.disabled = true;
          if (i === q.answer) b.classList.add("ok");
          else if (i === pickIdx && !ok) b.classList.add("no");
        });
        finishQuestion(ok);
      };
    });
  }

  function renderMemoryUI(q) {
    const vis = $("qVisual");
    const box = $("qInteract");
    const totalCells = q.gridSize * q.gridSize;
    let phase = "preview"; // 'preview' -> 'input' -> 'done'
    const picks = [];

    vis.innerHTML = `<div class="br-mem-bar"><div class="br-mem-fill" id="memFill" style="width:100%"></div></div>`;
    box.innerHTML = `<div class="br-mem-grid" id="memGrid" style="grid-template-columns:repeat(${q.gridSize}, 1fr)">
      ${Array.from({ length: totalCells }, (_, i) => {
        const orderNum = q.targets.indexOf(i);
        const lit = orderNum !== -1;
        return `<button type="button" class="br-mem-cell${lit ? " lit" : ""}" data-cell="${i}" disabled>
          ${lit ? (q.kind === "order" ? orderNum + 1 : "★") : ""}
        </button>`;
      }).join("")}
    </div>`;

    const started = Date.now();
    const fill = $("memFill");
    memTimer = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - started) / q.viewMs);
      if (fill) fill.style.width = `${Math.round(left * 100)}%`;
      if (left <= 0) {
        clearMemTimer();
        phase = "input";
        run.qStart = Date.now();
        box.querySelectorAll(".br-mem-cell").forEach(c => {
          c.classList.remove("lit");
          c.textContent = "";
          c.disabled = false;
        });
      }
    }, 50);

    box.querySelectorAll(".br-mem-cell").forEach(btn => {
      btn.onclick = () => {
        if (phase !== "input" || run.answered) return;
        const ci = +btn.dataset.cell;
        if (picks.includes(ci)) return;

        if (q.kind === "order") {
          const expected = q.targets[picks.length];
          if (ci === expected) {
            picks.push(ci);
            btn.classList.add("hit");
            btn.textContent = String(picks.length);
            beep("tap");
            if (picks.length === q.targets.length) {
              phase = "done";
              finishQuestion(true);
            }
          } else {
            phase = "done";
            btn.classList.add("miss");
            btn.textContent = "✕";
            revealMemoryTargets(box, q);
            finishQuestion(false);
          }
        } else {
          if (q.targets.includes(ci)) {
            picks.push(ci);
            btn.classList.add("hit");
            btn.textContent = "★";
            beep("tap");
            if (picks.length === q.targets.length) {
              phase = "done";
              finishQuestion(true);
            }
          } else {
            phase = "done";
            btn.classList.add("miss");
            btn.textContent = "✕";
            revealMemoryTargets(box, q);
            finishQuestion(false);
          }
        }
      };
    });
  }

  function revealMemoryTargets(box, q) {
    box.querySelectorAll(".br-mem-cell").forEach(c => {
      c.disabled = true;
      const idx = q.targets.indexOf(+c.dataset.cell);
      if (idx !== -1 && !c.classList.contains("hit")) {
        c.classList.add("lit");
        c.textContent = q.kind === "order" ? String(idx + 1) : "★";
      }
    });
  }

  function finishQuestion(ok) {
    clearMemTimer();
    run.answered = true;
    const ms = Date.now() - run.qStart;
    beep(ok ? "ok" : "no");

    const q = run.curQ;
    if (run.mode === "practice") {
      run.solved++;
      if (ok) run.correct++;
    } else {
      run.results.push({ cat: q.cat, ok, ms });
      if (run.mode === "friend" && arenaCtl) {
        const done = run.results.length;
        const okCnt = run.results.filter(x => x.ok).length;
        const payload = { t: "prog", uid: myUid, done, ok: okCnt };
        run.scoreMap[myUid] = { done, ok: okCnt, total: null };
        if (arenaCtl.role === "host") arenaCtl.net.broadcast(payload, true);
        else arenaCtl.net.send(payload, true);
        renderScores();
      }
    }

    updateCoachText();

    const feed = $("qFeed");
    const isLast = run.mode !== "practice" && run.idx >= run.questions.length - 1;
    const nextLbl = run.mode === "practice" ? "다음 문제 ▶" : isLast ? "최종 점수 보기 📊" : "다음 문제 ▶";
    feed.innerHTML = `
      <div class="br-feedback ${ok ? "ok" : "no"}">
        <b>${ok ? "✅ 정답입니다!" : "❌ 아쉽습니다!"} (${esc(q.explain.rule)})</b>
        <div>${q.explain.steps.map(s => `• ${esc(s)}`).join("<br>")}</div>
        <button type="button" class="btn primary" id="nextQBtn">${nextLbl}</button>
      </div>`;

    $("nextQBtn").onclick = advanceQuestion;
  }

  function advanceQuestion() {
    if (!run) return;
    if (run.mode === "practice") {
      run.seqIdx++;
      const catPick = run.cat === "mix" ? B.CATS[run.seqIdx % B.CATS.length].id : run.cat;
      const subIdx = run.cat === "mix" ? Math.floor(run.seqIdx / B.CATS.length) : run.seqIdx;
      run.curQ = B.generateQuestion(catPick, run.tier, run.seed, run.seqIdx, subIdx);
      renderQuestion();
      return;
    }
    run.idx++;
    if (run.idx >= run.questions.length) {
      finishExam();
      return;
    }
    run.curQ = run.questions[run.idx];
    renderQuestion();
  }

  function finishExam() {
    const scored = B.scoreExam(run.results, run.tier);
    const prevHist = readHistory();
    const entry = { t: Date.now(), total: scored.total, domains: scored.domains, tier: run.tier, mode: run.mode };

    if (run.mode === "exam") {
      pushHistory(entry);
      if (window.GRank) GRank.result("brain", { mode: "ai", res: scored.total >= 60 ? "w" : "l", score: scored.total, tier: run.tier });
    } else if (run.mode === "friend" && arenaCtl) {
      run.myTotal = scored.total;
      run.scoreMap[myUid] = { done: run.questions.length, ok: scored.correct, total: scored.total };
      const doneMsg = { t: "done", uid: myUid, total: scored.total, ok: scored.correct };
      if (arenaCtl.role === "host") arenaCtl.net.broadcast(doneMsg, true);
      else arenaCtl.net.send(doneMsg, true);
      renderScores();
      maybeSubmitFriendRank(false);
    }

    const tierPrev = prevHist.filter(h => (h.tier || "normal") === run.tier);
    const histAfter = run.mode === "exam" ? readHistory() : prevHist;
    const sm = B.summarizeHistory(run.mode === "exam" ? histAfter : [...tierPrev, entry]);
    const prevScore = tierPrev.length ? tierPrev[tierPrev.length - 1].total : null;
    const diff = prevScore == null ? null : scored.total - prevScore;
    const tierName = run.tier === "easy" ? "초급" : run.tier === "hard" ? "고급" : "중급";
    const deltaHtml = run.mode === "friend"
      ? `<span class="br-delta eq">친구 실시간 대결 결과 🤝</span>`
      : diff == null
        ? `<span class="br-delta eq">${tierName} 첫 종합 기록 🎉</span>`
        : diff > 0
          ? `<span class="br-delta up">같은 난이도 직전보다 +${diff}점 상승 ▲</span>`
          : diff < 0
            ? `<span class="br-delta dn">같은 난이도 직전보다 ${diff}점 감소 ▼</span>`
            : `<span class="br-delta eq">같은 난이도 직전과 동일</span>`;

    run.curQ = null;
    updateCoachText();
    $("playSub").textContent = "종합 평가 완료!";

    $("stage").innerHTML = `
      <article class="br-result-card">
        <div class="br-score-hero">
          <div>
            <small style="color:var(--soft)">베니 두뇌 랩 100점 평가</small>
            <div><b>${scored.total}</b> <span style="font-size:15px;color:#cbd5e1">/ 100점</span></div>
            <div>${deltaHtml}</div>
          </div>
          <div style="text-align:right">
            <div style="font:800 16px var(--round,inherit);color:#e0f2fe">${scored.grade.label}</div>
            <small style="color:var(--soft)">${scored.correct} / ${scored.count}문제 정답</small>
          </div>
        </div>

        <div class="br-dom-bars">
          ${B.CATS.map(c => {
            const v = scored.domains[c.id] || 0;
            const d = sm.domainDelta[c.id];
            const dTag = d == null ? "" : d > 0 ? ` <span class="br-delta up">(+${d})</span>` : d < 0 ? ` <span class="br-delta dn">(${d})</span>` : "";
            return `<div class="br-dom-row">
              <span>${c.icon} ${c.short}</span>
              <div class="br-dom-track"><div class="br-dom-fill" style="width:${Math.round(v / 25 * 100)}%"></div></div>
              <span style="text-align:right"><b>${v}</b>/25${dTag}</span>
            </div>`;
          }).join("")}
        </div>

        <div class="br-chart-wrap">
          <div style="font-size:12px;color:var(--soft);margin-bottom:4px">📈 최근 점수 추이 (${histAfter.length}회)</div>
          ${renderTrendSvg(histAfter)}
        </div>

        <p class="b-disclaimer" style="margin:0">※ 실제 의학·멘사 IQ 검사가 아닌 자체 논리·사고력 종합 평가 점수입니다.</p>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn ghost" id="resHistBtn" style="flex:1">📈 전체 성장 이력</button>
          <button type="button" class="btn primary" id="resAgainBtn" style="flex:1">${run.mode === "friend" ? "대기실로" : "한 번 더 평가 ↺"}</button>
        </div>
      </article>`;

    $("resHistBtn").onclick = () => openHistoryModal();
    $("resAgainBtn").onclick = () => {
      if (run.mode === "friend") leavePlay();
      else startExam(Date.now());
    };
  }

  function renderTrendSvg(records) {
    const arr = records.slice(-12);
    if (!arr.length) return `<p style="margin:8px 0;color:var(--soft);text-align:center">표시할 기록이 없습니다.</p>`;
    const w = 360, h = 110, padL = 26, padR = 16, padT = 18, padB = 22;
    const iw = w - padL - padR, ih = h - padT - padB;
    const xAt = (i) => arr.length === 1 ? padL + iw / 2 : padL + (i / (arr.length - 1)) * iw;
    const yAt = (v) => padT + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;

    const pts = arr.map((r, i) => [xAt(i), yAt(r.total), r.total]);
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const dots = pts.map((p, i) => {
      const prev = i > 0 ? pts[i - 1][2] : p[2];
      const col = p[2] > prev ? "#34d399" : p[2] < prev ? "#fb7185" : "#38bdf8";
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="${col}" stroke="#0f172a" stroke-width="1.5"/>
        <text x="${p[0].toFixed(1)}" y="${(p[1] - 7).toFixed(1)}" font-size="10" font-weight="800" fill="#e2e8f0" text-anchor="middle">${p[2]}</text>`;
    }).join("");

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padL}" y1="${yAt(100)}" x2="${w - padR}" y2="${yAt(100)}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
      <line x1="${padL}" y1="${yAt(50)}" x2="${w - padR}" y2="${yAt(50)}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3"/>
      <text x="4" y="${yAt(100) + 3}" font-size="9" fill="#64748b">100</text>
      <text x="8" y="${yAt(50) + 3}" font-size="9" fill="#64748b">50</text>
      ${pts.length > 1 ? `<path d="${path}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      ${dots}
    </svg>`;
  }

  function openHistoryModal() {
    const hist = readHistory();
    const sm = B.summarizeHistory(hist);
    const body = $("histBody");
    if (!hist.length) {
      body.innerHTML = `<p style="color:var(--soft);text-align:center;padding:18px 0">아직 완료한 100점 종합 평가가 없어요.<br>첫 평가를 마치면 성장 그래프가 기록됩니다!</p>`;
      $("histModal").hidden = false;
      return;
    }
    const deltaTxt = sm.delta == null ? "-" : (sm.delta > 0 ? `+${sm.delta} ▲` : sm.delta < 0 ? `${sm.delta} ▼` : "0");
    const listHtml = hist.slice(-15).reverse().map(x => {
      const dt = new Date(x.t);
      const ds = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      const d = x.domains || {};
      return `<div class="b-hist-item">
        <span>${ds} · ${x.tier === "easy" ? "초급" : x.tier === "hard" ? "고급" : "중급"}</span>
        <span>🔷${d.shape ?? 0} 🔢${d.num ?? 0} 🕵️${d.logic ?? 0} 🧠${d.mem ?? 0}</span>
        <b style="color:var(--gold)">${x.total}점</b>
      </div>`;
    }).join("");

    body.innerHTML = `
      <div class="b-kpis">
        <div class="b-kpi"><small>최근 점수</small><b>${sm.latest.total}점</b></div>
        <div class="b-kpi"><small>직전 대비</small><b class="${sm.delta > 0 ? "br-delta up" : sm.delta < 0 ? "br-delta dn" : ""}">${deltaTxt}</b></div>
        <div class="b-kpi"><small>최고 / 평균(5회)</small><b>${sm.best} / ${sm.avg5}</b></div>
      </div>
      <div class="br-chart-wrap">${renderTrendSvg(hist)}</div>
      <div class="br-dom-bars">
        ${B.CATS.map(c => {
          const v = (sm.latest.domains && sm.latest.domains[c.id]) || 0;
          return `<div class="br-dom-row">
            <span>${c.icon} ${c.short}</span>
            <div class="br-dom-track"><div class="br-dom-fill" style="width:${Math.round(v / 25 * 100)}%"></div></div>
            <span style="text-align:right"><b>${v}</b>/25</span>
          </div>`;
        }).join("")}
      </div>
      <div class="b-hist-list">${listHtml}</div>
      <p class="b-disclaimer" style="margin:0">※ 실제 의학·멘사 IQ 검사가 아닌 베니 아케이드 논리 평가 점수입니다.</p>`;
    $("histModal").hidden = false;
  }

  let arenaOffs = [];

  // ── 친구랑 (같은 문제 시드 8문제 동시 대결) ─────────────────────────────────
  function friendOpts() {
    const tierLbl = cfg => ({ easy: "🐣 초급", normal: "🐱 중급", hard: "🐯 고급" }[(cfg && cfg.tier) || "normal"] || "🐱 중급");
    return {
      game: "brain",
      title: "🧠 베니 두뇌 랩 친구 대결",
      min: 2,
      max: 8,
      describe: (n, cfg) => `${n}명이 같은 문제 8개(${tierLbl(cfg)})로 실시간 정확도·속도 대결을 펼칩니다!`,
      settings: {
        defaults: { tier: tier || "normal" },
        label: cfg => `같은 문제 8개 · ${tierLbl(cfg)}`,
        render: (box, cfg, canEdit, update) => {
          const cur = (cfg && cfg.tier) || "normal";
          if (!canEdit) {
            box.innerHTML = `<p class="arn-soft" style="text-align:center">${tierLbl(cfg)}</p>`;
            return;
          }
          box.innerHTML = `<div class="optrow"><span class="small">난이도</span>
            <div class="seg" id="arTier">
              ${[["easy", "초급"], ["normal", "중급"], ["hard", "고급"]].map(([id, nm]) =>
                `<button type="button" class="btn${cur === id ? " active" : ""}" data-t="${id}">${nm}</button>`
              ).join("")}
            </div>
          </div>`;
          box.querySelectorAll("#arTier button").forEach(b => {
            b.onclick = () => {
              if (update) update({ tier: b.dataset.t });
              box.querySelectorAll("#arTier button").forEach(x => x.classList.toggle("active", x === b));
            };
          });
        },
      },
      onStart: ctx => {
        arenaOffs.forEach(f => { try { f(); } catch (e) {} });
        arenaOffs = [];
        arenaCtl = ctx;
        const net = ctx.net;
        const isHost = ctx.role === "host";
        myUid = ctx.uid || net.uid;

        const handleMsg = (from, msg) => {
          if (!msg || !msg.t) return;
          if (msg.t === "hello" && isHost && run && run.mode === "friend") {
            net.send(from, { t: "init", seed: run.seed, tier: run.tier }, true);
          } else if (msg.t === "init" && !isHost) {
            if (!run || run.seed !== msg.seed) startFriendMatch(msg.seed, msg.tier);
          } else if (msg.t === "prog" && run && run.mode === "friend") {
            const who = String(isHost ? (from || msg.uid) : msg.uid || "").slice(0, 40);
            if (!who || who === "__proto__") return;
            const done = clampNum(msg.done, 8), ok = clampNum(msg.ok, 8);
            run.scoreMap[who] = { done, ok, total: null };
            if (isHost) net.broadcast({ t: "prog", uid: who, done, ok }, true);
            renderScores();
          } else if (msg.t === "done" && run && run.mode === "friend") {
            const who = String(isHost ? (from || msg.uid) : msg.uid || "").slice(0, 40);
            if (!who || who === "__proto__") return;
            const ok = clampNum(msg.ok, 8), total = clampNum(msg.total, 100);
            run.scoreMap[who] = { done: (run.questions && run.questions.length) || 8, ok, total };
            if (isHost) net.broadcast({ t: "done", uid: who, total, ok }, true);
            renderScores();
            maybeSubmitFriendRank(false);
          }
        };

        if (isHost) {
          arenaOffs.push(net.on("msg", (from, msg) => handleMsg(from, msg)));
          const seed = Date.now();
          const t = (ctx.cfg && ctx.cfg.tier) || "normal";
          startFriendMatch(seed, t);
          net.broadcast({ t: "init", seed, tier: t }, true);
        } else {
          arenaOffs.push(net.on("msg", msg => handleMsg(null, msg)));
          run = { mode: "friend", seed: 0, tier: (ctx.cfg && ctx.cfg.tier) || "normal", questions: [], idx: 0, results: [], curQ: null, scoreMap: Object.create(null) };
          enterPlay("친구랑 두뇌 대결", "문제 불러오는 중…");
          $("stage").innerHTML = `<p style="color:var(--soft);padding:24px">방장이 문제를 준비하는 중입니다…</p>`;
          net.send({ t: "hello" }, true);
        }
      },
    };
  }

  function startFriendMatch(seed, matchTier) {
    clearMemTimer();
    const prevMap = run && run.mode === "friend" ? run.scoreMap : null;
    const qs = B.generateExam(seed, matchTier);
    const sc = Object.create(null);
    if (prevMap) Object.entries(prevMap).forEach(([k, v]) => { if (k !== "__proto__") sc[k] = v; });
    sc[myUid] = { done: 0, ok: 0, total: null };
    run = {
      mode: "friend",
      seed,
      tier: matchTier,
      questions: qs,
      idx: 0,
      results: [],
      curQ: qs[0],
      qStart: Date.now(),
      answered: false,
      myTotal: null,
      rankSent: false,
      scoreMap: sc,
    };
    enterPlay("친구랑 두뇌 대결", `1 / ${qs.length} 문제`);
    renderQuestion();
  }

  function openFriendLobby() {
    if (!window.ArenaUI) return;
    ArenaUI.open(friendOpts());
  }

  // 테스트/외부 hook
  window.__brain = {
    state: () => run,
    history: () => readHistory(),
  };

  initSetupUI();
  if (window.ArenaUI && ArenaUI.checkUrl) ArenaUI.checkUrl(friendOpts());
})();
