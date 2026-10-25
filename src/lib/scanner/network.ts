// PhoneConn — Real local network scanner engine (server-side only)
// Discovers devices on the LAN the server is attached to, using:
//   1. ARP cache reading (already-known neighbours)
//   2. ICMP ping sweep across the local subnet (populates ARP)
//   3. Reverse DNS lookups
//   4. TCP connect probes on common ports
//   5. MAC OUI vendor lookup + heuristic device-type inference
// This is passive, legitimate network discovery (like Fing / nmap -sn).

import { spawn } from "child_process";
import net from "net";
import dns from "dns";
import os from "os";

import { isRandomizedMac, normalizeMac, ouiVendor } from "./oui";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DeviceKind =
  | "router"
  | "phone"
  | "computer"
  | "server"
  | "printer"
  | "camera"
  | "iot"
  | "media"
  | "nas"
  | "self"
  | "unknown";

export interface ScanDevice {
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  kind: DeviceKind;
  kindLabel: string;
  latencyMs: number | null;
  openPorts: number[];
  portHints: string[];
  randomizedMac: boolean;
  isGateway: boolean;
  isSelf: boolean;
  detection: string[];
}

export interface NetworkInfo {
  iface: string;
  ip: string;
  mac: string | null;
  netmask: string;
  cidr: string;
  scanRange: string;
  hostCount: number;
  gateway: string | null;
  hostname: string;
  platform: string;
  ssid: string | null;
  tools: { ping: boolean; arp: boolean; ipcmd: boolean };
}

export interface ScanResult {
  startedAt: string;
  durationMs: number;
  info: NetworkInfo;
  devices: ScanDevice[];
  log: string[];
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function run(
  cmd: string,
  args: string[],
  timeoutMs = 4000
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let done = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      resolve({ code: -1, stdout: "" });
      return;
    }
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        try {
          child.kill("SIGKILL");
        } catch {
          /* already dead */
        }
        resolve({ code: -1, stdout });
      }
    }, timeoutMs);
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.on("error", () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve({ code: -1, stdout });
      }
    });
    child.on("close", (code) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve({ code: code ?? -1, stdout });
      }
    });
  });
}

async function hasTool(cmd: string, args: string[]): Promise<boolean> {
  const r = await run(cmd, args, 2000);
  return r.code === 0 || r.stdout.length > 0;
}

/** Run async workers over a list with bounded concurrency. */
async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0;
}
function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}
function maskToPrefix(mask: string): number {
  return mask
    .split(".")
    .reduce((acc, o) => acc + ((parseInt(o, 10) >>> 0).toString(2).match(/1/g)?.length ?? 0), 0);
}

/* ------------------------------------------------------------------ */
/* Network information                                                 */
/* ------------------------------------------------------------------ */

interface IfaceInfo {
  iface: string;
  ip: string;
  mac: string | null;
  netmask: string;
}

export function getPrimaryInterface(): IfaceInfo | null {
  const ifaces = os.networkInterfaces();
  const candidates: IfaceInfo[] = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      candidates.push({
        iface: name,
        ip: addr.address,
        mac: addr.mac && addr.mac !== "00:00:00:00:00:00" ? normalizeMac(addr.mac) : null,
        netmask: addr.netmask,
      });
    }
  }
  // Prefer 192.168.* / 10.* / 172.16-31.* (private ranges) over exotic bridges
  const score = (c: IfaceInfo): number => {
    const o = c.ip.split(".").map(Number);
    if (o[0] === 192 && o[1] === 168) return 5;
    if (o[0] === 10) return 4;
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return 3;
    return 1;
  };
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0] ?? null;
}

async function getGateway(): Promise<string | null> {
  const platform = process.platform;
  if (platform === "linux") {
    // /proc/net/route — fast and dependency free (addresses are little-endian hex)
    try {
      const fs = await import("fs/promises");
      const raw = await fs.readFile("/proc/net/route", "utf8");
      for (const line of raw.split("\n").slice(1)) {
        const cols = line.trim().split(/\s+/);
        if (cols.length > 2 && cols[1] === "00000000") {
          const hex = cols[2];
          if (hex === "00000000") continue;
          const bytes = hex.match(/../g)?.reverse();
          if (!bytes || bytes.length !== 4) continue;
          const gw = bytes.map((b) => parseInt(b, 16)).join(".");
          if (/^\d+\.\d+\.\d+\.\d+$/.test(gw)) return gw;
        }
      }
    } catch {
      /* fall through to ip command */
    }
    const r = await run("ip", ["route", "show", "default"]);
    const m = r.stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
    if (m) return m[1];
  } else if (platform === "darwin") {
    const r = await run("route", ["-n", "get", "default"]);
    const m = r.stdout.match(/gateway:\s*(\d+\.\d+\.\d+\.\d+)/);
    if (m) return m[1];
  } else if (platform === "win32") {
    const r = await run("route", ["print", "-4"]);
    const m = r.stdout.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/);
    if (m) return m[1];
  }
  return null;
}

async function getSsid(): Promise<string | null> {
  if (process.platform === "linux") {
    const r = await run("iwgetid", ["-r"], 1500);
    const ssid = r.stdout.trim();
    if (r.code === 0 && ssid) return ssid;
  } else if (process.platform === "darwin") {
    // macOS: airport utility (deprecated but often present)
    const r = await run(
      "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport",
      ["-I"],
      1500
    );
    const m = r.stdout.match(/\bSSID:\s*(.+)/);
    if (m) return m[1].trim();
  } else if (process.platform === "win32") {
    const r = await run("netsh", ["wlan", "show", "interfaces"], 2500);
    const m = r.stdout.match(/\bSSID\s*:\s*(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  const primary = getPrimaryInterface();
  const gateway = await getGateway();
  const ssid = await getSsid();
  const [pingOk, arpOk, ipOk] = await Promise.all([
    hasTool("ping", process.platform === "win32" ? ["-n", "1", "-w", "300", "127.0.0.1"] : ["-c", "1", "-W", "1", "127.0.0.1"]),
    hasTool("arp", ["-a"]),
    process.platform === "linux" ? hasTool("ip", ["addr"]) : Promise.resolve(false),
  ]);

  if (!primary) {
    // No non-internal interface: build an honest "cannot scan" info object
    return {
      iface: "—",
      ip: "—",
      mac: null,
      netmask: "—",
      cidr: "—",
      scanRange: "—",
      hostCount: 0,
      gateway,
      hostname: os.hostname(),
      platform: process.platform,
      ssid,
      tools: { ping: pingOk, arp: arpOk, ipcmd: ipOk },
    };
  }

  // Always sweep a standard /24 around our own IP: wider prefixes (/16, /8) are
  // capped for speed/safety, narrower ones (/25../32, e.g. point-to-point or
  // container nets) are widened so discovery still finds real neighbours —
  // this matches the default behaviour of tools like Fing / nmap -sn.
  const effectivePrefix = 24;
  const base = ipToInt(primary.ip) & (0xffffffff << (32 - effectivePrefix));
  const hostCount = Math.pow(2, 32 - effectivePrefix) - 2;

  return {
    iface: primary.iface,
    ip: primary.ip,
    mac: primary.mac,
    netmask: primary.netmask,
    cidr: `${intToIp(base)}/${effectivePrefix}`,
    scanRange: `${intToIp(base + 1)} — ${intToIp(base + hostCount)}`,
    hostCount,
    gateway,
    hostname: os.hostname(),
    platform: process.platform,
    ssid,
    tools: { ping: pingOk, arp: arpOk, ipcmd: ipOk },
  };
}

/* ------------------------------------------------------------------ */
/* ARP table                                                           */
/* ------------------------------------------------------------------ */

interface ArpEntry {
  ip: string;
  mac: string | null;
}

export async function readArpTable(): Promise<ArpEntry[]> {
  const entries: ArpEntry[] = [];
  const push = (ip: string, mac: string | null) => {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return;
    if (mac === null || /^(00:00:00:00:00:00|00-00-00-00-00-00|incomplete|ff:ff:ff:ff:ff:ff)$/i.test(mac)) {
      entries.push({ ip, mac: null });
      return;
    }
    entries.push({ ip, mac: normalizeMac(mac) });
  };

  // Try `arp -an` (Linux/macOS) / `arp -a` (Windows)
  const r = await run("arp", process.platform === "win32" ? ["-a"] : ["-an"]);
  if (r.code === 0 && r.stdout.trim()) {
    // Linux format: ? (192.168.1.5) at aa:bb:cc:dd:ee:ff [ether] on eth0
    // macOS format: 192.168.1.5 (192.168.1.5) at aa:bb:cc:dd:ee:ff on en0 ...
    // Windows:      192.168.1.5          aa-bb-cc-dd-ee-ff     dynamic
    for (const line of r.stdout.split("\n")) {
      const m1 = line.match(/\(?(\d+\.\d+\.\d+\.\d+)\)?\s+at\s+([0-9a-fA-F:\-]+)/);
      if (m1) {
        push(m1[1], m1[2]);
        continue;
      }
      const m2 = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F\-]{12,17})\s+\S+/);
      if (m2) push(m2[1], m2[2].replace(/-/g, ":"));
    }
    if (entries.length > 0) return dedupeArp(entries);
  }

  // Fallback: `ip neigh show` (Linux)
  if (process.platform === "linux") {
    const r2 = await run("ip", ["neigh", "show"]);
    for (const line of r2.stdout.split("\n")) {
      const m = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+dev\s+\S+\s+lladdr\s+([0-9a-fA-F:]+)/);
      if (m) push(m[1], m[2]);
    }
  }
  return dedupeArp(entries);
}

function dedupeArp(entries: ArpEntry[]): ArpEntry[] {
  const map = new Map<string, ArpEntry>();
  for (const e of entries) {
    const prev = map.get(e.ip);
    if (!prev || (prev.mac === null && e.mac !== null)) map.set(e.ip, e);
  }
  return [...map.values()];
}

/* ------------------------------------------------------------------ */
/* Ping sweep                                                          */
/* ------------------------------------------------------------------ */

interface PingResult {
  ip: string;
  alive: boolean;
  latencyMs: number | null;
}

async function pingHost(ip: string): Promise<PingResult> {
  const platform = process.platform;
  const args =
    platform === "win32"
      ? ["-n", "1", "-w", "1200", ip]
      : platform === "darwin"
        ? ["-c", "1", "-W", "1200", ip]
        : ["-c", "1", "-W", "1", ip];
  const t0 = Date.now();
  const r = await run("ping", args, 3500);
  const ok = r.code === 0 && /ttl|time[=<]/i.test(r.stdout);
  if (ok) {
    const m = r.stdout.match(/time[=<]([\d.]+)\s*ms/i);
    return { ip, alive: true, latencyMs: m ? Math.round(parseFloat(m[1])) : Date.now() - t0 };
  }
  return { ip, alive: false, latencyMs: null };
}

/* ------------------------------------------------------------------ */
/* Reverse DNS                                                         */
/* ------------------------------------------------------------------ */

async function reverseDns(ip: string): Promise<string | null> {
  const task = new Promise<string | null>((resolve) => {
    dns.reverse(ip, (err, hosts) => resolve(!err && hosts && hosts.length ? hosts[0] : null));
  });
  const guard = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800));
  return Promise.race([task, guard]);
}

/* ------------------------------------------------------------------ */
/* TCP port probing                                                    */
/* ------------------------------------------------------------------ */

const COMMON_PORTS: { port: number; label: string }[] = [
  { port: 22, label: "SSH" },
  { port: 23, label: "Telnet" },
  { port: 53, label: "DNS" },
  { port: 80, label: "HTTP" },
  { port: 139, label: "NetBIOS" },
  { port: 443, label: "HTTPS" },
  { port: 445, label: "SMB" },
  { port: 515, label: "LPD" },
  { port: 548, label: "AFP" },
  { port: 554, label: "RTSP" },
  { port: 631, label: "IPP" },
  { port: 1883, label: "MQTT" },
  { port: 3389, label: "RDP" },
  { port: 5000, label: "NAS-HTTP" },
  { port: 5060, label: "SIP" },
  { port: 5555, label: "ADB" },
  { port: 7000, label: "AirPlay" },
  { port: 8000, label: "Camera-API" },
  { port: 8008, label: "Chromecast" },
  { port: 8009, label: "Chromecast" },
  { port: 8080, label: "HTTP-Alt" },
  { port: 8123, label: "HomeAssistant" },
  { port: 8443, label: "HTTPS-Alt" },
  { port: 9100, label: "Print" },
  { port: 32400, label: "Plex" },
  { port: 49152, label: "UPnP" },
  { port: 62078, label: "iOS-Lockdown" },
];

function tcpProbe(ip: string, port: number, timeoutMs = 900): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (open: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(open);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    try {
      socket.connect(port, ip);
    } catch {
      done(false);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Device type inference                                               */
/* ------------------------------------------------------------------ */

const KIND_LABELS: Record<DeviceKind, string> = {
  router: "راوتر / بوابة",
  phone: "هاتف / جهاز محمول",
  computer: "حاسوب",
  server: "خادم / خدمة",
  printer: "طابعة",
  camera: "كاميرا مراقبة",
  iot: "جهاز ذكي (IoT)",
  media: "جهاز وسائط / بث",
  nas: "خادم تخزين (NAS)",
  self: "هذا الخادم",
  unknown: "جهاز غير محدد",
};

interface InferenceInput {
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  openPorts: number[];
  portLabels: string[];
  isGateway: boolean;
  isSelf: boolean;
}

function inferDevice(input: InferenceInput): { kind: DeviceKind; detection: string[] } {
  const { vendor, hostname, openPorts, portLabels, isGateway, isSelf, mac } = input;
  const detection: string[] = [];
  const hn = (hostname ?? "").toLowerCase();
  const ports = new Set(openPorts);
  const has = (p: number) => ports.has(p);

  if (isSelf) {
    detection.push("هذا هو جهاز الخادم الذي يعمل عليه الفحص (عنوان الواجهة المحلية)");
    return { kind: "self", detection };
  }
  if (isGateway) {
    detection.push("هذا العنوان هو البوابة الافتراضية (Default Gateway) للشبكة");
    return { kind: "router", detection };
  }

  // Hostname heuristics
  if (/iphone/.test(hn)) {
    detection.push(`اسم المضيف يحتوي "iPhone" (${hostname})`);
    return { kind: "phone", detection };
  }
  if (/ipad/.test(hn)) {
    detection.push(`اسم المضيف يحتوي "iPad" (${hostname})`);
    return { kind: "phone", detection };
  }
  if (/android|galaxy|pixel|redmi|pocophone|oneplus|huawei-|honor/.test(hn)) {
    detection.push(`اسم المضيف يوحي بهاتف أندرويد (${hostname})`);
    return { kind: "phone", detection };
  }
  if (/macbook|imac|mac-mini|macmini/.test(hn)) {
    detection.push(`اسم المضيف يوحي بحاسوب Mac (${hostname})`);
    return { kind: "computer", detection };
  }
  if (/desktop-|pc-|laptop|notebook/.test(hn)) {
    detection.push(`اسم المضيف يوحي بحاسوب ويندوز (${hostname})`);
    return { kind: "computer", detection };
  }
  if (/raspberry|\brpi\b/.test(hn)) {
    detection.push(`اسم المضيف يوحي بلوحة Raspberry Pi (${hostname})`);
    return { kind: "iot", detection };
  }
  if (/esp|tasmota|shelly|sonoff|wled|tplink-smart|kasa/.test(hn)) {
    detection.push(`اسم المضيف يوحي بجهاز IoT (${hostname})`);
    return { kind: "iot", detection };
  }
  if (/chromecast|roku|firestick|appletv|apple-tv|androidtv/.test(hn)) {
    detection.push(`اسم المضيف يوحي بجهاز بث وسائط (${hostname})`);
    return { kind: "media", detection };
  }

  // Port heuristics
  if (has(62078)) {
    detection.push("المنفذ 62078 مفتوح — خدمة Lockdown الخاصة بأجهزة iOS");
    return { kind: "phone", detection };
  }
  if (has(5555)) {
    detection.push("المنفذ 5555 مفتوح — ADB عبر الشبكة (أندرويد) ⚠ يُعد مخاطرة أمنية");
    return { kind: "phone", detection };
  }
  if (has(8008) || has(8009)) {
    detection.push("منفذ 8008/8009 مفتوح — بروتوكول بث Chromecast/Android TV");
    return { kind: "media", detection };
  }
  if (has(7000) && (has(548) || vendor === "Apple")) {
    detection.push("منفذ 7000 مفتوح — خدمة AirPlay من Apple");
    return { kind: "media", detection };
  }
  if (has(9100) || has(631) || has(515)) {
    detection.push("منفذ طباعة مفتوح (9100/631/515)");
    return { kind: "printer", detection };
  }
  if (has(554) || has(8000)) {
    detection.push("منفذ بث فيديو مفتوح (554 RTSP / 8000) — نمط كاميرات المراقبة");
    return { kind: "camera", detection };
  }
  if (has(32400)) {
    detection.push("منفذ 32400 مفتوح — خادم وسائط Plex");
    return { kind: "media", detection };
  }
  if (has(8123) || has(1883)) {
    detection.push("منفذ 8123/1883 مفتوح — نظام منزل ذكي / وسيط MQTT");
    return { kind: "iot", detection };
  }
  if ((has(5000) || has(5001)) && (has(445) || has(139))) {
    detection.push("نمط منافذ NAS (5000/5001 + SMB)");
    return { kind: "nas", detection };
  }
  if (has(3389)) {
    detection.push("منفذ 3389 مفتوح — سطح مكتب بعيد RDP (ويندوز)");
    return { kind: "computer", detection };
  }
  if (has(548)) {
    detection.push("منفذ 548 مفتوح — مشاركة ملفات AFP من Apple");
    return { kind: "computer", detection };
  }

  // Vendor heuristics
  if (vendor) {
    if (vendor === "Apple") {
      detection.push("الشركة المصنّعة Apple — قد يكون هاتفاً أو حاسوب Mac");
      return { kind: "phone", detection };
    }
    if (vendor === "Raspberry Pi") {
      detection.push("الشركة المصنّعة Raspberry Pi Foundation — لوحة تطوير");
      return { kind: "iot", detection };
    }
    if (vendor === "Espressif") {
      detection.push("الشركة المصنّعة Espressif — شريحة WiFi تُستخدم في أجهزة IoT");
      return { kind: "iot", detection };
    }
    if (vendor === "Hikvision" || vendor === "Dahua") {
      detection.push(`الشركة المصنّعة ${vendor} — متخصصة في كاميرات المراقبة`);
      return { kind: "camera", detection };
    }
    if (vendor === "Roku" || vendor === "Sonos") {
      detection.push(`الشركة المصنّعة ${vendor} — أجهزة وسائط وصوت`);
      return { kind: "media", detection };
    }
    if (vendor === "Synology" || vendor === "QNAP") {
      detection.push(`الشركة المصنّعة ${vendor} — متخصصة في أجهزة NAS`);
      return { kind: "nas", detection };
    }
    if (["Samsung", "Xiaomi", "Huawei", "OnePlus", "Oppo", "Vivo", "TECNO/Infinix"].includes(vendor)) {
      // These make phones AND TVs and routers — use ports to disambiguate
      if (has(445) || has(139) || has(3389) || has(22)) {
        detection.push(`الشركة المصنّعة ${vendor} + منافذ مشاركة/إدارة → حاسوب أو خادم`);
        return { kind: "computer", detection };
      }
      detection.push(`الشركة المصنّعة ${vendor} — الأرجح جهاز محمول أو جهاز ذكي من نفس العلامة`);
      return { kind: "phone", detection };
    }
    if (["Intel", "Dell", "HP", "Lenovo", "Microsoft", "VMware", "VirtualBox", "QEMU/KVM", "Xen", "Parallels"].includes(vendor)) {
      detection.push(`الشركة المصنّعة ${vendor} — نمط حواسيب/أنظمة افتراضية`);
      return { kind: "computer", detection };
    }
    if (["TP-Link", "D-Link", "Netgear", "Cisco", "Ubiquiti", "MikroTik", "ASUSTek", "Aruba"].includes(vendor)) {
      detection.push(`الشركة المصنّعة ${vendor} — معدات شبكات`);
      return { kind: "router", detection };
    }
  }

  // Fallback by ports
  if (has(445) || has(139)) {
    detection.push("منافذ مشاركة ملفات ويندوز مفتوحة (SMB/NetBIOS)");
    return { kind: "computer", detection };
  }
  if (has(22) || has(80) || has(443) || has(8080)) {
    detection.push("منافذ إدارة/ويب مفتوحة — قد يكون راوتراً أو خادماً أو جهازاً ذكياً");
    return { kind: "server", detection };
  }
  if (mac && isRandomizedMac(mac)) {
    detection.push("عنوان MAC عشوائي (خصوصية) — الأرجح هاتف حديث يعمل بوضع MAC العشوائي");
    return { kind: "phone", detection };
  }
  detection.push("لم يتطابق أي نمط معروف — يُصنّف كجهاز غير محدد");
  return { kind: "unknown", detection };
}

/* ------------------------------------------------------------------ */
/* Full scan orchestration                                             */
/* ------------------------------------------------------------------ */

let cache: { at: number; result: ScanResult } | null = null;
const CACHE_MS = 45_000;

export async function scanNetwork(force = false): Promise<ScanResult> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.result;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const log: string[] = [];
  const info = await getNetworkInfo();

  if (info.ip === "—") {
    log.push("لم يُعثر على واجهة شبكة خارجية حقيقية — لا يمكن تنفيذ الفحص داخل بيئة معزولة بدون شبكة.");
    const empty: ScanResult = {
      startedAt,
      durationMs: Date.now() - t0,
      info,
      devices: [],
      log,
    };
    cache = { at: Date.now(), result: empty };
    return empty;
  }

  log.push(`واجهة الفحص: ${info.iface} — عنوان IP: ${info.ip} — النطاق: ${info.cidr}`);
  if (info.gateway) log.push(`البوابة الافتراضية: ${info.gateway}`);
  if (info.ssid) log.push(`شبكة WiFi المتصل بها: ${info.ssid}`);

  // 1) ARP snapshot
  const arpBefore = await readArpTable();
  log.push(`جدول ARP: ${arpBefore.length} مدخل معروف قبل المسح`);

  // 2) Build candidate list
  const prefix = parseInt(info.cidr.split("/")[1], 10) || 24;
  const base = ipToInt(info.cidr.split("/")[0]) & (0xffffffff << (32 - prefix));
  const total = Math.pow(2, 32 - prefix);
  const candidates: string[] = [];
  for (let i = 1; i < total - 1; i++) candidates.push(intToIp(base + i));
  const selfIp = info.ip;
  log.push(`بدء Ping Sweep على ${candidates.length} عنوان (تزامن 64)...`);

  // 3) Ping sweep
  const pings = await pool(candidates, 64, pingHost);
  const alive = pings.filter((p) => p.alive);
  log.push(`استجاب ${alive.length} عنوان لطلب ICMP Echo`);

  // Ensure gateway appears even if it drops ICMP
  if (info.gateway && !alive.some((a) => a.ip === info.gateway)) {
    alive.push({ ip: info.gateway, alive: true, latencyMs: null });
    log.push(`أُضيفت البوابة ${info.gateway} يدوياً (لا تستجيب لـ ICMP عادةً)`);
  }
  if (!alive.some((a) => a.ip === selfIp)) {
    alive.push({ ip: selfIp, alive: true, latencyMs: 0 });
  }

  // 4) Re-read ARP and merge MACs
  await new Promise((r) => setTimeout(r, 300));
  const arpAfter = await readArpTable();
  // ARP-known hosts inside the scanned range are real devices even if they
  // silently drop ICMP (firewalled phones, printers, sleeping laptops...)
  let arpMerged = 0;
  for (const e of arpAfter) {
    if (alive.some((a) => a.ip === e.ip)) continue;
    const n = ipToInt(e.ip);
    if (n > base && n < base + total) {
      alive.push({ ip: e.ip, alive: true, latencyMs: null });
      arpMerged++;
    }
  }
  if (arpMerged > 0) {
    log.push(`أُضيف ${arpMerged} جهاز من جدول ARP (يحجب ICMP لكنه متصل فعلاً)`);
  }
  const macByIp = new Map<string, string | null>();
  for (const e of arpBefore) macByIp.set(e.ip, e.mac);
  for (const e of arpAfter) {
    if (e.mac || !macByIp.has(e.ip)) macByIp.set(e.ip, e.mac);
  }
  const macsResolved = [...macByIp.values()].filter(Boolean).length;
  log.push(`جدول ARP بعد المسح: ${arpAfter.length} مدخل — عناوين MAC مطابقة: ${macsResolved}`);

  // 5) Per-host enrichment
  log.push("بدء فحص المنافذ الشائعة + البحث العكسي عن أسماء المضيفين...");
  const devices: ScanDevice[] = await pool(alive, 24, async (host) => {
    const [probes, hostname] = await Promise.all([
      pool(COMMON_PORTS, 16, (p) => tcpProbe(host.ip, p.port)),
      reverseDns(host.ip),
    ]);
    const openPorts = COMMON_PORTS.filter((_, i) => probes[i]).map((p) => p.port);
    const portLabels = COMMON_PORTS.filter((_, i) => probes[i]).map((p) => p.label);
    const mac = macByIp.get(host.ip) ?? null;
    const vendor = mac ? ouiVendor(mac) : null;
    const isGateway = info.gateway === host.ip;
    const isSelf = selfIp === host.ip;
    const { kind, detection } = inferDevice({
      ip: host.ip,
      mac,
      vendor,
      hostname,
      openPorts,
      portLabels,
      isGateway,
      isSelf,
    });

    return {
      ip: host.ip,
      mac,
      vendor,
      hostname,
      kind,
      kindLabel: KIND_LABELS[kind],
      latencyMs: host.latencyMs,
      openPorts,
      portLabels,
      randomizedMac: mac ? isRandomizedMac(mac) : false,
      isGateway,
      isSelf,
      detection,
    };
  });

  devices.sort((a, b) => {
    const rank: Record<string, number> = { self: 0, router: 1 };
    return (rank[a.kind] ?? 2) - (rank[b.kind] ?? 2) || ipToInt(a.ip) - ipToInt(b.ip);
  });

  log.push(`اكتمل الفحص: ${devices.length} جهاز نشط في ${Date.now() - t0}ms`);

  const result: ScanResult = {
    startedAt,
    durationMs: Date.now() - t0,
    info,
    devices,
    log,
  };
  cache = { at: Date.now(), result };
  return result;
}
