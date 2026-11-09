"""檢查所有城市資料是否符合 AGENTS.md 的規則。

用法：python scripts/validate.py
全部通過會印出 ✅，有問題會列出每一個錯誤並以非 0 結束。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITY_DIR = ROOT / "data" / "cities"
REGIONS = {"東北亞", "東南亞", "歐洲", "北美洲", "大洋洲", "其他"}
QUICK_FACT_KEYS = ["currency", "language", "time_diff", "flight_time", "best_season", "plug"]

errors = []
CJK = r"[\u4e00-\u9fff]"


def contrast_with_white(hex_color):
    """WCAG 對比度：白字放在主題色上的可讀性"""
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    lum = 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
    return 1.05 / (lum + 0.05)


def walk_strings(obj, path=""):
    """列出 JSON 裡所有文字欄位，用來做全文檢查"""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk_strings(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_strings(v, f"{path}[{i}]")


def err(city, msg):
    errors.append(f"[{city}] {msg}")


def need_str(city, obj, key, where="", min_len=1, max_len=None):
    v = obj.get(key)
    label = f"{where}{key}"
    if not isinstance(v, str) or len(v.strip()) < min_len:
        err(city, f"{label} 必須是至少 {min_len} 字的文字")
        return
    if max_len and len(v) > max_len:
        err(city, f"{label} 超過 {max_len} 字，目前 {len(v)} 字")


def check_list(city, data, key, lo, hi, fields):
    items = data.get(key)
    if not isinstance(items, list) or not (lo <= len(items) <= hi):
        err(city, f"{key} 需要 {lo} 到 {hi} 項")
        return
    for i, it in enumerate(items):
        for f in fields:
            need_str(city, it, f, where=f"{key}[{i}].")


def check_city(cid):
    path = CITY_DIR / f"{cid}.json"
    if not path.exists():
        err(cid, f"cities.json 有登記，但找不到 data/cities/{cid}.json")
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(cid, f"JSON 格式錯誤：{e}")
        return

    if data.get("id") != cid:
        err(cid, f"id 必須和檔名相同，目前是 {data.get('id')}")
    if not re.fullmatch(r"[a-z]+(-[a-z]+)*", cid):
        err(cid, "id 只能用英文小寫，多個字用 - 連接")
    for k in ["name", "name_en", "country", "emoji"]:
        need_str(cid, data, k)
    need_str(cid, data, "tagline", max_len=30)
    need_str(cid, data, "intro", min_len=60, max_len=150)
    if data.get("region") not in REGIONS:
        err(cid, f"region 必須是 {sorted(REGIONS)} 其中之一")
    color = str(data.get("theme_color", ""))
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        err(cid, "theme_color 必須是 #RRGGBB 格式")
    elif contrast_with_white(color) < 3:
        err(cid, f"theme_color {color} 太亮，白字對比度只有 {contrast_with_white(color):.2f}，至少要 3")
    if len(str(data.get("emoji", ""))) > 4 or re.search(r"[\w\s]", str(data.get("emoji", ""))):
        err(cid, "emoji 只能放一個 emoji，不能有文字")
    if str(data.get("tagline", "")).endswith(("。", "！", ".")):
        err(cid, "tagline 結尾不要加標點")

    # 全文檢查：不能有 HTML、網址，數字和中文之間要有半形空格
    for path_, text in walk_strings(data):
        if re.search(r"<[a-zA-Z/]", text):
            err(cid, f"{path_} 不能包含 HTML 標籤")
        if re.search(r"https?://|www\.", text):
            err(cid, f"{path_} 不能包含網址")
        if path_ not in ("id", "updated", "theme_color") and re.search(rf"{CJK}\d|\d{CJK}", text):
            err(cid, f"{path_} 數字和中文之間要加半形空格：{text[:30]}")

    qf = data.get("quick_facts", {})
    for k in QUICK_FACT_KEYS:
        need_str(cid, qf, k, where="quick_facts.")
    if not re.search(r"比台北(快|慢) \d+(\.\d+)? 小時|和台北相同", qf.get("time_diff", "")):
        err(cid, "quick_facts.time_diff 格式要寫成 比台北快 1 小時、比台北慢 1 小時 或 和台北相同")

    check_list(cid, data, "spots", 4, 6, ["name", "area", "desc", "tip"])
    check_list(cid, data, "food", 3, 5, ["name", "desc", "where"])

    tr = data.get("transport", {})
    for k in ["airport", "city", "pass"]:
        need_str(cid, tr, k, where="transport.")

    b = data.get("budget", {})
    pd = b.get("per_day_twd", {})
    vals = [pd.get(k) for k in ["save", "standard", "comfort"]]
    if not all(isinstance(v, int) and v > 0 for v in vals):
        err(cid, "budget.per_day_twd 的 save、standard、comfort 必須是正整數")
    elif not (vals[0] < vals[1] < vals[2]):
        err(cid, "budget.per_day_twd 必須 save 小於 standard 小於 comfort")
    if not str(b.get("notes", "")).startswith("不含機票"):
        err(cid, "budget.notes 必須以 不含機票 開頭")

    it = data.get("itinerary")
    if not isinstance(it, list) or not (2 <= len(it) <= 5):
        err(cid, "itinerary 需要 2 到 5 天")
    else:
        for i, d in enumerate(it, 1):
            if d.get("day") != i:
                err(cid, f"itinerary 第 {i} 項的 day 必須是 {i}")
            need_str(cid, d, "title", where=f"itinerary[{i-1}].", min_len=2, max_len=8)
            if not isinstance(d.get("plan"), list) or not (2 <= len(d["plan"]) <= 5):
                err(cid, f"itinerary 第 {i} 天的 plan 需要 2 到 5 項")

    tips = data.get("tips")
    if not isinstance(tips, list) or not (2 <= len(tips) <= 5):
        err(cid, "tips 需要 2 到 5 項")
    if not re.fullmatch(r"\d{4}-\d{2}", str(data.get("updated", ""))):
        err(cid, "updated 必須是 YYYY-MM 格式")
    return data.get("theme_color", "").lower()


def main():
    registry = json.loads((ROOT / "data" / "cities.json").read_text(encoding="utf-8"))["cities"]
    if len(registry) != len(set(registry)):
        errors.append("[cities.json] 有重複登記的城市")
    colors = {}
    for cid in registry:
        c = check_city(cid)
        if c:
            if c in colors:
                err(cid, f"theme_color 和 {colors[c]} 重複")
            colors[c] = cid
    for f in CITY_DIR.glob("*.json"):
        if f.stem not in registry:
            errors.append(f"[{f.stem}] 有資料檔但沒有登記在 data/cities.json")

    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for cid in registry:
        f = CITY_DIR / f"{cid}.json"
        if f.exists():
            name = json.loads(f.read_text(encoding="utf-8")).get("name", "")
            if f" {name} |" not in readme:
                errors.append(f"[{cid}] README.md 的已收錄城市表格缺少 {name}")

    if errors:
        print(f"❌ 發現 {len(errors)} 個問題：")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print(f"✅ 全部 {len(registry)} 個城市都符合規則：{', '.join(registry)}")


if __name__ == "__main__":
    main()
