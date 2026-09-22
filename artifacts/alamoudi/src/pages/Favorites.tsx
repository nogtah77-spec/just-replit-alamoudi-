import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { useData } from "@/context/DataContext";
import { useUserPrefs } from "@/context/UserPrefsContext";

export default function Favorites() {
  const { properties, propertyTypes, regions } = useData();
  const { favorites } = useUserPrefs();

  const favProps = properties.filter(p => favorites.includes(p.id)).map(p => ({
    ...p,
    typeName: propertyTypes.find(t => t.id === p.typeId)?.name,
    regionName: regions.find(r => r.id === p.regionId)?.name,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background py-12">
        <div className="container px-3 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">المفضلة</h1>
            <p className="text-sm text-muted-foreground">
              {favProps.length > 0 ? `${favProps.length} عقار محفوظ` : "العقارات التي قمت بحفظها للرجوع إليها لاحقاً"}
            </p>
          </div>

          {favProps.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mx-auto mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">لا توجد عقارات مفضلة</h2>
              <p className="text-sm text-muted-foreground mb-6">تصفح العقارات المتاحة وأضف ما يعجبك بالضغط على أيقونة القلب.</p>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
                <Link href="/">تصفح العقارات</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {favProps.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
