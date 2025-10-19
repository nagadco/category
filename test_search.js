const fs = require('fs');

// Normalize function from categoryMatcher.ts
function normalizeArabicText(text) {
  return text
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

function calculateSimilarity(text1, text2) {
  const norm1 = normalizeArabicText(text1);
  const norm2 = normalizeArabicText(text2);
  if (norm1 === norm2) return 1.0;
  const t1 = norm1.split(/\s+/).filter(Boolean);
  const t2 = norm2.split(/\s+/).filter(Boolean);
  if ((t1.length === 1 && t2.includes(t1[0])) || (t2.length === 1 && t1.includes(t2[0]))) return 0.6;
  const words1 = new Set(t1);
  const words2 = new Set(t2);
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

const searchText = 'مخبز';
const data = JSON.parse(fs.readFileSync('./wash-tasnifoh/data/categories.json', 'utf8'));

const bakeries = data.find(c => c.id === 55);
const cookies = data.find(c => c.id === 308);

console.log('TESTING SEARCH TERM: "مخبز"');
console.log('='.repeat(60));

console.log('\n1. BAKERIES (ID: 55):');
console.log('   Name:', bakeries.name_ar);
console.log('   Similarity with name:', calculateSimilarity(searchText, bakeries.name_ar).toFixed(3));
console.log('   Keywords:', bakeries.search_key_words_ar);

console.log('\n2. COOKIES (ID: 308):');
console.log('   Name:', cookies.name_ar);
console.log('   Similarity with name:', calculateSimilarity(searchText, cookies.name_ar).toFixed(3));

console.log('\n   KEY ISSUE - "مخبز الكوكيز" keyword:');
const problematicKw = 'مخبز الكوكيز';
const sim = calculateSimilarity(searchText, problematicKw);
console.log('   Keyword:', problematicKw);
console.log('   Similarity score:', sim.toFixed(3));
console.log('   Normalized search:', normalizeArabicText(searchText));
console.log('   Normalized keyword:', normalizeArabicText(problematicKw));
console.log('   Match type: PARTIAL (0.8) because search term is CONTAINED in keyword');
