import { useMemo, useState } from "react";
import { Building2, CalendarRange, ChevronLeft, Clock3 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Property, PropertyType, Region } from "@/context/DataContext";
import { formatMoneyText } from "@/lib/utils";

type RangePreset = "7" | "14" | "30" | "custom";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function daysAgoKey(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return toDateKey(date);
}

function propertyDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toDateKey(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "تاريخ غير معروف"
    : date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
}

function formatRangeLabel(from: string, to: string) {
  if (!from && !to) return "اختر الفترة";
  if (from === to) return formatDate(`${from}T12:00:00`);
  return `${formatDate(`${from}T12:00:00`)} — ${formatDate(`${to}T12:00:00`)}`;
}

export function RecentPropertiesPanel({
  properties,
  regions,
  propertyTypes,
  compact = false,
}: {
  properties: Property[];
  regions: Region[];
  propertyTypes: PropertyType[];
  compact?: boolean;
}) {
  const [preset, setPreset] = useState<RangePreset>("7");
  const [customFrom, setCustomFrom] = useState(daysAgoKey(6));
  const [customTo, setCustomTo] = useState(todayKey());

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }
    return { from: daysAgoKey(Number(preset) - 1), to: todayKey() };
  }, [customFrom, customTo, preset]);

  const recentProperties = useMemo(() => {
    if (!range.from || !range.to || range.from > range.to) return [];
    return properties
      .filter((property) => {
        const created = propertyDateKey(property.createdAt);
        return created && created >= range.from && created <= range.to;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [properties, range.from, range.to]);

  const hasInvalidCustomRange = preset === "custom" && Boolean(customFrom && customTo && customFrom > customTo);
  const clearCustomRange = () => {
    setCustomFrom(daysAgoKey(6));
    setCustomTo(todayKey());
    setPreset("7");
  };

  return (
    <Card className="card-luxury overflow-hidden">
      <CardHeader className={`flex flex-col gap-4 ${compact ? "pb-3" : "pb-4"} sm:flex-row sm:items-start sm:justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-accent" />
            <CardTitle>العقارات المضافة حديثًا</CardTitle>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            راجع الإضافات الجديدة وأبلغ فريق العمل بما دخل المنصة خلال الفترة المحددة.
          </p>
        </div>
        <Link href="/admin/properties" className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
          كل العقارات <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label className="mb-2 block text-xs">الفترة الزمنية</Label>
            <Select value={preset} onValueChange={(value: RangePreset) => setPreset(value)}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="14">آخر 14 يومًا</SelectItem>
                <SelectItem value="30">آخر 30 يومًا</SelectItem>
                <SelectItem value="custom">فترة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" && (
            <>
              <div className="min-w-0 flex-1">
                <Label htmlFor="recent-properties-from" className="mb-2 block text-xs">من تاريخ</Label>
                <Input id="recent-properties-from" type="date" value={customFrom} max={todayKey()} onChange={(event) => setCustomFrom(event.target.value)} className="bg-background" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="recent-properties-to" className="mb-2 block text-xs">إلى تاريخ</Label>
                <Input id="recent-properties-to" type="date" value={customTo} max={todayKey()} onChange={(event) => setCustomTo(event.target.value)} className="bg-background" />
              </div>
              <Button type="button" variant="ghost" onClick={clearCustomRange} className="shrink-0">إعادة آخر 7 أيام</Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{recentProperties.length} عقار</span>
            <Badge variant="outline" className="font-normal">{formatRangeLabel(range.from, range.to)}</Badge>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />مرتبة من الأحدث</span>
        </div>

        {hasInvalidCustomRange ? (
          <EmptyState
            icon={<CalendarRange className="h-6 w-6" />}
            title="الفترة غير صحيحة"
            description="يجب أن يكون تاريخ البداية قبل تاريخ النهاية."
            action={{ label: "إعادة آخر 7 أيام", onClick: clearCustomRange }}
            className="border-none bg-transparent py-8"
          />
        ) : recentProperties.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="لا توجد إضافات في هذه الفترة"
            description="جرّب توسيع الفترة أو اختر تاريخًا مخصصًا."
            className="border-none bg-transparent py-8"
          />
        ) : (
          <div className="divide-y divide-border/50">
            {recentProperties.slice(0, compact ? 6 : undefined).map((property) => {
              const region = regions.find((item) => item.id === property.regionId)?.name;
              const type = propertyTypes.find((item) => item.id === property.typeId)?.name;
              return (
                <Link
                  key={property.id}
                  href={`/admin/properties/${property.id}/edit`}
                  className="flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/30"
                >
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {property.images?.[0] ? (
                      <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground/50" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{property.code || "بدون كود"}</span>
                      {property.title && property.title.trim() !== property.code.trim() && (
                        <span className="truncate text-sm text-muted-foreground">{property.title}</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {[region, type, property.price ? formatMoneyText(property.price, "جنيه") : ""].filter(Boolean).join(" · ") || "تفاصيل العقار قيد الإضافة"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-left text-[11px] text-muted-foreground sm:block">
                    <p>{formatDate(property.createdAt)}</p>
                    <p className="mt-1 text-accent">عرض وتعديل</p>
                  </div>
                </Link>
              );
            })}
            {compact && recentProperties.length > 6 && (
              <Link href="/admin/activity-logs" className="block pt-3 text-center text-xs font-medium text-accent hover:underline">
                عرض كل العقارات في سجلات النشاط
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}