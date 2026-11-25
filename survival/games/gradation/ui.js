/* 베니 서바이벌 · 그라데이션 — 화면 (큐브 7개 넣기 · 어두운→밝은 통 7개 · 선/후공 · 숫자 공개 · 1분 규칙) */
(() => {
  "use strict";
  const G = window.SVCores.gradation;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SUM = a => a.reduce((x, y) => x + y, 0);
  const NK = 7, MAXSUM = 30;
  const CSS = `
.gr-top{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap}
.gr-pill{font:800 12.5px var(--round);color:#fff;background:rgba(124,58,237,.3);border:1px solid #c4b5fd;border-radius:99px;padding:4px 10px;white-space:nowrap}
.gr-pill.fire{background:rgba(234,88,12,.28);border-color:#fdba74;color:#ffedd5}
.gr-pill.gold{background:rgba(245,179,1,.18);border-color:rgba(245,179,1,.5);color:#fde68a}
.gr-side{border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:14px;padding:7px 8px;display:grid;gap:6px;flex:none}
.gr-side.me{border-color:rgba(134,239,172,.35);background:rgba(34,197,94,.07)}
.gr-side.turn{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.gr-hd{display:flex;align-items:center;gap:6px;font:800 13px var(--round);min-width:0}
.gr-hd b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.gr-hd i{font-style:normal;font-size:11px;color:#fde68a;white-space:nowrap}
.gr-lead{font:800 11px var(--round);background:#fbbf24;color:#3b2a00;border-radius:99px;padding:1px 8px;white-space:nowrap}
.gr-pts{margin-left:auto;font:900 24px var(--round);color:#fde68a;font-variant-numeric:tabular-nums;line-height:1}
.gr-pts small{font-size:11px;color:var(--soft);font-weight:700;margin-left:2px}
.gr-bs{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.gr-b{position:relative;display:grid;place-items:center;height:48px;border-radius:10px 10px 6px 6px;font:900 20px var(--round);border:2px solid rgba(255,255,255,.2);transition:transform .15s,opacity .2s;user-select:none}
.gr-b.sm{height:40px;font-size:17px}
.gr-b.used{opacity:.5}
.gr-b.pick{cursor:pointer;border-color:#fde68a;box-shadow:0 0 0 1px rgba(253,230,138,.55)}
.gr-b.pick:active{transform:translateY(2px)}
.gr-b.now{transform:translateY(-6px);border-color:#fde68a;box-shadow:0 7px 10px rgba(0,0,0,.45);opacity:1}
.gr-b.win{border-color:#4ade80;box-shadow:0 0 0 2px #4ade80;opacity:1}
.gr-b.lose{border-color:#f87171;opacity:1}
.gr-b.tie{border-color:#cbd5e1;opacity:1}
.gr-b.empty{background:rgba(255,255,255,.05)!important;color:var(--soft)!important;border-style:dashed}
.gr-b.q{font-size:17px}
.gr-b i{position:absolute;left:3px;top:1px;font:700 9px var(--round);font-style:normal;opacity:.55}
.gr-dir{display:flex;justify-content:space-between;font-size:10.5px;color:var(--soft);padding:0 2px}
.gr-edit{display:grid;gap:7px;border:1px solid rgba(134,239,172,.35);background:rgba(34,197,94,.07);border-radius:14px;padding:8px 9px;flex:none}
.gr-edit .sum{display:flex;justify-content:space-between;font:800 13px var(--round);color:#bbf7d0}
.gr-edit .sum b.bad{color:#f87171}
.gr-pal{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.gr-pal button{position:relative;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:8px 0 6px;font:900 19px var(--round);cursor:pointer}
.gr-pal button small{display:block;font:700 10px var(--round);color:var(--soft);margin-top:1px}
.gr-pal button:disabled{opacity:.28;cursor:not-allowed}
.gr-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px}
.gr-btns .btn{padding:11px 8px;font-size:14px}
.gr-acts{display:grid;gap:7px;margin-top:auto;flex:none}
.gr-acts .note{text-align:center;font-size:12.5px;color:var(--soft)}
.gr-show{display:grid;gap:6px;border:1px solid rgba(245,179,1,.4);background:rgba(245,179,1,.08);border-radius:14px;padding:9px;text-align:center}
.gr-show .vs{display:flex;align-items:center;justify-content:center;gap:12px;font:900 30px var(--round);font-variant-numeric:tabular-nums}
.gr-show .vs span{min-width:44px;padding:2px 10px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(0,0,0,.28)}
.gr-show .vs span.w{border-color:#4ade80;color:#4ade80}
.gr-show .vs span.l{opacity:.6}
.gr-show .vs em{font:700 12px var(--round);color:var(--soft);font-style:normal}
.gr-show .who{font:800 14px var(--round);color:#fde68a}
.gr-show small{color:var(--soft);font-size:12px}
.gr-hist{display:grid;gap:4px;font-size:12.5px}
.gr-hist .r{display:flex;gap:8px;align-items:center;padding:4px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.gr-hist .r b{font:800 12.5px var(--round)}
.gr-hist .r.win{border-color:var(--gold)}
.gr-tut{display:grid;gap:8px;justify-items:center;width:100%}
.gr-tut .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  let lastSeats = [];
  const nameOf = i => (lastSeats[i] && lastSeats[i].name) || `${i + 1}번`;
  const nm = i => esc(nameOf(i));
  // 이름 뒤 조사 (받침 있으면 첫째, 없으면 둘째 · 한글이 아니면 둘 다)
  const josa = (i, a, b) => { const s = nameOf(i), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28 ? a : b) : `${a}(${b})`; };

  // 통 색: 왼쪽(어두움 = 작은 수) → 오른쪽(밝음 = 큰 수)
  const bgOf = k => `hsl(256 52% ${24 + k * 9}%)`;
  const fgOf = k => (k >= 4 ? "#1e1b4b" : "#fff");
  const bucket = (k, t, cls = "", attr = "", xs = "") => `<span class="gr-b${cls}" style="background:${bgOf(k)};color:${fgOf(k)};${xs}"${attr}><i>${k + 1}</i>${t}</span>`;
  const dirHtml = `<div class="gr-dir"><span>◀ 어두움 = 작은 수</span><span>밝음 = 큰 수 ▶</span></div>`;

  // ── 큐브 고르기 계산 ─────────────────────────────────────────
  const counts = cubes => { const c = Array(10).fill(0); cubes.forEach(v => c[v]++); return c; };
  // 지금 고른 큐브 뒤에 d 를 더해도 7개를 합 30 이하로 채울 수 있나
  function canAdd(cubes, d) {
    if (cubes.length >= NK) return false;
    const c = counts(cubes); if (c[d] >= 2) return false;
    c[d]++; const sum = SUM(cubes) + d; let need = NK - cubes.length - 1, add = 0;
    for (let v = 0; v <= 9 && need > 0; v++) { const take = Math.min(2 - c[v], need); add += take * v; need -= take; }
    return need === 0 && sum + add <= MAXSUM;
  }
  const sortedCubes = a => a.slice().sort((x, y) => x - y);

  function editorHtml(cubes, canAct, small) {
    const c = counts(cubes), sum = SUM(cubes), s = sortedCubes(cubes);
    const slots = []; for (let k = 0; k < NK; k++) slots.push(k < s.length ? bucket(k, s[k], (canAct ? " pick" : "") + (small ? " sm" : ""), ` data-del="${k}"`) : bucket(k, "", " empty" + (small ? " sm" : "")));
    const pal = []; for (let d = 0; d <= 9; d++) pal.push(`<button data-add="${d}" ${canAct && canAdd(cubes, d) ? "" : "disabled"}>${d}<small>${2 - c[d]}개 남음</small></button>`);
    return `<div class="gr-bs">${slots.join("")}</div>${dirHtml}<div class="sum"><span>${cubes.length}/7개</span><b class="${sum > MAXSUM ? "bad" : ""}">합 ${sum} / ${MAXSUM}</b></div><div class="gr-pal">${pal.join("")}</div>`;
  }

  // ── 보드 ─────────────────────────────────────────────────────
  let SEL = null;
  const selFor = (V, ctx) => { const key = `${ctx.g}|${V.match}`; if (!SEL || SEL.key !== key) SEL = { key, cubes: [] }; return SEL; };

  function sideHtml(V, ctx, seat, isMe) {
    const arr = (isMe && V.mine) ? V.mine : (V.all && V.all[seat]) || null;
    const placed = V.setupDone[seat], inPlay = V.phase === "play" || V.phase === "show" || V.phase === "mshow";
    const R = V.res, showing = V.phase === "show" && R;
    const canPick = isMe && ctx.canAct && V.phase === "play";
    let bs = "";
    for (let k = 0; k < NK; k++) {
      if (!placed && V.phase === "setup") { bs += bucket(k, "", " empty"); continue; }
      const used = V.used[seat][k], rv = V.rev[seat][k];
      const sel = (V.phase === "play" || V.phase === "show") && V.sub[seat] === k;
      const val = used ? rv : (arr ? arr[k] : null);
      let cls = "", t = val === null ? "?" : val;
      if (val === null) cls += " q";
      if (used) cls += " used";
      if (sel) cls += " now";
      if (showing && sel) cls += R.win === seat ? " win" : R.win < 0 ? " tie" : " lose";
      if (canPick && !used) cls += " pick";
      bs += bucket(k, t, cls, canPick && !used ? ` data-pick="${k}"` : "");
    }
    const turn = V.needs.includes(seat) && V.phase !== "setup";
    const tag = V.phase === "setup" ? (placed ? "✓ 큐브 넣음" : "큐브 고르는 중…") : "";
    const editing = isMe && V.phase === "setup" && !placed && ctx.canAct;       // 아래 편집 칸이 같은 통을 보여 주니 여기선 줄임
    const mark = isMe && nameOf(seat) !== "나" ? " (나)" : "";
    return `<div class="gr-side${isMe ? " me" : ""}${turn ? " turn" : ""}"><div class="gr-hd"><b>${nm(seat)}${mark}</b>${(V.phase === "play" || V.phase === "show") && V.lead === seat ? `<span class="gr-lead">선</span>` : ""}<i>${tag}${V.wins[seat] ? ` 🏅${V.wins[seat]}승` : ""}</i><span class="gr-pts">${V.pts[seat]}<small>점</small></span></div>${editing ? "" : `<div class="gr-bs">${bs}</div>`}</div>`;
  }

  function showHtml(V) {
    const R = V.res; if (!R) return "";
    const w = R.win;
    return `<div class="gr-show"><div class="vs"><span class="${w === R.lead ? "w" : w >= 0 ? "l" : ""}">${R.vl}</span><em>${R.win < 0 ? "=" : R.vl > R.vf ? "&gt;" : "&lt;"}</em><span class="${w === R.foll ? "w" : w >= 0 ? "l" : ""}">${R.vf}</span></div><div class="who">${w < 0 ? "🤝 비겼어요 — 점수는 그대로, 선도 그대로" : `${nm(w)}${josa(w, "이", "가")} 1점!${w === R.lead ? " 선을 지켜요" : " 다음 라운드 선이 돼요"}`}</div><small>선 ${nm(R.lead)} ${R.pl + 1}번 통 · ${nm(R.foll)} ${R.pf + 1}번 통</small></div>`;
  }
  function mshowHtml(V) {
    const m = V.mres; if (!m) return "";
    let msg;
    if (m.forced) msg = `⏱ 대결이 너무 길어져서 마쳐요 — 대결 승수 · 득점이 가장 많은 <b>${nm(m.winner)}</b>${josa(m.winner, "이", "가")} 결승 진출! (1등)`;
    else if (m.over) msg = `🏆 <b>${nm(m.winner)}</b>${josa(m.winner, "이", "가")} 2연승 — 결승 진출! (1등)`;
    else if (m.rematch) msg = "🤝 똑같이 비겼어요 — 같은 두 사람이 큐브를 다시 넣고 재대결해요";
    else msg = `<b>${nm(m.winner)}</b> 승! 이어서 쉬고 있던 <b>${nm(V.sit)}</b> 와 대결해요 (첫 선은 ${nm(m.winner)})`;
    return `<div class="gr-show"><div class="vs"><span class="${m.winner === m.a ? "w" : m.winner >= 0 ? "l" : ""}">${m.pa}</span><em>:</em><span class="${m.winner === m.b ? "w" : m.winner >= 0 ? "l" : ""}">${m.pb}</span></div><div class="who">${nm(m.a)} vs ${nm(m.b)} — 대결 ${m.m}</div><small>${msg}</small></div>`;
  }

  function render(stage, V, ctx) {
    style(); lastSeats = ctx.seats || lastSeats;
    const me = ctx.me, inDuel = me >= 0 && V.duel.includes(me);
    const top = inDuel ? V.duel.find(x => x !== me) : V.duel[0], bot = inDuel ? me : V.duel[1];
    let h = `<div class="gr-top"><span class="gr-pill">대결 ${V.match}</span><span class="gr-pill">${V.phase === "setup" ? "큐브 넣기" : `${Math.max(1, V.round)} / ${V.rounds} 라운드`}</span>${V.streak >= 0 && !V.over ? `<span class="gr-pill fire">🔥 ${nm(V.streak)} 1승 — 한 번 더 이기면 결승</span>` : ""}${V.sit >= 0 && !V.over ? `<span class="gr-pill gold">💤 ${nm(V.sit)} 쉬는 중</span>` : ""}</div>`;
    const editingNow = inDuel && V.phase === "setup" && !V.setupDone[me] && ctx.canAct;
    h += sideHtml(V, ctx, top, false);
    if (!editingNow) h += dirHtml;                                  // 편집 칸에도 같은 안내가 있음
    h += sideHtml(V, ctx, bot, inDuel);

    let acts = "";
    if (V.over) acts = `<div class="gr-show"><div class="who">🏆 결승 진출: ${V.ranks.map((r, i) => (r === 0 ? nm(i) : "")).join("")}</div><small>나머지 두 사람은 탈락이에요</small></div>`;
    else if (V.phase === "setup") {
      if (inDuel && !V.setupDone[me]) {
        const S = selFor(V, ctx);
        acts = `<div class="gr-edit"><div class="note">큐브 7개 · 합 30 이하 · 같은 수 2개까지 · 알아서 작은 수부터 정렬돼요 (상대에겐 비공개)</div>${editorHtml(S.cubes, ctx.canAct)}<div class="gr-btns"><button class="btn" data-a="rec">🧑‍🏫 추천 배치</button><button class="btn" data-a="clear">비우기</button><button class="btn primary" data-a="ok" ${S.cubes.length === NK ? "" : "disabled"}>이 배치로 시작</button></div></div>`;
      } else if (inDuel) acts = `<div class="note">큐브를 넣었어요 — 상대를 기다려요</div>`;
      else if (me >= 0) acts = `<div class="note">💤 이번엔 쉬어요 — 대결을 눈여겨봐요</div>`;
      else acts = `<div class="note">두 사람이 큐브를 고르는 중…</div>`;
    } else if (V.phase === "show") acts = showHtml(V);
    else if (V.phase === "mshow") acts = mshowHtml(V);
    else if (V.phase === "play") {
      const lead = V.lead, foll = V.foll;
      if (inDuel && ctx.canAct) {
        acts = me === lead ? `<div class="note">내가 선이에요 — 낼 통을 눌러요. 상대는 통의 <b>색(자리)</b>만 보고 숫자는 몰라요</div>`
          : `<div class="note">${nm(lead)} 가 <b>${V.sub[lead] + 1}번째</b> 통(색)을 냈어요 — 이길 수 있는 가장 작은 통을 눌러요</div>`;
      } else if (inDuel) acts = `<div class="note">${me === lead ? nm(foll) + " 가 고르는 중…" : nm(lead) + " 가 먼저 내요…"}</div>`;
      else acts = `<div class="note">${V.needs.length ? V.needs.map(nm).join(" · ") + " 가 고르는 중…" : ""}</div>`;
    }
    h += `<div class="gr-acts">${acts}</div>`;
    stage.innerHTML = h;
    const redo = () => render(stage, V, ctx);
    stage.onclick = e => {
      const bk = e.target.closest("[data-pick]");
      if (bk && ctx.canAct && V.phase === "play") { ctx.sfx("pop"); ctx.act({ t: "play", k: +bk.dataset.pick }); return; }
      if (V.phase !== "setup" || !inDuel || V.setupDone[me]) return;
      const S = selFor(V, ctx);
      const add = e.target.closest("[data-add]");
      if (add && !add.disabled) { const d = +add.dataset.add; if (canAdd(S.cubes, d)) { S.cubes.push(d); S.cubes.sort((a, b) => a - b); ctx.sfx("tap"); redo(); } return; }
      const del = e.target.closest("[data-del]");
      if (del) { S.cubes.splice(+del.dataset.del, 1); ctx.sfx("tap"); redo(); return; }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      if (b.dataset.a === "clear") { S.cubes = []; ctx.sfx("tap"); redo(); }
      else if (b.dataset.a === "rec") { S.cubes = G.chooseSetup("hard", Math.random); ctx.sfx("pop"); redo(); }
      else if (b.dataset.a === "ok" && S.cubes.length === NK) { ctx.sfx("pop"); ctx.act({ t: "setup", v: S.cubes.slice() }); }
    };
  }

  function result(V) {
    if (!V.hist || !V.hist.length) return "";
    return `<div class="gr-hist">${V.hist.map(m => `<div class="r${m.over ? " win" : ""}"><span>대결 ${m.m}</span><b>${nm(m.a)} ${m.pa} : ${m.pb} ${nm(m.b)}</b><span>${m.rematch ? "🤝 재대결" : m.forced ? `⏱ ${nm(m.winner)} 1등` : m.over ? `🏆 ${nm(m.winner)} 2연승` : `${nm(m.winner)} 승`}</span></div>`).join("")}</div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const row = (arr, cls = "") => `<div class="gr-bs" style="width:100%">${arr.map((t, k) => bucket(k, t, cls)).join("")}</div>`;
    return [
      { tag: "STEP 1 · 큐브와 통", title: "큐브 7개를 어두운 통부터 놓아요", body: "숫자 큐브는 <b>0~9 가 각각 2개</b>씩. 그중 <b>7개</b>를 골라 통 7개에 하나씩 넣어요. 통은 <b>왼쪽(어두움)에서 오른쪽(밝음)</b>으로 갈수록 큰 수예요 — 합은 <b>30 이하</b>!",
        boardHtml: `<div class="gr-tut">${row([0, 1, 2, 3, 5, 8, 9])}${dirHtml}<small>합 28 · 상대에게는 숫자가 안 보이고 색만 보여요</small></div>`, ms: 6200 },
      { tag: "STEP 2 · 직접", title: "큐브 7개를 합 30 안쪽으로 골라 봐요", body: "숫자 버튼을 눌러 큐브를 담아요. 9 를 많이 넣고 싶어도 합 30 이 넘으면 못 담아요. <b>7개</b>를 채워 보세요.",
        interactive: { hint: "👆 숫자를 눌러 7개를 채워요 (담은 큐브를 누르면 빼요)", doneText: "✅ 7개 완성! 합이 30 이하라서 쓸 수 있어요" },
        render(stage, ctrl) {
          const cubes = [];
          const draw = () => {
            stage.innerHTML = `<div class="gr-tut gr-edit">${editorHtml(cubes, true)}</div>`;
            if (cubes.length === NK) ctrl.complete();
          };
          stage.onclick = e => {
            const add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]");
            if (add && !add.disabled) { const d = +add.dataset.add; if (canAdd(cubes, d)) { cubes.push(d); cubes.sort((a, b) => a - b); ctrl.sfx("tap"); draw(); } }
            else if (del) { cubes.splice(+del.dataset.del, 1); ctrl.sfx("tap"); draw(); }
          };
          draw();
        } },
      { tag: "STEP 3 · 라운드", title: "통 하나씩 내고 큰 쪽이 1점", body: "선 플레이어가 통을 하나 내면 <b>색(자리)만</b> 보여요. 상대가 통을 내면 둘이 동시에 <b>숫자 공개</b>! 큰 쪽이 1점, 같으면 무승부 (점수 없음). 이긴 사람이 다음 라운드 선이에요.",
        boardHtml: `<div class="gr-tut"><div class="gr-show" style="width:100%"><div class="vs"><span class="w">7</span><em>&gt;</em><span class="l">4</span></div><div class="who">선이 1점 — 선을 지켜요</div></div><small>무승부면 점수도 선도 그대로</small></div>`, ms: 6200 },
      { tag: "STEP 4 · 직접", title: "이길 수 있는 가장 작은 통으로 이겨요", body: "상대가 중간 색(4번째) 통을 냈어요. 중간 색이면 숫자는 <b>4~5 쯤</b>! 내 남은 통 <b>[1 · 3 · 6 · 9]</b> 중, 이길 수 있는 <b>가장 작은 통</b>을 눌러 보세요 (큰 통은 아껴요).",
        interactive: { hint: "👆 6 이 들어 있는 통을 눌러 보세요", doneText: "✅ 6 으로 이기고 9 는 아꼈어요!" },
        render(stage, ctrl) {
          const mine = [1, 3, 6, 9], pos = [1, 3, 5, 6];
          const draw = msg => {
            stage.innerHTML = `<div class="gr-tut"><div class="row"><b>상대</b>${bucket(3, "?", " now q", "", "width:54px")}</div><div class="row"><b>나</b>${mine.map((v, i) => bucket(pos[i], v, " pick", ` data-v="${v}"`, "width:54px")).join("")}</div><small>${msg || "색이 중간이면 숫자도 중간쯤이에요"}</small></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("[data-v]"); if (!b) return;
            const v = +b.dataset.v; ctrl.sfx("tap");
            if (v === 6) { draw("상대 5 vs 내 6 → 이겼어요! 9 는 다음 라운드를 위해 남겼어요"); ctrl.complete(); }
            else if (v === 9) draw("9 도 이기지만 너무 아까워요 — 더 작은 통으로 이길 수 있어요");
            else draw(`${v} 은 상대 숫자(4~5 쯤)보다 작아서 져요`);
          };
          draw();
        } },
      { tag: "STEP 5 · 대결", title: "7라운드 뒤 점수 높은 쪽이 승", body: "통 7개를 한 번씩 다 쓰면 한 대결이 끝나요. 점수가 같으면 큐브를 다시 넣어 <b>재대결</b>! 이긴 사람은 <b>쉬고 있던 사람</b>과 바로 다시 겨뤄요.",
        boardHtml: `<div class="gr-tut"><div class="row"><b>A 4 : 3 B</b><span>→</span><b>A vs C</b></div><small>B 는 쉬어요</small></div>`, ms: 5600 },
      { tag: "STEP 6 · 결승", title: "연속 두 대결을 이기면 1등", body: "대결에서 <b>연달아 두 번</b> 이긴 사람이 결승 진출 = 1등이에요. 한 번 이기고 다음 대결에서 지면 처음부터! 막히면 <b>🧑‍🏫 AI 선생님</b>이 큐브 배치와 낼 통을 알려 줘요.",
        boardHtml: `<div class="gr-tut"><span style="font-size:42px">🏆</span><small>2연승 = 1등 · 나머지 둘은 공동 2등</small></div>`, ms: 5400 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.gradation = {
    name: "그라데이션", emoji: "🌗", short: "숨긴 큐브 7개로 1:1 대결, 연달아 두 번 이기면 1등", min: 3, max: 3, defN: 3, board: false,
    howto: [
      "큐브 7개를 <b>합 30 이하</b>로 골라 어두운 통 → 밝은 통(작은 수 → 큰 수) 순서로 넣어요",
      "1:1 대결 7라운드 — 통 하나씩 내서 <b>큰 숫자가 1점</b>, 같으면 무승부",
      "이긴 사람이 다음 라운드 선 · 선의 통은 <b>색만</b> 보여요",
      "대결에서 이기면 쉬던 사람과 다시 대결 — <b>연달아 두 번</b> 이기면 1등",
    ],
    note: "방송과 다른 점: 3명 고정 (빈 자리는 AI), 첫 대결 두 사람과 첫 선은 무작위, 무승부 대결은 큐브를 새로 넣어 재대결, 12번째 대결에서도 안 끝나면 대결 승수 → 득점 순으로 가려요.",
    sub: V => (V.over ? "끝" : `대결 ${V.match} · ${V.phase === "setup" ? "큐브 넣기" : `${V.round}/${V.rounds} 라운드`}`),
    chip: (V, i) => ({ t: V.sit === i && !V.over ? "💤" : `${V.pts[i]}점${V.wins[i] ? " 🏅" + V.wins[i] : ""}`, on: V.needs.includes(i) && !V.over, out: false }),
    render, result,
    // 🎞️ 복기: 행동 한 줄 글
    actText: (a) => (a && a.t === "setup" ? `큐브 배치 ${(a.v || []).join(" · ")}` : a && a.t === "play" ? `${a.k + 1}번째 통을 냄` : "—"),
    coach: (V, me, since, names) => G.coach(V, me, since, names),
    tutorial,
    qa: (V, me, rnd) => G.ai(V, me, "easy", rnd),
  };
})();
