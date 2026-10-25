"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./shared";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  Cable, Play, Loader2, Router, Signal, TerminalSquare,
  Download, GitBranch, Laptop, ExternalLink, MapPin,
} from "lucide-react";

interface ProbeResult {
  mode: "direct" | "unavailable";
  reason?: string;
  gateway?: string;
  iface?: string;
  ping?: { ok: boolean; avg: number | null; loss: number | null; error?: string };
  openPorts?: number[];
  banner?: { status: number; server: string; title: string } | null;
  mac?: string | null;
  vendor?: string | null;
  brand?: string | null;
  note?: string;
}

const SELFHOST_STEPS = [
  "على حاسوب داخل شبكتك المنزلية: git clone https://github.com/edumahmoud/PhoneConn.git",
  "ثبّت الحزم: bun install   (أو npm install)",
  "شغّل التطبيق: bun run dev   (أو npm run dev)",
  "افتح العنوان من متصفح هاتفك المتصل بنفس شبكة الواي فاي (مثل http://192.168.1.50:3000)",
  "الآن الخادم داخل شبكتك — فحص «الاتصال المباشر» يتصل براوتر بيتك فعلياً: ping + منافذ + قراءة لوحة الإدارة",
];

export function RouterDirect() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const logActivity = usePhoneConn((s) => s.logActivity);

  async function probe() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/router/probe", { cache: "no-store" });
      const data = (await res.json()) as ProbeResult;
      setResult(data);
      if (data.mode === "direct") {
        logActivity(
          "الاتصال المباشر",
          `بوابة ${data.gateway} · منافذ مفتوحة: ${data.openPorts?.join(", ") || "لا شيء"} · ${data.brand ?? data.vendor ?? "علامة غير معروفة"}`,
          "info"
        );
      }
    } catch {
      setResult({ mode: "unavailable", reason: "تعذر الوصول لنقطة الفحص" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="direct" className="scroll-mt-20">
      <SectionHeader
        icon={<Cable className="w-5 h-5" />}
        title="الخطوة 7 — الاتصال المباشر بالراوتر (وضع محلي)"
        subtitle="ping حقيقي + فحص منافذ + قراءة لوحة الإدارة — يتصل بالراوتر الذي يصل إليه الخادم"
        actions={
          <Button onClick={probe} disabled={loading} className="font-bold">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                يفحص الآن...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 me-1" />
                فحص مباشر الآن
              </>
            )}
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-5 space-y-4">
          {!result && !loading && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              هذا الفحص يُنفَّذ من <strong className="text-foreground">خادم التطبيق</strong> مباشرةً باتصال حقيقي
              (ping + منافذ TCP + قراءة صفحة الإدارة). عند التشغيل السحابي يفحص شبكة الاستضافة؛ لتشخيص{" "}
              <strong className="text-foreground">راوتر بيتك فعلياً</strong> شغّل التطبيق محلياً داخل شبكتك (الخطوات
              بالأسفل) وستصبح كل نتائج هذا القسم اتصالاً مباشراً براوترك.
            </p>
          )}

          {loading && (
            <p className="text-sm text-primary font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              يجري اتصال مباشر: كشف البوابة ← ping ← منافذ ← قراءة اللوحة...
            </p>
          )}

          {result?.mode === "unavailable" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              {result.reason}
            </div>
          )}

          {result?.mode === "direct" && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniStat
                  icon={<Router className="w-4 h-4" />}
                  label="بوابة الشبكة"
                  value={result.gateway ?? "—"}
                  hint={`الواجهة: ${result.iface ?? "—"}`}
                />
                <MiniStat
                  icon={<Signal className="w-4 h-4" />}
                  label="ping للراوتر نفسه"
                  value={result.ping?.ok ? `${result.ping.avg?.toFixed(1)} ms` : "غير متاح"}
                  hint={
                    result.ping?.ok
                      ? `فقد ${(result.ping.loss ?? 0).toFixed(0)}% من 4 حزم`
                      : result.ping?.error ?? ""
                  }
                />
                <MiniStat
                  icon={<GitBranch className="w-4 h-4" />}
                  label="الشركة المصنّعة"
                  value={result.brand ?? result.vendor ?? "غير معروفة"}
                  hint={result.mac ? `MAC: ${result.mac}` : "تعذر قراءة MAC"}
                />
                <MiniStat
                  icon={<TerminalSquare className="w-4 h-4" />}
                  label="لوحة الإدارة (HTTP)"
                  value={result.banner ? `HTTP ${result.banner.status}` : "لا استجابة"}
                  hint={result.banner?.title || result.banner?.server || "—"}
                />
              </div>

              <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-primary" />
                  المنافذ المفتوحة على الراوتر ({result.openPorts?.length ?? 0}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.openPorts && result.openPorts.length > 0 ? (
                    result.openPorts.map((p) => (
                      <Badge key={p} variant="outline" className="terminal text-[11px] bg-emerald-500/10 text-emerald-300 border-emerald-500/40">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">لا توجد منافذ مفتوحة من القائمة المفحوصة — وضع مثالي أمنياً.</span>
                  )}
                </div>
                {result.openPorts?.some((p) => p === 7547) && (
                  <p className="text-[11px] text-amber-300 mt-2">
                    تنبيه: منفذ 7547 (TR-069) مفتوح — يُستخدم لإدارة المزوّد لكنه سبب اختراقات شهيرة؛ اسأل مزوّدك عن تعطيله من الخارج.
                  </p>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">{result.note}</p>
            </div>
          )}

          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Laptop className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">شغّل الفحص المباشر على راوتر بيتك — خطوات بسيطة:</span>
            </div>
            <ol className="space-y-1.5">
              {SELFHOST_STEPS.map((s, i) => (
                <li key={i} className="text-xs text-foreground/85 flex gap-2 leading-relaxed">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="break-all" dir={s.includes("git") || s.includes("bun") || s.includes("http") ? "ltr" : undefined}>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <a href="https://github.com/edumahmoud/PhoneConn" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 me-1" />
                  افتح المستودع
                </a>
              </Button>
              <span className="text-[10px] text-muted-foreground self-center flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                يعمل على Windows / macOS / Linux / Termux
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MiniStat({
  icon, label, value, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-black/20 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="text-lg font-extrabold leading-tight break-all">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed" dir="ltr">{hint}</div>
    </div>
  );
}
