"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SectionHeader, Terminal, useTerminal } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import { ROUTER_BRANDS, BRAND_PAGE_HINTS, DEFAULT_PAGE_HINTS } from "@/lib/phoneconn/routers";
import { DSL_MEDIUMS, evaluateDsl } from "@/lib/phoneconn/dsl";
import type { DslInput, DslMedium } from "@/lib/phoneconn/types";
import {
  Cable, Gauge, Info, Timer, Waves, ArrowDownToLine, Ruler,
  LineChart, Loader2,
} from "lucide-react";

const STORAGE_KEY = "phoneconn-dsl";

function num(v: string): number | null {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

export function DslPanel({ brandId }: { brandId: string | null }) {
  const [medium, setMedium] = useState<DslMedium>("adsl2plus");
  const [snr, setSnr] = useState("");
  const [att, setAtt] = useState("");
  const [syncDown, setSyncDown] = useState("");
  const [syncUp, setSyncUp] = useState("");
  const [planDown, setPlanDown] = useState("");
  const [lines, setLines] = useState<never[]>([]);
  const pushTerm = useTerminal();
  const logActivity = usePhoneConn((s) => s.logActivity);
  const [eff, setEff] = useState<{ median: number; mbps: number } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /* تحميل القيم المحفوظة + آخر فحص كفاءة للربط */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw) as DslInput & { savedAt?: string };
          setMedium(d.medium ?? "adsl2plus");
          setSnr(d.snr != null ? String(d.snr) : "");
          setAtt(d.attenuation != null ? String(d.attenuation) : "");
          setSyncDown(d.syncDown != null ? String(d.syncDown) : "");
          setSyncUp(d.syncUp != null ? String(d.syncUp) : "");
          setPlanDown(d.planDown != null ? String(d.planDown) : "");
          setSavedAt(d.savedAt ?? null);
        }
        const effRaw = window.localStorage.getItem("phoneconn-efficiency");
        if (effRaw) {
          const e = JSON.parse(effRaw) as { latency?: { median?: number }; download?: { mbps?: number } };
          if (e.latency?.median != null && e.download?.mbps != null) {
            setEff({ median: e.latency.median, mbps: e.download.mbps });
          }
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const input: DslInput = useMemo(
    () => ({
      medium,
      snr: num(snr),
      attenuation: num(att),
      syncDown: num(syncDown),
      syncUp: num(syncUp),
      planDown: num(planDown),
    }),
    [medium, snr, att, syncDown, syncUp, planDown]
  );

  const hasAny = input.snr != null || input.attenuation != null || input.syncDown != null;
  const evaluation = useMemo(() => evaluateDsl(input), [input]);
  const copper = DSL_MEDIUMS.find((m) => m.id === medium)?.copper ?? true;

  const brand = brandId ? ROUTER_BRANDS.find((b) => b.id === brandId) : null;
  const hint = brand ? (BRAND_PAGE_HINTS[brand.id]?.dsl ?? DEFAULT_PAGE_HINTS.dsl) : DEFAULT_PAGE_HINTS.dsl;

  function save() {
    try {
      const payload = { ...input, savedAt: new Date().toISOString() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSavedAt(payload.savedAt);
      pushTerm(setLines, `dsl record saved: medium=${medium}${input.snr != null ? ` snr=${input.snr}dB` : ""}${input.syncDown != null ? ` sync=${input.syncDown}Mbps` : ""}`, "ok");
      logActivity(
        "بيانات DSL",
        `حفظ بيانات الخط: صحة ${evaluation.health.score}/100 (${evaluation.health.label})`,
        evaluation.health.score >= 65 ? "low" : "medium"
      );
    } catch {
      /* private mode */
    }
  }

  function reset() {
    setSnr(""); setAtt(""); setSyncDown(""); setSyncUp(""); setPlanDown("");
    setSavedAt(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    pushTerm(setLines, "dsl record cleared", "info");
  }

  return (
    <section id="dsl" className="scroll-mt-20">
      <SectionHeader
        icon={<Cable className="w-5 h-5" />}
        title="الخطوة 6 — بيانات خط الإنترنت (DSL / فايبر)"
        subtitle="أدخل أرقام صفحة Status من لوحة راوترك — وسنقيّم صحة خطك فوراً في متصفحك"
      />

      <Card className="border-border/70">
        <CardContent className="p-5 space-y-4">
          {/* ملاحظة: أين أجد الأرقام */}
          <div className="rounded-lg border border-border/70 bg-secondary/40 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-foreground/85">
              <strong>أين أجد هذه الأرقام؟</strong> {brand ? <>في لوحة <strong>{brand.name}</strong>: {hint}</> : hint}.{" "}
              أهم رقمين: <strong>SNR Margin</strong> (قوة الإشارة) و<strong>Line Attenuation</strong> (توهين الخط)،
              مع <strong>سرعة المزامنة</strong> التي تظهر بجانب Speed/Rate.
            </div>
          </div>

          {/* الوسيلة */}
          <div className="flex flex-wrap gap-2">
            {DSL_MEDIUMS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMedium(m.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  medium === m.id
                    ? "bg-primary/15 border-primary/50 text-primary font-bold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* المدخلات */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <NumField label={copper ? "SNR Margin (dB)" : "SNR — لا ينطبق"} value={snr} onChange={setSnr} disabled={!copper} />
            <NumField label={copper ? "Attenuation (dB)" : "التوهين — لا ينطبق"} value={att} onChange={setAtt} disabled={!copper} />
            <NumField label="مزامنة النزول (Mbps)" value={syncDown} onChange={setSyncDown} />
            <NumField label="مزامنة الرفع (Mbps)" value={syncUp} onChange={setSyncUp} />
            <NumField label="سرعة خطتك (Mbps)" value={planDown} onChange={setPlanDown} />
          </div>

          {copper && (
            <p className="text-[10px] text-muted-foreground">
              تُترك خانات الفايبر/4G للأجهزة النحاسية — لو خطك فايبر اكتب سرعة المزامنة فقط وراجع ملاحظة Rx Power في التوصيات.
            </p>
          )}

          {/* النتائج */}
          {!hasAny ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              اكتب أي رقم من صفحة حالة الراوتر ليبدأ التقييم الحي: حكم ملوّن على كل قيمة، أقصى سرعة تقديرية يتحملها
              الخط، طول الكابل التقريبي، ودرجة صحة إجمالية من 100 — كل الحسابات داخل متصفحك ولا شيء يُرسل لأي سيرفر.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {evaluation.snrVerdict && (
                  <ResultCard icon={<Waves className="w-4 h-4" />} label="هامش الإشارة" value={`${input.snr} dB`} verdict={evaluation.snrVerdict.label} vcls={evaluation.snrVerdict.cls} />
                )}
                {evaluation.attVerdict && (
                  <ResultCard icon={<Ruler className="w-4 h-4" />} label="توهين الخط" value={`${input.attenuation} dB`} verdict={evaluation.attVerdict.label} vcls={evaluation.attVerdict.cls} />
                )}
                {evaluation.syncVerdict && input.syncDown != null && (
                  <ResultCard
                    icon={<ArrowDownToLine className="w-4 h-4" />}
                    label="سرعة المزامنة"
                    value={`${input.syncDown} Mbps`}
                    verdict={evaluation.syncVerdict.label}
                    vcls={evaluation.syncVerdict.cls}
                    hint={evaluation.utilization != null ? `استغلال ${Math.round(evaluation.utilization * 100)}%` : undefined}
                  />
                )}
                {evaluation.estMaxRate != null && (
                  <ResultCard
                    icon={<LineChart className="w-4 h-4" />}
                    label="أقصى سرعة تقديرية للخط"
                    value={`≈ ${evaluation.estMaxRate.toFixed(1)} Mbps`}
                    verdict="تقريب تعليمي من SNR — ليس رقماً رسمياً"
                    vcls="text-muted-foreground"
                  />
                )}
                {evaluation.estLineKm != null && (
                  <ResultCard
                    icon={<Ruler className="w-4 h-4" />}
                    label="طول الخط النحاسي التقديري"
                    value={`≈ ${evaluation.estLineKm.toFixed(1)} كم`}
                    verdict="يُحسب من التوهين (~9dB/كم)"
                    vcls="text-muted-foreground"
                  />
                )}
                <ResultCard
                  icon={<Gauge className="w-4 h-4" />}
                  label="صحة الخط الإجمالية"
                  value={`${evaluation.health.score}/100`}
                  verdict={evaluation.health.label}
                  vcls={evaluation.health.cls}
                />
              </div>

              <div className="space-y-1.5">
                <Progress value={evaluation.health.score} className="h-2.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0</span>
                  <span>الدرجة الكلية لبيانات خطك</span>
                  <span>100</span>
                </div>
              </div>

              {/* التوصيات */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="text-sm font-bold text-emerald-300 mb-2">توصيات على أرقامك بالتحديد:</div>
                <ul className="space-y-1.5 text-xs text-emerald-100/85 leading-relaxed">
                  {evaluation.tips.map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>

              {/* الربط مع فحص الكفاءة */}
              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3 flex flex-wrap items-center gap-2 text-[11px]">
                <Timer className="w-3.5 h-3.5 text-primary" />
                {eff ? (
                  <>
                    آخر فحص كفاءة فعلي عندك: استجابة <strong className="terminal">{eff.median.toFixed(0)}ms</strong> ·
                    تحميل <strong className="terminal">{eff.mbps.toFixed(0)} Mbps</strong> — قارنها بمزامنة الخط:
                    فرق كبير يعني المشكلة في الشبكة اللاسلكية أو الراوتر لا في الخط نفسه.
                  </>
                ) : (
                  <>لم تشغّل «فحص الكفاءة» بعد (الخطوة 5) — شغّله لربط أرقام الخط بالأداء الملموس في ألعابك ومكالماتك.</>
                )}
              </div>
            </div>
          )}

          {/* أزرار الحفظ */}
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={save} size="sm" className="h-9 text-xs font-bold">
              حفظ بيانات الخط
            </Button>
            <Button onClick={reset} size="sm" variant="outline" className="h-9 text-xs">
              إعادة تعيين
            </Button>
            {savedAt && (
              <span className="text-[10px] text-muted-foreground self-center flex items-center gap-1">
                <Loader2 className="w-3 h-3 hidden" />
                محفوظ في متصفحك: {new Date(savedAt).toLocaleString("ar-EG")}
              </span>
            )}
          </div>

          <div className="print:hidden">
            <Terminal lines={lines} title="DSL RECORD LOG" height="h-20" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function NumField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-muted-foreground mb-1 font-semibold">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min="0"
        dir="ltr"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="terminal h-9 text-xs bg-black/40"
      />
    </label>
  );
}

function ResultCard({
  icon, label, value, verdict, vcls, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verdict: string;
  vcls: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/70 bg-black/20">
      <CardContent className="p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            {icon}
          </div>
          <span className="text-[11px] text-muted-foreground font-semibold">{label}</span>
        </div>
        <div className="text-2xl font-extrabold leading-none break-all">{value}</div>
        <div className={`text-[11px] font-bold ${vcls}`}>{verdict}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
