"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SectionHeader, Terminal, StatCard } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import type { ScanDevice, ScanResult, NetworkInfo, DeviceKind } from "@/lib/scanner/network";
import {
  Radar, ShieldCheck, TriangleAlert, Search, Wifi, Router, Smartphone,
  Laptop, Server, Printer, Video, Cpu, Tv, HardDrive, TerminalSquare,
  HelpCircle, Play, RefreshCw, MapPin, Clock, Globe, Network, Info,
  Loader2, ChevronLeft, ShieldAlert, Radio, ScanLine,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

const KIND_ICON: Record<DeviceKind, React.ReactNode> = {
  router: <Router className="w-5 h-5" />,
  phone: <Smartphone className="w-5 h-5" />,
  computer: <Laptop className="w-5 h-5" />,
  server: <Server className="w-5 h-5" />,
  printer: <Printer className="w-5 h-5" />,
  camera: <Video className="w-5 h-5" />,
  iot: <Cpu className="w-5 h-5" />,
  media: <Tv className="w-5 h-5" />,
  nas: <HardDrive className="w-5 h-5" />,
  self: <TerminalSquare className="w-5 h-5" />,
  unknown: <HelpCircle className="w-5 h-5" />,
};

const KIND_TONE: Record<DeviceKind, string> = {
  router: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  phone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  computer: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  server: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
  printer: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
  camera: "text-red-400 bg-red-500/10 border-red-500/30",
  iot: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  media: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  nas: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
  self: "text-primary bg-primary/10 border-primary/30",
  unknown: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
};

const FILTER_GROUPS: { key: string; label: string; kinds: DeviceKind[] }[] = [
  { key: "all", label: "الكل", kinds: [] },
  { key: "router", label: "راوتر / بوابة", kinds: ["router"] },
  { key: "phone", label: "أجهزة محمولة", kinds: ["phone"] },
  { key: "computer", label: "حواسيب وخوادم", kinds: ["computer", "server", "nas", "self"] },
  { key: "smart", label: "أجهزة ذكية ووسائط", kinds: ["iot", "media"] },
  { key: "peripheral", label: "كاميرات وطابعات", kinds: ["camera", "printer"] },
  { key: "unknown", label: "غير محدد", kinds: ["unknown"] },
];

function deviceName(d: ScanDevice): string {
  if (d.isSelf) return "هذا الخادم (الجهاز المشغّل للفحص)";
  if (d.hostname) return d.hostname;
  if (d.isGateway) return "بوابة الشبكة (الراوتر)";
  if (d.vendor) return `جهاز ${d.vendor}`;
  return `جهاز بدون اسم — ${d.ip}`;
}

function latencyLabel(ms: number | null): string {
  if (ms === null) return "لم يستجب لـ ICMP";
  if (ms === 0) return "محلي (أقل من 1ms)";
  return `${ms} ms`;
}

function formatField(label: string, value: React.ReactNode): React.ReactNode {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-bold text-start break-all">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Defense notes per device kind                                       */
/* ------------------------------------------------------------------ */

const KIND_DEFENSE: Partial<Record<DeviceKind, string[]>> = {
  router: [
    "غيّر كلمة مرور لوحة إدارة الراوتر عن الافتراضية فوراً — أول ما يجرّبه أي مهاجم.",
    "حدّث نظام الراوتر (Firmware) لإغلاق الثغرات المعروفة.",
    "أغلق الإدارة عن بُعد (WAN) واتركها داخل الشبكة المحلية فقط.",
  ],
  phone: [
    "فعل وضع MAC العشوائي (Private Wi-Fi Address) لمنع تتبعك بين الشبكات.",
    "افحص قائمة الأجهزة الموثوقة وعطّل ADB عبر الشبكة إذا كان مفتوحاً (منفذ 5555).",
    "لا تقبل مطالب «تثبيت شهادة» أو «إدارة الجهاز» من مصادر غير موثوقة.",
  ],
  computer: [
    "أغلق منافذ المشاركة غير المستخدمة (SMB/RDP) أو قصرها على الشبكة الموثوقة.",
    "استخدم جدار حماية (Firewall) وحدّث نظام التشغيل باستمرار.",
    "لا تشارك مجلداتك على شبكات عامة أبداً.",
  ],
  camera: [
    "كاميرات المراقبة أكثر الأجهزة اختراقاً — غيّر كلمة المرور الافتراضية وحدّث البرنامج.",
    "ضعها في شبكة معزولة (VLAN / Guest) بعيداً عن أجهزتك الشخصية.",
  ],
  iot: [
    "أجهزة IoT عادةً بلا تحديثات أمنية — اعزلها في شبكة ضيوف (Guest Network).",
    "تحقق من إعدادات الخصوصية وأطفئ الخدمات السحابية غير الضرورية.",
  ],
  media: [
    "أجهزة البث (Chromecast/Apple TV) يمكن استغلالها لإرسال محتوى مزعج — اقصرها على شبكتك الموثوقة.",
  ],
  nas: [
    "أجهزة NAS تخزّن بياناتك الحساسة — فعّل المصادقة الثنائية وحدّث النظام.",
    "لا تكشف NAS للإنترنت مباشرة دون VPN.",
  ],
  printer: [
    "الطابعات المتصلة بالشبكة بوابة اختراق كلاسيكية — حدّث برنامجها وأغلق الطباعة عن بُعد.",
  ],
};

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const SCAN_STAGES = [
  "قراءة جدول ARP الحالي للشبكة...",
  "إرسال طلبات ICMP Echo لجميع عناوين النطاق...",
  "قراءة جدول ARP المحدّث واستخراج عناوين MAC...",
  "فحص المنافذ الشائعة على كل جهاز...",
  "البحث العكسي عن أسماء المضيفين (Reverse DNS)...",
  "مطابقة الشركات المصنّعة وتصنيف الأجهزة...",
];

export function LiveScan() {
  const logActivity = usePhoneConn((s) => s.logActivity);

  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [infoError, setInfoError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScanDevice | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load network info once on mount
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/network/info");
        if (!res.ok) throw new Error("info failed");
        setInfo(await res.json());
      } catch {
        setInfoError(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Rotating stage messages while scanning
  useEffect(() => {
    if (scanning) {
      setStage(0);
      stageTimer.current = setInterval(() => {
        setStage((s) => (s + 1) % SCAN_STAGES.length);
      }, 1800);
    } else if (stageTimer.current) {
      clearInterval(stageTimer.current);
      stageTimer.current = null;
    }
    return () => {
      if (stageTimer.current) {
        clearInterval(stageTimer.current);
        stageTimer.current = null;
      }
    };
  }, [scanning]);

  async function runScan(force: boolean) {
    if (scanning) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/network/scan${force ? "?force=1" : ""}`, {
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) throw new Error("scan failed");
      const data: ScanResult = await res.json();
      setResult(data);
      logActivity(
        "فحص حقيقي",
        `مسح الشبكة ${data.info.cidr} — ${data.devices.length} جهاز نشط في ${(data.durationMs / 1000).toFixed(1)} ثانية`,
        "info"
      );
    } catch {
      setError(
        "تعذّر إكمال الفحص. تأكد أن الخادم متصل بشبكة محلية حقيقية وأن أدوات ping/arp متاحة، ثم أعد المحاولة."
      );
    } finally {
      setScanning(false);
    }
  }

  const counts = useMemo(() => {
    const c = { total: 0, phones: 0, computers: 0, routers: 0, smart: 0, peripherals: 0, unknown: 0 };
    for (const d of result?.devices ?? []) {
      c.total++;
      if (d.kind === "phone") c.phones++;
      else if (["computer", "server", "nas", "self"].includes(d.kind)) c.computers++;
      else if (d.kind === "router") c.routers++;
      else if (["iot", "media"].includes(d.kind)) c.smart++;
      else if (["camera", "printer"].includes(d.kind)) c.peripherals++;
      else c.unknown++;
    }
    return c;
  }, [result]);

  const visibleDevices = useMemo(() => {
    const group = FILTER_GROUPS.find((g) => g.key === filter);
    const q = query.trim().toLowerCase();
    return (result?.devices ?? []).filter((d) => {
      const inGroup = !group || group.kinds.length === 0 || group.kinds.includes(d.kind);
      const matches =
        !q ||
        d.ip.includes(q) ||
        (d.mac ?? "").toLowerCase().includes(q) ||
        (d.hostname ?? "").toLowerCase().includes(q) ||
        (d.vendor ?? "").toLowerCase().includes(q) ||
        d.kindLabel.includes(q);
      return inGroup && matches;
    });
  }, [result, filter, query]);

  const terminalLines = useMemo(() => {
    if (!result) return [];
    return result.log.map((text, i) => ({
      id: i + 1,
      text,
      level: (i === result.log.length - 1 && text.includes("اكتمل الفحص") ? "ok" : "info") as
        | "ok"
        | "info",
    }));
  }, [result]);

  const portSummary = (d: ScanDevice): string => {
    if (d.openPorts.length === 0) return "لا توجد منافذ شائعة مفتوحة";
    return d.openPorts
      .map((p) => {
        const idx = d.openPorts.indexOf(p);
        return `${p} (${d.portLabels[idx] ?? "?"})`;
      })
      .join("، ");
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Radar className="w-6 h-6" />}
        title="فحص الشبكة الحقيقي"
        subtitle="اكتشاف فعلي للأجهزة المتصلة بالشبكة التي يعمل عليها الخادم — ARP + ICMP + فحص منافذ + مطابقة الشركات المصنّعة"
        actions={
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={() => runScan(true)} disabled={scanning}>
                <RefreshCw className={`w-4 h-4 me-1.5 ${scanning ? "animate-spin" : ""}`} />
                إعادة الفحص
              </Button>
            )}
            <Button onClick={() => runScan(!result)} disabled={scanning} className="font-bold">
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  جارٍ الفحص...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 me-2" />
                  {result ? "فحص سريع (كاش)" : "بدء الفحص الحقيقي"}
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Authorization notice */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-amber-100/85">
          <strong className="text-amber-300">ملاحظة قانونية:</strong> هذا الفحص يعمل على الشبكة التي يتصل بها
          الخادم فعلياً ويكشف الأجهزة الحقيقية المتصلة بها. استخدمه على <strong className="text-foreground">شبكتك
          الخاصة</strong> أو شبكة لديك <strong className="text-foreground">تصريح مكتوب</strong> باختبارها — هذا
          الفحص استكشافي آمن (مثل تطبيقات Fing) ولا يهاجم أي جهاز، لكن القاعدة الأخلاقية ثابتة: لا تفحص ما لا تملكه.
        </div>
      </div>

      {/* Network info card */}
      <Card className="border-primary/25">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            بطاقة الشبكة المتصلة (بيانات حقيقية من الخادم)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {infoError ? (
            <div className="flex items-center gap-2 text-xs text-red-300">
              <TriangleAlert className="w-4 h-4" />
              تعذّر قراءة معلومات الشبكة من الخادم.
            </div>
          ) : !info ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <InfoTile icon={<Globe className="w-4 h-4" />} label="عنوان IP الحقيقي" value={info.ip} mono />
              <InfoTile icon={<Network className="w-4 h-4" />} label="الواجهة" value={info.iface} />
              <InfoTile icon={<Radio className="w-4 h-4" />} label="نطاق الفحص" value={info.cidr} mono />
              <InfoTile
                icon={<Router className="w-4 h-4" />}
                label="البوابة الافتراضية"
                value={info.gateway ?? "غير محددة"}
                mono
              />
              <InfoTile icon={<MapPin className="w-4 h-4" />} label="عنوان MAC للخادم" value={info.mac ?? "غير متاح"} mono />
              <InfoTile icon={<Wifi className="w-4 h-4" />} label="شبكة WiFi" value={info.ssid ?? "سلكية / غير متاح"} />
            </div>
          )}
          {info && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="bg-secondary/50 text-[10px]">
                النطاق: {info.scanRange} ({info.hostCount} عنوان)
              </Badge>
              <Badge variant="outline" className="bg-secondary/50 text-[10px]">
                اسم الخادم: {info.hostname}
              </Badge>
              <Badge variant="outline" className={info.tools.ping ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]" : "bg-red-500/10 text-red-300 border-red-500/40 text-[10px]"}>
                ping {info.tools.ping ? "متاح" : "غير متاح"}
              </Badge>
              <Badge variant="outline" className={info.tools.arp ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]" : "bg-red-500/10 text-red-300 border-red-500/40 text-[10px]"}>
                arp {info.tools.arp ? "متاح" : "غير متاح"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanning stage */}
      {scanning && (
        <Card className="border-primary/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radar className="w-8 h-8 text-primary animate-pulse" />
                <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-primary">{SCAN_STAGES[stage]}</div>
                <div className="h-2 rounded-full bg-secondary/60 overflow-hidden mt-2">
                  <div className="h-full w-1/3 bg-primary/70 rounded-full scan-progress" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3.5 flex gap-3">
          <TriangleAlert className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-200/90 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!result && !scanning && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-extrabold text-lg mb-2">لم يتم تنفيذ أي فحص بعد</h3>
            <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
              اضغط «بدء الفحص الحقيقي» ليقوم الخادم بمسح نطاق شبكته المحلية عبر Ping Sweep ثم يقرأ جدول ARP
              لاستخراج عناوين MAC، ويفحص المنافذ الشائعة على كل جهاز ليحدد نوعه (هاتف، حاسوب، راوتر، كاميرا،
              جهاز ذكي...) واسمه وشركته المصنّعة — تماماً كما تفعل أدوات اكتشاف الشبكات المعروفة مثل Fing وNmap.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !scanning && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Network className="w-5 h-5" />} value={counts.total} label="أجهزة نشطة مكتشفة" />
            <StatCard icon={<Smartphone className="w-5 h-5" />} value={counts.phones} label="أجهزة محمولة" tone="emerald" />
            <StatCard icon={<Laptop className="w-5 h-5" />} value={counts.computers} label="حواسيب وخوادم" tone="zinc" />
            <StatCard icon={<Router className="w-5 h-5" />} value={counts.routers} label="راوتر / بوابة" tone="amber" />
          </div>

          <Terminal lines={terminalLines} title="SCAN LOG — الناتج الحقيقي من محرك الفحص" height="h-40" />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو IP أو MAC أو الشركة المصنّعة..."
                className="ps-9 h-10 bg-secondary/40"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto terminal-scroll pb-1">
              {FILTER_GROUPS.map((g) => {
                const n =
                  g.key === "all"
                    ? counts.total
                    : (result?.devices ?? []).filter((d) => g.kinds.includes(d.kind)).length;
                return (
                  <button
                    key={g.key}
                    onClick={() => setFilter(g.key)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold border transition-all ${
                      filter === g.key
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {g.label} ({n})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Devices grid */}
          {visibleDevices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                لا توجد أجهزة مطابقة للبحث/التصنيف الحالي.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleDevices.map((d) => (
                <DeviceCard key={d.ip + (d.mac ?? "")} device={d} onOpen={() => setSelected(d)} />
              ))}
            </div>
          )}

          {/* Duration line */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            اكتمل الفحص في {(result.durationMs / 1000).toFixed(1)} ثانية — بدأ {new Date(result.startedAt).toLocaleTimeString("ar-EG")}
          </div>
        </>
      )}

      {/* Educational: how it works */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            كيف يعمل هذا الفحص؟ (دقيقة تعليمية)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2.5 text-xs leading-relaxed">
            {[
              ["1", "قراءة جدول ARP", "كل جهاز يتواصل على الشبكة يترك أثراً في جدول ARP الذي يربط عنوان IP بعنوان MAC الفيزيائي — قراءته تكشف الأجهزة التي تحدثت مؤخراً دون أي إرسال."],
              ["2", "Ping Sweep (ICMP)", "يرسل الخادم طلب Echo لكل عنوان في النطاق المحلي (بالتزامن) — من يرد فهو جهاز نشط، ويُسجَّل زمن الاستجابة، وتُملأ جداول ARP لديه."],
              ["3", "Reverse DNS", "محاولة ترجمة العنوان إلى اسم مضيف مسجّل في DNS — يعطي أسماء مثل iPhone-ahmed أو desktop-office1."],
              ["4", "فحص المنافذ (TCP Connect)", "تجربة الاتصال بالمنافذ الشائعة (SSH 22، HTTP 80، ADB 5555، iOS 62078، Chromecast 8009، الطباعة 9100...) — كل منفذ مفتوح دليل على خدمة تعمل."],
              ["5", "مطابقة OUI", "أول 3 بايتات من عنوان MAC مسجّلة عالمياً باسم الشركة المصنّعة (Apple، Samsung، Huawei، Raspberry Pi، Espressif...) — نطابقها مع قاعدة بيانات مدمجة."],
              ["6", "التصنيف الذكي", "يجمع المحرك الأدلة (المنافذ + الشركة + الاسم + هل هو البوابة) لاستنتاج نوع الجهاز — مع عرض أسباب التصنيف بشفافية كاملة في بطاقة كل جهاز."],
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
          <Separator className="my-4" />
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">درس الدفاع: لماذا قد لا تظهر هواتفك؟</span>
            </div>
            <ul className="space-y-1.5">
              {[
                "الهواتف الحديثة (iOS 14+ وAndroid 10+) تستخدم عنوان MAC عشوائياً لكل شبكة — ستراه شركات مصنّعة غير حقيقية أو علامة «MAC عشوائي»، وهذا مثال ممتاز لخصوصية مبنية في النظام.",
                "الأجهزة التي تتجاهل ICMP (الجدار الناري يمنع ping) لن تظهر إلا عبر ARP أو منافذها المفتوحة.",
                "أطفئ WiFi وأعد تشغيله ثم أعد الفحص — الأجهزة النائمة لا ترد على الفحص.",
              ].map((p, i) => (
                <li key={i} className="text-xs text-emerald-100/80 flex gap-2 leading-relaxed">
                  <span className="text-emerald-500 shrink-0">✔</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Device detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${KIND_TONE[selected.kind]}`}>
                    {KIND_ICON[selected.kind]}
                  </span>
                  <span className="break-all">{deviceName(selected)}</span>
                </DialogTitle>
                <DialogDescription className="text-start pt-1">
                  بطاقة اتصال كاملة — كل البيانات الحقيقية المكتشفة عن هذا الجهاز على شبكتك
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-1 divide-y divide-border/60">
                {formatField("التصنيف", (
                  <span className="flex items-center gap-2 justify-end">
                    <Badge variant="outline" className={`${KIND_TONE[selected.kind]} text-[10px]`}>
                      {selected.kindLabel}
                    </Badge>
                    {selected.isSelf && <Badge className="bg-primary text-primary-foreground text-[10px]">هذا الخادم</Badge>}
                    {selected.isGateway && <Badge className="bg-amber-500 text-black text-[10px]">البوابة</Badge>}
                  </span>
                ))}
                {formatField("عنوان IP", <span className="font-mono">{selected.ip}</span>)}
                {formatField("عنوان MAC", selected.mac ? <span className="font-mono">{selected.mac}</span> : "غير معروف (لا يوجد مدخل ARP)")}
                {formatField("الشركة المصنّعة", selected.vendor ?? (selected.randomizedMac ? "غير معروفة — MAC عشوائي" : "غير معروفة"))}
                {formatField("اسم المضيف (Reverse DNS)", selected.hostname ?? "لا يوجد")}
                {formatField("زمن الاستجابة (ICMP)", latencyLabel(selected.latencyMs))}
                {formatField("المنافذ المفتوحة", <span className="font-mono">{portSummary(selected)}</span>)}
                {formatField("خصوصية MAC", selected.randomizedMac ? "مفعّلة — العنوان عشوائي محلياً" : "عنوان دائم (عالمي)")}
              </div>

              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5">
                <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                  <Radar className="w-4 h-4" />
                  لماذا صُنّف هذا الجهاز هكذا؟ (أدلة الفحص)
                </div>
                <ul className="space-y-1.5">
                  {selected.detection.map((d, i) => (
                    <li key={i} className="text-[11px] text-foreground/85 flex gap-2 leading-relaxed">
                      <span className="text-primary shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {KIND_DEFENSE[selected.kind] && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                  <div className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    كيف تحمي هذا النوع من الأجهزة؟
                  </div>
                  <ul className="space-y-1.5">
                    {KIND_DEFENSE[selected.kind]!.map((p, i) => (
                      <li key={i} className="text-[11px] text-emerald-100/85 flex gap-2 leading-relaxed">
                        <span className="text-emerald-500 shrink-0">✔</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button variant="outline" onClick={() => setSelected(null)} className="w-full">
                <ChevronLeft className="w-4 h-4 me-1.5" />
                إغلاق البطاقة
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function InfoTile({
  icon, label, value, mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <div className={`text-xs font-bold break-all ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

function DeviceCard({ device, onOpen }: { device: ScanDevice; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-start rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${KIND_TONE[device.kind]}`}>
            {KIND_ICON[device.kind]}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{deviceName(device)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{device.vendor ?? "شركة غير معروفة"}</div>
          </div>
        </div>
        <Badge variant="outline" className={`${KIND_TONE[device.kind]} text-[10px] shrink-0`}>
          {device.kindLabel}
        </Badge>
      </div>

      <div className="space-y-1.5 text-[11px]" dir="ltr">
        <div className="flex items-center gap-2 font-mono text-foreground/90">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {device.ip}
        </div>
        <div className="flex items-center gap-2 font-mono text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {device.mac ?? "MAC: غير معروف"}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {device.openPorts.length > 0 ? (
          device.openPorts.slice(0, 4).map((p) => (
            <Badge key={p} variant="outline" className="bg-zinc-500/10 text-zinc-300 border-zinc-500/40 text-[10px] font-mono" dir="ltr">
              {p}
            </Badge>
          ))
        ) : (
          <Badge variant="outline" className="bg-secondary/40 text-muted-foreground border-border text-[10px]">
            لا منافذ شائعة مفتوحة
          </Badge>
        )}
        {device.openPorts.length > 4 && (
          <Badge variant="outline" className="bg-secondary/40 text-muted-foreground border-border text-[10px]">
            +{device.openPorts.length - 4}
          </Badge>
        )}
        {device.isSelf && (
          <Badge className="bg-primary text-primary-foreground text-[10px]">هذا الخادم</Badge>
        )}
        {device.isGateway && !device.isSelf && (
          <Badge className="bg-amber-500 text-black text-[10px]">البوابة</Badge>
        )}
        {device.randomizedMac && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]">
            MAC عشوائي (خصوصية)
          </Badge>
        )}
        <Badge variant="outline" className="bg-secondary/40 text-muted-foreground border-border text-[10px] font-mono" dir="ltr">
          {latencyLabel(device.latencyMs)}
        </Badge>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-primary mt-3 group-hover:gap-2 transition-all">
        <ScanLine className="w-3 h-3" />
        عرض بطاقة الاتصال الكاملة
      </div>
    </button>
  );
}
