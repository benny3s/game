/* 📒 아쉬운 장면 노트 (common/mistakes.js) — 모든 게임 공통 (10-31 베니 님: '게임별 복기'보다 '아쉬웠던 판단' 기준 복기가 효과 큼)
   · 복기 선생님(또는 판 끝 자동 분석)이 '내 수'가 추천보다 많이 손해였던 장면을 이 기기에 모음 (localStorage game.mistakes.v1, 최대 80개)
   · 아케이드 첫 화면·게임 첫 화면 '📒 아쉬운 장면' → 목록(손해 큰 순 · 게임별) → 누르면 그 게임이 ?drill=<id> 로 열리고 그 장면부터 연습 판
   게임에서 쓰는 법:
     Mistakes.add({ game, title, scene, my, best, why, sev(0~100 얼마나 아쉬운지), lossText, drill:{ rec, k } }) → id   (같은 판·같은 장면은 하나로)
     const m = Mistakes.fromUrl('gostop')  → 주소에 ?drill=<id> 가 있고 이 게임 것이면 그 항목 (주소의 drill 은 지움)
     Mistakes.solved(id)  → 다시 해 보고 추천대로 했을 때 ✅ (목록 아래로)
     Mistakes.open({ game })  → 목록 창 · Mistakes.count(game) */
(() => {
  const KEY = "game.mistakes.v1", MAX = 80;
  const GAMES = {
    gostop: ["🎴", "고스톱"], seotda: ["🀄", "섯다"], onecard: ["🃏", "원카드"], poker: ["♠️", "포커"],
    baduk: ["⚫", "바둑"], omok: ["⚪", "오목"], chess: ["♟️", "체스"], janggi: ["🐘", "장기"], billiards: ["🎱", "당구"], yut: ["🎲", "윷놀이"],
  };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  function save(list) {
    for (let n = 0; n < 4; n++) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
      catch (e) { if (list.length < 2) return false; list.splice(Math.ceil(list.length / 2)); }   // 저장 공간이 차면 오래된·덜 아쉬운 것부터 줄임
    }
    return false;
  }
  const rank = (a, b) => (a.solved - b.solved) || (b.sev - a.sev) || (b.at - a.at);
  const keyOf = m => {
    const r = (m.drill && m.drill.rec) || {};
    return m.game + ":" + (r.at || r.t || "") + ":" + (m.drill && m.drill.k != null ? m.drill.k : "");
  };
  const clean = v => String(v ?? "").slice(0, 160);

  function add(m) {
    if (!m || !GAMES[m.game] || !m.drill) return null;
    const list = load(), key = keyOf(m);
    const f = { title: clean(m.title), scene: clean(m.scene), my: clean(m.my), best: clean(m.best), why: clean(m.why), lossText: clean(m.lossText), sev: Math.max(0, Math.min(100, Math.round(+m.sev || 0))) };
    const old = list.find(x => x.key === key);
    if (old) { Object.assign(old, f); save(list); return old.id; }
    const e = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), key, game: m.game, at: Date.now(), tries: 0, solved: 0, drill: m.drill }, f);
    list.push(e);
    list.sort(rank);
    if (list.length > MAX) list.length = MAX;
    save(list);
    for (const fn of subs) try { fn(); } catch (err) {}
    return e.id;
  }
  function fromUrl(game) {
    const id = new URLSearchParams(location.search).get("drill");
    if (!id) return null;
    const qs = location.search.replace(/([?&])drill=[^&]*(&|$)/, (m, a, b) => (b ? a : "")).replace(/[?&]$/, "");   // drill 만 빼고 나머지(?debug 등)는 그대로
    try { history.replaceState(history.state, "", location.pathname + qs + location.hash); } catch (e) {}
    const list = load(), e = list.find(x => x.id === id);
    if (!e || (game && e.game !== game)) return null;
    e.tries = (e.tries || 0) + 1; e.last = Date.now();
    save(list);
    return e;
  }
  function solved(id) { const list = load(), e = list.find(x => x.id === id); if (!e) return; e.solved = 1; list.sort(rank); save(list); }
  function remove(id) { save(load().filter(x => x.id !== id)); }
  const list = game => load().filter(x => !game || x.game === game).sort(rank);
  const count = game => list(game).filter(x => !x.solved).length;
  const subs = [];

  // 게임 주소: 이 파일(common/mistakes.js) 옆 폴더 기준
  const base = (() => { const s = document.currentScript && document.currentScript.src; try { return new URL("../", s || location.href).href; } catch (e) { return "/game/"; } })();
  const gameUrl = e => base + e.game + "/?drill=" + encodeURIComponent(e.id);

  const css = `
.mst-ov{position:fixed;inset:0;z-index:230;background:rgba(4,9,16,.82);backdrop-filter:blur(8px);display:grid;place-items:center;padding:12px}
.mst-box{background:#121c2a;border:1.5px solid rgba(255,255,255,.14);color:#f1f5f9;border-radius:18px;padding:16px;width:min(520px,100%);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;gap:10px;box-shadow:0 24px 60px rgba(0,0,0,.7);font:14px/1.5 'Pretendard Variable','Noto Sans KR',system-ui,sans-serif}
.mst-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
.mst-hd h2{margin:0;font-size:18px;color:#fde68a}
.mst-x{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#f1f5f9;border-radius:8px;padding:5px 10px;cursor:pointer;font:600 13px inherit}
.mst-sub{margin:0;font-size:12.5px;color:#94a3b8}
.mst-tabs{display:flex;gap:6px;flex-wrap:wrap}
.mst-tabs button{border:1px solid #334155;background:#0c131d;color:#cbd5e1;border-radius:999px;padding:5px 10px;font:600 12.5px inherit;cursor:pointer}
.mst-tabs button.on{border-color:#fbbf24;color:#fff;background:#3a2e0b}
.mst-list{overflow:auto;display:grid;gap:8px;padding-right:2px}
.mst-it{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:12px;padding:10px 11px;display:grid;gap:4px}
.mst-it.ok{opacity:.55}
.mst-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;color:#94a3b8}
.mst-top b{color:#f1f5f9;font-size:13.5px}
.mst-sev{margin-left:auto;font-weight:800;color:#fca5a5}
.mst-mv{font-size:13px}.mst-mv .bad{color:#fca5a5}.mst-mv .good{color:#86efac}
.mst-why{font-size:12.5px;color:#cbd5e1}
.mst-act{display:flex;gap:6px;justify-content:flex-end}
.mst-act button{border:0;border-radius:8px;padding:7px 12px;font:700 13px inherit;cursor:pointer}
.mst-go{background:linear-gradient(90deg,#f59e0b,#d97706);color:#1a1205}
.mst-del{background:#1e293b;color:#94a3b8;border:1px solid #334155!important}
.mst-empty{color:#94a3b8;font-size:13px;text-align:center;padding:18px 6px}`;
  let styled = false;
  const style = () => { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); };

  function open(o = {}) {
    style();
    let cur = o.game || "";
    const ov = document.createElement("div");
    ov.className = "mst-ov";
    const close = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) close(); };
    const draw = () => {
      const all = list(), items = all.filter(x => !cur || x.game === cur);
      const per = {}; for (const x of all) if (!x.solved) per[x.game] = (per[x.game] || 0) + 1;
      const tabs = [["", `전체 ${all.filter(x => !x.solved).length}`]].concat(Object.keys(GAMES).filter(g => per[g]).map(g => [g, `${GAMES[g][0]} ${GAMES[g][1]} ${per[g]}`]));
      ov.innerHTML = `<div class="mst-box" role="dialog" aria-modal="true">
        <div class="mst-hd"><h2>📒 아쉬운 장면</h2><button class="mst-x" data-x>✕ 닫기</button></div>
        <p class="mst-sub">복기에서 선생님이 찾은 '추천보다 많이 손해였던 내 수'를 모아 둬요 (이 기기). 누르면 그 장면부터 다시 해 봐요.</p>
        <div class="mst-tabs">${tabs.map(([g, t]) => `<button data-g="${g}" class="${g === cur ? "on" : ""}">${esc(t)}</button>`).join("")}</div>
        <div class="mst-list">${items.length ? items.map(x => `
          <div class="mst-it${x.solved ? " ok" : ""}">
            <div class="mst-top">${GAMES[x.game][0]} <b>${esc(x.scene || "")}</b> · ${esc(x.title || GAMES[x.game][1])}<span class="mst-sev">${x.solved ? "✅ 해냄" : esc(x.lossText || "")}</span></div>
            <div class="mst-mv">내 수 <b class="bad">${esc(x.my)}</b> → 추천 <b class="good">${esc(x.best)}</b></div>
            ${x.why ? `<div class="mst-why">${esc(x.why)}</div>` : ""}
            <div class="mst-act"><button class="mst-del" data-del="${esc(x.id)}">🗑 지우기</button><button class="mst-go" data-go="${esc(x.id)}">🎮 이 장면부터${x.tries ? ` (${x.tries}번 해 봄)` : ""}</button></div>
          </div>`).join("") : `<div class="mst-empty">아직 없어요. 게임 결과 창의 🎞️ 복기에서 🧑‍🏫 선생님을 켜고 보면, 손해가 큰 내 수가 여기에 모여요.</div>`}</div>
      </div>`;
      ov.querySelector("[data-x]").onclick = close;
      ov.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { cur = b.dataset.g; draw(); });
      ov.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { remove(b.dataset.del); draw(); });
      ov.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const e = all.find(x => x.id === b.dataset.go); if (e) location.href = gameUrl(e); });
    };
    draw();
    document.body.appendChild(ov);
    return close;
  }

  window.Mistakes = { add, fromUrl, solved, remove, list, count, open, onChange: f => subs.push(f), GAMES };
})();
