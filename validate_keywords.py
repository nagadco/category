import json
import re

def normalize_arabic(text):
    """تنظيف وتوحيد النص العربي"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[\u064B-\u065F]', '', text)  # حذف التشكيل
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ة', 'ه')
    text = text.replace('ى', 'ي')
    return text.strip()

def is_keyword_relevant(keyword, category_name, all_words_in_name):
    """التحقق من صلة الكلمة المفتاحية بالتصنيف"""
    keyword_norm = normalize_arabic(keyword)
    name_norm = normalize_arabic(category_name)

    # إذا كانت الكلمة موجودة في الاسم
    if keyword_norm in name_norm or name_norm in keyword_norm:
        return True

    # إذا كانت أي كلمة من الاسم موجودة في الكلمة المفتاحية
    for word in all_words_in_name:
        word_norm = normalize_arabic(word)
        if len(word_norm) > 2:  # تجاهل الكلمات القصيرة جداً
            if word_norm in keyword_norm or keyword_norm in word_norm:
                return True

    return False

def get_category_words(category_name):
    """استخراج الكلمات من اسم التصنيف"""
    # كلمات شائعة نتجاهلها
    stop_words = ['و', 'في', 'من', 'إلى', 'على', 'عن', 'أو', 'ل', 'لل', 'ال', 'با', 'ب', 'the', 'and', 'or', 'of', 'for']

    words = re.split(r'[\s،,\-/]+', category_name)
    return [w for w in words if len(w) > 1 and normalize_arabic(w) not in stop_words]

def validate_and_clean_keywords(input_file, output_file):
    """التحقق من الكلمات المفتاحية وإزالة غير المرتبطة"""

    print("📖 قراءة الملف...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"✅ تم تحميل {len(data)} تصنيف\n")

    total_removed_ar = 0
    total_removed_en = 0
    total_kept_ar = 0
    total_kept_en = 0

    issues = []

    print("🔍 التحقق من الكلمات المفتاحية...\n")

    for i, category in enumerate(data):
        if i % 100 == 0:
            print(f"   معالجة {i}/{len(data)}...")

        name_ar = category.get('name_ar', '')
        name_en = category.get('name_en', '')

        # استخراج كلمات الاسم
        words_ar = get_category_words(name_ar)
        words_en = get_category_words(name_en)

        # التحقق من الكلمات العربية
        if category.get('search_key_words_ar'):
            original_ar = category['search_key_words_ar']

            # الاحتفاظ بالكلمات المفتاحية ذات الصلة فقط
            valid_ar = []
            invalid_ar = []

            for kw in original_ar:
                if is_keyword_relevant(kw, name_ar, words_ar):
                    valid_ar.append(kw)
                else:
                    invalid_ar.append(kw)

            # تحديث القائمة
            category['search_key_words_ar'] = valid_ar

            total_kept_ar += len(valid_ar)
            total_removed_ar += len(invalid_ar)

            # تسجيل المشاكل إذا تم حذف الكثير
            if invalid_ar and len(invalid_ar) > len(original_ar) * 0.5:
                issues.append({
                    'id': category.get('id'),
                    'name_ar': name_ar,
                    'removed': invalid_ar[:5],  # أول 5 كلمات محذوفة
                    'kept': valid_ar[:5]
                })

        # التحقق من الكلمات الإنجليزية
        if category.get('search_key_words_en'):
            original_en = category['search_key_words_en']

            valid_en = []
            invalid_en = []

            for kw in original_en:
                # للإنجليزية نتساهل أكثر
                kw_lower = kw.lower()
                name_en_lower = name_en.lower()

                # تحقق بسيط
                if any(word.lower() in kw_lower or kw_lower in word.lower()
                       for word in words_en if len(word) > 2):
                    valid_en.append(kw)
                elif kw_lower in name_en_lower or name_en_lower in kw_lower:
                    valid_en.append(kw)
                else:
                    invalid_en.append(kw)

            category['search_key_words_en'] = valid_en

            total_kept_en += len(valid_en)
            total_removed_en += len(invalid_en)

    print(f"\n📊 نتائج التحقق:")
    print(f"   كلمات عربية:")
    print(f"     - محفوظة: {total_kept_ar}")
    print(f"     - محذوفة: {total_removed_ar}")
    print(f"   كلمات إنجليزية:")
    print(f"     - محفوظة: {total_kept_en}")
    print(f"     - محذوفة: {total_removed_en}\n")

    # عرض بعض الحالات المشبوهة
    if issues:
        print(f"⚠️  تنبيه: وجدت {len(issues)} تصنيفات تم حذف الكثير من كلماتها\n")
        print("أول 5 حالات:")
        for issue in issues[:5]:
            print(f"\n   ID: {issue['id']} - {issue['name_ar']}")
            print(f"   محذوفة: {', '.join(issue['removed'])}")
            print(f"   محفوظة: {', '.join(issue['kept']) if issue['kept'] else 'لا توجد'}")

    # حفظ الملف النظيف
    print(f"\n💾 حفظ الملف المنظف...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ تم! حُفظ في: {output_file}\n")

    # عرض عينات
    print("📋 عينات من النتائج النهائية:\n")
    for i in [0, 100, 200]:
        if i < len(data):
            cat = data[i]
            print(f"   {cat['name_ar']}")
            print(f"   - عربي ({len(cat.get('search_key_words_ar', []))}): {', '.join(cat.get('search_key_words_ar', [])[:3])}...")
            print()

if __name__ == '__main__':
    input_file = r'f:\category and subcategory\categories_complete.json'
    output_file = r'f:\category and subcategory\categories_validated.json'

    validate_and_clean_keywords(input_file, output_file)

    print("=" * 70)
    print("🎉 اكتمل التحقق والتنظيف بنجاح!")
    print("=" * 70)
