/* 게임 공통 '한 기기에서 여럿' (common/hotseat.js) — 폰·TV 하나를 2~4명 이상이 돌려 가며 하기
   1) 차례 넘기기 가림막 (패를 숨겨야 하는 게임: 고스톱·섯다·포커·베니큐브 …)
      await HotSeat.cover({ name: "민수", emoji: "😎" });   // '민수 차례예요 · 화면을 넘겨 주세요' + [👀 내 패 보기]
      → 버튼을 누르면 풀림 (Promise). 앞사람의 마지막 탭이 바로 눌리지 않게 0.5초 뒤에 눌림
      선택: { text: "큰 글(기본 '○○ 차례예요')", sub: "작은 글(기본 '화면을 넘겨 주세요')", button: "버튼 글", delay: 500 }
      HotSeat.close() — 가림막을 코드로 닫기(게임을 그만둘 때) · HotSeat.isOpen
   2) 자리 고르기 (사람/AI 섞기)
      const pick = HotSeat.setup(el, { game: "gostop", min: 2, max: 4, allowAI: true, tiers: ["easy", "normal", "hard"], onChange(seats) {} });
      pick.seats → [{ kind: "human", name: "민수", emoji: "😎" }, { kind: "ai", tier: "normal", name: "🐱 보통 AI", emoji: "🐱" }, …]
      pick.valid (사람이 한 명 이상 · min~max) · pick.set(seats) · pick.destroy()
      · tiers: 문자열(easy·normal·hard → 🐣 쉬움 · 🐱 보통 · 🐯 어려움) 또는 [{ id, emoji, label }] · seats: 처음 자리 · addAs: "ai" 면 새 자리를 AI로
      · 사람은 한 명 이상 남게 함 · 고른 자리는 게임마다 기억(localStorage game.hotseat.<game>)
   · 색·글꼴은 게임의 CSS 변수(--card --ink --soft --line --accent --gold --round --text, 없으면 기본값)를 따름 */
(() => {
  if (window.HotSeat) return;
  const css = `
.hs-cover{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 20px) 20px calc(env(safe-area-inset-bottom,0px) + 20px);
  background:radial-gradient(120% 90% at 50% 30%,color-mix(in srgb,var(--card,#142030) 92%,#000) 0%,rgba(4,8,14,.985) 70%);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  color:var(--ink,#f1f5f9);font:16px/1.5 var(--text,system-ui,"Malgun Gothic",sans-serif);text-align:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation;animation:hs-in .18s ease-out}
.hs-cover[hidden]{display:none !important}
@keyframes hs-in{from{opacity:0}to{opacity:1}}
.hs-in{display:grid;justify-items:center;gap:clamp(10px,2.4vh,20px);max-width:min(560px,100%)}
.hs-emo{font-size:clamp(64px,16vmin,132px);line-height:1;filter:drop-shadow(0 8px 18px rgba(0,0,0,.45));animation:hs-bob 2.4s ease-in-out infinite}
@keyframes hs-bob{50%{transform:translateY(-6px)}}
.hs-t{margin:0;font:900 clamp(28px,7vmin,60px)/1.15 var(--round,inherit);color:var(--gold-l,#fde68a);word-break:keep-all}
.hs-s{margin:0;font-size:clamp(15px,3.2vmin,24px);color:var(--soft,#94a3b8);word-break:keep-all}
.hs-go{margin-top:clamp(6px,2vh,18px);min-width:min(320px,80vw);padding:clamp(16px,2.6vh,24px) 28px;border-radius:20px;border:1px solid rgba(255,255,255,.22);cursor:pointer;
  font:800 clamp(19px,4vmin,30px)/1 var(--round,inherit);color:#fff;background:linear-gradient(135deg,var(--accent,#10b981),var(--accent-d,#047857));box-shadow:0 10px 26px rgba(0,0,0,.45);transition:opacity .2s,transform .08s}
.hs-go:disabled{opacity:.35;cursor:default}
.hs-go:not(:disabled):active{transform:scale(.97)}
.hs-go:focus-visible{outline:3px solid var(--gold,#f59e0b);outline-offset:3px}
.hs-lock{font-size:12.5px;color:var(--soft,#94a3b8);opacity:.8}
.hs-setup{display:grid;gap:8px;font:15px/1.4 var(--text,system-ui,"Malgun Gothic",sans-serif);color:var(--ink,#f1f5f9)}
.hs-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:rgba(127,127,127,.12);border:1px solid var(--line,rgba(255,255,255,.12))}
.hs-no{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:18px;background:rgba(0,0,0,.18)}
.hs-name{min-width:0;width:100%;box-sizing:border-box;font:700 15px var(--round,inherit);color:var(--ink,#f1f5f9);background:rgba(0,0,0,.2);border:1.5px solid var(--line,rgba(255,255,255,.16));border-radius:10px;padding:8px 10px;outline:none}
.hs-name:focus{border-color:var(--gold,#f59e0b)}
.hs-tiers{display:flex;gap:4px;min-width:0;flex-wrap:wrap}
.hs-tier{border:1.5px solid var(--line,rgba(255,255,255,.16));background:rgba(0,0,0,.18);color:var(--ink,#f1f5f9);border-radius:10px;padding:6px 8px;font:700 13px var(--round,inherit);cursor:pointer;white-space:nowrap}
.hs-tier.on{border-color:var(--accent,#10b981);background:color-mix(in srgb,var(--accent,#10b981) 26%,transparent)}
.hs-kind,.hs-del,.hs-add{border:1px solid var(--line,rgba(255,255,255,.16));background:rgba(127,127,127,.14);color:var(--ink,#f1f5f9);border-radius:10px;cursor:pointer;font:700 13px var(--round,inherit);padding:8px 10px;white-space:nowrap}
.hs-del{width:34px;padding:8px 0;color:var(--soft,#94a3b8)}
.hs-kind:disabled,.hs-del:disabled,.hs-add:disabled{opacity:.35;cursor:default}
.hs-add{padding:11px;border-style:dashed;font-size:14px}
.hs-foot{font-size:12.5px;color:var(--soft,#94a3b8);text-align:center}
@media (max-width:380px){.hs-row{grid-template-columns:auto minmax(0,1fr) auto;}.hs-row .hs-del{grid-column:3;grid-row:1}.hs-row .hs-kind{grid-column:2 / 4;justify-self:start}}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.id = "hs-style"; s.textContent = css; document.head.appendChild(s); };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // ── 1) 차례 넘기기 가림막
  let cov = null, done = null;
  function close() {
    if (cov) cov.hidden = true;
    const d = done; done = null; if (d) d();
  }
  function cover(o = {}) {
    style();
    if (done) close();                                       // 앞의 가림막이 남아 있으면 먼저 풀기
    if (!cov) { cov = document.createElement("div"); cov.className = "hs-cover"; cov.setAttribute("role", "dialog"); cov.setAttribute("aria-modal", "true"); document.body.appendChild(cov); }
    const name = String(o.name || "다음 사람").slice(0, 16);
    cov.innerHTML = `<div class="hs-in">
      <div class="hs-emo" aria-hidden="true">${esc(o.emoji || "🙂")}</div>
      <h2 class="hs-t">${esc(o.text || name + " 차례예요")}</h2>
      <p class="hs-s">${esc(o.sub || "화면을 넘겨 주세요")}</p>
      <button class="hs-go" type="button" disabled>${esc(o.button || "👀 내 패 보기")}</button>
      <span class="hs-lock">${esc(name)} 님만 보세요</span></div>`;
    cov.hidden = false;
    const go = cov.querySelector(".hs-go");
    const delay = o.delay != null ? +o.delay : 500;
    return new Promise(res => {
      done = res;
      const t = setTimeout(() => { if (done === res) { go.disabled = false; try { go.focus({ preventScroll: true }); } catch (e) {} } }, delay);
      go.onclick = () => { if (go.disabled) return; clearTimeout(t); close(); };
    });
  }

  // ── 2) 자리 고르기
  const TIER = { easy: ["🐣", "쉬움"], normal: ["🐱", "보통"], hard: ["🐯", "어려움"] };
  const FACES = ["🙂", "😎", "🤠", "🥳", "😺", "🐶", "🦊", "🐼"];
  function setup(el, o = {}) {
    style();
    const min = Math.max(1, o.min || 2), max = Math.max(min, o.max || 4), allowAI = o.allowAI !== false;
    const tiers = (o.tiers || ["easy", "normal", "hard"]).map(t => typeof t === "string" ? { id: t, emoji: (TIER[t] || ["🤖"])[0], label: (TIER[t] || [t])[1] } : t);
    const key = o.game ? "game.hotseat." + o.game : null;
    const tierOf = id => tiers.find(t => t.id === id) || tiers[Math.min(1, tiers.length - 1)] || { id: "normal", emoji: "🤖", label: "AI" };
    const norm = (s, i) => {
      if (allowAI && s && s.kind === "ai") { const t = tierOf(s.tier); return { kind: "ai", tier: t.id, name: `${t.emoji} ${t.label} AI`, emoji: t.emoji }; }
      return { kind: "human", name: String((s && s.name) || "").slice(0, 12), emoji: FACES[i % FACES.length] };
    };
    let seats = (o.seats || (key && load(key)) || []).slice(0, max);
    while (seats.length < min) seats.push({ kind: "human" });
    seats = seats.map(norm);
    if (!seats.some(s => s.kind === "human")) seats[0] = norm({ kind: "human" }, 0);

    const humans = () => seats.filter(s => s.kind === "human").length;
    const out = () => seats.map((s, i) => s.kind === "human" ? { ...s, name: s.name.trim() || `사람 ${i + 1}` } : { ...s });
    const changed = () => { if (key) save(key, seats.map(s => (s.kind === "ai" ? { kind: "ai", tier: s.tier } : { kind: "human", name: s.name }))); if (o.onChange) try { o.onChange(out()); } catch (e) { console.error(e); } };

    const wrap = document.createElement("div"); wrap.className = "hs-setup";
    el.innerHTML = ""; el.appendChild(wrap);
    function draw() {
      wrap.innerHTML = seats.map((s, i) => `<div class="hs-row" data-i="${i}">
          <span class="hs-no" aria-hidden="true">${esc(s.emoji)}</span>
          ${s.kind === "human"
            ? `<input class="hs-name" maxlength="12" placeholder="사람 ${i + 1}" value="${esc(s.name)}" aria-label="${i + 1}번 자리 이름" autocomplete="off" enterkeyhint="done">`
            : `<div class="hs-tiers" role="group" aria-label="${i + 1}번 AI 실력">${tiers.map(t => `<button type="button" class="hs-tier ${t.id === s.tier ? "on" : ""}" data-tier="${esc(t.id)}" aria-pressed="${t.id === s.tier}">${esc(t.emoji)} ${esc(t.label)}</button>`).join("")}</div>`}
          ${allowAI ? `<button type="button" class="hs-kind" data-kind ${s.kind === "human" && humans() <= 1 ? "disabled" : ""}>${s.kind === "human" ? "🤖 AI로" : "🙋 사람으로"}</button>` : "<span></span>"}
          <button type="button" class="hs-del" data-del aria-label="${i + 1}번 자리 빼기" ${seats.length <= min || (s.kind === "human" && humans() <= 1) ? "disabled" : ""}>✕</button>
        </div>`).join("")
        + `<button type="button" class="hs-add" data-add ${seats.length >= max ? "disabled" : ""}>＋ 자리 추가 (${seats.length}/${max}명)</button>`
        + `<div class="hs-foot">${min === max ? `${max}명이 해요` : `${min}~${max}명`} · 한 기기를 차례대로 넘겨 가며 해요</div>`;
    }
    wrap.addEventListener("input", e => {
      const inp = e.target.closest(".hs-name"); if (!inp) return;
      const i = +inp.closest(".hs-row").dataset.i; seats[i].name = inp.value.slice(0, 12); changed();
    });
    wrap.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      const row = b.closest(".hs-row"), i = row ? +row.dataset.i : -1;
      if (b.dataset.add !== undefined) {
        if (seats.length >= max) return;
        seats.push(norm({ kind: o.addAs === "ai" ? "ai" : "human" }, seats.length));   // 새 자리는 사람 (addAs: "ai" 면 AI)
      } else if (b.dataset.del !== undefined) {
        if (seats.length <= min) return; seats.splice(i, 1); seats = seats.map((s, j) => s.kind === "human" ? { ...s, emoji: FACES[j % FACES.length] } : s);
      } else if (b.dataset.kind !== undefined) {
        seats[i] = norm(seats[i].kind === "human" ? { kind: "ai", tier: tierOf().id } : { kind: "human" }, i);
      } else if (b.dataset.tier) {
        seats[i] = norm({ kind: "ai", tier: b.dataset.tier }, i);
      } else return;
      draw(); changed();
    });
    draw();
    return {
      get seats() { return out(); },
      get valid() { return seats.length >= min && seats.length <= max && humans() >= 1; },
      set(list) { seats = (list || []).slice(0, max).map(norm); while (seats.length < min) seats.push(norm({ kind: "human" }, seats.length)); if (!humans()) seats[0] = norm({ kind: "human" }, 0); draw(); changed(); },
      destroy() { wrap.remove(); },
    };
  }

  window.HotSeat = { cover, close, setup, get isOpen() { return !!(cov && !cov.hidden); } };
})();
