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


def auto_fix(new, t0):
    """11-01 베니 님 '피드백 없을 때 돌리고 스스로 수정도': 새 문제가 있으면 API 일꾼(hub work build)이 따로 된 작업 폴더(워크트리)에서 고치고
    그 게임만 QA 를 다시 돌려 통과하면 커밋까지 — 라이브(main push)에는 안 올림. 아침에 Claude 세션이 가지를 보고 합침."""
    games = sorted({i["game"] for i in new if i["game"] != "portal"} | ({"portal"} if any(i["game"] == "portal" for i in new) else set()))
    task = REP / f"autofix-{t0:%m%d}.md"
    rows = "\n".join(f"- [{i.get('sev')}] {i['game']} · {i.get('check', '')} · {str(i.get('title', ''))[:160]}\n  {str(i.get('detail', ''))[:400]}" for i in new[:12])
    task.write_text(f"""# 게임 사이트 밤 점검 자동 수정 ({t0:%Y-%m-%d})
저장소: C:\\Users\\1\\Claude-Benny\\game (정적 사이트, 순수 JS, 한국어 주석 — 둘레 코드 모양 그대로)
밤 QA(node test/qa/run.js)가 찾은 새 문제:
{rows}

할 일:
1. 문제마다 원인을 코드에서 찾아 가장 작게 고친다. 고친 JS 의 ?v= 숫자를 그 게임 index.html 에서 올린다.
2. 확인: `node test/qa/run.js --games {','.join(games)} --no-webkit` 과 (그 게임에 test/selftest.js 가 있으면) `node <게임>/test/selftest.js` — 둘 다 문제 0 이어야 함.
3. 통과하면 커밋 (메시지: '밤 점검 자동 수정: …'). push 하지 않는다. 못 고친 것은 이 파일 아래에 까닭을 적는다.
하지 말 것: common/ 의 큰 구조 바꾸기, firebase 규칙 수정·배포, 다른 저장소(agent-hub 등) 건드리기, 시험을 고쳐서 통과시키기.
""", encoding="utf-8")
    try:
        p = subprocess.run([PY, "-I", HUB, "work", "build", "--task", str(task), "--workdir", str(ROOT), "--tag", f"qa-fix-{t0:%m%d}", "--timeout", "60"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=75 * 60, creationflags=NOWIN)
        last = ((p.stdout or "") + (p.stderr or "")).strip().splitlines()[-1:] or [""]
        return f"🛠 자동 수정 시도 끝 (코드 {p.returncode}) — {last[0][:100]}"
    except subprocess.TimeoutExpired:
        return "🛠 자동 수정이 75분 안에 안 끝남"
    except Exception as e:
        return f"🛠 자동 수정 못 돌림: {e}"[:140]


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
    fix_note = auto_fix(new, t0) if new and "--no-fix" not in sys.argv else ""
    if new:
        names = {"portal": "게임 목록", "gostop": "고스톱", "seotda": "섯다", "poker": "홀덤", "baduk": "바둑", "omok": "오목", "cube": "큐브", "chess": "체스",
                 "janggi": "장기", "yut": "윷놀이", "billiards": "당구", "volley": "냥냥배구", "land": "땅따먹기", "onecard": "원카드", "nyang": "냥도쿠", "snake": "지렁이", "sc": "스타", "draw": "냥스트레이션"}
        lines = [f"· {names.get(i['game'], i['game'])}: {str(i.get('title', ''))[:60]}" for i in sorted(new, key=lambda i: i.get("sev") != "high")[:4]]
        more = f"\n…그 밖 {len(new) - 4}개" if len(new) > 4 else ""
        phone(f"🎮 게임 밤 점검: 새 문제 {len(new)}개\n" + "\n".join(lines) + more + (f"\n{fix_note}" if fix_note else "") + "\nClaude 에게 '게임 점검 결과 봐줘' 하시면 확인하고 올립니다.", "game-qa:" + t0.strftime("%m%d"))
    beat(True, ("새 문제 %d · " % len(new) if new else "") + msg)
    print("끝", msg, "새", len(new))


if __name__ == "__main__":
    main()
