---
name: Vercel deployment protection
description: Deployment URLs may be protected by Vercel SSO, which prevents direct unauthenticated API verification.
---

روابط Vercel المؤقتة أو روابط المعاينة قد تعيد تحويلًا إلى Vercel SSO قبل وصول الطلب إلى دالة التطبيق، حتى عندما يكون البناء والـDeployment في حالة `READY`.

**Why:** اختبار رابط محمي يعرض صفحة تسجيل دخول Vercel ولا يثبت أن API فشل؛ يجب فصل هذا عن أخطاء التطبيق مثل `503` أو أخطاء PostgreSQL.

**How to apply:** افحص حالة Deployment وسجلاته أولًا، ثم اختبر نطاقًا عامًا غير محمي أو استخدم آلية وصول مصرح بها. لا تعتبر `302` إلى SSO دليلًا على فشل التطبيق.