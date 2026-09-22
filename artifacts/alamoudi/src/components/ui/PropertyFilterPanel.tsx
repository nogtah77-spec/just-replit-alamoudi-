import { useState, useEffect, useRef } from "react";
import {
  Grid2X2,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Building,
  Home,
  Briefcase,
  Stethoscope,
  Paintbrush,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatNumericInput } from "@/lib/utils";
import { FINISHING_OPTIONS } from "@/lib/finishingOptions";
import {
  CATEGORY_OPTIONS,
  SECTOR_OPTIONS,
  type PropertyFilterState,
  type PropertySector,
} from "@/lib/propertyFilters";
import type { PropertyType, Region } from "@/context/DataContext";

interface PropertyFilterPanelProps {
  filters: PropertyFilterState;
  regions: Region[];
  propertyTypes: PropertyType[];
  fixedRegionId?: string;
  onChange: (filters: PropertyFilterState) => void;
  onApply: (filters: PropertyFilterState) => void;
  onReset: () => void;
  resultCount?: number;
  cityName?: string;
  showMatched?: boolean;
}

const SEARCH_PROMPTS = [
  "شقة تشطيب ألترا سوبر لوكس في التجمع...",
  "فيلا مستقلة بحديقة ومسبح خاص...",
  "مكتب إداري بموقع متميز في الشروق...",
  "دوبلكس استلام فوري في مدينة بدر...",
  "محل تجاري استثماري في مدينتي...",
  "بنتهاوس روف بإطلالة بانورامية...",
  "تاون هاوس راقي في كمبوند وصال...",
  "شقة مفروشة للإيجار في مدينة نصر...",
  "عقار للبيع في بيت الوطن...",
];

export function PropertyFilterPanel({
  filters,
  regions,
  propertyTypes,
  fixedRegionId,
  onChange,
  onApply,
  onReset,
  resultCount,
  cityName,
  showMatched = false,
}: PropertyFilterPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotating search ticker animation
  useEffect(() => {
    if (isFocused || filters.searchText) return;
    const interval = setInterval(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % SEARCH_PROMPTS.length);
        setIsAnimating(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [isFocused, filters.searchText]);

  const update = (patch: Partial<PropertyFilterState>, applyImmediately = false) => {
    const next = { ...filters, ...patch };
    onChange(next);
    if (applyImmediately) onApply(next);
  };

  const getSectorIcon = (sector: PropertySector) => {
    switch (sector) {
      case "residential":
        return <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />;
      case "commercial":
        return <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />;
      case "administrative":
        return <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />;
      case "medical":
        return <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <section className="relative rounded-[10px] border border-[#C5A059]/30 bg-gradient-to-b from-[#22272D]/90 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl p-2.5 sm:p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] transition-all duration-300 overflow-hidden">
      {/* Subtle luxury top ambient highlight & contained micro radial glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/35 to-transparent pointer-events-none" />
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-20 bg-[#C5A059]/3 rounded-full blur-xl pointer-events-none" />

      {/* ── 1. Hero Search Input with Animated Sliding Ticker ── */}
      <div className="relative mb-2.5 sm:mb-3 group">
        <div className="relative flex items-stretch rounded-[10px] border border-[#C5A059]/25 bg-[#0F1317]/80 hover:border-[#C5A059]/55 focus-within:border-[#C5A059]/80 focus-within:ring-2 focus-within:ring-[#C5A059]/20 transition-all duration-300 shadow-inner overflow-hidden h-10 sm:h-11 backdrop-blur-md">
          <div className="flex items-center justify-center pr-3.5 text-accent">
            <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>

          <div className="relative flex-1 h-full flex items-center">
            {/* Animated Ticker Placeholder - Purely visual placeholder, clicking focuses input without prefilling */}
            {!filters.searchText && !isFocused && (
              <div
                onClick={() => inputRef.current?.focus()}
                className="absolute inset-0 flex items-center pr-2.5 pl-3 select-none overflow-hidden cursor-text"
              >
                <span className="text-muted-foreground/45 font-normal text-xs sm:text-sm ml-2 shrink-0 select-none">
                  جرب البحث عن:
                </span>
                <div className="relative overflow-hidden h-6 flex items-center flex-1">
                  <span
                    className={cn(
                      "text-xs sm:text-sm text-muted-foreground/40 font-normal transition-all duration-300 transform truncate block text-right select-none",
                      isAnimating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-4 opacity-0"
                    )}
                  >
                    {SEARCH_PROMPTS[promptIndex]}
                  </span>
                </div>
              </div>
            )}

            <Input
              ref={inputRef}
              type="text"
              className="w-full h-full border-0 bg-transparent px-2.5 text-xs sm:text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-transparent"
              value={filters.searchText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(event) => update({ searchText: event.target.value }, true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply(filters);
              }}
            />
          </div>

          {/* Clear button */}
          {filters.searchText && (
            <button
              type="button"
              aria-label="مسح البحث"
              className="px-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => update({ searchText: "" }, true)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Seamlessly Merged Search CTA Button — باللون الرملي الجديد المعتمد #A9927D */}
          <button
            type="button"
            onClick={() => onApply(filters)}
            className="h-full px-4 sm:px-6 rounded-none bg-[#A9927D] text-[#10202D] hover:bg-[#BBA591] font-black transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm shrink-0 border-s border-[#C7B6A6]/50 focus:outline-hidden select-none cursor-pointer shadow-xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span>بحث</span>
          </button>
        </div>
      </div>

      {/* ── 2. Segmented Pill Row: نوع العرض (Unified Professional Layout) ── */}
      <div className="mb-2 pb-2 border-b border-white/10">
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-3 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0 text-foreground font-bold text-[10.5px] sm:text-xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
            <span>نوع العرض:</span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
            {CATEGORY_OPTIONS.map((option) => {
              const active = filters.category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update({ category: option.value }, true)}
                  className={cn(
                    "px-2 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[10.5px] sm:text-xs font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap",
                    active
                      ? "bg-[#C5A059] text-[#10202D] border border-[#E5C378] shadow-sm scale-102 font-black"
                      : "bg-[#161B20]/65 text-[#CBD5E1] hover:bg-[#20262D]/90 hover:text-white border border-white/10 shadow-2xs backdrop-blur-xs"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Category / Sector Row: فئة العقار (Unified Professional Layout) ── */}
      <div className="mb-2.5 sm:mb-3">
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-3 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0 text-foreground font-bold text-[10.5px] sm:text-xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
            <span>فئة العقار:</span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
            {SECTOR_OPTIONS.map((option) => {
              const active = filters.sector === option.value;
              const icon = getSectorIcon(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update({ sector: option.value }, true)}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-[10px] text-[10.5px] sm:text-xs font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap",
                    active
                      ? "bg-[#C5A059] text-[#10202D] border border-[#E5C378] shadow-sm font-black"
                      : "bg-[#161B20]/65 text-[#CBD5E1] hover:bg-[#20262D]/90 hover:text-white border border-white/10 shadow-2xs backdrop-blur-xs"
                  )}
                >
                  {icon}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Main Dropdowns Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {/* المدينة / المنطقة */}
        {!fixedRegionId && (
          <div className="relative col-span-1">
            <Select
              value={filters.regionId}
              onValueChange={(value) => update({ regionId: value }, true)}
            >
              <SelectTrigger className="h-9 sm:h-9.5 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 text-foreground hover:border-[#C5A059]/40 focus:border-[#C5A059]/80 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md transition-all shadow-inner">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <SelectValue placeholder="الموقع / المدينة" />
                </div>
              </SelectTrigger>
              <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 text-foreground shadow-2xl">
                <SelectItem value="all">كل المدن والمناطق</SelectItem>
                {regions
                  .filter((region) => region.active)
                  .map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* نوع العقار */}
        <div className="relative col-span-1">
          <Select
            value={filters.typeId}
            onValueChange={(value) => update({ typeId: value }, true)}
          >
            <SelectTrigger className="h-9 sm:h-9.5 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 text-foreground hover:border-[#C5A059]/40 focus:border-[#C5A059]/80 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md transition-all shadow-inner">
              <div className="flex items-center gap-1.5 truncate">
                <Building className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                <SelectValue placeholder="نوع العقار (شقة، فيلا...)" />
              </div>
            </SelectTrigger>
            <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 text-foreground shadow-2xl">
              <SelectItem value="all">كل أنواع العقارات</SelectItem>
              {propertyTypes
                .filter((type) => type.active)
                .map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* حالة التشطيب */}
        <div className="relative col-span-2 sm:col-span-1">
          <Select
            value={filters.finishing}
            onValueChange={(value) => update({ finishing: value }, true)}
          >
            <SelectTrigger className="h-9 sm:h-9.5 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 text-foreground hover:border-[#C5A059]/40 focus:border-[#C5A059]/80 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md transition-all shadow-inner">
              <div className="flex items-center gap-1.5 truncate">
                <Paintbrush className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                <SelectValue placeholder="حالة التشطيب" />
              </div>
            </SelectTrigger>
            <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 text-foreground shadow-2xl">
              {FINISHING_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── 5. Action Row: Advanced Filters Toggle & Reset ── */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 rounded-[10px] border border-[#C5A059]/40 text-[#C5A059] bg-[#161B20]/60 hover:bg-[#C5A059]/15 text-[11px] sm:text-xs backdrop-blur-md transition-all shadow-xs cursor-pointer"
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {advancedOpen ? (
            <span className="font-bold">إخفاء الفلاتر المتقدمة</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold">فلاتر متقدمة</span>
              <span className="font-normal opacity-70 text-[10px] sm:text-[11px]">(السعر، المساحة، الغرف...)</span>
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200",
              advancedOpen && "rotate-180"
            )}
          />
        </Button>

        {cityName && (
          <span className="text-[11px] sm:text-xs font-semibold text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full border border-[#C5A059]/30 backdrop-blur-xs">
            📍 {cityName}
          </span>
        )}
      </div>

      {/* ── 6. Advanced Filters Expandable Section ── */}
      {advancedOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-[#C5A059]/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in-50 duration-300">
          <fieldset className="space-y-1.5 text-xs font-medium">
            <legend className="text-[#C5A059] font-bold mb-1">نطاق السعر (ج.م)</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={formatNumericInput(filters.minPrice)}
                onChange={(e) => update({ minPrice: formatNumericInput(e.target.value) })}
                placeholder="السعر من"
              />
              <Input
                className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={formatNumericInput(filters.maxPrice)}
                onChange={(e) => update({ maxPrice: formatNumericInput(e.target.value) })}
                placeholder="السعر إلى"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-1.5 text-xs font-medium">
            <legend className="text-[#C5A059] font-bold mb-1">المساحة (م²)</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
                type="number"
                min="0"
                value={filters.minArea}
                onChange={(e) => update({ minArea: e.target.value })}
                placeholder="المساحة من"
              />
              <Input
                className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
                type="number"
                min="0"
                value={filters.maxArea}
                onChange={(e) => update({ maxArea: e.target.value })}
                placeholder="المساحة إلى"
              />
            </div>
          </fieldset>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">عدد الغرف</span>
            <Input
              className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
              type="number"
              min="0"
              value={filters.beds}
              onChange={(e) => update({ beds: e.target.value })}
              placeholder="الحد الأدنى للغرف"
            />
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">عدد الحمامات</span>
            <Input
              className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
              type="number"
              min="0"
              value={filters.baths}
              onChange={(e) => update({ baths: e.target.value })}
              placeholder="الحد الأدنى للحمامات"
            />
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">الموقع داخل المدينة</span>
            <Input
              className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
              value={filters.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="الحي، المجاورة، الكمباوند..."
            />
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">الدور / الطابق</span>
            <Input
              className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/20 backdrop-blur-md"
              value={filters.floor}
              onChange={(e) => update({ floor: e.target.value })}
              placeholder="رقم الدور"
            />
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">المصعد</span>
            <Select
              value={filters.elevator}
              onValueChange={(value) => update({ elevator: value })}
            >
              <SelectTrigger className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground focus:border-[#C5A059]/70 backdrop-blur-md">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="نعم">يوجد مصعد</SelectItem>
                <SelectItem value="لا">بدون مصعد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 text-xs font-medium">
            <span className="text-[#C5A059] font-bold block mb-1">موقف السيارات</span>
            <Select
              value={filters.parking}
              onValueChange={(value) => update({ parking: value })}
            >
              <SelectTrigger className="h-9 rounded-[10px] bg-[#0F1317]/70 border border-white/10 text-xs text-foreground focus:border-[#C5A059]/70 backdrop-blur-md">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="يوجد">يوجد موقف سيارة</SelectItem>
                <SelectItem value="لا يوجد">لا يوجد موقف سيارة</SelectItem>
                <SelectItem value="خاص">موقف خاص</SelectItem>
                <SelectItem value="مشترك">موقف مشترك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              className="h-9 px-5 rounded-[10px] gap-1.5 bg-[#C5A059] text-[#10202D] font-bold hover:bg-[#B38E46] transition-all shadow-md cursor-pointer"
              onClick={() => onApply(filters)}
            >
              <Search className="h-4 w-4" /> تطبيق الفلاتر
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 rounded-[10px] gap-1.5 text-xs border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-muted-foreground hover:text-foreground backdrop-blur-md transition-all cursor-pointer"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> إعادة تعيين
            </Button>
          </div>
        </div>
      )}

      {/* ── 7. Bottom Sorting & Layout Bar ── */}
      <div className="mt-3.5 pt-2.5 flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">ترتيب حسب:</span>
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              update({ sort: value as PropertyFilterState["sort"] }, true)
            }
          >
            <SelectTrigger className="h-8 w-36 rounded-[10px] text-xs font-medium bg-[#0F1317]/70 border border-white/10 text-foreground backdrop-blur-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl" className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
              <SelectItem value="newest">الأحدث أولاً</SelectItem>
              <SelectItem value="priceAsc">السعر: من الأقل للأعلى</SelectItem>
              <SelectItem value="priceDesc">السعر: من الأعلى للأقل</SelectItem>
              <SelectItem value="areaDesc">المساحة: من الأكبر للأصغر</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          {resultCount !== undefined && (
            <span className="font-bold text-[#C5A059]">
              {resultCount} {resultCount === 1 ? "عقار متاح" : "عقارات متاحة"}
              {showMatched ? " مطابق لبحثك" : ""}
            </span>
          )}

          <div className="flex items-center gap-1 rounded-[10px] border border-white/10 bg-[#0F1317]/70 p-0.5 backdrop-blur-md">
            <button
              type="button"
              aria-label="عرض شبكي"
              title="عرض شبكي"
              className={cn(
                "rounded-[7px] p-1.5 transition-colors cursor-pointer",
                filters.viewMode === "grid"
                  ? "bg-[#C5A059] text-[#10202D] shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => update({ viewMode: "grid", cardSize: "medium" })}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="عرض قائمة"
              title="عرض قائمة"
              className={cn(
                "rounded-[7px] p-1.5 transition-colors cursor-pointer",
                filters.viewMode === "list"
                  ? "bg-[#C5A059] text-[#10202D] shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => update({ viewMode: "list", cardSize: "compact" })}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}