/* 베니 서바이벌 · 프로젝트 갤럭시 — 화면 (둥근 16구역 · 힌트 · 관측 · 구역 고르기 · 블랙홀 · 선생님 · 1분 규칙 · 복기) */
(() => {
  "use strict";
  const G = window.SVCores.galaxy;
  const { TE, TN, QN, QE, SEC } = G;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = "방송: 피의 게임 X · 7일차 프로젝트 갤럭시 (10명) — 나무위키 '피의 게임X/7일차' 룰 확인";
  const DIFF = "4~8명이 해요 (방송 10명) · 점수 규칙은 그대로지만 사람이 적어 혜성 · 구름에 겹치는 일이 줄어요 · 블랙홀은 방송의 '최고 베팅이 움직임을 정하는' 규칙 없이 구역 1번에서 시작해 라운드마다 한 칸씩 시계 방향 · 코인 교환 · 위치 확인권 · 방어권은 뺐어요 · 관측은 한 라운드에 한 번, 1~8라운드는 모두 같은 연속 8구역, 9~10라운드는 시작 구역을 직접 골라요 (코인으로 구간을 좁히는 규칙은 뺌) · 방송에서 분명하지 않았던 부분(별 에너지 · 행성/위성 다수 편 · 혜성 · 구름 점수)은 가장 단순하게 정했어요: 별은 세 번 고르면 초신성(−5) · 행성과 위성은 고른 사람이 많은 쪽이 +3 적은 쪽 −3 같으면 모두 −3 · 혜성은 혼자 +5 둘 +2 셋 +1 · 구름은 사람이 있는 구름 구역 수만큼(넷 다면 −3) · 시간 제한은 없어요 (친구랑은 차례 시간이 대신해요)";
  const CSS = `
.gx-bar{flex:none;display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;font:700 11.5px/1.3 var(--round);color:var(--soft)}
.gx-bar .p{padding:1px 8px;border-radius:999px;background:rgba(148,163,184,.18);color:#e2e8f0;white-space:nowrap}
.gx-bar .p.bh{background:rgba(168,85,247,.2);color:#e9d5ff}
.gx-bar .p b{color:#fde68a}
.gx-wrap{flex:1 1 auto;min-height:0;display:grid;place-items:center;container-type:size}
.gx-ring{position:relative;width:min(100cqw,100cqh,340px);aspect-ratio:1}
.gx-ring::before{content:"";position:absolute;inset:12%;border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(30,41,59,.9),rgba(15,23,42,.55));box-shadow:inset 0 0 0 1px rgba(148,163,184,.25)}
.gx-s{position:absolute;width:13.8%;aspect-ratio:1;transform:translate(-50%,-50%);display:grid;place-items:center;border-radius:50%;border:2px solid rgba(148,163,184,.4);background:#0f172a;color:#cbd5e1;padding:0;cursor:default;font-family:var(--round);line-height:1}
.gx-s i{position:absolute;top:-1px;left:50%;transform:translateX(-50%);font:800 9px var(--round);font-style:normal;color:#94a3b8}
.gx-s.q i{position:static;transform:none;font:800 13px var(--round);color:#94a3b8}
.gx-s:not(.q) b{margin-top:6px;font-size:min(17px,4.6vw)}
.gx-s b{font-size:min(20px,5.4vw);font-weight:600}
.gx-s.q b{display:none}
.gx-s.go{cursor:pointer}
.gx-s.go:active{transform:translate(-50%,-50%) scale(.94)}
.gx-s.dis{opacity:.3}
.gx-s.t0{background:#78350f;border-color:#fbbf24}.gx-s.t1{background:#1e3a8a;border-color:#60a5fa}.gx-s.t2{background:#334155;border-color:#94a3b8}
.gx-s.t3{background:#155e75;border-color:#22d3ee}.gx-s.t4{background:#4c1d95;border-color:#a78bfa}.gx-s.t5{background:#3f1d1d;border-color:#f87171}.gx-s.t6{background:#1f2937;border-color:#9ca3af}
.gx-s.ghost b{opacity:.35}
.gx-s.bh{box-shadow:0 0 0 3px rgba(168,85,247,.6)}
.gx-s.bhc::after{content:"🌀";position:absolute;right:-5px;bottom:-5px;font-size:12px}
.gx-s.hw{border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.7)}
.gx-s.bh.hw{box-shadow:0 0 0 2px rgba(56,189,248,.8),0 0 0 5px rgba(168,85,247,.5)}
.gx-s.mine{border-style:dashed;border-color:#fde68a}
.gx-s.sel{border-color:#facc15;box-shadow:0 0 0 3px rgba(250,204,21,.85)}
.gx-s .pay{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);font:800 9px var(--round);color:#fca5a5;background:#1e1b2e;border-radius:6px;padding:0 3px}
.gx-s .cnt{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;border-radius:9px;background:#e2e8f0;color:#0f172a;font:800 10px/17px var(--round);text-align:center;padding:0 3px}
.gx-s .dl{position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);font:900 10.5px var(--round);border-radius:6px;padding:0 4px;white-space:nowrap}
.gx-s .dl.pos{background:#166534;color:#bbf7d0}.gx-s .dl.neg{background:#7f1d1d;color:#fecaca}.gx-s .dl.zero{background:#334155;color:#cbd5e1}
.gx-c{position:absolute;left:50%;top:50%;width:56%;transform:translate(-50%,-50%);text-align:center;font:700 11.5px/1.35 var(--round);color:#cbd5e1}
.gx-c b{color:#fde68a;font-size:13px}
.gx-hs{flex:none;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;}
.gx-h.more{border-style:dashed;color:#94a3b8}
.gx-h{border:1px solid rgba(148,163,184,.4);background:rgba(148,163,184,.1);color:#e2e8f0;border-radius:10px;padding:2px 7px;font:700 11px/1.35 var(--round);cursor:pointer;min-height:24px}
.gx-h.k{border-color:rgba(250,204,21,.55);background:rgba(250,204,21,.1);color:#fde68a}
.gx-h.on{box-shadow:0 0 0 2px rgba(56,189,248,.8)}
.gx-pn{flex:none;display:flex;flex-direction:column;gap:6px;align-items:stretch}
.gx-note{text-align:center;font-size:12px;line-height:1.4;color:var(--soft)}
.gx-note b{color:#fde68a}
.gx-qs{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.gx-q{min-height:46px;border-radius:12px;border:2px solid rgba(148,163,184,.4);background:rgba(148,163,184,.1);color:#e2e8f0;font:700 10.5px/1.25 var(--round);cursor:pointer;padding:2px 0}.gx-q span{display:block;font-size:17px}
.gx-q.sel{border-color:#facc15;background:rgba(250,204,21,.16)}
.gx-q:disabled{opacity:.35}
.gx-btns{display:grid;grid-template-columns:1.5fr 1fr;gap:6px}
.gx-btns .btn{min-height:44px}
.gx-rs{display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;font:600 11.5px/1.35 var(--round);color:#cbd5e1}
.gx-rs .me{color:#fde68a}
.gx-rs b.pos{color:#86efac}.gx-rs b.neg{color:#fca5a5}
.gx-rs .it{display:flex;gap:4px;align-items:baseline;min-width:0}.gx-rs .it span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.gx-rr{display:grid;grid-template-columns:auto 1fr auto auto;gap:4px 8px;align-items:center;font:600 13px/1.4 var(--round)}
.gx-rr .rk{font-weight:900;color:#fde68a}.gx-rr .d{font-size:10.5px;color:#94a3b8;grid-column:2/5}
.gx-rr .me{color:#fde68a}
.gx-tut{display:flex;flex-direction:column;align-items:center;gap:8px;width:100%}
.gx-tut .gx-ring{width:min(100%,250px);min-width:0}
.gx-tut .gx-s b{font-size:15px}
.gx-tmsg{font-size:12.5px;line-height:1.4;text-align:center;color:var(--soft);min-height:34px}
`;
  let styled = false;
  function style() { if (styled || typeof document === "undefined") return; styled = true; const el = document.createElement("style"); el.textContent = CSS; document.head.appendChild(el); }

  // ── 조사 · 이름 ──
  const jongOf = raw => {
    const s = String(raw).replace(/<[^>]*>/g, "").replace(/[\s)\]"'.,!?…·]+$/, ""), ch = s.slice(-1), c = ch.charCodeAt(0);
    if (!ch) return 0;
    if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (/[0-9]/.test(ch)) return "178".includes(ch) ? 2 : "036".includes(ch) ? 1 : 0;
    if (/[A-Za-z]/.test(ch)) return "lLrR".includes(ch) ? 2 : "mMnN".includes(ch) ? 1 : 0;
    return 0;
  };
  const JO = { ga: ["이", "가"], un: ["은", "는"], ul: ["을", "를"], wa: ["과", "와"], ie: ["이에요", "예요"] };
  const josa = (raw, k) => (k === "ro" ? (jongOf(raw) === 1 ? "으로" : "로") : JO[k][jongOf(raw) ? 0 : 1]);
  const J = (raw, k) => `${esc(raw)}${josa(raw, k)}`;
  let NAMES = [];
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const sgn = x => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "0");
  const wTxt = w => `${w + 1}~${(w + 7) % SEC + 1}번`;
  const QS = ["별", "행성계", "혜성", "구름", "왜소", "먼지"];
  const PHN = { obs: "관측", pick: "구역 고르기", show: "결과", end: "끝" };
  const cls = x => (x > 0 ? "pos" : x < 0 ? "neg" : "zero");

  // ── 링 (화면 · 1분 규칙 같이 씀) ──
  // cells[s] = { t: 천체(-1 모름), x: 추가 class, extra: 안쪽 html, go: 눌러짐 }
  function ringMarkup(cells, center) {
    let h = `<div class="gx-ring">`;
    for (let s = 0; s < SEC; s++) {
      const c = cells[s], a = (-90 + s * 22.5) * Math.PI / 180, x = 50 + 42 * Math.cos(a), y = 50 + 42 * Math.sin(a);
      const known = c.t >= 0;
      h += `<button type="button" class="gx-s${known ? " t" + c.t : " q"}${c.x || ""}${c.go ? " go" : ""}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" data-s="${s}" ${c.go ? "" : "tabindex=\"-1\" aria-disabled=\"true\""} aria-label="${s + 1}번 구역${known ? " " + TN[c.t] : ""}"><i>${s + 1}</i><b>${known ? TE[c.t] : "?"}</b>${c.extra || ""}</button>`;
    }
    return h + `<div class="gx-c">${center || ""}</div></div>`;
  }

  let S = { key: "", q: -1, w: -1, sel: -1, hl: -1, more: false };

  function render(stage, V, ctx) {
    style();
    NAMES = ctx.seats.map((s, i) => (s && s.name) || `${i + 1}번`);
    const me = ctx.me, watch = me < 0, myTurn = !watch && ctx.canAct && V.needs.includes(me);
    const key = `${ctx.g}|${V.round}|${V.phase}`;
    if (S.key !== key) S = { key, q: -1, w: -1, sel: -1, hl: -1, more: S.more };
    const ph = V.phase, over = V.over, res = V.res;
    const prev = watch ? -1 : V.prev[me];
    const obsMine = myTurn && ph === "obs", pickMine = myTurn && ph === "pick";
    const hwStart = S.hl >= 0 ? S.hl : ph === "obs" ? (V.ow >= 0 ? V.ow : S.w) : -1;
    const inHW = s => hwStart >= 0 && ((s - hwStart + SEC) % SEC) < G.WIN;
    const free = !watch ? V.coins[me] : 0;
    const cells = [];
    for (let s = 0; s < SEC; s++) {
      const rev = V.rev[s], ghost = rev < 0 && V.map ? V.map[s] : -1;
      let x = "", extra = "";
      if (!over && G.dist(V.bh, s) <= 1 && ph !== "show") x += " bh";
      if (!over && ph === "show" && res && res.flip[s]) x += " bh";
      if (!over && V.bh === s && ph !== "show") x += " bhc";
      if (inHW(s)) x += " hw";
      if (rev < 0 && ghost >= 0) x += " ghost";
      if (prev === s && (ph === "obs" || ph === "pick")) x += " mine";
      if (S.sel === s && pickMine) x += " sel";
      let go = false;
      if (pickMine) {
        const c = G.pickCost(prev, s);
        go = c <= free;
        if (!go) x += " dis";
        if (c > 0 && go) extra += `<span class="pay">−${c}</span>`;
      } else if (obsMine && V.ow < 0) go = true;
      if (ph === "show" && res) {
        const k = res.picks.filter(p => p === s).length;
        if (k) { extra += `<span class="cnt">${k}</span><span class="dl ${cls(res.sd[s])}">${sgn(res.sd[s])}</span>`; }
      }
      cells.push({ t: rev >= 0 ? rev : ghost, x, extra, go });
    }
    // 가운데 글
    let center = "";
    if (over) center = "<b>끝!</b><br>결과 창을 확인해요";
    else if (ph === "obs") center = obsMine ? (V.ow >= 0 ? `관측 구간<br><b>${wTxt(V.ow)}</b>` : (S.w >= 0 ? `구간 <b>${wTxt(S.w)}</b>` : "시작 구역을<br>눌러요")) : `관측 구간<br>${V.ow >= 0 ? `<b>${wTxt(V.ow)}</b>` : "자유"}`;
    else if (ph === "pick") center = pickMine ? (S.sel >= 0 ? `<b>${S.sel + 1}번</b><br>${G.pickCost(prev, S.sel) ? `코인 ${G.pickCost(prev, S.sel)}개 더` : "공짜"}` : "고를 구역을<br>눌러요") : "다른 사람을<br>기다려요";
    else if (ph === "show" && res) center = `<b>${res.r}라운드 결과</b><br>블랙홀 ${res.bh + 1}번 중심`;
    // 위 줄
    const bhTxt = `${((V.bh + SEC - 1) % SEC) + 1}~${((V.bh + 1) % SEC) + 1}번`;
    let h = `<div class="gx-bar"><span class="p bh">🌀 ${V.bh + 1}번 중심 (${bhTxt}, 점수 부호 반대)</span>${V.sup ? `<span class="p">💥 초신성</span>` : ""}</div>`;
    h += `<div class="gx-wrap">${ringMarkup(cells, center)}</div>`;
    // 힌트 · 내 관측
    const chips = V.hints.map(x => ({ r: x.r, q: x.q, w: x.w, c: x.c, k: 0 }));
    if (!watch) for (const k of V.know[me] || []) chips.push({ r: k.r, q: k.q, w: k.w, c: k.c, k: 1 });
    chips.sort((a, b) => a.r - b.r || a.k - b.k);
    const CAP = 5, shown = S.more ? chips : chips.slice(-CAP);
    if (chips.length) h += `<div class="gx-hs">${chips.length > CAP ? `<button type="button" class="gx-h more" data-more="1">${S.more ? "접기" : `앞의 ${chips.length - CAP}개 보기`}</button>` : ""}${shown.map(x => `<button type="button" class="gx-h${x.k ? " k" : ""}${S.hl === x.w && hwStart === x.w ? " on" : ""}" data-hl="${x.w}" title="${x.r}라운드 ${x.k ? '내 관측' : '힌트'}: ${wTxt(x.w)} 안에 ${QN[x.q]} ${x.c}개" aria-label="${x.r}라운드 ${x.k ? '내 관측' : '힌트'}: ${wTxt(x.w)} 안에 ${QN[x.q]} ${x.c}개">${x.k ? "🔭" : "💬"} ${x.w + 1}~${(x.w + 7) % SEC + 1} ${QE[x.q]}${x.c}</button>`).join("")}</div>`;
    // 아래 칸
    let pn = "";
    if (over) pn = `<div class="gx-note">10라운드가 끝났어요 · 결과 창에서 순위를 확인해요</div>`;
    else if (ph === "obs") {
      const done = V.obsDone.filter(Boolean).length;
      if (obsMine) {
        const ok = V.coins[me] >= V.oc, ready = S.q >= 0 && (V.ow >= 0 || S.w >= 0) && ok;
        pn = `<div class="gx-note">${ok ? `🔭 <b>관측</b> (코인 ${V.oc}개) · 연속 8구역에 몇 개인지 나만 봐요` : `코인이 모자라 이번엔 관측할 수 없어요 (필요 ${V.oc}개)`}</div>
          ${ok ? `<div class="gx-qs">${QN.map((n, q) => `<button type="button" class="gx-q${S.q === q ? " sel" : ""}" data-q="${q}" aria-label="${n}"><span>${QE[q]}</span>${QS[q]}</button>`).join("")}</div>` : ""}
          <div class="gx-btns"><button type="button" class="btn primary" data-a="obs" ${ready ? "" : "disabled"}>관측 · 코인 ${V.oc}</button><button type="button" class="btn" data-a="skip">관측 안 해요</button></div>`;
      } else pn = `<div class="gx-note">${watch ? "" : V.obsDone[me] ? "나는 마쳤어요 · " : ""}관측 단계 · ${done}/${V.n}명 마침</div>`;
    } else if (ph === "pick") {
      const done = V.picked.filter(Boolean).length;
      if (pickMine) {
        const c = S.sel >= 0 ? G.pickCost(prev, S.sel) : 0;
        pn = `<div class="gx-note">${prev < 0 ? "첫 라운드라 <b>어느 구역이든</b> 공짜예요" : `이전 구역 <b>${prev + 1}번</b> 옆은 공짜 · 더 멀면 칸마다 코인 1개 (남은 코인 ${V.coins[me]})`}</div>
          <div class="gx-btns" style="grid-template-columns:1fr"><button type="button" class="btn primary" data-a="go" ${S.sel >= 0 ? "" : "disabled"}>${S.sel >= 0 ? `${S.sel + 1}번 구역으로${c ? ` · 코인 ${c}` : ""}` : "구역을 눌러요"}</button></div>`;
      } else pn = `<div class="gx-note">${!watch && V.mine != null ? `나는 <b>${V.mine + 1}번</b>을 골랐어요 · ` : ""}${done}/${V.n}명이 골랐어요</div>`;
    } else if (ph === "show" && res) {
      const idx = [...Array(V.n).keys()].sort((a, b) => res.delta[b] - res.delta[a]);
      pn = `<div class="gx-rs">${idx.map(i => `<div class="it${i === me ? " me" : ""}"><span>${esc(i === me ? "나" : NAMES[i])} → ${res.picks[i] + 1}번 ${TE[res.types[res.picks[i]]]}</span><b class="${cls(res.delta[i])}">${sgn(res.delta[i])}${res.flip[res.picks[i]] ? "🌀" : ""}</b></div>`).join("")}</div>
        <div class="gx-note">잠시 뒤 다음 라운드가 시작돼요</div>`;
    }
    h += `<div class="gx-pn">${pn}</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      if (e.target.closest("[data-more]")) { S.more = !S.more; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const hb = e.target.closest("[data-hl]");
      if (hb) { const w = +hb.dataset.hl; S.hl = S.hl === w ? -1 : w; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const qb = e.target.closest("[data-q]");
      if (qb && !qb.disabled) { S.q = +qb.dataset.q; ctx.sfx("tap"); render(stage, V, ctx); return; }
      const sb = e.target.closest(".gx-s.go");
      if (sb) {
        const s = +sb.dataset.s;
        if (pickMine) { S.sel = s; ctx.sfx("tap"); render(stage, V, ctx); } else if (obsMine && V.ow < 0) { S.w = s; S.hl = -1; ctx.sfx("tap"); render(stage, V, ctx); }
        return;
      }
      const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
      const a = b.dataset.a; ctx.sfx("pop");
      if (a === "skip") ctx.act({ t: "skip" });
      else if (a === "obs") ctx.act(V.ow >= 0 ? { t: "obs", q: S.q } : { t: "obs", q: S.q, w: S.w });
      else if (a === "go") ctx.act({ t: "pick", s: S.sel });
    };
  }

  // ── 결과 창 ──
  function result(V, me) {
    if (!V.over) return "";
    const R = V.ranks, order = R.map((r, i) => i).sort((a, b) => R[a] - R[b] || V.coins[b] - V.coins[a] || a - b);
    const nmx = i => esc(i === me ? "나" : NAMES[i] || `${i + 1}번`);
    let h = `<div class="gx-rr">`;
    for (const i of order) {
      const seq = V.hist.map(r => sgn(r.delta[i])).join(" ");
      h += `<span class="rk">${R[i] + 1}위</span><span class="${i === me ? "me" : ""}"><b>${nmx(i)}</b></span><b>${V.score[i]}점</b><span>🪙${V.coins[i]}</span><span class="d">${seq}</span>`;
    }
    h += `</div><div class="gx-note" style="margin-top:6px">점수가 같으면 남은 코인이 많은 쪽이 앞이에요</div>`;
    return h;
  }

  // ── AI 선생님 (보이는 것만) ──
  function topType(E, s) {
    const cnt = Array(7).fill(0); let tot = 0;
    for (const x of E.smp) { cnt[x.m[s]] += x.w; tot += x.w; }
    let b = 0; for (let t = 1; t < 7; t++) if (cnt[t] > cnt[b]) b = t;
    return { t: b, p: tot ? cnt[b] / tot : 0, cnt, tot };
  }
  function coach(V, me, since, names) {
    const out = { opp: "", mine: "", rec: "", why: "" };
    const last = V.hist[V.hist.length - 1];
    if (last) {
      const ds = [...Array(V.n).keys()].filter(i => i !== me).map(i => `${nm(names, i)} ${last.picks[i] + 1}번 ${TE[last.types[last.picks[i]]]} ${sgn(last.delta[i])}`);
      out.opp = `👀 지난 라운드: ${ds.join(" · ")}. 상대는 보통 이전 구역 옆(공짜 3구역)에서 골라요.`;
    } else out.opp = "👀 아직 아무도 고르지 않았어요. 첫 라운드는 모두 어느 구역이든 공짜로 골라요.";
    const above = V.score.filter((s, i) => i !== me && s > V.score[me]).length;
    const prevTxt = V.prev[me] >= 0 ? ` · 이전 ${V.prev[me] + 1}번 (공짜: ${(V.prev[me] + 15) % 16 + 1} · ${V.prev[me] + 1} · ${(V.prev[me] + 1) % 16 + 1}번)` : "";
    out.mine = `📊 내 점수 ${V.score[me]}점 (${above + 1}/${V.n}위) · 코인 ${V.coins[me]}개${prevTxt} · 블랙홀 ${V.bh + 1}번 중심 (${((V.bh + 15) % 16) + 1}~${((V.bh + 1) % 16) + 1}번은 점수 부호 반대) · 힌트 ${V.hints.length}개 · 내 관측 ${(V.know[me] || []).length}번`;
    if (V.over) { out.rec = "끝났어요"; out.why = "결과 창에서 순위를 확인해요"; return out; }
    if (V.phase === "show") { out.rec = "곧 다음 라운드예요"; out.why = "결과를 보고 드러난 구역의 천체를 기억해 두세요."; return out; }
    const myTurn = V.needs.includes(me);
    if (!myTurn) { out.rec = "다른 사람을 기다려요"; out.why = V.phase === "obs" ? "관측은 한 라운드에 한 번만 할 수 있어요." : "모두 고르면 한꺼번에 공개돼요."; return out; }
    const R = G.recommend(V, me);
    if (!R) { out.rec = "기다려요"; out.why = ""; return out; }
    if (V.phase === "obs") {
      if (R.a.t === "obs") {
        const o = R.E.opts.find(x => x.q === R.a.q && (V.ow >= 0 || x.w === R.a.w)) || R.E.opts[0];
        out.rec = `${QN[R.a.q]} 관측 (코인 ${V.oc}개)${V.ow < 0 ? ` · ${wTxt(R.a.w)}` : ""}`;
        out.why = `관측하면 고르는 구역이 나아져서 기대 점수가 약 +${(Math.round(o.voi * 10) / 10).toFixed(1)} 올라요 — 코인 ${V.oc}개(약 ${(Math.round(V.oc * 0.5 * 10) / 10).toFixed(1)}점어치)보다 커서 해 볼 만해요.`;
      } else {
        const E = G.evalObs(V, me, 260, G.recRnd(V, me)), o = E.opts[0];
        out.rec = "이번엔 관측 안 해요";
        out.why = V.coins[me] < V.oc ? `코인 ${V.coins[me]}개로는 관측(${V.oc}개)을 못 해요.` : `가장 좋은 관측도 기대 점수가 약 +${(Math.round(Math.max(0, o ? o.voi : 0) * 10) / 10).toFixed(1)} 오르는 정도라 코인 ${V.oc}개(약 ${(Math.round(V.oc * 0.5 * 10) / 10).toFixed(1)}점어치)보다 작아요. 코인은 멀리 가는 데도 써요.`;
      }
      return out;
    }
    const E = R.E, s = R.a.s, c = G.pickCost(V.prev[me], s), tt = topType(E, s), sorted = E.cand.slice().sort((a, b) => E.ev[b] - E.ev[a]), second = sorted.find(x => x !== s);
    out.rec = `${s + 1}번 구역${c ? ` (코인 ${c}개)` : ""}`;
    out.why = `표본 ${E.smp.length}개로 셈한 기대 점수 ${sgn(Math.round(E.ev[s] * 10) / 10)}점 · 이 구역은 ${TE[tt.t]} ${TN[tt.t]}일 가능성이 약 ${Math.round(tt.p * 100)}%${G.inBH(V.round, s) ? " · 블랙홀 위라 부호가 반대로 바뀌어요" : ""}${second != null ? ` · 다음은 ${second + 1}번 ${sgn(Math.round(E.ev[second] * 10) / 10)}점` : ""}`;
    return out;
  }

  // ── 복기 ──
  const rvNo = () => ({ sev: 0, why: "" });
  function review(V, seat, myA, bestA, info) {
    try {
      if (!V || !myA || !bestA || V.over || V.seat === undefined) return rvNo();
      if (JSON.stringify(myA) === JSON.stringify(bestA) || (info && info.same)) return rvNo();
      let out = rvNo();
      const rnd = G.recRnd(V, seat);
      if (V.phase === "pick" && myA.t === "pick" && bestA.t === "pick") {
        const E = G.evalPick(V, seat, 260, rnd, true), a = E.ev[myA.s], b = E.ev[bestA.s];
        if (a == null || b == null) return rvNo();
        const loss = Math.max(0, b - a);
        out = { sev: Math.min(100, Math.round(loss * 25)), why: `내 ${myA.s + 1}번 기대 ${sgn(Math.round(a * 10) / 10)}점 vs ${bestA.s + 1}번 ${sgn(Math.round(b * 10) / 10)}점 (표본 ${E.smp.length}개 기준${loss < 0.3 ? " — 거의 같아요" : ""})` };
      } else if (V.phase === "obs") {
        const E = G.evalObs(V, seat, 260, rnd), cost = V.oc * 0.5;
        if (myA.t === "obs") {
          const o = E.opts.find(x => x.q === myA.q && (V.ow >= 0 || x.w === myA.w));
          const loss = Math.max(0, cost - (o ? o.voi : 0));
          out = { sev: Math.min(70, Math.round(loss * 20)), why: `${QN[myA.q]} 관측은 기대 +${(Math.round((o ? o.voi : 0) * 10) / 10).toFixed(1)}점인데 코인 ${V.oc}개(약 ${(Math.round(cost * 10) / 10).toFixed(1)}점어치)를 썼어요` };
        } else {
          const t = E.opts[0], gain = t ? Math.max(0, t.voi - cost) : 0;
          out = { sev: Math.min(70, Math.round(gain * 20)), why: `${t ? QN[t.q] : "관측"}을 했다면 기대 +${(Math.round((t ? t.voi : 0) * 10) / 10).toFixed(1)}점 (코인 ${V.oc}개 ≈ ${(Math.round(cost * 10) / 10).toFixed(1)}점어치)` };
        }
      }
      const ok = x => typeof x === "string" && !/undefined|NaN|null|Infinity/.test(x);
      if (!out || typeof out.sev !== "number" || !isFinite(out.sev) || !ok(out.why)) return rvNo();
      return out;
    } catch (e) { return rvNo(); }
  }
  function actText(a, V) {
    if (!a) return "—";
    if (a.t === "skip") return "관측 안 함";
    if (a.t === "obs") return `${QN[a.q]} 관측${a.w != null ? ` (${wTxt(a.w)})` : ""}`;
    if (a.t === "pick") return `${a.s + 1}번 구역`;
    return JSON.stringify(a);
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const base = () => Array.from({ length: SEC }, () => ({ t: -1, x: "", extra: "", go: false }));
    const fill = (spec, extra) => { const c = base(); for (const k in spec) c[k] = Object.assign(c[k], spec[k]); return Object.assign(c, extra); };
    const tut = (ring, msg) => `<div class="gx-tut">${ring}<div class="gx-tmsg">${msg}</div></div>`;
    const all = fill({ 0: { t: 0 }, 3: { t: 3 }, 5: { t: 3 }, 6: { t: 1 }, 7: { t: 2 }, 9: { t: 4 }, 10: { t: 4 }, 12: { t: 5 }, 14: { t: 6 } });
    return [
      { tag: "STEP 1 · 목표", title: "숨은 천체를 읽고 점수 1등", body: "둥근 우주에 <b>16구역</b>이 있고 구역마다 천체가 하나씩 숨어 있어요. <b>10라운드</b> 동안 라운드마다 구역 하나를 비밀로 골라요. 모두 고르면 한꺼번에 공개되고, 고른 구역의 천체대로 점수를 받아요. 점수가 가장 높은 사람이 1등이에요.",
        boardHtml: tut(ringMarkup(all, "<b>16구역</b><br>10라운드"), "천체: ⭐ 별 1 · 🪐 행성 1 · 🌙 위성 2 · ☄️ 혜성 3 · ☁️ 쌍둥이 구름 4 · 🌑 왜소행성 2 · ✨ 우주먼지 3"), ms: 7000 },
      { tag: "STEP 2 · 점수", title: "천체마다 점수가 달라요", body: "⭐ <b>별 +5</b> (세 번 골라지면 초신성이 돼 −5) · 🪐🌙 <b>행성/위성</b>: 고른 사람이 더 많은 쪽 +3, 적은 쪽 −3 · ☄️ <b>혜성</b>: 혼자면 +5, 둘이면 +2씩, 셋이면 +1씩 · ☁️ <b>구름</b>: 사람이 있는 구름 구역 수만큼 (넷 다면 −3) · 🌑 <b>왜소행성 −2</b> · ✨ <b>우주먼지 0</b>.",
        boardHtml: tut(ringMarkup(fill({ 0: { t: 0, extra: '<span class="dl pos">+5</span>' }, 3: { t: 3, extra: '<span class="dl pos">+5</span>' }, 12: { t: 5, extra: '<span class="dl neg">−2</span>' }, 14: { t: 6, extra: '<span class="dl zero">0</span>' } }), "고른 구역의<br>천체대로"), "혼자 고른 혜성은 +5, 둘이 같이 고르면 +2씩이라 겹치면 손해예요"), ms: 8000 },
      { tag: "STEP 3 · 정보", title: "힌트와 관측으로 천체를 추리해요", body: "홀수 라운드마다 모두에게 <b>힌트</b>가 하나 나와요 (예: 3~10번 안에 ☄️ 2개). 코인을 내고 <b>관측</b>하면 연속 8구역 안에 고른 천체가 몇 개인지 나만 알 수 있어요. 규칙도 단서예요: 혜성은 <b>짝수 번호</b>에만, 구름은 <b>이웃한 둘씩</b>, 행성과 위성은 <b>8구역 안</b>에 모여 있어요.",
        boardHtml: tut(ringMarkup(fill({ 2: { x: " hw" }, 3: { x: " hw" }, 4: { x: " hw" }, 5: { x: " hw" }, 6: { x: " hw" }, 7: { x: " hw" }, 8: { x: " hw" }, 9: { x: " hw" } }), "💬 3~10번<br>☄️ 2개"), "관측 비용은 1라운드 10코인에서 라운드마다 1씩 내려가요 (코인은 처음에 30개)"), ms: 8000 },
      { tag: "STEP 4 · 직접", title: "블랙홀 위에서는 점수가 반대!", body: "🌀 <b>블랙홀</b>은 1번에서 시작해 라운드마다 한 칸씩 시계 방향으로 가요. 블랙홀 구역과 양옆 <b>3구역</b>에서는 받는 점수의 부호가 뒤집혀요. <b>이번 라운드에 점수를 가장 많이 받는 구역</b>을 눌러 보세요.",
        interactive: { hint: "👆 블랙홀 때문에 뒤집히는 점수까지 따져서 골라요", doneText: "✅ 블랙홀 위의 왜소행성은 −2 → +2!" },
        render(stage, ctrl) {
          // 5번 구역 = 블랙홀 중심 (4~6번이 뒤집힘): 4번 별 → −5 · 5번 왜소행성 → +2 · 6번 우주먼지 → 0 · 10번 왜소행성 → −2
          const spec = { 3: { t: 0 }, 4: { t: 5 }, 5: { t: 6 }, 9: { t: 5 }, 12: { t: 6 } };
          let msg = "별 · 왜소행성 · 우주먼지가 드러나 있어요. 블랙홀(보라 테두리)은 4~6번이에요.", done = false;
          const draw = () => {
            const c = fill(spec); for (const k of [3, 4, 5]) c[k].x = (k === 4 ? " bh bhc" : " bh"); for (const k in spec) c[k].go = !done;
            stage.innerHTML = tut(ringMarkup(c, "점수가 가장<br>큰 구역?"), msg);
          };
          stage.onclick = e => {
            if (done) return;
            const b = e.target.closest(".gx-s.go"); if (!b) return;
            const s = +b.dataset.s;
            if (s === 4) { done = true; msg = "맞아요! 왜소행성의 −2가 블랙홀에 뒤집혀 <b>+2</b>예요. 별의 +5는 −5로 뒤집히니 조심!"; ctrl.sfx("win"); draw(); ctrl.complete(); return; }
            ctrl.sfx("tap");
            msg = s === 3 ? "4번 별은 +5지만 블랙홀 위라 <b>−5</b>가 돼요. 다시!" : s === 5 ? "우주먼지는 0점이라 뒤집어도 0이에요. 다시!" : s === 9 ? "블랙홀 밖의 왜소행성은 그대로 −2예요. 다시!" : "블랙홀 밖의 우주먼지는 0점이에요. 다시!";
            draw();
          };
          draw();
        } },
      { tag: "STEP 5 · 이동", title: "다음 구역은 이전 구역 옆", body: "1라운드는 어느 구역이든 골라요. 2라운드부터는 <b>이전에 고른 구역 바로 옆(양쪽)이나 같은 구역</b>이 공짜이고, 더 멀리 가려면 <b>한 칸 더마다 코인 1개</b>가 들어요. 코인은 관측에도 써서, 정보를 살지 멀리 갈지 정해야 해요.",
        boardHtml: tut(ringMarkup(fill({ 5: { x: " mine" }, 4: { x: " sel" }, 6: { x: " sel" }, 8: { extra: '<span class="pay">−2</span>' } }), "5번에서<br>4 · 5 · 6번 공짜"), "예: 5번을 골랐다면 8번은 코인 2개"), ms: 7000 },
      { tag: "STEP 6 · 끝", title: "10라운드 뒤 점수 1등", body: "10라운드가 끝났을 때 <b>점수가 가장 높은 사람</b>이 1등이에요. 점수가 같으면 <b>남은 코인</b>이 많은 쪽이 앞서요. 다른 사람이 어디를 고를지도 생각해 보세요 — 혜성은 혼자일 때만 크고, 구름과 행성 쪽은 사람 수가 점수를 정해요.",
        boardHtml: tut(`<div style="font-size:54px">🏆</div>`, "남들이 많이 몰릴 곳은 피하는 것도 실력이에요"), ms: 7000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.galaxy = {
    name: "프로젝트 갤럭시", emoji: "🪐", short: "숨은 천체를 추리해 구역을 고르는 4~8명 심리전", min: 4, max: 8, defN: 5, board: false, fitCoach: true,
    opts: [],
    src: SRC, diff: DIFF,
    howto: [
      "🎯 목표: 10라운드 동안 구역을 골라 <b>점수 1등</b> (같으면 남은 코인이 많은 쪽)",
      "준비물: 둥근 우주 16구역 · 숨은 천체 16개 (⭐1 🪐1 🌙2 ☄️3 ☁️4 🌑2 ✨3) · 코인 30개",
      "진행: 라운드마다 ① 🔭 관측 (코인을 내고 고른 천체가 연속 8구역에 몇 개인지 묻기, 나만 봐요) ② 구역 하나를 비밀로 고르기 → 한꺼번에 공개돼 점수. 홀수 라운드마다 모두에게 힌트가 나와요",
      "이동: 1라운드는 아무 구역 · 2라운드부터는 이전 구역 옆이 공짜, 더 멀면 칸마다 코인 1개",
      "점수: ⭐ +5 (세 번 골라지면 초신성 −5) · 🪐🌙 많이 고른 쪽 +3 · 적은 쪽 −3 · ☄️ 혼자 +5 · 둘 +2 · 셋 +1 · ☁️ 사람 있는 구름 수만큼 (넷 다면 −3) · 🌑 −2 · ✨ 0",
      "🌀 블랙홀: 1번에서 시작해 라운드마다 한 칸씩 · 블랙홀과 양옆 3구역의 점수는 부호가 반대",
      SRC, "※ 방송과 다른 점: " + DIFF,
    ],
    sub: V => (V.over ? "끝" : `${V.round}/${V.rounds} 라운드 · ${PHN[V.phase] || ""}`),
    chip: (V, i) => ({ t: `${V.score[i]}점 · 🪙${V.coins[i]}`, on: !V.over && (V.needs || []).includes(i), out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => G.ai(V, me, "normal", rnd),
  };
})();
