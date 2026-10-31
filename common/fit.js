/* 화면 아래 여백 (common/fit.js) — 갤럭시 폴드처럼 아래 작업 표시줄이 웹 화면을 덮는데 브라우저가 그 크기를 알려 주지 않는 기기용
   · <html> 에 --gap-b (아래로 비울 높이) 를 둠. 게임 CSS 는 height: calc(100dvh - var(--gap-b, 0px)) 로 씀
   · localStorage game.gapb = "1" 켬 · "0" 끔 · 없으면 자동 (폴드 모델 SM-F9… 이면 켬)
   · FitGap.on (지금 켜졌나) · FitGap.set(true|false|null) — null 이면 자동으로 되돌림 */
(() => {
  const H = 56;                                                     // 폴드 작업 표시줄 높이쯤 (px)
  const KEY = "game.gapb";
  let auto = false;
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const isOn = () => { const v = saved(); return v === "1" ? true : v === "0" ? false : auto; };
  const apply = () => document.documentElement.style.setProperty("--gap-b", isOn() ? H + "px" : "0px");
  apply();
  try {                                                             // 크롬 계열은 기기 모델을 알려 줌 (갤럭시 폴드 = SM-F9xx)
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues)
      navigator.userAgentData.getHighEntropyValues(["model"]).then(d => { auto = /^SM-F9/i.test((d && d.model) || ""); apply(); }).catch(() => {});
  } catch (e) {}
  window.FitGap = {
    get on() { return isOn(); },
    set(v) { try { if (v == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} apply(); },
  };
})();
