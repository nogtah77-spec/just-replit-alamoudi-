# معمارية حقول التواصل في لوحة التحكم وحل مشكلة المسح التلقائي وتحديث الـ Service Worker

## 1. المشكلة التي ظهرت
عند الدخول إلى تبويب «التواصل» في إعدادات المنصة (`/admin/settings`):
- كان المستخدم عندما يكتب رقماً في خانة رقم الهاتف الأول أو الثاني أو الواتساب أو الإيميل، يُمسح ما كتبه بعد ثانيتين أو أكثر.
- كان المستخدم يجد صعوبة في بقاء ما يكتبه ثابتاً، وكذلك الرغبة في إمكانية حذف الرقم أو تعديله في أي وقت وحفظه بشكل دائم ومستمر.

---

## 2. التحليل الجذري الدقيق (Deep Root Cause Analysis)
1. **استبدال النموذج دورياً عبر `useEffect([settings])`:**
   - كان هناك مراقب تحديث `useEffect` في `Settings.tsx` يستمع لتغيرات `settings`.
   - عند اكتمال استدعاء السحابة الأولي (`supabaseService.fetchSettings()`) بعد 1.5 إلى 2.5 ثانية من تحميل الصفحة، وكذلك مع كل دورة فحص دوري كل 10 ثوانٍ، كان يتم تشغيل `setForm` وإعادة كتابة حالة النموذج بالبيانات السحابية، مما يمسح ما كتبه المستخدم فوراً.
   - حتى مع حماية التركيز السابقة، فإن التنقل بين الحقول، أو بطء استجابة بعض المتصفحات لحالة `activeElement` كان يسمح للـ polling بمسح المدخلات.
2. **عزل غير كامل لمسار تيك توك في `App.tsx`:**
   - كان مسار `/admin/tiktok` يمرر دالة مجهولة جديدة `component={() => <Settings initialTab="tiktok" />}` في كل إعادة تصيير، مما يؤدي إلى Unmount كامل للمكوّن وتصفير حالته في الذاكرة.
3. **استرجاع النسخة القديمة من كاش Service Worker v14:**
   - ملف `public/sw.js` في استراتيجية الملاحة (`request.mode === "navigate"`) كان يعتمد أسلوب `cachedIndex || networkFetch`، مما يرجع ملف `index.html` القديم المحفوظ في كاش `alamoudi-static-v14` للمتصفح دون انتظار الشبكة، فكان المستخدم يشغّل حزم جافاسكريبت قديمة من الكاش.

---

## 3. الحل النهائي الشامل والمنفذ

### أ. فك ارتباط النموذج عن المزامنة الدورية بالكامل في `Settings.tsx`
- تحويل مزامنة الإعدادات إلى عملية **أولية لمرة واحدة فقط (`hasInitializedSettingsRef`)**:
  ```tsx
  const hasInitializedSettingsRef = useRef(false);
  const isFormDirtyRef = useRef(false);

  useEffect(() => {
    if (hasInitializedSettingsRef.current || isFormDirtyRef.current) return;
    if (settings && Object.keys(settings).length > 0) {
      hasInitializedSettingsRef.current = true;
      setForm((prev) => {
        if (isFormDirtyRef.current) return prev;
        return {
          ...settings,
          phone1: prev.phone1 || sanitizeDummyContact(settings.phone1),
          phone2: prev.phone2 || sanitizeDummyContact(settings.phone2),
          whatsapp: prev.whatsapp || sanitizeDummyContact(settings.whatsapp),
          email: prev.email || settings.email || "",
          ...
        };
      });
    }
  }, [settings]);
  ```
- **النتيجة الحتمية:** بعد المرة الأولى لتحميل الصفحة، يتوقف الـ `useEffect` نهائياً وبنسبة 100%!
- المزامنة الدورية التي تعمل كل 10 ثوانٍ في الخلفية لن تلمس النموذج `form` إطلاقاً، مما يمنح المستخدم أماناً مطلقاً للكتابة والتعديل والحذف دون أي مسح تلقائي.

### ب. استقرار مكوّن الإعدادات في `App.tsx`
- تعريف مكوّن ثابت `AdminTiktokSettingsPage` بدلاً من الدالة المجهولة المضمنة، لمنع React من تفكيك المكوّن وإعادة بنائه (Unmount/Remount cycle).

### ج. ترقية Service Worker إلى v15 واعتماد Network-First للملاحة
- ترقية الكاش من `v14` إلى `alamoudi-static-v15`.
- تحويل طلبات الملاحة للصفحات (`request.mode === "navigate"`) إلى **Network-First**:
  - يتم طلب أحدث نسخة حية من `index.html` مباشرة من الشبكة فوراً عند توفر الإنترنت، مع التخزين الاحتياطي للأوفلاين.
  - إرسال أمر التفعيل الفوري `skipWaiting` ومسح كافة كاشات `v14` القديمة فور تنصيب العامل الجديد.

### د. دعم كامل لحذف الأرقام وتعديلها وحفظها الدائم
- عند قيام المستخدم بحذف أي رقم ليصبح الحقل فارغاً، أو تغيير الرقم إلى رقم جديد، والضغط على «حفظ التواصل»:
  - يتم إرسال البيانات المحدثة أو الفارغة إلى Supabase وتحديث `localStorage`.
  - معالجة الدمج في `DataContext.tsx` تم تحسينها باستخدام `!== undefined` بدلاً من `||` لضمان عدم استعادة الأرقام المحذوفة تلقائياً.
  - تنعكس التغييرات فوراً في جميع صفحات وواجهات المنصة.
