// خوارزمية مطابقة التصنيفات بناءً على الكلمات المفتاحية العربية

export interface Category {
  id: number;
  name_ar: string;
  name_en: string;
  code: string;
  search_key_words_ar: string[];
  search_key_words_en: string[];
  parent_id: number | null;
  description_ar: string | null;
  description_en: string | null;
  // Optional matching controls (safe defaults)
  negative_key_words_ar?: string[];
  negative_key_words_en?: string[];
  disallow_partial?: boolean;
  domain?: string | null;
}

export interface CategoryMatch {
  category: Category;
  parentCategory: Category | null;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * تنظيف النص العربي من الحركات والتشكيل
 */
function normalizeArabicText(text: string): string {
  if (!text) return '';
  let t = String(text);
  // فصل الحروف العربية واللاتينية المتجاورة لتحسين التقسيم (e.g., Shoppingزهور)
  t = t.replace(/([\u0600-\u06FF])([A-Za-z]+)/g, '$1 $2')
       .replace(/([A-Za-z]+)([\u0600-\u06FF])/g, '$1 $2');
  t = t
    .replace(/[\u064B-\u065F]/g, '') // إزالة التشكيل
    .replace(/[ًٌٍَُِّْ]/g, '') // إزالة الحركات
    .replace(/[أإآ]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الياء
    .replace(/[0-9٠-٩]/g, ' ') // إزالة الأرقام
    .replace(/[_\-]/g, ' ') // شرطات إلى مسافات
    .replace(/[^\p{L}\s]/gu, ' ') // احتفظ بالأحرف فقط (عربي/لاتيني)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return t;
}

/**
 * تقسيم النص إلى كلمات مفتاحية
 */
function extractKeywords(text: string): string[] {
  const normalized = normalizeArabicText(text);
  // إزالة الكلمات الشائعة (stop words)
  const stopWords = ['و', 'في', 'من', 'إلى', 'على', 'عن', 'أو', 'ل', 'لل', 'ال', 'با', 'ب'];

  const words = normalized.split(/[\s،,]+/).filter(word =>
    word.length > 1 && !stopWords.includes(word)
  );

  return words;
}

/**
 * حساب درجة التشابه بين نصين
 */
function calculateSimilarity(text1: string, text2: string, opts?: { allowPartial?: boolean }): number {
  const norm1 = normalizeArabicText(text1);
  const norm2 = normalizeArabicText(text2);

  // التطابق التام
  if (norm1 === norm2) return 1.0;

  // التطابق الجزئي
  // Substring partials are risky; restrict to whole-token containment and lower weight
  const t1 = norm1.split(/\s+/).filter(Boolean);
  const t2 = norm2.split(/\s+/).filter(Boolean);
  const allowPartial = opts?.allowPartial !== false;
  if (allowPartial) {
    if ((t1.length === 1 && t2.includes(t1[0])) || (t2.length === 1 && t1.includes(t2[0]))) return 0.6;
  }

  // التشابه بناءً على الكلمات المشتركة
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * البحث عن التصنيفات المطابقة بناءً على اسم المحل
 */
export function matchCategories(
  storeName: string,
  categories: Category[],
  maxResults: number = 5
): CategoryMatch[] {
  if (!storeName || storeName.trim().length === 0) {
    return [];
  }

  const storeKeywords = extractKeywords(storeName);
  const matches: CategoryMatch[] = [];

  for (const category of categories) {
    let totalScore = 0;
    let matchCount = 0;
    const matchedKeywords: string[] = [];

    // مطابقة مع الاسم العربي للتصنيف
    const allowPartial = category.disallow_partial ? false : true;
    const nameScore = calculateSimilarity(storeName, category.name_ar, { allowPartial });
    if (nameScore > 0.3) {
      totalScore += nameScore * 3; // وزن أعلى للاسم
      matchCount++;
      matchedKeywords.push(category.name_ar);
    }

    // مطابقة مع الكلمات المفتاحية العربية
    if (category.search_key_words_ar && category.search_key_words_ar.length > 0) {
      for (const keyword of category.search_key_words_ar) {
        const keywordScore = calculateSimilarity(storeName, keyword, { allowPartial });

        if (normalizeArabicText(storeName) === normalizeArabicText(keyword)) {
          // Strong boost for exact keyword equality
          totalScore += 3.0;
          matchCount++;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        } else if (keywordScore > 0.3) {
          totalScore += keywordScore * 2;
          matchCount++;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }

        // مطابقة الكلمات الفردية
        for (const storeWord of storeKeywords) {
          const wordScore = calculateSimilarity(storeWord, keyword, { allowPartial });
          if (wordScore > 0.5) {
            totalScore += wordScore;
            matchCount++;
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        }
      }
    }

    // عقوبات الكلمات المانعة (negative keywords)
    if (category.negative_key_words_ar || category.negative_key_words_en) {
      const storeTokens = new Set(extractKeywords(storeName));
      const negAr = category.negative_key_words_ar || [];
      const negEn = category.negative_key_words_en || [];
      let penalties = 0;
      for (const n of negAr) {
        const tok = normalizeArabicText(n);
        if (tok && storeTokens.has(tok)) penalties += 0.6;
      }
      for (const n of negEn) {
        const tok = normalizeArabicText(n);
        if (tok && storeTokens.has(tok)) penalties += 0.6;
      }
      if (penalties > 0) {
        totalScore -= penalties; // لا نزيد العداد لتفادي تخفيف العقوبة
      }
    }

    // حساب الثقة النهائية
    if (matchCount > 0 && totalScore > 0) {
      const confidence = Math.min(totalScore / (matchCount + 1), 1.0);

      if (confidence > 0.1) {
        // البحث عن الـ parent category
        const parentCategory = category.parent_id
          ? categories.find(c => c.id === category.parent_id) || null
          : null;

        matches.push({
          category,
          parentCategory,
          confidence,
          matchedKeywords: matchedKeywords.slice(0, 3) // أول 3 كلمات مطابقة
        });
      }
    }
  }

  // ترتيب النتائج حسب الثقة
  matches.sort((a, b) => b.confidence - a.confidence);

  // إرجاع أفضل النتائج
  return matches.slice(0, maxResults);
}

/**
 * البحث عن تصنيف واحد (الأعلى ثقة)
 */
export function findBestCategory(
  storeName: string,
  categories: Category[]
): CategoryMatch | null {
  const matches = matchCategories(storeName, categories, 1);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * تصفية التصنيفات حسب النص
 */
export function filterCategories(
  searchText: string,
  categories: Category[]
): Category[] {
  if (!searchText || searchText.trim().length === 0) {
    return categories;
  }

  const normalized = normalizeArabicText(searchText);

  return categories.filter(category => {
    const nameMatch = normalizeArabicText(category.name_ar).includes(normalized);
    const keywordMatch = category.search_key_words_ar?.some(kw =>
      normalizeArabicText(kw).includes(normalized)
    );

    return nameMatch || keywordMatch;
  });
}
