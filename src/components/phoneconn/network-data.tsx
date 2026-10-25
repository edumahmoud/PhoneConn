"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader, Terminal, useTerminal } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  Globe, Server, MapPin, Network, RotateCcw, Loader2, Wifi, Smartphone,
} from "lucide-react";

interface PublicNetInfo {
  ip: string;
  isp: string | null;
  org: string | null;
  asn: string | null;
  city: string | null;
  country: string | null;
  source: string;
}

export function NetworkData({
  gateway,
  localIp,
  connectionType,
}: {
  gateway: string;
  localIp: string | null;
  connectionType: string | null;
}) {
  const [pub, setPub] = useState<PublicNetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<never[]>([]);
  const pushTerm = useTerminal();
  const logActivity = usePhoneConn((s) => s.logActivity);

  async function load(withLog = true) {
    setLoading(true);
    setError(null);
    try {
      /* 1) ipwho.is — يدعم CORS ويعرض ISP والشبكة */
      let info: PublicNetInfo | null = null;
      try {
        const r = await fetch("https://ipwho.is/", { cache: "no-store" });
        const d = (await r.json()) as {
          success?: boolean; ip?: string; city?: string; country?: string;
          connection?: { isp?: string; org?: string; asn?: number };
        };
        if (d.success !== false && d.ip) {
          info = {
            ip: d.ip,
            isp: d.connection?.isp ?? null,
            org: d.connection?.org ?? null,
            asn: d.connection?.asn ? `AS${d.connection.asn}` : null,
            city: d.city ?? null,
            country: d.country ?? null,
            source: "ipwho.is",
          };
        }
      } catch {
        /* التالي */
      }
      /* 2) ipapi.co بديل */
      if (!info) {
        try {
          const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
          const d = (await r.json()) as {
            ip?: string; city?: string; country_name?: string; org?: string; asn?: string;
          };
          if (d.ip) {
            info = {
              ip: d.ip,
              isp: d.org ?? null,
              org: d.org ?? null,
              asn: d.asn ?? null,
              city: d.city ?? null,
              country: d.country_name ?? null,
              source: "ipapi.co",
            };
          }
        } catch {
          /* التالي */
        }
      }
      /* 3) ipify — عنوان فقط */
      if (!info) {
        const r = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
        const d = (await r.json()) as { ip?: string };
        if (!d.ip) throw new Error("no ip");
        info = { ip: d.ip, isp: null, org: null, asn: null, city: null, country: null, source: "ipify" };
      }
      setPub(info);
      if (withLog) {
        pushTerm(setLines, `public ip: ${info.ip} via ${info.source}${info.isp ? ` · ${info.isp}` : ""}`, "ok");
        logActivity("بيانات الشبكة", `IP العام: ${info.ip}${info.isp ? ` (${info.isp})` : ""}`, "info");
      }
    } catch {
      setError("تعذّر جلب بيانات الإنترنت — تحقق من اتصالك أو أعد المحاولة.");
      pushTerm(setLines, "public ip lookup failed", "warn");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(true), 400);
    return () => clearTimeout(t);
  }, []);

  const subnet = localIp ? localIp.split(".").slice(0, 3).join(".") : null;

  return (
    <section id="network-data" className="scroll-mt-20">
      <SectionHeader
        icon={<Network className="w-5 h-5" />}
        title="الخطوة 3 — بيانات شبكتك الحقيقية"
        subtitle="هويتك على الإنترنت (IP العام ومزود الخدمة) + ملخص شبكتك المحلية"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => load(false)} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 me-1" />}
            تحديث
          </Button>
        }
      />

      <div className="grid md:grid-cols-2 gap-3">
        {/* ------------------------- الإنترنت العام ------------------------- */}
        <Card className="border-border/70">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold">هويتك على الإنترنت</div>
                <div className="text-[10px] text-muted-foreground">قراءة مباشرة من خدمات IP عامة عبر HTTPS</div>
              </div>
            </div>

            {loading && !pub && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> يجلب بيانات IP العام...
              </p>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            {pub && (
              <div className="space-y-2">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="text-[10px] text-muted-foreground mb-1">العنوان العام (Public IP)</div>
                  <div className="terminal text-lg font-extrabold text-primary break-all" dir="ltr">{pub.ip}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoRow label="مزوّد الخدمة" value={pub.isp ?? pub.org ?? "غير معروض"} icon={<Server className="w-3 h-3" />} />
                  <InfoRow label="شبكة / ASN" value={pub.asn ?? "غير معروض"} icon={<Server className="w-3 h-3" />} />
                  <InfoRow label="الموقع التقريبي" value={[pub.city, pub.country].filter(Boolean).join("، ") || "غير معروض"} icon={<MapPin className="w-3 h-3" />} />
                  <InfoRow label="المصدر" value={pub.source} icon={<Globe className="w-3 h-3" />} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  هذا العنوان يراك عليه كل مواقع الإنترنت ويرتبط بمزوّد الخدمة عندك. على الفايبر يتغير نادراً، وعلى
                  بيانات الهاتف يتغير كل اتصال — قارنه بين WiFi و4G لترى الفرق.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------- الشبكة المحلية ------------------------- */}
        <Card className="border-border/70">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold">ملخص شبكتك المحلية</div>
                <div className="text-[10px] text-muted-foreground">من بيانات متصفح هاتفك — لا شيء يُرسل لأي طرف</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoRow label="بوابة الراوتر" value={gateway || "لم تُحدد بعد (الخطوة 1)"} icon={<Network className="w-3 h-3" />} mono />
              <InfoRow label="IP هاتفك المحلي" value={localIp ?? "مخفي بـ mDNS"} icon={<Smartphone className="w-3 h-3" />} mono />
              <InfoRow label="نطاق شبكتك (/24)" value={subnet ? `${subnet}.1 – ${subnet}.254` : "غير مستنتج"} icon={<Network className="w-3 h-3" />} mono />
              <InfoRow label="وسيلة الاتصال" value={mediumLabel(connectionType)} icon={<Wifi className="w-3 h-3" />} />
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground/85">كيف يُقرأ هذا؟</strong> هاتفك حصل على عنوان محلي من الراوتر عبر
              DHCP، والبوابة هي الطريق الوحيد للإنترنت. نطاق الشبكة هو القائمة التي تفحصها الخطوة التالية للعثور على
              الأجهزة المتصلة — وكل عناوينها محجوزة للشبكات الخاصة ولا تظهر للإنترنت.
            </div>

            <Terminal lines={lines} title="NETWORK INFO" height="h-20" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function mediumLabel(t: string | null): string {
  if (!t) return "WiFi / بيانات حسب المتصفح";
  if (t === "wifi") return "شبكة WiFi المحلية";
  if (t === "cellular") return "بيانات الهاتف (خلوي)";
  if (t === "ethernet") return "كابل شبكة";
  return t;
}

function InfoRow({ label, value, icon, mono }: { label: string; value: string; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 bg-black/20 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-xs font-bold break-all ${mono ? "terminal" : ""}`}>{value}</div>
    </div>
  );
}
