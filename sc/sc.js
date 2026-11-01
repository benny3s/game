/* 스타 봇 세상 — 관리자(포털과 같은 로그인)면 이 PC 에 진짜 엔진 창을 띄우는 단추판
   benny-sc://bots/<모드>/<봇1|내 봇>/<상대>/<맵> → 이 PC 의 play/bots.bat (ai-practice rl-08 wsl/bots_run.sh) */
(() => {
  const $ = id => document.getElementById(id);
  const BOTS = [["stardust", "Stardust (프로토스 · 가장 셈)"], ["steamhammer", "Steamhammer (저그)"], ["iron", "Iron (테란)"], ["locutus", "Locutus (프로토스)"]];

  function checkAdmin() {
    return new Promise(ok => {
      try {
        const FBC = { apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6" };
        const app = firebase.apps.find(a => a.name === "[DEFAULT]") || firebase.initializeApp(FBC);
        const t = setTimeout(() => ok(false), 5000);
        const off = app.auth().onAuthStateChanged(async u => { clearTimeout(t); off(); try { ok(!!u && (await u.getIdTokenResult()).claims.admin === 1); } catch (e) { ok(false); } });
      } catch (e) { ok(false); }
    });
  }

  function showLaunch() {
    $("note").textContent = "관리자로 로그인돼 있어요.";
    $("launch").style.display = "grid";
    const fill = (id, def) => { $(id).innerHTML = BOTS.map(([v, t]) => `<option value="${v}"${v === def ? " selected" : ""}>${t}</option>`).join(""); };
    fill("botA", "stardust"); fill("botB", "iron");
    const botUi = () => {
      const m = $("botMode").value;
      $("botARow").style.display = m === "vs" ? "none" : "";
      $("raceRow").style.display = m === "vs" ? "" : "none";
      $("botALab").textContent = m === "assist" ? "내 봇" : "봇 1";
    };
    $("botMode").onchange = botUi; botUi();
    $("botGo").onclick = () => {
      const m = $("botMode").value, map = $("botMap").value;
      const args = m === "vs" ? [$("botB").value, $("botRace").value, map] : [$("botA").value, $("botB").value, map];
      location.href = "benny-sc://bots/" + [m, ...args].join("/");
      $("botSt").textContent = "PC 에 창이 떠요 (10초쯤, 검은 창은 그대로 두세요)";
    };
  }

  checkAdmin().then(ok => {
    if (ok) showLaunch();
    else $("note").textContent = "관리자 전용이에요. 게임 창은 베니 님 PC 에서만 뜹니다.";
  });
})();
