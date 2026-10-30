/* 베니큐브 자리 정하기 — 친구랑(온라인) · 한 폰으로(돌려 가며) 공통, 화면 없이 Node 에서도 시험 */
(function (root) {
  "use strict";
  const MAX = 4, MIN = 2;   // 규칙상 2~4명

  // 친구랑 자리 순서: 방장 먼저, 그다음 들어온 순서(t), 같으면 uid — 모든 기기가 같은 순서
  function seatOrder(players, host) {
    const pl = players || {};
    return Object.keys(pl).sort((a, b) =>
      ((b === host) - (a === host)) || ((+pl[a].t || 0) - (+pl[b].t || 0)) || (a < b ? -1 : a > b ? 1 : 0));
  }

  // 판 인원: 사람 수 + AI 채우기(fill = 목표 인원, 0 이면 사람만) → 2~4
  function tableSize(humans, fill) {
    return Math.min(MAX, Math.max(MIN, humans | 0, fill | 0));
  }

  // 대기실 안내: 모인 사람 수 → 짧은 글
  function describe(n, fill) {
    n = n | 0;
    const t = tableSize(n, fill);
    const ai = Math.max(0, t - Math.min(n, MAX));
    if (n < MIN && !ai) return "2명부터 시작할 수 있어요 (최대 4명)";
    const base = t === 2 ? "1:1 맞대결" : t === 3 ? "셋이서 한 판" : "넷이서 한 판 (최대)";
    return `${n}명이면 ${base}` + (ai ? ` · AI ${ai}명이 함께해요` : "");
  }

  // 자리 짜기: humans = [{ id, name }] (자리 순서대로), 남는 자리는 AI
  // 돌려줌: [{ kind: "human"|"bot", id, name }]
  function lineup(humans, fill, botNames) {
    const hs = (humans || []).slice(0, MAX);
    const n = tableSize(hs.length, fill);
    const names = botNames || ["민수", "서연", "도윤", "지우"];
    const out = hs.map(h => ({ kind: "human", id: h.id, name: h.name }));
    let b = 0;
    while (out.length < n) { out.push({ kind: "bot", id: null, name: names[b % names.length] }); b++; }
    return out;
  }

  // 다음 판 자리 짜기 (친구랑 방장): seats = 지금 자리 [{ id(사람 uid, AI 는 null), name, av, total, sub, drop }],
  // fresh = 이번에 새로 끼는 구경꾼 [{ id, name, av }] (들어온 순서), fill = AI 채우기 목표 인원(0 = 사람만)
  // → 새 자리 [{ id, name, av, total, sub, bot }] — 빼기 표시(drop)한 사람은 빠지고, 새 사람은 4명까지, 모자라면 AI 를 채우고, 넘치면 AI 부터 덜어 냄
  function nextLineup(seats, fresh, fill, botNames) {
    const names = botNames || ["민수", "서연", "도윤", "지우"];
    const out = (seats || []).filter(s => !s.drop).map(s => ({ id: s.id || null, name: s.name, av: s.av, total: s.total | 0, sub: !!s.sub && !!s.id, bot: !s.id }));
    const humans = () => out.filter(s => s.id).length;
    for (const f of fresh || []) {
      if (humans() >= MAX) break;
      if (out.some(s => s.id === f.id)) continue;
      out.push({ id: f.id, name: f.name, av: f.av, total: 0, sub: false, bot: false });
    }
    const size = tableSize(humans(), fill);
    while (out.length > size) {                           // 넘치면 뒤쪽 AI 부터
      let i = -1; for (let k = out.length - 1; k >= 0; k--) if (out[k].bot) { i = k; break; }
      if (i < 0) break;
      out.splice(i, 1);
    }
    let b = out.filter(s => s.bot).length;
    while (out.length < size) { out.push({ id: null, name: names[b % names.length], av: "🀄", total: 0, sub: false, bot: true }); b++; }
    return out;
  }

  // 한 폰으로: 지금 화면을 봐야 할 사람 자리 (차례가 사람이면 그 자리, AI 차례면 -1)
  function viewerFor(levels, st) {
    if (!st || st.phase === "over") return -1;
    return levels[st.turn] === "human" ? st.turn : -1;
  }

  // 한 폰으로: 가림막이 필요한가 — 사람이 둘 이상이고, 지금 보는 사람(viewing)이 다음 사람과 다를 때
  function needCover(levels, viewing, st) {
    let humans = 0;
    for (const l of levels) if (l === "human") humans++;
    if (humans < 2 || !st || st.phase === "over") return false;
    const v = viewerFor(levels, st);
    return v < 0 ? viewing >= 0 : v !== viewing;
  }

  const API = { MAX, MIN, seatOrder, tableSize, describe, lineup, nextLineup, viewerFor, needCover };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CubeTable = API;
})(typeof window !== "undefined" ? window : globalThis);
