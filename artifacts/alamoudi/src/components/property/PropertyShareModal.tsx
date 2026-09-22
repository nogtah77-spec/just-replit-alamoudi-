import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Send, Twitter, Facebook, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/BrandIcons";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import { Property, Region } from "@/context/DataContext";

interface PropertyShareModalProps {
  property: Property;
  regionName?: string;
  typeName?: string;
}

export function PropertyShareModal({ property, regionName, typeName }: PropertyShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const rawUrl = typeof window !== "undefined" ? window.location.href : "";
  const propKey = (/^[A-Za-z0-9_-]+$/.test(property.code || "")) ? property.code : property.id;
  const cleanUrl = rawUrl
    ? `${window.location.origin}/properties/${propKey}`
    : "";

  const shareText = `🏡 *${property.title || property.code}*
🏷️ كود العقار: ${property.code}
💰 السعر: ${formatNumber(property.price)} ج.م
📐 المساحة: ${property.area} م²
📍 الموقع: ${regionName || "مصر"}${typeName ? `\n🏢 النوع: ${typeName}` : ""}

🔗 للمعاينة والتفاصيل:
${cleanUrl}`;

  const url = cleanUrl;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "تم نسخ رابط العقار بنجاح" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyFormattedText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    toast({ title: "تم نسخ تفاصيل العقار كاملة للمشاركة" });
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleTelegramShare = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, "_blank", "noopener,noreferrer");
  };

  const handleTwitterShare = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${property.title} - كود ${property.code}\n${url}`)}`;
    window.open(twUrl, "_blank", "noopener,noreferrer");
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl border-border/80" title="مشاركة العقار">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md p-5 sm:p-6" dir="rtl">
        <DialogHeader className="text-right border-b pb-3">
          <DialogTitle className="text-base font-bold text-foreground">
            مشاركة بطاقة العقار
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick share buttons */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors"
            >
              <WhatsAppIcon className="h-6 w-6 fill-emerald-600" />
              <span className="text-[11px] font-bold">واتساب</span>
            </button>

            <button
              onClick={handleTelegramShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 transition-colors"
            >
              <Send className="h-5 w-5 text-sky-500" />
              <span className="text-[11px] font-bold">تليجرام</span>
            </button>

            <button
              onClick={handleTwitterShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span className="text-[11px] font-bold">X (تويتر)</span>
            </button>

            <button
              onClick={handleFacebookShare}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-blue-600/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 transition-colors"
            >
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="text-[11px] font-bold">فيسبوك</span>
            </button>
          </div>

          {/* Copy Direct Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">رابط العقار المباشر</label>
            <div className="flex gap-2" dir="ltr">
              <Input value={url} readOnly className="text-xs bg-muted/30 select-all" />
              <Button onClick={handleCopyLink} size="sm" className="gap-1.5 font-bold shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "تم النسخ" : "نسخ الرابط"}
              </Button>
            </div>
          </div>

          {/* Copy Formatted Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">معاينة النص المنسق</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyFormattedText}
                className="h-7 text-xs text-accent font-bold gap-1 px-2 hover:bg-accent/10"
              >
                {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedText ? "تم نسخ النص" : "نسخ تفاصيل العقار"}
              </Button>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line select-all max-h-36 overflow-y-auto">
              {shareText}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
