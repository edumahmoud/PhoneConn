"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimBadge, SectionHeader, Terminal, useTerminal, DefenseNote } from "./shared";
import { VIRTUAL_NETWORKS } from "@/lib/phoneconn/data";
import type { SecProto, TerminalLine, VirtualNetwork } from "@/lib/phoneconn/types";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  Wifi, Radar, KeyRound, Handshake, Users, Radio, ScanLine,
  Lock, Unlock, AlertTriangle, ShieldX, Signal, Ban,
} from "lucide-react";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SEC_STYLE: Record<SecProto, string> = {
  WPA3: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  WPA2: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  WPA: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  WEP: "bg-red-500/15 text-red-300 border-red-500/40",
  Open: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};

function signalBars(dbm: number) {
  if (dbm > -50) return 4;
  if (dbm > -62) return 3;
  if (dbm > -72) return 2;
  return 1;
}

type HandshakeState = { running: boolean; msgs: string[]; captured: boolean };
type DictState = { running: boolean; attempts: number; found: string | null; done: boolean };
type DeauthState = { running: boolean; target: string | null };

export function WifiLab() {
  const logActivity = usePhoneConn((s) => s.logActivity);
  const setNetworksScanned = usePhoneConn((s) => s.setNetworksScanned);

  const [discovered, setDiscovered] = useState<VirtualNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [handshake, setHandshake] = useState<HandshakeState>({ running: false, msgs: [], captured: false });
  const [dict, setDict] = useState<DictState>({ running: false, attempts: 0, found: null, done: false });
  const [deauth, setDeauth] = useState<DeauthState>({ running: false, target: null });
  const push = useTerminal();

  const selected = useMemo(
    () => discovered.find((n) => n.id === selectedId) ?? null,
    [discovered, selectedId]
  );

  const t = (text: string, level: TerminalLine["level"] = "info") => push(setLines, text, level);

  async function runScan() {
    if (scanning) return;
    setScanning(true);
    setDiscovered([]);
    setSelectedId(null);
    setHandshake({ running: false, msgs: [], captured: false });
    setDict({ running: false, attempts: 0, found: null, done: false });
    t("ifconfig wlan0 mode monitor (بيئة محاكاة افتراضية)", "dim");
    await sleep(400);
    t("airodump-ng wlan0mon --band abg ...", "dim");
    for (const net of VIRTUAL_NETWORKS) {
      await sleep(550);
      setDiscovered((prev) => [...prev, net]);
      t(`AP found: SSID="${net.ssid}"  BSSID=${net.bssid}  CH=${net.channel}  PWR=${net.signal}dBm  ENC=${net.security}`, "ok");
    }
    await sleep(300);
    t(`scan complete — ${VIRTUAL_NETWORKS.length} virtual networks discovered`, "ok");
    logActivity("مختبر الشبكات", `فحص الشبكات: اكتشاف ${VIRTUAL_NETWORKS.length} شبكة افتراضية`, "info");
    setNetworksScanned(VIRTUAL_NETWORKS.length);
    setScanning(false);
  }

  async function runHandshake(net: VirtualNetwork) {
    if (handshake.running) return;
    if (net.security === "Open") {
      t("network is OPEN — no handshake exists (لا يوجد تشفير أصلاً)", "warn");
      return;
    }
    if (net.security === "WEP") {
      t("WEP does not use WPA handshake — FMS/PTW statistical attack applies directly", "warn");
      logActivity("مختبر الشبكات", `تحليل WEP على شبكة ${net.ssid}`, "critical");
      return;
    }
    setHandshake({ running: true, msgs: [], captured: false });
    t(`aireplay-ng --deauth 2 -a ${net.bssid} (إجبار عميل على إعادة الاتصال — محاكاة)`, "warn");
    const msgs = [
      "M1  AP → Client  : ANonce (رسالة ترحيب مشفرة)",
      "M2  Client → AP  : SNonce + MIC (رد العميل)",
      "M3  AP → Client  : ANonce + MIC + GTK (تأكيد المفاتيح)",
      "M4  Client → AP  : MIC (إتمام التثبيت)",
    ];
    for (const m of msgs) {
      await sleep(900);
      setHandshake((s) => ({ ...s, msgs: [...s.msgs, m] }));
      t(m, "info");
    }
    await sleep(400);
    t(`handshake captured → saved to /sim/edu_${net.ssid}-01.cap`, "ok");
    setHandshake((s) => ({ ...s, running: false, captured: true }));
    logActivity(
      "مختبر الشبكات",
      `التقاط مصافحة WPA على شبكة ${net.ssid} (محاكاة)`,
      net.security === "WPA3" ? "low" : "medium"
    );
  }

  async function runDictionary(net: VirtualNetwork) {
    if (dict.running) return;
    if (net.security === "Open") {
      t("OPEN network — nothing to crack", "warn");
      return;
    }
    setDict({ running: true, attempts: 0, found: null, done: false });
    if (net.security === "WEP") {
      t("PTW attack: collecting IVs from ARP replay (محاكاة فورية)", "warn");
      await sleep(1200);
      t("WEP key CRACKED — بروتوكول ميت تقنياً منذ سنوات", "crit");
      setDict({ running: false, attempts: 54000, found: net.password, done: true });
      logActivity("مختبر الشبكات", `كسر WEP على ${net.ssid} — بروتوكول قديم ميت`, "critical");
      return;
    }
    t(`aircrack-ng -w /sim/wordlist.txt edu_${net.ssid}-01.cap`, "dim");
    if (net.security === "WPA3") {
      for (let i = 0; i < 6; i++) {
        await sleep(600);
        setDict((s) => ({ ...s, attempts: s.attempts + 128 + Math.floor(Math.random() * 64) }));
      }
      t("SAE (Dragonfly) prevents offline verification — attack NOT feasible offline", "crit");
      t("WPA3 يجعل التحقق من التخمين خارج الشبكة مستحيلاً عملياً", "ok");
      setDict((s) => ({ ...s, running: false, done: true, found: null }));
      logActivity("مختبر الشبكات", `اختبار قاموس ضد WPA3 ${net.ssid} — فشل الهجوم (تصميم آمن)`, "info");
      return;
    }
    // WPA/WPA2: simulate checking dictionary entries
    const target = net.password ?? "";
    const idx = Math.max(4, Math.min(28, Math.floor(Math.random() * 12) + 6));
    for (let i = 0; i <= idx; i++) {
      await sleep(240);
      const cand = ["12345678", "password", "123456789", "qwerty123", "admin1234", "internet2020", "letmein", "wifi1234"][i % 8] ?? "xxxx";
      if (i === idx) {
        if (cand === target) {
          t(`KEY FOUND [ ${cand} ]`, "crit");
          setDict((s) => ({ ...s, running: false, done: true, found: cand }));
        } else {
          t(`KEY FOUND [ ${target} ]`, "crit");
          setDict((s) => ({ ...s, running: false, done: true, found: target }));
        }
      } else {
        setDict((s) => ({ ...s, attempts: s.attempts + 900 + Math.floor(Math.random() * 400) }));
        t(`testing passphrase "${cand}" ... not valid`, "dim");
      }
    }
    await sleep(200);
    t("كلمة المرور ضعيفة وموجودة في القواميس — هذا هو الدرس", "warn");
    logActivity(
      "مختبر الشبكات",
      `كسر كلمة مرور ${net.security} عبر القاموس على ${net.ssid} (محاكاة)`,
      "high"
    );
  }

  async function runDeauth(net: VirtualNetwork, clientMac: string) {
    if (deauth.running) return;
    setDeauth({ running: true, target: clientMac });
    t(`aireplay-ng --deauth 5 -a ${net.bssid} -c ${clientMac} (محاكاة)`, "warn");
    await sleep(900);
    t(`client ${clientMac} deauthenticated — إطار Disassoc مفتوح لا يتطلب مصادقة في WPA2`, "crit");
    await sleep(1200);
    t(`client ${clientMac} reconnected automatically — لاحظ أن العميل يعود للشبكة تلقائياً`, "ok");
    await sleep(400);
    t("الدفاع الحقيقي: تفعيل 802.11w (PMF) يجعل إطارات الإدارة محمية", "info");
    setDeauth({ running: false, target: null });
    logActivity("مختبر الشبكات", `محاكاة هجوم إلغاء مصادقة على عميل في ${net.ssid}`, "medium");
  }

  return (
    <div>
      <SectionHeader
        icon={<Wifi className="w-5 h-5" />}
        title="مختبر الشبكات اللاسلكية الافتراضي"
        subtitle="فحص وتحليل شبكات وهمية معزولة بالكامل — لتعلم كيف تعمل الهجمات الحقيقية وكيف تدافع عنها"
        actions={<SimBadge />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Networks column */}
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" />
                شبكات البيئة الافتراضية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={runScan}
                disabled={scanning}
                className="w-full h-11 font-bold"
              >
                {scanning ? (
                  <>
                    <Radar className="w-4 h-4 me-2 animate-spin" />
                    جارٍ الفحص داخل البيئة الافتراضية...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4 me-2" />
                    بدء فحص الشبكات (محاكاة)
                  </>
                )}
              </Button>
              {discovered.length === 0 && !scanning && (
                <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                  اضغط زر الفحص لاكتشاف الشبكات الافتراضية في المختبر
                </p>
              )}
              <div className="space-y-2 max-h-[420px] overflow-y-auto terminal-scroll pe-1">
                {discovered.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => setSelectedId(net.id)}
                    className={`w-full text-start rounded-lg border p-3 transition-all ${
                      selectedId === net.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm truncate">
                        {net.hidden ? `${net.ssid} (مخفية)` : net.ssid}
                      </span>
                      <Badge variant="outline" className={`${SEC_STYLE[net.security]} text-[10px] shrink-0`}>
                        {net.security}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                      <span className="terminal !text-[10px]">{net.bssid}</span>
                      <span className="flex items-center gap-1">
                        <Signal className="w-3 h-3" />
                        {net.signal} dBm · CH {net.channel}
                      </span>
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4].map((b) => (
                        <span
                          key={b}
                          className={`h-1.5 w-6 rounded-sm ${
                            b <= signalBars(net.signal) ? "bg-primary" : "bg-secondary"
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail column */}
        <div className="xl:col-span-2 space-y-4">
          {!selected ? (
            <Card className="h-64 flex items-center justify-center border-dashed">
              <div className="text-center text-muted-foreground">
                <Radio className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">افحص الشبكات ثم اختر شبكة لعرض تفاصيلها وأدوات التحليل</p>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    تحليل الشبكة: {selected.ssid}
                    <Badge variant="outline" className={`${SEC_STYLE[selected.security]} text-[10px]`}>
                      {selected.security}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      ["BSSID", selected.bssid],
                      ["القناة / التردد", `${selected.channel} · ${selected.band}`],
                      ["الشركة المصنّعة (وهمية)", selected.vendor],
                      ["قوة الإشارة", `${selected.signal} dBm`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-secondary/50 border border-border p-2.5">
                        <div className="text-muted-foreground text-[10px] mb-1">{k}</div>
                        <div className="terminal !text-[11px] !text-start font-semibold break-all" dir="ltr">
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="h-10 font-semibold border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => runHandshake(selected)}
                      disabled={handshake.running}
                    >
                      <Handshake className="w-4 h-4 me-1.5" />
                      التقاط المصافحة
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 font-semibold border-red-500/40 text-red-300 hover:bg-red-500/10"
                      onClick={() => runDictionary(selected)}
                      disabled={dict.running}
                    >
                      <KeyRound className="w-4 h-4 me-1.5" />
                      هجوم القاموس
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 font-semibold"
                      onClick={() => {
                        t(`encryption analysis: ${selected.security} — weaknesses listed below`, "info");
                        logActivity("مختبر الشبكات", `تحليل تشفير شبكة ${selected.ssid}`, "info");
                      }}
                    >
                      <ShieldX className="w-4 h-4 me-1.5" />
                      تحليل التشفير
                    </Button>
                  </div>

                  {/* Handshake progress */}
                  {(handshake.running || handshake.captured || handshake.msgs.length > 0) && (
                    <div className="rounded-lg border border-border bg-black/30 p-3 space-y-2">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <Handshake className="w-3.5 h-3.5" />
                        المصافحة الرباعية (4-Way Handshake) — {handshake.captured ? "تم الالتقاط ✔" : handshake.running ? "جارٍ الالتقاط..." : "متوقفة"}
                      </div>
                      {handshake.msgs.map((m, i) => (
                        <div key={i} className="terminal !text-[11px] text-emerald-300 fadeup" dir="ltr">
                          {m}
                        </div>
                      ))}
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                        الدرس: المصافحة نفسها ليست ثغرة — الخطأ أن كلمات المرور الضعيفة تُخمَّن ضد هذه البيانات الملتقطة خارج الشبكة بسرعات ملايين المحاولات/ثانية.
                      </p>
                    </div>
                  )}

                  {/* Dictionary progress */}
                  {(dict.running || dict.done) && (
                    <div className="rounded-lg border border-border bg-black/30 p-3 space-y-2">
                      <div className="text-xs font-bold text-red-300 flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5" />
                        هجوم القاموس — {dict.found ? "انكشفت كلمة المرور!" : dict.done ? "الهجوم فشل (تصميم آمن)" : "جارٍ التخمين..."}
                      </div>
                      <Progress value={dict.done ? 100 : Math.min(90, dict.attempts / 200)} className="h-2" />
                      <div className="terminal !text-[11px] text-zinc-400" dir="ltr">
                        attempts: {dict.attempts.toLocaleString("en-US")} {dict.found ? `| KEY FOUND: ${dict.found}` : ""}
                      </div>
                    </div>
                  )}

                  {/* Weaknesses + defense */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                      <div className="text-xs font-bold text-red-300 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> نقاط الضعف المكتشفة (محاكاة)
                      </div>
                      <ul className="space-y-1.5">
                        {selected.weaknesses.map((w, i) => (
                          <li key={i} className="text-[11px] text-red-100/80 leading-relaxed flex gap-1.5">
                            <span className="text-red-400 shrink-0">▸</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <DefenseNote points={selected.defense} />
                  </div>
                </CardContent>
              </Card>

              {/* Clients */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    العملاء المتصلون ({selected.clients.length}) — أجهزة افتراضية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selected.clients.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">لا يوجد عملاء متصلون بهذه الشبكة في المحاكاة</p>
                  ) : (
                    <ScrollArea className="max-h-52">
                      <div className="space-y-2">
                        {selected.clients.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                                {c.os === "Android" ? "🤖" : "🍎"}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">{c.name}</div>
                                <div className="terminal !text-[10px] text-muted-foreground" dir="ltr">
                                  {c.mac} · {c.ip}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  c.risk === "مرتفع"
                                    ? "bg-red-500/15 text-red-300 border-red-500/40"
                                    : c.risk === "متوسط"
                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                }`}
                              >
                                خطورة {c.risk}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px] border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
                                disabled={deauth.running}
                                onClick={() => runDeauth(selected, c.mac)}
                              >
                                <Ban className="w-3 h-3 me-1" />
                                محاكاة Deauth
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Terminal lines={lines} title="SIM-WLAN-CONSOLE — بيئة معزولة 100%" />
        </div>
      </div>
    </div>
  );
}
