import { useState, useRef, useEffect } from "react";
import { Search, X, MapPin, Building2, SlidersHorizontal, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PropertyFilterState, ListingCategory } from "@/lib/propertyFilters";
import type { PropertyType, Region } from "@/context/DataContext";

interface StickyQuickSearchProps {
  filters: PropertyFilterState;
  regions: Region[];
  propertyTypes: PropertyType[];
  visible: boolean;
  isFiltering: boolean;
  resultCount: number;
  onChange: (filters: PropertyFilterState) => void;
  onApply: (filters: PropertyFilterState) => void;
  onReset: () => void;
}

export function StickyQuickSearch({
  filters,
  regions,
  propertyTypes,
  visible,
  isFiltering,
  resultCount,
  onChange,
  onApply,
  onReset,
}: StickyQuickSearchProps) {
  const [localQuery, setLocalQuery] = useState(filters.searchText || "");

  useEffect(() => {
    setLocalQuery(filters.searchText || "");
  }, [filters.searchText]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const next = { ...filters, searchText: localQuery.trim() };
    onChange(next);
    onApply(next);
  };

  const handleRegionChange = (regionId: string) => {
    const val = regionId === "all" ? "" : regionId;
    const next = { ...filters, regionId: val };
    onChange(next);
    onApply(next);
  };

  const handleTypeChange = (typeId: string) => {
    const val = typeId === "all" ? "" : typeId;
    const next = { ...filters, typeId: val };
    onChange(next);
    onApply(next);
  };

  const handleCategoryChange = (category: string) => {
    const next = { ...filters, category: category as ListingCategory };
    onChange(next);
    onApply(next);
  };

  const activeRegions = regions.filter((r) => r.active !== false);
  const activeTypes = propertyTypes.filter((t) => t.active !== false);

  return (
    <div
      dir="rtl"
      className={cn(
        "fixed top-16 left-0 right-0 z-40 px-2.5 sm:px-4 py-2 transition-all duration-300 transform",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-4 pointer-events-none"
      )}
    >
      <div className="relative overflow-hidden max-w-5xl mx-auto rounded-[10px] bg-gradient-to-b from-[#22272D]/95 via-[#181C20]/95 to-[#14171A] backdrop-blur-xl border border-[#C5A059]/30 shadow-[0_12px_36px_rgba(0,0,0,0.45)] p-2 sm:p-2.5 transition-all">
        {/* Ambient Top Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none" />

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C5A059] pointer-events-none" />
            <Input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="ابحث بالاسم، الكود (مثل S66)، أو الحي..."
              className="pr-9 pl-8 h-9 text-xs sm:text-sm bg-[#0F1317]/70 border-white/10 text-foreground placeholder:text-muted-foreground/50 rounded-[10px] focus-visible:ring-[#C5A059]/20 focus-visible:border-[#C5A059]/60 backdrop-blur-md"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery("");
                  const next = { ...filters, searchText: "" };
                  onChange(next);
                  onApply(next);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Region Select */}
          <div className="w-[120px] sm:w-[140px] hidden xs:block">
            <Select
              value={filters.regionId || "all"}
              onValueChange={handleRegionChange}
            >
              <SelectTrigger className="h-9 text-xs bg-[#0F1317]/70 border-white/10 text-foreground rounded-[10px] focus:border-[#C5A059]/60 backdrop-blur-md">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <SelectValue placeholder="المنطقة" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
                <SelectItem value="all">كل المناطق</SelectItem>
                {activeRegions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Type Select */}
          <div className="w-[115px] sm:w-[130px] hidden md:block">
            <Select
              value={filters.typeId || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="h-9 text-xs bg-[#0F1317]/70 border-white/10 text-foreground rounded-[10px] focus:border-[#C5A059]/60 backdrop-blur-md">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <SelectValue placeholder="النوع" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
                <SelectItem value="all">كل الأنواع</SelectItem>
                {activeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Listing Category Select */}
          <div className="w-[100px] sm:w-[110px] hidden lg:block">
            <Select
              value={filters.category || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="h-9 text-xs bg-[#0F1317]/70 border-white/10 text-foreground rounded-[10px] focus:border-[#C5A059]/60 backdrop-blur-md">
                <SelectValue placeholder="العرض" />
              </SelectTrigger>
              <SelectContent className="rounded-[10px] bg-[#161B20]/95 backdrop-blur-xl border border-[#C5A059]/30 shadow-2xl">
                <SelectItem value="all">كل العروض</SelectItem>
                <SelectItem value="sale">للبيع</SelectItem>
                <SelectItem value="rent">للإيجار</SelectItem>
                <SelectItem value="furnished">مفروش</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3 sm:px-4 text-xs font-bold bg-[#C5A059] text-[#10202D] hover:bg-[#B38E46] rounded-[10px] gap-1.5 shadow-md border-0 transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>بحث</span>
          </Button>

          {/* Reset Filters / Matched count */}
          {isFiltering && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 px-2.5 sm:px-3 text-xs border border-white/10 bg-[#161B20]/60 hover:bg-white/5 text-muted-foreground hover:text-foreground backdrop-blur-md rounded-[10px] gap-1 cursor-pointer transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">مسح الفلاتر ({resultCount})</span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
