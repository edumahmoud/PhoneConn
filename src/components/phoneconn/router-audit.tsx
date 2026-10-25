"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "./shared";
import { AUDIT_CHECKS } from "@/lib/phoneconn/routers";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  ListChecks, ChevronDown, Printer, RotateCcw, ShieldCheck,
  ShieldAlert, ShieldX, HelpCircle,
} from "lucide-react";

const STORAGE_KEY = "phoneconn-audit-v1";

function gradeOf(score: number): { label: string; cls: string; bar: string; icon: React.ReactNode } {
  if (score >= 90)
    return {
      label: "ممتاز — شبكتك في حالة أمان جيدة جداً",
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
      bar: "bg-emerald-500",
      icon: <ShieldCheck className="w-5 h-5" />,
    };
  if (score >= 70)
    return {
      label: "جيد — أغلب الأساسيات سليمة، أكمل الباقي",
      cls: "bg-lime-500/15 text-lime-300 border-lime-500/40",
      bar: "bg-lime-500",
      icon: <ShieldCheck className="w-5 h-5" />,
    };
  if (score >= 40)
    return {
      label: "ضعيف — ثغرات مهمة ما زالت مفتوحة",
      cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
      bar: "bg-amber-500",
      icon: <ShieldAlert className="w-5 h-5" />,
    };
  return {
    label: "خطر — شبكتك سهلة الاختراق، ابدأ بالبنود الحرجة فوراً",
    cls: "bg-red-500/15 text-red-300 border-red-500/40",
    bar: "bg-red-500",
    icon: <ShieldX className="w-5 h-5" />,
  };
}

export function RouterAudit() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [openHelp, setOpenHelp] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const logActivity = usePhoneConn((s) => s.logActivity);

  /* تحميل الحالة المحفوظة */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setChecks(JSON.parse(raw) as Record<string, boolean>);
      } catch {
        /* ignore */
      }
      setLoaded(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function toggle(id: string, v: boolean) {
    setChecks((prev) => {
      const next = { ...prev, [id]: v };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
    const item = AUDIT_CHECKS.find((c) => c.id === id);
    if (item) {
      logActivity(
        "التدقيق",
        `${v ? "تأكيد" : "إلغاء"}: ${item.label}`,
        v ? (item.critical ? "low" : "info") : item.critical ? "critical" : "medium"
      );
    }
  }

  function reset() {
    setChecks({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
    logActivity("التدقيق", "إعادة تعيين التدقيق الأمني", "info");
  }

  const score = useMemo(
    () => AUDIT_CHECKS.reduce((sum, c) => (checks[c.id] ? sum + c.weight : sum), 0),
    [checks]
  );
  const grade = gradeOf(score);
  const doneCount = AUDIT_CHECKS.filter((c) => checks[c.id]).length;

  const pending = useMemo(
    () => AUDIT_CHECKS.filter((c) => !checks[c.id]).sort((a, b) => b.weight - a.weight),
    [checks]
  );

  return (
    <section id="audit" className="scroll-mt-20">
      <SectionHeader
        icon={<ListChecks className="w-5 h-5" />}
        title="التدقيق الأمني لراوترك"
        subtitle="راجع إعدادات راوترك بنداً بنداً واحصل على درجة أمان شبكتك المنزلية"
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 me-1" />
              طباعة التقرير
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5 me-1" />
              إعادة تعيين
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* النتيجة */}
        <Card className="border-border/70 lg:sticky lg:top-20 self-start">
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <div className="text-6xl font-black leading-none tracking-tight">
                {score}
                <span className="text-2xl text-muted-foreground font-bold">/100</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {doneCount} من {AUDIT_CHECKS.length} بنداً مؤكداً
              </div>
            </div>
            <Progress value={score} className="h-2.5" />
            <Badge variant="outline" className={`w-full justify-center py-2 text-xs font-bold ${grade.cls}`}>
              {grade.icon}
              <span className="ms-1.5">{grade.label}</span>
            </Badge>
            {loaded && pending.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-muted-foreground">أولوياتك القادمة:</div>
                {pending.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    <span className={`shrink-0 font-bold ${c.critical ? "text-red-400" : "text-amber-400"}`}>
                      +{c.weight}
                    </span>
                    <span className="text-foreground/85">{c.label}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              تُحفظ إجاباتك في متصفحك فقط — التقرير المطبوع مناسب لمشاركته مع من يدير الراوتر (والديك مثلاً).
            </p>
          </CardContent>
        </Card>

        {/* البنود */}
        <div className="lg:col-span-2 space-y-2.5">
          {AUDIT_CHECKS.map((c) => {
            const checked = !!checks[c.id];
            return (
              <Card
                key={c.id}
                className={`border-border/70 transition-all ${checked ? "bg-emerald-500/5 border-emerald-500/30" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={c.id}
                      checked={checked}
                      onCheckedChange={(v) => toggle(c.id, v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor={c.id} className="flex-1 cursor-pointer">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className={`text-sm font-bold leading-snug ${checked ? "text-emerald-300" : ""}`}>
                          {c.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            c.critical
                              ? "bg-red-500/10 text-red-300 border-red-500/40"
                              : "bg-zinc-500/10 text-zinc-300 border-zinc-500/40"
                          }`}
                        >
                          {c.critical ? "حرج · " : ""}{c.weight} نقطة
                        </Badge>
                      </div>
                      {checked && (
                        <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          مؤكد — نقطة أمان محققة
                        </div>
                      )}
                    </label>
                    <button
                      onClick={() => setOpenHelp(openHelp === c.id ? null : c.id)}
                      className="shrink-0 rounded-md p-1.5 border border-border hover:border-primary/40 hover:text-primary transition-all"
                      aria-label="كيف أفحص هذا البند؟"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${openHelp === c.id ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  {openHelp === c.id && (
                    <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3 flex gap-2">
                      <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground/85 leading-relaxed">{c.help}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
