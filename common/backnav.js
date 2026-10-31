/* 휴대폰 '뒤로' (common/backnav.js) — 모든 게임 공통 (11-01 베니 님: 뒤로 한 번에 게임이 꺼지면 안 됨)
   · 떠 있는 창(족보·규칙·랭킹·설정 창 …)이 있으면 → 그 창만 닫음
   · 없으면 → "↩️ 한 번 더 누르면 나가요" 만 띄우고, 바로 한 번 더 누르면 그때 나감
   · 바둑·체스·장기·오목처럼 게임이 뒤로를 직접 다루면(window.__ownBack) 아무것도 안 함
   · 크롬은 손가락으로 누른 적 없이 넣은 '뒤로 칸'은 건너뛰므로, 누를 때마다(pointerdown) 칸이 없으면 하나 넣어 둠 */
(() => {
  if (window.BackNav) return;
  let armed = false;
  const own = () => { const o = window.__ownBack; return typeof o === 'function' ? !!o() : !!o; };   // 게임이 지금 뒤로를 직접 맡는 중인가
  const arm = () => { if (armed || own()) return; armed = true; try { history.pushState({ backnav: 1 }, ""); } catch (e) { armed = false; } };
  addEventListener("pointerdown", arm, true);
  addEventListener("keydown", arm, true);

  // 떠 있는 창 찾기 (게임마다 이름이 달라 흔한 모양을 다 봄) — 맨 위(나중에 그려진) 것부터
  const OPEN = ['.overlay:not([hidden])', '.modal:not([hidden])', '[role="dialog"]:not([hidden])', '[aria-modal="true"]', 'dialog[open]',
    '.rk-ov', '.gme-ov', '.bk-ov', '.mst-ov', '.cozy-ov', '.hr-ov'].join(",");
  const shown = el => { if (!el.isConnected) return false; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // 친구랑 '대기실·방 목록' 창(.arn-ov)은 뒤로로 닫지 않음 — 그 방에서 나가는 건 두 번 누르기로
  const topOpen = () => [...document.querySelectorAll(OPEN)].filter(el => shown(el) && !el.closest(".arn-ov")).pop() || null;
  function closeIt(el) {
    const b = el.querySelector('[data-x], .rk-x, .bk-x, .gme-x, .x-btn, .close, [aria-label="닫기"], [data-close], [id^="close"], button.ghost[data-no]');
    if (b && shown(b)) { b.click(); return; }
    const esc = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true });
    el.dispatchEvent(esc);                                        // 창에서 올라가 document·window 처리기까지 감 (document 에 따로 쏘면 e.target.closest 가 없어 게임이 멈춤 — 당구)
    setTimeout(() => {                                            // Esc 로도 안 닫히면 숨김 (dialog 는 close)
      if (!shown(el)) return;
      if (el.tagName === "DIALOG" && el.close) el.close(); else if (el.matches(".modal, .overlay, [role=dialog]")) el.hidden = true; else el.remove();
    }, 60);
  }
  function toast(msg) {
    try { if (window.Cozy && Cozy.toast) return Cozy.toast(msg, 1800); } catch (e) {}
    let t = document.getElementById("bn-toast");
    if (!t) { t = document.createElement("div"); t.id = "bn-toast"; t.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + var(--gap-b,0px) + 90px);transform:translateX(-50%);z-index:9999;background:rgba(15,23,42,.92);color:#fff;font:700 14px system-ui,sans-serif;padding:9px 14px;border-radius:12px;pointer-events:none"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 1800);
  }
  addEventListener("popstate", () => {
    if (own() || !armed) return;
    armed = false;
    const m = topOpen();
    if (m) { closeIt(m); arm(); return; }                         // 창만 닫고 칸 다시 (다음 뒤로도 막힘)
    toast("↩️ 한 번 더 누르면 나가요");                            // 칸을 다시 안 넣음 → 바로 한 번 더 누르면 나감 (그 사이 화면을 누르면 다시 막힘)
  });
  window.BackNav = { arm, get armed() { return armed; } };
})();
