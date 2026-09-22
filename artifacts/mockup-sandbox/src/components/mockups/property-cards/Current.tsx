import "./_group.css";
import { Bath, Bed, Camera, Copy, ExternalLink, Heart, Phone, Play, Scale, Share2, Square } from "lucide-react";

const image = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85";

function ActionButton({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "blue" }) {
  const toneClass = tone === "green"
    ? "border-green-200 text-green-700"
    : tone === "blue"
      ? "border-blue-200 text-blue-700"
      : "border-slate-200 text-slate-600";
  return <button className={`flex h-8 items-center justify-center gap-1 rounded-md border bg-white px-2 text-[11px] font-semibold ${toneClass}`}>{children}</button>;
}

export function Current() {
  return (
    <main className="property-card-preview flex items-center justify-center p-8">
      <article className="w-full max-w-[410px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(16,32,45,0.1)]">
        <div className="relative h-[218px] overflow-hidden">
          <img src={image} alt="فيلا حديثة" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute right-3 top-3 flex gap-1.5">
            <span className="rounded-sm bg-black/60 px-2 py-1 text-[11px] font-bold text-amber-100 backdrop-blur">فيلا</span>
            <span className="rounded-sm bg-[#b4986b] px-2 py-1 text-[11px] font-bold text-white">للبيع</span>
          </div>
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            <span className="rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">▶ فيديو</span>
            <span className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">مميز</span>
            <span className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">جديد</span>
          </div>
          <span className="absolute bottom-3 right-3 rounded bg-black/45 px-2 py-1 text-xs text-white backdrop-blur">الشروق</span>
          <div className="absolute bottom-3 left-3 flex gap-1.5 text-xs text-white">
            <span className="flex items-center gap-1 rounded bg-black/45 px-2 py-1 backdrop-blur"><Camera className="h-3 w-3" /> 12</span>
            <span className="rounded bg-black/45 px-2 py-1 backdrop-blur"><ExternalLink className="h-3 w-3" /></span>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-widest text-[#10202d]">ALM-2048</span>
            <span className="text-[10px] font-bold tracking-widest text-slate-400">CODE</span>
          </div>
          <div className="mb-4 flex items-baseline gap-2 font-bold text-[#a17f48]">
            <span className="text-xl">4,850,000</span>
            <span className="text-xs tracking-widest text-slate-400">EGP</span>
          </div>
          <div className="mb-4 flex items-center gap-4 border-b border-slate-200 pb-4 text-[13px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5" /> 4 غرف</span>
            <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" /> 3 حمام</span>
            <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5" /> 320 م²</span>
          </div>
          <div className="mb-4 flex gap-1.5 text-xs">
            <span className="rounded-sm bg-[#b4986b]/10 px-2 py-1 font-semibold text-[#9b7844]">تشطيب فاخر</span>
            <span className="rounded-sm bg-slate-100 px-2 py-1 text-slate-500">واجهة حديقة</span>
          </div>
          <div className="mb-2 flex gap-1.5">
            <button className="h-8 flex-1 rounded-md bg-[#10202d] text-xs font-semibold text-white">التفاصيل</button>
            <ActionButton><Share2 className="h-3.5 w-3.5" /></ActionButton>
            <ActionButton><Heart className="h-3.5 w-3.5" /></ActionButton>
            <ActionButton><Scale className="h-3.5 w-3.5" /></ActionButton>
          </div>
          <div className="flex gap-1.5">
            <ActionButton tone="green"><span>واتساب</span></ActionButton>
            <ActionButton tone="blue"><Phone className="h-3 w-3" /><span>اتصال</span></ActionButton>
            <ActionButton><Copy className="h-3 w-3" /></ActionButton>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">♪ Alamoudi Properties</div>
        </div>
      </article>
    </main>
  );
}