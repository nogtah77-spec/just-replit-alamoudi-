/**
 * 6 Luxury Default Presets for Login Page Background
 * Curated high-resolution, high-contrast architectural and luxury estate themes.
 */

export interface LoginBackgroundPreset {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  overlayColor: string;
  overlayOpacity: number;
  gradientOpacity: number;
  badge: string;
}

export const LOGIN_BACKGROUND_PRESETS: LoginBackgroundPreset[] = [
  {
    id: "preset-tower",
    title: "برج الأفق الليلي الفاخر",
    description: "إطلالة ساحرة على ناطحات السحاب الحديثة بتناغم فاحم وذهبي",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#10202D",
    overlayOpacity: 70,
    gradientOpacity: 58,
    badge: "فخامة معمارية",
  },
  {
    id: "preset-palace",
    title: "قصر العاصمة الملكي",
    description: "هيبة العمارة النيوكلاسيكية مع الأعمدة الرخامية الفخمة",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#10202D",
    overlayOpacity: 72,
    gradientOpacity: 60,
    badge: "طراز ملكي",
  },
  {
    id: "preset-infinity",
    title: "فيلا إنفينيتي مع الغروب",
    description: "فيلا عصرية مع مسبح إنفينيتي وإطلالة غروب دافئة خلابة",
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#10202D",
    overlayOpacity: 68,
    gradientOpacity: 56,
    badge: "غروب ساحر",
  },
  {
    id: "preset-penthouse",
    title: "بنتهاوس بانورامي فخم",
    description: "صالة استراحة فندقية واسعة بإطلالة بانورامية على أفق المدينة",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#0F172A",
    overlayOpacity: 72,
    gradientOpacity: 62,
    badge: "إطلالة عليا",
  },
  {
    id: "preset-garden",
    title: "فيلا الحدائق المعمارية",
    description: "عمارة زجاجية حديثة تتكامل بسلاسة مع المسطحات الخضراء الهادئة",
    imageUrl: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#10202D",
    overlayOpacity: 72,
    gradientOpacity: 60,
    badge: "طبيعة وزجاج",
  },
  {
    id: "preset-marble",
    title: "ردهة الرخام الملكية",
    description: "مدخل القصور الراقية بأرضيات رخامية عاكسة وثريات إضاءة دافئة",
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1920&q=80",
    overlayColor: "#10202D",
    overlayOpacity: 72,
    gradientOpacity: 60,
    badge: "أناقة القصور",
  },
];
