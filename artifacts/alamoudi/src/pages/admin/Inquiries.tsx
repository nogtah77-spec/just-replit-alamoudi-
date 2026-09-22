import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Trash2, Phone, Mail } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import type { Inquiry } from "@/context/DataContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const statusColors: Record<Inquiry["status"], string> = {
  new: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  reviewed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  replied: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};
const statusLabels: Record<Inquiry["status"], string> = { new: "جديد", reviewed: "تمت المراجعة", replied: "تم الرد" };

export default function Inquiries() {
  const { inquiries, updateInquiryStatus, deleteInquiry } = useData();
  const { toast } = useToast();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="استفسارات العملاء"
          subtitle="متابعة الرسائل الواردة من عملاء الاستشارة العقارية"
          eyebrow="التواصل مع العملاء"
          icon={MessageSquare}
        />

        <div className="flex gap-3 text-sm">
          {Object.entries(statusLabels).map(([k, v]) => {
            const count = inquiries.filter(i => i.status === k).length;
            return (
              <div key={k} className={`px-3 py-1.5 rounded-lg font-medium ${statusColors[k as Inquiry["status"]]}`}>
                {v}: {count}
              </div>
            );
          })}
        </div>

        {inquiries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا توجد استفسارات حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...inquiries].reverse().map(inq => (
              <Card key={inq.id} className="card-luxury border-border/50">
                <CardContent className="p-5">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{inq.name}</h3>
                      <p className="text-xs text-accent font-medium mt-0.5">{inq.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border-none ${statusColors[inq.status]}`}>{statusLabels[inq.status]}</Badge>
                      <Select value={inq.status} onValueChange={(v: Inquiry["status"]) => { updateInquiryStatus(inq.id, v); toast({ title: "تم تحديث الحالة" }); }}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">جديد</SelectItem>
                          <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                          <SelectItem value="replied">تم الرد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{inq.message}</p>
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-1">
                      <a href={`tel:${inq.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-accent transition-colors">
                        <Phone className="h-3.5 w-3.5" />{inq.phone}
                      </a>
                      {inq.email && (
                        <a href={`mailto:${inq.email}`} className="flex items-center gap-1 hover:text-accent transition-colors">
                          <Mail className="h-3.5 w-3.5" />{inq.email}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(inq.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { deleteInquiry(inq.id); toast({ title: "تم الحذف" }); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
