import json
from pathlib import Path

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "wash-tasnifoh" / "data"
MERGED = DATA_DIR / "categories_merged.json"
BASE = DATA_DIR / "categories.json"
OUT = DATA_DIR / "categories_bundled.json"
REPORT = DATA_DIR / "bundles_report.json"


def load_categories():
    src = MERGED if MERGED.exists() else BASE
    data = json.loads(src.read_text(encoding="utf-8"))
    return data, src


def uniq(seq):
    seen = set()
    out = []
    for x in seq:
        k = (x or "").strip()
        if not k:
            continue
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


# قاموس مرادفات/مثيلات مبسّط (قابل للتوسعة لاحقاً)
AR_SYNONYMS = {
    "مخبز": ["خبز", "مخابز", "مخبوزات", "تميس", "خبز تميس", "تنور"],
    "معجنات": ["فطائر", "مناقيش", "باتيه", "كرواسون", "سبرينغ رول"],
    "حلويات": ["حلويات شرقية", "بقلاوة", "كنافة", "بسبوسة", "لقيمات"],
    "متجر زهور": ["محل ورد", "زهور", "ورد"],
    "أحجار كريمة": ["حجر كريم", "ألماس", "ماس", "زمرد", "ياقوت", "سافير", "فيروز", "عقيق"],
    "مطعم": ["مطاعم", "مطاعم ومأكولات", "مطاعم فطور", "مطاعم شعبية"],
    "فول": ["فلافل", "طعمية", "فول وطعمية"],
    "ورق عنب": ["دوالي", "يبرق", "دولمة"],
}

EN_SYNONYMS = {
    "bakery": ["bread", "pastries", "bakes"],
    "pastry": ["pastries", "croissant", "puff"],
    "florist": ["flower shop", "flowers"],
    "gemstones": ["gemstone", "diamond", "emerald", "ruby", "sapphire", "turquoise", "agate"],
    "restaurant": ["restaurants", "diner", "eatery"],
    "beans": ["fava", "falafel"],
    "grape leaves": ["dolma", "yaprak", "warak enab"],
}


def is_food_category(cat: dict) -> bool:
    code = (cat.get("code") or "").upper()
    name_ar = (cat.get("name_ar") or "")
    name_en = (cat.get("name_en") or "")
    return (
        code.startswith("FB")
        or "مطعم" in name_ar or "مطاعم" in name_ar
        or "Food" in name_en or "Restaurant" in name_en
        or "Baker" in name_en or "Bakery" in name_en
    )


def gen_ar_variants(kw: str, food: bool) -> list[str]:
    out = []
    # تراكيب عامة
    out += [f"محل {kw}", f"متجر {kw}", f"{kw} محل", f"{kw} متجر"]
    # تراكيب طعام
    if food:
        out += [f"مطعم {kw}", f"{kw} مطعم", f"{kw} وجبات", f"وجبات {kw}"]
    return out


def gen_en_variants(kw: str, food: bool) -> list[str]:
    out = []
    base = kw.lower()
    out += [f"{base} shop", f"{base} store", f"shop {base}", f"store {base}"]
    if food:
        out += [f"{base} restaurant", f"{base} food", f"restaurant {base}"]
    return out


def expand_category(cat: dict) -> dict:
    food = is_food_category(cat)
    ar = list(cat.get("search_key_words_ar") or [])
    en = list(cat.get("search_key_words_en") or [])

    # مرادفات حسب الكلمة نفسها
    for kw in list(ar):
        base = kw.strip()
        if not base:
            continue
        # قاموس عربي
        for k, vals in AR_SYNONYMS.items():
            if base == k or base in vals:
                ar += vals
        # توليد تراكيب عامة
        ar += gen_ar_variants(base, food)

    for kw in list(en):
        base = (kw or "").strip().lower()
        if not base:
            continue
        for k, vals in EN_SYNONYMS.items():
            if base == k or base in vals:
                en += vals
        en += gen_en_variants(base, food)

    # مرادفات لبعض الأسماء نفسها (اسم التصنيف)
    name_ar = (cat.get("name_ar") or "").strip()
    name_en = (cat.get("name_en") or "").strip()
    if name_ar:
        ar += gen_ar_variants(name_ar, food)
        ar += AR_SYNONYMS.get(name_ar, [])
    if name_en:
        base = name_en.lower()
        en += gen_en_variants(base, food)
        en += EN_SYNONYMS.get(base, [])

    # تنظيف وتحديد سقف منطقي للتوسيع لكل فئة
    cat["search_key_words_ar"] = uniq(ar)[:80]
    cat["search_key_words_en"] = uniq(en)[:80]
    return cat


def main():
    cats, src = load_categories()
    before_ar = sum(len(c.get("search_key_words_ar") or []) for c in cats)
    before_en = sum(len(c.get("search_key_words_en") or []) for c in cats)

    for c in cats:
        expand_category(c)

    after_ar = sum(len(c.get("search_key_words_ar") or []) for c in cats)
    after_en = sum(len(c.get("search_key_words_en") or []) for c in cats)

    OUT.write_text(json.dumps(cats, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT.write_text(json.dumps({
        "source": str(src),
        "output": str(OUT),
        "ar_before": before_ar,
        "ar_after": after_ar,
        "en_before": before_en,
        "en_after": after_en,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Source:", src)
    print("Output:", OUT)
    print("Report:", REPORT)
    print("AR:", before_ar, "->", after_ar, "(diff:", after_ar - before_ar, ")")
    print("EN:", before_en, "->", after_en, "(diff:", after_en - before_en, ")")


if __name__ == "__main__":
    main()

