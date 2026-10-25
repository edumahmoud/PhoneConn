"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionHeader, Terminal, useTerminal } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  bufferbloatTest, downloadTest, uploadTest, latencySuite,
  latencyVerdict, jitterVerdict, speedVerdict, lossVerdict,
  type EfficiencyReport,
} from "@/lib/phoneconn/efficiency";
import {
  Gauge, Play, RotateCcw, Timer, ArrowDownToLine, ArrowUpFromLine,
  Waves, Activity, Lightbulb, Loader2,
} from "lucide-react";

type Phase = "idle" | "latency" | "download" | "upload" | "bloat" | "done" | "error";

const STORAGE_KEY = "phoneconn-efficiency";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "جاهز",
  latency: "قياس زمن الاستجابة والاهتزاز (20 عينة حقيقية)...",
  download: "قياس سرعة التحميل (8MB فعلية)...",
  upload: "قياس سرعة الرفع (2MB فعلية)...",
  bloat: "اختبار ازدحام المخازن أثناء التحميل...",
  done: "اكتمل الفحص",
  error: "تعذّر إكمال الفحص",
};

export function RouterEfficiency() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<EfficiencyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<never[]>([]);
  const pushTerm = useTerminal();
  const logActivity = usePhoneConn((s) => s.logActivity);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setReport(JSON.parse(raw) as EfficiencyReport);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function run() {
    setReport(null);
    setError(null);
    setProgress(2);
    pushTerm(setLines, "starting real connection efficiency test...", "info");
    try {
      /* 1) زمن الاستجابة */
      setPhase("latency");
      let live: number[] = [];
      const latency = await latencySuite("/api/ping", 20, (ms) => {
        if (ms != null) {
          live = [...live, ms];
          setProgress(Math.round(((live.length + 1) / 22) * 100));
        }
      });
      pushTerm(
        setLines,
        `latency: median ${latency.median.toFixed(1)}ms · jitter ${latency.jitter.toFixed(1)}ms · loss ${(latency.loss * 100).toFixed(0)}%`,
        latency.median < 70 ? "ok" : "warn"
      );

      /* 2) التحميل */
      setPhase("download");
      const download = await downloadTest((mbps) => setProgress(30 + Math.min(25, Math.round(mbps / 4))));
      pushTerm(setLines, `download: ${download.mbps.toFixed(1)} Mbps via ${download.endpoint}`, "ok");

      /* 3) الرفع */
      setPhase("upload");
      const upload = await uploadTest();
      pushTerm(setLines, `upload: ${upload.mbps.toFixed(1)} Mbps via ${upload.endpoint}`, "ok");

      /* 4) الازدحام */
      setPhase("bloat");
      setProgress(88);
      const bloat = await bufferbloatTest();
      pushTerm(setLines, `bufferbloat: +${bloat.delta.toFixed(0)}ms under load → ${bloat.grade}`, "info");

      const full: EfficiencyReport = { latency, download, upload, bloat, at: new Date().toISOString() };
      setReport(full);
      setPhase("done");
      setProgress(100);
      logActivity("الكفاءة", `فحص فعلي: ${latency.median.toFixed(0)}ms · ${download.mbps.toFixed(0)}Mbps تحميل · ازدحام ${bloat.grade}`, "info");
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
      } catch {
        /* private mode */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      setError(msg);
      setPhase("error");
      pushTerm(setLines, `error: ${msg}`, "crit");
      logActivity("الكفاءة", `فشل الفحص: ${msg}`, "medium");
    }
  }

  const running = phase !== "idle" && phase !== "done" && phase !== "error";

  return (
    <section id="efficiency" className="scroll-mt-20">
      <SectionHeader
        icon={<Gauge className="w-5 h-5" />}
        title="الخطوة 3 — فحص كفاءة اتصالك فعلياً"
        subtitle="قياسات حقيقية تمر عبر راوترك: الاستجابة، الاهتزاز، الفقد، السرعات، وازدحام المخازن"
        actions={
          <Button onClick={run} disabled={running} className="font-bold">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                جارٍ القياس...
              </>
            ) : report ? (
              <>
                <RotateCcw className="w-4 h-4 me-1" />
                إعادة الفحص
              </>
            ) : (
              <>
                <Play className="w-4 h-4 me-1" />
                ابدأ الفحص الفعلي
              </>
            )}
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-5 space-y-4">
          {phase !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={running ? "text-primary font-bold" : "text-muted-foreground"}>
                  {PHASE_LABEL[phase]}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {phase === "idle" && !report && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              سيجري المتصفح <strong className="text-foreground">قياسات حقيقية</strong> عبر اتصال هاتفك: 20 عينة
              استجابة، تحميل 8 ميغابايت، رفع 2 ميغابايت، ثم قياس الاستجابة أثناء التحميل لكشف ازدحام مخازن الراوتر
              (السبب الخفي وراء تقطّع المكالمات عند التحميل).
            </p>
          )}

          {report && (phase === "done" || phase === "idle") && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                icon={<Timer className="w-4 h-4" />}
                label="زمن الاستجابة (median)"
                value={`${report.latency.median.toFixed(1)} ms`}
                verdict={latencyVerdict(report.latency.median).label}
                vcls={latencyVerdict(report.latency.median).cls}
                hint={`min ${report.latency.min.toFixed(0)} · max ${report.latency.max.toFixed(0)} ms`}
              />
              <MetricCard
                icon={<Waves className="w-4 h-4" />}
                label="الاهتزاز (Jitter)"
                value={`${report.latency.jitter.toFixed(1)} ms`}
                verdict={jitterVerdict(report.latency.jitter).label}
                vcls={jitterVerdict(report.latency.jitter).cls}
                hint="ثبات راوترك تحت الضغط"
              />
              <MetricCard
                icon={<Activity className="w-4 h-4" />}
                label="فقد الحزم"
                value={`${(report.latency.loss * 100).toFixed(0)}%`}
                verdict={lossVerdict(report.latency.loss).label}
                vcls={lossVerdict(report.latency.loss).cls}
                hint="من 20 طلباً فعلياً"
              />
              <MetricCard
                icon={<ArrowDownToLine className="w-4 h-4" />}
                label="سرعة التحميل"
                value={`${report.download.mbps.toFixed(1)} Mbps`}
                verdict={speedVerdict(report.download.mbps).label}
                vcls={speedVerdict(report.download.mbps).cls}
                hint={`8MB عبر ${report.download.endpoint}`}
              />
              <MetricCard
                icon={<ArrowUpFromLine className="w-4 h-4" />}
                label="سرعة الرفع"
                value={`${report.upload.mbps.toFixed(1)} Mbps`}
                verdict={speedVerdict(report.upload.mbps).label}
                vcls={speedVerdict(report.upload.mbps).cls}
                hint={`2MB عبر ${report.upload.endpoint}`}
              />
              <MetricCard
                icon={<Gauge className="w-4 h-4" />}
                label="ازدحام المخازن"
                value={`${report.bloat.grade} (+${report.bloat.delta.toFixed(0)}ms)`}
                verdict={report.bloat.gradeLabel}
                vcls="text-primary"
                hint={`خمول ${report.bloat.idleMedian.toFixed(0)}ms → تحت الحمل ${report.bloat.loadedMedian.toFixed(0)}ms`}
              />
            </div>
          )}

          {report && phase === "done" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">ماذا تعني نتائجك لراوترك؟</span>
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-100/85 leading-relaxed">
                {report.latency.jitter > 20 && (
                  <li>• اهتزاز مرتفع{report.bloat.delta > 50 ? " مع ازدحام واضح" : ""} = تداخل قنوات أو ازدحام أجهزة — جرّب تغيير قناة WiFi أو الانتقال لـ5GHz.</li>
                )}
                {report.bloat.delta > 50 && (
                  <li>• ازدحام مخازن واضح (+{report.bloat.delta.toFixed(0)}ms): فعّل QoS/SQM في راوترك وحدد سقف سرعة أقل قليلاً من خطك ليتولى الراوتر التنظيم بدلاً من الامتلاء.</li>
                )}
                {report.latency.loss > 0.02 && (
                  <li>• فقد حزم {(report.latency.loss * 100).toFixed(0)}% = إشارة ضعيفة أو جهاز يستهلك الشبكة — اقترب من الراوتر وراجع الأجهزة المتصلة.</li>
                )}
                {report.download.mbps < 5 && (
                  <li>• سرعة منخفضة: إن كنت على 2.4GHz فالانتقال إلى 5GHz قد يضاعفها، وتأكد أن كبل الراوتر بالخدمة من المزوّد سليم.</li>
                )}
                {report.bloat.delta <= 20 && report.latency.jitter <= 8 && report.latency.loss === 0 && (
                  <li>• نتائجك ممتازة: راوترك يتعامل مع الحمل بكفاءة — حافظ على تحديث نظامه ومراجعة قائمة الأجهزة دورياً.</li>
                )}
                <li>• القياسات تنعكس على كل ما تفعله: المكالمات، الألعاب، والبث — كلما قلّ الاستجابة والاهتزاز تحسّن كل شيء.</li>
              </ul>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[9px] bg-zinc-500/10 text-zinc-400 border-zinc-500/40">
                  آخر فحص: {new Date(report.at).toLocaleTimeString("ar-EG")}
                </Badge>
                النتائج تُحفظ في متصفحك فقط
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="print:hidden">
            <Terminal lines={lines} title="EFFICIENCY TEST LOG" height="h-28" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({
  icon, label, value, verdict, vcls, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verdict: string;
  vcls: string;
  hint: string;
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
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className={`text-[11px] font-bold ${vcls}`}>{verdict}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
