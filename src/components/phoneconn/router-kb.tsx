"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./shared";
import { ROUTER_BRANDS } from "@/lib/phoneconn/routers";
import {
  BookOpen, Router, KeyRound, ShieldAlert, ExternalLink, Star,
} from "lucide-react";

export function RouterKB({ onSelectGateway }: { onSelectGateway: (ip: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const brand = useMemo(() => ROUTER_BRANDS.find((b) => b.id === selected) ?? null, [selected]);

  const sorted = useMemo(
    () => [...ROUTER_BRANDS].sort((a, b) => Number(b.popular) - Number(a.popular) || a.name.localeCompare(b.name)),
    []
  );

  return (
    <section id="brands" className="scroll-mt-20">
      <SectionHeader
        icon={<BookOpen className="w-5 h-5" />}
        title="قاعدة معرفة المصنّعين"
        subtitle="عناوين الدخول وبيانات المصنع العامة لكل شركة — من أدلة الاستخدام الرسمية"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {sorted.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              selected === b.id
                ? "bg-primary/15 border-primary/50 text-primary"
                : "border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            {b.popular && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
            {b.name}
          </button>
        ))}
      </div>

      {!brand ? (
        <Card className="border-dashed border-border">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            اختر شركة الراوتر لعرض عناوين لوحة التحكم وبيانات الدخول الافتراضية والملاحظات الأمنية الخاصة بها.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center">
                  <Router className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <div className="font-extrabold leading-none">{brand.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {brand.popular ? "شائع في مصر والمنطقة العربية" : "مصنّع عالمي"}
                    {brand.mobile ? " · يشمل أجهزة MiFi متنقلة" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-muted-foreground mb-2">عناوين لوحة التحكم — اضغط لاعتماده كراوترك:</div>
              <div className="flex flex-wrap gap-2">
                {brand.gateways.map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant="outline"
                    className="terminal h-8 text-xs"
                    onClick={() => onSelectGateway(g)}
                  >
                    <Router className="w-3 h-3 me-1" />
                    {g}
                  </Button>
                ))}
                {brand.adminAliases?.map((alias) => (
                  <a
                    key={alias}
                    href={`http://${alias}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="terminal text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-all inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3 me-1" />
                    {alias}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  بيانات الدخول الافتراضية (تأكد أنك غيّرتها!)
                </span>
              </div>
              <ul className="space-y-1">
                {brand.defaultCreds.map((c, i) => (
                  <li key={i} className="terminal text-[11px] text-amber-100/85" dir="ltr">
                    {c}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-200/60 mt-2 leading-relaxed">
                هذه بيانات عامة مطبوعة في أدلة الاستخدام وعلى ملصق الجهاز — يعرفها الجميع، لذا تركها كما هي = باب
                مفتوح لأي متصل بشبكتك.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">نصائح أمنية خاصة بـ {brand.name}</span>
              </div>
              <ul className="space-y-1.5">
                {brand.notes.map((n, i) => (
                  <li key={i} className="text-xs text-foreground/85 flex gap-2 leading-relaxed">
                    <span className="text-emerald-500 shrink-0">✔</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-muted-foreground">
              ملحوظة: الطُرز تتعدد والإعدادات تختلف قليلاً بينها — الملصق الخلفي لجهازك هو المرجع الأول.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
