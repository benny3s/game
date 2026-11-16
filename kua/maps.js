/* 베니 크아 — 15×13 텍스트 맵 로더 · 기본 맵 3종 (kua/maps.js)
   · Node · 브라우저 공용 (UMD)
   · 범례: . 빈길 · # 나무/기둥(불멸) · H 집/텐트/선박(불멸) · B 깨지는 블록 · M 밀 수 있는 블록 · G 풀숲(숨기) · 0..7 스폰 */
((root, factory) => {
  const mod = factory(root.KuaRules || (typeof require === "function" ? require("./rules.js") : null));
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.KuaMaps = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, (Rules) => {
  "use strict";

  const COLS = Rules ? Rules.GRID.COLS : 15;
  const ROWS = Rules ? Rules.GRID.ROWS : 13;

  const MAP_DEFS = [
    {
      id: "village10",
      name: "빌리지 10",
      theme: "village",
      desc: "중앙 가로 아스팔트 도로와 4개 주택 단지 · 풀숲 숨기와 정통 교전",
      ascii: [
        "0..B.H.G.H.B..3",
        "..BM#..G..#MB..",
        "B.BBHB.G.BHBB.B",
        "4..B.H...H.B..7",
        "#BMB.......BMB#",
        ".G..BB#.#BB..G.",
        "......M.M......",
        ".G..BB#.#BB..G.",
        "#BMB.......BMB#",
        "6..B.H...H.B..5",
        "B.BBHB.G.BHBB.B",
        "..BM#..G..#MB..",
        "2..B.H.G.H.B..1",
      ].join("\n"),
    },
    {
      id: "patrit14",
      name: "패트릿 14",
      theme: "pirate",
      desc: "사방이 블록으로 가득한 해적 보물창고 · 초반 풀 파밍 난타전",
      ascii: [
        "0..BBBBBBBBBB.3",
        "...MBBBHBBBM...",
        "..#BBMBBBMBB#..",
        "4..BBBBBBBBBB.7",
        ".BBBB#BMB#BBBB.",
        ".BBBM.BBB.MBBB.",
        ".BBBH..H..HBBB.",
        ".BBBM.BBB.MBBB.",
        ".BBBB#BMB#BBBB.",
        "6..BBBBBBBBBB.5",
        "..#BBMBBBMBB#..",
        "...MBBBHBBBM...",
        "2..BBBBBBBBBB.1",
      ].join("\n"),
    },
    {
      id: "camp08",
      name: "캠프 08",
      theme: "camp",
      desc: "넓은 골목과 텐트 진영 · 긴 물줄기와 기습 숨폭 승부",
      ascii: [
        "0..B.G#.#G.B..3",
        "..BB.H...H.BB..",
        "#.B.BB...BB.B.#",
        "4..G..BMB..G..7",
        "#..B.HG.GH.B..#",
        ".B..M.....M..B.",
        "...G.#.H.#.G...",
        ".B..M.....M..B.",
        "#..B.HG.GH.B..#",
        "6..G..BMB..G..5",
        "#.B.BB...BB.B.#",
        "..BB.H...H.BB..",
        "2..B.G#.#G.B..1",
      ].join("\n"),
    },
  ];

  const MAP_BY_ID = Object.fromEntries(MAP_DEFS.map(m => [m.id, m]));

  function parseAsciiMap(ascii) {
    const rawLines = String(ascii || "").trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (rawLines.length !== ROWS) {
      throw new Error(`Invalid map row count: expected ${ROWS}, got ${rawLines.length}`);
    }
    const grid = [];
    const spawns = [];
    for (let r = 0; r < ROWS; r++) {
      const line = rawLines[r];
      if (line.length !== COLS) {
        throw new Error(`Invalid map col count at row ${r}: expected ${COLS}, got ${line.length}`);
      }
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const ch = line[c];
        if (ch >= "0" && ch <= "7") {
          spawns[Number(ch)] = { c, r, slot: Number(ch) };
          row.push(".");
        } else if (ch === "." || ch === "#" || ch === "H" || ch === "B" || ch === "M" || ch === "G") {
          row.push(ch);
        } else {
          throw new Error(`Unknown tile '${ch}' at (${c},${r})`);
        }
      }
      grid.push(row);
    }
    return { grid, spawns: spawns.filter(Boolean) };
  }

  function getMap(id = "village10") {
    const def = MAP_BY_ID[id] || MAP_DEFS[0];
    const parsed = parseAsciiMap(def.ascii);
    return {
      ...def,
      grid: parsed.grid,
      spawns: parsed.spawns,
    };
  }

  return {
    COLS,
    ROWS,
    MAP_DEFS,
    MAP_BY_ID,
    parseAsciiMap,
    getMap,
  };
});
