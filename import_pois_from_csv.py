import csv
import json
import sys
from pathlib import Path

# Robust open with multiple encodings
def open_text_multi(path):
    encodings = ["utf-8-sig", "utf-16", "utf-8", "cp1256", "latin1"]
    last_err = None
    for enc in encodings:
        try:
            return open(path, "r", encoding=enc, newline="")
        except Exception as e:
            last_err = e
            continue
    raise last_err or Exception("Failed to open file with known encodings")


ROOT = Path(__file__).parent
CATS_PATH = ROOT / "wash-tasnifoh" / "data" / "categories.json"
OUT_POIS = ROOT / "wash-tasnifoh" / "data" / "pois.json"
OUT_REPORT = ROOT / "wash-tasnifoh" / "data" / "pois_import_report.json"
OUT_CATS_FROM_CSV = ROOT / "wash-tasnifoh" / "data" / "categories_from_csv.json"
OUT_CATS_MERGED = ROOT / "wash-tasnifoh" / "data" / "categories_merged.json"


def load_categories():
    data = json.loads((CATS_PATH).read_text(encoding="utf-8"))
    # Index by English and Arabic names (normalized lowercase)
    by_en = {}
    by_ar = {}
    by_id = {}
    for c in data:
        by_id[c["id"]] = c
        if c.get("name_en"):
            by_en[c["name_en"].strip().lower()] = c
        if c.get("name_ar"):
            by_ar[c["name_ar"].strip()] = c  # keep raw; Arabic normalization can be added if needed
    return data, by_id, by_en, by_ar


def sanitize_code(name: str) -> str:
    import re
    base = (name or "").upper()
    base = re.sub(r"[^A-Z0-9]+", "_", base).strip("_")
    if not base:
        base = "AUTO"
    return base[:12]


def derive_categories_from_csv(csv_path: Path, cats_existing: list):
    # Build normalized lookups for existing categories
    by_en = { (c.get("name_en") or "").strip().lower(): c for c in cats_existing if c.get("name_en") }
    by_ar = { (c.get("name_ar") or "").strip(): c for c in cats_existing if c.get("name_ar") }

    # Track unique categories/subcategories found in CSV
    unique_cats = {}
    unique_subs = {}

    with open_text_multi(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat_en = (row.get("category_en") or "").strip()
            cat_ar = (row.get("category_ar") or "").strip()
            sub_en = (row.get("sub_category_en") or "").strip()
            sub_ar = (row.get("sub_category_ar") or "").strip()

            key_cat = (cat_en.lower(), cat_ar)
            if key_cat not in unique_cats:
                unique_cats[key_cat] = {"name_en": cat_en, "name_ar": cat_ar}

            if sub_en or sub_ar:
                key_sub = (cat_en.lower(), cat_ar, sub_en.lower(), sub_ar)
                if key_sub not in unique_subs:
                    unique_subs[key_sub] = {
                        "cat_en": cat_en, "cat_ar": cat_ar,
                        "name_en": sub_en, "name_ar": sub_ar,
                    }

    # Create/merge categories
    merged = list(cats_existing)
    max_id = max([c.get("id", 0) for c in merged] + [0])
    by_id = { c["id"]: c for c in merged }
    # helper to find category by names
    def find_cat(en, ar):
        c = by_en.get((en or "").strip().lower()) or by_ar.get((ar or "").strip())
        return c

    # Ensure top-level categories
    cat_map = {}  # (cat_en.lower(), cat_ar) -> id
    for (cen, car), val in unique_cats.items():
        existing = find_cat(val["name_en"], val["name_ar"])
        if existing:
            cat_id = existing["id"]
        else:
            max_id += 1
            cat_id = max_id
            merged.append({
                "id": cat_id,
                "name_ar": val["name_ar"],
                "name_en": val["name_en"],
                "code": f"AUTO_{sanitize_code(val['name_en'] or val['name_ar'])}",
                "search_key_words_ar": [],
                "search_key_words_en": [],
                "parent_id": None,
                "description_ar": None,
                "description_en": None,
                "related_category": [],
                "created_at": None,
                "updated_at": None,
            })
        cat_map[(cen, car)] = cat_id

    # Ensure subcategories under their parent
    # Build quick lookup for sub by name + parent
    subs_index = {}
    for c in merged:
        if c.get("parent_id"):
            par = c["parent_id"]
            key = (par, (c.get("name_en") or "").strip().lower(), (c.get("name_ar") or "").strip())
            subs_index[key] = c

    sub_map = {}  # (cat_en.lower(), cat_ar, sub_en.lower(), sub_ar) -> id
    for key, val in unique_subs.items():
        cen = (val["cat_en"] or "").strip().lower()
        car = (val["cat_ar"] or "").strip()
        parent_id = cat_map.get((cen, car))
        if not parent_id:
            # Shouldn't happen, but fallback: create parent
            max_id += 1
            parent_id = max_id
            merged.append({
                "id": parent_id,
                "name_ar": val["cat_ar"],
                "name_en": val["cat_en"],
                "code": f"AUTO_{sanitize_code(val['cat_en'] or val['cat_ar'])}",
                "search_key_words_ar": [],
                "search_key_words_en": [],
                "parent_id": None,
                "description_ar": None,
                "description_en": None,
                "related_category": [],
                "created_at": None,
                "updated_at": None,
            })
            cat_map[(cen, car)] = parent_id

        sub_en = (val["name_en"] or "").strip()
        sub_ar = (val["name_ar"] or "").strip()
        existing = subs_index.get((parent_id, sub_en.lower(), sub_ar))
        if existing:
            sub_id = existing["id"]
        else:
            max_id += 1
            sub_id = max_id
            merged.append({
                "id": sub_id,
                "name_ar": sub_ar,
                "name_en": sub_en,
                "code": f"AUTO_{sanitize_code(sub_en or sub_ar)}",
                "search_key_words_ar": [],
                "search_key_words_en": [],
                "parent_id": parent_id,
                "description_ar": None,
                "description_en": None,
                "related_category": [],
                "created_at": None,
                "updated_at": None,
            })
            subs_index[(parent_id, sub_en.lower(), sub_ar)] = merged[-1]

        sub_map[key] = sub_id

    # Output categories derived from CSV (only those found) and merged full list
    cats_from_csv = []
    added = set()
    for (cen, car), cid in cat_map.items():
        if cid not in added:
            cats_from_csv.append(next(c for c in merged if c["id"] == cid))
            added.add(cid)
    for key, sid in sub_map.items():
        if sid not in added:
            cats_from_csv.append(next(c for c in merged if c["id"] == sid))
            added.add(sid)

    OUT_CATS_FROM_CSV.write_text(json.dumps(cats_from_csv, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_CATS_MERGED.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "cat_map": cat_map,
        "sub_map": sub_map,
        "cats_from_csv_count": len(cats_from_csv),
        "merged_count": len(merged),
    }, merged


def import_pois(csv_path: Path, authoritative_from_csv: bool = True):
    cats, by_id, by_en, by_ar = load_categories()
    cat_maps = None
    merged = cats
    if authoritative_from_csv:
        cat_maps, merged = derive_categories_from_csv(csv_path, cats)
        # refresh indexes
        by_id = { c["id"]: c for c in merged }
        by_en = { (c.get("name_en") or "").strip().lower(): c for c in merged if c.get("name_en") }
        by_ar = { (c.get("name_ar") or "").strip(): c for c in merged if c.get("name_ar") }

    pois = []
    unmatched = []
    counters = {"rows": 0, "matched": 0, "matched_sub": 0, "matched_cat_only": 0, "unmatched": 0}

    with open_text_multi(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            counters["rows"] += 1

            poi_id_raw = (row.get("id") or "").strip()
            name_en = (row.get("name_en") or "").strip()
            name_ar = (row.get("name_ar") or "").strip()
            cat_en = (row.get("category_en") or "").strip().lower()
            cat_ar = (row.get("category_ar") or "").strip()
            sub_en = (row.get("sub_category_en") or "").strip().lower()
            sub_ar = (row.get("sub_category_ar") or "").strip()

            if not poi_id_raw:
                continue
            try:
                poi_id = int(poi_id_raw)
            except:
                poi_id = poi_id_raw

            cat = None
            sub = None

            if authoritative_from_csv and cat_maps:
                # Use derived maps from CSV as truth
                key_cat = (cat_en.lower(), cat_ar)
                if (sub_en or sub_ar):
                    key_sub = (cat_en.lower(), cat_ar, sub_en.lower(), sub_ar)
                    sid = cat_maps["sub_map"].get(key_sub)
                    if sid:
                        sub = by_id.get(sid)
                        cat = by_id.get(sub.get("parent_id")) if sub else None
                if not sub:
                    cid = cat_maps["cat_map"].get(key_cat)
                    if cid:
                        cat = by_id.get(cid)
            else:
                # prefer English matching due to possible encoding issues in Arabic columns
                if sub_en:
                    sub = by_en.get(sub_en)
                if not sub and sub_ar:
                    sub = by_ar.get(sub_ar)
                if sub:
                    parent = by_id.get(sub.get("parent_id")) if sub.get("parent_id") else None
                    cat = parent
                else:
                    if cat_en:
                        cat = by_en.get(cat_en)
                    if not cat and cat_ar:
                        cat = by_ar.get(cat_ar)

            if not cat and not sub:
                counters["unmatched"] += 1
                unmatched.append({
                    "id": poi_id,
                    "name_en": name_en,
                    "name_ar": name_ar,
                    "category_en": row.get("category_en"),
                    "category_ar": row.get("category_ar"),
                    "sub_category_en": row.get("sub_category_en"),
                    "sub_category_ar": row.get("sub_category_ar"),
                })
                continue

            if sub:
                counters["matched_sub"] += 1
            else:
                counters["matched_cat_only"] += 1

            counters["matched"] += 1

            poi = {
                "id": poi_id,
                "name_en": name_en,
                "name_ar": name_ar,
                "category_id": (sub.get("parent_id") if sub else (cat.get("id") if cat else None)),
                "category_name_en": (cat.get("name_en") if cat else None) or (by_id.get(sub.get("parent_id"), {}).get("name_en") if sub else None),
                "category_name_ar": (cat.get("name_ar") if cat else None) or (by_id.get(sub.get("parent_id"), {}).get("name_ar") if sub else None),
                "subcategory_id": (sub.get("id") if sub else None),
                "subcategory_name_en": (sub.get("name_en") if sub else None),
                "subcategory_name_ar": (sub.get("name_ar") if sub else None),
                }
            pois.append(poi)

    OUT_POIS.write_text(json.dumps(pois, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_REPORT.write_text(json.dumps({"summary": counters, "unmatched": unmatched[:200]}, ensure_ascii=False, indent=2), encoding="utf-8")
    return counters, len(unmatched)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_pois_from_csv.py <path-to-csv> [--no-authoritative]")
        print("Example: python import_pois_from_csv.py \"F:/TRX_LOG/poi_ready_categories_all_1500.csv\"")
        sys.exit(1)
    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        sys.exit(2)
    authoritative = True
    if len(sys.argv) > 2 and sys.argv[2] == "--no-authoritative":
        authoritative = False
    counters, unmatched = import_pois(csv_path, authoritative_from_csv=authoritative)
    print("Imported:", json.dumps(counters, ensure_ascii=False))
    print("Output:", str(OUT_POIS))
    print("Report:", str(OUT_REPORT))
    if authoritative:
        print("Categories from CSV:", str(OUT_CATS_FROM_CSV))
        print("Merged categories:", str(OUT_CATS_MERGED))
