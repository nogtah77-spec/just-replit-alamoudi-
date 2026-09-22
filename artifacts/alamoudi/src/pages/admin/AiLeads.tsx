import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Trash2, Phone, Wallet, Languages } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import type { AiLead } from "@/context/DataContext";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatMoneyText } from "@/lib/utils";

const statusColors: Record<AiLead["status"], string> = {
  new: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  reviewed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  replied: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};
const statusLabels: Record<AiLead["status"], string> = { new: "جديد", reviewed: "تمت المراجعة", replied: "تم التواصل" };

export default function AiLeads() {
  const { aiLeads, reloadAiLeads, updateAiLeadStatus, deleteAiLead } = useData();
  const { toast } = useToast();

  useEffect(() => {
    void reloadAiLeads();
  }, [reloadAiLeads]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="عملاء المستشار الذكي"
          subtitle="العملاء المحتملون الذين جمعهم المستشار الذكي من المحادثات"
          eyebrow="الذكاء وخدمة العملاء"
          icon={Sparkles}
        />

        <div className="flex gap-3 text-sm">
          {Object.entries(statusLabels).map(([k, v]) => {
            const count = aiLeads.filter(r => r.status === k).length;
            return <div key={k} className={`px-3 py-1.5 rounded-lg font-medium ${statusColors[k as AiLead["status"]]}`}>{v}: {count}</div>;
          })}
        </div>

        {aiLeads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا يوجد عملاء حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...aiLeads].reverse().map(lead => {
              const phoneClean = lead.phone.replace(/[\s+]/g, "");
              return (
                <Card key={lead.id} className="card-luxury border-border/50">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{lead.name || "بدون اسم"}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {lead.budget && <Badge className="bg-accent/10 text-accent text-xs border-none flex items-center gap-1"><Wallet className="h-3 w-3" />{formatMoneyText(lead.budget)}</Badge>}
                          {lead.preferredLanguage && <Badge variant="outline" className="text-xs flex items-center gap-1"><Languages className="h-3 w-3" />{lead.preferredLanguage}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border-none ${statusColors[lead.status]}`}>{statusLabels[lead.status]}</Badge>
                        <Select value={lead.status} onValueChange={(v: AiLead["status"]) => { updateAiLeadStatus(lead.id, v); toast({ title: "تم تحديث الحالة" }); }}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">جديد</SelectItem>
                            <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                            <SelectItem value="replied">تم التواصل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {lead.requirements && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-foreground/70 mb-1">المتطلبات:</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lead.requirements}</p>
                      </div>
                    )}
                    {lead.notes && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-foreground/70 mb-1">ملاحظات:</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lead.notes}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-3 text-xs flex-1">
                        {lead.phone && (
                          <>
                            <a href={`tel:${phoneClean}`} className="flex items-center gap-1 hover:text-accent transition-colors text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />{lead.phone}
                            </a>
                            <a href={`https://wa.me/${phoneClean}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors">
                              <WhatsAppIcon className="h-3.5 w-3.5" />واتساب
                            </a>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { deleteAiLead(lead.id); toast({ title: "تم الحذف" }); }}>
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
