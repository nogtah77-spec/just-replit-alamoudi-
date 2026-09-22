-- ==============================================================================
-- 🏢 سكربت تهيئة قاعدة بيانات «العمودي للتسويق العقاري» على Supabase
-- قم بنسخ ولصق هذا الكود بالكامل في: Supabase -> SQL Editor -> اضغط Run
-- ==============================================================================

-- 1. جدول المناطق والمدن (Regions)
CREATE TABLE IF NOT EXISTS public.regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    hero_image TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول أنواع العقارات (Property Types)
CREATE TABLE IF NOT EXISTS public.property_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول العقارات الرئيسي (Properties)
CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price BIGINT DEFAULT 0,
    area NUMERIC DEFAULT 0,
    beds INT DEFAULT 0,
    baths INT DEFAULT 0,
    floors INT DEFAULT 1,
    floor INT DEFAULT 0,
    finishing TEXT DEFAULT '',
    view TEXT DEFAULT '',
    type_id TEXT REFERENCES public.property_types(id) ON DELETE SET NULL,
    region_id TEXT REFERENCES public.regions(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'residential',
    listing_type TEXT DEFAULT 'sale',
    status TEXT DEFAULT 'active',
    featured BOOLEAN DEFAULT false,
    agent_type TEXT DEFAULT 'direct',
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    video_url TEXT DEFAULT '',
    external_url TEXT DEFAULT '',
    maps_url TEXT DEFAULT '',
    unit_type TEXT DEFAULT '',
    sub_area TEXT DEFAULT '',
    layout TEXT DEFAULT '',
    floor_text TEXT DEFAULT '',
    master TEXT DEFAULT '',
    location TEXT DEFAULT '',
    additional_features TEXT DEFAULT '',
    elevator TEXT DEFAULT '',
    parking TEXT DEFAULT '',
    source TEXT DEFAULT '',
    source_phones TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_staff_id TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول الموظفين والمستخدمين (Users / Staff)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT '',
    role TEXT DEFAULT 'agent',
    active BOOLEAN DEFAULT true,
    can_clear_activity_logs BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ضمان وجود عمود كلمة المرور في حال كان الجدول منشأ مسبقاً
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';

-- 5. جدول استفسارات العملاء (Inquiries)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    property_code TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. جدول طلبات العملاء العقارية (Customer Property Requests)
CREATE TABLE IF NOT EXISTS public.customer_property_requests (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    request_type TEXT DEFAULT 'buy',
    property_category TEXT DEFAULT 'residential',
    region_id TEXT,
    budget_min BIGINT DEFAULT 0,
    budget_max BIGINT DEFAULT 0,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    assigned_staff_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. جدول طلبات التشطيبات (Finishing Requests)
CREATE TABLE IF NOT EXISTS public.finishing_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    property_area NUMERIC DEFAULT 0,
    city TEXT DEFAULT '',
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. جدول العقود والمعاملات (Contracts)
CREATE TABLE IF NOT EXISTS public.contracts (
    id TEXT PRIMARY KEY,
    contract_number TEXT UNIQUE NOT NULL,
    property_id TEXT,
    property_code TEXT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    contract_type TEXT DEFAULT 'sale',
    total_amount BIGINT DEFAULT 0,
    deposit_amount BIGINT DEFAULT 0,
    installments_count INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. جدول عملاء المستشار الذكي (AI Leads)
CREATE TABLE IF NOT EXISTS public.ai_leads (
    id TEXT PRIMARY KEY,
    client_name TEXT,
    client_phone TEXT,
    conversation_summary TEXT DEFAULT '',
    interested_properties TEXT[] DEFAULT ARRAY[]::TEXT[],
    sentiment TEXT DEFAULT 'neutral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. جدول إعدادات المنصة (Site Settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- تفعيل سياسات الوصول (Row Level Security - RLS) للقراءة والكتابة
-- ==============================================================================
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finishing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- سياسة السماح بالوصول الكامل لـ anon (قراءة وكتابة آمنة)
CREATE POLICY "Allow public read-write for regions" ON public.regions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for property_types" ON public.property_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for customer_requests" ON public.customer_property_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for finishing_requests" ON public.finishing_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for ai_leads" ON public.ai_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
