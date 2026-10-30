/* 지렁이 대결 — 헬퍼 감지기 (공부용)
   두 쪽에서 본다:
     · 플레이어 컴퓨터(클라이언트): 가짜 입력(isTrusted), 이벤트 없이 바뀐 입력(변수 조작), 주입된 스크립트·화면, 입력 간격 규칙성
     · 방장 컴퓨터(서버 역할): 위험이 정면에 나타난 뒤 피하기까지 반응 시간, 위험을 피한 비율 — 플레이어가 속이기 어려운 '행동' 신호
   결과는 관리자만 읽을 수 있는 곳(snake/ac)에 기록. 혼자 연습할 땐 '내 감지기 보기'로 본인도 볼 수 있음. */
const AC = (() => {
  const known = new Set([...document.scripts].map(s => s.src || "inline"));
  const injectedNow = () => {
    const canv = document.querySelectorAll("canvas").length - 2;               // 게임 캔버스 + 미니맵 = 2
    const SAFE = /\/(core|render|ac|net|main|glog)\.js(\?|$)/;
    const scripts = [...document.scripts].filter(s => !known.has(s.src || "inline") && !(s.src || "").includes("gstatic.com/firebasejs") && !SAFE.test(s.src || "")).length;
    return { canv: Math.max(0, canv), scripts };
  };

  // 클라이언트 신호: 내 컴퓨터의 입력을 지켜봄
  function client(input) {
    const st = { events: 0, untrusted: 0, intervals: [], lastEvt: 0, lastEventAt: 0, lastSeen: null, lastSeenAt: 0, aimIvs: [], tamper: 0, log: [] };
    const say = m => { st.log.unshift(`${new Date().toLocaleTimeString()} ${m}`); st.log.length = Math.min(st.log.length, 8); };
    return {
      onEvent(kind, e) {
        const t = performance.now(); st.events++; st.lastEventAt = t;
        if (!e.isTrusted) { if (!st.untrusted) say("가짜 입력: 스크립트가 만든 이벤트 (isTrusted=false)"); st.untrusted++; }
        if (kind === "move") { if (st.lastEvt) st.intervals.push(t - st.lastEvt); st.lastEvt = t; if (st.intervals.length > 200) st.intervals.shift(); }
      },
      onStep(now) {
        const tgt = (input.target ? input.target[0].toFixed(3) + "," + input.target[1].toFixed(3) : "") + "|" + (input.aim != null ? input.aim.toFixed(4) : "") + "|" + (input.turn || 0);
        if (tgt !== st.lastSeen) {
          // 조향이 바뀐 시각 자체를 기록 — 마우스 이벤트가 있든 없든 남으므로 '이벤트 안 만들고 변수만 고치는' 쪽도 걸림
          if (st.lastSeenAt) { st.aimIvs.push(now - st.lastSeenAt); if (st.aimIvs.length > 200) st.aimIvs.shift(); }
          st.lastSeenAt = now;
          if (st.lastSeen !== null && now - st.lastEventAt > 150 && !input._own) { if (!st.tamper) say("입력 변조: 마우스 이벤트 없이 목표 좌표가 바뀜"); st.tamper++; }
          st.lastSeen = tgt;
        }
        input._own = false;
      },
      summary() {
        const cv = a => {
          const v = a.slice(-80), mean = v.reduce((x, y) => x + y, 0) / (v.length || 1);
          return v.length > 1 && mean > 0 ? Math.sqrt(v.reduce((x, y) => x + (y - mean) ** 2, 0) / v.length) / mean : null;
        };
        const cve = cv(st.intervals), cva = cv(st.aimIvs);
        const inj = injectedNow();
        return {
          sig: [
            ["가짜 입력 (isTrusted=false)", st.untrusted > 0, `${st.untrusted}번`, 40],
            ["입력 변조 (이벤트 없이 좌표 바뀜)", st.tamper >= 2, `${st.tamper}번`, 35],
            ["주입된 스크립트·덧그린 화면", inj.canv + inj.scripts > 0, `스크립트 ${inj.scripts} · 화면 ${inj.canv}`, 20],
            ["조향이 기계적으로 규칙적임 (변동 < 0.25)", st.aimIvs.length >= 20 && cva < 0.25, cva == null ? "자료 부족" : `변동 ${cva.toFixed(2)} (${st.aimIvs.length}번)`, 15],
            ["마우스 입력 간격이 너무 일정함 (변동 < 0.25)", st.intervals.length >= 30 && cve < 0.25, cve == null ? "자료 부족" : `변동 ${cve.toFixed(2)}`, 10],
          ], log: st.log,
        };
      },
      reset() { Object.assign(st, { untrusted: 0, intervals: [], aimIvs: [], tamper: 0, log: [] }); },
    };
  }

  // 행동 신호: 시뮬레이션을 돌리는 쪽(혼자 할 땐 내 컴퓨터, 같이 할 땐 방장)이 지렁이마다 봄
  function behavior() {
    const st = { on: false, at: 0, need: 0, reacted: true, reactions: [], episodes: 0, survived: 0 };
    return {
      onStep(o, action, now) {
        let danger = 0;
        for (const k of [15, 0, 1]) danger = Math.max(danger, o[k * 4 + 2], o[k * 4 + 3]);
        const left = Math.max(o[1 * 4 + 2], o[2 * 4 + 2], o[1 * 4 + 3]), right = Math.max(o[15 * 4 + 2], o[14 * 4 + 2], o[15 * 4 + 3]);
        const side = left > right ? -1 : 1, turn = action % 3 - 1;
        if (!st.on && danger > 0.45) { st.on = true; st.at = now; st.need = side; st.reacted = turn === side; st.episodes++; }
        if (st.on && !st.reacted && turn === st.need) { st.reacted = true; st.reactions.push(now - st.at); if (st.reactions.length > 60) st.reactions.shift(); }
        if (st.on && danger < 0.28) { st.on = false; st.survived++; }
      },
      onDeath() { st.on = false; },
      summary() {
        const r = [...st.reactions].sort((a, b) => a - b), med = r.length ? r[Math.floor(r.length / 2)] : null;
        const avoid = st.episodes ? st.survived / st.episodes : null;
        return {
          sig: [
            ["반응이 사람보다 빠름 (중앙값 < 180ms)", r.length >= 3 && med < 180, med == null ? "자료 부족" : `${Math.round(med)}ms (${r.length}번)`, 25],
            ["위험을 거의 다 피함 (95% 이상, 10번+)", st.episodes >= 10 && avoid >= 0.95, avoid == null ? "자료 부족" : `${Math.round(avoid * 100)}% (${st.episodes}번)`, 10],
          ],
        };
      },
      reset() { Object.assign(st, { on: false, reactions: [], episodes: 0, survived: 0 }); },
    };
  }

  // 선언 면제: 메뉴에서 '헬퍼'를 골라 쓴 사람은 주입 신호(20점)를 빼준다 — 숨기지 않았다는 사실 자체를 보상
  const total = (sigs, o) => Math.min(100, sigs.reduce((a, s) => a + (s[1] && !(o && o.declared && /^주입/.test(s[0])) ? s[3] : 0), 0));
  const verdict = n => n >= 60 ? ["헬퍼 사용 의심 높음", "hot"] : n >= 25 ? ["주의 관찰", "warn"] : ["정상으로 보임", "ok"];
  return { client, behavior, total, verdict };
})();
