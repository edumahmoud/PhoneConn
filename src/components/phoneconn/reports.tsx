"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader, SeverityBadge, SEVERITY_META } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import type { Severity } from "@/lib/phoneconn/types";
import { FileText, Printer, Trash2, ClipboardList, ShieldCheck, Activity } from "lucide-react";

export function Reports() {
  const activity = usePhoneConn((s) => s.activity);
  const clearActivity = usePhoneConn((s) => s.clearActivity);
  const networksScanned = usePhoneConn((s) => s.networksScanned);
  const auditDone = usePhoneConn((s) => s.auditCompleted);
  const auditExposed = usePhoneConn((s) => s.auditExposedCount);
  const quizScore = usePhoneConn((s) => s.quizScore);
  const quizTotal = usePhoneConn((s) => s.quizTotal);

  const bySeverity: Record<Severity, number> = {
    info: 0, low: 0, medium: 0, high: 0, critical: 0,
  };
  activity.forEach((a) => {
    bySeverity[a.severity] += 1;
  });

  const dateStr = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  return (
    <div>
      <SectionHeader
        icon={<FileText className="w-5 h-5" />}
        title="تقارير الجلسة التعليمية"
        subtitle="سجل كل ما نفذته في المختبر الافتراضي بهيكل تقرير اختبار اختراق احترافي — أداة لتدريب كتابة التقارير"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="w-3.5 h-3.5 me-1.5" />
            طباعة / تصدير PDF
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Report header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">تقرير مختبر PhoneConn التعليمي</h3>
                  <p className="text-xs text-muted-foreground">
                    جلسة {dateStr()} — بيئة محاكاة معزولة 100% · لا توجد أجهزة حقيقية في نطاق هذا التقرير
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[11px] w-fit">
                <ShieldCheck className="w-3.5 h-3.5 me-1" />
                نطاق الاختبار: افتراضي
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                ["شبكات مفحوصة (محاكاة)", String(networksScanned)],
                ["إجراءات الجلسة", String(activity.length)],
                ["نقاط تدقيق ذاتي", auditDone ? String(auditExposed) : "لم يُنفذ"],
                ["اختبار الوعي", quizScore !== null ? `${quizScore}/${quizTotal}` : "لم يُختبر"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-secondary/50 border border-border p-3">
                  <div className="text-[10px] text-muted-foreground mb-1">{k}</div>
                  <div className="text-xl font-extrabold">{v}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              توزيع الخطورة على إجراءات الجلسة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-2">
            {(Object.keys(SEVERITY_META) as Severity[]).map((sev) => (
              <div key={sev} className="rounded-lg border border-border bg-secondary/40 p-2.5 text-center">
                <div className="text-lg font-extrabold">{bySeverity[sev]}</div>
                <div className="text-[10px] text-muted-foreground">{SEVERITY_META[sev].label}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              سجل الإجراءات ({activity.length})
            </CardTitle>
            {activity.length > 0 && (
              <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200 print:hidden" onClick={clearActivity}>
                <Trash2 className="w-3.5 h-3.5 me-1" />
                مسح السجل
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
                لم تنفذ أي إجراءات بعد — انتقل إلى المختبرات ونفذ السيناريوهات ليتولد التقرير تلقائياً
              </p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto terminal-scroll">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="terminal !text-[10px] text-muted-foreground shrink-0" dir="ltr">
                        {a.time}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{a.action}</div>
                        <div className="text-[10px] text-muted-foreground">{a.section}</div>
                      </div>
                    </div>
                    <SeverityBadge severity={a.severity} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations template */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">التوصيات الأمنية المولدة من جلستك</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-xs leading-relaxed list-decimal ps-5 text-foreground/80">
              <li>انتقل إلى كلمات مرور طويلة عشوائية (16+ حرفاً) لكل شبكاتك وأغلق WPS نهائياً — راجع نتائج هجوم القاموس في المختبر.</li>
              <li>فعّل WPA3 أو WPA2-AES على الأقل، واستبدل أي جهاز يدعم WEP فقط مهما كان كلفته.</li>
              <li>راجع أذونات تطبيقات هاتفك شهرياً، واقصر الموقع على "أثناء الاستخدام" — راجع لوحة الموارد في مختبر الأجهزة.</li>
              <li>راقب مؤشرات الوصول للكاميرا/الميكروفون، ولا تثبت تطبيقات خارج المتاجر الرسمية.</li>
              <li>فعّل التحقق بخطوتين عبر تطبيق مصادقة لكل حساباتك المهمة، بدءاً بالبريد الرئيسي.</li>
              <li>قلل بصمتك الرقمية: متصفح يحمي من التتبع + منع WebRTC Leak + حجب الإشعارات غير الموثوقة.</li>
              <li>درّب عائلتك وزملاءك على الدرس الأول: لا أحد يطلب OTP أبداً — لا استثناء.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
