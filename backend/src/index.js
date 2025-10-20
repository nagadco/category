import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || '';

// Data directory (defaults to repo’s wash-tasnifoh/data)
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../wash-tasnifoh/data');
const DATA_DIR = process.env.DATA_DIR || DEFAULT_DATA_DIR;
const PATH_BASE = path.join(DATA_DIR, 'categories.json');
const PATH_MERGED = path.join(DATA_DIR, 'categories_merged.json');
const PATH_BUNDLED = path.join(DATA_DIR, 'categories_bundled.json');
const PATH_POIS = path.join(DATA_DIR, 'pois.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

function requireToken(req, res, next) {
  if (!API_TOKEN) return next(); // no token configured => allow (dev)
  const token = req.headers['x-api-token'] || req.query.token;
  if (token === API_TOKEN) return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

async function readJsonPrefer(paths) {
  for (const p of paths) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch {}
  }
  throw new Error('No data file found: ' + paths.join(', '));
}

async function readCategories() {
  return readJsonPrefer([PATH_BUNDLED, PATH_MERGED, PATH_BASE]);
}

async function writeCategories(categories) {
  // Note: on Render, filesystem is ephemeral unless using a Persistent Disk.
  const pretty = JSON.stringify(categories, null, 2);
  await fs.writeFile(PATH_BASE, pretty, 'utf8');
  return true;
}

// Root route
app.get('/', (req, res) => {
  res.type('text/plain').send(
    [
      'Categories Backend API',
      '',
      'Available endpoints:',
      '- GET  /health',
      '- GET  /categories',
      '- POST /categories   (requires x-api-token if configured)',
      '- PUT  /categories    (requires x-api-token if configured)',
      '- DELETE /categories  (requires x-api-token if configured)',
      '- GET  /pois',
      ''
    ].join('\n')
  );
});

app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// Categories API
app.get('/categories', async (req, res) => {
  try {
    const data = await readCategories();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to read categories' });
  }
});

app.post('/categories', requireToken, async (req, res) => {
  try {
    const body = req.body || {};
    const list = await readCategories();
    const nextId = (list.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
    const norm = (s) => (s || '').toString().toLowerCase().trim();
    if (list.some(c => norm(c.name_ar) === norm(body.name_ar))) {
      return res.status(400).json({ ok: false, error: 'اسم التصنيف العربي مكرر' });
    }
    const newCat = {
      id: nextId,
      name_ar: body.name_ar || '',
      name_en: body.name_en || '',
      code: body.code || '',
      search_key_words_ar: Array.isArray(body.search_key_words_ar) ? body.search_key_words_ar : [],
      search_key_words_en: Array.isArray(body.search_key_words_en) ? body.search_key_words_en : [],
      parent_id: Number.isFinite(body.parent_id) ? body.parent_id : null,
      description_ar: body.description_ar ?? null,
      description_en: body.description_en ?? null,
    };
    list.push(newCat);
    await writeCategories(list);
    res.status(201).json({ ok: true, data: newCat });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to add category' });
  }
});

app.put('/categories', requireToken, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id;
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id مطلوب' });
    const list = await readCategories();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'التصنيف غير موجود' });
    const norm = (s) => (s || '').toString().toLowerCase().trim();
    if (body.name_ar && list.some(c => c.id !== id && norm(c.name_ar) === norm(body.name_ar))) {
      return res.status(400).json({ ok: false, error: 'اسم التصنيف العربي مكرر' });
    }
    const prev = list[idx];
    const updated = {
      ...prev,
      ...body,
      search_key_words_ar: Array.isArray(body.search_key_words_ar) ? body.search_key_words_ar : prev.search_key_words_ar,
      search_key_words_en: Array.isArray(body.search_key_words_en) ? body.search_key_words_en : prev.search_key_words_en,
    };
    list[idx] = updated;
    await writeCategories(list);
    res.json({ ok: true, data: updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to update category' });
  }
});

app.delete('/categories', requireToken, async (req, res) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: 'id مطلوب' });
    const list = await readCategories();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: 'التصنيف غير موجود' });
    if (list.some(c => c.parent_id === id)) {
      return res.status(400).json({ ok: false, error: 'لا يمكن حذف تصنيف له تصنيفات فرعية' });
    }
    const [removed] = list.splice(idx, 1);
    await writeCategories(list);
    res.json({ ok: true, data: removed });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to delete category' });
  }
});

// POIs API (read-only)
app.get('/pois', async (req, res) => {
  try {
    const raw = await fs.readFile(PATH_POIS, 'utf8');
    const data = JSON.parse(raw);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to read POIs' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log('DATA_DIR =', DATA_DIR);
});
