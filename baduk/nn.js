/* KataGo 신경망을 브라우저에서 직접 돌림 (워커·Node 같은 코드, 외부 라이브러리 없음)
   - conv 는 손으로 짠 WebAssembly SIMD 모듈(약 1KB, 6~10배 빠름), 안 되는 기기는 같은 계산을 JS 로
   - 모델: KataGo g170 b6c96 (CC0) 을 tools/katago2bkn.js 로 float16 변환한 model/b6c96.bkn
   - 입력 22평면 + 전역 19개 = KataGo nninputs.cpp fillRowV7 (MIT) 를 옮김 (한국·일본식 집 계산, 단순 패)
   - 구조·풀링 = KataGo eigenbackend.cpp (MIT) 와 같게: 5x5 첫 conv → 잔차 블록 6개(2개는 전역 풀링) → 정책·가치·소유 머리
   - 활성값은 판 둘레 1칸을 0 으로 채운 평면(가로 N+2)에 두고, 3x3 conv 는 '칸 이동 = 고정 오프셋' 으로 4x4 묶음 곱셈 */
(function (root) {
  "use strict";
  const Bd = root.Baduk || (typeof require === "function" ? require("./core.js") : null);
  const { BLACK, WHITE, EMPTY } = Bd;

  // ── float16 → float32
  const H2F = (() => {
    const t = new Float32Array(65536);
    for (let h = 0; h < 65536; h++) {
      const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
      t[h] = e === 0 ? s * m * Math.pow(2, -24) : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * Math.pow(2, e - 15);
    }
    return t;
  })();

  /* ── WebAssembly SIMD 가속 (손으로 짠 작은 모듈, 외부 도구 없음)
     conv(in, P, IC, w, T, offs, out, Po, OC, p0, p1, acc): 출력 4채널 × 8칸 묶음, f32x4 로 곱해 더함
     SIMD 를 못 쓰는 브라우저면 WebAssembly.validate 가 거짓 → JS 경로 그대로 */
  function wasmBytes() {
    const uleb = v => { const o = []; do { let b = v & 127; v >>>= 7; if (v) b |= 128; o.push(b); } while (v); return o; };
    const sleb = v => { const o = []; for (;;) { const b = v & 127; v >>= 7; if ((v === 0 && !(b & 64)) || (v === -1 && (b & 64))) { o.push(b); return o; } o.push(b | 128); } };
    const g = i => [0x20, ...uleb(i)], s = i => [0x21, ...uleb(i)], tee = i => [0x22, ...uleb(i)], c = v => [0x41, ...sleb(v)];
    const add = [0x6a], mul = [0x6c], shl = [0x74], shr = [0x75], lt = [0x48], le = [0x4c];
    const ld = off => [0x28, 2, ...uleb(off)], loop = [0x03, 0x40], end = [0x0b], brif = l => [0x0d, ...uleb(l)];
    const vld = off => [0xfd, 0x00, 0, ...uleb(off)], vsplat = off => [0xfd, 0x09, 2, ...uleb(off)], vst = off => [0xfd, 0x0b, 0, ...uleb(off)];
    const vzero = [0xfd, 0x0c, ...new Array(16).fill(0)], fadd = [0xfd, 0xe4, 0x01], fmul = [0xfd, 0xe6, 0x01];
    // 매개변수 0~11, 지역 i32 12~20, v128 21~31
    const IN = 0, P = 1, IC = 2, Wp = 3, T = 4, OFFS = 5, OUT = 6, PO = 7, OC = 8, P0 = 9, P1 = 10, ACC = 11;
    const OB = 12, Q = 13, TT = 14, I = 15, II = 16, WI = 17, O0 = 18, PB = 19, POB = 20, A = [21, 22, 23, 24], Bv = [25, 26, 27, 28], X = 29, Y = 30, WV = 31;
    const b = [];
    const e = (...xs) => { for (const x of xs) b.push(...x); };
    e(g(P), c(2), shl, s(PB), g(PO), c(2), shl, s(POB), c(0), s(OB));
    e(loop);                                                          // 출력 채널 4개씩
    e(g(P0), s(Q));
    e(loop);                                                          // 칸 8개씩
    for (const v of [...A, ...Bv]) e(vzero, s(v));
    e(g(Wp), g(OB), c(2), shr, g(T), mul, g(IC), mul, c(4), shl, add, s(WI));
    e(c(0), s(TT));
    e(loop);                                                          // 탭(3x3 = 9)
    e(g(IN), g(Q), g(OFFS), g(TT), c(2), shl, add, ld(0), add, c(2), shl, add, s(II));
    e(c(0), s(I));
    e(loop);                                                          // 입력 채널
    e(g(II), vld(0), s(X), g(II), vld(16), s(Y));
    for (let j = 0; j < 4; j++) {
      e(g(WI), vsplat(j * 4), s(WV));
      e(g(A[j]), g(WV), g(X), fmul, fadd, s(A[j]));
      e(g(Bv[j]), g(WV), g(Y), fmul, fadd, s(Bv[j]));
    }
    e(g(WI), c(16), add, s(WI), g(II), g(PB), add, s(II));
    e(g(I), c(1), add, tee(I), g(IC), lt, brif(0), end);
    e(g(TT), c(1), add, tee(TT), g(T), lt, brif(0), end);
    e(g(OUT), g(OB), g(PO), mul, g(Q), add, c(2), shl, add, s(O0));
    e(g(ACC), [0x04, 0x40]);
    for (let j = 0; j < 4; j++) e(g(O0), g(O0), vld(0), g(A[j]), fadd, vst(0), g(O0), g(O0), vld(16), g(Bv[j]), fadd, vst(16), g(O0), g(POB), add, s(O0));
    e([0x05]);
    for (let j = 0; j < 4; j++) e(g(O0), g(A[j]), vst(0), g(O0), g(Bv[j]), vst(16), g(O0), g(POB), add, s(O0));
    e(end);
    e(g(Q), c(8), add, tee(Q), g(P1), le, brif(0), end);
    e(g(OB), c(4), add, tee(OB), g(OC), lt, brif(0), end);
    e(end);
    const body = [...uleb(2), ...uleb(9), 0x7f, ...uleb(11), 0x7b, ...b];
    const sec = (id, bytes) => [id, ...uleb(bytes.length), ...bytes];
    const str = t => [...uleb(t.length), ...Array.from(t, ch => ch.charCodeAt(0))];
    return new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      ...sec(1, [1, 0x60, 12, ...new Array(12).fill(0x7f), 0]),
      ...sec(2, [1, ...str("env"), ...str("mem"), 0x02, 0x00, 1]),
      ...sec(3, [1, 0]),
      ...sec(7, [1, ...str("conv"), 0x00, 0]),
      ...sec(10, [1, ...uleb(body.length), ...body]),
    ]);
  }
  // 무게·작업 공간을 wasm 메모리 한 덩어리에 (9·13·19줄 미리)
  function setupWasm(m) {
    if (typeof WebAssembly !== "object") return null;
    const bytes = wasmBytes();
    try { if (!WebAssembly.validate(bytes)) return null; } catch (e) { return null; }
    const convs = [m.conv1, ...m.blocks.flatMap(k => [k.c1, k.c2, k.gc].filter(Boolean)), m.p1, m.g1, m.v1].filter(cv => cv.r);
    let floats = 0;
    for (const cv of convs) floats += cv.r.length + 16;
    for (const N of [9, 13, 19]) floats += scratchFloats(m, N);
    const pages = Math.ceil((floats * 4 + 65536) / 65536) + 2;
    try {
      const mem = new WebAssembly.Memory({ initial: pages });
      const inst = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { mem } });
      const W = { conv: inst.exports.conv, mem, top: 64, ptr: new WeakMap(), limit: pages * 65536 };
      W.alloc = (n, Type = Float32Array) => {
        const bytesN = (n + 16) * 4, at = W.top;
        if (at + bytesN > W.limit) return null;
        W.top = (at + bytesN + 15) & ~15;
        const v = new Type(mem.buffer, at, n + 16); W.ptr.set(v, at); return v;
      };
      for (const cv of convs) { const v = W.alloc(cv.r.length); v.set(cv.r); cv.rp = W.ptr.get(v); }
      return W;
    } catch (e) { return null; }
  }
  const scratchFloats = (m, N) => { const P = (N + 2) * (N + 2), P2 = (N + 4) * (N + 4); return m.numIn * P2 + m.C * P2 + 7 * m.C * P + 7 * 16 + 3 * 64; };

  function loadModel(buf, opt = {}) {
    const u8 = new Uint8Array(buf);
    if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "BKN1") throw new Error("모델 파일 아님");
    const L = new DataView(buf).getUint32(4, true);
    const head = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + L)));
    const data = new Uint16Array(buf, 8 + L, (buf.byteLength - 8 - L) >> 1);
    const T = name => {
      const [off, n, shape] = head.tensors[name] || [];
      if (off == null) throw new Error("텐서 없음 " + name);
      const f = new Float32Array(n); for (let i = 0; i < n; i++) f[i] = H2F[data[off + i]];
      return { f, shape };
    };
    const conv = name => prepConv(T(name));
    const bn = name => ({ s: T(name + ".s").f, b: T(name + ".b").f });
    const mat = name => { const t = T(name); return { w: t.f, ic: t.shape[0], oc: t.shape[1] }; };
    const m = { name: head.name, C: head.trunk.C, numIn: head.numIn, numGlobal: head.numGlobal, scratch: {} };
    m.conv1 = conv("conv1"); m.ginput = mat("ginput");
    m.blocks = head.trunk.blocks.map((kind, i) => kind === "ord"
      ? { kind, pre: bn(`b${i}.pre`), c1: conv(`b${i}.conv1`), mid: bn(`b${i}.mid`), c2: conv(`b${i}.conv2`) }
      : { kind, pre: bn(`b${i}.pre`), c1: conv(`b${i}.conv1`), gc: conv(`b${i}.gconv`), gbn: bn(`b${i}.gbn`), gmul: mat(`b${i}.gmul`), mid: bn(`b${i}.mid`), c2: conv(`b${i}.conv2`) });
    m.tip = bn("tip");
    m.p1 = conv("p1"); m.g1 = conv("g1"); m.g1bn = bn("g1bn"); m.pgmul = mat("pgmul"); m.p1bn = bn("p1bn"); m.p2 = conv("p2"); m.pass = mat("pass");
    m.v1 = conv("v1"); m.v1bn = bn("v1bn"); m.v2 = mat("v2"); m.v2b = T("v2b").f; m.v3 = mat("v3"); m.v3b = T("v3b").f; m.sv3 = mat("sv3"); m.sv3b = T("sv3b").f; m.own = conv("own");
    m.wasm = opt.wasm === false ? null : setupWasm(m);
    return m;
  }
  // conv 가중치 [oc][ic][ky][kx] → 출력 4개 묶음: [ob][tap][ic][4] (oc 가 4 의 배수가 아니면 그대로)
  function prepConv({ f, shape }) {
    const [OC, IC, K] = shape, T = K * K, c = { OC, IC, K, T, w: f };
    if (OC % 4 === 0) {
      const r = new Float32Array(f.length);
      for (let o = 0; o < OC; o++) for (let i = 0; i < IC; i++) for (let t = 0; t < T; t++)
        r[(((o >> 2) * T + t) * IC + i) * 4 + (o & 3)] = f[(o * IC + i) * T + t];
      c.r = r;
    }
    return c;
  }

  // 판 크기별 작업 공간
  function scratch(m, N) {
    if (m.scratch[N]) return m.scratch[N];
    const Wd = N + 2, P = Wd * Wd, W2 = N + 4, P2 = W2 * W2, C = m.C, W = m.wasm;
    // wasm 메모리에 자리가 있으면 거기에 (conv 를 wasm 으로), 없으면 보통 배열 (JS 경로)
    let wasmOK = !!W && W.top + scratchFloats(m, N) * 4 + 4096 <= W.limit;
    const f = n => (wasmOK ? W.alloc(n) : new Float32Array(n + 16));
    const s = {
      N, Wd, P, W2, P2, wasm: wasmOK,
      inp: f(m.numIn * P2), c1out: f(C * P2), T: f(C * P), A: f(C * P), A2: f(C * P), B1: f(C * P), B2: f(C * P), G: f(C * P),
      pool: new Float32Array(3 * C), bias: new Float32Array(C), gin: new Float32Array(m.numGlobal),
      off3: [], off1: [0], off5: [],
    };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s.off3.push(dy * Wd + dx);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s.off5.push(dy * W2 + dx);
    if (wasmOK) for (const k of ["off3", "off1", "off5"]) { const v = W.alloc(s[k].length, Int32Array); v.set(s[k]); W.ptr.set(s[k], W.ptr.get(v)); }
    return (m.scratch[N] = s);
  }

  // conv: 입력(둘레 0 평면) → 출력. p0~p1 연속 칸 범위(둘레 열도 계산하지만 나중에 안 읽음). acc=true 면 더함
  let CUR = null;                                                     // 지금 계산 중인 판의 wasm (없으면 JS)
  function conv(cv, inp, P, out, Po, offs, p0, p1, acc) {
    const { OC, IC, T } = cv;
    if (CUR && cv.rp != null) {
      const ip = CUR.ptr.get(inp), op = CUR.ptr.get(out), fp = CUR.ptr.get(offs);
      if (ip != null && op != null && fp != null) { CUR.conv(ip, P, IC, cv.rp, T, fp, op, Po, OC, p0, p1, acc ? 1 : 0); return; }
    }
    if (!cv.r) {                                                      // 출력 1~3 개짜리(정책·소유 1x1)
      const w = cv.w;
      for (let o = 0; o < OC; o++) for (let q = p0; q <= p1; q++) {
        let a = 0;
        for (let i = 0; i < IC; i++) for (let t = 0; t < T; t++) a += w[(o * IC + i) * T + t] * inp[i * P + q + offs[t]];
        if (acc) out[o * Po + q] += a; else out[o * Po + q] = a;
      }
      return;
    }
    const W = cv.r;
    for (let ob = 0; ob < OC; ob += 4) {
      const wb = (ob >> 2) * T * IC * 4, o0 = ob * Po, o1 = o0 + Po, o2 = o1 + Po, o3 = o2 + Po;
      for (let q = p0; q <= p1; q += 4) {
        let a00 = 0, a01 = 0, a02 = 0, a03 = 0, a10 = 0, a11 = 0, a12 = 0, a13 = 0;
        let a20 = 0, a21 = 0, a22 = 0, a23 = 0, a30 = 0, a31 = 0, a32 = 0, a33 = 0;
        let wi = wb;
        for (let t = 0; t < T; t++) {
          let ii = q + offs[t];
          for (let i = 0; i < IC; i++, ii += P, wi += 4) {
            const x0 = inp[ii], x1 = inp[ii + 1], x2 = inp[ii + 2], x3 = inp[ii + 3];
            const w0 = W[wi], w1 = W[wi + 1], w2 = W[wi + 2], w3 = W[wi + 3];
            a00 += w0 * x0; a01 += w0 * x1; a02 += w0 * x2; a03 += w0 * x3;
            a10 += w1 * x0; a11 += w1 * x1; a12 += w1 * x2; a13 += w1 * x3;
            a20 += w2 * x0; a21 += w2 * x1; a22 += w2 * x2; a23 += w2 * x3;
            a30 += w3 * x0; a31 += w3 * x1; a32 += w3 * x2; a33 += w3 * x3;
          }
        }
        const n = Math.min(4, p1 - q + 1);
        if (acc) {
          out[o0 + q] += a00; out[o1 + q] += a10; out[o2 + q] += a20; out[o3 + q] += a30;
          if (n > 1) { out[o0 + q + 1] += a01; out[o1 + q + 1] += a11; out[o2 + q + 1] += a21; out[o3 + q + 1] += a31; }
          if (n > 2) { out[o0 + q + 2] += a02; out[o1 + q + 2] += a12; out[o2 + q + 2] += a22; out[o3 + q + 2] += a32; }
          if (n > 3) { out[o0 + q + 3] += a03; out[o1 + q + 3] += a13; out[o2 + q + 3] += a23; out[o3 + q + 3] += a33; }
        } else {
          out[o0 + q] = a00; out[o1 + q] = a10; out[o2 + q] = a20; out[o3 + q] = a30;
          if (n > 1) { out[o0 + q + 1] = a01; out[o1 + q + 1] = a11; out[o2 + q + 1] = a21; out[o3 + q + 1] = a31; }
          if (n > 2) { out[o0 + q + 2] = a02; out[o1 + q + 2] = a12; out[o2 + q + 2] = a22; out[o3 + q + 2] = a32; }
          if (n > 3) { out[o0 + q + 3] = a03; out[o1 + q + 3] = a13; out[o2 + q + 3] = a23; out[o3 + q + 3] = a33; }
        }
      }
    }
  }
  // BN + ReLU: 판 안 칸만 (둘레는 늘 0 으로 남음)
  function bnAct(bn, src, dst, C, s) {
    const { N, Wd, P } = s;
    for (let c = 0; c < C; c++) {
      const sc = bn.s[c], bi = bn.b[c], base = c * P;
      for (let y = 0; y < N; y++) {
        let p = base + (y + 1) * Wd + 1;
        for (let x = 0; x < N; x++, p++) { const v = src[p] * sc + bi; dst[p] = v > 0 ? v : 0; }
      }
    }
  }
  // 전역 풀링: 평균 · 평균×(√칸수−14)/10 · 최대 (가치 머리는 셋째가 평균×((√칸수−14)²/100−0.1))
  function gpool(src, C, s, out, valueHead) {
    const { N, Wd, P } = s, NN = N * N, sq = Math.sqrt(NN) - 14;
    for (let c = 0; c < C; c++) {
      let sum = 0, mx = -1;
      for (let y = 0; y < N; y++) { let p = c * P + (y + 1) * Wd + 1; for (let x = 0; x < N; x++, p++) { const v = src[p]; sum += v; if (v > mx) mx = v; } }
      const mean = sum / NN;
      out[c] = mean; out[C + c] = mean * sq * 0.1; out[2 * C + c] = valueHead ? mean * (sq * sq * 0.01 - 0.1) : mx;
    }
  }
  function matmul(mt, inp, out) {
    const { w, ic, oc } = mt;
    for (let o = 0; o < oc; o++) out[o] = 0;
    for (let i = 0; i < ic; i++) { const x = inp[i]; if (x === 0) continue; const b = i * oc; for (let o = 0; o < oc; o++) out[o] += x * w[b + o]; }
    return out;
  }
  function addBias(buf, bias, C, s) {
    const { N, Wd, P } = s;
    for (let c = 0; c < C; c++) { const v = bias[c]; for (let y = 0; y < N; y++) { let p = c * P + (y + 1) * Wd + 1; for (let x = 0; x < N; x++, p++) buf[p] += v; } }
  }

  // 앞으로 계산: s.inp(입력, 둘레 2칸 평면) · s.gin(전역) → 정책 logit · 패스 · 가치 · 점수 · 소유
  function forward(m, N) {
    const s = scratch(m, N), { Wd, P, W2, P2 } = s, C = m.C, NN = N * N;
    CUR = s.wasm ? m.wasm : null;
    const p0 = Wd + 1, p1 = N * Wd + N, q0 = 2 * W2 + 2, q1 = (N + 1) * W2 + N + 1;
    // 첫 conv (5x5) → 둘레 1칸 평면으로 옮기며 전역 입력 편향 더함
    conv(m.conv1, s.inp, P2, s.c1out, P2, s.off5, q0, q1, false);
    matmul(m.ginput, s.gin, s.bias);
    for (let c = 0; c < C; c++) {
      const bv = s.bias[c];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s.T[c * P + (y + 1) * Wd + x + 1] = s.c1out[c * P2 + (y + 2) * W2 + x + 2] + bv;
    }
    for (const bk of m.blocks) {
      bnAct(bk.pre, s.T, s.A, C, s);
      if (bk.kind === "ord") {
        conv(bk.c1, s.A, P, s.B1, P, s.off3, p0, p1, false);
        bnAct(bk.mid, s.B1, s.A2, bk.c1.OC, s);
        conv(bk.c2, s.A2, P, s.T, P, s.off3, p0, p1, true);
      } else {
        const R = bk.c1.OC, Gc = bk.gc.OC;
        conv(bk.c1, s.A, P, s.B1, P, s.off3, p0, p1, false);
        conv(bk.gc, s.A, P, s.B2, P, s.off3, p0, p1, false);
        bnAct(bk.gbn, s.B2, s.G, Gc, s);
        gpool(s.G, Gc, s, s.pool, false);
        matmul(bk.gmul, s.pool, s.bias);
        addBias(s.B1, s.bias, R, s);
        bnAct(bk.mid, s.B1, s.A2, R, s);
        conv(bk.c2, s.A2, P, s.T, P, s.off3, p0, p1, true);
      }
    }
    bnAct(m.tip, s.T, s.A, C, s);
    // 정책 머리
    const pc = m.p1.OC, gc = m.g1.OC;
    conv(m.p1, s.A, P, s.B1, P, s.off1, p0, p1, false);
    conv(m.g1, s.A, P, s.B2, P, s.off1, p0, p1, false);
    bnAct(m.g1bn, s.B2, s.G, gc, s);
    const gp = new Float32Array(3 * gc); gpool(s.G, gc, s, gp, false);
    const pb = matmul(m.pgmul, gp, new Float32Array(pc));
    addBias(s.B1, pb, pc, s);
    bnAct(m.p1bn, s.B1, s.A2, pc, s);
    conv(m.p2, s.A2, P, s.B2, P, s.off1, p0, p1, false);
    const policy = new Float32Array(NN + 1);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) policy[y * N + x] = s.B2[(y + 1) * Wd + x + 1];
    policy[NN] = matmul(m.pass, gp, new Float32Array(1))[0];
    // 가치 머리
    const vc = m.v1.OC;
    conv(m.v1, s.A, P, s.B1, P, s.off1, p0, p1, false);
    bnAct(m.v1bn, s.B1, s.G, vc, s);
    const vp = new Float32Array(3 * vc); gpool(s.G, vc, s, vp, true);
    const v2 = matmul(m.v2, vp, new Float32Array(m.v2.oc));
    for (let i = 0; i < v2.length; i++) { const v = v2[i] + m.v2b[i]; v2[i] = v > 0 ? v : 0; }
    const value = matmul(m.v3, v2, new Float32Array(3)); for (let i = 0; i < 3; i++) value[i] += m.v3b[i];
    const score = matmul(m.sv3, v2, new Float32Array(m.sv3.oc)); for (let i = 0; i < score.length; i++) score[i] += m.sv3b[i];
    conv(m.own, s.G, P, s.B2, P, s.off1, p0, p1, false);
    const own = new Float32Array(NN);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) own[y * N + x] = s.B2[(y + 1) * Wd + x + 1];
    return { policy, value, score, own };
  }

  /* ── 입력 만들기 (KataGo V7, 집 계산 규칙 · 단순 패 · 빅 집 없음 · 앙코르 0단계)
     pos = { N, board(Board), pla, komi, moves:[[색, 점]...](최근이 끝), prev1, prev2 (Board, 1·2 수 전), passes(연속 패스) } */
  function fillInput(m, pos, sym = 0) {
    const N = pos.N, s = scratch(m, N), { W2, P2 } = s, inp = s.inp, gin = s.gin;
    inp.fill(0); gin.fill(0);
    const b = pos.board, pla = pos.pla, opp = 3 - pla;
    const at = p => { const q = sym ? Bd.symPoint(sym, p, N) : p; return (((q / N) | 0) + 2) * W2 + (q % N) + 2; };
    const set = (ch, p) => { inp[ch * P2 + at(p)] = 1; };
    const libCache = new Map();
    for (let p = 0; p < N * N; p++) {
      set(0, p);
      const i = b.ix(p), c = b.c[i];
      if (c === pla) set(1, p); else if (c === opp) set(2, p);
      if (c === pla || c === opp) {
        const h = b.head[i]; let L = libCache.get(h);
        if (L === undefined) { L = b.libs(h, 4); libCache.set(h, L); }
        if (L === 1) set(3, p); else if (L === 2) set(4, p); else if (L === 3) set(5, p);
      }
    }
    if (b.ko) set(6, b.pt(b.ko));
    // 최근 수 5개 (번갈아 둔 경우만)
    const mv = pos.moves || [], NN = N * N;
    let hist = 0;
    const want = [opp, pla, opp, pla, opp];
    for (let k = 0; k < 5 && k < mv.length; k++) {
      const [c, p] = mv[mv.length - 1 - k];
      if (c !== want[k]) break;
      hist = k + 1;
      if (p === NN || p < 0) gin[k] = 1; else set(9 + k, p);
    }
    // 축 (현재 판 · 1수 전 · 2수 전) — 판 객체마다 한 번만 셈 (수읽기에서 형제 마디가 같은 이전 판을 씀)
    for (const [i, works] of ladders(b)) {
      set(14, b.pt(i));
      if (b.c[i] === opp && b.libs(b.head[i], 3) > 1) for (const w of works) set(17, b.pt(w));
    }
    const pb = hist >= 1 && pos.prev1 ? pos.prev1 : b;
    for (const [i] of ladders(pb)) set(15, pb.pt(i));
    const ppb = hist >= 2 && pos.prev2 ? pos.prev2 : pb;
    for (const [i] of ladders(ppb)) set(16, ppb.pt(i));
    // 전역
    const selfKomi = pla === WHITE ? pos.komi : -pos.komi, lim = NN + 20;
    gin[5] = Math.max(-lim, Math.min(lim, selfKomi)) / 20;
    gin[9] = 1;                                                       // 집 계산(territory)
    gin[10] = 1;                                                      // 빅 집 없음(seki tax)
    gin[14] = pos.passes >= 1 ? 1 : 0;                                // 지금 패스하면 끝남
  }

  // 축 결과 기억 (판 객체 → [[칸, 잡는 수들]...]). 판은 만든 뒤 바꾸지 않는다고 가정 (수읽기·posFromState 모두 새 판)
  const ladderMemo = new WeakMap();
  function ladders(b) {
    let r = ladderMemo.get(b);
    if (!r) { r = []; Bd.iterLadders(b, (i, works) => r.push([i, works])); ladderMemo.set(b, r); }
    return r;
  }

  const softplus = x => (x > 30 ? x : Math.log1p(Math.exp(x)));
  // 평가: 정책 확률(둘 수 있는 곳만) · 이길 확률 · 집 차이(둘 사람 기준) · 소유(+ = 둘 사람)
  function evaluate(m, pos, opt = {}) {
    const N = pos.N, NN = N * N, sym = opt.sym || 0;
    fillInput(m, pos, sym);
    const out = forward(m, N);
    const raw = new Float32Array(NN + 1), own = new Float32Array(NN);
    for (let p = 0; p < NN; p++) { const q = sym ? Bd.symPoint(sym, p, N) : p; raw[p] = out.policy[q]; own[p] = Math.tanh(out.own[q]); }
    raw[NN] = out.policy[NN];
    const b = pos.board, legal = new Uint8Array(NN + 1);
    for (let p = 0; p < NN; p++) legal[p] = b.isLegal(b.ix(p), pos.pla) ? 1 : 0;
    legal[NN] = 1;
    const T = opt.temp || 1;
    let mx = -1e30; for (let p = 0; p <= NN; p++) if (legal[p] && raw[p] > mx) mx = raw[p];
    const policy = new Float32Array(NN + 1); let sum = 0;
    for (let p = 0; p <= NN; p++) if (legal[p]) { policy[p] = Math.exp((raw[p] - mx) / T); sum += policy[p]; }
    for (let p = 0; p <= NN; p++) policy[p] /= sum;
    const v = out.value, vm = Math.max(v[0], v[1], v[2]);
    let w = Math.exp(v[0] - vm), l = Math.exp(v[1] - vm), nr = Math.exp(v[2] - vm); const vs = w + l + nr; w /= vs; l /= vs; nr /= vs;
    const sc = out.score;
    return {
      policy, logits: raw, legal, own,
      win: w, loss: l, noResult: nr, winrate: w + 0.5 * nr,
      scoreMean: sc[0] * 20 * (1 - nr), scoreStdev: softplus(sc[1]) * 20, lead: (sc.length > 2 ? sc[2] : sc[0]) * 20 * (1 - nr),
    };
  }

  // 게임 상태(core state) → 신경망 위치 정보
  function posFromState(st) {
    const N = st.size, board = Bd.toBoard(st), first = Bd.first(st), moves = [];
    let c = first;
    for (const a of st.moves) { moves.push([c, a]); c = 3 - c; }
    const prev = k => { const h = st.hist[k - 1]; if (!h) return null; return Bd.Board.fromArray(N, h); };
    return { N, board, pla: st.toPlay, komi: st.komi, moves, prev1: prev(1), prev2: prev(2), passes: st.passes };
  }

  const API = { loadModel, evaluate, forward, fillInput, posFromState, scratch };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.BadukNN = API;
})(this);
