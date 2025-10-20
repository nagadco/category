import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Category } from '@/lib/categoryMatcher';

// Configure runtime for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryId, keyword_ar, keyword_en } = body;

    if (!categoryId || typeof categoryId !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'معرف التصنيف مطلوب' },
        { status: 400 }
      );
    }

    if (!keyword_ar && !keyword_en) {
      return NextResponse.json(
        { ok: false, error: 'يجب إدخال كلمة مفتاحية بالعربي أو الإنجليزي على الأقل' },
        { status: 400 }
      );
    }

    if (REMOTE_BASE) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (REMOTE_TOKEN) headers['x-api-token'] = REMOTE_TOKEN;
      const res = await fetch(`${REMOTE_BASE}/categories/add-keyword`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    const categories = await readCategories();
    const idx = categories.findIndex(c => c.id === categoryId);

    if (idx === -1) {
      return NextResponse.json(
        { ok: false, error: 'التصنيف غير موجود' },
        { status: 404 }
      );
    }

    const category = categories[idx];

    // Add Arabic keyword if provided
    if (keyword_ar) {
      const trimmed = keyword_ar.trim();
      if (trimmed && !category.search_key_words_ar.includes(trimmed)) {
        category.search_key_words_ar.push(trimmed);
      }
    }

    // Add English keyword if provided
    if (keyword_en) {
      const trimmed = keyword_en.trim();
      if (trimmed && !category.search_key_words_en.includes(trimmed)) {
        category.search_key_words_en.push(trimmed);
      }
    }

    categories[idx] = category;
    await writeCategories(categories);

    return NextResponse.json({
      ok: true,
      message: 'تم إضافة الكلمات المفتاحية بنجاح',
      data: category
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to add keywords' },
      { status: 500 }
    );
  }
}
