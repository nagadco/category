# 🚀 دليل النشر السريع على Vercel

## الطريقة الأولى: استخدام Vercel Token

### استخدام Token الخاص بك

```bash
# 1. تثبيت Vercel CLI
npm install -g vercel

# 2. تسجيل الدخول باستخدام Token
vercel login --token M4fINRLz0V3rmyulryhSUb32

# 3. النشر
cd "f:\category and subcategory\wash-tasnifoh"
vercel --prod --token M4fINRLz0V3rmyulryhSUb32
```

---

## الطريقة الثانية: من خلال لوحة تحكم Vercel (الأسهل)

### الخطوات:

1. **اذهب إلى**: https://vercel.com/new

2. **اسحب مجلد المشروع** أو اختره من جهازك:
   ```
   f:\category and subcategory\wash-tasnifoh
   ```

3. **اضغط Deploy**

**انتهى!** سيكون التطبيق متاحًا على رابط مثل:
```
https://wash-tasnifoh-xxxxx.vercel.app
```

---

## الطريقة الثالثة: النشر عبر GitHub (موصى بها)

### 1. رفع المشروع على GitHub

```bash
# إنشاء repository جديد على GitHub
# ثم:

cd "f:\category and subcategory\wash-tasnifoh"
git remote add origin https://github.com/YOUR_USERNAME/wash-tasnifoh.git
git branch -M main
git push -u origin main
```

### 2. ربط GitHub بـ Vercel

1. اذهب إلى: https://vercel.com/new
2. اختر **Import Git Repository**
3. اختر repository الخاص بك
4. اضغط **Deploy**

**الميزة**: أي تحديثات على GitHub ستنشر تلقائيًا!

---

## 🔧 إعدادات النشر (اختيارية)

إذا طُلب منك إعدادات:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## ✅ التحقق من النشر

بعد النشر، جرّب:

1. افتح الرابط الذي أعطاه لك Vercel
2. جرّب كتابة: "عبدالله لزينة السيارات"
3. تأكد أن التصنيف يظهر بشكل صحيح

---

## 🛠️ استكشاف الأخطاء

### خطأ: categories.json not found

**الحل**: تأكد من نقل ملف `data/categories.json` إلى مجلد `public/data/`:

```bash
mkdir -p public/data
cp data/categories.json public/data/
```

ثم عدّل في `app/page.tsx`:
```typescript
const response = await fetch('/data/categories.json');
```

---

## 📊 معلومات مهمة

- ✅ التطبيق **frontend فقط** - لا يحتاج database
- ✅ الحجم: حوالي **500KB** (مع البيانات)
- ✅ الأداء: **سريع جدًا** (كل شيء يعمل على المتصفح)
- ✅ التكلفة: **مجاني 100%** على Vercel

---

**هل لديك أي مشاكل؟**

تواصل معي أو راجع: https://vercel.com/docs
