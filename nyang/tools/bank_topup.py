"""냥도쿠 퀸즈 판 묶음 채우기 (11-08 베니 님 '고수 판 더 만들고, 매번 내가 만들라고 해야 하나?')
   단계 지도 고수(91단계~)는 판 묶음을 차례로 씀: puzzles.json 의 1,000판 + bank/master-<c>.json 1,000판씩 (main.js stageInfo).
   제일 앞선 사람의 단계가 끝에서 HEAD 단계(≈ 한 달) 안으로 들어오면 1,000판 묶음을 더 만들어 올림 (git commit · push → 사이트).
   판 만들기 = ai-practice/rl-15-meowdoku 의 generate(답 하나) + 사람식 풀이 단계 4(가정해 보기까지) — make_bank2.py 의 고수 기준과 같음
   python -I nyang/tools/bank_topup.py [--check] [--add N] [--dry] [--procs 6]
     --check = 만들지 않고 남은 판만 · --add N = 남은 판과 상관없이 N 묶음 · --dry = 만들되 커밋 · push · 알림 · 맥박 안 함
   작업 스케줄러 Benny-NyangBank (매일 05:40, nyang/tools/register-bank.bat) · 맥박 hub beat nyang-bank"""
import json, math, subprocess, sys, tempfile, time
from multiprocessing import Pool
from pathlib import Path

GAME = Path(__file__).resolve().parents[2]
NY = GAME / "nyang"
BANK = NY / "bank"
GEN = Path(r"C:\Users\1\Claude-Benny\ai-practice\rl-15-meowdoku")
PY = r"C:\Users\1\AppData\Local\Programs\Python\Python313\python.exe"
FIREBASE = r"C:\Users\1\AppData\Roaming\npm\firebase.cmd"
TG_SEND = r"C:\Users\1\Claude-Benny\secretary\telegram\tg_send.py"
HUB = r"C:\Users\1\Claude-Benny\agent-hub\hub.py"
NOWIN = getattr(subprocess, "CREATE_NO_WINDOW", 0)
CHUNK, BASE, HEAD, TARGET = 1000, {"master": 90}, 1500, 3000   # 남은 판이 HEAD 단계보다 적으면 TARGET 단계가 되게 채움
PLAN = {"master": [(9, 500), (10, 500)]}                          # 묶음 하나 = 9×9 500 + 10×10 500 (11×11 은 한 판 13초라 뺌)
L, DIG = "ABCDEFGHIJKLMNOP", "0123456789AB"
sys.path.insert(0, str(GEN))
ARGS = sys.argv[1:]
DRY = "--dry" in ARGS


def arg(name, d):
    return type(d)(ARGS[ARGS.index(name) + 1]) if name in ARGS else d


def one(job):
    from meowdoku import generate
    from trace_solver import solve_with_trace
    n, seed = job
    try: p = generate(n, seed=seed)
    except RuntimeError: return None
    lines, ans = solve_with_trace(p.regions)
    if ans is None or ans != p.answer: return None
    lv = 1
    for s in lines:
        if s.startswith("Suppose"): lv = max(lv, 4)
        elif s.startswith("Regions "): lv = max(lv, 3)
        elif s.startswith("All cells left"): lv = max(lv, 2)
    return {"n": n, "r": "".join(L[g] for row in p.regions for g in row), "a": "".join(DIG[c] for c in p.answer), "t": lv}


def say(text, key="nyang-bank"):
    print(text)
    if DRY: return
    try: subprocess.run([PY, "-I", TG_SEND, "--level", "later", "--key", key, text], capture_output=True, timeout=30, creationflags=NOWIN)
    except Exception: pass


def beat(ok, msg):
    print("[맥박]", ok, msg)
    if DRY: return
    try: subprocess.run([PY, "-I", HUB, "beat", "nyang-bank", "ok" if ok else "fail", msg], capture_output=True, timeout=30, creationflags=NOWIN)
    except Exception: pass


def top_stage():
    """제일 앞선 사람의 단계 (nyang/rec/{pid}/st 의 s<번호> 가장 큰 것) — 관리자 로그인된 firebase CLI 로 읽기만"""
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "rec.json"
        subprocess.run([FIREBASE, "database:get", "/nyang/rec", "--project", "benny-meeting", "-o", str(out)], cwd=d, capture_output=True, timeout=180, creationflags=NOWIN)
        rec = json.loads(out.read_text(encoding="utf-8")) if out.exists() else None
    if not isinstance(rec, dict): raise RuntimeError("nyang/rec 를 못 읽음 (firebase 로그인 · 인터넷)")
    best = 0
    for v in rec.values():
        for k in ((v or {}).get("st") or {}):
            if str(k).startswith("s") and str(k)[1:].isdigit(): best = max(best, int(str(k)[1:]))
    return best


def make_chunk(tier, c, used, procs):
    got, t0 = [], time.time()
    with Pool(procs) as pool:
        for n, cnt in PLAN[tier]:
            have, seed = 0, 70_000_000 + c * 1_000_000 + n * 50_000   # 묶음 · 크기마다 다른 씨앗 (pool/ 의 20만~130만, 시험 900만대와 안 겹침)
            while have < cnt:
                jobs = [(n, seed + i) for i in range(procs * 40)]; seed += len(jobs)
                for p in pool.imap_unordered(one, jobs):
                    if p and p["t"] == 4 and p["r"] not in used and have < cnt:
                        used.add(p["r"]); got.append(p); have += 1
            print(f"  {tier}-{c} {n}×{n} {have}판 ({time.time() - t0:.0f}초)", flush=True)
    got.sort(key=lambda p: p["r"])   # 같은 씨앗이면 같은 묶음 (병렬 순서와 상관없이)
    return got


def git(*a):
    return subprocess.run(["git", *a], cwd=GAME, capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=NOWIN)


def main():
    idxf = BANK / "index.json"
    idx = json.loads(idxf.read_text(encoding="utf-8")) if idxf.exists() else {"chunk": CHUNK, "tiers": {}}
    tier, K = "master", int(idx["tiers"].get("master", 0))
    cap = BASE[tier] + CHUNK * (1 + K)                       # 이 단계까지는 처음 보는 판
    add = arg("--add", 0)
    try: top = top_stage()
    except Exception as e:
        if not add: beat(False, f"단계 못 읽음: {e}"); say(f"🐱 냥도쿠 판 묶음 점검: 단계 기록을 못 읽었어요 ({e})"); return 1
        top = 0
    left = cap - top
    print(f"고수 묶음 {1 + K}개 → {cap}단계까지 · 제일 앞선 단계 {top} · 남은 {left}단계")
    if "--check" in ARGS: return 0
    need = add or (math.ceil((TARGET - left) / CHUNK) if left < HEAD else 0)
    if not need: beat(True, f"고수 {cap}단계까지 · 앞선 단계 {top} · 남은 {left}"); return 0
    used = set()
    for f in [NY / "puzzles.json", *BANK.glob("*.json")]:
        if f.name == "index.json": continue
        d = json.loads(f.read_text(encoding="utf-8"))
        for p in (d if isinstance(d, list) else [q for v in d.values() for q in v]): used.add(p["r"])
    BANK.mkdir(exist_ok=True)
    files = []
    for c in range(K + 1, K + 1 + need):
        ch = make_chunk(tier, c, used, arg("--procs", 6))
        f = BANK / f"{tier}-{c}.json"
        f.write_text(json.dumps(ch, separators=(",", ":")), encoding="utf-8")
        files.append(f)
        idx["tiers"][tier] = c
        idxf.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    cap2 = BASE[tier] + CHUNK * (1 + idx["tiers"][tier])
    msg = f"냥도쿠 고수 판 {need * CHUNK:,}개 더 만듦 (제일 앞선 {top}단계 · 이제 {cap2}단계까지 새 판)"
    if DRY: print("[dry]", msg); return 0
    if git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip() != "main":
        beat(False, "game 저장소가 main 이 아님 — 판 파일만 만들고 커밋 안 함"); say("🐱 " + msg + " — game 저장소가 main 이 아니라 커밋은 못 했어요"); return 1
    rel = [str(f.relative_to(GAME)).replace("\\", "/") for f in files] + ["nyang/bank/index.json"]
    git("add", "--", *rel)
    r = git("commit", "-q", "-m", msg + "\n\nnyang/tools/bank_topup.py (작업 스케줄러 Benny-NyangBank) 가 저절로", "--", *rel)
    if r.returncode != 0: beat(False, "커밋 실패: " + (r.stderr or r.stdout).strip()[:200]); say("🐱 " + msg + " — 커밋 실패"); return 1
    ahead = git("rev-list", "--count", "@{u}..HEAD").stdout.strip()
    if ahead != "1":   # 다른 세션이 아직 안 올린 커밋까지 같이 올리지 않게 — 내 커밋 하나일 때만 push
        beat(False, f"올리지 않은 커밋이 {ahead}개라 push 안 함"); say("🐱 " + msg + f" — 커밋은 했는데 다른 커밋도 {ahead}개 밀려 있어 push 는 안 했어요 (게임 세션에서 올려 주세요)"); return 1
    p = git("push", "-q")
    if p.returncode != 0: beat(False, "push 실패: " + p.stderr.strip()[:200]); say("🐱 " + msg + " — 커밋은 했는데 push 실패 (게임 세션에서 올려 주세요)"); return 1
    beat(True, msg); say("🐱 " + msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
