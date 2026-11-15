/* 베니 두뇌 랩 단위 시험 (node brain/test/selftest.js) */
"use strict";
const assert = require("assert");
const B = require("../core.js");

let passed = 0;
function test(name, fn) {
  fn();
  console.log("  ✓ " + name);
  passed++;
}

console.log("🧠 BrainCore selftest");

test("1. 4대 영역 × 3난이도 결정적 생성 & 4지선다 중복 없음", () => {
  for (const tier of ["easy", "normal", "hard"]) {
    for (let s = 1; s <= 12; s++) {
      for (const cat of ["shape", "num", "logic"]) {
        const q1 = B.generateQuestion(cat, tier, 100 + s, s);
        const q2 = B.generateQuestion(cat, tier, 100 + s, s);
        assert.strictEqual(q1.answer, q2.answer, "시드 동일 시 정답 불변");
        assert.strictEqual(q1.choices.length, 4, `${cat}/${tier} 보기 4개`);
        assert(q1.answer >= 0 && q1.answer < 4, "answer 범위 0..3");
        const keys = q1.choices.map(c => c.svg || c.label);
        assert.strictEqual(new Set(keys).size, 4, `${cat}/${tier} 보기 4개 모두 유일`);
      }
      const m = B.generateQuestion("mem", tier, 200 + s, s);
      assert.strictEqual(m.type, "memory");
      assert.strictEqual(new Set(m.targets).size, m.targets.length, "기억 타겟 칸 중복 없음");
    }
  }
});

test("2. 종합 챌린지 8문제 구성 (4대 영역 각 2문제) & 시드 일치(친구 대결용)", () => {
  const e1 = B.generateExam("ROOM42", "normal");
  const e2 = B.generateExam("ROOM42", "normal");
  assert.strictEqual(e1.length, 8);
  const cnt = { shape: 0, num: 0, logic: 0, mem: 0 };
  for (let i = 0; i < 8; i++) {
    cnt[e1[i].cat]++;
    assert.strictEqual(e1[i].title, e2[i].title);
    assert.strictEqual(e1[i].answer, e2[i].answer);
  }
  assert.deepStrictEqual(cnt, { shape: 2, num: 2, logic: 2, mem: 2 });
  const subs = new Set(e1.map(q => q.sub));
  assert(subs.has("matrix") && subs.has("rotate"), "도형 2유형 모두 출제");
  assert(subs.has("liar") && subs.has("zebra"), "논리 2유형 모두 출제");
  assert(subs.has("order") && subs.has("pattern"), "기억 2유형 모두 출제");
  const numSubs = new Set(e1.filter(q => q.cat === "num").map(q => q.sub));
  assert.strictEqual(numSubs.size, 2, "수리 2문제는 서로 다른 하위유형");
});

test("3. 100점 만점 + 영역별 25점 채점 규칙 검증", () => {
  const perfect = [
    { cat: "shape", ok: true, ms: 1000 }, { cat: "shape", ok: true, ms: 1000 },
    { cat: "num", ok: true, ms: 1000 },   { cat: "num", ok: true, ms: 1000 },
    { cat: "logic", ok: true, ms: 1000 }, { cat: "logic", ok: true, ms: 1000 },
    { cat: "mem", ok: true, ms: 1000 },   { cat: "mem", ok: true, ms: 1000 },
  ];
  const scMax = B.scoreExam(perfect, "normal");
  assert.strictEqual(scMax.total, 100);
  assert.deepStrictEqual(scMax.domains, { shape: 25, num: 25, logic: 25, mem: 25 });

  const zero = B.scoreExam(perfect.map(x => ({ ...x, ok: false })), "normal");
  assert.strictEqual(zero.total, 0);

  const half = B.scoreExam([
    { cat: "shape", ok: true, ms: 30000 }, { cat: "shape", ok: false, ms: 5000 },
    { cat: "num", ok: true, ms: 4000 },   { cat: "num", ok: false, ms: 5000 },
    { cat: "logic", ok: false, ms: 5000 }, { cat: "logic", ok: false, ms: 5000 },
    { cat: "mem", ok: true, ms: 30000 },  { cat: "mem", ok: false, ms: 5000 },
  ], "normal");
  assert(half.total > 30 && half.total < 60, "중간 점수 합리 범위");
});

test("4. 성장/감소 이력 요약 계산 검증", () => {
  const hist = [
    { t: 1000, total: 58, domains: { shape: 16, num: 14, logic: 15, mem: 13 } },
    { t: 2000, total: 74, domains: { shape: 20, num: 18, logic: 18, mem: 18 } },
    { t: 3000, total: 69, domains: { shape: 22, num: 15, logic: 17, mem: 15 } },
  ];
  const sm = B.summarizeHistory(hist);
  assert.strictEqual(sm.count, 3);
  assert.strictEqual(sm.best, 74);
  assert.strictEqual(sm.delta, -5);
  assert.strictEqual(sm.domainDelta.shape, 2);
  assert.strictEqual(sm.domainDelta.num, -3);
});

console.log(`✅ All ${passed} BrainCore tests passed!`);
