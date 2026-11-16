/* 베니 크아 — 15×13 텍스트 맵 로더 · 기본 맵 3종 (kua/maps.js)
   · Node · 브라우저 공용 (UMD)
   · 범례: . 빈길 · # 벽/기둥(불멸) · B 깨지는 블록 · M 밀 수 있는 블록 · G 풀숲(숨기) · 0..7 스폰 */
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
      desc: "십자 도로와 4개 단지 · 풀숲 숨기와 기본 교전의 정석",
      ascii: [
        "0.BB.G#.#G.BB.3",
        "..BM...M...MB..",
        "B#B.#B...B#.B#B",
        "4..G..B.B..G..7",
        "#..BB#B.B#BB..#",
        ".BB..M...M..BB.",
        "...#B.B#B.B#...",
        ".BB..M...M..BB.",
        "#..BB#B.B#BB..#",
        "6..G..B.B..G..5",
        "B#B.#B...B#.B#B",
        "..BM...M...MB..",
        "2.BB.G#.#G.BB.1",
      ].join("\n"),
    },
    {
      id: "patrit14",
      name: "패트릿 14",
      theme: "pirate",
      desc: "풍부한 상자와 해적선 기둥 · 화력 파밍과 물량전의 성지",
      ascii: [
        "0..BBBBBBBBBB.3",
        "..BMBBB#BBBMB..",
        ".BB#BMBBBMB#BB.",
        "4..BBBBBBBBBB.7",
        "...BB.BMB.BB...",
        ".BBBB#BBB#BBBB.",
        ".BBBM..#..MBBB.",
        ".BBBB#BBB#BBBB.",
        "...BB.BMB.BB...",
        "6..BBBBBBBBBB.5",
        ".BB#BMBBBMB#BB.",
        "..BMBBB#BBBMB..",
        "2..BBBBBBBBBB.1",
      ].join("\n"),
    },
    {
      id: "camp08",
      name: "캠프 08",
      theme: "camp",
      desc: "탁 트인 직선 골목과 중앙 수풀 · 긴 물줄기 견제 싸움",
      ascii: [
        "0..B.G#.#G.B..3",
        "..BB.......BB..",
        "B.#.BB...BB.#.B",
        "4..G..B.B..G..7",
        "#..B.#G.G#.B..#",
        ".B..M.....M..B.",
        "...G.#.B.#.G...",
        ".B..M.....M..B.",
        "#..B.#G.G#.B..#",
        "6..G..B.B..G..5",
        "B.#.BB...BB.#.B",
        "..BB.......BB..",
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
        } else if (ch === "." || ch === "#" || ch === "B" || ch === "M" || ch === "G") {
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
