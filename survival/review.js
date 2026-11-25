/* 베니 서바이벌 — 공용 🎞️ 복기 (review.js)
   판이 끝난 뒤 한 수씩 앞뒤로 되감아 보고, 내 결정마다 '고급 AI 라면' 과 비교해 같음/다름 + 까닭을 보여 줘요.
   · 기록(rec): shell 이 판마다 쌓음 — { v, id, gv, at, mode, n, seed, cfg, seats:[{kind,tier,name,emoji}], me, acts:[{s,a,h}|{adv:1}], fp, ranks }
     같은 seed 에 같은 행동 순서면 같은 판이 되는 core 의 약속을 그대로 씀. 끝 상태의 전체 지문(fp)이 다르면 '재생이 달라요' 로 막음.
   · 저장: 이 기기 localStorage(sv.rev.v1) 최근 10판 — 친구랑에서는 방장이 판이 끝난 뒤 손님에게 rec 를 따로 보내 줌.
   · 화면: index.html 의 #rev(실제 판 화면과 따로) — 네트워크 · 타이머가 실제 판을 갱신해도 복기 화면은 그대로.
   · 게임이 채우는 고리(모두 선택): ui.review(Vbefore, seat, myA, bestA, info) → { sev 0~100, why, my?, best? }  ·  ui.actText(a, Vbefore, names) → 행동 글
   · 손해가 큰 장면(sev ≥ 60, 판마다 큰 순 3개)은 common/mistakes.js 📒 아쉬운 장면에 담고, 거기서 누르면 그 장면부터 연습 판 (?drill=) */
(() => {
  "use strict";
  const KEY = "sv.rev.v1", MAXREC = 10, MAXBYTES = 150000, SEV_MST = 60, K_RUNS = 3;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
  const fp = st => { try { return hash(JSON.stringify(st)); } catch (e) { return ""; } };          // 판 상태 전체의 지문 (숨은 패 · 덱 순서까지)
  const canon = v => (v && typeof v === "object") ? (Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}") : JSON.stringify(v);

  // ── 저장 (이 기기 최근 10판) ──────────────────────────────────
  const loadAll = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter(r => r && r.id && Array.isArray(r.acts)) : []; } catch (e) { return []; } };
  function persist(list) {
    for (let n = 0; n < 8; n++) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
      catch (e) { if (list.length < 2) return false; list.pop(); }                       // 저장 공간이 차면 오래된 것부터 줄임
    }
    return false;
  }
  function save(rec) {
    try {
      if (!rec || !rec.id || !Array.isArray(rec.acts) || !rec.acts.length) return false;
      if (JSON.stringify(rec).length > MAXBYTES) return false;
      const list = loadAll().filter(r => !(r.id === rec.id && r.at === rec.at && r.seed === rec.seed));
      list.unshift(rec); list.length = Math.min(list.length, MAXREC);
      return persist(list);
    } catch (e) { return false; }
  }

  // ── 재생 ─────────────────────────────────────────────────────
  function makeReplay(core, rec) {
    const R = { core, rec, N: rec.acts.length, st: null, k: -1, err: "" };
    const fresh = () => core.init({ n: rec.n, seed: rec.seed, cfg: clone(rec.cfg || {}) });
    const stepOn = (st, e) => { if (e.adv) { core.advance(st); return true; } const r = core.apply(st, e.s, clone(e.a)); return !!(r && r.ok); };
    R.fresh = fresh; R.stepOn = stepOn;
    R.goto = k => {                                                // k = 지금까지 둔 수 (0 = 처음). 앞으로는 이어서, 뒤로는 처음부터 다시
      R.err = "";
      if (!R.st || k < R.k) { R.st = fresh(); R.k = 0; }
      while (R.k < k) {
        if (!stepOn(R.st, rec.acts[R.k])) { R.err = `${R.k + 1}번째 수가 안 먹어요`; return false; }
        R.k++;
      }
      return true;
    };
    R.view = seat => core.view(R.st, seat);
    return R;
  }

  // ── 행동 글 ──────────────────────────────────────────────────
  function genericText(a) {
    if (a == null) return "—";
    if (typeof a !== "object") return String(a);
    const parts = []; if (a.t != null) parts.push(String(a.t));
    for (const k of Object.keys(a)) { if (k === "t") continue; const v = a[k]; if (v == null) continue; if (typeof v === "object") continue; parts.push(`${k} ${v}`); }
    return parts.join(" ") || "행동";
  }
  const actText = (ui, a, V, names) => { try { const t = ui && ui.actText ? ui.actText(a, V, names) : ""; if (t) return String(t); } catch (e) {} return genericText(a); };

  // ── 내 수 비교 (고급 AI 를 다른 씨앗으로 K 번) ───────────────
  function compare(core, ui, rec, st, j, e, names, k) {
    const Vb = core.view(st, e.s);
    const tally = new Map(); let first = null;
    for (let i = 0; i < k; i++) {
      let a = null;
      try { a = core.ai(clone(Vb), e.s, "hard", mulberry((rec.seed ^ Math.imul(j + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0)); } catch (err) { a = null; }
      if (a == null) continue;
      const c = canon(a); if (!tally.has(c)) tally.set(c, { a, n: 0 }); tally.get(c).n++;
      if (!first) first = a;
    }
    if (!tally.size) return null;
    const rows = [...tally.values()].sort((x, y) => y.n - x.n), top = rows[0];
    const mine = canon(e.a), same = tally.has(mine), total = rows.reduce((s, r) => s + r.n, 0);
    let rv = null;
    try { rv = ui && ui.review ? ui.review(clone(Vb), e.s, clone(e.a), clone(top.a), { k: j, names, same, tally: rows.map(r => ({ a: clone(r.a), n: r.n })), total, seed: rec.seed }) : null; } catch (err) { rv = null; }
    const sev = rv && typeof rv.sev === "number" ? Math.max(0, Math.min(100, Math.round(rv.sev))) : (same ? 0 : null);
    return {
      j, s: e.s, same, sev, total, hit: same ? tally.get(mine).n : 0, topN: top.n,
      my: (rv && rv.my) || actText(ui, e.a, Vb, names), best: (rv && rv.best) || actText(ui, top.a, Vb, names),
      why: (rv && rv.why) || "", bestA: top.a, alts: rows.map(r => canon(r.a)),
    };
  }

  // ── 화면 ─────────────────────────────────────────────────────
  let A = null;                                                    // 열려 있는 복기
  const noop = () => ({ ok: false });
  function who(rec) {                                              // 비교할 자리: 혼자 · 친구랑 = 내 자리, 한 기기 = 사람 자리 모두, AI 구경 = 없음
    if (rec.mode === "watch") return new Set();
    if (rec.mode === "local") return new Set(rec.seats.map((s, i) => s.kind === "human" ? i : -1).filter(i => i >= 0));
    return rec.me >= 0 ? new Set([rec.me]) : new Set();
  }
  const isMine = j => { const e = A.rec.acts[j]; return !!(e && !e.adv && e.h && A.who.has(e.s)); };

  function barHtml(N) {
    return `<div class="sv-rlbl" id="revLbl"></div>
      <input id="revRange" class="sv-rrange" type="range" min="0" max="${N}" value="0" aria-label="복기 위치">
      <div class="sv-rctl">
        <button type="button" data-rv="first" aria-label="처음으로">⏮</button>
        <button type="button" data-rv="prev" aria-label="한 수 앞으로">◀</button>
        <button type="button" data-rv="mine" aria-label="다음 내 수">🙋<small>내 수</small></button>
        <button type="button" data-rv="bad" aria-label="다음 아쉬운 수" hidden>⚠<small>아쉬운 수</small></button>
        <button type="button" data-rv="next" aria-label="한 수 뒤로">▶</button>
        <button type="button" data-rv="last" aria-label="끝으로">⏭</button>
      </div>`;
  }
  function nextIdx(from, pred) { for (let p = from + 1; p < A.R.N; p++) if (pred(p)) return p; return -1; }

  function coachHtml() {
    const { R, rec, ui, k } = A, e = rec.acts[k], names = A.names;
    const nm = i => esc(names[i] || `${i + 1}번`);
    let h = "";
    if (A.bad) return `<p>⚠ ${esc(A.bad)}</p>`;
    if (k > 0) { const pe = rec.acts[k - 1]; h += `<p class="sv-cwho">직전: ${pe.adv ? "다음 단계로 넘어감" : `${nm(pe.s)} · ${esc(actText(ui, pe.a, null, names))}`}</p>`; }
    if (!e) return h + `<p>🏁 <b>끝</b> — 마지막 모습이에요. ◀ 로 되돌려 보거나 🙋 로 내 수만 골라 봐요.</p>`;
    if (e.adv) return h + `<p>⏭ 결과를 보여 주고 다음 단계로 넘어가는 곳이에요.</p>`;
    const mine = isMine(k), c = A.cmps[k];
    h += `<p>${mine ? "🙋" : "👀"} <b>${nm(e.s)}</b> 의 수 <b>${esc(actText(ui, e.a, R.view(e.s), names))}</b></p>`;
    if (mine) {
      if (c) {
        const tag = c.same ? `✅ 고급 AI 도 ${c.total}번 중 ${c.hit}번 고른 수예요` : `🔸 고급 AI 는 <b>${esc(c.best)}</b> 쪽을 골랐어요 (${c.total}번 중 ${c.topN}번)`;
        h += `<p>${tag}</p>`;
        if (c.why) h += `<p class="sv-why">👉 ${esc(c.why)}</p>`;
        else if (!c.same) h += `<p class="sv-cwho">같은 수가 아니어도 틀린 것은 아니에요 — 'AI 라면'이에요.</p>`;
        if (c.sev != null && c.sev >= SEV_MST) h += `<p>📒 아쉬운 장면에 담아 뒀어요 (손해 ${c.sev})</p>`;
      } else h += `<p class="sv-cwho">${A.done ? "이 수는 비교하지 못했어요." : "AI 가 이 수를 보는 중…"}</p>`;
    }
    try {
      const sk = A.me >= 0 ? A.me : e.s;
      const Vb = R.view(sk), cch = ui && ui.coach ? ui.coach(clone(Vb), sk, -1, names) : null;
      if (cch && cch.rec && mine) h += `<p class="sv-cwho">그때 선생님: 💡 ${cch.rec}</p>`;
    } catch (err) {}
    return h;
  }

  function draw() {
    if (!A) return;
    const { R, rec, ui } = A;
    let ok = false;
    try { ok = R.goto(A.k); } catch (err) { R.err = "재생 중 오류가 났어요"; }
    A.bad = ok ? "" : (R.err || "재생이 멈췄어요");
    const V = ok ? R.view("all") : null;
    $("revTitle").textContent = `🎞️ ${ui.name} 복기`;
    $("revSub").textContent = `${A.k} / ${R.N} 수`;
    if (V) {
      $("revSeats").innerHTML = rec.seats.map((s, i) => {
        let c = {}; try { c = ui.chip ? ui.chip(V, i, -1) || {} : {}; } catch (e) {}
        const isMe = A.who.has(i) && rec.mode !== "local";
        return `<div class="sv-seat${c.on ? " on" : ""}${c.out ? " out" : ""}${isMe ? " me" : ""}"><span class="av">${esc(s.emoji || "🙂")}</span><span class="nm">${esc(s.name)}</span><span class="pt">${c.t || ""}</span></div>`;
      }).join("");
      try { ui.render($("revStage"), V, { me: -1, act: noop, canAct: false, seats: rec.seats, mode: "watch", fast: 0, coachOn: false, g: -7, wait: false, sfx: () => {}, toast: m => A.toast && A.toast(m) }); }
      catch (e) { console.error("[survival review render]", e); }
    }
    const e = rec.acts[A.k];
    const nm = i => (A.names[i] || `${i + 1}번`);
    $("revLbl").textContent = !ok ? "재생이 멈췄어요" : !e ? "🏁 끝 — 마지막 모습" : e.adv ? "다음: 단계 넘어감" : `다음: ${nm(e.s)} · ${actText(ui, e.a, null, A.names)}${isMine(A.k) ? (A.cmps[A.k] ? (A.cmps[A.k].same ? "  ✅" : "  🔸") : "") : ""}`;
    const rg = $("revRange"); if (rg && +rg.value !== A.k) rg.value = A.k;
    const badBtn = $("revBar").querySelector('[data-rv="bad"]'); if (badBtn) badBtn.hidden = !A.bads.length;
    if (A.coach) { try { A.coach.set(coachHtml()); } catch (err) {} }
    if (A.fit) { try { A.fit($("revStage"), ui); } catch (err) {} }
  }
  function go(k) { if (!A) return; A.k = Math.max(0, Math.min(A.R.N, k | 0)); if (A.sfx) A.sfx("tap"); draw(); }

  function analyze() {                                             // 내 결정마다 고급 AI 와 비교 — 청크로 나눠 폰이 안 버벅이게
    const { R, rec, ui } = A, st = R.fresh(); let j = 0, kRuns = K_RUNS;
    const myIdx = rec.acts.map((e, i) => i).filter(i => isMine(i));
    A.todo = myIdx.length;
    if (!myIdx.length) { A.done = true; return; }
    const tok = A.tok;
    const chunk = () => {
      if (!A || A.tok !== tok) return;
      const t0 = performance.now();
      let redraw = false;
      while (j < R.N && performance.now() - t0 < 24) {
        const e = rec.acts[j];
        if (isMine(j)) {
          const t1 = performance.now();
          let c = null; try { c = compare(R.core, ui, rec, st, j, e, A.names, kRuns); } catch (err) { console.error("[survival review]", err); }
          if (c) { A.cmps[j] = c; if (c.sev != null && c.sev >= SEV_MST) A.bads.push(j); if (j === A.k) redraw = true; }
          if (performance.now() - t1 > 160) kRuns = 1;            // 무거운 AI 는 한 번만
        }
        let stepOk = false; try { stepOk = R.stepOn(st, e); } catch (err) { console.warn("[survival review] 비교용 재생 예외", j, err); }
        if (!stepOk) { console.warn("[survival review] 비교용 재생이 멈춤", j); j = R.N; break; }
        j++;
      }
      if (j < R.N) { if (redraw) draw(); setTimeout(chunk, 0); }
      else finish();                                              // finish() 가 마지막에 한 번 다시 그림
    };
    setTimeout(chunk, 30);
  }
  function finish() {
    if (!A) return;
    A.done = true;
    A.bads.sort((a, b) => A.cmps[b].sev - A.cmps[a].sev);
    // 📒 아쉬운 장면 (큰 순 3개)
    if (A.mst && A.rec.mode !== "watch" && !A.rec.drill) {
      for (const j of A.bads.slice(0, 3)) {
        const c = A.cmps[j]; if (!c) continue;
        try {
          const pre = clone(A.rec); pre.acts = pre.acts.slice(0, j); pre.fp = ""; pre.ranks = null; pre.drill = 1;
          A.mst.add({
            game: "survival", title: `${A.ui.emoji || ""} ${A.ui.name}`, scene: `${j + 1}번째 수 · ${A.names[c.s] || ""}`, my: c.my, best: c.best, why: c.why || "고급 AI 가 더 좋게 본 수예요",
            sev: c.sev, lossText: `손해 ${c.sev}`, drill: { rec: pre, k: j, s: c.s, bestA: c.bestA, alts: c.alts, bestText: c.best },
          });
        } catch (err) {}
      }
    }
    A.bads.sort((a, b) => a - b);
    draw();
  }

  function open(o) {
    close(true);
    const { core, ui, rec } = o;
    if (!rec || !core || !ui) return false;
    const R = makeReplay(core, rec);
    let bad = "";
    try {
      if (!R.goto(R.N)) bad = "이 판은 지금 규칙으로 다시 돌릴 수 없어요 (게임이 업데이트됐을 수 있어요)";
      else if (rec.fp && fp(R.st) !== rec.fp) bad = "이 판은 재생이 달라요 (게임이 업데이트됐을 수 있어요)";
    } catch (e) { bad = "재생 중 오류가 났어요"; }
    if (bad) { if (o.toast) o.toast(bad, 3200); return false; }
    const names = rec.seats.map(s => s.name);
    A = { R, rec, core, ui, names, k: 0, tok: Math.random(), who: who(rec), me: rec.mode === "local" || rec.mode === "watch" ? -1 : rec.me, cmps: {}, bads: [], done: false, bad: "",
      coach: o.coach || null, toast: o.toast, sfx: o.sfx, fit: o.fitStage, mst: o.Mistakes === undefined ? window.Mistakes : o.Mistakes, onClose: o.onClose,
      coachWas: o.coach ? { v: o.coach.visible, c: o.coach.collapsed } : null, playing: document.body.classList.contains("playing") };
    document.body.classList.add("playing");
    $("revBar").innerHTML = barHtml(R.N);
    $("rev").hidden = false;
    if (A.coach) { A.coach.show(); A.coach.collapse(false); }
    A.k = 0; draw();
    analyze();
    return true;
  }
  function close(silent) {
    if (!A) return;
    const a = A; A = null;
    $("rev").hidden = true; $("revStage").innerHTML = ""; $("revStage").classList.remove("sv-coachfit"); $("revStage").style.removeProperty("--sv-sh"); $("revStage").style.paddingBottom = "";
    if (!a.playing) document.body.classList.remove("playing");
    if (a.coach && a.coachWas) { if (!a.coachWas.v) a.coach.hide(); else a.coach.collapse(a.coachWas.c); }
    if (!silent && a.onClose) { try { a.onClose(); } catch (e) {} }
  }

  // 지난 판 목록 (첫 화면)
  function openList(o) {
    const list = loadAll();
    const ov = document.createElement("div");
    ov.className = "overlay"; ov.style.zIndex = 21;
    const modeTxt = { solo: "혼자", local: "한 기기", watch: "AI 구경", online: "친구랑" };
    const fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
    const rows = list.map((r, i) => {
      const m = (o.metaOf && o.metaOf(r.id)) || { emoji: "🎮", name: r.id };
      const res = r.ranks && r.me >= 0 && r.ranks[r.me] != null ? `${r.ranks[r.me] + 1}등` : r.mode === "watch" ? "구경" : "";
      return `<button type="button" class="btn sv-rrow" data-i="${i}"><span>${esc(m.emoji)} <b>${esc(m.name)}</b></span><small>${esc(modeTxt[r.mode] || "")} · ${r.n}명 · ${esc(res)} · ${fmt(r.at)}</small></button>`;
    }).join("");
    ov.innerHTML = `<div><h2>🎞️ 지난 판 복기</h2><p class="small" style="margin:0">이 기기에 최근 ${MAXREC}판까지 남아요.</p>${rows || `<p class="sv-empty">아직 없어요. 한 판 하고 나면 여기에 남아요.</p>`}<button type="button" class="btn" data-x>닫기</button></div>`;
    ov.onclick = e => { if (e.target === ov || e.target.closest("[data-x]")) { ov.remove(); return; } const b = e.target.closest("[data-i]"); if (b) { const r = list[+b.dataset.i]; ov.remove(); if (r && o.onPick) o.onPick(r); } };
    document.body.appendChild(ov);
  }

  // 단추 연결 (한 번만)
  document.addEventListener("click", e => {
    if (!A) return;
    if (e.target.closest && e.target.closest("#revBack")) { if (A.sfx) A.sfx("tap"); close(); return; }
    const b = e.target.closest && e.target.closest("#revBar [data-rv]"); if (!b) return;
    const v = b.dataset.rv, N = A.R.N;
    if (v === "first") go(0);
    else if (v === "prev") go(A.k - 1);
    else if (v === "next") go(A.k + 1);
    else if (v === "last") go(N);
    else if (v === "mine") { let p = nextIdx(A.k, p => isMine(p)); if (p < 0) { p = nextIdx(-1, p => isMine(p)); if (p < 0) { if (A.toast) A.toast("내 수가 없는 판이에요"); return; } else if (A.toast) A.toast("끝까지 봤어요 — 처음 내 수로 돌아가요", 1400); } go(p); }
    else if (v === "bad") { let p = A.bads.find(j => j > A.k); if (p == null) p = A.bads[0]; if (p != null) go(p); }
  });
  document.addEventListener("input", e => { if (A && e.target && e.target.id === "revRange") go(+e.target.value); });

  function refit() { if (A && A.fit) { try { A.fit($("revStage"), A.ui); } catch (err) {} } }
  addEventListener("resize", refit);

  window.SVReview = {
    save, list: loadAll, open, close, openList, fp, canon, makeReplay, refit,
    get active() { return !!A; },
    get stat() { return A ? { k: A.k, N: A.R.N, done: A.done, cmps: Object.keys(A.cmps).length, mine: A.rec.acts.filter((e, i) => isMine(i)).length, bads: A.bads.length, same: Object.values(A.cmps).filter(c => c.same).length, bad: A.bad, mineIdx: A.rec.acts.map((e, i) => i).filter(i => isMine(i)), cmpIdx: Object.keys(A.cmps).map(Number) } : null; },   // 시험용
    MAXREC, SEV_MST,
  };
})();
