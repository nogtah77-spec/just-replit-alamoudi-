# معمارية التخزين الهجين (Supabase للبيانات + Cloudinary للصور) والحذف النظيف الشامل

## 1. السياق والمشكلة السابقة (Context & Previous Bottleneck)
- واجهت المنصة سابقاً مشكلة انتهاء الحصة الشهرية (Quota Exceeded) في حساب Supabase المجاني القديم بسبب استهلاك الباندويث ونقل البيانات (Egress) وحجم التخزين الناتج عن حفظ واستعراض صور العقارات المتعددة داخل قاعدة البيانات مباشرة.
- تسبب ذلك في تقييد خوادم Supabase للطلبات، مما أدى إلى حجب استرجاع العقارات وصورها وظهور الموقع كأنه ناقص البيانات.

## 2. القرارات المعمارية المعتمدة (Architectural Decisions)

### أ. الفصل المعماري التام (Separation of Concerns):
1. **قاعدة بيانات Supabase:**
   - مخصصة حصراً للنصوص، الأرقام، المواصفات، والحقول الهيكلية، بالإضافة إلى روابط الصور السحابية.
   - تم ربط المشروع الجديد النظيف:
     - URL: `https://inuouzvmujxjjzfxinvk.supabase.co`
     - الحساب المنظم: `saeed.2098@hotmail.com's Org`
     - تم تفعيل سياسات الأمان RLS الكاملة لجميع الجداول العشرة.

2. **سحابة Cloudinary للصور:**
   - نقل كافة ملفات وسائط وصور العقارات إلى شبكة التوصيل السريع (CDN) عبر خدمة Cloudinary.
   - الإعدادات المعتمدة:
     - البريد الإلكتروني المسجل: `alamoudi.real.estate55@gmail.com`
     - Cloud Name: `vis04evc`
     - Upload Preset: `h2ft0erz` (Unsigned)
   - ميزة التحويل والضغط التلقائي لأحدث صيغ الويب (WebP / AVIF) لتوفير أقصى سرعة تصفح وأقل استهلاك للباندويث.

### ب. هيكل المجلدات المنظم (Organized Folder Hierarchy):
- تنظيم رفع الصور في مجلدات متخصصة ومعزولة لمنع العشوائية والخلط:
  1. **صور العقارات:** `alamoudi_properties/{regionId}/{propertyCode}` (مثال: `alamoudi_properties/shorouk/S93/`).
  2. **أغلفة المناطق:** `alamoudi_regions/{regionName}` (مثال: `alamoudi_regions/madinaty/`).
  3. **خلفيات وهوية المنصة:** `alamoudi_branding/{home_hero | home_bg | login_bg}`.
  4. **معرض أعمال التشطيبات:** `alamoudi_finishing`.
- يتم حفظ الروابط السحابية النقية (HTTPS CDN URLs) فقط في Supabase، مما يحافظ على خفة قاعدة البيانات وسرعة استجابتها دون استهلاك أي كوتا للباندويث.
- عند استبدال أو حذف أي صورة، تُحدث السجلات سحابياً وفورياً وتُزال الإشارات القديمة من Supabase والكاش المحلي.

### ج. دورة الحذف وإعادة الضبط الشاملة (Clean Delete & Platform Reset):
1. **حذف العقار الفردي أو المجمّع:**
   - حذف السجل نهائياً من Supabase، وحذف أي مرجع له من الكاش وقاعدة بيانات المتصفح (IndexedDB).
   - تطهير الذاكرة ومنع إعادة إحيائه من السجلات المؤقتة.
2. **إعادة ضبط المنصة (Platform Reset):**
   - تفريغ جدول العقارات السحابي في Supabase بالكامل.
   - تصفير IndexedDB والكاش المحلي ووضع راية `alm_platform_reset_flag = "true"`.
   - منع إعادة زرع العقارات الافتراضية القديمة (SEED_PROPERTIES) تلقائياً بعد التصفير.
   - الإبقاء على حسابات المشرفين والمدير والمدن الأساسية (بما فيها كمبوند وصال) لضمان استقرار النظام.

## 3. الملفات المتأثرة (Impacted Files)
- `artifacts/alamoudi/src/lib/cloudinaryService.ts`: خدمة رفع وإدارة صور Cloudinary ودوال التوجيه للمجلدات (`alamoudi_properties`, `alamoudi_regions`, `alamoudi_branding`, `alamoudi_finishing`).
- `artifacts/alamoudi/src/lib/supabaseClient.ts`: بيانات ربط مشروع Supabase الجديد.
- `artifacts/alamoudi/src/context/DataContext.tsx`: إدارة المزامنة، الدمج، الحذف النظيف، ودالة `resetAllProperties`.
- `artifacts/alamoudi/src/pages/admin/PropertyForm.tsx`: رفع الصور التلقائي لسحابة Cloudinary وتنظيم المجلدات.
- `artifacts/alamoudi/src/pages/admin/Regions.tsx`: تحويل أغلفة المناطق لرفع Cloudinary وتخزين الرابط فقط في Supabase.
- `artifacts/alamoudi/src/pages/admin/Settings.tsx`: رفع صور الهيرو وخلفيات الدخول إلى Cloudinary.
- `artifacts/alamoudi/src/components/admin/HomeBackgroundManager.tsx`: رفع خلفيات الصفحة الرئيسية إلى Cloudinary.
- `artifacts/alamoudi/src/pages/admin/FinishingGallery.tsx`: رفع صور معرض أعمال التشطيبات المجمعة مباشرة إلى Cloudinary.
- `artifacts/alamoudi/src/pages/admin/Backup.tsx`: تفعيل إعادة الضبط والتنظيف الشامل.
