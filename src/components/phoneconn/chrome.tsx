"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePhoneConn } from "@/lib/phoneconn/store";
import { ShieldCheck, TriangleAlert, Router, Signal } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md print:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center">
            <Router className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-black text-base leading-none tracking-tight">
              Phone<span className="text-primary">Conn</span>
            </div>
            <div className="text-[9px] text-muted-foreground">مركز التواصل مع الراوتر الحقيقي</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[10px]">
            <Signal className="w-3 h-3 me-1" />
            يعمل من متصفح هاتفك مباشرة
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/40 text-[10px]">
            <TriangleAlert className="w-3 h-3 me-1" />
            لشبكتك الخاصة فقط
          </Badge>
        </div>

        <Badge variant="outline" className="md:hidden bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-[9px]">
          من متصفح هاتفك
        </Badge>
      </div>
      <div className="glow-line" />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-sidebar/30 print:hidden">
      <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground text-center sm:text-start leading-relaxed">
          <strong className="text-foreground/80">PhoneConn Router Center</strong> — أداة توعوية للتواصل مع راوتر
          شبكتك المحلية من متصفح هاتفك: وصول للوحة التحكم، بيانات المصنّعين العامة، وتدقيق أمني تفاعلي.
        </p>
        <p className="text-[10px] text-muted-foreground">
          استخدمها على راوترك الخاص أو شبكة مصرّح لك بإدارتها فقط
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
  }, [accept]);

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
            اتفاقية الاستخدام المسؤول
          </DialogTitle>
          <DialogDescription className="text-start leading-relaxed pt-2 text-sm">
            هذه الأداة تساعدك على <strong className="text-foreground">التواصل مع راوتر شبكتك المحلية الخاصة</strong> من
            متصفح هاتفك: فتح لوحة التحكم، فهم إعداداتها، وتدقيق أمنها. جميع الأدوات تعمل من جهازك أنت — لا يوجد فحص
            خارجي من أي سيرفر.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 text-[13px] leading-relaxed">
          <div className="font-bold text-amber-300">بالاستمرار أنت تتعهد بأن:</div>
          <ul className="space-y-1.5 text-foreground/85">
            <li>• ستستخدم الأداة على راوترك الخاص أو شبكة مصرّح لك صاحبها بإدارتها.</li>
            <li>• الدخول إلى راوتر لا تملكه دون تصريح مكتوب يخالف قوانين الجرائم المعلوماتية.</li>
            <li>• هدفك: تأمين شبكتك المنزلية ونشر الوعي الأمني من حولك.</li>
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} className="w-full h-11 font-bold">
            <ShieldCheck className="w-4 h-4 me-2" />
            أفهم وألتزم — ابدأ التواصل مع راوتري
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
