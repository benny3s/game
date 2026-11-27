/* 베니 서바이벌 · 히든코드 — 화면 (별 문제 · 주사위 눈 고르기 · 숫자를 칸에 넣어 시험 · 정답 외치기 · 규칙 후보 수첩 · 선생님 · 복기 · 1분 규칙) */
(() => {
  "use strict";
  const K = window.SVCores.hiddencode, RULES = K.RULES, LET = K.LET;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 은 받침, 10 · 20 … 십 · 이십은 받침, 영문 L R M N 도 받침)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const SRC = "피의 게임 3 7일차 데스매치 (1:1:1) · 확인한 자료: 나무위키 '피의 게임3/7일차' 4장 데스매치: 히든코드 (룰 · 1~3라운드 시험 기록 — 숨겨진 규칙 셋 '짝수 칸의 합 · 곱 − 합 · 한글 ㅇ 개수' 가 방송 결과와 같은지 맞춤) · 영상 자막은 문제 진행 확인용";
  const DIFF = "2~3명 (방송 1:1:1 세 명) — 집사 주사위는 5 − 인원개라 숫자는 늘 5개 · 숨겨진 규칙은 방송에 나온 셋(짝수 칸의 합 · 곱 − 합 · 한글 'ㅇ' 개수)을 포함한 12개 목록에서 하나씩 (방송은 목록이 없음) — 이 목록을 '규칙 후보 수첩' 으로 모두에게 보여 줌 · 다 같이 동시에 한 단계씩 (시험 · 외치기 · 넘기기), 한 숫자로 시험은 3번까지 (방송은 제한시간) · 시험 결과는 나만 봄 · 오답 30초 발언권 대신 '다음 한 단계엔 내가 못 외침' · 한 문제 오답 2번이면 더는 못 외침 · 같은 단계에 둘이 맞히면 둘 다 1점 · 숫자 획득이 4번 되풀이돼도 못 맞히면 그 문제는 0점 (방송은 끝없이 반복) · 외치는 것은 결괏값만 (규칙 이름은 안 말함), 틀린 값은 모두에게 공개 · 5라운드 뒤 동점이면 9라운드까지 연장, 그래도 같으면 공동 순위 — 방송 글에 없거나 폰 · AI 때문에 우리가 정함";
  const CSS = `
.hc{display:flex;flex-direction:column;gap:6px;height:100%;min-height:0}
.hc-top{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;font:700 12px/1.2 var(--round);color:var(--soft);flex:none}
.hc-top .rd{font:900 14px var(--round);color:#fde68a;background:rgba(0,0,0,.3);border:1px solid rgba(245,179,1,.35);border-radius:99px;padding:3px 10px;white-space:nowrap}
.hc-top .who{border-radius:99px;padding:2px 8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);white-space:nowrap}
.hc-top .who.ok{color:#86efac;border-color:#86efac}.hc-top .who.me{font-weight:900}
.hc-star{display:flex;gap:5px;flex:none;align-items:stretch}
.hc-star .cap{writing-mode:horizontal-tb;display:flex;align-items:center;font:800 10.5px/1.15 var(--round);color:#fde68a;width:46px;flex:none;text-align:center;justify-content:center}
.hc-c{flex:1 1 0;min-width:0;border-radius:12px;background:rgba(0,0,0,.3);border:2px solid rgba(245,179,1,.4);text-align:center;padding:3px 2px 4px;display:grid;justify-items:center;font-family:var(--round)}
.hc-c i{font:900 10.5px var(--round);color:#fde68a;font-style:normal}.hc-c b{font:900 19px/1.15 var(--round);color:#fff;font-variant-numeric:tabular-nums;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.hc-tiles{display:flex;gap:5px;flex:none}
.hc-t{flex:1 1 0;min-width:0;min-height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:900 24px/1 var(--round);display:grid;justify-items:center;align-content:center;gap:1px;padding:3px 0}
.hc-t small{font:700 10px var(--round);color:var(--soft)}
.hc-t.used{opacity:.3}.hc-t.sel{border-color:#fde68a}.hc-t.q{opacity:.45;border-style:dashed}
.hc-t.mine{border-color:#86efac}
.hc-board{display:flex;gap:5px;flex:none}
.hc-s{flex:1 1 0;min-width:0;min-height:52px;border-radius:12px;border:2px dashed rgba(255,255,255,.28);background:rgba(0,0,0,.2);color:#fff;font-family:var(--round);display:grid;justify-items:center;align-content:center;padding:2px 1px}
.hc-s i{font:900 10.5px var(--round);color:var(--soft);font-style:normal}.hc-s b{font:900 18px/1.1 var(--round);font-variant-numeric:tabular-nums}
.hc-s.act{border-color:#86efac;border-style:solid;background:rgba(34,197,94,.1)}.hc-s.full{border-style:solid}
.hc-tool{display:flex;gap:6px;flex:none}
.hc-tool .btn,.hc-acts .btn{min-height:44px;font-size:13.5px;padding:6px 8px}
.hc-tool .btn{flex:1 1 0}.hc-tool .btn.on{border-color:#86efac;color:#86efac}
.hc-acts{display:grid;grid-template-columns:1.2fr 1.2fr .8fr;gap:6px;flex:none}
.hc-note{font:600 12px/1.35 var(--round);color:var(--soft);text-align:center;flex:none}
.hc-log{display:grid;gap:3px;font-size:12px;min-height:0;flex:none}
.hc-log .r{display:flex;gap:6px;align-items:baseline;padding:3px 7px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08);line-height:1.3;font-variant-numeric:tabular-nums}
.hc-log .r .a{flex:1 1 auto;min-width:0}.hc-log .r .res{font:900 14px var(--round);color:#fde68a;white-space:nowrap}
.hc-log .r.new{border-color:#fde68a}.hc-log .r.bad{border-color:rgba(248,113,113,.5)}.hc-log .r .x{color:var(--soft)}
.hc-dice{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:none}
.hc-dice .btn{min-height:54px;font:900 26px var(--round)}
.hc-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;flex:none}
.hc-pad .btn{min-height:44px;font:900 20px var(--round);padding:4px}
.hc-disp{font:900 28px/1.1 var(--round);text-align:center;color:#fff;background:rgba(0,0,0,.35);border:2px solid #fde68a;border-radius:12px;padding:6px 8px;min-height:44px;font-variant-numeric:tabular-nums;flex:none}
.hc-note-l{display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:11px;line-height:1.25;min-height:0;flex:none}
.hc-note-l .r{display:flex;gap:5px;padding:3px 6px;align-items:flex-start;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.hc-note-l .hc-note{grid-column:1/-1}.hc-note-l .r.off{opacity:.4;text-decoration:line-through}.hc-note-l .r b{color:#fde68a;white-space:nowrap}
.hc-res{display:grid;gap:4px;font-size:12.5px;line-height:1.35;min-height:0;overflow:auto}
.hc-res .big{font:900 15px var(--round);color:#fde68a;text-align:center}
.hc-res .r{padding:4px 8px;border-radius:9px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.08)}
.hc-tut{display:grid;gap:8px;justify-items:center;width:100%}.hc-tut .hc-star,.hc-tut .hc-tiles,.hc-tut .hc-board{width:100%}
.sv-coachfit .hc-note,.sv-coachfit .hc-star .cap{display:none}.sv-coachfit .hc-log .r:first-child{display:none}
.sv-coachfit .hc-t{min-height:38px;font-size:20px}.sv-coachfit .hc-s{min-height:42px}.sv-coachfit .hc-dice .btn{min-height:44px;font-size:22px}.sv-coachfit .hc-c b{font-size:16px}
.sv-coachfit .hc-pad .btn{min-height:40px}.sv-coachfit .hc-disp{font-size:22px;min-height:36px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
  const nameOf = (ctx, i) => (ctx.seats[i] && ctx.seats[i].name) || `${i + 1}번`;
  const MS = "−", fmt = v => (v < 0 ? MS + Math.abs(v) : String(v));
  const KR = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const cellsTxt = (vals) => vals.map((v, i) => (v == null ? "" : `${LET[i]} ${v}`)).filter(Boolean).join(" · ");
  const sel = { key: "", cells: [[], [], [], [], []], act: 0, glue: false, last: -1, pad: false, num: "", notes: false };
  const resetSel = key => { sel.key = key; sel.cells = [[], [], [], [], []]; sel.act = 0; sel.glue = false; sel.last = -1; sel.pad = false; sel.num = ""; };
  const placed = () => sel.cells.reduce((a, c) => a + c.length, 0);
  const nextEmpty = (from) => { for (let k = 1; k <= 5; k++) { const i = (from + k) % 5; if (!sel.cells[i].length) return i; } return from; };
  // 규칙 풀이 한 줄 (라운드가 끝난 뒤 · 선생님 · 복기)
  function explain(ri, star) {
    const id = RULES[ri].id, ev = star.filter(x => x % 2 === 0), od = star.filter(x => x % 2 !== 0), j = (a, s) => a.join(` ${s} `);
    if (id === "sumEven") return ev.length ? `짝수인 칸 ${j(ev, "+")} = ${K.RULES[ri].f(star)}` : "짝수인 칸이 없어 0";
    if (id === "sumOdd") return od.length ? `홀수인 칸 ${j(od, "+")} = ${RULES[ri].f(star)}` : "홀수인 칸이 없어 0";
    if (id === "evenCnt") return `짝수인 칸 ${ev.length}개${ev.length ? ` (${ev.join(", ")})` : ""}`;
    if (id === "sum") return `${j(star, "+")} = ${RULES[ri].f(star)}`;
    if (id === "prod") return `${j(star, "×")} = ${RULES[ri].f(star)}`;
    if (id === "pms") { const p = star.reduce((a, b) => a * b, 1), s = star.reduce((a, b) => a + b, 0); return `곱 ${p} − 합 ${s} = ${fmt(p - s)}`; }
    if (id === "maxmin") return `${Math.max(...star)} − ${Math.min(...star)} = ${Math.max(...star) - Math.min(...star)}`;
    if (id === "max") return `가장 큰 칸 ${Math.max(...star)}`;
    if (id === "min") return `가장 작은 칸 ${Math.min(...star)}`;
    if (id === "digsum") return `${star.map(x => String(x).split("").join("+")).join("+")} = ${RULES[ri].f(star)}`;
    if (id === "digcnt") return `${star.map(x => `${x}(${String(x).length}자리)`).join(" + ")} = ${RULES[ri].f(star)}`;
    return `${star.map(x => `${x} ${String(x).split("").map(d => KR[+d]).join("")}`).join(" · ")} → ㅇ ${RULES[ri].f(star)}개`;
  }
  const label = { pick: "주사위 눈 고르기", test: "시험 · 외치기", show: "결과", end: "끝" };
  function testRows(V, ctx) {
    const rows = V.my.map((t, k) => `<div class="r${k === V.my.length - 1 ? " new" : ""}"><span class="a"><span class="x">${t.set}번째 숫자</span> ${esc(cellsOfTest(t))}</span><span class="res">→ ${fmt(t.res)}</span></div>`);
    const says = V.says.map(x => `<div class="r bad"><span class="a">${x.s === V.seat ? "내가" : esc(nameOf(ctx, x.s)) + ja(nameOf(ctx, x.s), "이")} <b>${fmt(x.v)}</b> 외침 — 오답</span><span class="res">✗</span></div>`);
    return rows.slice(-2).concat(says.slice(-1));
  }
  // 시험 기록의 칸별 값 (그때의 숫자 5개로 다시 계산 — 기록에 숫자를 따로 남기지 않아도 됨)
  let numsMemo = null;
  const cellsOfTest = t => { const nums = numsMemo && numsMemo[t.set]; return nums ? cellsTxt(K.cellVals(nums, t.cells)) : t.vals.join(" · "); };
  function render(stage, V, ctx) {
    style();
    const me = ctx.me, nm = i => nameOf(ctx, i), watch = me < 0;
    if (V.nums) { numsMemo = numsMemo && numsMemo.round === V.round ? numsMemo : { round: V.round }; numsMemo[V.set] = V.nums; } else if (!numsMemo || numsMemo.round !== V.round) numsMemo = { round: V.round };
    const key = `${V.round}|${V.set}|${V.phase}|${V.step}|${me}`; if (sel.key !== key) { const keep = sel.notes; resetSel(key); sel.notes = keep; }
    const can = ctx.canAct && !watch && !V.over && (V.phase === "pick" || V.phase === "test");
    let h = `<div class="hc"><div class="hc-top"><span class="rd">${V.over ? "끝" : `문제 ${V.round}/${K.NORM}`}</span>${!V.over && V.phase !== "show" ? `<span class="who">숫자 획득 ${V.set}/${V.setCap}</span>` : ""}${
      V.over ? "" : V.phase === "show" ? "" : Array.from({ length: V.n }, (_, s) => { const done = V.phase === "pick" ? V.picked[s] : V.sub[s] || V.done[s]; return `<span class="who${done ? " ok" : ""}${s === me ? " me" : ""}">${s === me ? "나" : esc(nm(s))} ${V.phase === "pick" ? (done ? "✔" : "…") : V.done[s] ? "넘김" : V.sub[s] ? "✔" : "…"}</span>`; }).join("")}</div>`;
    h += `<div class="hc-star"><span class="cap">문제 도형<br>결괏값은?</span>${V.star.map((x, i) => `<div class="hc-c"><i>${LET[i]}</i><b>${fmt(x)}</b></div>`).join("")}</div>`;
    if (V.phase === "show" || V.over) h += resHtml(V, ctx);
    else if (V.phase === "pick") {
      h += `<div class="hc-tiles">${V.butler.map(v => `<div class="hc-t"><span>${v}</span><small>🎲 집사</small></div>`).join("")}${Array.from({ length: V.n }, (_, s) => `<div class="hc-t q${s === me ? " mine" : ""}"><span>${s === me && V.myPick ? V.myPick : "?"}</span><small>${s === me ? "나" : esc(nm(s))}</small></div>`).join("")}</div>`;
      if (can) h += `<div class="hc-note">내 주사위 눈을 골라요 (1~6) — 집사 숫자와 합쳐 숫자 5개가 돼요</div><div class="hc-dice">${[1, 2, 3, 4, 5, 6].map(v => `<button class="btn" data-pick="${v}">${v}</button>`).join("")}</div>`;
      else h += `<div class="hc-note">${watch ? "눈을 고르는 중…" : V.myPick ? "눈을 냈어요 · 다른 사람을 기다려요" : "기다려요"}</div>`;
      if (V.my.length || V.says.length) h += `<div class="hc-log">${testRows(V, ctx).join("")}</div>`;
    } else {
      // 시험 · 외치기
      const used = new Set(sel.cells.flat());
      if (sel.notes && !sel.pad) {
        h += noteHtml(V) + `<div class="hc-tool"><button class="btn" data-a="notes">↩ 시험으로 돌아가기</button></div>`;
      } else if (!sel.pad) {
        h += `<div class="hc-tiles">${V.nums.map((t, i) => `<button class="hc-t${used.has(i) ? " used" : ""}${t.by === me ? " mine" : ""}" data-tile="${i}" ${can && !used.has(i) ? "" : "disabled"}><span>${t.v}</span><small>${t.by < 0 ? "🎲 집사" : t.by === me ? "나" : esc(nm(t.by))}</small></button>`).join("")}</div>`;
        const vals = sel.cells.map(c => (c.length ? +c.map(i => V.nums[i].v).join("") : null));
        h += `<div class="hc-board">${sel.cells.map((c, i) => `<button class="hc-s${sel.act === i && can ? " act" : ""}${c.length ? " full" : ""}" data-slot="${i}" ${can ? "" : "disabled"}><i>${LET[i]}</i><b>${vals[i] == null ? "·" : vals[i]}</b></button>`).join("")}</div>`;
        if (can) {
          const left = V.tests - V.tcnt[me], blk = V.blk[me] > 0, wr = V.wrong[me] >= V.maxw;
          h += `<div class="hc-tool"><button class="btn${sel.glue ? " on" : ""}" data-a="glue">🔗 붙이기</button><button class="btn" data-a="undo">↩ 빼기</button><button class="btn" data-a="clear">비우기</button><button class="btn" data-a="notes">📓 수첩</button></div>`;
          h += `<div class="hc-acts"><button class="btn primary" data-a="test" ${left > 0 && placed() === 5 ? "" : "disabled"}>🔍 시험 · ${left}번</button><button class="btn" data-a="say" ${blk || wr ? "disabled" : ""}>🗣 정답 외치기</button><button class="btn" data-a="pass">넘기기</button></div>`;
          h += `<div class="hc-note">${blk ? "방금 오답이라 이번 단계엔 정답을 못 외쳐요 (시험 · 넘기기만)" : wr ? "오답이 2번이라 이 문제는 더 못 외쳐요" : left === 0 ? "시험을 다 했어요 — 외치거나 넘기면 숫자를 새로 받아요" : placed() < 5 ? `숫자를 눌러 칸에 넣어요 (${placed()}/5) · 칸을 눌러 자리를 바꿔요` : "5개를 다 넣었어요 — 시험해 봐요"}</div>`;
        } else h += `<div class="hc-note">${watch ? "시험 중…" : V.sub[me] ? "낸 것이 있어요 · 다른 사람을 기다려요" : "기다려요"}</div>`;
        h += `<div class="hc-log">${testRows(V, ctx).join("") || `<div class="hc-note">시험 결과는 나만 볼 수 있어요</div>`}</div>`;
      } else {
        h += `<div class="hc-note">이 도형의 결괏값을 외쳐요 — 틀려도 감점은 없지만 다음 한 단계는 못 외쳐요</div><div class="hc-disp">${sel.num === "" ? "?" : esc(sel.num)}</div>
          <div class="hc-pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(d => `<button class="btn" data-d="${d}">${d}</button>`).join("")}<button class="btn" data-d="-">−</button><button class="btn" data-d="0">0</button><button class="btn" data-d="<">⌫</button></div>
          <div class="hc-tool"><button class="btn" data-a="cancel">취소</button><button class="btn primary" data-a="submit" ${sel.num !== "" && sel.num !== "-" ? "" : "disabled"}>외치기!</button></div>`;
      }
    }
    h += `</div>`;
    stage.innerHTML = h;
    stage.onclick = e => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.pick && can) { ctx.sfx("pop"); ctx.act({ t: "pick", v: +b.dataset.pick }); return; }
      if (!can) { if (b.dataset.a === "notes") { sel.notes = !sel.notes; render(stage, V, ctx); } return; }
      if (b.dataset.tile != null) {
        ctx.sfx("tap"); const i = +b.dataset.tile;
        if (sel.glue && sel.last >= 0) { sel.cells[sel.last].push(i); sel.glue = false; }
        else { const c = sel.cells[sel.act].length ? nextEmptyFrom() : sel.act; sel.cells[c].push(i); sel.last = c; sel.act = nextEmpty(c); }
        render(stage, V, ctx); return;
      }
      if (b.dataset.slot != null) { ctx.sfx("tap"); const i = +b.dataset.slot; if (sel.act === i && sel.cells[i].length) { sel.cells[i].pop(); sel.last = -1; } else sel.act = i; render(stage, V, ctx); return; }
      if (b.dataset.d != null) {
        ctx.sfx("tap"); const d = b.dataset.d;
        if (d === "<") sel.num = sel.num.slice(0, -1); else if (d === "-") { if (sel.num === "") sel.num = "-"; } else if (sel.num.replace("-", "").length < 7 && !(sel.num === "0" || sel.num === "-0")) sel.num += d; else if (sel.num === "0") sel.num = d;
        render(stage, V, ctx); return;
      }
      const a = b.dataset.a;
      if (a === "glue") { sel.glue = !sel.glue; render(stage, V, ctx); }
      else if (a === "undo") { const c = sel.last >= 0 && sel.cells[sel.last].length ? sel.last : sel.cells.findIndex(x => x.length); const cc = sel.cells.map((x, i) => i).filter(i => sel.cells[i].length); const t = sel.last >= 0 && sel.cells[sel.last].length ? sel.last : cc[cc.length - 1]; void c; if (t != null) { sel.cells[t].pop(); sel.last = -1; sel.act = t; } render(stage, V, ctx); }
      else if (a === "clear") { sel.cells = [[], [], [], [], []]; sel.act = 0; sel.glue = false; sel.last = -1; render(stage, V, ctx); }
      else if (a === "notes") { sel.notes = !sel.notes; render(stage, V, ctx); }
      else if (a === "test" && placed() === 5) { ctx.sfx("pop"); ctx.act({ t: "test", cells: sel.cells.map(c => c.slice()) }); }
      else if (a === "say") { sel.pad = true; sel.num = ""; render(stage, V, ctx); }
      else if (a === "cancel") { sel.pad = false; sel.num = ""; render(stage, V, ctx); }
      else if (a === "submit") { const v = parseInt(sel.num, 10); if (Number.isInteger(v)) { ctx.sfx("pop"); ctx.act({ t: "say", v }); } }
      else if (a === "pass") { ctx.sfx("tap"); ctx.act({ t: "pass" }); }
    };
    function nextEmptyFrom() { const e = sel.cells.findIndex(c => !c.length); return e >= 0 ? e : sel.act; }
  }
  function noteHtml(V) {
    const H = new Set(K.hyp(V, () => 1, 0));
    return `<div class="hc-note-l">${RULES.map((r, i) => `<div class="r${H.has(i) ? "" : " off"}"><b>${H.has(i) ? "●" : "×"}</b><span>${r.sh}</span></div>`).join("")}<div class="hc-note">내 시험과 맞지 않거나 틀린 외침과 같은 값이 나오는 규칙은 × 로 지워 보여요</div></div>`;
  }
  function resHtml(V, ctx) {
    const nm = i => nameOf(ctx, i), R = V.res;
    if (!R) return `<div class="hc-res"><div class="big">끝</div></div>`;
    const wins = R.wins || (R.win >= 0 ? [R.win] : []);
    return `<div class="hc-res"><div class="big">${wins.length ? `🎉 ${wins.map(s => (s === V.seat ? "나" : esc(nm(s)))).join(" · ")} 정답 +1점` : "아무도 못 맞혔어요 (0점)"}</div>
      <div class="r">정답 <b>${fmt(R.target)}</b> — 규칙: <b>${esc(RULES[R.rule].nm)}</b><br>${esc(explain(R.rule, R.star))}</div>
      ${R.tests.map((a, s) => `<div class="r">${s === V.seat ? "내" : esc(nm(s))} 시험 ${a.length}번${R.says.filter(x => x.s === s).map(x => ` · ${fmt(x.v)} ${x.ok ? "정답" : "오답"}`).join("")}</div>`).join("")}${V.over ? "" : `<div class="hc-note">잠시 뒤 다음 문제가 시작돼요</div>`}</div>`;
  }

  // ── 선생님 ──
  const pc = x => Math.round(x * 100) + "%";
  let CC = { key: "", r: null, open: false, full: "" };
  const recOf = (V, me) => { const key = `${V.pub}|${V.set}|${V.step}|${me}|${V.my.length}`; if (CC.key !== key) CC = { key, r: K.recommend(V, me), open: false, full: "" }; return CC.r; };
  if (typeof document !== "undefined") document.addEventListener("click", e => {
    const b = e.target && e.target.closest && e.target.closest("[data-hchint]");
    if (!b) return; e.preventDefault(); CC.open = true;
    const sp = document.createElement("span"); sp.innerHTML = CC.full; b.replaceWith(sp);
  }, true);
  const arrTxt = (nums, cells) => cellsTxt(K.cellVals(nums, cells));
  function actText(a, V) {
    if (!a) return "—";
    if (a.t === "pick") return `주사위 눈 ${a.v} 제출`;
    if (a.t === "pass") return "넘기기";
    if (a.t === "say") return `정답 외침 ${fmt(a.v)}`;
    if (a.t === "test") return V && V.nums ? `시험 ${arrTxt(V.nums, a.cells)}` : "시험";
    return "";
  }
  function coach(V, me, since, names) {
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    const watch = !(me >= 0 && me < V.n);
    const wrongs = V.says.filter(x => !x.ok);
    let opp = wrongs.length ? `이 문제에서 틀린 외침: ${wrongs.map(x => `${x.s === me ? "내가" : nm(x.s) + ja(nm(x.s), "이")} ${fmt(x.v)}`).join(", ")} — 이 값이 나오는 규칙은 지워도 돼요.` : "아직 틀린 외침은 없어요.";
    opp += ` 시험 횟수(남의 시험 결과는 비공개): ${V.tn.map((c, s) => `${s === me ? "나" : nm(s)} ${c}번`).join(" · ")}.`;
    if (V.over) return { opp: "판이 끝났어요.", mine: watch ? "" : `내 승점 ${V.score[me]}점 · ${V.ranks[me] + 1}위`, rec: "한 판 더 해 봐요!", why: "" };
    if (watch) return { opp, mine: `문제 ${V.round} · 숫자 획득 ${V.set}번째.`, rec: "구경 중이에요.", why: "" };
    const H = K.hyp(V, () => 1, 0), T = K.targets(V, H);
    const mine = `승점 ${V.score[me]}점 (${V.win}점 선승) · 이 문제 시험 ${V.my.length}번 · 남은 규칙 후보 ${H.length}/${K.NR}개 → 결괏값 후보 ${T.length}가지${T.length && T.length <= 4 ? ` (${T.map(x => fmt(x.v)).join(" · ")})` : ""}.`;
    let rec = "기다려요", why = "";
    if (V.needs.includes(me)) {
      const R = recOf(V, me), a = R && R.a;
      if (a && a.t === "pick") { rec = `주사위 눈 <b>${a.v}</b>`; why = `집사 눈 ${V.butler.join(" · ")} 과 겹치지 않게 고르면 숫자를 칸에 나눠 넣었을 때 규칙이 더 잘 갈려요.`; }
      else if (a) {
        const eh = R.e != null ? R.e : H.length, left = V.tests - V.tcnt[me];
        if (a.t === "say") {
          rec = `정답을 <b>외칠 차례</b>예요 — 후보가 결괏값 하나로 모여요.`; CC.full = `<b>${fmt(a.v)}</b> 를 외쳐요 (${esc(RULES[H[0]].nm)} → ${esc(explain(H[0], V.star))}).`;
          why = `${CC.open ? CC.full + " " : ""}남은 후보 ${H.length}개가 모두 같은 결괏값이라 틀릴 일이 없어요.`;
        } else if (a.t === "test") {
          rec = `<b>시험</b>을 해 봐요 (남은 후보 ${H.length}개를 가르는 배치가 있어요).`; CC.full = `<b>${esc(arrTxt(V.nums, a.cells))}</b> 처럼 넣어요.`;
          why = `${CC.open ? CC.full + " " : ""}이 시험이면 후보 ${H.length}개가 평균 ${eh.toFixed(1)}개로 줄어요. 시험 ${left}번 남았어요.`;
        } else {
          rec = `<b>넘기기</b> — 새 숫자를 받아요.`; why = `후보 ${H.length}개 중 결괏값 후보 ${T.length}가지${T.length ? ` (가장 많은 값 ${fmt(T[0].v)} = ${pc(T[0].n / H.length)})` : ""} — 지금 찍으면 틀릴 수 있고, 시험도 다 썼어요.`;
        }
        if (!CC.open && (a.t === "say" || a.t === "test")) rec += ` <button type="button" class="ep-hbtn" data-hchint>💡 전체 보기</button>`;
      }
    } else if (V.phase === "show") { rec = "결과를 보고 다음 문제를 준비해요"; why = "이번 문제의 규칙과 풀이가 위에 나와 있어요."; }
    return { opp, mine, rec, why };
  }
  function review(V, seat, myA, bestA) {
    if (!V || !myA || !K.judge || V.phase !== "test") return null;
    const J = K.judge(V, seat, myA, bestA); if (!J) return null;
    const d = J.best.u - J.my.u, sev = Math.max(0, Math.min(100, Math.round(d * 120)));
    const v = (x, a) => (a.t === "say" ? `맞을 확률 ${pc(x.u)}` : a.t === "test" ? `후보 ${x.H}개 → 평균 ${x.e != null ? x.e.toFixed(1) : x.H}개` : "시험 · 외침 안 함");
    return { sev, why: `내 수(${actText(myA, V)}): ${v(J.my, myA)} / 고급 AI(${actText(bestA, V)}): ${v(J.best, bestA)}` };
  }
  function result(V, me, names) {
    const who = s => (s === me ? "나" : names && names[s] ? esc(names[s]) : `${s + 1}번`);
    const order = V.ranks.map((x, s) => s).sort((a, b) => V.ranks[a] - V.ranks[b] || a - b);
    return `<div class="hc-res"><div>${V.round}문제 · ${V.end === "win" ? "3점 선승" : V.end === "rounds" ? "5문제 뒤 최다 승점" : "9문제까지 같아 공동"}</div>${order.map(s => `<div>${V.ranks[s] + 1}위 ${who(s)} <b>${V.score[s]}점</b></div>`).join("")}<div style="color:var(--soft)">나온 규칙: ${V.hist.map(h => esc(RULES[h.rule].nm.split(" (")[0])).join(" · ")}</div></div>`;
  }

  // ── 1분 규칙 ──
  function tutorial() {
    style();
    const star = [79, 280, 31, 124, 2], tv = [6, 4, 1, 5, 3];
    const starH = `<div class="hc-star"><span class="cap">문제 도형</span>${star.map((x, i) => `<div class="hc-c"><i>${LET[i]}</i><b>${x}</b></div>`).join("")}</div>`;
    const tilesH = (used) => `<div class="hc-tiles">${tv.map((v, i) => `<div class="hc-t${used && used.has(i) ? " used" : ""}"><span>${v}</span><small>${i < 2 ? "🎲 집사" : i === 2 ? "나" : "AI" + (i - 2)}</small></div>`).join("")}</div>`;
    return [
      { tag: "STEP 1 · 목표", title: "숨겨진 규칙을 알아내요", body: "별 모양 <b>문제 도형</b>의 칸 A~E 에 숫자가 적혀 있어요. <b>숨겨진 규칙</b> 하나가 이 숫자들로 <b>결괏값</b>을 만들어요. 규칙을 알아내 <b>이 도형의 결괏값</b>을 먼저 외치면 <b>1점</b>, <b>3점</b>을 먼저 얻으면 승리 (5문제까지, 동점이면 연장)!",
        boardHtml: `<div class="hc-tut">${starH}<div style="font-size:30px">❓ → ?</div></div>`, ms: 7600 },
      { tag: "STEP 2 · 숫자 획득", title: "주사위 눈을 모아 숫자 5개", body: "집사가 주사위를 굴려 숫자를 공개하고(3명이면 2개), 나는 <b>내 주사위 눈 1개</b>를 골라 모두 <b>동시에</b> 내요. 그렇게 모인 <b>숫자 5개</b>가 시험에 쓸 재료예요.",
        boardHtml: `<div class="hc-tut">${tilesH()}</div>`, ms: 7000 },
      { tag: "STEP 3 · 시험", title: "5개를 모두 빈 별 칸에 넣어 봐요", body: "숫자 5개를 <b>모두</b> 칸 A~E 에 넣어요. 한 칸에 둘 이상 <b>붙여서 두 자리</b>(6 · 4 → 64)로 만들어도 돼요. 시험하면 숨은 규칙이 계산한 <b>결과</b>가 나와요 — 이 결과로 규칙을 짐작해요. (예: 64 · 15 · 3 을 넣으면 결과 64 → 짝수 칸의 합?)",
        boardHtml: `<div class="hc-tut">${tilesH()}<div class="hc-board">${["64", "·", "15", "3", "·"].map((v, i) => `<div class="hc-s${v !== "·" ? " full" : ""}"><i>${LET[i]}</i><b>${v}</b></div>`).join("")}</div><div class="hc-log" style="width:100%"><div class="r new"><span class="a">A 64 · C 15 · D 3</span><span class="res">→ 64</span></div></div></div>`, ms: 8800 },
      { tag: "STEP 4 · 직접", title: "숫자 5개를 칸에 넣고 시험해요", body: "아래 숫자를 눌러 칸에 넣어 보세요 (5개 모두). <b>🔗 붙이기</b>를 누르고 다음 숫자를 누르면 앞 숫자 옆에 붙어요. 다 넣고 <b>시험</b>!",
        interactive: { hint: "👆 숫자 5개를 칸에 넣고 시험", doneText: "✅ 시험 결과 나왔어요 — 이 결과로 규칙을 짐작해요" },
        render(stage, ctrl) {
          const cells = [[], [], [], [], []]; let act = 0, glue = false, last = -1, res = null;
          const total = () => cells.reduce((a, c) => a + c.length, 0), vals = () => cells.filter(c => c.length).map(c => +c.map(i => tv[i]).join(""));
          const draw = () => {
            const used = new Set(cells.flat());
            stage.innerHTML = `<div class="hc-tut"><div class="hc-tiles">${tv.map((v, i) => `<button class="hc-t${used.has(i) ? " used" : ""}" data-t="${i}" ${used.has(i) || res != null ? "disabled" : ""}><span>${v}</span></button>`).join("")}</div>
              <div class="hc-board">${cells.map((c, i) => `<div class="hc-s${c.length ? " full" : ""}${act === i ? " act" : ""}"><i>${LET[i]}</i><b>${c.length ? c.map(x => tv[x]).join("") : "·"}</b></div>`).join("")}</div>
              <div class="hc-tool" style="width:100%"><button class="btn${glue ? " on" : ""}" data-g="1" ${res != null ? "disabled" : ""}>🔗 붙이기</button><button class="btn primary" data-go="1" ${total() === 5 && res == null ? "" : "disabled"}>🔍 시험</button></div>
              <div class="hc-note">${res != null ? `결과 ${res} (짝수 칸의 합 규칙이었다면 ${res})` : `${total()}/5`}</div></div>`;
          };
          stage.onclick = e => {
            const b = e.target.closest("button"); if (!b || b.disabled) return;
            if (b.dataset.t != null) { ctrl.sfx("tap"); const i = +b.dataset.t; if (glue && last >= 0) { cells[last].push(i); glue = false; } else { const c = cells[act].length ? Math.max(0, cells.findIndex(x => !x.length)) : act; cells[c].push(i); last = c; const nx = cells.findIndex((x, k) => k > c && !x.length); act = nx >= 0 ? nx : c; } draw(); }
            else if (b.dataset.g) { glue = !glue; draw(); }
            else if (b.dataset.go) { ctrl.sfx("pop"); res = vals().filter(x => x % 2 === 0).reduce((a, b2) => a + b2, 0); draw(); ctrl.complete(); }
          };
          draw();
        } },
      { tag: "STEP 5 · 외치기", title: "알았으면 도형의 결괏값을 외쳐요", body: "규칙을 알았다면 <b>문제 도형 A~E 의 결괏값</b>을 외쳐요 (예: 짝수 칸의 합이면 280 + 124 + 2 = <b>406</b>). 맞으면 <b>1점</b>! 틀려도 <b>감점은 없지만</b> 다음 한 단계는 못 외쳐요. 아무도 못 맞히면 숫자를 새로 받고 시험을 이어 가요. 막히면 <b>🧑‍🏫 AI 선생님</b>이 남은 후보를 세 줄로 짚어 줘요.",
        boardHtml: `<div class="hc-tut">${starH}<div style="font-size:26px;font-weight:900;color:#fde68a">짝수 칸의 합 = 406 🏆</div></div>`, ms: 9000 },
    ];
  }

  window.SVUI = window.SVUI || {};
  window.SVUI.hiddencode = {
    name: "히든코드", emoji: "🔐", short: "숫자를 칸에 넣어 시험하며 숨은 규칙을 알아내요", min: 2, max: 3, defN: 3, board: false, src: SRC, diff: DIFF,
    howto: [
      "방송: 별 모양 <b>문제 도형</b> A~E 에 숫자가 적혀 있고, <b>숨겨진 규칙</b>이 그 숫자들로 <b>결괏값</b>을 만들어요 — 규칙을 알아내 이 도형의 결괏값을 외치면 1점",
      "집사가 주사위를 굴려 숫자를 공개하고, 각자 <b>내 주사위 눈 1개</b>를 골라 동시에 내서 <b>숫자 5개</b>를 모아요",
      "숫자 5개를 <b>모두</b> 빈 별의 칸 A~E 에 넣어요 (붙여서 두 자리 이상도 돼요) → 숨은 규칙이 계산한 <b>결과</b>가 나와요 · 시험 결과는 내 것만 보여요 (한 숫자로 3번까지)",
      "알았으면 <b>결괏값</b>을 외쳐요 — 맞으면 1점 · 틀리면 감점 없이 <b>다음 한 단계는 못 외침</b> (방송은 상대에게 30초 발언권) · 아무도 못 맞히면 숫자 획득을 되풀이",
      "<b>3점</b> 먼저 얻으면 승리 · 5문제 뒤엔 최다 승점 · 동점이면 연장 · 숨은 규칙 후보는 📓 수첩에 12개 (방송 예: 짝수 칸의 합 · 곱 − 합 · 한글 ㅇ 개수)",
    ],
    sub: V => (V.over ? "끝" : `문제 ${V.round} · 숫자 획득 ${V.set}번째 · ${label[V.phase] || ""}`),
    chip: (V, i) => ({ t: `${V.score[i]}점`, on: V.needs.includes(i) && !V.over, out: false }),
    render, coach, result, tutorial, review, actText,
    qa: (V, me, rnd) => K.ai(V, me, "easy", rnd),
  };
})();
