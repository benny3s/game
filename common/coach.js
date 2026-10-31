/* 게임 공통 'AI 선생님' 창 (common/coach.js) — 끌어서 옮기고, 작은 동그라미로 접을 수 있는 떠 있는 창
   쓰는 법:
     const coach = CoachPanel.create({ game: "gostop", title: "AI 선생님" });
     coach.set("<b>[1월 광]</b> 을 내면 좋아요");   // 내용 바꾸기 (HTML)
     coach.body                                      // 직접 채워도 되는 내용 칸 (HTMLElement)
     coach.show() / coach.hide() / coach.toggle()   // 보이기·숨기기 (toggle 은 보이기↔숨기기)
     coach.collapse(true|false)                      // 동그라미(🧑‍🏫)로 접기·펴기, 인자 없으면 뒤집기
     coach.destroy()                                 // 지우기
     coach.visible · coach.collapsed · coach.el      // 지금 상태, 바깥 상자
     coach.onChange(fn)                              // 보이기·접기가 바뀔 때마다 fn(coach)
   아래 버튼 줄의 '🧑‍🏫 AI 선생님' 버튼 (힌트 버튼 대신, 모든 게임 같은 모양):
     CoachPanel.button(document.getElementById("coachBtn"), coach)   // 누르면 켜기·끄기, 켜짐이면 .cpn-on + aria-pressed
       → { sync(), destroy() } · 사용자가 끈 것은 게임마다 기억 (끄기 싫으면 세 번째 인자 { remember: false })
     CoachPanel.isOff("gostop")                      // 사용자가 꺼 둔 게임인가 (처음에 show() 할지 정할 때)
     · 혼자 하기: 늘 버튼을 보임 · 친구랑: cfg.coach 가 true 일 때만 버튼·창을 보임 (게임이 정함)
   선택 옵션: { bottom: 88(기본 위치에서 화면 아래와의 거리 px — 게임 버튼 줄 위로), right: 10, icon: "🧑‍🏫", startHidden: false }
   · 머리줄(제목 줄)을 잡고 끌면 옮겨지고(마우스·터치 모두), 동그라미도 끌 수 있어요. 동그라미를 톡 누르면 펼쳐져요
   · 위치와 접힘 상태는 게임마다 localStorage(game.coach.<game>)에 기억해요
   · 창이 있는 곳만 눌림을 받고, 나머지 화면은 게임이 그대로 받아요
   · 색은 게임의 CSS 변수(--card --ink --soft --line --round --text, 없으면 기본값)를 따르고, --coach 로 테두리 색을 바꿀 수 있어요 */
(() => {
  if (window.CoachPanel) return;
  const css = `
.cpn{position:fixed;z-index:17;width:min(320px,86vw);max-height:min(40vh,40dvh);display:flex;flex-direction:column;
  background:var(--card,rgba(15,23,36,.95));color:var(--ink,#f1f5f9);border:1.5px solid var(--coach,#34d399);border-radius:16px;
  box-shadow:0 10px 28px rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);overflow:hidden;
  font:13px/1.45 var(--text,system-ui,"Malgun Gothic",sans-serif);-webkit-tap-highlight-color:transparent}
.cpn[hidden],.cpn-chip[hidden]{display:none !important}
.cpn-hd{display:flex;align-items:center;gap:7px;padding:6px 6px 6px 11px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;
  border-bottom:1px solid var(--line,rgba(255,255,255,.1));background:color-mix(in srgb,var(--coach,#34d399) 14%,transparent)}
.cpn.drag .cpn-hd{cursor:grabbing}
.cpn-hd .cpn-ic{font-size:17px;line-height:1}
.cpn-hd b{flex:1;min-width:0;font:800 13.5px/1.2 var(--round,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cpn-hd .cpn-grip{color:var(--soft,#94a3b8);font-size:11px;letter-spacing:1px;opacity:.75}
.cpn-min{flex:none;width:30px;height:28px;border-radius:9px;border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(127,127,127,.12);
  color:var(--ink,#f1f5f9);font:700 15px/1 var(--round,inherit);cursor:pointer;display:grid;place-items:center;padding:0}
.cpn-min:hover{background:rgba(127,127,127,.22)}
.cpn-body{padding:8px 11px 10px;overflow:auto;overscroll-behavior:contain;min-height:0}
.cpn-body b{font-weight:800}
.cpn-body:empty::before{content:"조금만 기다려 주세요…";color:var(--soft,#94a3b8)}
.cpn-chip{position:fixed;z-index:17;width:48px;height:48px;border-radius:50%;padding:0;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;
  display:grid;place-items:center;font-size:24px;line-height:1;background:var(--card,rgba(15,23,36,.95));border:2px solid var(--coach,#34d399);
  box-shadow:0 6px 18px rgba(0,0,0,.45);-webkit-tap-highlight-color:transparent}
.cpn-chip:active{transform:scale(.95)}
.cpn-dock{transition:box-shadow .15s,opacity .15s}
.cpn-dock:not(.cpn-on){opacity:.72}
.cpn-dock.cpn-on{box-shadow:0 0 0 2px var(--coach,#34d399) inset,0 0 12px color-mix(in srgb,var(--coach,#34d399) 45%,transparent)}
.cpn-chip.new::after{content:"";position:absolute;top:3px;right:3px;width:10px;height:10px;border-radius:50%;background:var(--gold,#f59e0b);box-shadow:0 0 0 2px var(--card,#0f1724)}`;
  let styled = false;
  const style = () => {
    if (styled) return; styled = true;
    const s = document.createElement("style"); s.id = "cpn-style"; s.textContent = css; document.head.appendChild(s);
  };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null") || {}; } catch (e) { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const vw = () => window.innerWidth || document.documentElement.clientWidth;
  const vh = () => window.innerHeight || document.documentElement.clientHeight;

  function create(o = {}) {
    style();
    const game = String(o.game || "game"), key = "game.coach." + game;
    const bottom = o.bottom != null ? +o.bottom : 88, right = o.right != null ? +o.right : 10, icon = o.icon || "🧑‍🏫";
    const st = load(key);                                   // { p:[x,y] 창 위치, c:[x,y] 동그라미 위치, z: 접힘 }
    let collapsed = !!st.z, visible = !o.startHidden, dead = false;

    const el = document.createElement("section");
    el.className = "cpn"; el.setAttribute("aria-label", o.title || "AI 선생님");
    el.innerHTML = `<div class="cpn-hd"><span class="cpn-ic">${esc(icon)}</span><b>${esc(o.title || "AI 선생님")}</b><span class="cpn-grip" aria-hidden="true">⋮⋮</span><button class="cpn-min" type="button" aria-label="접기" title="접기">–</button></div><div class="cpn-body"></div>`;
    const hd = el.firstChild, body = el.lastChild, minBtn = hd.querySelector(".cpn-min");
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "cpn-chip"; chip.textContent = icon;
    chip.setAttribute("aria-label", (o.title || "AI 선생님") + " 펼치기"); chip.title = (o.title || "AI 선생님") + " 펼치기";
    document.body.appendChild(el); document.body.appendChild(chip);

    // 위치: 저장된 값이 없으면 오른쪽 아래(게임 버튼 줄 위). 있으면 left/top 으로 두고 화면 안으로 당김
    const place = (node, pos) => {
      if (pos) { node.style.left = pos[0] + "px"; node.style.top = pos[1] + "px"; node.style.right = node.style.bottom = "auto"; }
      else { node.style.left = node.style.top = "auto"; node.style.right = right + "px"; node.style.bottom = `calc(env(safe-area-inset-bottom,0px) + ${bottom}px)`; }
    };
    const clampXY = (node, x, y) => {
      const w = node.offsetWidth || 48, h = node.offsetHeight || 48, m = 4;
      return [Math.round(Math.min(Math.max(m, x), Math.max(m, vw() - w - m))), Math.round(Math.min(Math.max(m, y), Math.max(m, vh() - h - m)))];
    };
    const clamp = node => {                                  // 지금 자리가 화면 밖으로 나갔으면 안으로
      if (node.hidden) return;
      const r = node.getBoundingClientRect();
      const [x, y] = clampXY(node, r.left, r.top);
      if (Math.abs(x - r.left) > 0.5 || Math.abs(y - r.top) > 0.5) place(node, [x, y]);
    };
    const persist = () => { const v = load(key).v; save(key, v === undefined ? st : { ...st, v }); };   // 버튼이 쓴 켬/끔(v)은 지키기
    const subs = new Set();
    const apply = () => {
      if (dead) return;
      for (const f of subs) { try { f(api); } catch (e) { console.error(e); } }
      el.hidden = !visible || collapsed;
      chip.hidden = !visible || !collapsed;
      if (!el.hidden) { place(el, st.p); clamp(el); }
      if (!chip.hidden) { place(chip, st.c); clamp(chip); }
      minBtn.setAttribute("aria-expanded", String(!collapsed));
    };

    // 끌기: 4px 넘게 움직이면 끌기, 아니면 톡(동그라미는 펼치기)
    function draggable(handle, node, onTap, which) {
      let sx = 0, sy = 0, ox = 0, oy = 0, id = null, moved = false;
      handle.addEventListener("pointerdown", e => {
        if (e.button > 0 || (node === el && e.target.closest(".cpn-min"))) return;
        const r = node.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; id = e.pointerId; moved = false;
        try { handle.setPointerCapture(id); } catch (_) {}
        e.preventDefault();
      });
      handle.addEventListener("pointermove", e => {
        if (e.pointerId !== id) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true; el.classList.add("drag");
        place(node, clampXY(node, ox + dx, oy + dy));
      });
      const end = e => {
        if (e.pointerId !== id) return;
        id = null; el.classList.remove("drag");
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        if (moved) { const r = node.getBoundingClientRect(); st[which] = clampXY(node, r.left, r.top); persist(); }
        else if (onTap && e.type === "pointerup") onTap();
      };
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    }
    draggable(hd, el, null, "p");
    draggable(chip, chip, () => api.collapse(false), "c");
    // 펼친 직후 잠깐은 − 를 안 받음: 동그라미를 톡 → 창이 그 자리(− 단추가 손가락 밑)에 열리고, 같은 톡의 click 이 − 로 가서 다시 접히던 것(깜빡임, 11-01)
    let quietUntil = 0;
    const minTap = e => { e.stopPropagation(); if (Date.now() < quietUntil) return; api.collapse(true); };
    minBtn.addEventListener("click", minTap);
    minBtn.addEventListener("pointerup", minTap);   // 끌기 바로 뒤 톡도 확실히 (여러 번 불려도 같음)
    chip.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); api.collapse(false); } });
    chip.addEventListener("click", e => { if (e.detail === 0) api.collapse(false); });   // 키보드 클릭(포인터 없음)만
    const onResize = () => { if (!el.hidden) clamp(el); if (!chip.hidden) clamp(chip); };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const api = {
      el, body, chip, game, key,
      onChange(fn) { subs.add(fn); return () => subs.delete(fn); },   // 보이기·접기가 바뀔 때마다
      get visible() { return visible; },
      get collapsed() { return collapsed; },
      set(html) {
        if (dead) return api;
        body.innerHTML = html == null ? "" : String(html);
        if (collapsed && visible && html) chip.classList.add("new");
        if (!el.hidden) requestAnimationFrame(() => clamp(el));   // 내용이 늘면 화면 안으로
        return api;
      },
      show() { visible = true; apply(); return api; },
      hide() { visible = false; apply(); return api; },
      toggle(on) { visible = on === undefined ? !visible : !!on; apply(); return api; },
      collapse(on) {
        const was = collapsed;
        collapsed = on === undefined ? !collapsed : !!on;
        // 접기·펴기는 같은 자리에서 (11-01 베니 님: 따로 놀면 흐름이 끊김) — 동그라미는 창 머리줄 오른쪽(− 단추 자리), 펼친 창은 동그라미 자리에 오른쪽을 맞춤
        if (visible && collapsed && !was && !el.hidden) { const r = el.getBoundingClientRect(); st.c = clampXY(chip, r.right - 48, r.top); }
        else if (visible && !collapsed && was && !chip.hidden) { const r = chip.getBoundingClientRect(), w = el.offsetWidth || Math.min(320, vw() * 0.86); st.p = clampXY(el, r.right - w, r.top); }
        st.z = collapsed ? 1 : 0; persist();
        if (!collapsed && was) quietUntil = Date.now() + 500;
        if (!collapsed) chip.classList.remove("new");
        apply();
        if (!collapsed) body.scrollTop = 0;
        return api;
      },
      destroy() {
        if (dead) return; dead = true;
        window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize);
        subs.clear(); el.remove(); chip.remove();
      },
    };
    apply();
    return api;
  }

  // 게임 아래 버튼 줄의 '🧑‍🏫 AI 선생님' 버튼 하나로 창을 켜고 끄기 (모든 게임이 같은 모양)
  // button(el, panel, { remember: true, onToggle(on) {} }) → { sync(), destroy() }
  // · el 이 비어 있으면 '🧑‍🏫 AI 선생님' 글을 넣음 · 켜짐이면 class "cpn-on" + aria-pressed="true"
  // · remember(기본 true): 사용자가 끈 것을 게임마다 기억 (다음에 열어도 꺼진 채)
  function button(btn, panel, o = {}) {
    style();
    if (!btn || !panel) return { sync() {}, destroy() {} };
    if (!btn.textContent.trim()) btn.innerHTML = `<span class="ic">🧑‍🏫</span><span>AI 선생님</span>`;
    btn.classList.add("cpn-dock");
    const remember = o.remember !== false;
    const prefOff = () => remember && load(panel.key).v === 0;
    if (prefOff()) panel.hide();
    const sync = () => {
      const on = panel.visible;
      btn.classList.toggle("cpn-on", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.title = on ? "AI 선생님 끄기" : "AI 선생님 켜기";
    };
    const onClick = () => {
      const on = !panel.visible;
      if (on) { panel.show(); panel.collapse(false); } else panel.hide();
      if (remember) { const st = load(panel.key); st.v = on ? 1 : 0; save(panel.key, st); }
      if (o.onToggle) try { o.onToggle(on); } catch (e) { console.error(e); }
    };
    btn.addEventListener("click", onClick);
    const off = panel.onChange(sync);
    sync();
    return { sync, destroy() { btn.removeEventListener("click", onClick); off(); btn.classList.remove("cpn-dock", "cpn-on"); } };
  }
  // 사용자가 '끔'으로 둔 게임인가 (게임이 창을 처음 띄울지 정할 때)
  const isOff = game => load("game.coach." + game).v === 0;

  window.CoachPanel = { create, button, isOff };
})();
