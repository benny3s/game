/* quintet (MIT, Renju Note — https://github.com/renju-note/quintet, npm @renju-note/quintet@0.11.0) 의 wasm 을
   ES 모듈 없이 쓰는 작은 로더. 시험(test/selftest.js)에서 렌주 VCF·VCT 를 '남이 만든 검증된 답'으로 맞춰 보는 데만 씀
   (게임 화면은 이 파일을 읽지 않음). 원래 wasm-bindgen 접착 코드(quintet_bg.js)가 하는 일 중 필요한 것만 옮김.
   점 번호 = x * 15 + y (x = 열 A~O, y = 줄 1~15, 아래가 0) */
(function (root) {
  'use strict';
  function create(bytes) {
    let inst = null;
    const imports = { './quintet_bg.js': { __wbindgen_init_externref_table() {
      const t = inst.exports.__wbindgen_externrefs, off = t.grow(4);
      t.set(0, undefined); t.set(off, undefined); t.set(off + 1, null); t.set(off + 2, true); t.set(off + 3, false);
    } } };
    inst = new WebAssembly.Instance(new WebAssembly.Module(bytes), imports);
    const w = inst.exports;
    w.__wbindgen_start();
    const pass = a => { const p = w.__wbindgen_malloc(a.length, 1) >>> 0; new Uint8Array(w.memory.buffer).set(a, p); return p; };
    // mode: 0 VCF · 10 VCT(DFS) · 16 VCT(df-pn). 이기는 수순(공격·수비 번갈아) 또는 null
    function solve(mode, limit, blacks, whites, black, threatLimit) {
      const b = Uint8Array.from(blacks), wh = Uint8Array.from(whites);
      const ret = w.solve(mode, limit, pass(b), b.length, pass(wh), wh.length, !!black, threatLimit || 1);
      if (ret[0] === 0) return null;
      const p = ret[0] >>> 0, out = new Uint8Array(w.memory.buffer).slice(p, p + ret[1]);
      w.__wbindgen_free(ret[0], ret[1], 1);
      return out;
    }
    return { solve };
  }
  const API = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Quintet = API;
})(this);
