# دليل نشر منصة العمودي

هذا الملف هو المرجع الرسمي للنشر من مستودع المشروع. لا تعتمد على
`.migration-backup/vercel.json`؛ فهذا ملف قديم داخل نسخة احتياطية وليس إعداد
النشر النشط.

## البنية المستخدمة

- الواجهة: `artifacts/alamoudi`
- خادم الواجهة البرمجية: `artifacts/api-server`
- ملف إعداد Vercel: `vercel.json`
- نقطة الواجهة البرمجية في Vercel: `api/index.mjs`
- مجلد ملفات الواجهة بعد البناء: `artifacts/alamoudi/dist/public`

## أمر البناء الرسمي

```bash
pnpm build
```

ينفذ الأمر:

1. فحص TypeScript.
2. بناء واجهة المعاينة.
3. بناء الواجهة الرئيسية.
4. تجميع خادم الواجهة البرمجية.

لا يغيّر أمر البناء مخطط قاعدة البيانات ولا يحتاج إلى اتصال بقاعدة البيانات.
تحديث المخطط خطوة منفصلة للتطوير أو الترحيل، ويحدث فقط عند تشغيل:

```bash
pnpm --filter @workspace/db run push
```

## إعدادات Vercel المثبتة في المستودع

يجب أن يقرأ Vercel هذه القيم من `vercel.json`:

```text
Build Command: pnpm build
Output Directory: artifacts/alamoudi/dist/public
Install Command: pnpm install --frozen-lockfile
```

لا تضبط مجلد الإخراج على `public`؛ هذا المجلد غير موجود في هذا المشروع.

## مسار الواجهة البرمجية

ملف `api/index.mjs` يعيد تصدير التطبيق المجمّع من:

```text
artifacts/api-server/dist/app.mjs
```

ويحوّل `vercel.json` طلبات `/api/*` إلى هذه الوظيفة، بينما تحافظ إعادة التوجيه
الأخرى على عمل صفحات React عند فتح مسار مباشر.

## متغيرات التشغيل

يحتاج تشغيل الواجهة البرمجية في بيئة الإنتاج إلى متغيرات الاتصال وقيم الحماية
الموجودة في إعدادات البيئة، وأهمها:

- `DATABASE_URL` أو `SUPABASE_PRODUCTION_DB_URL` أو رابط قاعدة بيانات مكافئ.
- `SESSION_SECRET`.
- `ADMIN_PASSWORD` إذا كانت قاعدة البيانات لا تحتوي حساب إدارة بعد.
- مفاتيح مزود الذكاء الاصطناعي فقط إذا كانت ميزاته مفعلة.

لا تضع هذه القيم في Git أو داخل `vercel.json` أو ملفات التوثيق.

### نشر Vercel منفصل عن Replit

إذا كان النشر يتم من GitHub إلى Vercel، فلن تنتقل قاعدة بيانات Replit
التطويرية أو مستخدموها إلى Vercel تلقائيًا. في هذا المشروع يستخدم تشغيل Vercel
اتصال Supabase عند توفر `SUPABASE_PRODUCTION_DB_URL`، أو عند توفر
`SUPABASE_URL` و`SUPABASE_DB_PASSWORD`، ثم يستخدم `SUPABASE_DATABASE_URL`
أو `DATABASE_URL` كبديل. يجب أن يشير أحد هذه الاتصالات
إلى قاعدة البيانات التي يستخدمها تطبيق Vercel، وأن تحتوي على الجداول المطلوبة،
ومنها `users` و`session`.

وجود المستخدم `admin` في قاعدة تطوير Replit لا يعني وجوده في قاعدة Vercel أو
Supabase.
أنشئ حساب الإدارة في قاعدة الإنتاج بالطريقة المعتمدة للمشروع، أو استخدم نشر
Replit إذا كان المطلوب هو استخدام قاعدة Replit المُدارة.

لا تعرض `DATABASE_URL` أو `SESSION_SECRET` في السجلات أو المحادثة. عند فشل
تسجيل الدخول، ابحث في سجل Vercel عن:

```text
Login request failed
Could not persist login session
```

## التحقق قبل النشر

نفذ محليًا قبل طلب النشر:

```bash
env -u DATABASE_URL -u PORT -u BASE_PATH pnpm build
pnpm --filter @workspace/alamoudi run typecheck
pnpm --filter @workspace/api-server run typecheck
```

نجاح البناء بدون `DATABASE_URL` يثبت أن مرحلة البناء لا تعتمد على قاعدة
البيانات. لا يعني ذلك أن التشغيل الإنتاجي يمكنه العمل بدون إعداد قاعدة البيانات.

بعد التحقق:

1. راجع `git diff`.
2. أنشئ Commit.
3. ارفع إلى `main`.
4. انتظر بدء النشر التلقائي من آخر Commit.
5. لا تبدأ نشرًا يدويًا أثناء تعديل الكود.
6. إذا ظهر خطأ، اقرأ آخر سجل بناء كامل قبل تغيير أي إعداد.

## أشهر الأخطاء

### عدم العثور على مجلد `public`

السبب: إعداد Vercel يستخدم قيمة `public` الافتراضية.

الحل: يجب استخدام:

```text
artifacts/alamoudi/dist/public
```

### تشغيل `schema-push` أثناء البناء

السبب: ربط أمر بناء خادم الواجهة البرمجية بتحديث مخطط قاعدة البيانات.

الحل: يجب أن يكون بناء الخادم:

```text
node ./build.mjs
```

ويظل `schema-push` داخل تشغيل التطوير أو خطوة ترحيل مستقلة.

### فرض `PORT` أو `BASE_PATH` أثناء بناء Vite

السبب: إيقاف إعداد Vite إذا لم توجد متغيرات التشغيل.

الحل: استخدام قيم افتراضية أثناء `vite build`، مع تمرير قيم Replit عند تشغيل
المعاينة.