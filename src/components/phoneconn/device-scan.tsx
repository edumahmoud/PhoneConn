"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SectionHeader, Terminal, useTerminal } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  BRAND_PAGE_HINTS, DEFAULT_PAGE_HINTS, ROUTER_BRANDS,
} from "@/lib/phoneconn/routers";
import {
  DEVICE_TYPE_META, MAYBE_TV_VENDORS, lookupMac, normalizeMac,
  subnetIps, detectLanBlocked, scanSubnet,
  type HostProbe,
} from "@/lib/phoneconn/devices";
import type { DeviceEntry, DeviceType } from "@/lib/phoneconn/types";
import {
  MonitorSmartphone, ExternalLink, Plus, Trash2, ScanSearch, Loader2,
  ShieldAlert, Fingerprint, AlertTriangle, Lock, Smartphone,
} from "lucide-react";

const STORAGE_KEY = "phoneconn-devices";
const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$|^[0-9A-Fa-f]{12}$/;
const TYPE_ORDER: DeviceType[] = ["router", "phone", "computer", "tv", "camera", "printer", "iot", "virtual", "unknown"];

export function DeviceScan({ gateway, brandId }: { gateway: string; brandId: string | null }) {
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [name, setName] = useState("");
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [type, setType] = useState<DeviceType>("unknown");
  const [vendor, setVendor] = useState<string | null>(null);
  const [macHint, setMacHint] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lines, setLines] = useState<never[]>([]);
  const pushTerm = useTerminal();
  const logActivity = usePhoneConn((s) => s.logActivity);

  /* حالة الفحص التلقائي */
  const [scanPhase, setScanPhase] = useState<"idle" | "checking" | "blocked" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [found, setFound] = useState<HostProbe[]>([]);

  /* تحميل السجل المحفوظ */
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setDevices(JSON.parse(raw) as DeviceEntry[]);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function persist(next: DeviceEntry[]) {
    setDevices(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }

  /* التعريف الحي أثناء كتابة الـ MAC */
  function onMacChange(v: string) {
    setMac(v);
    setMacHint(null);
    const norm = normalizeMac(v);
    if (norm && (MAC_RE.test(v) || v.replace(/[^0-9a-fA-F]/g, "").length === 12)) {
      const hit = lookupMac(norm);
      if (hit.matched && hit.vendor) {
        setVendor(hit.vendor);
        setType(hit.suggestedType);
        setMacHint(
          hit.randomMac
            ? "انتبه: MAC عشوائي (ميزة خصوصية في iOS/أندرويد) — التعريف قد لا يكون هوية الجهاز الحقيقية"
            : `تم التعريف: ${hit.vendor}`
        );
      } else {
        setVendor(null);
        if (!hit.randomMac) {
          setType("unknown");
          setMacHint("لا يوجد تطابق في قاعدة OUI المختصرة — حدد النوع يدوياً");
        } else {
          setType("unknown");
          setMacHint("MAC عشوائي (ميزة خصوصية iOS/أندرويد الحديثة) — لا يمكن تعريفه");
        }
      }
    }
  }

  function addDevice() {
    if (!name.trim()) {
      setFormError("أدخل اسم الجهاز كما يظهر في قائمة الراوتر (مثل: Android-AABC).");
      return;
    }
    if (mac.trim() && !MAC_RE.test(mac.trim())) {
      setFormError("صيغة MAC غير صحيحة — مثال صحيح: A4:D1:8C:12:34:56");
      return;
    }
    const normMac = mac.trim() ? (normalizeMac(mac) ?? "") : "";
    const finalType: DeviceType = type;
    const entry: DeviceEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      mac: normMac,
      ip: ip.trim(),
      type: finalType,
      vendor,
      addedAt: new Date().toISOString(),
    };
    const next = [...devices, entry];
    persist(next);
    pushTerm(
      setLines,
      `device added: ${entry.name}${entry.mac ? ` [${entry.mac}]` : ""}${entry.vendor ? ` → ${entry.vendor}` : ""}`,
      "ok"
    );
    logActivity("الأجهزة", `سجّلت جهازاً: ${entry.name}${vendor ? ` (${vendor})` : ""}`, "info");
    setName(""); setMac(""); setIp(""); setType("unknown"); setVendor(null); setMacHint(null); setFormError(null);
  }

  function removeDevice(id: string) {
    persist(devices.filter((d) => d.id !== id));
  }

  const breakdown = useMemo(() => {
    const counts = new Map<DeviceType, number>();
    for (const d of devices) counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    return TYPE_ORDER.filter((t) => counts.get(t)).map((t) => ({ type: t, count: counts.get(t) as number }));
  }, [devices]);

  /* ------------------------------ الفحص التلقائي ------------------------------ */
  async function runScan() {
    if (!gateway) return;
    setFound([]);
    setProgress(0);
    setScanPhase("checking");
    pushTerm(setLines, `capability check → http://${gateway}/`, "info");
    const blocked = await detectLanBlocked(gateway);
    if (blocked) {
      setScanPhase("blocked");
      pushTerm(setLines, "LAN probes blocked by browser security (HTTPS → private IP)", "crit");
      logActivity("الأجهزة", "حجب المتصفح الفحص المباشر للشبكة المحلية", "medium");
      return;
    }
    setScanPhase("scanning");
    pushTerm(setLines, `scanning ${gateway.split(".").slice(0, 3).join(".")}.1-254 ...`, "info");
    const ips = subnetIps(gateway).filter((x) => x !== gateway);
    const results = await scanSubnet(ips, (done, total, foundSoFar) => {
      setProgress(Math.round((done / total) * 100));
      setFound(foundSoFar);
    });
    setFound(results);
    setScanPhase("done");
    pushTerm(setLines, `scan finished: ${results.length} responsive host(s)`, results.length ? "ok" : "warn");
    logActivity("الأجهزة", `فحص الشبكة الفرعية: ${results.length} جهاز مستجيب`, "info");
  }

  const brand = brandId ? ROUTER_BRANDS.find((b) => b.id === brandId) : null;
  const hints = brand ? (BRAND_PAGE_HINTS[brand.id] ?? DEFAULT_PAGE_HINTS) : DEFAULT_PAGE_HINTS;

  return (
    <section id="devices" className="scroll-mt-20">
      <SectionHeader
        icon={<MonitorSmartphone className="w-5 h-5" />}
        title="الخطوة 4 — الأجهزة المتصلة بشبكتك"
        subtitle="افتح قائمة الأجهزة من لوحة راوترك، سجّلها هنا، وسيحدد التطبيق نوع كل جهاز من MAC"
      />

      <div className="space-y-3">
        {/* -------------------- 1) أين أجد قائمة الأجهزة؟ -------------------- */}
        <Card className="border-border/70">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-foreground/85">
                <strong>القائمة الرسمية للأجهزة المتصلة عند مزوّدك داخل الراوتر</strong> — هذا هو المصدر الحقيقي
                الوحيد (المتصفح لا يستطيع قراءتها عن بُعد). {brand ? (
                  <>في راوترات <strong>{brand.name}</strong>: {hints.devices}.</>
                ) : (
                  <>{hints.devices}.</>
                )}
              </div>
            </div>
            {gateway ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="h-8 text-xs font-bold">
                  <a href={`http://${gateway}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 me-1" />
                    افتح لوحة {gateway}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href={`https://${gateway}`} target="_blank" rel="noopener noreferrer">
                    عبر HTTPS
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">اعتمد عنوان الراوتر في الخطوة 1 لتظهر أزرار الفتح هنا.</p>
            )}
            {brand && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                بيانات DSL في {brand.name}: {hints.dsl}
              </p>
            )}
          </CardContent>
        </Card>

        {/* -------------------- 2) سجل الأجهزة + تعريف OUI -------------------- */}
        <Card className="border-border/70">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-foreground/85">
                <strong>سجل أجهزتك + التعريف الذكي:</strong> انسخ اسم/عنوان كل جهاز من قائمة الراوتر إلى هنا.
                بإدخال الـ MAC سيحدد التطبيق <strong>الشركة المصنّعة</strong> من قاعدة OUI مدمجة (تعمل دون إنترنت)
                ويقترح <strong>نوع الجهاز</strong> — هاتف، حاسوب، كاميرا، جهاز ذكي...
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الجهاز *" className="h-9 text-xs col-span-2 sm:col-span-1" aria-label="اسم الجهاز" />
              <Input value={mac} onChange={(e) => onMacChange(e.target.value)} dir="ltr" placeholder="MAC — A4:D1:8C:12:34:56" className="terminal h-9 text-xs col-span-2 sm:col-span-1 bg-black/40" aria-label="عنوان MAC" />
              <Input value={ip} onChange={(e) => setIp(e.target.value)} dir="ltr" placeholder="IP — اختياري" className="terminal h-9 text-xs bg-black/40" aria-label="عنوان IP" />
              <Button onClick={addDevice} className="h-9 text-xs font-bold">
                <Plus className="w-3.5 h-3.5 me-1" />
                أضف للسجل
              </Button>
            </div>

            {/* اختيار النوع اليدوي */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">النوع:</span>
              {TYPE_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    type === t
                      ? DEVICE_TYPE_META[t].chip
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {DEVICE_TYPE_META[t].label}
                </button>
              ))}
            </div>

            {macHint && (
              <p className={`text-[11px] leading-relaxed ${macHint.startsWith("تم") ? "text-emerald-300" : "text-amber-300"}`}>
                {macHint}
              </p>
            )}
            {formError && <p className="text-[11px] text-red-400">{formError}</p>}

            {/* ملخص الأنواع */}
            {devices.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {breakdown.map(({ type: t, count }) => (
                  <Badge key={t} variant="outline" className={`text-[10px] ${DEVICE_TYPE_META[t].chip}`}>
                    {DEVICE_TYPE_META[t].label}: {count}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                  الإجمالي: {devices.length}
                </Badge>
              </div>
            )}

            {/* القائمة */}
            {devices.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
                السجل فارغ — أضف جهازاً واحداً على الأقل لتظهر لك خريطة أنواع أجهزة شبكتك.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto terminal-scroll pe-1">
                {devices.map((d) => {
                  const meta = DEVICE_TYPE_META[d.type];
                  const maybeTv = d.vendor && MAYBE_TV_VENDORS.includes(d.vendor) && d.type === "phone";
                  return (
                    <div key={d.id} className="rounded-lg border border-border/70 bg-black/20 p-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold">{d.name}</span>
                          <Badge variant="outline" className={`text-[10px] ${meta.chip}`}>{meta.label}</Badge>
                          {d.vendor && (
                            <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                              {d.vendor}
                            </Badge>
                          )}
                        </div>
                        <div className="terminal text-[10px] text-muted-foreground mt-1" dir="ltr">
                          {[d.ip, d.mac].filter(Boolean).join("  ·  ") || "بدون عنوان"}
                        </div>
                        {maybeTv && (
                          <div className="text-[10px] text-amber-300 mt-1">قد يكون تلفازاً ذكياً — عدّل النوع عند إعادة الإضافة إن لزم.</div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeDevice(d.id)} aria-label={`حذف ${d.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* توجيه جهاز غريب */}
            {devices.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-amber-100/90">
                  <strong>جهاز لا تعرفه في القائمة؟</strong> غيّر كلمة مرور WiFi فوراً من إعدادات الراوتر، فعّل فلتر
                  MAC وأضف أجهزتك المعروفة فقط، ثم راقب هل عاد الظهور. لا تحاول «اختراقه» — الإزالة من الشبكة
                  صلاحيتك من لوحتك أنت.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* -------------------- 3) الفحص التلقائي من المتصفح -------------------- */}
        <Card className="border-border/70">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-start gap-2">
                <ScanSearch className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-foreground/85">
                  <strong>فحص تلقائي متقدم (من متصفحك):</strong> يجرّب الاتصال بكل عنوان في نطاق شبكتك ويكتشف من
                  يرد فعلاً. يعمل بالكامل عندما يكون التطبيق مفتوحاً عبر HTTP داخل شبكتك.
                </div>
              </div>
              <Button onClick={runScan} disabled={!gateway || scanPhase === "checking" || scanPhase === "scanning"} size="sm" className="h-8 text-xs font-bold shrink-0">
                {scanPhase === "checking" || scanPhase === "scanning" ? (
                  <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                ) : (
                  <ScanSearch className="w-3.5 h-3.5 me-1" />
                )}
                {scanPhase === "scanning" ? `يفحص... ${progress}%` : "ابدأ الفحص"}
              </Button>
            </div>

            {(scanPhase === "checking" || scanPhase === "scanning") && (
              <Progress value={scanPhase === "checking" ? 4 : progress} className="h-2" />
            )}

            {scanPhase === "blocked" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-100/90 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Lock className="w-3.5 h-3.5" />
                  متصفحك يمنع الفحص المباشر من صفحة HTTPS
                </div>
                هذا حماية قياسية (Mixed-Content / Private Network Access) وليس خللاً. بدائل تعمل الآن:
                استخدم قائمة الأجهزة الرسمية من لوحة راوترك وسجلها أعلاه — أو شغّل التطبيق محلياً عبر HTTP
                (الخطوة 7) وسيُسمح للفحص بلمس كل عناوين شبكتك فعلياً.
              </div>
            )}

            {(scanPhase === "done" || scanPhase === "scanning") && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Smartphone className="w-3.5 h-3.5" />
                  مستجيبون حتى الآن: {found.length} من أصل 253 عنواناً — البوابة {gateway} محسوبة كراوتر.
                </div>
                <div className="max-h-56 overflow-y-auto terminal-scroll space-y-1.5 pe-1">
                  {found.map((h) => (
                    <div key={h.ip} className="flex items-center justify-between rounded-lg border border-border/70 bg-black/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="terminal text-xs" dir="ltr">{h.ip}</span>
                        {h.ip === gateway && (
                          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/40">راوترك</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {h.state === "open" && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/40">خدمة ويب مفتوحة</Badge>
                        )}
                        {h.state === "alive" && (
                          <Badge variant="outline" className="text-[9px] bg-teal-500/10 text-teal-300 border-teal-500/40">جهاز موجود</Badge>
                        )}
                        <span className="terminal text-[10px] text-muted-foreground" dir="ltr">{h.ms.toFixed(0)}ms</span>
                      </div>
                    </div>
                  ))}
                  {found.length === 0 && scanPhase === "done" && (
                    <p className="text-xs text-muted-foreground text-center border border-dashed border-border rounded-lg p-3">
                      لم يرد أي عنوان على HTTP — طبيعي تماماً: كثير من الأجهزة تتجاهل هذه المحاولة. القائمة الرسمية
                      من لوحة الراوتر تبقى المصدر الأدق.
                    </p>
                  )}
                </div>
              </div>
            )}

            {scanPhase === "idle" && !gateway && (
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                حدد عنوان الراوتر أولاً لتفعيل الفحص التلقائي.
              </div>
            )}

            <Terminal lines={lines} title="DEVICE SCAN LOG" height="h-24" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
