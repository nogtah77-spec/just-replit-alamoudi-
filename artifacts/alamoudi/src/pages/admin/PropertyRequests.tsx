import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Trash2, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import type { PropertyRequest } from "@/context/DataContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatMoneyText } from "@/lib/utils";

const statusColors: Record<PropertyRequest["status"], string> = {
  new: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  reviewed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  replied: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};
const statusLabels: Record<PropertyRequest["status"], string> = { new: "جديد", reviewed: "تمت المراجعة", replied: "تم التواصل" };

export default function PropertyRequests() {
  const { propertyRequests, updatePropertyRequestStatus, deletePropertyRequest, regions, propertyTypes } = useData();
  const { toast } = useToast();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="طلبات إضافة عقارات"
          subtitle="طلبات أصحاب العقارات الراغبين في تسويق عقاراتهم"
          eyebrow="طلبات الملاك"
          icon={ClipboardList}
        />

        <div className="flex gap-3 text-sm">
          {Object.entries(statusLabels).map(([k, v]) => {
            const count = propertyRequests.filter(r => r.status === k).length;
            return <div key={k} className={`px-3 py-1.5 rounded-lg font-medium ${statusColors[k as PropertyRequest["status"]]}`}>{v}: {count}</div>;
          })}
        </div>

        {propertyRequests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا توجد طلبات حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...propertyRequests].reverse().map(req => {
              const region = regions.find(r => r.id === req.regionId);
              const ptype = propertyTypes.find(t => t.id === req.propertyTypeId);
              return (
                <Card key={req.id} className="card-luxury border-border/50">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{req.ownerName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {region && <Badge variant="outline" className="text-xs">{region.name}</Badge>}
                          {ptype && <Badge variant="outline" className="text-xs">{ptype.name}</Badge>}
                          {req.listingType && <Badge variant="outline" className="text-xs">{req.listingType}</Badge>}
                          {req.area && <Badge variant="outline" className="text-xs">{req.area} م²</Badge>}
                          {req.price && <Badge className="bg-accent/10 text-accent text-xs border-none">{formatMoneyText(req.price, "EGP")}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border-none ${statusColors[req.status]}`}>{statusLabels[req.status]}</Badge>
                        <Select value={req.status} onValueChange={(v: PropertyRequest["status"]) => { updatePropertyRequestStatus(req.id, v); toast({ title: "تم تحديث الحالة" }); }}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">جديد</SelectItem>
                            <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                            <SelectItem value="replied">تم التواصل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {req.description && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{req.description}</p>}
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-xs flex-1">
                        <a href={`tel:${req.ownerPhone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-accent transition-colors text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />{req.ownerPhone}
                        </a>
                        {req.ownerWhatsapp && (
                          <a href={`https://wa.me/${req.ownerWhatsapp.replace(/[\s+]/g, "")}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors">
                            <WhatsAppIcon className="h-3.5 w-3.5" />واتساب
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { deletePropertyRequest(req.id); toast({ title: "تم الحذف" }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
