"use client";

import { TopBar, Footer, EthicsGate } from "@/components/phoneconn/chrome";
import { RouterCenter } from "@/components/phoneconn/router-center";
import { Badge } from "@/components/ui/badge";
import { Router, Wifi, ShieldCheck, Cable, MonitorSmartphone, Network, Gauge } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <EthicsGate />
      <TopBar />
      <main className="flex-1 min-w-0 p-4 md:p-6 max-w-[1100px] mx-auto w-full">
        {/* Hero */}
        <div className="fadeup mb-6">
          <div className="rounded-xl border border-primary/25 bg-gradient-to-bl from-primary/10 via-transparent to-emerald-500/5 p-5 md:p-7">
            <div className="flex items-start gap-4 flex-col md:flex-row md:items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 text-[10px]">
                    <Wifi className="w-3 h-3 me-1" />
                    يعمل من متصفح هاتفك — بدون سيرفر
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-black leading-tight">
                  تواصل مع <span className="text-primary">راوتر شبكتك الحقيقي</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                  حدد نوع راوترك وافتح لوحة التحكم بضغطة من هاتفك، اقرأ <span className="text-foreground font-bold">بيانات
                  شبكتك وسجل الأجهزة المتصلة بأنواعها</span> (هاتف، حاسوب، كاميرا، جهاز ذكي) من قاعدة OUI، قِس كفاءة
                  اتصالك بقياسات حقيقية، وقيّم صحة خط الإنترنت (DSL/فايبر) بأرقامه الفعلية — كل شيء يبقى بينك وبين راوترك.
                </p>
              </div>
              <div className="hidden md:flex w-16 h-16 rounded-2xl bg-primary/10 border border-primary/40 items-center justify-center shrink-0">
                <Router className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <Router className="w-3 h-3 me-1" />
                تحديد نوع الراوتر
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <Network className="w-3 h-3 me-1" />
                بيانات الشبكة + IP العام
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <MonitorSmartphone className="w-3 h-3 me-1" />
                الأجهزة المتصلة بأنواعها (OUI)
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <Cable className="w-3 h-3 me-1" />
                تقييم خط DSL / فايبر
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <Gauge className="w-3 h-3 me-1" />
                قياس كفاءة فعلي (سرعة/استجابة/ازدحام)
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-300 border-zinc-500/40">
                <ShieldCheck className="w-3 h-3 me-1" />
                خصوصية كاملة — لا شيء يغادر جهازك
              </Badge>
            </div>
          </div>
        </div>

        <RouterCenter />
      </main>
      <Footer />
    </div>
  );
}
