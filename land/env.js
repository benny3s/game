/* 땅따먹기 — 강화학습용 환경 (Node·브라우저 둘 다). 규칙(core.js)과 봇(bots.js) API 만 씀
   const env = LandEnv.make({ n: 8, agents: [0], tier: 'normal', mode: 'classic' });
   let obs = env.reset(seed);            // 에이전트마다 Float32Array(Land.C.OBS_N) — 내 머리 가운데 · 가는 쪽이 위
   const r = env.step([a]);              // a: 0 그대로 · 1 왼쪽 · 2 오른쪽 → { obs, rewards, done, info }
   보상(기본): 땅 % 변화 (1% 늘면 +1 · 아웃으로 잃은 땅만큼 −) + 남을 아웃시키면 kill · 내가 아웃되면 death
   봇 자리에 다른 정책(학습한 AI · 옛 버전 나)을 끼우려면 env.setPolicy(pid, (st, pid) => 행동) — reset 해도 남음, clearPolicy(pid) 로 되돌림
   opts.gentle = [에이전트 번호] 면 초급·중급 봇이 그 자리를 봐줌 (게임의 혼자 하기와 같은 조건). 기본은 봐주지 않음 */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./core.js') : root.Land;
  const B = node ? require('./bots.js') : root.LandBots;

  function make(opts) {
    opts = Object.assign({ n: 8, agents: [0], tier: 'normal', mode: 'classic', limitSec: 180, size: 0 }, opts || {});
    const RW = Object.assign({ area: 100, kill: 0.5, death: -0.5 }, opts.reward || {});
    const n = opts.n, seat = new Array(n).fill(-1);
    opts.agents.forEach((a, k) => { seat[a] = k; });
    let st = null, ctl = null, prev = null;
    const overrides = {};                   // setPolicy 로 끼운 정책 (reset 해도 그대로 남음)
    const obsAll = () => opts.agents.map(a => L.obs(st, a));
    return {
      opts, actions: 3, obsSize: L.C.OBS_N,
      get state() { return st; },
      reset(seed) {
        seed = seed >>> 0;
        st = L.create({ n, mode: opts.mode, limitSec: opts.limitSec, size: opts.size }, seed);
        ctl = st.players.map((p, i) => {
          if (seat[i] >= 0) return null;
          if (overrides[i]) return overrides[i];
          const tier = Array.isArray(opts.tier) ? opts.tier[i % opts.tier.length] : opts.tier;
          const m = B.create(st, i, tier, (seed * 31 + i * 7919 + 1) >>> 0, { gentle: opts.gentle || [] });
          return (s, pid) => B.decide(s, pid, m);
        });
        prev = st.players.map(p => p.area);
        return obsAll();
      },
      step(actions) {
        const acts = new Array(n);
        for (let i = 0; i < n; i++) acts[i] = seat[i] >= 0 ? (actions[seat[i]] | 0) : ctl[i](st, i);
        const events = L.step(st, acts), total = st.W * st.H;
        const rewards = opts.agents.map(a => (st.players[a].area - prev[a]) / total * RW.area);
        for (const e of events) if (e.t === 'death') {
          if (seat[e.p] >= 0) rewards[seat[e.p]] += RW.death;
          if (e.by >= 0 && e.by !== e.p && seat[e.by] >= 0) rewards[seat[e.by]] += RW.kill;
        }
        prev = st.players.map(p => p.area);
        return { obs: obsAll(), rewards, done: st.over, info: { events, tick: st.tick, results: st.results } };
      },
      // 봇 자리에 정책 끼우기: reset 앞뒤 언제 불러도 되고, 다음 판(reset)에도 계속 씀. clearPolicy 로 다시 봇
      setPolicy(pid, fn) {
        if (!(pid >= 0 && pid < n) || seat[pid] >= 0 || typeof fn !== 'function') return false;
        overrides[pid] = fn; if (ctl) ctl[pid] = fn;
        return true;
      },
      clearPolicy(pid) {
        delete overrides[pid];
        if (ctl && st && seat[pid] < 0) {
          const tier = Array.isArray(opts.tier) ? opts.tier[pid % opts.tier.length] : opts.tier;
          const m = B.create(st, pid, tier, (st.seed * 31 + pid * 7919 + 1) >>> 0, { gentle: opts.gentle || [] });
          ctl[pid] = (s, i) => B.decide(s, i, m);
        }
      },
    };
  }

  const API = { make };
  if (node) module.exports = API;
  else root.LandEnv = API;
})(this);
