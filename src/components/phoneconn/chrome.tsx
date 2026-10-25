"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePhoneConn } from "@/lib/phoneconn/store";
import type { SectionId } from "./section-types";
import {
  ShieldCheck, Wifi, Smartphone, Fingerprint, GraduationCap,
  FileText, LayoutDashboard, TriangleAlert, TerminalSquare,
} from "lucide-react";

export const NAV_ITEMS: { id: SectionId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "dashboard", label: "لوحة القيادة", icon: <LayoutDashboard className="w-4 h-4" />, desc: "نظرة عامة على المختبر" },
  { id: "wifi", label: "مختبر الشبكات", icon: <Wifi className="w-4 h-4" />, desc: "فحص شبكات افتراضية وتحليل تشفيرها" },
  { id: "devices", label: "مختبر الأجهزة", icon: <Smartphone className="w-4 h-4" />, desc: "أندرويد وiOS افتراضية ومواردها" },
  { id: "audit", label: "التدقيق الذاتي", icon: <Fingerprint className="w-4 h-4" />, desc: "ماذا يرى أي موقع عن جهازك؟ (حقيقي)" },
  { id: "academy", label: "أكاديمية الوعي", icon: <GraduationCap className="w-4 h-4" />, desc: "دروس + اختبار الوعي الأمني" },
  { id: "reports", label: "التقارير", icon: <FileText className="w-4 h-4" />, desc: "تقرير جلسة التعلم" },
];

export function TopBar({ current }: { current: SectionId }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md print:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center">
            <TerminalSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-black text-base leading-none tracking-tight">
              Phone<span className="text-primary">Conn</span>
            </div>
            <div className="text-[9px] text-muted-foreground">Cyber Range التعليمي</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/40 text-[10px]">
            <TriangleAlert className="w-3 h-3 me-1" />
            بيئة محاكاة معزولة — لا أجهزة حقيقية
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-rec me-1.5" />
            Lab Online
          </Badge>
        </div>

        <Badge variant="outline" className="md:hidden bg-amber-500/10 text-amber-300 border-amber-500/40 text-[9px]">
          محاكاة تعليمية
        </Badge>
      </div>
      <div className="glow-line" />
    </header>
  );
}

export function Sidebar({
  current,
  onNavigate,
}: {
  current: SectionId;
  onNavigate: (id: SectionId) => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-s border-border/60 bg-sidebar/50 print:hidden">
        <nav className="p-3 space-y-1 sticky top-14">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full text-start rounded-lg px-3 py-2.5 transition-all flex items-start gap-3 ${
                current === item.id
                  ? "bg-primary/15 border border-primary/40 text-primary"
                  : "border border-transparent hover:bg-secondary/60"
              }`}
            >
              <span className={`mt-0.5 ${current === item.id ? "text-primary" : "text-muted-foreground"}`}>
                {item.icon}
              </span>
              <span>
                <span className={`block text-sm font-bold ${current === item.id ? "text-primary" : ""}`}>
                  {item.label}
                </span>
                <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">{item.desc}</span>
              </span>
            </button>
          ))}

          <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="text-[10px] font-bold text-amber-300 mb-1">ميثاق الاستخدام</div>
            <p className="text-[10px] text-amber-100/70 leading-relaxed">
              استخدم هذه المنصة للتعلم والتدريب والتوعية فقط. اختبار أي جهاز أو شبكة حقيقية دون تصريح مكتوب
              يخالف القانون في معظم الدول.
            </p>
          </div>
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden min-w-0 w-full border-b border-border/60 bg-sidebar/40 print:hidden">
        <nav className="flex gap-1.5 px-3 py-2 overflow-x-auto terminal-scroll">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5 border transition-all ${
                current === item.id
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-sidebar/30 print:hidden">
      <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground text-center sm:text-start leading-relaxed">
          <strong className="text-foreground/80">PhoneConn EduLab</strong> — منصة تعليمية محاكاة لنشر الوعي والثقافة الأمنية.
          جميع الشبكات والأجهزة داخلها افتراضية بالكامل.
        </p>
        <p className="text-[10px] text-muted-foreground">
          اختبار أنظمة حقيقية دون تصريح = مخالفة قانونية · التعلم هنا آمن
        </p>
      </div>
    </footer>
  );
}

export function EthicsGate() {
  const accepted = usePhoneConn((s) => s.ethicsAccepted);
  const accept = usePhoneConn((s) => s.acceptEthics);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("phoneconn-ethics");
        if (saved === "accepted") {
          accept();
        } else {
          setOpen(true);
        }
      } catch {
        setOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleAccept() {
    try {
      window.localStorage.setItem("phoneconn-ethics", "accepted");
    } catch {
      /* private mode */
    }
    accept();
    setOpen(false);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg border-amber-500/30"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <ShieldCheck className="w-5 h-5" />
            ميثاق الاستخدام المسؤول
          </DialogTitle>
          <DialogDescription className="text-start leading-relaxed pt-2 text-sm">
            هذه المنصة <strong className="text-foreground">مختبر محاكاة تعليمي بنسبة 100%</strong>: كل الشبكات والأجهزة
            والثغرات التي ستراها افتراضية وتعيش داخل متصفحك. صُممت لتشرح لك كيف تُنفَّذ الهجمات سيبرانياً وكيف تدافع عن نفسك —
            دون لمس أي نظام حقيقي.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 text-[13px] leading-relaxed">
          <div className="font-bold text-amber-300">بالاستمرار أنت تتعهد بأن:</div>
          <ul className="space-y-1.5 text-foreground/85">
            <li>• لن تستخدم أي معرفة هنا لمهاجمة جهاز أو شبكة لا تملكها دون تصريح مكتوب.</li>
            <li>• الاختبار غير المصرح به يخالف قوانين الجرائم المعلوماتية في معظم الدول.</li>
            <li>• هدفك من المنصة: التعلم والتدريب ونشر الوعي الأمني من حولك.</li>
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} className="w-full h-11 font-bold">
            <ShieldCheck className="w-4 h-4 me-2" />
            أفهم وألتزم — افتح المختبر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
