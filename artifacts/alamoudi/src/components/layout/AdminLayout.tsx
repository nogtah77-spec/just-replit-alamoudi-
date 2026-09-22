import { ReactNode, useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Button } from "../ui/button";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  agent: "مستشار عقاري",
  customer: "عميل",
};

interface AdminLayoutProps {
  children: ReactNode;
}

function SidebarBrand() {
  return (
    <Link href="/" className="block leading-none whitespace-nowrap">
      <span className="text-lg font-bold text-accent tracking-tight">العمودي</span>
      <span className="text-sm font-light text-sidebar-foreground/70 tracking-wide mr-1.5">للتسويق العقاري</span>
    </Link>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { currentUser, logout } = useAuth();
  const [, navigate] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handler = () => setSheetOpen(true);
    window.addEventListener("open-side-menu", handler);
    return () => window.removeEventListener("open-side-menu", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = currentUser?.name?.trim()?.charAt(0) || "م";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 right-0 border-l border-sidebar-border bg-sidebar">
        <div className="h-16 px-6 border-b border-sidebar-border flex items-center">
          <SidebarBrand />
        </div>
        <AdminSidebar isAdmin={currentUser?.role === "admin"} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:mr-64 min-w-0 w-full">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-[-8px]">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">القائمة</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0 bg-sidebar flex flex-col overflow-hidden">
                <div className="h-16 px-6 border-b border-sidebar-border flex items-center">
                  <SidebarBrand />
                </div>
                <AdminSidebar isAdmin={currentUser?.role === "admin"} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-4 mr-auto">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                {initial}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium leading-none" data-testid="text-current-user">{currentUser?.name || "مستخدم"}</p>
                {currentUser && (
                  <p className="text-xs text-muted-foreground mt-0.5">{roleLabels[currentUser.role] || ""}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" data-testid="button-logout" onClick={handleLogout} title="تسجيل الخروج">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
