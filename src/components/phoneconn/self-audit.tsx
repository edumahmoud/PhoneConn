"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SimBadge, SectionHeader, SeverityBadge } from "./shared";
import type { AuditItem } from "@/lib/phoneconn/types";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  Fingerprint, ScanFace, ShieldCheck, AlertTriangle, Eye, Globe,
  Cpu, MonitorSmartphone, KeyRound, RefreshCw, Play, LockOpen,
} from "lucide-react";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hash32(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return "0x" + h.toString(16).toUpperCase().padStart(8, "0");
}

interface BatteryLike {
  level: number;
  charging: boolean;
}

async function collectAll(): Promise<AuditItem[]> {
  const items: AuditItem[] = [];
  const nav = navigator as Navigator;
  const push = (
    group: string,
    label: string,
    value: string,
    exposure: AuditItem["exposure"],
    tip: string,
    risk: AuditItem["risk"]
  ) => {
    items.push({
      id: `${items.length}`,
      group,
      label,
      value,
      exposure,
      tip,
      risk,
    });
  };

  // 1) User agent + platform
  const ua = nav.userAgent;
  push(
    "هوية الجهاز",
    "User-Agent",
    ua,
    "عام",
    "يُرسل مع كل طلب صفحة — يكشف نظامك ونسخته ومتصفحك. أدوات الخصوصية تعمّمه لمنع التمييز.",
    "medium"
  );
  await sleep(250);

  const platform =
    (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    (nav.platform || "غير معروف");
  push("هوية الجهاز", "المنصة", platform, "عام", "معلومة إضافية عن نظام التشغيل تُستخدم في بناء بصمتك.", "low");
  await sleep(200);

  // 2) Language + timezone
  push("هوية الجهاز", "اللغة", nav.language || "—", "عام", "تُضيّق نطاق البحث عنك جغرافياً.", "low");
  await sleep(200);

  let tz = "—";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = "غير متاح";
  }
  push("هوية الجهاز", "المنطقة الزمنية", tz, "بصمة تعريفية", "المنطقة الزمنية عنصر قوي في البصمة — تدل على موقعك التقريبي دون إذن الموقع.", "medium");
  await sleep(250);

  // 3) Screen
  push("الشاشة", "دقة الشاشة", `${screen.width}×${screen.height} (نسبة ${window.devicePixelRatio.toFixed(2)}x)`, "عام", "جزء من البصمة التعريفية الفريدة.", "low");
  await sleep(200);
  push("الشاشة", "مساحة العرض المتاحة", `${window.innerWidth}×${window.innerHeight}`, "عام", "حجم النافذة يضاف للبصمة.", "low");
  await sleep(200);
  push("الشاشة", "عمق الألوان", `${screen.colorDepth}-bit`, "عام", "عنصر إضافي في البصمة.", "info");
  await sleep(200);

  // 4) Hardware
  push("العتاد", "أنوية المعالج", String(nav.hardwareConcurrency ?? "—"), "عام", "يساعد في تحديد فئة جهازك.", "low");
  await sleep(200);
  const dm = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
  push("العتاد", "ذاكرة الجهاز", dm ? `≈ ${dm} GB` : "غير مُعلن في هذا المتصفح", dm ? "عام" : "يتطلب إذناً", dm ? "معلومة تقديرية يعلنها المتصفح تلقائياً." : "متصفحك يخفي هذه المعلومة — خطوة إيجابية للخصوصية.", dm ? "low" : "info");
  await sleep(200);

  // 5) Battery
  const getBattery = (nav as Navigator & { getBattery?: () => Promise<BatteryLike> }).getBattery;
  if (getBattery) {
    try {
      const b = await getBattery.call(nav);
      push(
        "العتاد",
        "حالة البطارية",
        `${Math.round(b.level * 100)}% ${b.charging ? "(يشحن الآن)" : ""}`,
        "بصمة تعريفية",
        "مستوى البطارية الدقيق عامل تعريف مؤقت قوي — البعض يستخدمه لتتبعك عبر المواقع. فايرفوكس حجب هذه الواجهة لهذا السبب.",
        "medium"
      );
    } catch {
      push("العتاد", "حالة البطارية", "غير متاح", "يتطلب إذناً", "متصفحك يمنع قراءتها — جيد للخصوصية.", "info");
    }
  } else {
    push("العتاد", "حالة البطارية", "الواجهة غير موجودة في متصفحك", "يتطلب إذناً", "متصفحك حجب واجهة البطارية — هذا يقلل البصمة.", "info");
  }
  await sleep(300);

  // 6) Network
  const conn = (nav as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection;
  push(
    "الشبكة",
    "نوع الاتصال",
    conn?.effectiveType ? `${conn.effectiveType} (${conn.downlink ?? "?"} Mb/s تقديري)` : "غير مُعلن في هذا المتصفح",
    conn?.effectiveType ? "عام" : "يتطلب إذناً",
    conn?.effectiveType ? "نوع الشبكة يضاف للبصمة ويكشف أنك على بيانات أو واي فاي." : "متصفحك لا يشارك هذه المعلومة تلقائياً.",
    conn?.effectiveType ? "low" : "info"
  );
  await sleep(250);

  // 7) Cookies + DNT
  push("الشبكة", "ملفات تعريف الارتباط", nav.cookieEnabled ? "مفعّلة" : "معطّلة", "عام", nav.cookieEnabled ? "الكوكيز آلية التتبع التقليدية — حجب طرف ثالث يقلل التتبع." : "معطلة — تصفح أكثر خصوصية لكن بعض المواقع سيتوقف.", nav.cookieEnabled ? "low" : "info");
  await sleep(200);
  const dnt = nav.doNotTrack;
  push("الشبكة", "سياسة عدم التتبع (DNT)", dnt === "1" ? "مفعّلة" : "غير مفعّلة/غير مدعومة", dnt === "1" ? "عام" : "عام", "DNT طلب مجاملتي غير مُلزم قانونياً — لا تعتمد عليه وحده.", "info");
  await sleep(200);

  // 8) Permissions (with user's explicit consent already given by running audit)
  const permNames: PermissionName[] = ["camera", "microphone", "geolocation", "notifications"];
  for (const name of permNames) {
    let state = "غير مدعوم";
    try {
      const p = await navigator.permissions.query({ name });
      state = p.state === "granted" ? "ممنوح سابقاً" : p.state === "prompt" ? "سيسألك عند الطلب" : "مرفوض";
    } catch {
      state = "لا يمكن الاستعلام عنه في هذا المتصفح";
    }
    const labels: Record<string, string> = {
      camera: "إذن الكاميرا",
      microphone: "إذن الميكروفون",
      geolocation: "إذن الموقع",
      notifications: "إذن الإشعارات",
    };
    const tips: Record<string, string> = {
      camera: "راجع المواقع التي منحت كاميرتك — يفضل أن يكون الافتراضي 'سيسألك عند الطلب'.",
      microphone: "الميكروفون الممنوح لموقع مهمل = ثغرة إنصات محتملة.",
      geolocation: "الموقع الأدق حساس — فعّله أثناء الاستخدام فقط للمواقع الموثوقة.",
      notifications: "الإشعارات باب تصيّد شائع — لا تمنحها لمواقع غير موثوقة.",
    };
    const granted = state === "ممنوح سابقاً";
    push("الأذونات", labels[name], state, "يتطلب إذناً", tips[name], granted ? "medium" : "info");
    await sleep(250);
  }

  // 9) WebRTC local IP exposure
  let localIps: string[] = [];
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("audit");
    await pc.setLocalDescription(await pc.createOffer());
    const ips = await new Promise<string[]>((resolve) => {
      const found = new Set<string>();
      const done = () => resolve(Array.from(found));
      const timer = setTimeout(done, 1500);
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) {
          clearTimeout(timer);
          done();
          return;
        }
        const m = ev.candidate.candidate.match(
          /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g
        );
        if (m) m.forEach((ip) => found.add(ip));
      };
    });
    pc.close();
    localIps = ips.filter((ip) => ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172."));
  } catch {
    localIps = [];
  }
  push(
    "الشبكة",
    "WebRTC — عنوان شبكتك الداخلية",
    localIps.length ? localIps.join(" ، ") : "غير مكشوف في متصفحك",
    localIps.length ? "بصمة تعريفية" : "يتطلب إذناً",
    localIps.length
      ? "WebRTC كشف عناوين داخلية لشبكتك دون أي إذن — هذه ثغرة تتبع معروفة، فعّل إعدادات منع تسريب WebRTC أو إضافة تحجبها."
      : "متصفحك يحمي عناوينك الداخلية عبر mDNS — جيد.",
    localIps.length ? "medium" : "info"
  );
  await sleep(300);

  // 10) Canvas fingerprint
  let canvasHash = "غير متاح";
  try {
    const cnv = document.createElement("canvas");
    cnv.width = 240;
    cnv.height = 60;
    const ctx = cnv.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "16px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 100, 30);
      ctx.fillStyle = "#069";
      ctx.fillText("PhoneConn-Audit-١٢٣", 2, 8);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("FP-Test", 4, 24);
      canvasHash = hash32(cnv.toDataURL());
    }
  } catch {
    canvasHash = "غير متاح";
  }
  push(
    "البصمة",
    "بصمة Canvas",
    canvasHash,
    "بصمة تعريفية",
    "رسم خفي بالكانفس ينتج صورة تختلف بين الأجهزة فتصنع معرّفاً ثابتاً دون ملفات. متصفحات مضادة للتتبع تجعلها عشوائية أو موحدة.",
    "high"
  );
  await sleep(300);

  push("البصمة", "نقاط اللمس", String(nav.maxTouchPoints ?? 0), "عام", "دقة شاشة اللمس تدل على نوع الجهاز (هاتف/لوحي/سطح مكتب).", "info");
  await sleep(200);

  return items;
}

const EXPOSURE_STYLE: Record<AuditItem["exposure"], string> = {
  "عام": "bg-red-500/15 text-red-300 border-red-500/40",
  "يتطلب إذناً": "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  "بصمة تعريفية": "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

export function SelfAudit() {
  const logActivity = usePhoneConn((s) => s.logActivity);
  const setAuditResult = usePhoneConn((s) => s.setAuditResult);
  const [consented, setConsented] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [done, setDone] = useState(false);

  async function runAudit() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setItems([]);
    setProgress(3);
    const all = await collectAll();
    for (let i = 0; i < all.length; i++) {
      await sleep(120);
      setItems((prev) => [...prev, all[i]]);
      setProgress(Math.round(((i + 1) / all.length) * 100));
    }
    const exposed = all.filter((a) => a.exposure !== "يتطلب إذناً" && a.risk !== "info").length;
    setDone(true);
    setRunning(false);
    setAuditResult(exposed);
    logActivity("التدقيق الذاتي", `تدقيق حقيقي لجهاز المستخدم — ${all.length} نقطة كشف، ${exposed} نقطة قابلة للتتبع`, "medium");
  }

  const groups = Array.from(new Set(items.map((i) => i.group)));
  const fingerprintCount = items.filter((i) => i.exposure === "بصمة تعريفية" || i.exposure === "عام").length;

  return (
    <div>
      <SectionHeader
        icon={<Fingerprint className="w-5 h-5" />}
        title="التدقيق الذاتي — ماذا يرى أي موقع عنك الآن؟"
        subtitle="الوحدة الوحيدة الحقيقية 100% في المنصة: تفحص جهازك أنت (بموافقتك) وتظهر لك معلوماتك التي ترسلها لكل موقع تلقائياً"
        actions={
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
            تدقيق حقيقي — لا محاكاة
          </Badge>
        }
      />

      {!consented ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="font-extrabold text-lg">قبل البدء — موافقة واعية</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  هذه الوحدة تقرأ معلومات جهازك التي يتلقاها <strong className="text-foreground">أي موقع</strong> تزوره تلقائياً:
                  نظام التشغيل، دقة الشاشة، اللغة، المنطقة الزمنية، حالة البطارية، حالة الأذونات، وأكثر. الهدف تعليمي خالص — لتراها بعينك
                  وتفهم حجم انكشافك. كل الفحص يجري <strong className="text-foreground">داخل متصفحك فقط</strong>، ولا يُرسل أي شيء لأي خادم
                  (يمكنك التحقق من كود الصفحة). الفحص يقرأ معلومات معلنة للمواقع أصلاً ولا يفتح كاميرتك أو ميكروفونك.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button className="h-11 font-bold" onClick={() => setConsented(true)}>
                    <Play className="w-4 h-4 me-2" />
                    أفهم — ابدأ التدقيق
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <ScanFace className="w-8 h-8 text-primary" />
                <div>
                  <div className="font-bold text-sm">فحص متصفحك وجهازك الحقيقي</div>
                  <div className="text-[11px] text-muted-foreground">يقرأ المعلومات التي يشاركها متصفحك مع المواقع تلقائياً</div>
                </div>
              </div>
              <Button onClick={runAudit} disabled={running} className="h-10 font-bold">
                {running ? (
                  <>
                    <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                    جارٍ الفحص... {progress}%
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 me-2" />
                    {items.length ? "إعادة التدقيق" : "بدء التدقيق"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {running && <Progress value={progress} className="h-2" />}

          {done && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-red-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <LockOpen className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="text-2xl font-extrabold">{items.filter((i) => i.exposure === "عام").length}</div>
                    <div className="text-[11px] text-muted-foreground">نقطة مكشوفة لكل موقع تلقائياً</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <Fingerprint className="w-8 h-8 text-amber-400" />
                  <div>
                    <div className="text-2xl font-extrabold">{fingerprintCount}</div>
                    <div className="text-[11px] text-muted-foreground">عنصر يساهم في بصمتك الفريدة</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className="text-2xl font-extrabold">{items.filter((i) => i.exposure === "يتطلب إذناً").length}</div>
                    <div className="text-[11px] text-muted-foreground">نقطة محمية تتطلب إذناً صريحاً</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {groups.map((g) => (
            <Card key={g}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {g === "الأذونات" ? <KeyRound className="w-4 h-4 text-primary" /> :
                   g === "البصمة" ? <Fingerprint className="w-4 h-4 text-primary" /> :
                   g === "الشبكة" ? <Globe className="w-4 h-4 text-primary" /> :
                   g === "العتاد" ? <Cpu className="w-4 h-4 text-primary" /> :
                   <MonitorSmartphone className="w-4 h-4 text-primary" />}
                  {g}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items
                  .filter((i) => i.group === g)
                  .map((i) => (
                    <div key={i.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold">{i.label}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`${EXPOSURE_STYLE[i.exposure]} text-[10px]`}>
                            {i.exposure}
                          </Badge>
                          {i.risk !== "info" && <SeverityBadge severity={i.risk} />}
                        </div>
                      </div>
                      <div className="terminal !text-[10px] text-emerald-300/90 bg-black/40 rounded px-2 py-1.5 mb-1.5 break-all" dir="auto">
                        {i.value}
                      </div>
                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                        {i.tip}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}

          {done && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="font-bold text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  الخلاصة العملية لتقليل بصمتك
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                  <li>• استخدم متصفحاً يركز على الخصوصية وفعّل حجب التتبع (Fingerprinting Protection).</li>
                  <li>• لا تمنح أذونات الكاميرا/الميكروفون/الموقع إلا "عند الطلب" للمواقع الموثوقة فقط.</li>
                  <li>• امنع إشعارات المواقع غير الضرورية — باب تصيّد شائع.</li>
                  <li>• فعّل VPN على الشبكات العامة، وتذكر: هذا الفحص نفسه يُجرى على ملايين المواقع دون أن تشعر.</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
