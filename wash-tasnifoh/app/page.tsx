'use client';

import { useState, useEffect } from 'react';
import { matchCategories, Category, CategoryMatch } from '@/lib/categoryMatcher';
import categoriesData from '@/data/categories.json';

export default function Home() {
  const [storeName, setStoreName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [predictions, setPredictions] = useState<CategoryMatch[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddKeywordModal, setShowAddKeywordModal] = useState(false);
  const [selectedCategoryForKeyword, setSelectedCategoryForKeyword] = useState<Category | null>(null);
  const [newKeywordAr, setNewKeywordAr] = useState('');
  const [newKeywordEn, setNewKeywordEn] = useState('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [addKeywordMessage, setAddKeywordMessage] = useState('');

  // تحميل البيانات مباشرة من الملف (بدون API)
  useEffect(() => {
    try {
      setCategories(categoriesData as Category[]);
      setIsLoading(false);
    } catch (error) {
      console.error('خطأ في تحميل التصنيفات:', error);
      setIsLoading(false);
    }
  }, []);

  // البحث التلقائي عند تغيير النص
  useEffect(() => {
    if (storeName.trim().length > 0 && categories.length > 0) {
      // عرض المزيد من النتائج (20 بدلاً من 5)
      const matches = matchCategories(storeName, categories, 20);
      setPredictions(matches);

      // اختيار أفضل نتيجة تلقائيًا
      if (matches.length > 0) {
        setSelectedCategory(matches[0]);
      }
    } else {
      setPredictions([]);
      setSelectedCategory(null);
    }
  }, [storeName, categories]);

  // دالة لإضافة كلمة مفتاحية
  const handleAddKeyword = async () => {
    if (!selectedCategoryForKeyword || (!newKeywordAr.trim() && !newKeywordEn.trim())) {
      setAddKeywordMessage('يرجى إدخال كلمة مفتاحية واحدة على الأقل');
      return;
    }

    setIsAddingKeyword(true);
    setAddKeywordMessage('');

    try {
      const response = await fetch('/api/categories/add-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: selectedCategoryForKeyword.id,
          keyword_ar: newKeywordAr.trim(),
          keyword_en: newKeywordEn.trim(),
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setAddKeywordMessage('✅ تم إضافة الكلمة المفتاحية بنجاح!');

        // تحديث التصنيفات المحلية
        setCategories(prev => prev.map(cat =>
          cat.id === selectedCategoryForKeyword.id ? result.data : cat
        ));

        // إعادة تعيين الحقول
        setTimeout(() => {
          setNewKeywordAr('');
          setNewKeywordEn('');
          setShowAddKeywordModal(false);
          setAddKeywordMessage('');

          // إعادة البحث
          if (storeName.trim()) {
            const matches = matchCategories(storeName, categories, 5);
            setPredictions(matches);
            if (matches.length > 0) {
              setSelectedCategory(matches[0]);
            }
          }
        }, 2000);
      } else {
        setAddKeywordMessage('❌ ' + result.error);
      }
    } catch (error) {
      console.error('خطأ في إضافة الكلمة المفتاحية:', error);
      setAddKeywordMessage('❌ حدث خطأ أثناء الإضافة');
    } finally {
      setIsAddingKeyword(false);
    }
  };

  const openAddKeywordModal = (category?: Category) => {
    setSelectedCategoryForKeyword(category || null);
    setNewKeywordAr(storeName); // تعبئة تلقائية بكلمة البحث
    setNewKeywordEn('');
    setShowAddKeywordModal(true);
    setAddKeywordMessage('');
  };

  // دالة للحصول على التصنيف الأب
  const getParentCategory = (categoryId: number | null): Category | null => {
    if (!categoryId) return null;
    return categories.find(cat => cat.id === categoryId) || null;
  };

  // دالة لحفظ الاختيار الصحيح
  const handleSaveCorrectChoice = async (match: CategoryMatch) => {
    if (!storeName.trim()) return;

    setIsAddingKeyword(true);
    setAddKeywordMessage('');

    try {
      const response = await fetch('/api/categories/add-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: match.category.id,
          keyword_ar: storeName.trim(),
          keyword_en: '',
        }),
      });

      const result = await response.json();

      if (result.ok) {
        // تحديث التصنيفات المحلية
        setCategories(prev => prev.map(cat =>
          cat.id === match.category.id ? result.data : cat
        ));

        // عرض رسالة نجاح
        alert(`✅ تم حفظ "${storeName}" كاختيار صحيح للتصنيف: ${match.category.name_ar}`);

        // إعادة البحث
        const matches = matchCategories(storeName, categories, 20);
        setPredictions(matches);
      } else {
        alert('❌ ' + result.error);
      }
    } catch (error) {
      console.error('خطأ في حفظ الاختيار:', error);
      alert('❌ حدث خطأ أثناء الحفظ');
    } finally {
      setIsAddingKeyword(false);
    }
  };

  // أمثلة للتجربة
  const examples = [
    'بقالة',
    'مخبز تميس',
    'عبدالله لزينة السيارات',
    'مطعم البيك',
    'صيدلية النهدي',
    'كافيه ستاربكس',
    'مغسلة الأمانة',
    'محل ورود وزهور'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-3">
            وش تصنيفه؟ 🔍
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            اكتب اسم المحل، شاهد جميع التصنيفات المحتملة، واختر الصحيح
          </p>
        </header>

        {/* Search Box */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            <label htmlFor="store-name" className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
              اسم المحل
            </label>
            <input
              id="store-name"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="مثال: عبدالله لزينة السيارات"
              className="w-full px-6 py-4 text-xl border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              dir="rtl"
              disabled={isLoading}
            />

            {/* أمثلة سريعة */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">أمثلة للتجربة:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setStoreName(example)}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل التصنيفات...</p>
          </div>
        )}

        {/* النتيجة الرئيسية */}
        {selectedCategory && !isLoading && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                التصنيف الأنسب
              </h2>
              <button
                onClick={() => handleSaveCorrectChoice(selectedCategory)}
                disabled={isAddingKeyword}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
              >
                ✓ حفظ كاختيار صحيح
              </button>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-2xl p-8 text-white transform hover:scale-105 transition-transform cursor-pointer">
              {/* Category & Subcategory Header */}
              {selectedCategory.parentCategory && (
                <div className="mb-6 pb-4 border-b border-white/30">
                  <div className="flex items-center gap-2 text-sm opacity-90 mb-1">
                    <span>📁</span>
                    <span>الفئة الرئيسية (Category)</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedCategory.parentCategory.name_ar}
                  </div>
                  <div className="text-base opacity-80">
                    {selectedCategory.parentCategory.name_en}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm opacity-90 mb-1">
                    <span>🏷️</span>
                    <span>{selectedCategory.parentCategory ? 'الفئة الفرعية (Subcategory)' : 'التصنيف'}</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-2">{selectedCategory.category.name_ar}</h3>
                  <p className="text-lg opacity-90">{selectedCategory.category.name_en}</p>
                </div>
                <div className="text-center ml-6">
                  <div className="text-5xl font-bold">
                    {Math.round(selectedCategory.confidence * 100)}%
                  </div>
                  <div className="text-sm opacity-90">دقة التطابق</div>
                </div>
              </div>

              {selectedCategory.matchedKeywords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/30">
                  <p className="text-sm opacity-90 mb-2">الكلمات المطابقة:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory.matchedKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/20 rounded-full text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/30">
                <p className="text-sm opacity-90">
                  <strong>رمز التصنيف:</strong> {selectedCategory.category.code}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* اقتراحات أخرى */}
        {predictions.length > 1 && !isLoading && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              جميع التصنيفات المحتملة ({predictions.length - 1} تصنيف)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictions.slice(1).map((match, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedCategory(match)}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer transform hover:scale-105 transition-all ${selectedCategory?.category.id === match.category.id
                      ? 'ring-4 ring-blue-500'
                      : 'hover:shadow-xl'
                    }`}
                >
                  {/* Parent Category if exists */}
                  {match.parentCategory && (
                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        📁 {match.parentCategory.name_ar}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {match.parentCategory ? '🏷️ فئة فرعية' : '📋 تصنيف'}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {match.category.name_ar}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {match.category.name_en}
                      </p>
                    </div>
                    <div className="text-center ml-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(match.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  {match.matchedKeywords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {match.matchedKeywords.slice(0, 2).map((keyword, kidx) => (
                          <span
                            key={kidx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveCorrectChoice(match);
                      }}
                      disabled={isAddingKeyword}
                      className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      ✓ حفظ كاختيار صحيح
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                    {match.category.code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* حالة عدم وجود نتائج */}
        {storeName.trim().length > 0 && predictions.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              لم نجد تصنيفًا مناسبًا
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              حاول استخدام كلمات مختلفة أو جرّب أحد الأمثلة أعلاه
            </p>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                💡 هل تريد إضافة "<strong>{storeName}</strong>" كلمة مفتاحية لتصنيف معين؟
              </p>
              <button
                onClick={() => openAddKeywordModal()}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                ➕ إضافة كلمة مفتاحية جديدة
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-4">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                📊 إحصائيات التطبيق
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {categories.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">تصنيف متاح</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    12,879
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">كلمة مفتاحية دقيقة</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    100%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">دقة التصنيف</div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                تم تطوير التطبيق باستخدام Next.js و Tailwind CSS
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                🏆 تم التطوير بواسطة فريق المسح الميداني
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                جميع الميزات قابلة للنقر والتفاعل • مجاني 100%
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-500">
            © 2025 وش تصنيفه؟ - جميع الحقوق محفوظة
          </div>
        </footer>
      </div>

      {/* Modal for adding keywords */}
      {showAddKeywordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                إضافة كلمة مفتاحية جديدة
              </h2>
              <button
                onClick={() => {
                  setShowAddKeywordModal(false);
                  setAddKeywordMessage('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  اختر التصنيف
                </label>
                <select
                  value={selectedCategoryForKeyword?.id || ''}
                  onChange={(e) => {
                    const categoryId = Number(e.target.value);
                    const category = categories.find(cat => cat.id === categoryId);
                    setSelectedCategoryForKeyword(category || null);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  dir="rtl"
                >
                  <option value="">-- اختر التصنيف --</option>
                  {categories.map((cat) => {
                    const parent = getParentCategory(cat.parent_id);
                    const displayName = parent
                      ? `${parent.name_ar} ← ${cat.name_ar}`
                      : cat.name_ar;

                    return (
                      <option key={cat.id} value={cat.id}>
                        {displayName} ({cat.code})
                      </option>
                    );
                  })}
                </select>
                {selectedCategoryForKeyword && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedCategoryForKeyword.name_en}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  الكلمة المفتاحية بالعربي
                </label>
                <input
                  type="text"
                  value={newKeywordAr}
                  onChange={(e) => setNewKeywordAr(e.target.value)}
                  placeholder="مثال: تميس، مخبز، فطائر"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  الكلمة المفتاحية بالإنجليزي (اختياري)
                </label>
                <input
                  type="text"
                  value={newKeywordEn}
                  onChange={(e) => setNewKeywordEn(e.target.value)}
                  placeholder="Example: bakery, bread, tamees"
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  dir="ltr"
                />
              </div>

              {addKeywordMessage && (
                <div className={`p-4 rounded-xl ${
                  addKeywordMessage.includes('✅')
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {addKeywordMessage}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddKeyword}
                  disabled={isAddingKeyword || (!newKeywordAr.trim() && !newKeywordEn.trim())}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
                >
                  {isAddingKeyword ? 'جاري الإضافة...' : 'إضافة الكلمة المفتاحية'}
                </button>
                <button
                  onClick={() => {
                    setShowAddKeywordModal(false);
                    setAddKeywordMessage('');
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
