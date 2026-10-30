"""게임 사이트 밤 점검 (작업 스케줄러 Benny-GameQA, 매일 04:30)
   node test/qa/run.js 전체(WebKit 포함, ~15분)를 돌리고, 지난밤에 없던 문제(high·medium)가 생겼거나
   점검기가 못 돌았을 때만 폰 베니비서로 한 통 (밤이라 소리 없이 알림함에만). 맥박은 hub beat game-qa.
   기록: report/nightly.json (지난밤 문제 목록) · report/nightly-history.jsonl (밤마다 숫자 한 줄)
   python -I test/qa/nightly.py [--quick] [--dry]   (--dry = 알림·맥박 안 보냄)"""
import json, subprocess, sys, datetime as dt
from pathlib import Path

QA = Path(__file__).resolve().parent
ROOT = QA.parent.parent
REP = QA / "report"
NODE = r"C:\Program Files\nodejs\node.exe"
PY = r"C:\Users\1\AppData\Local\Programs\Python\Python313\python.exe"
TG_SEND = r"C:\Users\1\Claude-Benny\secretary\telegram\tg_send.py"
HUB = r"C:\Users\1\Claude-Benny\agent-hub\hub.py"
NOWIN = getattr(subprocess, "CREATE_NO_WINDOW", 0)
DRY = "--dry" in sys.argv


def phone(text, key):
    if DRY: print("[알림]", text); return
    try: subprocess.run([PY, "-I", TG_SEND, "--level", "later", "--key", key, text], capture_output=True, timeout=30, creationflags=NOWIN)
    except Exception: pass


def beat(ok, msg):
    if DRY: print("[맥박]", ok, msg); return
    try: subprocess.run([PY, "-I", HUB, "beat", "game-qa", "ok" if ok else "fail", msg], capture_output=True, timeout=30, creationflags=NOWIN)
    except Exception: pass


def main():
    t0 = dt.datetime.now()
    args = [NODE, str(QA / "run.js")] + (["--quick"] if "--quick" in sys.argv else [])
    try:
        p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45 * 60, creationflags=NOWIN)
        code, tail = p.returncode, (p.stdout or "").strip().splitlines()[-1:] or (p.stderr or "").strip().splitlines()[-1:]
    except subprocess.TimeoutExpired:
        code, tail = -1, ["45분 넘게 안 끝남"]
    tail = tail[0][:160] if tail else ""
    try:
        D = json.loads((REP / "report.json").read_text(encoding="utf-8"))
        fresh = D["meta"]["started"] >= (t0 - dt.timedelta(minutes=1)).astimezone(dt.timezone.utc).isoformat()[:19]
    except Exception:
        D, fresh = None, False
    if code not in (0, 1) or not fresh:   # 1 = high 문제 있음 (정상 종료), 그 밖은 점검기 자체 고장
        phone(f"🎮 게임 밤 점검기가 못 돌았어요 (코드 {code}) — {tail}\nClaude 에게 '게임 점검기 봐줘' 하시면 고칩니다.", "game-qa:broken")
        beat(False, f"점검기 고장 코드 {code} {tail}")
        return

    issues = [dict(i, game=g) for g, x in D["games"].items() for i in x.get("issues", []) if i.get("cat", "bug") == "bug"]
    cnt = {s: sum(1 for i in issues if i.get("sev") == s) for s in ("high", "medium", "low")}
    sig = lambda i: "|".join([i["game"], i.get("sev", ""), str(i.get("title", ""))[:80]])
    try: last = set(json.loads((REP / "nightly.json").read_text(encoding="utf-8")).get("sigs", []))
    except Exception: last = set()
    now_sigs = sorted({sig(i) for i in issues})
    new = [i for i in issues if i.get("sev") in ("high", "medium") and sig(i) not in last]
    (REP / "nightly.json").write_text(json.dumps({"at": t0.isoformat(timespec="seconds"), "sigs": now_sigs}, ensure_ascii=False, indent=1), encoding="utf-8")
    mins = round(D["meta"]["durationMs"] / 60000)
    with open(REP / "nightly-history.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps({"at": t0.isoformat(timespec="seconds"), "min": mins, **cnt, "new": len(new), "mode": D["meta"]["mode"]}, ensure_ascii=False) + "\n")

    msg = f"high {cnt['high']} · medium {cnt['medium']} · low {cnt['low']} · {mins}분"
    if new:
        names = {"portal": "게임 목록", "gostop": "고스톱", "seotda": "섯다", "poker": "홀덤", "baduk": "바둑", "omok": "오목", "cube": "큐브", "chess": "체스",
                 "janggi": "장기", "yut": "윷놀이", "billiards": "당구", "volley": "냥냥배구", "land": "땅따먹기", "onecard": "원카드"}
        lines = [f"· {names.get(i['game'], i['game'])}: {str(i.get('title', ''))[:60]}" for i in sorted(new, key=lambda i: i.get("sev") != "high")[:4]]
        more = f"\n…그 밖 {len(new) - 4}개" if len(new) > 4 else ""
        phone(f"🎮 게임 밤 점검: 새 문제 {len(new)}개\n" + "\n".join(lines) + more + "\nClaude 에게 '게임 점검 결과 봐줘' 하시면 고칩니다.", "game-qa:" + t0.strftime("%m%d"))
    beat(True, ("새 문제 %d · " % len(new) if new else "") + msg)
    print("끝", msg, "새", len(new))


if __name__ == "__main__":
    main()
