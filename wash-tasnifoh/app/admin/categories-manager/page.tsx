"use client";
import { useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name_ar: string;
  name_en: string;
  code: string;
  search_key_words_ar: string[];
  search_key_words_en: string[];
  parent_id: number | null;
  description_ar: string | null;
  description_en: string | null;
};

const normalizeArabicText = (text: string) =>
  (text || "")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();

export default function CategoriesManagerPage() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    code: "",
    parent_id: "",
    search_key_words_ar: "",
    search_key_words_en: "",
    description_ar: "",
    description_en: "",
  });

  const resetForm = () => {
    setSelected(null);
    setForm({
      name_ar: "",
      name_en: "",
      code: "",
      parent_id: "",
      search_key_words_ar: "",
      search_key_words_en: "",
      description_ar: "",
      description_en: "",
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "فشل تحميل البيانات");
      setData(json.data as Category[]);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeArabicText(query);
    if (!q) return data;
    return data.filter((c) => {
      const nameMatch = normalizeArabicText(c.name_ar).includes(q) || normalizeArabicText(c.name_en).includes(q);
      const kwAr = (c.search_key_words_ar || []).some((k) => normalizeArabicText(k).includes(q));
      const kwEn = (c.search_key_words_en || []).some((k) => (k || "").toLowerCase().includes(q));
      return nameMatch || kwAr || kwEn;
    });
  }, [data, query]);

  // تحقّق فوري من تكرار الاسم العربي (مع استثناء العنصر المحدّد)
  const isDuplicateNameAr = useMemo(() => {
    const norm = (s: string) => normalizeArabicText(s || "");
    const current = norm(form.name_ar);
    if (!current) return false;
    return data.some((c) => norm(c.name_ar) === current && c.id !== selected?.id);
  }, [data, form.name_ar, selected?.id]);

  const fillForm = (cat: Category) => {
    setSelected(cat);
    setForm({
      name_ar: cat.name_ar || "",
      name_en: cat.name_en || "",
      code: cat.code || "",
      parent_id: cat.parent_id?.toString() || "",
      search_key_words_ar: (cat.search_key_words_ar || []).join(", "),
      search_key_words_en: (cat.search_key_words_en || []).join(", "),
      description_ar: cat.description_ar || "",
      description_en: cat.description_en || "",
    });
  };

  const parseWords = (s: string) =>
    (s || "")
      .split(/[,،\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  const onCreate = async () => {
    setError(null);
    const body = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      code: form.code.trim(),
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      search_key_words_ar: parseWords(form.search_key_words_ar),
      search_key_words_en: parseWords(form.search_key_words_en),
      description_ar: form.description_ar.trim() || null,
      description_en: form.description_en.trim() || null,
    };
    if (!body.name_ar) return setError("الاسم العربي مطلوب");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "فشل الإضافة");
      await fetchData();
      resetForm();
    } catch (e: any) {
      setError(e?.message || "فشل الإضافة");
    }
  };

  const onUpdate = async () => {
    if (!selected) return setError("اختر تصنيف للتعديل");
    setError(null);
    const body = {
      id: selected.id,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      code: form.code.trim(),
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      search_key_words_ar: parseWords(form.search_key_words_ar),
      search_key_words_en: parseWords(form.search_key_words_en),
      description_ar: form.description_ar.trim() || null,
      description_en: form.description_en.trim() || null,
    };
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "فشل التعديل");
      await fetchData();
      resetForm();
    } catch (e: any) {
      setError(e?.message || "فشل التعديل");
    }
  };

  const onDelete = async () => {
    if (!selected) return setError("اختر تصنيف للحذف");
    setError(null);
    try {
      const res = await fetch(`/api/categories?id=${selected.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "فشل الحذف");
      await fetchData();
      resetForm();
    } catch (e: any) {
      setError(e?.message || "فشل الحذف");
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">إدارة التصنيفات</h1>

      <div className="mb-4 flex gap-2">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="بحث بالاسم أو الكلمات المفتاحية"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="border px-4 py-2 rounded" onClick={fetchData}>
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">القائمة ({filtered.length})</h2>
            {loading && <span className="text-sm">جارِ التحميل…</span>}
          </div>
          <div className="border rounded divide-y max-h-[65vh] overflow-auto bg-white">
            {filtered.map((c) => (
              <button
                key={c.id}
                className={`w-full text-right px-3 py-2 hover:bg-gray-50 ${
                  selected?.id === c.id ? "bg-emerald-50" : ""
                }`}
                onClick={() => fillForm(c)}
                title={`ID: ${c.id}`}
              >
                <div className="font-medium">{c.name_ar}</div>
                <div className="text-xs text-gray-500">
                  {c.name_en} · {c.code} · أب: {c.parent_id ?? "—"}
                </div>
                <div className="text-xs text-gray-600 line-clamp-1">
                  كلمات: {(c.search_key_words_ar || []).slice(0, 6).join(", ")}
                </div>
              </button>
            ))}
            {!filtered.length && !loading && (
              <div className="p-4 text-sm text-gray-500">لا نتائج</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">{selected ? "تعديل تصنيف" : "إضافة تصنيف"}</h2>
          {!!error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="الاسم بالعربية"
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="الاسم بالإنجليزية"
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2"
                placeholder="الكود"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
              <select
                className="border rounded px-3 py-2 bg-white"
                value={form.parent_id}
                onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                title="اختر التصنيف الأب (اختياري)"
              >
                <option value="">بدون أب</option>
                {data.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name_ar} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>
            {!!isDuplicateNameAr && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                الاسم العربي مكرر — يرجى اختيار اسم مختلف.
              </div>
            )}
            <textarea
              className="border rounded px-3 py-2 min-h-20"
              placeholder="كلمات مفتاحية بالعربية (افصل بينها بفاصلة)"
              value={form.search_key_words_ar}
              onChange={(e) => setForm((f) => ({ ...f, search_key_words_ar: e.target.value }))}
            />
            <div className="text-xs text-gray-500">عدد الكلمات العربية: {parseWords(form.search_key_words_ar).length}</div>
            <textarea
              className="border rounded px-3 py-2 min-h-20"
              placeholder="Keywords بالإنجليزية (افصل بينها بفاصلة)"
              value={form.search_key_words_en}
              onChange={(e) => setForm((f) => ({ ...f, search_key_words_en: e.target.value }))}
            />
            <div className="text-xs text-gray-500">عدد الكلمات الإنجليزية: {parseWords(form.search_key_words_en).length}</div>
            <textarea
              className="border rounded px-3 py-2"
              placeholder="الوصف بالعربية (اختياري)"
              value={form.description_ar}
              onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            />
            <textarea
              className="border rounded px-3 py-2"
              placeholder="الوصف بالإنجليزية (اختياري)"
              value={form.description_en}
              onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
            />

            <div className="flex gap-2 pt-1">
              {!selected && (
                <button
                  className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  onClick={onCreate}
                  disabled={isDuplicateNameAr || !form.name_ar.trim()}
                >
                  إضافة
                </button>
              )}
              {selected && (
                <>
                  <button
                    className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={onUpdate}
                    disabled={isDuplicateNameAr || !form.name_ar.trim()}
                  >
                    حفظ التعديل
                  </button>
                  <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={onDelete}>
                    حذف
                  </button>
                  <button className="px-4 py-2 rounded border" onClick={resetForm}>
                    إلغاء
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
