"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimBadge, SectionHeader, Terminal, useTerminal, DefenseNote, SeverityBadge } from "./shared";
import { VIRTUAL_DEVICES } from "@/lib/phoneconn/data";
import type { DeviceScreenState, TerminalLine, VirtualDevice } from "@/lib/phoneconn/types";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  Smartphone, Camera, Mic, MonitorSmartphone, FolderOpen, BellRing, MapPin,
  ShieldCheck, ShieldAlert, Fish, Bug, RotateCcw, BatteryMedium, Cpu, HardDrive,
  Eye, Lock, LockOpen, ListChecks,
} from "lucide-react";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  camera: <Camera className="w-4 h-4" />,
  mic: <Mic className="w-4 h-4" />,
  screen: <MonitorSmartphone className="w-4 h-4" />,
  files: <FolderOpen className="w-4 h-4" />,
  notifications: <BellRing className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
};

function statusStyle(status: string) {
  if (status.startsWith("مخترق")) return "border-red-500/40 bg-red-500/10 text-red-300";
  if (status === "مكشوف") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}

type Compromise = Partial<Record<VirtualDevice["resources"][number]["id"], boolean>>;

function PhoneScreen({
  device,
  state,
  compromised,
  capturedCreds,
}: {
  device: VirtualDevice;
  state: DeviceScreenState;
  compromised: Compromise;
  capturedCreds: string | null;
}) {
  return (
    <div className="mx-auto w-[230px] rounded-[28px] border-2 border-zinc-600/70 bg-black p-2 shadow-2xl shadow-emerald-500/5">
      <div className="rounded-[20px] overflow-hidden bg-gradient-to-b from-zinc-900 to-black min-h-[380px] relative flex flex-col">
        {/* status bar */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-[9px] text-zinc-400 terminal">
          <span dir="ltr">09:41</span>
          <span className="flex items-center gap-1" dir="ltr">
            <BatteryMedium className="w-3 h-3" />
            {device.battery}%
          </span>
        </div>
        {/* privacy indicators (iOS-style) */}
        <div className="absolute top-6 start-3 flex gap-1">
          {compromised.camera && <span className="w-2 h-2 rounded-full bg-green-400 pulse-rec" title="كاميرا نشطة (محاكاة)" />}
          {compromised.mic && <span className="w-2 h-2 rounded-full bg-orange-400 pulse-rec" title="ميكروفون نشط (محاكاة)" />}
        </div>

        <div className="flex-1 px-3 pb-3">
          {state === "lock" && (
            <div className="h-full flex flex-col items-center justify-center py-16 fadeup">
              <div className="text-4xl font-light text-zinc-200 terminal">09:41</div>
              <div className="text-[10px] text-zinc-500 mt-1">شاشة القفل — اسحب للأعلى</div>
              <div className="mt-4 w-16 h-1 rounded-full bg-zinc-600" />
            </div>
          )}

          {state === "home" && (
            <div className="grid grid-cols-4 gap-3 pt-4 fadeup">
              {["📞", "💬", "📷", "🗺️", "🎵", "⚙️", "🏦", "🎮", "📧", "🛒", "📁", "🔒"].map((e, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-lg">
                    {e}
                  </div>
                  <span className="text-[7px] text-zinc-500">app</span>
                </div>
              ))}
            </div>
          )}

          {state === "phishing" && (
            <div className="fadeup">
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-[9px] text-center py-1.5 mb-2 font-bold">
                ⚠ صفحة تصيّد — محاكاة تعليمية
              </div>
              <div className="rounded-xl bg-white/95 p-3 text-black">
                <div className="w-9 h-9 rounded-full bg-amber-500 mx-auto mb-1.5 flex items-center justify-center text-white font-black text-sm">
                  ب
                </div>
                <div className="text-center text-[10px] font-bold mb-2">مصرف البناء الافتراضي</div>
                <div className="terminal !text-[8px] text-red-600 text-center mb-2 break-all" dir="ltr">
                  bank-vfaker-sim.example/login
                </div>
                <div className="space-y-1.5">
                  <div className="rounded border border-zinc-300 px-2 py-1.5 text-[9px] text-zinc-400">اسم المستخدم</div>
                  <div className="rounded border border-zinc-300 px-2 py-1.5 text-[9px] text-zinc-400">كلمة المرور</div>
                  <div className="rounded bg-red-600 text-white text-center py-1.5 text-[9px] font-bold">تسجيل الدخول</div>
                </div>
              </div>
              {capturedCreds && (
                <div className="mt-2 rounded-lg bg-black/70 border border-red-500/40 p-2 terminal !text-[8px] text-red-300 fadeup" dir="ltr">
                  [C2-SIM] POST /grab → creds={capturedCreds}
                </div>
              )}
            </div>
          )}

          {state === "app-perms" && (
            <div className="pt-8 fadeup">
              <div className="rounded-xl bg-zinc-800 border border-zinc-600 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-[10px] font-bold text-zinc-100">PhotoPro-FREE.sim</div>
                    <div className="text-[8px] text-zinc-500">تطبيق من مصدر غير موثوق (محاكاة)</div>
                  </div>
                </div>
                <div className="text-[9px] text-zinc-300 leading-relaxed">
                  يطلب الأذونات التالية:
                  <ul className="mt-1 space-y-0.5 text-[9px] text-amber-300">
                    <li>• الكاميرا والميكروفون</li>
                    <li>• الملفات ووسائط التخزين</li>
                    <li>• بث الشاشة (MediaProjection)</li>
                    <li>• الإشعارات (قراءة OTP)</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                  <div className="rounded bg-zinc-700 text-center py-1.5 text-[9px] text-zinc-400">رفض</div>
                  <div className="rounded bg-emerald-600 text-center py-1.5 text-[9px] text-white font-bold">سماح للكل</div>
                </div>
              </div>
            </div>
          )}

          {state === "camera" && (
            <div className="pt-4 fadeup">
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black h-44 flex items-center justify-center">
                <div className="absolute inset-0 scan-grid" />
                <Eye className="w-10 h-10 text-zinc-600" />
                <div className="absolute top-2 start-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-rec" />
                  <span className="terminal !text-[8px] text-red-400" dir="ltr">REC · C2-SIM</span>
                </div>
              </div>
              <div className="text-[9px] text-zinc-500 text-center mt-2">
                بث الكاميرا إلى خادم وهمي — محاكاة تعليمية
              </div>
            </div>
          )}

          {state === "mirror" && (
            <div className="pt-4 fadeup">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <MonitorSmartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-300">انعكاس الشاشة نشط (محاكاة)</span>
                </div>
                <div className="rounded-lg bg-black border border-zinc-700 p-2 h-32 overflow-hidden">
                  <div className="grid grid-cols-4 gap-1.5 scale-90 origin-top">
                    {["📞", "💬", "📷", "🔒", "🏦", "🎮", "📧", "📁"].map((e, i) => (
                      <div key={i} className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px]">
                        {e}
                      </div>
                    ))}
                  </div>
                  <div className="terminal !text-[7px] text-emerald-500/80 mt-1" dir="ltr">
                    [MIRROR] keystrokes logged → /sim/capture.log
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === "files" && (
            <div className="pt-3 fadeup">
              <div className="text-[9px] font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                متصفح ملفات — وصول خارجي (محاكاة)
              </div>
              <div className="space-y-1">
                {device.files.map((f) => (
                  <div key={f} className="rounded bg-zinc-800/70 border border-zinc-700 px-2 py-1.5 terminal !text-[8px] text-zinc-300 break-all" dir="ltr">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* bottom bar */}
        <div className="pb-2 flex justify-center">
          <div className="w-20 h-1 rounded-full bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}

function DeviceLabInner({ device }: { device: VirtualDevice }) {
  const logActivity = usePhoneConn((s) => s.logActivity);
  const [lines, setLines] = useState<TerminalLine[]>(() => {
    const initLevel: TerminalLine["level"] = device.risk === "مرتفع" ? "warn" : "info";
    return [
      { id: 1, text: `adb -s ${device.mac} shell getprop (جهاز افتراضي متصل بالمختبر)`, level: "dim" },
      { id: 2, text: `device: ${device.name} | os: ${device.os}`, level: "info" },
      { id: 3, text: `risk profile: ${device.risk} — آخر رقعة أمنية: ${device.lastPatch}`, level: initLevel },
    ];
  });
  const [screen, setScreen] = useState<DeviceScreenState>("lock");
  const [compromised, setCompromised] = useState<Compromise>({});
  const [capturedCreds, setCapturedCreds] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const push = useTerminal(3);

  const t = (text: string, level: TerminalLine["level"] = "info") => push(setLines, text, level);

  function markCompromised(ids: Compromise) {
    setCompromised((prev) => ({ ...prev, ...ids }));
  }

  async function flowPhishing() {
    if (busy) return;
    setBusy("phishing");
    setCapturedCreds(null);
    setScreen("phishing");
    t("[SIM] فتح رابط تصيّد داخل متصفح الجهاز الافتراضي...", "warn");
    await sleep(1500);
    t("[SIM] الضحية أدخل بياناتها في صفحة المصرف المزيفة", "warn");
    await sleep(1200);
    setCapturedCreds("user=mo.salah&pass=P@ssw0rd2024");
    t("[C2-SIM] credentials captured: user=mo.salah pass=P@ssw0rd2024", "crit");
    t("الدرس: الصفحة المزيفة مطابقة للأصل 99% — تحقق من الرابط دائماً", "info");
    logActivity("مختبر الأجهزة", `محاكاة هجوم تصيّد على ${device.name}`, "high");
    setBusy(null);
  }

  async function flowMaliciousApp() {
    if (busy) return;
    setBusy("app");
    setScreen("app-perms");
    t("[SIM] تثبيت تطبيق PhotoPro-FREE.sim من مصدر خارج المتجر", "warn");
    await sleep(1400);
    t("[SIM] المستخدم منح جميع الأذونات بنقرة واحدة", "warn");
    await sleep(1000);
    markCompromised({ camera: true, mic: true, screen: true, files: true, notifications: true, location: true });
    t("[C2-SIM] exfil: contacts(312) sms(1448) gallery(217) location(60s interval)", "crit");
    t("[C2-SIM] MediaProjection session started — تسجيل الشاشة صامت", "crit");
    t("الدرس: التطبيقات خارج المتاجر الرسمية = أذونات في يدي مجهول", "info");
    logActivity("مختبر الأجهزة", `محاكاة تطبيق خبيث على ${device.name} — الوصول الكامل للموارد`, "critical");
    setBusy(null);
  }

  async function flowCamera() {
    if (busy) return;
    setBusy("camera");
    setScreen("camera");
    markCompromised({ camera: true });
    t("[SIM] استغلال إذن كاميرا لتطبيق لديه وصول نشط في الخلفية", "warn");
    await sleep(1300);
    t("[C2-SIM] camera stream → /sim/stream.mjpg (نمط اختباري — لا صور حقيقية)", "crit");
    t("لاحظ المؤشر الأخضر أعلى الشاشة — هذه وسيلتك لكشف الوصول النشط", "info");
    logActivity("مختبر الأجهزة", `محاكاة وصول للكاميرا على ${device.name}`, "critical");
    setBusy(null);
  }

  async function flowMirror() {
    if (busy) return;
    setBusy("mirror");
    setScreen("mirror");
    markCompromised({ screen: true });
    t("[SIM] جلسة MediaProjection صامتة دون إشعار المستخدم (محاكاة لبرمجية تجسس)", "crit");
    await sleep(1300);
    t("[C2-SIM] screen frames mirrored @ 8fps — keystrokes included", "crit");
    t("الدرس: انعكاس الشاشة يكشف كلمات المرور المكتوبة — راقب مؤشرات النظام", "info");
    logActivity("مختبر الأجهزة", `محاكاة انعكاس شاشة ${device.name}`, "critical");
    setBusy(null);
  }

  async function flowFiles() {
    if (busy) return;
    setBusy("files");
    setScreen("files");
    markCompromised({ files: true });
    t("[SIM] تصفح التخزين عبر جلسة وصول ممنوحة لتطبيق مصاب", "warn");
    await sleep(1100);
    t(`[C2-SIM] ${device.files.length} files indexed — مستندات وصور بروتوكولات البنك مرئية`, "crit");
    t("الدرس: إذن 'الملفات والوسائط' يعني وصولاً شبه كامل لحياتك الرقمية", "info");
    logActivity("مختبر الأجهزة", `محاكاة وصول للملفات على ${device.name}`, "high");
    setBusy(null);
  }

  function resetDevice() {
    setScreen("lock");
    setCompromised({});
    setCapturedCreds(null);
    t("[SIM] تمت استعادة الجهاز الافتراضي لحالته النظيفة (محاكاة Factory Reset)", "ok");
    logActivity("مختبر الأجهزة", `استعادة ${device.name} لحالة نظيفة`, "info");
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* left: device info + actions */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                {device.os.startsWith("iOS") ? "🍎" : "🤖"}
                {device.name}
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    device.risk === "مرتفع"
                      ? "bg-red-500/15 text-red-300 border-red-500/40"
                      : device.risk === "متوسط"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  درجة الخطورة: {device.risk}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  ["النظام", device.os],
                  ["عنوان MAC", device.mac],
                  ["عنوان IP", device.ip],
                  ["التشفير", device.encrypted ? "مفعّل (File-Based)" : "غير مفعّل"],
                  ["قفل الشاشة", device.screenLock],
                  ["آخر رقعة أمنية", device.lastPatch],
                  ["التخزين", `${device.storageUsed} / ${device.storageTotal}`],
                  ["عدد التطبيقات", `${device.apps}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-secondary/50 border border-border p-2.5">
                    <div className="text-muted-foreground text-[10px] mb-1">{k}</div>
                    <div className="terminal !text-[10px] !text-start font-semibold break-all" dir="auto">
                      {v}
                    </div>
                  </div>
                ))}
              </div>

              {/* resources grid */}
              <div>
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-primary" />
                  حالة موارد الجهاز
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {device.resources.map((r) => {
                    const hackedNow = compromised[r.id];
                    const status = hackedNow ? "مخترق (محاكاة)" : r.status;
                    return (
                      <div key={r.id} className={`rounded-lg border p-2.5 ${statusStyle(status)}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {RESOURCE_ICONS[r.id]}
                          <span className="text-[11px] font-bold">{r.label}</span>
                        </div>
                        <div className="text-[10px] font-bold">{status}</div>
                        <div className="text-[9px] opacity-70 leading-snug mt-0.5">{hackedNow ? "جلسة محاكاة نشطة من المختبر" : r.detail}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* attack buttons */}
              <div>
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  سيناريوهات الاختبار (محاكاة آمنة على جهاز افتراضي)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button variant="outline" className="h-10 font-semibold border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={flowPhishing} disabled={!!busy}>
                    <Fish className="w-4 h-4 me-1.5" /> هجوم تصيّد
                  </Button>
                  <Button variant="outline" className="h-10 font-semibold border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={flowMaliciousApp} disabled={!!busy}>
                    <Bug className="w-4 h-4 me-1.5" /> تطبيق خبيث
                  </Button>
                  <Button variant="outline" className="h-10 font-semibold border-orange-500/40 text-orange-300 hover:bg-orange-500/10" onClick={flowCamera} disabled={!!busy}>
                    <Camera className="w-4 h-4 me-1.5" /> اختبار الكاميرا
                  </Button>
                  <Button variant="outline" className="h-10 font-semibold border-orange-500/40 text-orange-300 hover:bg-orange-500/10" onClick={flowMirror} disabled={!!busy}>
                    <MonitorSmartphone className="w-4 h-4 me-1.5" /> انعكاس الشاشة
                  </Button>
                  <Button variant="outline" className="h-10 font-semibold border-amber-500/40 text-amber-300 hover:bg-amber-500/10" onClick={flowFiles} disabled={!!busy}>
                    <FolderOpen className="w-4 h-4 me-1.5" /> الوصول للملفات
                  </Button>
                  <Button variant="outline" className="h-10 font-semibold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" onClick={resetDevice}>
                    <RotateCcw className="w-4 h-4 me-1.5" /> استعادة الجهاز
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* vulnerabilities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                الثغرات المرصودة في الجهاز الافتراضي ({device.vulns.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {device.vulns.map((v) => (
                <div key={v.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="terminal !text-[10px] text-zinc-400 font-bold" dir="ltr">{v.cve}</span>
                    <SeverityBadge severity={v.severity} />
                    <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-500/40">{v.patchState}</Badge>
                  </div>
                  <div className="text-xs font-bold mb-1">{v.name}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{v.description}</p>
                  <div className="text-[11px] text-emerald-300/90 flex gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {v.mitigation}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <DefenseNote
            points={[
              "حدّث نظام الجهاز فور صدور الرقع الأمنية — التأخر أشهر يعني ثغرات معلومة ومفتوحة.",
              "ثبّت التطبيقات من المتاجر الرسمية فقط وراجع الأذونات شهرياً.",
              "راقب مؤشرات الوصول (النقطة الخضراء/البرتقالية) وافصل أي تطبيق يشتبه به.",
              "لا تدخل بيانات بنكية من روابط — استخدم التطبيق الرسمي دائماً.",
              "عند الاشتباه باختراق: افصل عن الشبكة، احتفظ بالملفات المهمة فقط، ثم فرّق الجهاز مصنعياً.",
            ]}
          />
        </div>

        {/* right: phone screen + terminal */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                شاشة الجهاز الافتراضي — Live
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhoneScreen device={device} state={screen} compromised={compromised} capturedCreds={capturedCreds} />
              <div className="flex items-center justify-center gap-2 mt-3">
                {screen === "lock" ? (
                  <Badge variant="outline" className="text-[10px] border-zinc-500/40 text-zinc-400">
                    <Lock className="w-3 h-3 me-1" /> مقفل
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-300">
                    <LockOpen className="w-3 h-3 me-1" /> جلسة محاكاة نشطة
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Terminal lines={lines} title="SIM-DEVICE-CONSOLE — بيئة معزولة 100%" height="h-72" />

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground leading-relaxed">
                <Cpu className="w-4 h-4 text-primary shrink-0" />
                <HardDrive className="w-4 h-4 text-primary shrink-0 hidden" />
                كل ما تراه هنا يحدث داخل بيئة افتراضية في المتصفح — لا اتصال بأي جهاز حقيقي، ولا تُجمع أي بيانات من هاتفك في هذا المختبر.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

export function DeviceLab() {
  const [deviceId, setDeviceId] = useState<string>(VIRTUAL_DEVICES[0].id);
  const device = useMemo(
    () => VIRTUAL_DEVICES.find((d) => d.id === deviceId) ?? VIRTUAL_DEVICES[0],
    [deviceId]
  );

  return (
    <div>
      <SectionHeader
        icon={<Smartphone className="w-5 h-5" />}
        title="مختبر الأجهزة المحمولة الافتراضي"
        subtitle="أجهزة أندرويد وiOS محاكاة بالكامل — افهم كيف تُختبر موارد الجهاز (كاميرا/شاشة/ملفات) وكيف تحصّن جهازك"
        actions={<SimBadge />}
      />

      {/* device selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {VIRTUAL_DEVICES.map((d) => (
          <button
            key={d.id}
            onClick={() => setDeviceId(d.id)}
            className={`rounded-xl border p-3 text-start transition-all ${
              deviceId === d.id
                ? "border-primary/60 bg-primary/10"
                : "border-border hover:border-primary/30 hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{d.os.startsWith("iOS") ? "🍎" : "🤖"}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">خطورة {d.risk}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <DeviceLabInner key={device.id} device={device} />
    </div>
  );
}
