import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const REMOTE_BASE = process.env.CATEGORIES_API_URL?.replace(/\/$/, '');

export async function GET() {
  try {
    if (REMOTE_BASE) {
      // If you have a remote POIs endpoint, you can change to `${REMOTE_BASE}/pois`
      const res = await fetch(`${REMOTE_BASE}/pois`, { cache: 'no-store' });
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }
    const dataPath = path.join(process.cwd(), 'data', 'pois.json');
    const raw = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read POIs' }, { status: 500 });
  }
}

