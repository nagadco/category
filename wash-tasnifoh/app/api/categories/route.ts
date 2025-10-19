import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Category } from '@/lib/categoryMatcher';

const REMOTE_BASE = process.env.CATEGORIES_API_URL?.replace(/\/$/, '');
const REMOTE_TOKEN = process.env.CATEGORIES_API_TOKEN || '';

const dataDir = path.join(process.cwd(), 'data');
const basePath = path.join(dataDir, 'categories.json');
const mergedPath = path.join(dataDir, 'categories_merged.json');
const bundledPath = path.join(dataDir, 'categories_bundled.json');

async function readCategories(): Promise<Category[]> {
  // Prefer bundled -> merged -> base
  let src = bundledPath;
  try {
    await fs.access(src);
  } catch {
    src = mergedPath;
    try { await fs.access(src); } catch { src = basePath; }
  }
  const raw = await fs.readFile(src, 'utf8');
  return JSON.parse(raw);
}

async function writeCategories(categories: Category[]) {
  // منع الكتابة في بيئة الإنتاج (مثل Vercel)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Writing is disabled in production. Use a DB or admin backend.');
  }
  const pretty = JSON.stringify(categories, null, 2);
  await fs.writeFile(basePath, pretty, 'utf8');
}

export async function GET() {
  try {
    if (REMOTE_BASE) {
      const res = await fetch(`${REMOTE_BASE}/categories`, { cache: 'no-store' });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }
    const categories = await readCategories();
    return NextResponse.json({ ok: true, data: categories });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (REMOTE_BASE) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (REMOTE_TOKEN) headers['x-api-token'] = REMOTE_TOKEN;
      const res = await fetch(`${REMOTE_BASE}/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }
    const categories = await readCategories();

    // توليد id جديد
    const nextId = (categories.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
    const newCat: Category = {
      id: nextId,
      name_ar: body.name_ar || '',
      name_en: body.name_en || '',
      code: body.code || '',
      search_key_words_ar: Array.isArray(body.search_key_words_ar) ? body.search_key_words_ar : [],
      search_key_words_en: Array.isArray(body.search_key_words_en) ? body.search_key_words_en : [],
      parent_id: typeof body.parent_id === 'number' ? body.parent_id : null,
      description_ar: body.description_ar ?? null,
      description_en: body.description_en ?? null,
    };

    // فحص التكرار بالاسم العربي بعد التطبيع البسيط
    const norm = (s: string) => (s || '').toLowerCase().trim();
    if (categories.some(c => norm(c.name_ar) === norm(newCat.name_ar))) {
      return NextResponse.json({ ok: false, error: 'اسم التصنيف العربي مكرر' }, { status: 400 });
    }

    categories.push(newCat);
    await writeCategories(categories);
    return NextResponse.json({ ok: true, data: newCat }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to add category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (REMOTE_BASE) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (REMOTE_TOKEN) headers['x-api-token'] = REMOTE_TOKEN;
      const res = await fetch(`${REMOTE_BASE}/categories`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }
    const { id, ...fields } = body || {};
    if (typeof id !== 'number') {
      return NextResponse.json({ ok: false, error: 'id مطلوب' }, { status: 400 });
    }
    const categories = await readCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: 'التصنيف غير موجود' }, { status: 404 });
    }

    // منع تكرار الاسم العربي مع غيره
    const norm = (s: string) => (s || '').toLowerCase().trim();
    if (fields.name_ar && categories.some(c => c.id !== id && norm(c.name_ar) === norm(fields.name_ar))) {
      return NextResponse.json({ ok: false, error: 'اسم التصنيف العربي مكرر' }, { status: 400 });
    }

    categories[idx] = {
      ...categories[idx],
      ...fields,
      // تأكيد شكل الحقول المصفوفية
      search_key_words_ar: Array.isArray(fields.search_key_words_ar)
        ? fields.search_key_words_ar
        : categories[idx].search_key_words_ar,
      search_key_words_en: Array.isArray(fields.search_key_words_en)
        ? fields.search_key_words_en
        : categories[idx].search_key_words_en,
    };

    await writeCategories(categories);
    return NextResponse.json({ ok: true, data: categories[idx] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id مطلوب' }, { status: 400 });
    }
    if (REMOTE_BASE) {
      const headers: Record<string, string> = {};
      if (REMOTE_TOKEN) headers['x-api-token'] = REMOTE_TOKEN;
      const res = await fetch(`${REMOTE_BASE}/categories?id=${id}`, { method: 'DELETE', headers });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }
    const categories = await readCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: 'التصنيف غير موجود' }, { status: 404 });
    }
    // منع حذف أب لديه أبناء
    if (categories.some(c => c.parent_id === id)) {
      return NextResponse.json({ ok: false, error: 'لا يمكن حذف تصنيف له تصنيفات فرعية' }, { status: 400 });
    }

    const removed = categories.splice(idx, 1)[0];
    await writeCategories(categories);
    return NextResponse.json({ ok: true, data: removed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to delete category' }, { status: 500 });
  }
}
