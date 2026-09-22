import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield } from "lucide-react";

const sections = [
  {
    title: "المعلومات التي نجمعها",
    content: "نقوم بجمع المعلومات التي تقدمها لنا مباشرة عند استخدامك لخدماتنا، مثل: الاسم، رقم الهاتف، البريد الإلكتروني، وأي معلومات أخرى تشاركها معنا عند التواصل أو التسجيل في المنصة."
  },
  {
    title: "كيفية استخدام المعلومات",
    content: "نستخدم المعلومات التي نجمعها لتقديم خدماتنا العقارية وتحسينها، والتواصل معك بشأن طلباتك واستفساراتك، وإرسال تحديثات عن العقارات والعروض التي قد تهمك، وضمان أمان المنصة وحماية مستخدميها."
  },
  {
    title: "مشاركة المعلومات",
    content: "لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية. قد نشارك معلوماتك فقط مع شركاء العمل الضروريين لتقديم الخدمة، أو عند الاقتضاء القانوني."
  },
  {
    title: "أمان البيانات",
    content: "نتخذ إجراءات أمنية معقولة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح أو الإتلاف. ومع ذلك، لا يمكن ضمان أمان أي طريقة نقل عبر الإنترنت بنسبة 100%."
  },
  {
    title: "ملفات الارتباط (Cookies)",
    content: "نستخدم ملفات الارتباط لتحسين تجربتك على موقعنا وتذكر تفضيلاتك. يمكنك ضبط متصفحك لرفض ملفات الارتباط، غير أن ذلك قد يؤثر على بعض وظائف الموقع."
  },
  {
    title: "حقوقك",
    content: "يحق لك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت. للقيام بذلك، يرجى التواصل معنا عبر بيانات الاتصال الموضحة على الموقع."
  },
  {
    title: "التغييرات على سياسة الخصوصية",
    content: "قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سيتم إعلامك بأي تغييرات جوهرية عبر نشر السياسة الجديدة على هذه الصفحة مع تحديث تاريخ السريان."
  },
  {
    title: "التواصل معنا",
    content: "إذا كان لديك أي استفسارات أو مخاوف بشأن سياسة الخصوصية هذه، يرجى التواصل معنا عبر البريد الإلكتروني أو من خلال صفحة الاتصال على موقعنا."
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="bg-card border-b border-border py-12 md:py-16">
          <div className="container px-6 text-center">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">سياسة الخصوصية</h1>
            <p className="text-sm text-muted-foreground">آخر تحديث: يونيو 2026</p>
          </div>
        </div>
        <div className="container px-6 py-12">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-card rounded-2xl p-6 border border-border/50 card-luxury">
              <p className="text-sm text-muted-foreground leading-relaxed">
                تلتزم شركة العمودي للتسويق العقاري بحماية خصوصية مستخدميها. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدامك لمنصتنا وخدماتنا.
              </p>
            </div>
            {sections.map((s, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border/50 card-luxury">
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-accent/10 text-accent rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  {s.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
