---
name: عزل الخدمات الخارجية
description: حدود الخدمات المسموح لهذه النسخة بالاتصال بها
---

هذه النسخة معزولة لتستخدم فقط مستودع GitHub `nogtah77-spec/just-replit-alamoudi-` ومشروع Supabase ذي المرجع `myyymjnyavemwhypzhpz`.

**Why:** طلب المستخدم قطع الصلة تمامًا بأي مشروع Supabase سابق وبـCloudinary وVercel، وعدم لمس أي مستودع GitHub آخر.

**How to apply:** لا تُضف fallbacks أو روابط أو مفاتيح لهذه الخدمات القديمة. استخدم Supabase المحدد للبيانات والتخزين، واقصر عمليات GitHub على المستودع المحدد.