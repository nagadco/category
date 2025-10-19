import json
import re

# Keyword expansion rules based on category names and patterns
def expand_english_keywords(name_en, existing_keywords):
    """Generate additional English keywords based on category name"""
    new_keywords = existing_keywords.copy() if existing_keywords else []

    # Common patterns and variations
    name_lower = name_en.lower()
    words = name_lower.split()

    # Add singular/plural variations
    if name_en not in new_keywords:
        new_keywords.append(name_en)

    # Add variations with common prefixes/suffixes
    base_variations = [
        name_lower,
        name_en.replace(' and ', ' & '),
        name_en.replace('-', ' '),
    ]

    # Category-specific expansions
    category_expansions = {
        'store': ['shop', 'retail', 'outlet', 'mart', 'market', 'vendor', 'retailer'],
        'restaurant': ['dining', 'eatery', 'cafe', 'bistro', 'food service', 'cuisine'],
        'service': ['services', 'provider', 'company', 'business'],
        'center': ['centre', 'facility', 'complex', 'hub'],
        'clinic': ['medical center', 'health center', 'medical clinic', 'healthcare'],
        'hospital': ['medical facility', 'health facility', 'medical center'],
        'pharmacy': ['drugstore', 'chemist', 'apothecary', 'medication store'],
        'gym': ['fitness center', 'health club', 'fitness club', 'workout center'],
        'salon': ['beauty salon', 'hair salon', 'beauty parlor', 'styling salon'],
        'school': ['educational institution', 'academy', 'learning center', 'institute'],
        'bank': ['banking', 'financial institution', 'finance'],
        'hotel': ['accommodation', 'lodging', 'inn', 'resort', 'hospitality'],
        'repair': ['fix', 'maintenance', 'service center', 'repair shop'],
        'rental': ['rent', 'lease', 'hire', 'renting'],
        'laundry': ['laundromat', 'dry cleaning', 'washing service', 'cleaning service'],
        'bakery': ['bakeshop', 'patisserie', 'bread shop', 'pastry shop'],
        'butcher': ['meat shop', 'meat market', 'butchery', 'meat store'],
        'coffee': ['cafe', 'coffee house', 'coffee bar', 'espresso bar'],
        'pet': ['animal', 'pets', 'pet care'],
        'car': ['auto', 'automotive', 'vehicle', 'automobile'],
        'beauty': ['cosmetics', 'makeup', 'beauty products', 'skincare'],
        'jewelry': ['jewellery', 'jeweler', 'gems', 'accessories'],
        'clothing': ['clothes', 'apparel', 'fashion', 'garments', 'wear'],
        'furniture': ['furnishings', 'home furniture', 'decor'],
        'electronics': ['electronic', 'gadgets', 'tech', 'technology'],
        'book': ['books', 'bookstore', 'bookshop', 'library'],
        'toy': ['toys', 'toy store', 'playthings', 'games'],
        'sports': ['sporting goods', 'athletic', 'fitness equipment'],
        'garden': ['gardening', 'nursery', 'plants', 'landscaping'],
        'hardware': ['tools', 'building supplies', 'construction'],
        'optical': ['eyewear', 'glasses', 'vision', 'optician'],
        'dental': ['dentistry', 'teeth', 'orthodontic', 'oral care'],
        'insurance': ['coverage', 'policy', 'insurer', 'protection'],
        'travel': ['tourism', 'tour', 'vacation', 'trip'],
        'massage': ['spa', 'therapy', 'wellness', 'relaxation'],
        'printing': ['print shop', 'copy center', 'printing service'],
        'photography': ['photo', 'studio', 'photographer', 'pictures'],
        'florist': ['flowers', 'flower shop', 'floral', 'bouquet'],
        'paint': ['painting', 'paint store', 'coatings', 'decorating'],
        'plumbing': ['plumber', 'pipes', 'plumbing service'],
        'electrical': ['electrician', 'electric', 'wiring', 'electrical service'],
        'construction': ['building', 'contractor', 'builder', 'construction company'],
        'cleaning': ['cleaners', 'cleaning service', 'janitorial', 'housekeeping'],
        'catering': ['caterer', 'food service', 'event catering', 'party service'],
        'courier': ['delivery', 'shipping', 'messenger', 'express'],
        'taxi': ['cab', 'transportation', 'ride', 'car service'],
        'parking': ['car park', 'parking lot', 'garage'],
        'warehouse': ['storage', 'depot', 'distribution center'],
    }

    # Add related terms
    for key, terms in category_expansions.items():
        if key in name_lower:
            for term in terms:
                if term not in [k.lower() for k in new_keywords]:
                    new_keywords.append(term)

    # Add variations
    for variation in base_variations:
        if variation and variation not in [k.lower() for k in new_keywords]:
            new_keywords.append(variation)

    # Add descriptive terms based on type
    if 'store' in name_lower or 'shop' in name_lower:
        descriptors = ['buy', 'sell', 'shopping', 'purchase', 'merchant']
        for desc in descriptors:
            combined = f"{desc} {name_lower.replace(' store', '').replace(' shop', '').strip()}"
            if combined not in [k.lower() for k in new_keywords] and len(new_keywords) < 15:
                new_keywords.append(combined)

    # Limit to reasonable number
    return new_keywords[:20]


def expand_arabic_keywords(name_ar, existing_keywords):
    """Generate additional Arabic keywords based on category name"""
    new_keywords = existing_keywords.copy() if existing_keywords else []

    # Add the original name if not present
    if name_ar not in new_keywords:
        new_keywords.append(name_ar)

    # Common Arabic variations and synonyms
    arabic_expansions = {
        'متجر': ['محل', 'دكان', 'مول', 'منفذ بيع', 'متاجر'],
        'مطعم': ['مطاعم', 'مأكولات', 'طعام', 'مقهى'],
        'خدمات': ['خدمة', 'مزود خدمة', 'مقدم خدمة'],
        'مركز': ['مراكز', 'منشأة', 'صالة'],
        'عيادة': ['عيادات', 'مركز طبي', 'مركز صحي'],
        'مستشفى': ['مستشفيات', 'مرفق طبي', 'منشأة صحية'],
        'صيدلية': ['صيدليات', 'دواء', 'أدوية'],
        'صالة رياضية': ['نادي رياضي', 'جيم', 'لياقة بدنية', 'فتنس'],
        'صالون': ['صالونات', 'تجميل', 'حلاقة', 'عناية'],
        'مدرسة': ['مدارس', 'تعليم', 'أكاديمية', 'معهد'],
        'بنك': ['بنوك', 'مصرف', 'مصارف', 'خدمات مصرفية'],
        'فندق': ['فنادق', 'إقامة', 'منتجع', 'نزل'],
        'إصلاح': ['تصليح', 'صيانة', 'ورشة'],
        'تأجير': ['إيجار', 'استئجار', 'كراء'],
        'مغسلة': ['غسيل', 'تنظيف جاف', 'مغاسل'],
        'مخبز': ['مخابز', 'معجنات', 'خبز', 'حلويات'],
        'جزارة': ['لحوم', 'قصاب', 'جزار'],
        'قهوة': ['كافيه', 'مقهى', 'قهوة عربية'],
        'حيوانات أليفة': ['حيوانات', 'بيطري', 'رعاية حيوانات'],
        'سيارة': ['سيارات', 'مركبة', 'مركبات', 'أوتو'],
        'تجميل': ['مستحضرات تجميل', 'عناية بالبشرة', 'مكياج'],
        'مجوهرات': ['ذهب', 'فضة', 'حلي', 'إكسسوارات'],
        'ملابس': ['أزياء', 'موضة', 'ألبسة', 'كسوة'],
        'أثاث': ['موبيليا', 'عفش', 'ديكور'],
        'إلكترونيات': ['إلكترونية', 'أجهزة', 'تقنية', 'تكنولوجيا'],
        'كتب': ['كتاب', 'مكتبة', 'قراءة'],
        'ألعاب': ['لعب', 'ألعاب أطفال', 'تسلية'],
        'رياضة': ['رياضية', 'معدات رياضية', 'لياقة'],
        'حديقة': ['نباتات', 'بستنة', 'مشتل'],
        'أدوات': ['عدد', 'معدات', 'بناء'],
        'نظارات': ['بصريات', 'عيون', 'رؤية'],
        'أسنان': ['طب أسنان', 'تقويم', 'عناية بالأسنان'],
        'تأمين': ['تأمينات', 'وثيقة', 'حماية'],
        'سفر': ['سياحة', 'رحلات', 'سفريات'],
        'تدليك': ['مساج', 'سبا', 'استرخاء', 'علاج'],
        'طباعة': ['طباعه', 'نسخ', 'مطبعة'],
        'تصوير': ['استوديو', 'مصور', 'صور'],
        'زهور': ['ورود', 'باقات', 'أزهار'],
        'دهانات': ['طلاء', 'ديكور', 'ألوان'],
        'سباكة': ['سباك', 'أنابيب', 'مواسير'],
        'كهرباء': ['كهربائي', 'كهربائية', 'أسلاك'],
        'بناء': ['مقاولات', 'إنشاءات', 'تشييد'],
        'تنظيف': ['نظافة', 'تعقيم', 'خدمات نظافة'],
        'تموين': ['طعام', 'حفلات', 'خدمات طعام'],
        'توصيل': ['شحن', 'نقل', 'ديليفري'],
        'تاكسي': ['أجرة', 'مواصلات', 'نقل'],
        'مواقف': ['موقف سيارات', 'باركنج', 'جراج'],
        'مستودع': ['تخزين', 'مخزن', 'توزيع'],
    }

    # Find and add related Arabic terms
    for key, terms in arabic_expansions.items():
        if key in name_ar:
            for term in terms:
                if term not in new_keywords:
                    new_keywords.append(term)

    # Limit to reasonable number
    return new_keywords[:20]


def expand_keywords_for_all_categories(input_file, output_file):
    """Read JSON, expand keywords, and write back"""

    print("Reading file...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Processing {len(data)} categories...")

    for i, category in enumerate(data):
        if i % 100 == 0:
            print(f"Processed {i}/{len(data)} categories...")

        # Expand English keywords
        if 'search_key_words_en' in category and 'name_en' in category:
            category['search_key_words_en'] = expand_english_keywords(
                category['name_en'],
                category['search_key_words_en']
            )

        # Expand Arabic keywords
        if 'search_key_words_ar' in category and 'name_ar' in category:
            category['search_key_words_ar'] = expand_arabic_keywords(
                category['name_ar'],
                category['search_key_words_ar']
            )

    print("Writing updated file...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f"Done! Updated {len(data)} categories.")
    print(f"\nSample updated entry:")
    if data:
        print(json.dumps(data[0], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    input_file = r'f:\category and subcategory\category and subcategory.md'
    output_file = r'f:\category and subcategory\category and subcategory.md'

    expand_keywords_for_all_categories(input_file, output_file)
