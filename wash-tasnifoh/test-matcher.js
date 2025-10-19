// ملف اختبار سريع لخوارزمية المطابقة
// تشغيل: node test-matcher.js

const fs = require('fs');

// قراءة البيانات
const categories = JSON.parse(fs.readFileSync('./data/categories.json', 'utf8'));

console.log('📊 إحصائيات قاعدة البيانات:');
console.log(`- عدد التصنيفات: ${categories.length}`);

const totalArKeywords = categories.reduce((sum, cat) =>
  sum + (cat.search_key_words_ar?.length || 0), 0);
const totalEnKeywords = categories.reduce((sum, cat) =>
  sum + (cat.search_key_words_en?.length || 0), 0);

console.log(`- إجمالي الكلمات المفتاحية العربية: ${totalArKeywords}`);
console.log(`- إجمالي الكلمات المفتاحية الإنجليزية: ${totalEnKeywords}`);
console.log(`- متوسط الكلمات العربية لكل تصنيف: ${(totalArKeywords/categories.length).toFixed(1)}`);
console.log(`- متوسط الكلمات الإنجليزية لكل تصنيف: ${(totalEnKeywords/categories.length).toFixed(1)}`);

console.log('\n🔍 عينات من التصنيفات:');
console.log('─'.repeat(80));

// عرض 10 عينات عشوائية
for (let i = 0; i < 10; i++) {
  const randomIndex = Math.floor(Math.random() * categories.length);
  const cat = categories[randomIndex];
  console.log(`\n${i + 1}. ${cat.name_ar} (${cat.name_en})`);
  console.log(`   الكود: ${cat.code}`);
  console.log(`   كلمات مفتاحية عربية (${cat.search_key_words_ar?.length || 0}):`,
    cat.search_key_words_ar?.slice(0, 3).join(', ') || 'لا توجد');
}

console.log('\n✅ البيانات جاهزة للاستخدام!');
console.log('\nلتشغيل التطبيق: npm run dev');
console.log('ثم افتح المتصفح على: http://localhost:3000');
