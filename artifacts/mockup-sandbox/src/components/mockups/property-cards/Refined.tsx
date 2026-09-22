import "./_group.css";
import { Bath, Bed, Camera, Copy, ExternalLink, Heart, Phone, Play, Scale, Share2, Square, MapPin } from "lucide-react";

const image = "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85";

function IconButton({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`grid h-9 w-9 place-items-center rounded-lg border text-slate-600 shadow-sm transition ${active ? "border-rose-200 bg-rose-50 text-rose-500" : "border-white/70 bg-white/90 backdrop-blur hover:border-[#b4986b] hover:text-[#9b7844]"}`}
    >
      {children}
    </button>
  );
}

export function Refined() {
  return (
    <main className="property-card-preview flex items-center justify-center bg-[#f3f1ed] p-8">
      <article className="group w-full max-w-[410px] overflow-hidden rounded-[22px] border border-[#ded9cf] bg-white shadow-[0_16px_42px_rgba(16,32,45,0.14)] transition hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(16,32,45,0.18)]">
        <div className="relative aspect-[1.55] overflow-hidden bg-[#dfe3e4]">
          <img src={image} alt="فيلا حديثة" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10202d]/70 via-transparent to-[#10202d]/10" />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between">
            <div className="flex gap-2">
              <span className="rounded-full border border-white/30 bg-[#10202d]/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">فيلا</span>
              <span className="rounded-full bg-[#b4986b] px-3 py-1 text-[11px] font-bold text-white shadow-sm">للبيع</span>
            </div>
            <div className="flex gap-2">
              <IconButton active><Heart className="h-4 w-4 fill-current" /></IconButton>
              <IconButton><Share2 className="h-4 w-4" /></IconButton>
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white">مميز</span>
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white">جديد</span>
              <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur"><Play className="h-3 w-3 fill-white" /> فيديو</span>
            </div>
            <div className="flex gap-1.5 text-[11px] font-semibold text-white">
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur"><Camera className="h-3 w-3" /> 12</span>
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur"><ExternalLink className="h-3 w-3" /></span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-lg font-bold tracking-[0.18em] text-[#10202d]">ALM-2048</span>
                <span className="rounded bg-[#10202d]/5 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-slate-400">CODE</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-[#b4986b]" /> الشروق · المنطقة الخامسة
              </div>
            </div>
            <div dir="ltr" className="shrink-0 text-left">
              <div className="text-xl font-extrabold leading-none text-[#9b7844]">4,850,000</div>
              <div className="mt-1 text-[10px] font-bold tracking-[0.2em] text-slate-400">EGP</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#e8e3da] rounded-xl border border-[#e8e3da] bg-[#faf9f7] py-3">
            <div className="flex flex-col items-center gap-1 text-xs font-semibold text-[#5d6870]"><Bed className="h-4 w-4 text-[#b4986b]" /><span>4 غرف</span></div>
            <div className="flex flex-col items-center gap-1 text-xs font-semibold text-[#5d6870]"><Bath className="h-4 w-4 text-[#b4986b]" /><span>3 حمام</span></div>
            <div className="flex flex-col items-center gap-1 text-xs font-semibold text-[#5d6870]"><Square className="h-4 w-4 text-[#b4986b]" /><span>320 م²</span></div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d7c5a7] bg-[#fbf7ef] px-3 py-1 text-[11px] font-bold text-[#9b7844]">تشطيب فاخر</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">واجهة حديقة</span>
          </div>

          <button className="mb-2 h-10 w-full rounded-xl bg-[#10202d] text-sm font-bold text-white shadow-[0_6px_14px_rgba(16,32,45,0.18)] transition hover:bg-[#1a3345]">عرض تفاصيل العقار</button>
          <div className="mb-3 flex gap-2">
            <button className="h-9 flex-1 rounded-lg border border-green-200 bg-green-50 text-xs font-bold text-green-700">واتساب</button>
            <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700"><Phone className="h-3.5 w-3.5" /> اتصال</button>
            <button className="grid h-9 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500"><Copy className="h-3.5 w-3.5" /></button>
            <button className="grid h-9 w-10 place-items-center rounded-lg border border-[#d7c5a7] text-[#9b7844]"><Scale className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-t border-[#eeeae2] pt-3 text-[11px] font-medium text-slate-400">♪ Alamoudi Properties</div>
        </div>
      </article>
    </main>
  );
}