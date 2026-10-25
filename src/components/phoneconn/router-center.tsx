"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeader, Terminal, useTerminal } from "./shared";
import { RouterKB } from "./router-kb";
import { RouterAudit } from "./router-audit";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  COMMON_GATEWAYS,
  ADMIN_PORTS,
  GATEWAY_GUIDES,
  extractPrivateIp,
  guessGateways,
} from "@/lib/phoneconn/routers";
import type { PhoneTelemetry } from "@/lib/phoneconn/types";
import {
  Router, Signal, Wifi, WifiOff, Copy, Check, ExternalLink, Info,
  Smartphone, Apple, Laptop, Globe, BatteryCharging, BatteryFull,
  Target, MapPin, Lightbulb, Lock, ScanEye,
} from "lucide-react";

const GATEWAY_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const INITIAL_TEL: PhoneTelemetry = {
  online: true,
  effectiveType: null,
  downlink: null,
  rtt: null,
  saveData: null,
  connectionType: null,
  batteryLevel: null,
  batteryCharging: null,
  localIps: [],
  mdnsHosts: [],
  guessedGateways: [],
  platform: "",
  language: "",
  timezone: "",
};

/* ----------------------------- حقل أعلى الصفحة ----------------------------- */

export function RouterCenter() {
  const [tel, setTel] = useState<PhoneTelemetry>(INITIAL_TEL);
  const [gateway, setGateway] = useState("");
  const [gatewayInput, setGatewayInput] = useState("");
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lines, setLines] = useState<never[]>([]);
  const pushTerm = useTerminal();
  const logActivity = usePhoneConn((s) => s.logActivity);

  /* جمع بيانات الهاتف الحقيقية */
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      const nav = navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
          saveData?: boolean;
          type?: string;
        };
        getBattery?: () => Promise<{ level: number; charging: boolean }>;
      };
      const conn = nav.connection;
      let timezone = "";
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      } catch {
        timezone = "";
      }
      setTel((prev) => ({
        ...prev,
        online: navigator.onLine,
        effectiveType: conn?.effectiveType ?? null,
        downlink: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
        saveData: conn?.saveData ?? null,
        connectionType: conn?.type ?? null,
        platform: nav.platform ?? "",
        language: nav.language ?? "",
        timezone,
      }));

      nav.getBattery?.()
        .then((b) => {
          if (alive) setTel((prev) => ({ ...prev, batteryLevel: b.level, batteryCharging: b.charging }));
        })
        .catch(() => {});
    }, 0);

    /* كشف IP المحلي عبر WebRTC (إن لم يخفه المتصفح) */
    let pc: RTCPeerConnection | null = null;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("probe");
      pc.createOffer()
        .then((o) => pc?.setLocalDescription(o))
        .catch(() => {});
      pc.onicecandidate = (e) => {
        if (!e.candidate || !alive) return;
        const c = e.candidate.candidate;
        const ip = extractPrivateIp(c);
        if (ip) {
          setTel((prev) =>
            prev.localIps.includes(ip) ? prev : { ...prev, localIps: [...prev.localIps, ip] }
          );
        } else {
          const md = c.match(/([a-z0-9-]+\.local)/i);
          if (md) {
            setTel((prev) =>
              prev.mdnsHosts.includes(md[1]) ? prev : { ...prev, mdnsHosts: [...prev.mdnsHosts, md[1]] }
            );
          }
        }
      };
    } catch {
      pc = null;
    }

    const onOn = () => setTel((p) => ({ ...p, online: true }));
    const onOff = () => setTel((p) => ({ ...p, online: false }));
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);

    return () => {
      alive = false;
      clearTimeout(t);
      try {
        pc?.close();
      } catch {
        /* ignore */
      }
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  /* تحميل الراوتر المحفوظ + رابط لوحة التحكم الذي اعتمده المستخدم سابقاً */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const g = window.localStorage.getItem("phoneconn-gateway");
        if (g && GATEWAY_RE.test(g)) {
          setGateway(g);
          setGatewayInput(g);
        }
        const w = window.localStorage.getItem("phoneconn-working-url");
        if (w) setWorkingUrl(w);
      } catch {
        /* private mode */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* تخمين البوابة من IP الهاتف المحلي */
  const suggestions = useMemo(() => {
    const set = new Set<string>();
    for (const ip of tel.localIps) {
      for (const g of guessGateways(ip)) set.add(g);
    }
    return Array.from(set).filter((g) => g !== gateway);
  }, [tel.localIps, gateway]);

  function persistGateway(ip: string) {
    setGateway(ip);
    setGatewayInput(ip);
    setGatewayError(null);
    try {
      window.localStorage.setItem("phoneconn-gateway", ip);
    } catch {
      /* private mode */
    }
    pushTerm(setLines, `gateway set → ${ip}`, "ok");
    logActivity("الراوتر", `تم تحديد عنوان الراوتر: ${ip}`, "info");
  }

  function submitGateway() {
    const v = gatewayInput.trim();
    if (!GATEWAY_RE.test(v)) {
      setGatewayError("أدخل عنوان IPv4 صحيحاً مثل 192.168.1.1");
      return;
    }
    persistGateway(v);
  }

  async function copyIp() {
    if (!gateway) return;
    try {
      await navigator.clipboard.writeText(gateway);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setGatewayError("نسخ تلقائي غير متاح — انسخ العنوان يدوياً: " + gateway);
    }
  }

  function markWorking(url: string) {
    setWorkingUrl(url);
    try {
      window.localStorage.setItem("phoneconn-working-url", url);
    } catch {
      /* private mode */
    }
    pushTerm(setLines, `admin panel reachable via ${url}`, "ok");
    logActivity("لوحة التحكم", `تم تأكيد الوصول إلى اللوحة عبر ${url}`, "low");
  }

  const adminUrls = useMemo(() => {
    if (!gateway) return [];
    return ADMIN_PORTS.map((p) => ({
      ...p,
      url: `${p.scheme}://${gateway}${p.port ? ":" + p.port : ""}`,
    }));
  }, [gateway]);

  return (
    <div className="space-y-6">
      {/* ------------------------------ حالة الهاتف ------------------------------ */}
      <section id="status" className="scroll-mt-20">
        <SectionHeader
          icon={<ScanEye className="w-5 h-5" />}
          title="اتصال هاتفك الحقيقي بالشبكة"
          subtitle="بيانات مباشرة من متصفح هاتفك الآن — لا يمر أي شيء عبر سيرفر خارجي"
          actions={
            <Badge
              variant="outline"
              className={
                tel.online
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 text-xs font-bold"
                  : "bg-red-500/15 text-red-300 border-red-500/40 text-xs font-bold"
              }
            >
              {tel.online ? <Wifi className="w-3.5 h-3.5 me-1" /> : <WifiOff className="w-3.5 h-3.5 me-1" />}
              {tel.online ? "متصل بالإنترنت" : "غير متصل"}
            </Badge>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatMini
            icon={<Signal className="w-4 h-4" />}
            label="جودة الاتصال"
            value={
              tel.effectiveType
                ? ({ "slow-2g": "بطيء جداً", "2g": "2G", "3g": "3G", "4g": "4G / WiFi" }[tel.effectiveType] ?? tel.effectiveType)
                : "غير معروض"
            }
            hint={
              tel.downlink != null
                ? `~${tel.downlink} Mb/s · زمن الاستجابة ${tel.rtt ?? "—"} ms`
                : "متصفحك لا يعرض تفاصيل الاتصال"
            }
          />
          <StatMini
            icon={tel.batteryCharging ? <BatteryCharging className="w-4 h-4" /> : <BatteryFull className="w-4 h-4" />}
            label="بطارية الهاتف"
            value={tel.batteryLevel != null ? `${Math.round(tel.batteryLevel * 100)}%` : "غير معروض"}
            hint={
              tel.batteryCharging != null
                ? tel.batteryCharging ? "قيد الشحن" : "على البطارية"
                : "غير متاح في متصفحك (iOS لا يعرضه)"
            }
          />
          <StatMini
            icon={<MapPin className="w-4 h-4" />}
            label="IP المحلي لهاتفك"
            value={tel.localIps.length ? tel.localIps[0] : "مُخفى"}
            hint={
              tel.localIps.length
                ? tel.localIps.slice(1).join(" · ") || "كشف عبر WebRTC"
                : "iOS/متصفحات حديثة تخفيه خلف mDNS — استخدم دليل العثور على الراوتر"
            }
          />
          <StatMini
            icon={<Globe className="w-4 h-4" />}
            label="منطقتك"
            value={tel.timezone || "—"}
            hint={`${tel.language || "—"} · ${tel.platform || "—"}`}
          />
        </div>

        {suggestions.length > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-wrap items-center gap-2">
            <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-emerald-100/90">
              بناءً على عنوان هاتفك المحلي، الأرجح أن راوترك على أحد هذه العناوين:
            </span>
            {suggestions.map((g) => (
              <Button
                key={g}
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => persistGateway(g)}
              >
                <Target className="w-3 h-3 me-1" />
                {g}
              </Button>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------ تحديد الراوتر ------------------------------ */}
      <section id="gateway" className="scroll-mt-20">
        <SectionHeader
          icon={<Router className="w-5 h-5" />}
          title="الخطوة 1 — حدد عنوان راوترك"
          subtitle="عنوان بوابة شبكتك المحلية (Gateway) هو مدخل لوحة التحكم"
          actions={
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setGuideOpen(true)}>
              <Smartphone className="w-3.5 h-3.5 me-1" />
              كيف أجده؟
            </Button>
          }
        />

        <Card className="border-border/70">
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-xs font-bold text-muted-foreground mb-2">العناوين الأكثر شيوعاً — اضغط للاختيار:</div>
              <div className="flex flex-wrap gap-2">
                {COMMON_GATEWAYS.map((g) => (
                  <button
                    key={g}
                    onClick={() => persistGateway(g)}
                    className={`terminal text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      gateway === g
                        ? "bg-primary/15 border-primary/50 text-primary"
                        : "border-border hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                dir="ltr"
                className="terminal flex-1 bg-black/40"
                placeholder="أو اكتب العنوان يدوياً — مثل 192.168.1.1"
                value={gatewayInput}
                onChange={(e) => {
                  setGatewayInput(e.target.value);
                  setGatewayError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && submitGateway()}
                aria-label="عنوان الراوتر"
              />
              <Button onClick={submitGateway} className="font-bold shrink-0">
                <Check className="w-4 h-4 me-1" />
                اعتماد العنوان
              </Button>
            </div>
            {gatewayError && <p className="text-xs text-red-400">{gatewayError}</p>}

            {gateway && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Router className="w-4 h-4 text-primary" />
                  <span className="text-sm">راوترك المعتمد:</span>
                  <span className="terminal text-primary font-bold">{gateway}</span>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyIp}>
                  {copied ? <Check className="w-3.5 h-3.5 me-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 me-1" />}
                  {copied ? "تم النسخ" : "نسخ العنوان"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------ لوحة التحكم ------------------------------ */}
      <section id="admin" className="scroll-mt-20">
        <SectionHeader
          icon={<ExternalLink className="w-5 h-5" />}
          title="الخطوة 2 — افتح لوحة تحكم الراوتر"
          subtitle="اتصال مباشر من هاتفك إلى الراوتر عبر متصفحك — جرّب الروابط بالترتيب"
        />

        {!gateway ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              اعتمد عنوان الراوتر في الخطوة 1 أولاً لتظهر روابط لوحة التحكم هنا.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {adminUrls.map((a) => (
                <Card
                  key={a.url}
                  className={`border-border/70 ${workingUrl === a.url ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                        {a.label}
                      </Badge>
                      {workingUrl === a.url && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                          <Check className="w-3 h-3 me-1" />
                          يعمل معك
                        </Badge>
                      )}
                    </div>
                    <div className="terminal text-xs text-emerald-300 break-all" dir="ltr">
                      {a.url}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild className="flex-1 h-9 font-bold">
                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 me-1" />
                          افتح اللوحة
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs shrink-0"
                        onClick={() => markWorking(a.url)}
                      >
                        <Check className="w-3.5 h-3.5 me-1" />
                        فتح معي
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/40 p-4">
              <div className="flex items-start gap-2 mb-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-foreground/85">
                  <strong>ماذا تفعل داخل اللوحة؟</strong> راجع بالترتيب: قائمة{" "}
                  <strong>الأجهزة المتصلة</strong> (هل تعرفها كلها؟) ← <strong>كلمة مرور المدير</strong> (غير
                  الافتراضية) ← <strong>التشفير</strong> (WPA2/WPA3) ← <strong>WPS</strong> (عطّله) ←{" "}
                  <strong>الإدارة عن بُعد</strong> (عطّلها) ← <strong>تحديث النظام</strong>. ثم اختبر نفسك في
                  التدقيق الأمني بالأسفل.
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground/80">لماذا لا يفحص الصفحة الراوتر تلقائياً؟</strong> المتصفحات
                  تحميك عمداً: أي صفحة إنترنت (HTTPS) ممنوعة من قراءة استجابات أجهزة شبكتك المحلية (سياسة
                  Mixed-Content وPrivate Network Access). لذا الوصول يتم عبر هذا الزر — متصفحك أنت هو الجسر، وكل
                  شيء يبقى بينك وبين راوترك.
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------ قاعدة معرفة الشركات ------------------------------ */}
      <RouterKB onSelectGateway={persistGateway} />

      {/* ------------------------------ التدقيق الأمني ------------------------------ */}
      <RouterAudit />

      {/* ------------------------------ سجل الجلسة ------------------------------ */}
      <section id="log" className="scroll-mt-20 print:hidden">
        <SectionHeader
          icon={<Laptop className="w-5 h-5" />}
          title="سجل الجلسة"
          subtitle="كل خطوة قمت بها في هذا المركز — تُحفظ في متصفحك فقط"
        />
        <Terminal lines={lines} title="ROUTER CENTER LOG" height="h-32" />
      </section>

      {/* دليل العثور على عنوان الراوتر */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              كيف أجد عنوان راوتري؟
            </DialogTitle>
            <DialogDescription className="text-start">
              اختر نظام جهازك واتبع الخطوات — أو جرّب الأزرار الشائعة أعلاه مباشرة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {GATEWAY_GUIDES.map((g) => (
              <div key={g.platform} className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {g.icon === "smartphone" && <Smartphone className="w-4 h-4 text-primary" />}
                  {g.icon === "apple" && <Apple className="w-4 h-4 text-primary" />}
                  {g.icon === "laptop" && <Laptop className="w-4 h-4 text-primary" />}
                  <span className="text-sm font-bold">{g.platform}</span>
                </div>
                <ol className="space-y-1.5">
                  {g.steps.map((s, i) => (
                    <li key={i} className="text-xs text-foreground/85 flex gap-2 leading-relaxed">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              نصيحة: العنوان مطبوع غالباً على <strong>ملصق أسفل الراوتر</strong> مع بيانات الدخول الافتراضية — لا
              تشارك صورة هذا الملصق مع أي أحد.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- بطاقة إحصائية صغيرة ----------------------------- */

function StatMini({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            {icon}
          </div>
          <span className="text-[11px] text-muted-foreground font-semibold">{label}</span>
        </div>
        <div className="text-lg font-extrabold leading-tight break-all">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{hint}</div>
      </CardContent>
    </Card>
  );
}
