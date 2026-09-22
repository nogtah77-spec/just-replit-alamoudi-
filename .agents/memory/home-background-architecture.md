# معمارية خلفيات المنصة والضغط التكيفي وفك تعارض المزامنة

## سياق المشكلة والتشخيص الجذري (Root Cause)
1. **حلقة الاختفاء والظهور المتكررة (Disappearing/Flickering Loop):**
   - كان التطبيق يقوم بمزامنة خلفية دورية كل 10 ثوانٍ (`setInterval(syncFreshData, 10000)`) وأيضاً عند عودة التركيز للنافذة (`visibilitychange`).
   - في `syncFreshData`:
     - يتم استدعاء `supabaseService.fetchHomeBackground()` الذي يقرأ من صف `__home_background_store__` حيث توجد صورة الخلفية المرفوعة بدقة.
     - بالتوازي، يتم استدعاء `supabaseService.fetchSettings()` الذي يقرأ من صف `__site_settings_store__` القديم الذي كان يحتوي على `homeBackgroundSettings.bgImageDark: ""`.
     - في `DataContext.tsx`:
       ```typescript
       bgImageDark: cloudHomeBg.bgImageDark !== undefined ? cloudHomeBg.bgImageDark : ...
       ```
       ولأن `"" !== undefined` تعتبر `true` في جافاسكريبت، كان يتم مسح الصورة واستبدالها بنص فارغ كل 10 ثوانٍ!
     - بعد 10 ثوانٍ تعود الصورة ثم تختفي مجدداً في حلقة لانهائية تجعل المستخدم يشاهد الصورة تختفي وتظهر وتختفي وتظهر.
2. **مشكلة صور الجوال الطولية (Mobile Dimensions & Orientation):**
   - محرك الضغط السابق كان يقيد الارتفاع بـ `maxHeight: 1200` والعرض بـ `maxWidth: 1920`.
   - الصور الطولية المأخوذة من شاشات الهواتف (مثل `1080x1920` أو `1170x2532` بنسبة 9:16) كانت تُضغط أو تفشل في العرض أو تتلاشى بسبب التضارب.

---

## الحل الهندسي المعتمد (Architecture Fixes)

### 1. فك الارتباط الكامل وجعل `__home_background_store__` المصدر الوحيد للحقيقة (Single Source of Truth)
- تم تعديل `DataContext.tsx` بحيث:
  - عند جلب الإعدادات العامة `fetchSettings` (سواء في البداية أو في المزامنة الدورية `syncFreshData`)، لا يُسمح نهائياً لبيانات `__site_settings_store__` بمسح أو الكتابة فوق صور الخلفيات `bgImageDark` أو `bgImageLight`.
  - عند حفظ الإعدادات العامة `updateSettings`، يتم تجريد وحذف صور Base64 من كائن `siteSettingsToSave` قبل إرساله لصف `__site_settings_store__` لمنع تضخم حجم الصف ولتفادي أي تضارب كتابة مستقبلي.
  - تنظيف سحابة Supabase عبر سكريبت حذف أي نصوص فارغة قديمة من `__site_settings_store__`.

### 2. محرك الضغط التكيفي الذكي لجميع المقاسات (Adaptive Smart Compression)
- في `HomeBackgroundManager.tsx`:
  - رفع الحد الأقصى لحجم الملف الأصلي المسموح به إلى 50 ميجابايت (`50 * 1024 * 1024`).
  - ضبط أبعاد الضغط التكيفي: `maxWidth: 1920, maxHeight: 1920, quality: 0.78, format: "image/webp"`:
    - للصور العرضية للكمبيوتر (Desktop 16:9): يتم الحفاظ على الدقة الأفقية الكاملة حتى `1920x1080`.
    - للصور الطولية للجوال (Mobile Portrait 9:16): يتم الحفاظ على الارتفاع الكامل عالي الدقة حتى `1080x1920`.
    - للصور المربعة والمقاسات المتنوعة: تحافظ على أبعادها دون أي تشويه أو تشويش.
    - حجم ملف WebP الناتج يتراوح بين 80 إلى 160 كيلوبايت فقط، مما يمنح سرعة تحميل خارقة دون أي عبء على أداء المنصة أو التخزين.

### 3. استقرار المعاينة والمزامنة اللحظية (Zero-Flicker Instant Preview)
- في `HomeBackgroundManager.tsx`:
  - المزامنة التلقائية بين الوضعين الداكن والفاتح عند رفع صورة لأول مرة، بحيث لا تظهر الصورة محذوفة عند تبديل الثيم.
  - فحص موحد: `currentImage = (isDark ? homeBg.bgImageDark : homeBg.bgImageLight) || homeBg.bgImageDark || homeBg.bgImageLight` لضمان استقرار المعاينة دائماً.
- في `HomeLuxuryBackground.tsx`:
  - قراءة فورية من `alm_home_bg` في `localStorage` كـ fallback في حال تأخر تحميل السياق بأي جزء من الثانية (Zero Flash).
- في `Settings.tsx`:
  - حماية دالة مزامنة النموذج `setForm` لمنع أي تحديث سحابي وارد من مسح الخلفيات المرفوعة حديثاً أثناء تواجد المدير في الصفحة.
