/* 스타크래프트 — 관리자(포털 로그인)면 이 PC 의 플루토 봇 클라이언트를 띄우는 단추판
   클릭 → benny-sc://run/<solo|guest|team|ffa> → D:\StarCraft116\_dl\arcade-run.cmd
        → 로컬 아케이드 서버(127.0.0.1:8787) /api/admin/direct → bot-client.ps1 (Pluto 주입)
   친구는 배틀넷 앱 → 스타크래프트: 리마스터 → 멀티플레이 → 배틀넷 → 커스텀 게임 → 방 이름 참가
   (이 페이지의 127.0.0.1 주소는 친구 PC 에서 열리지 않으므로 친구 화면에는 링크를 걸지 않는다) */
(() => {
  const $ = id => document.getElementById(id);
  // 대전 신청 페이지 주소 (터널을 열면 이 값만 바꾸면 됨)
  const ARCADE_URL = "http://127.0.0.1:8787/";

  const note = t => { const n = $("note"); if (n) n.textContent = t; };
  const LABEL = {
    solo: "나 vs 플루토 (로컬 1:1, Melee)",
    guest: "플루토 vs 친구 (친구가 커스텀 방 참가)",
    duo: "나랑 친구랑 (사람끼리, 봇 없음)",
    team: "나 + 친구 vs 플루토 (Top vs Bottom, 플루토 단독 팀)",
    ffa: "나 vs 친구 vs 플루토 (3인)",
  };

  // 랭크 = 반응 지연 + APM 상한. 8787 관리자 화면과 같은 표를 쓴다.
  const RANK = {
    S: ["원본 풀파워", "반응 0ms · APM 무제한 — 사람이 이기기 거의 불가능"],
    A: ["아주 어려움", "반응 80ms · APM 무제한"],
    B: ["어려움", "반응 170ms · APM 무제한"],
    C: ["보통 · 기본", "반응 250ms · APM 220"],
    D: ["쉬움", "반응 400ms · APM 170"],
    E: ["아주 쉬움", "반응 600ms · APM 130"],
    F: ["연습용", "반응 800ms · APM 100 — 입문 상대용"],
  };
  let RK = "C";

  function paintRank() {
    const d = RANK[RK] || RANK.C;
    const box = $("rkd");
    if (box) box.innerHTML = "<b>" + RK + " — " + d[0] + "</b> · " + d[1];
    document.querySelectorAll(".rkbtn").forEach(b => b.classList.toggle("on", b.dataset.rank === RK));
    const frk = $("frk");
    if (frk) frk.innerHTML = "지금 고른 난이도: <b>" + RK + " (" + d[0] + ")</b> · 방 이름 뒤에 [" + RK + "] 가 붙어요.";
  }
  document.querySelectorAll(".rkbtn").forEach(b => {
    b.onclick = () => { RK = b.dataset.rank; paintRank(); };
  });
  paintRank();

  // 친구는 배틀넷으로만 접속한다 — 127.0.0.1 은 친구 PC 에서 열리지 않으므로 링크를 걸지 않는다
  function friendView(msg) {
    $("friend").classList.remove("hidden");
    const r = $("req");
    if (r) { r.remove(); }                     // 죽은 localhost 링크 제거
    note(msg);
    paintRank();
    const c = $("copy");
    if (c) {
      c.onclick = async () => {
        const txt = "스타크래프트 대전 신청 — 플루토 난이도 " + RK + " (" + (RANK[RK] || RANK.C)[0] + "), 모드: 플루토 vs 나";
        try { await navigator.clipboard.writeText(txt); c.textContent = "✅ 복사됨 — 카톡에 붙여넣기"; }
        catch (e) { c.textContent = "복사 실패 — " + txt; }
        setTimeout(() => { c.textContent = "📋 이 난이도로 신청 문구 복사"; }, 4000);
      };
    }
  }

  function fallback() {
    friendView("보는 사람 화면입니다. 관리자 기능은 포털 로그인 후 보입니다.");
  }

  function showAdmin() {
    $("admin").classList.remove("hidden");
    friendView("관리자로 로그인돼 있어요. 버튼을 누르면 이 PC 에 게임 창이 뜹니다.");
    document.querySelectorAll("button[data-mode]").forEach(b => {
      b.onclick = () => {
        const m = b.dataset.mode;
        location.href = "benny-sc://run/" + m + "?rank=" + RK;
        $("st").textContent = LABEL[m] + " · 랭크 " + RK + " — 이 PC 에 창이 뜹니다 (10초쯤 걸림). 검은 창은 그대로 두세요.";
      };
    });
    $("stop").onclick = () => {
      location.href = "benny-sc://stop";
      $("st").textContent = "경기 종료 요청을 보냈어요.";
    };
  }

  if (typeof Gate === "undefined" || !Gate.state) { fallback(); return; }
  const apply = s => {
    if (s && s.isAdmin) showAdmin();
    else friendView("친구용 화면입니다. 게임 창은 베니 님 PC 에서만 뜹니다.");
  };
  apply(Gate.state);
  if (Gate.onChange) Gate.onChange(apply);
})();
