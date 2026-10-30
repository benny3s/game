/* KataGo 신경망(.bin.gz, 모델 버전 8) → 바둑 게임용 작은 파일(.bkn, float16) 변환기
   쓰는 법: node tools/katago2bkn.js g170-b6c96-s175395328-d26788732.bin.gz model/b6c96.bkn
   - 원본 신경망: KataGo g170 실행(CC0, katagoarchive.org) — 구조 읽는 순서는 KataGo desc.cpp(MIT) 를 따름
   - BN 은 미리 합쳐서(scale·bias 두 개) 저장, conv 는 [oc][ic][ky][kx] 순서
   파일: "BKN1" + uint32(헤더 길이) + JSON 헤더 + (4바이트 맞춤) + float16 값들 */
"use strict";
const fs = require("fs"), zlib = require("zlib");

function reader(buf) {
  let p = 0;
  const ws = c => c === 32 || c === 10 || c === 13 || c === 9;
  return {
    tok() { while (ws(buf[p])) p++; const s = p; while (p < buf.length && !ws(buf[p])) p++; return buf.toString("latin1", s, p); },
    num() { return Number(this.tok()); },
    floats(n) {
      while (buf[p] !== 64) { if (!ws(buf[p])) throw new Error("@BIN@ 없음 at " + p); p++; }   // '@'
      if (buf.toString("latin1", p, p + 5) !== "@BIN@") throw new Error("@BIN@ 헤더 틀림");
      p += 5;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(p + i * 4);
      p += n * 4;
      return out;
    },
    get pos() { return p; },
  };
}

function convert(src, dst) {
  const buf = zlib.gunzipSync(fs.readFileSync(src));
  const R = reader(buf);
  const tensors = [];                    // [이름, Float32Array, 모양]
  const put = (name, arr, shape) => tensors.push([name, arr, shape]);
  const act = () => R.tok();             // 버전 8 은 활성화 이름만 (모두 ReLU)
  function conv(name) {
    R.tok(); const ky = R.num(), kx = R.num(), ic = R.num(), oc = R.num(); R.num(); R.num();
    const f = R.floats(ky * kx * ic * oc), w = new Float32Array(f.length);
    let i = 0;                           // 파일 순서 y,x,ic,oc → [oc][ic][y][x]
    for (let y = 0; y < ky; y++) for (let x = 0; x < kx; x++) for (let c = 0; c < ic; c++) for (let o = 0; o < oc; o++)
      w[((o * ic + c) * ky + y) * kx + x] = f[i++];
    put(name, w, [oc, ic, ky, kx]);
    return { ic, oc, ky, kx };
  }
  function bn(name) {
    R.tok(); const n = R.num(), eps = R.num(), hasScale = R.num(), hasBias = R.num();
    const mean = R.floats(n), vari = R.floats(n);
    const scale = hasScale ? R.floats(n) : new Float32Array(n).fill(1), bias = hasBias ? R.floats(n) : new Float32Array(n);
    const s = new Float32Array(n), b = new Float32Array(n);
    for (let c = 0; c < n; c++) { s[c] = scale[c] / Math.sqrt(vari[c] + eps); b[c] = bias[c] - s[c] * mean[c]; }
    put(name + ".s", s, [n]); put(name + ".b", b, [n]);
    return n;
  }
  function matmul(name) { R.tok(); const ic = R.num(), oc = R.num(); put(name, R.floats(ic * oc), [ic, oc]); return { ic, oc }; }
  function matbias(name) { R.tok(); const n = R.num(); put(name, R.floats(n), [n]); return n; }

  const head = { name: R.tok(), version: R.num(), numIn: R.num(), numGlobal: R.num() };
  if (head.version !== 8) throw new Error("모델 버전 8 만 지원 (지금 " + head.version + ")");
  R.tok();
  const numBlocks = R.num(), C = R.num(), midC = R.num(), regC = R.num(); R.num(); const gpC = R.num();
  head.trunk = { numBlocks, C, midC, regC, gpC, blocks: [] };
  conv("conv1"); matmul("ginput");
  for (let i = 0; i < numBlocks; i++) {
    const kind = R.tok(); R.tok();
    if (kind === "ordinary_block") {
      bn(`b${i}.pre`); act(); conv(`b${i}.conv1`); bn(`b${i}.mid`); act(); conv(`b${i}.conv2`);
      head.trunk.blocks.push("ord");
    } else if (kind === "gpool_block") {
      bn(`b${i}.pre`); act(); conv(`b${i}.conv1`); conv(`b${i}.gconv`); bn(`b${i}.gbn`); act(); matmul(`b${i}.gmul`); bn(`b${i}.mid`); act(); conv(`b${i}.conv2`);
      head.trunk.blocks.push("gpool");
    } else throw new Error("모르는 블록 " + kind);
  }
  bn("tip"); act();
  R.tok();                                              // 정책 머리
  conv("p1"); conv("g1"); bn("g1bn"); act(); matmul("pgmul"); bn("p1bn"); act(); const p2 = conv("p2"); const pass = matmul("pass");
  head.policyOut = p2.oc; head.passOut = pass.oc;
  R.tok();                                              // 가치 머리
  conv("v1"); bn("v1bn"); act(); matmul("v2"); matbias("v2b"); act(); matmul("v3"); matbias("v3b"); const sv = matmul("sv3"); matbias("sv3b"); conv("own");
  head.scoreOut = sv.oc;
  head.consumed = R.pos; head.total = buf.length;

  // float16 로 저장
  const f16 = (() => { const f = new Float32Array(1), u = new Uint32Array(f.buffer); return v => {
    f[0] = v; const x = u[0], s = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 127 + 15, m = x & 0x7fffff;
    if (e <= 0) { if (e < -10) return s; m = (m | 0x800000) >> (1 - e); return s | ((m + 0x1000) >> 13); }
    if (e >= 31) return s | 0x7c00;
    const r = s | (e << 10) | (m >> 13); return (m & 0x1000) ? r + 1 : r;   // 반올림
  }; })();
  let off = 0; head.tensors = {};
  for (const [name, arr, shape] of tensors) { head.tensors[name] = [off, arr.length, shape]; off += arr.length; }
  const data = new Uint16Array(off); off = 0;
  for (const [, arr] of tensors) { for (let i = 0; i < arr.length; i++) data[off + i] = f16(arr[i]); off += arr.length; }
  head.source = "KataGo " + head.name + " (CC0, https://katagoarchive.org/g170/neuralnets/)";
  const hj = Buffer.from(JSON.stringify(head), "utf8");
  const pad = (4 - ((8 + hj.length) % 4)) % 4;
  const out = Buffer.alloc(8 + hj.length + pad + data.byteLength);
  out.write("BKN1", 0, "latin1"); out.writeUInt32LE(hj.length + pad, 4); hj.copy(out, 8);
  for (let i = 0; i < pad; i++) out[8 + hj.length + i] = 32;
  Buffer.from(data.buffer).copy(out, 8 + hj.length + pad);
  fs.writeFileSync(dst, out);
  console.log(`${head.name} v${head.version} · 블록 ${numBlocks}×${C} · 텐서 ${tensors.length}개 · 값 ${data.length} · 읽은 바이트 ${head.consumed}/${head.total} → ${dst} (${out.length} B)`);
}

if (require.main === module) {
  const [src, dst] = process.argv.slice(2);
  if (!src || !dst) { console.log("node tools/katago2bkn.js 원본.bin.gz 결과.bkn"); process.exit(1); }
  convert(src, dst);
}
module.exports = { convert };
