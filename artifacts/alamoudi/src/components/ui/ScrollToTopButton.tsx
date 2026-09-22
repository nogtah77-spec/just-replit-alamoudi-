import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollUp}
      aria-label="العودة للأعلى"
      className={cn(
        "fixed bottom-5 left-4 z-50 h-9 w-9 rounded-full shadow-lg",
        "flex items-center justify-center",
        "bg-accent text-accent-foreground",
        "hover:scale-110 active:scale-95",
        "transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      tabIndex={visible ? 0 : -1}
    >
      <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}
