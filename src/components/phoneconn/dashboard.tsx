"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./shared";
import { NAV_ITEMS } from "./chrome";
import type { SectionId } from "./section-types";
import { VIRTUAL_DEVICES, VIRTUAL_NETWORKS, LESSONS } from "@/lib/phoneconn/data";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  LayoutDashboard, Wifi, Smartphone, Fingerprint, GraduationCap,
  FileText, TerminalSquare, Radar, Activity, Brain, ShieldCheck,
  TriangleAlert, ArrowLeft, Target, Lock, Eye, BookOpen,
} from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  wifi: <Wifi className="w-4 h-4" />,
  devices: <Smartphone className="w-4 h-4" />,
  audit: <Fingerprint className="w-4 h-4" />,
  academy: <GraduationCap className="w-4 h-4" />,
  reports: <FileText className="w-4 h-4" />,
};

export function Dashboard({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const activity = usePhoneConn((s) => s.activity);
  const networksScanned = usePhoneConn((s) => s.networksScanned);
  const quizScore = usePhoneConn((s) => s.quizScore);
  const auditDone = usePhoneConn((s) => s.auditCompleted);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/25 relative">
        <div className="absolute inset-0 scan-grid pointer-events-none" />
        <CardContent className="p-6 md:p-8 relative">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/40 text-[10px]">
              <TriangleAlert className="w-3 h-3 me-1" />
              بيئة محاكاة معزولة 100%
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]">
              <ShieldCheck className="w-3 h-3 me-1" />
              للتعليم والتوعية
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight max-w-3xl">
            افهم كيف يُنفَّذ الاختراق السيبراني{" "}
            <span className="text-primary">في بيئة آمنة تماماً</span> — ثم علّم الآخرين كيف يحمون أنفسهم
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3 max-w-2xl">
            مختبر افتراضي متكامل يحاكي شبكات واي فاي وأجهزة أندرويد وiOS بمواردها (كاميرا، شاشة، ملفات، ميكروفون)
            بأزرار اختبار احترافية وشاشات حية — كل شيء يحدث داخل متصفحك ولا يلمس أي جهاز حقيقي. الوحدة الحقيقية الوحيدة
            هي <strong className="text-foreground">التدقيق الذاتي</strong> التي تكشف لك بموافقتك ماذا يرى أي موقع عن جهازك أنت.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button onClick={() => onNavigate("wifi")} className="h-11 font-bold">
              <Radar className="w-4 h-4 me-2" />
              ابدأ من مختبر الشبكات
            </Button>
            <Button variant="outline" onClick={() => onNavigate("audit")} className="h-11 font-bold">
              <Fingerprint className="w-4 h-4 me-2" />
              افحص جهازك الآن (حقيقي)
            </Button>
            <Button variant="outline" onClick={() => onNavigate("academy")} className="h-11 font-bold">
              <BookOpen className="w-4 h-4 me-2" />
              دروس الوعي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wifi className="w-5 h-5" />} value={VIRTUAL_NETWORKS.length} label="شبكات افتراضية جاهزة للفحص" />
        <StatCard icon={<Smartphone className="w-5 h-5" />} value={VIRTUAL_DEVICES.length} label="أجهزة محمولة محاكاة" tone="amber" />
        <StatCard icon={<Activity className="w-5 h-5" />} value={activity.length} label="إجراءات في جلستك" tone="zinc" />
        <StatCard
          icon={<Brain className="w-5 h-5" />}
          value={quizScore !== null ? `${quizScore}/${quizScore === 0 ? quizTotal : quizScore ? quizTotal : quizTotal}` : "—"}
          label="درجة اختبار الوعي"
          tone="emerald"
        />
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-extrabold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          وحدات المنصة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {NAV_ITEMS.filter((n) => n.id !== "dashboard").map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="text-start rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 transition-all p-4 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  {ICONS[item.id]}
                </div>
                <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
              </div>
              <div className="font-bold text-sm mb-1">{item.label}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* How it works + ethics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-primary" />
              كيف تعمل المنصة؟
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5 text-xs leading-relaxed">
              {[
                ["1", "افحص", "شغّل الفحص في مختبر الشبكات لتكتشف الشبكات الافتراضية الست ببروتوكولاتها المختلفة (WEP/WPA/WPA2/WPA3/Open)."],
                ["2", "جرّب", "نفذ سيناريوهات التقاط المصافحة وهجوم القاموس وإلغاء المصادقة على الأجهزة الافتراضية المتصلة."],
                ["3", "اختبر الأجهزة", "انتقل لمختبر الأجهزة وشاهد شاشة الهاتف الافتراضي أثناء سيناريوهات التصيّد والتطبيقات الخبيثة والوصول للموارد."],
                ["4", "افحص نفسك", "شغّل التدقيق الذاتي الحقيقي لترى بصمتك الرقمية بعينك — هذا أهم درس في المنصة."],
                ["5", "تعلم وقيّم", "اقرأ الدروس، اختبر وعيك بالكويز، ثم استخرج تقرير جلستك وقارنه قبل/بعد."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-md bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                    {n}
                  </span>
                  <span>
                    <strong className="text-foreground">{t}: </strong>
                    <span className="text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-amber-500/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              الحدود الأخلاقية والقانونية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs leading-relaxed">
            <p className="text-muted-foreground">
              اختبار اختراق أي جهاز أو شبكة <strong className="text-foreground">حقيقية</strong> دون تصريح مكتوب من مالكها
              يُعد جريمة معلوماتية في معظم الدول العربية والعالم، مهما كانت النية. أما التعلم في بيئة محاكاة فهو الطريق
              الذي تسلكه كل الأكاديميات والمنصات العالمية للوعي الأمني.
            </p>
            <div className="rounded-lg bg-secondary/60 border border-border p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" /> مسارات حقيقية مشروعة بعد التعلم هنا:
              </div>
              <ul className="text-muted-foreground space-y-1 ps-4 list-disc">
                <li>شهادات الاختراق الأخلاقي المعتمدة (OSCP / CEH / Security+).</li>
                <li>مختبرات تدريب قانونية مثل Hack The Box وTryHackMe ببيئات مخصصة للاختراق.</li>
                <li>العمل كمدقق أمني بعقود وبرامج مكافآت (Bug Bounty) رسمية.</li>
              </ul>
            </div>
            <p className="text-muted-foreground">
              وحدة التدقيق الذاتي هنا حقيقية وآمنة لأنها تفحص <strong className="text-foreground">جهازك أنت</strong> بموافقتك —
              استخدمها كأداة إلقاء وتوعية أمام جمهورك مباشرة.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick overview strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold">
              <Eye className="w-4 h-4 text-amber-400" />
              جاهز للاستكشاف
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {networksScanned > 0
                ? `فحصت ${networksScanned} شبكة افتراضية — جرّب الآن مختبر الأجهزة والوصول لمواردها.`
                : `${LESSONS.length} دروس وعي + ${VIRTUAL_NETWORKS.length} شبكات افتراضية + ${VIRTUAL_DEVICES.length} أجهزة محاكاة بانتظارك. ابدأ الفحص من مختبر الشبكات.`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold">
              <Fingerprint className="w-4 h-4 text-primary" />
              التدقيق الذاتي
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {auditDone
                ? "نفذت تدقيقك الأول — أعد الفحص من متصفح آخر وقارن البصمة، ثم شرح النتائج لمن حولك."
                : "لم تنفذه بعد — هذه أهم وحدة للعرض المباشر في الورش التوعوية: ماذا يرى أي موقع عن جهازك؟"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              التقييم
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {quizScore !== null
                ? `نتيجتك ${quizScore}/${quizTotal} — راجع الدروس المرتبطة بالأسئلة الخاطئة وأعد الاختبار.`
                : "اختبر وعيك الأمني بـ 8 أسئلة من سيناريوهات المختبر الحقيقية بعد قراءة الدروس."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
