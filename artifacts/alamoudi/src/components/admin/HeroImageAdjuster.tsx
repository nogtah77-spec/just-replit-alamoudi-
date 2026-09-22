import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
  Maximize2,
  Minimize2,
} from "lucide-react";

export const REGION_OVERLAY_PRESETS = [
  { label: "أسود", value: "#000000", swatch: "bg-black" },
  { label: "أبيض", value: "#ffffff", swatch: "bg-white" },
  { label: "فحمي", value: "#1f2937", swatch: "bg-slate-800" },
  { label: "كحلي", value: "#0f172a", swatch: "bg-slate-950" },
  { label: "بني دافئ", value: "#4a3524", swatch: "bg-[#4a3524]" },
  { label: "أخضر داكن", value: "#18352f", swatch: "bg-[#18352f]" },
] as const;

interface HeroImageAdjusterProps {
  imageUrl: string;
  onImageAdjusted: (croppedDataUrl: string) => void;
  aspectRatio?: number; // width / height, default 16/6 (~2.66)
  overlayColor?: string;
  overlayOpacity?: number;
  gradientOpacity?: number;
  onOverlayChange?: (overlay: {
    color: string;
    overlayOpacity: number;
    gradientOpacity: number;
  }) => void;
  regionName?: string;
}

export function HeroImageAdjuster({
  imageUrl,
  onImageAdjusted,
  aspectRatio = 16 / 6,
  overlayColor = "#000000",
  overlayOpacity = 25,
  gradientOpacity = 60,
  onOverlayChange,
  regionName = "اسم المنطقة",
}: HeroImageAdjusterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const positionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Overlay states (local synced with props)
  const [localOverlayColor, setLocalOverlayColor] = useState(overlayColor);
  const [localOverlayOpacity, setLocalOverlayOpacity] = useState(overlayOpacity);
  const [localGradientOpacity, setLocalGradientOpacity] = useState(gradientOpacity);

  useEffect(() => {
    setLocalOverlayColor(overlayColor);
  }, [overlayColor]);

  useEffect(() => {
    setLocalOverlayOpacity(overlayOpacity);
  }, [overlayOpacity]);

  useEffect(() => {
    setLocalGradientOpacity(gradientOpacity);
  }, [gradientOpacity]);

  const notifyOverlayChange = (next: {
    color?: string;
    overlayOpacity?: number;
    gradientOpacity?: number;
  }) => {
    const updated = {
      color: next.color ?? localOverlayColor,
      overlayOpacity: next.overlayOpacity ?? localOverlayOpacity,
      gradientOpacity: next.gradientOpacity ?? localGradientOpacity,
    };
    if (next.color !== undefined) setLocalOverlayColor(next.color);
    if (next.overlayOpacity !== undefined) setLocalOverlayOpacity(next.overlayOpacity);
    if (next.gradientOpacity !== undefined) setLocalGradientOpacity(next.gradientOpacity);
    onOverlayChange?.(updated);
  };

  // Reset position & scale when imageUrl changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setFitMode("contain");
    setImageLoaded(false);
  }, [imageUrl]);

  // Handle image natural dimensions when loaded
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setImageLoaded(true);
  };

  // Handle Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      positionStartRef.current = { ...position };
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: positionStartRef.current.x + dx,
        y: positionStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Directional Nudge (Step adjustments)
  const nudge = (dx: number, dy: number) => {
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const resetAdjustment = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const switchToFit = () => {
    setFitMode("contain");
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const switchToFill = () => {
    setFitMode("cover");
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Generate & export the cropped canvas image based on current frame
  const applyCrop = useCallback(() => {
    if (!containerRef.current || !imgRef.current || !naturalDimensions.width) return;
    const container = containerRef.current;
    const img = imgRef.current;

    const canvas = document.createElement("canvas");
    const targetWidth = 1400;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill background with overlay color / neutral dark
    ctx.fillStyle = localOverlayColor || "#0f172a";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const containerRect = container.getBoundingClientRect();
    const cW = containerRect.width;
    const cH = containerRect.height;
    const cAspect = cW / cH;

    const nW = naturalDimensions.width;
    const nH = naturalDimensions.height;
    const nAspect = nW / nH;

    let baseW: number;
    let baseH: number;

    if (fitMode === "contain") {
      // Fit whole image inside container without cropping any side
      if (nAspect > cAspect) {
        baseW = cW;
        baseH = cW / nAspect;
      } else {
        baseH = cH;
        baseW = cH * nAspect;
      }
    } else {
      // Cover mode: fill container
      if (nAspect > cAspect) {
        baseH = cH;
        baseW = cH * nAspect;
      } else {
        baseW = cW;
        baseH = cW / nAspect;
      }
    }

    const scaledW = baseW * scale;
    const scaledH = baseH * scale;

    const offsetX = (cW - scaledW) / 2 + position.x;
    const offsetY = (cH - scaledH) / 2 + position.y;

    const scaleRatio = targetWidth / cW;

    const canvasDrawX = offsetX * scaleRatio;
    const canvasDrawY = offsetY * scaleRatio;
    const canvasDrawW = scaledW * scaleRatio;
    const canvasDrawH = scaledH * scaleRatio;

    ctx.drawImage(img, canvasDrawX, canvasDrawY, canvasDrawW, canvasDrawH);

    try {
      let croppedUrl = canvas.toDataURL("image/webp", 0.80);
      if (!croppedUrl.startsWith("data:image/webp")) {
        croppedUrl = canvas.toDataURL("image/jpeg", 0.80);
      }
      onImageAdjusted(croppedUrl);
    } catch {
      onImageAdjusted(imageUrl);
    }
  }, [aspectRatio, scale, position, onImageAdjusted, imageUrl, naturalDimensions, fitMode, localOverlayColor]);

  // Debounced auto-sync whenever position, scale, or fitMode changes
  useEffect(() => {
    if (!imageLoaded) return;
    const timer = setTimeout(() => {
      applyCrop();
    }, 200);
    return () => clearTimeout(timer);
  }, [position, scale, imageLoaded, applyCrop, fitMode]);

  const cleanHex = localOverlayColor.replace(/^#/, "");
  const safeHex = /^[0-9a-f]{6}$/i.test(cleanHex) ? cleanHex : "000000";

  return (
    <div className="space-y-4 rounded-xl border border-accent/30 bg-muted/20 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Move className="h-4 w-4 text-accent" />
          معاينة وتحريك غلاف المدينة بحرية (Pan & Zoom)
        </Label>

        {/* Fit / Fill Mode Toggle Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={fitMode === "contain" ? "default" : "outline"}
            className={`h-7 gap-1 text-[11px] px-2.5 ${
              fitMode === "contain"
                ? "bg-accent text-accent-foreground font-bold"
                : "border-border/70 text-muted-foreground"
            }`}
            onClick={switchToFit}
            title="عرض الصورة كاملة من جميع الجهات بدون أي قص"
          >
            <Minimize2 className="h-3 w-3" />
            الصورة كاملة (Fit)
          </Button>

          <Button
            type="button"
            size="sm"
            variant={fitMode === "cover" ? "default" : "outline"}
            className={`h-7 gap-1 text-[11px] px-2.5 ${
              fitMode === "cover"
                ? "bg-accent text-accent-foreground font-bold"
                : "border-border/70 text-muted-foreground"
            }`}
            onClick={switchToFill}
            title="تعبئة الإطار بالكامل"
          >
            <Maximize2 className="h-3 w-3" />
            تعبئة الإطار (Fill)
          </Button>
        </div>
      </div>

      {/* ── 1. Interactive Draggable Preview Viewport ── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative h-48 sm:h-56 w-full cursor-grab overflow-hidden rounded-xl border-2 border-accent/40 bg-slate-950 active:cursor-grabbing select-none shadow-inner flex items-center justify-center"
        title="انقر واسحب لتحريك الصورة في أي اتجاه"
      >
        {/* Moving / Zooming Image */}
        <img
          ref={(el) => {
            imgRef.current = el;
          }}
          src={imageUrl}
          alt="غلاف المنطقة"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            maxWidth: fitMode === "contain" ? "100%" : "none",
            maxHeight: fitMode === "contain" ? "100%" : "none",
            width: fitMode === "contain" ? "auto" : undefined,
            height: fitMode === "contain" ? "auto" : undefined,
            objectFit: fitMode === "contain" ? "contain" : "cover",
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          className="pointer-events-none select-none"
        />

        {/* Live Base Color Overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-150"
          style={{
            backgroundColor: `#${safeHex}`,
            opacity: localOverlayOpacity / 100,
          }}
        />

        {/* Live Bottom Gradient Overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-150"
          style={{
            background: `linear-gradient(to top, #${safeHex}${Math.round((localGradientOpacity / 100) * 255).toString(16).padStart(2, "0")} 0%, #${safeHex}${Math.round((localGradientOpacity / 400) * 255).toString(16).padStart(2, "0")} 52%, transparent 100%)`,
          }}
        />

        {/* Rule of Thirds Guide Grid */}
        <div className={`pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-200 ${isDragging ? "opacity-100" : "opacity-25"}`}>
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-white/20" />
          <div className="border-r border-white/20" />
          <div />
        </div>

        {/* Live Region Title Preview */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {regionName.trim() || "اسم المنطقة"}
          </h2>
          <span className="mt-1 text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            الرئيسية ‹ {regionName.trim() || "المنطقة"}
          </span>
        </div>

        {/* Position coordinates pill */}
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm border border-white/10 flex items-center gap-1">
          <Move className="h-2.5 w-2.5 text-accent" />
          <span>الموضع X: {Math.round(position.x)} | Y: {Math.round(position.y)}</span>
        </div>
      </div>

      {/* ── 2. Image Navigation & Zoom Controls ── */}
      <div className="space-y-2.5 bg-card/60 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7 shrink-0"
            onClick={() => setScale((s) => Math.max(0.3, Number((s - 0.1).toFixed(2))))}
            title="تصغير"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>نسبة التكبير (Zoom)</span>
              <span className="text-accent font-bold">{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              dir="ltr"
              value={[scale]}
              min={0.3}
              max={4}
              step={0.05}
              onValueChange={([val]) => setScale(val)}
              className="py-1"
            />
          </div>

          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7 shrink-0"
            onClick={() => setScale((s) => Math.min(4, Number((s + 0.1).toFixed(2))))}
            title="تكبير (حتى 400%)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
          {/* 4-Way Directional Step Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-muted-foreground ml-1">تحريك دقيق:</span>
            <Button type="button" size="icon" variant="outline" className="h-6 w-6 rounded" onClick={() => nudge(0, -15)} title="للأعلى">
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-6 w-6 rounded" onClick={() => nudge(0, 15)} title="للأسفل">
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-6 w-6 rounded" onClick={() => nudge(-15, 0)} title="لليسار">
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="outline" className="h-6 w-6 rounded" onClick={() => nudge(15, 0)} title="لليمين">
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={resetAdjustment}
          >
            <RotateCcw className="h-3 w-3" />
            إعادة للمنتصف
          </Button>
        </div>
      </div>

      {/* ── 3. Region Overlay Controls ── */}
      <div className="space-y-3.5 rounded-lg border border-accent/25 bg-card/80 p-3.5">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <Palette className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold text-foreground">
            إعدادات طبقة الغلاف والشفافية (Overlay Settings)
          </span>
        </div>

        {/* Color Presets & Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">لون الطبقة التعتيمية</Label>
            <div className="flex items-center gap-2" dir="ltr">
              <input
                aria-label="اختيار لون طبقة الغلاف"
                type="color"
                value={`#${safeHex}`}
                onChange={(e) => notifyOverlayChange({ color: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-md border border-border bg-background p-1"
              />
              <Input
                aria-label="رمز لون طبقة الغلاف"
                dir="ltr"
                value={localOverlayColor}
                onChange={(e) => notifyOverlayChange({ color: e.target.value })}
                className="w-24 text-center font-mono text-xs h-8"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Quick Color Presets */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {REGION_OVERLAY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => notifyOverlayChange({ color: preset.value })}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  localOverlayColor.toLowerCase() === preset.value
                    ? "border-accent bg-accent/15 text-foreground font-bold"
                    : "border-border/70 hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className={`h-3 w-3 shrink-0 rounded-full border border-black/20 ${preset.swatch}`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Base Opacity Slider */}
        <div className="space-y-2 border-t border-border/50 pt-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">شفافية الطبقة الأساسية</Label>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-bold" dir="ltr">
              {localOverlayOpacity}%
            </span>
          </div>
          <Slider
            dir="ltr"
            value={[localOverlayOpacity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => notifyOverlayChange({ overlayOpacity: val })}
          />
        </div>

        {/* Gradient Opacity Slider */}
        <div className="space-y-2 border-t border-border/50 pt-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">قوة التدرّج السفلي لنص المنطقة</Label>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-bold" dir="ltr">
              {localGradientOpacity}%
            </span>
          </div>
          <Slider
            dir="ltr"
            value={[localGradientOpacity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => notifyOverlayChange({ gradientOpacity: val })}
          />
        </div>
      </div>
    </div>
  );
}
