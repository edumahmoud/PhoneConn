// الاتصال المباشر بالراوتر من الخادم — يعمل بشكل حقيقي عند تشغيل التطبيق
// داخل شبكتك المحلية (bun run dev على حاسوب في بيتك) فيصل لراوترك فعلياً.
import { NextResponse } from "next/server";
import net from "node:net";
import fs from "node:fs";
import { execFile } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROBE_PORTS = [53, 80, 443, 22, 23, 5555, 7547, 8080, 8443, 49152];

/** خريطة OUI مختصرة لأشهر مصنّعي الراوترات (أول 3 أوكتتات) */
const OUI: Record<string, string> = {
  "AC:84:C6": "TP-Link", "50:C7:BF": "TP-Link", "C0:25:E9": "TP-Link",
  "A4:2B:B0": "TP-Link", "F4:F2:6D": "TP-Link", "14:CC:20": "TP-Link",
  "00:1A:2B": "Ayecom", "38:2C:4A": "TP-Link",
  "00:0C:29": "VMware", "00:50:56": "VMware",
  "B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi", "E4:5F:01": "Raspberry Pi",
  "3C:5A:B4": "Google", "F4:F5:D8": "Google", "30:FD:38": "CHANGHOO (هواتف WE)",
  "00:1F:33": "Netgear", "A0:40:A0": "Netgear", "9C:3D:CF": "Netgear",
  "00:1B:2F": "Netgear", "20:E5:2A": "Netgear", "B0:B9:8A": "Netgear",
  "00:26:5A": "D-Link", "1C:7E:E5": "D-Link", "C8:D3:A3": "D-Link", "34:08:04": "D-Link",
  "00:25:9E": "Huawei", "34:6B:D3": "Huawei", "78:1D:BA": "Huawei", "18:C5:8A": "Huawei",
  "E8:CD:2D": "Huawei", "40:4E:36": "Huawei", "C8:0C:C8": "Hikvision", "44:47:CC": "Huawei",
  "F4:9F:F3": "ZTE", "34:4B:50": "ZTE", "C0:3D:92": "ZTE", "D0:57:7B": "ZTE",
  "54:FA:3E": "Sercomm (Vodafone)", "00:0C:42": "MikroTik", "48:8F:5A": "MikroTik",
  "CC:2D:E0": "MikroTik", "D4:CA:6D": "Routerboard", "2C:C8:35": "Sercomm",
  "00:24:7F": "Sagemcom", "44:E9:DD": "Sagemcom", "E4:9E:12": "Sagemcom",
  "00:1D:7E": "Cisco-Linksys", "58:6D:8F": "Cisco-Linksys", "C0:FF:D4": "Cisco",
  "AC:9C:E4": "Apple", "F0:18:98": "Apple", "D0:03:4B": "Apple", "A4:D1:8C": "Apple",
  "00:17:9A": "D-Link", "00:1E:2A": "Netgear", "00:18:4D": "Netgear",
  "00:0B:82": "Grandstream", "00:1E:58": "D-Link", "00:21:29": "Netgear",
  "FC:EC:DA": "Ubiquiti", "24:A4:3C": "Ubiquiti", "78:8A:20": "Ubiquiti",
  "08:00:27": "VirtualBox", "52:54:00": "QEMU/KVM", "00:16:3E": "Xen",
  "00:1C:42": "Parallels", "00:05:69": "VMware", "00:1C:14": "VMware",
  "00:23:CD": "TP-Link", "00:27:19": "TP-Link", "64:66:B3": "TP-Link",
  "30:B5:C2": "TP-Link", "60:32:B1": "TP-Link", "6C:B7:49": "TP-Link",
  "74:DA:38": "TP-Link", "84:16:F9": "TP-Link", "90:F6:52": "TP-Link",
  "98:DA:C4": "TP-Link", "A0:F3:C1": "TP-Link", "C0:61:18": "TP-Link",
};

function isPrivate(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}

/** اكتشاف البوابة الافتراضية: /proc/net/route (hex little-endian) ثم ip route */
function findGateway(): { ip: string; iface: string } | null {
  try {
    const text = fs.readFileSync("/proc/net/route", "utf8");
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length > 3 && cols[1] === "00000000") {
        const hex = cols[2];
        const ip = [6, 4, 2, 0].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(".");
        if (ip !== "0.0.0.0") return { ip, iface: cols[0] };
      }
    }
  } catch {
    /* ليست لينكس */
  }
  return null;
}

function tcpOpen(ip: string, port: number, timeout = 900): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(v);
      }
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, ip);
  });
}

function httpBanner(ip: string): Promise<{ status: number; server: string; title: string } | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection(80, ip);
    let buf = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const statusLine = buf.match(/HTTP\/[\d.]+\s+(\d{3})/);
      const server = buf.match(/[Ss]erver:\s*([^\r\n]+)/)?.[1]?.trim() ?? "";
      const title = buf.match(/<title[^>]*>([^<]{0,120})<\/title>/i)?.[1]?.trim() ?? "";
      socket.destroy();
      resolve(statusLine ? { status: Number(statusLine[1]), server, title } : null);
    };
    socket.setTimeout(1800, finish);
    socket.once("connect", () => socket.write(`GET / HTTP/1.0\r\nHost: ${ip}\r\nUser-Agent: PhoneConn-Probe\r\nAccept: */*\r\n\r\n`));
    socket.on("data", (d) => {
      buf += d.toString("latin1");
      if (buf.length > 4096) finish();
    });
    socket.on("close", finish);
    socket.on("error", () => {
      settled = true;
      socket.destroy();
      resolve(null);
    });
  });
}

function arpMac(ip: string): string | null {
  try {
    const text = fs.readFileSync("/proc/net/arp", "utf8");
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols[0] === ip && cols[3] && cols[3] !== "00:00:00:00:00:00") return cols[3].toUpperCase();
    }
  } catch {
    /* غير لينكس */
  }
  return null;
}

function pingHost(ip: string): Promise<{ ok: boolean; avg: number | null; loss: number | null; error?: string }> {
  return new Promise((resolve) => {
    execFile("ping", ["-c", "4", "-W", "2", ip], { timeout: 12_000 }, (err, stdout) => {
      if (err && !stdout) {
        resolve({ ok: false, avg: null, loss: null, error: "ping غير متاح في بيئة الاستضافة (يتطلب صلاحية ICMP)" });
        return;
      }
      const avg = Number(stdout.match(/= [\d.]+\/([\d.]+)\//)?.[1]);
      const loss = Number(stdout.match(/([\d.]+)% packet loss/)?.[1]);
      resolve({ ok: !Number.isNaN(avg), avg: Number.isNaN(avg) ? null : avg, loss: Number.isNaN(loss) ? null : loss });
    });
  });
}

function guessBrand(server: string, title: string): string | null {
  const hay = `${server} ${title}`.toLowerCase();
  const table: [string, string][] = [
    ["tp-link", "TP-Link"], ["tplink", "TP-Link"], ["huawei", "Huawei"], ["zte", "ZTE"],
    ["d-link", "D-Link"], ["dlink", "D-Link"], ["netgear", "Netgear"], ["linksys", "Linksys"],
    ["asus", "Asus"], ["sagemcom", "Sagemcom"], ["sercomm", "Sercomm"], ["mikrotik", "MikroTik"],
    ["vodafone", "Vodafone"], ["etisalat", "Etisalat"], ["tenda", "Tenda"], ["xiaomi", "Xiaomi"],
    ["openwrt", "OpenWrt"], ["fiberhome", "FiberHome"], ["nokia", "Nokia"], ["cisco", "Cisco"],
  ];
  for (const [key, brand] of table) if (hay.includes(key)) return brand;
  return null;
}

export async function GET() {
  const gw = findGateway();
  if (!gw) {
    return NextResponse.json(
      { mode: "unavailable", reason: "لم يتم العثور على بوابة شبكة لهذا الخادم" },
      { status: 200 }
    );
  }
  if (!isPrivate(gw.ip)) {
    return NextResponse.json(
      {
        mode: "unavailable",
        reason: `بوابة الخادم (${gw.ip}) ليست شبكة منزلية محلية — هذا متوقع في الاستضافة السحابية. شغّل التطبيق محلياً داخل شبكتك (الخطوات بالأسفل) وسيتصل هذا الفحص براوتر بيتك فعلياً.`,
      },
      { status: 200 }
    );
  }

  const [ports, banner, mac, ping] = await Promise.all([
    Promise.all(PROBE_PORTS.map(async (p) => ({ port: p, open: await tcpOpen(gw.ip, p) }))),
    httpBanner(gw.ip),
    Promise.resolve(arpMac(gw.ip)),
    pingHost(gw.ip),
  ]);

  const vendor = mac ? OUI[mac.slice(0, 8)] ?? null : null;
  const brand = banner ? guessBrand(banner.server, banner.title) : null;

  return NextResponse.json(
    {
      mode: "direct",
      gateway: gw.ip,
      iface: gw.iface,
      ping,
      openPorts: ports.filter((p) => p.open).map((p) => p.port),
      banner,
      mac,
      vendor,
      brand,
      note: "هذه نتائج اتصال مباشر من الخادم بشبكته — تعكس راوتر بيتك فقط عند تشغيل التطبيق محلياً داخل شبكتك.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
