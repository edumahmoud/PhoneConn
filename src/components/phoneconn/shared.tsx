"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Severity, TerminalLine } from "@/lib/phoneconn/types";
import { ShieldAlert } from "lucide-react";

export const SEVERITY_META: Record<
  Severity,
  { label: string; cls: string }
> = {
  info: { label: "معلوماتي", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40" },
  low: { label: "منخفض", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  medium: { label: "متوسط", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  high: { label: "مرتفع", cls: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  critical: { label: "حرج", cls: "bg-red-500/15 text-red-300 border-red-500/40" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <Badge variant="outline" className={`${m.cls} text-[11px] font-semibold`}>
      {m.label}
    </Badge>
  );
}

export function SimBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`bg-amber-500/10 text-amber-300 border-amber-500/40 text-[10px] font-bold tracking-wide ${className}`}
    >
      <ShieldAlert className="w-3 h-3 ms-1" />
      محاكاة تعليمية
    </Badge>
  );
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-extrabold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const LEVEL_COLOR: Record<TerminalLine["level"], string> = {
  info: "text-emerald-300",
  ok: "text-emerald-400 font-bold",
  warn: "text-amber-300",
  crit: "text-red-400 font-bold",
  dim: "text-zinc-500",
};

export function Terminal({
  lines,
  title = "LIVE TERMINAL",
  height = "h-64",
}: {
  lines: TerminalLine[];
  title?: string;
  height?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="rounded-lg border border-emerald-500/25 bg-black/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-emerald-500/20 bg-emerald-500/5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        <span className="terminal !text-[10px] text-emerald-400/80 ms-2">{title}</span>
      </div>
      <div
        ref={boxRef}
        className={`terminal-scroll ${height} overflow-y-auto px-3 py-2`}
        dir="ltr"
      >
        {lines.length === 0 ? (
          <div className="text-zinc-600">
            <span className="text-emerald-500">root@phoneconn</span>:<span className="text-zinc-400">~$</span>{" "}
            <span className="caret" />
          </div>
        ) : (
          lines.map((l) => (
            <div key={l.id} className={`${LEVEL_COLOR[l.level]} whitespace-pre-wrap break-all`}>
              <span className="text-zinc-600 select-none">$ </span>
              {l.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function useTerminal(startAt = 0) {
  const idRef = useRef(startAt);
  const push = (
    setLines: React.Dispatch<React.SetStateAction<TerminalLine[]>>,
    text: string,
    level: TerminalLine["level"] = "info"
  ) => {
    idRef.current += 1;
    const id = idRef.current;
    setLines((prev) => [...prev, { id, text, level }].slice(-120));
  };
  return push;
}

export function StatCard({
  icon,
  value,
  label,
  tone = "emerald",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: "emerald" | "amber" | "red" | "zinc";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    red: "text-red-400 bg-red-500/10 border-red-500/30",
    zinc: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
  };
  return (
    <Card className="border-border/70">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-extrabold leading-none">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DefenseNote({ points }: { points: string[] }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-300">كيف تحمي نفسك؟ (الدرس المستفاد)</span>
      </div>
      <ul className="space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="text-xs text-emerald-100/80 flex gap-2 leading-relaxed">
            <span className="text-emerald-500 shrink-0">✔</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
