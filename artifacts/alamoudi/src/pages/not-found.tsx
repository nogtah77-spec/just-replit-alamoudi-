import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Compass } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-6">
            <Compass className="h-10 w-10" />
          </div>
          <p className="text-5xl font-extrabold text-accent mb-3 tracking-tight">404</p>
          <h1 className="text-2xl font-bold text-foreground mb-3">الصفحة غير موجودة</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            الصفحة اللي بتدوّر عليها ممكن تكون اتنقلت أو الرابط قديم. تقدر ترجع للرئيسية وتكمّل تصفّح العقارات.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="rounded-full px-7 py-2.5 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-md"
            >
              العودة للرئيسية
            </Link>
            <Link
              href="/consultation"
              className="rounded-full px-7 py-2.5 text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
