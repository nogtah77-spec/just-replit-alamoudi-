import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Radio, GripVertical, ChevronDown, ChevronUp, Users, Eye, CalendarDays, TrendingUp, Minimize2, Maximize2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { cn } from "@/lib/utils";

const POS_KEY   = "alamoudi_live_bubble_pos";
const STATE_KEY = "alamoudi_live_bubble_collapsed";
const MINI_KEY  = "alamoudi_live_bubble_mini";

type Pos = { x: number; y: number };

const W_EXPANDED  = 165;
const W_COLLAPSED = 165;
const H_COLLAPSED = 48;
const W_MINI      = 82;
const H_MINI      = 36;
const MARGIN      = 12;

function clampToViewport(x: number, y: number, w: number, h: number): Pos {
  const maxX = Math.max(MARGIN, window.innerWidth  - w - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
  return { x: Math.min(Math.max(MARGIN, x), maxX), y: Math.min(Math.max(MARGIN, y), maxY) };
}

export function LiveVisitorsBubble() {
  const { visitorStats, refreshVisitorStats, properties, inquiries, finishingRequests, propertyRequests } = useData();
  const [, navigate] = useLocation();

  const [pos, setPos] = useState<Pos | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STATE_KEY) === "true"; } catch { return true; }
  });
  const [isMini, setIsMini] = useState<boolean>(() => {
    try { return localStorage.getItem(MINI_KEY) === "true"; } catch { return false; }
  });

  const drag = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null);
  const posRef = useRef<Pos | null>(null);
  posRef.current = pos;

  const currentW = isMini ? W_MINI : W_COLLAPSED;
  const currentH = isMini ? H_MINI : (collapsed ? H_COLLAPSED : H_COLLAPSED + 120);

  // refresh visitor stats periodically
  useEffect(() => {
    refreshVisitorStats();
    const id = setInterval(refreshVisitorStats, 10_000);
    return () => clearInterval(id);
  }, [refreshVisitorStats]);

  // restore position from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pos;
        setPos(clampToViewport(p.x, p.y, currentW, currentH));
        return;
      }
    } catch {}
    setPos(clampToViewport(MARGIN, window.innerHeight - currentH - MARGIN - 12, currentW, currentH));
  }, []);

  // clamp position on window resize
  useEffect(() => {
    const onResize = () => {
      if (posRef.current) setPos(clampToViewport(posRef.current.x, posRef.current.y, currentW, currentH));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [currentW, currentH]);

  const savePos = (p: Pos) => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {}
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const p = posRef.current;
    if (!p) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - p.x, dy: e.clientY - p.y, startX: e.clientX, startY: e.clientY, moved: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    const np = clampToViewport(e.clientX - d.dx, e.clientY - d.dy, currentW, currentH);
    setPos(np);
  }, [currentW, currentH]);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const p = posRef.current;
    if (p) savePos(p);

    // If clicked without dragging
    if (!d.moved) {
      if (isMini) {
        setIsMini(false);
        try { localStorage.setItem(MINI_KEY, "false"); } catch {}
      } else {
        navigate("/admin/analytics");
      }
    }
  }, [isMini, navigate]);

  const toggleMini = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMini(prev => {
      const next = !prev;
      try { localStorage.setItem(MINI_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(STATE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Hide behind any open Radix sheet/dialog (z-50) so it never blocks overlays
  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    const check = () => setModalOpen(
      !!document.querySelector('[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"]')
    );
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    return () => obs.disconnect();
  }, []);

  if (!pos) return null;

  const realProperties = properties.filter(p => !p.id?.startsWith("__") && !p.code?.startsWith("__"));
  const totalLeads   = inquiries.length + finishingRequests.length + propertyRequests.length;
  const totalViews   = realProperties.reduce((s, p) => s + (p.views ?? 0), 0);
  const activeCount  = realProperties.filter(p => p.status === "active" || p.status === "listed").length;

  const metrics = [
    { icon: Eye,          label: "إجمالي المشاهدات",   value: totalViews },
    { icon: Users,        label: "إجمالي العملاء",      value: totalLeads },
    { icon: TrendingUp,   label: "عقارات نشطة",         value: activeCount },
    { icon: CalendarDays, label: "زوار اليوم",           value: visitorStats.today },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: currentW,
        touchAction: "none",
        zIndex: modalOpen ? 40 : 60,
        pointerEvents: modalOpen ? "none" : "auto",
      }}
      className="select-none transition-[width] duration-200"
    >
      {/* Mini Mode (Ultra-compact pill) */}
      {isMini ? (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-[#1f2937]/95 to-[#0f172a]/95 backdrop-blur-md shadow-lg shadow-black/40 ring-1 ring-white/15 cursor-grab active:cursor-grabbing hover:border-amber-300 transition-all hover:scale-105"
          title="المتواجدون الآن - انقر للتكبير أو التحريك"
        >
          {/* Live pulsing dot */}
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#BBA591] to-[#917B67] text-white shadow-xs">
            <Radio className="h-2.5 w-2.5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#1f2937]" />
            </span>
          </div>

          {/* Visitor count */}
          <span className="text-sm font-black text-white tabular-nums drop-shadow-sm">
            <RollingNumber value={visitorStats.online} />
          </span>

          {/* Expand toggle button */}
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={toggleMini}
            className="w-4 h-4 flex items-center justify-center rounded text-amber-200/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="تكبير النافذة"
          >
            <Maximize2 className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        /* Full Mode */
        <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-[#1f2937]/95 to-[#0f172a]/95 backdrop-blur-md shadow-xl shadow-black/40 ring-1 ring-white/10 overflow-hidden transition-all duration-300">
          {/* Header row — draggable */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center gap-2 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors"
          >
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#BBA591] to-[#917B67] text-white shadow-xs">
              <Radio className="h-3.5 w-3.5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#1f2937]" />
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col leading-none">
              <span className="text-[9px] font-semibold text-amber-200/90">متواجدون الآن</span>
              <span className="text-lg font-black text-white leading-tight drop-shadow-sm tabular-nums">
                <RollingNumber value={visitorStats.online} />
              </span>
            </div>

            {/* Minimize to mini pill button */}
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={toggleMini}
              className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded"
              title="تصغير إلى كبسولة صغيرة"
            >
              <Minimize2 className="h-3 w-3" />
            </button>

            {/* Expand/Collapse metrics button */}
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={toggleCollapse}
              className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded"
              title={collapsed ? "عرض تفاصيل المؤشرات" : "إخفاء تفاصيل المؤشرات"}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>

            <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
          </div>

          {/* Expanded metrics */}
          {!collapsed && (
            <div className="border-t border-white/10 px-2.5 py-2 space-y-1.5 bg-black/15">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <m.icon className="h-3 w-3 text-amber-300/80 flex-shrink-0" />
                    <span className="text-[9px] text-white/70 truncate">{m.label}</span>
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {m.value.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate("/admin/analytics")}
                  className={cn(
                    "w-full text-[9px] font-bold text-amber-300 hover:text-amber-200 hover:underline transition-all text-center py-0.5 block"
                  )}
                >
                  عرض التحليلات الكاملة ←
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
