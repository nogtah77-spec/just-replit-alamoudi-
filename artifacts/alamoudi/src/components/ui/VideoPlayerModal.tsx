import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink, X } from "lucide-react";
import { extractVideoUrl } from "@/lib/videoThumbnail";

// ─── helpers ────────────────────────────────────────────────────────────────

function youtubId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function tiktokId(url: string): string | null {
  const m = url.match(/\/video\/(\d{6,})/);
  return m ? m[1] : null;
}

type Platform = "youtube" | "tiktok" | "other";

function detectPlatform(url: string): Platform {
  if (/youtu(be\.com|\.be)/i.test(url)) return "youtube";
  if (/(^|\.)tiktok\.com/i.test(url)) return "tiktok";
  return "other";
}

// ─── inner players ──────────────────────────────────────────────────────────

function YoutubePlayer({ url }: { url: string }) {
  const id = youtubId(url);
  if (!id) return <FallbackPlayer url={url} />;
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
      title="فيديو العقار"
      className="w-full aspect-video bg-black"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}

function TiktokPlayer({ url }: { url: string }) {
  const local = tiktokId(url);
  const [id, setId] = useState<string | null>(local);
  const [state, setState] = useState<"ready" | "loading" | "failed">(
    local ? "ready" : "loading",
  );

  useEffect(() => {
    const direct = tiktokId(url);
    if (direct) { setId(direct); setState("ready"); return; }
    let cancelled = false;
    setId(null);
    setState("loading");
    fetch(`/api/tiktok/resolve?url=${encodeURIComponent(url)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: { videoId?: string }) => {
        if (cancelled) return;
        if (data.videoId) { setId(data.videoId); setState("ready"); }
        else setState("failed");
      })
      .catch(() => { if (!cancelled) setState("failed"); });
    return () => { cancelled = true; };
  }, [url]);

  if (state === "loading") {
    return (
      <div className="w-full flex items-center justify-center bg-black" style={{ minHeight: 400 }}>
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }
  if (state === "ready" && id) {
    return (
      <iframe
        src={`https://www.tiktok.com/embed/v2/${id}`}
        title="فيديو العقار"
        className="w-full bg-black"
        style={{ minHeight: 500 }}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
    );
  }
  return <FallbackPlayer url={url} />;
}

function FallbackPlayer({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 bg-muted/50 text-center">
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
        <Play className="h-7 w-7 text-accent" />
      </div>
      <div>
        <p className="font-semibold text-foreground">لا يمكن تشغيل هذا الفيديو داخلياً</p>
        <p className="text-sm text-muted-foreground mt-1">اضغط على الزرار أدناه لمشاهدته في موقعه الأصلي</p>
      </div>
      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          فتح الفيديو
        </a>
      </Button>
    </div>
  );
}

// ─── main modal ─────────────────────────────────────────────────────────────

interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
}

export function VideoPlayerModal({ open, onClose, videoUrl }: VideoPlayerModalProps) {
  const url = extractVideoUrl(videoUrl);
  const platform = detectPlatform(url);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden border-0 shadow-2xl"
        style={{ maxWidth: platform === "tiktok" ? 420 : 800, width: "95vw" }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            {platform === "youtube" ? "يوتيوب" : platform === "tiktok" ? "تيك توك" : "فيديو العقار"}
          </span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                فتح في جديد
              </a>
            </Button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* player */}
        {platform === "youtube" && <YoutubePlayer url={url} />}
        {platform === "tiktok" && <TiktokPlayer url={url} />}
        {platform === "other" && <FallbackPlayer url={url} />}
      </DialogContent>
    </Dialog>
  );
}
