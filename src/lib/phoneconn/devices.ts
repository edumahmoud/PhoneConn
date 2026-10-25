// مكتبة تعريف الأجهزة المتصلة بالشبكة — تعمل بالكامل في متصفح الهاتف
// 1) تعريف الشركة المصنّعة من عنوان MAC عبر قاعدة OUI مختصرة لأشهر المصنّعين.
// 2) تصنيف نوع الجهاز (هاتف/حاسوب/كاميرا/جهاز ذكي...) من المصنّع.
// 3) فحص شبكة فرعية /24 من المتصفح نفسه (يعمل في وضع HTTP المحلي — ويتوقف بلطف عند حجب المتصفح).

import type { DeviceType } from "./types";

/* ------------------------------ قاعدة OUI ------------------------------ */
/* أول 3 بايتات من MAC تحدد المصنّع (IEEE OUI). قائمة مختصرة لأشهر الشركات،
   وليست القائمة الكاملة (~35 ألف مدخل) — التعريف يظهر كـ«أقرب تطابق». */

type Cat = DeviceType;

const V = {
  apple: "Apple",
  samsung: "Samsung",
  huawei: "Huawei / Honor",
  xiaomi: "Xiaomi / Redmi / POCO",
  tplink: "TP-Link",
  dlink: "D-Link",
  netgear: "Netgear",
  zte: "ZTE",
  tenda: "Tenda",
  linksys: "Linksys / Cisco",
  asus: "Asus",
  mikrotik: "MikroTik",
  intel: "Intel",
  realtek: "Realtek",
  dell: "Dell",
  hp: "HP",
  lenovo: "Lenovo",
  espressif: "Espressif (شريحة ذكاء)",
  tuya: "Tuya (أجهزة ذكية)",
  rpi: "Raspberry Pi",
  hik: "Hikvision",
  dahua: "Dahua",
  google: "Google",
  amazon: "Amazon (Echo/Fire)",
  lg: "LG",
  sony: "Sony",
  oppo: "Oppo",
  oneplus: "OnePlus",
  motorola: "Motorola",
  brother: "Brother",
  canon: "Canon",
  epson: "Epson",
  vmware: "VMware",
  vbox: "VirtualBox",
  qemu: "QEMU / KVM",
  parallels: "Parallels",
} as const;

/** [المصنّع، التصنيف الأولي] */
const OUI_DB: Record<string, [string, Cat]> = {
  /* Apple — هواتف/تابلت/حاسوب */
  ...fill(["00:03:93","00:05:02","00:0a:27","00:0d:93","00:10:fa","00:14:51","00:16:cb","00:17:f2","00:19:e3","00:1b:63","00:1e:52","00:1e:c2","00:21:e9","00:23:12","00:23:df","00:24:36","00:25:00","00:25:bc","00:26:08","00:26:b0","18:af:61","28:6a:ba","40:33:1a","44:d8:84","58:55:ca","58:1f:aa","6c:19:8f","7c:6d:62","84:38:35","a4:d1:8c","a8:88:08","ac:87:a3","ac:bc:32","b8:e8:56","d8:96:95","e8:80:2e","f0:18:98","f0:b4:79","f8:1e:df"], V.apple, "phone"),
  /* Samsung — هواتف غالباً وقد تكون تلفازاً ذكية */
  ...fill(["00:16:32","00:21:19","00:23:99","00:24:54","00:26:37","08:cc:68","18:22:36","24:db:ac","30:96:fb","34:23:ba","3c:5a:b4","40:0e:85","48:44:f7","4c:bc:a5","50:cc:f8","54:92:be","a0:07:98","ac:36:13","b4:3a:28","b8:d9:ce","c0:97:27","c4:42:02","c8:ba:94","d0:22:be","d4:7d:40","d8:90:e8","dc:71:44","e4:7c:f9","f0:25:b7","f4:09:d8","f8:04:2e","fc:f1:52"], V.samsung, "phone"),
  /* Huawei — راوترات وهواتف */
  ...fill(["00:18:82","00:1e:10","00:25:9e","00:46:4b","00:66:4b","00:9a:cd","00:e0:fc","04:c0:6f","14:b9:68","18:de:d7","20:08:ed","28:6e:d4","34:6b:d3","40:4e:36","48:46:fb","4c:54:99","58:60:5f","78:1d:ba","84:be:52","94:04:9c","98:e7:f5","d4:61:2e","e8:bd:d1","f4:63:1f","fc:48:ef"], V.huawei, "router"),
  /* Xiaomi — هواتف وأجهزة ذكية */
  ...fill(["04:cf:8c","0c:1d:af","18:59:36","28:e3:1f","38:a4:ed","40:31:3c","50:8f:4c","64:09:80","64:cc:2e","74:51:ba","78:02:f8","84:f3:eb","98:fa:e3","a4:77:33","ac:c1:ee","ec:d0:9f","f0:b4:29","f8:a4:5f"], V.xiaomi, "phone"),
  /* TP-Link */
  ...fill(["00:27:19","14:cc:20","30:b5:c2","30:fc:68","50:c2:e8","54:c8:0f","64:66:b3","74:da:38","84:16:f9","a0:f3:c1","ac:84:c6","c0:25:e9","c8:3a:35","d4:6e:0e","f4:ec:38","fc:ec:da"], V.tplink, "router"),
  /* D-Link */
  ...fill(["00:0d:88","00:0f:3d","00:11:95","00:13:46","00:17:9a","00:1b:11","00:1c:f0","00:1e:58","00:22:b0","00:24:01","1c:7e:e5","28:10:7b","34:08:04"], V.dlink, "router"),
  /* Netgear */
  ...fill(["00:09:5b","00:0f:b5","00:14:6c","00:18:4d","00:1b:2f","00:1e:2a","00:22:3f","00:24:b2","20:4e:7f","28:80:88","44:94:fc","9c:3d:cf","a0:40:a0","b0:39:56","c0:3f:0e","c4:04:15"], V.netgear, "router"),
  /* ZTE */
  ...fill(["00:1e:73","00:23:89","00:26:ed","14:c4:54","34:4b:50","54:22:a6","58:1f:28","5c:8d:4e","64:bc:0c","84:5b:12","88:2d:c5","98:bc:57","a4:ec:a9","c8:5e:47","d8:5d:4c","f4:6a:92","fc:c2:33"], V.zte, "router"),
  /* Tenda */
  ...fill(["00:b0:52","14:75:90","30:58:a8","50:2b:73","68:f7:23"], V.tenda, "router"),
  /* Linksys / Cisco */
  ...fill(["00:00:0c","00:04:5a","00:0f:66","00:12:17","00:14:bf","00:16:b6","00:18:39","00:1d:7e","00:21:29","00:22:6d","00:23:69","00:25:9c"], V.linksys, "router"),
  /* Asus */
  ...fill(["00:1d:60","00:1f:c6","00:23:54","04:d9:f5","14:da:e9","1c:87:2c","2c:4d:54","ac:9e:17","bc:ee:7b","f0:79:59"], V.asus, "router"),
  /* MikroTik */
  ...fill(["48:8f:5a","4c:5e:0c","64:d1:54","6c:3b:6b","74:4d:28","b8:69:f4","cc:2d:e0","d4:ca:6d","dc:2c:6e","e4:8d:8c"], V.mikrotik, "router"),
  /* Intel — حواسيب */
  ...fill(["00:1b:21","00:1d:e0","00:1f:3b","00:22:fa","00:24:d7","3c:a9:f4","40:25:c2","a0:a8:cd","ac:7b:a1","b4:6b:fc"], V.intel, "computer"),
  ...fill(["00:e0:4c"], V.realtek, "computer"),
  ...fill(["00:14:22","00:21:70","00:23:ae","00:25:64","18:03:73"], V.dell, "computer"),
  ...fill(["00:1a:4b","00:1e:0b","00:21:5a","00:24:81","3c:d9:2b"], V.hp, "computer"),
  ...fill(["54:ee:75","9c:b6:d0"], V.lenovo, "computer"),
  /* Espressif — شرائح ESP للأجهزة الذكية والمصابيح والمقابس */
  ...fill(["18:fe:34","24:0a:c4","24:6f:28","24:b2:01","30:ae:a4","5c:cf:7f","68:c6:3a","7c:9e:bd","84:0d:8e","8c:aa:b5","a4:cf:12","b4:e6:2d","bc:dd:c2","c4:4f:33","dc:4f:22","ec:fa:bc","fc:f5:c4"], V.espressif, "iot"),
  /* Tuya */
  ...fill(["10:d5:61","7c:f6:66","84:cc:a8","d8:f1:5b"], V.tuya, "iot"),
  /* Raspberry Pi */
  ...fill(["28:cd:c1","b8:27:eb","dc:a6:32","e4:5f:01"], V.rpi, "computer"),
  /* كاميرات مراقبة */
  ...fill(["44:19:b6","44:47:cc","4c:bd:8f","bc:ad:28","c0:56:e3","d4:90:9c"], V.hik, "camera"),
  ...fill(["3c:ef:8c","90:02:a9"], V.dahua, "camera"),
  /* ترفيه ووسائط */
  ...fill(["54:60:09"], V.google, "tv"),
  ...fill(["44:65:0d","6c:56:97","74:c2:46","ac:63:be"], V.amazon, "iot"),
  ...fill(["00:1e:75","00:23:8b","10:68:3f"], V.lg, "tv"),
  ...fill(["00:13:a9","00:19:63","00:1a:80","00:1d:ba","00:24:be","78:84:3c"], V.sony, "tv"),
  /* هواتف أخرى */
  ...fill(["0c:99:21"], V.oppo, "phone"),
  ...fill(["48:9e:bd"], V.oneplus, "phone"),
  ...fill(["44:78:3e"], V.motorola, "phone"),
  /* طابعات */
  ...fill(["00:1b:a9","00:80:77"], V.brother, "printer"),
  ...fill(["00:00:85"], V.canon, "printer"),
  ...fill(["00:26:ab"], V.epson, "printer"),
  /* أجهزة افتراضية */
  ...fill(["00:05:69","00:0c:29","00:50:56"], V.vmware, "virtual"),
  ...fill(["08:00:27"], V.vbox, "virtual"),
  ...fill(["52:54:00"], V.qemu, "virtual"),
  ...fill(["00:1c:42"], V.parallels, "virtual"),
};

function fill(prefixes: string[], vendor: string, cat: Cat): Record<string, [string, Cat]> {
  const out: Record<string, [string, Cat]> = {};
  for (const p of prefixes) out[p] = [vendor, cat];
  return out;
}

/* --------------------------- بيانات العرض --------------------------- */

export const DEVICE_TYPE_META: Record<
  DeviceType,
  { label: string; chip: string }
> = {
  router: { label: "راوتر / شبكة", chip: "bg-primary/10 text-primary border-primary/40" },
  phone: { label: "هاتف / تابلت", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40" },
  computer: { label: "حاسوب", chip: "bg-teal-500/10 text-teal-300 border-teal-500/40" },
  tv: { label: "تلفاز / وسائط", chip: "bg-amber-500/10 text-amber-300 border-amber-500/40" },
  camera: { label: "كاميرا", chip: "bg-orange-500/10 text-orange-300 border-orange-500/40" },
  printer: { label: "طابعة", chip: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40" },
  iot: { label: "جهاز ذكي", chip: "bg-violet-500/10 text-violet-300 border-violet-500/40" },
  virtual: { label: "جهاز افتراضي", chip: "bg-zinc-500/10 text-zinc-400 border-zinc-500/40" },
  unknown: { label: "غير محدد", chip: "bg-zinc-500/10 text-zinc-400 border-zinc-500/40" },
};

/** شركات يُحتمل أن تكون تلفازاً لا هاتفاً — نطلب من المستخدم تعديل النوع يدوياً */
export const MAYBE_TV_VENDORS = [V.samsung, V.lg, V.sony];

export interface MacLookup {
  matched: boolean;
  vendor: string | null;
  suggestedType: DeviceType;
  randomMac: boolean;
  prefix: string;
}

/** توحيد صيغة MAC إلى XX:XX:XX:XX:XX:XX أو إرجاع null إن كانت غير صالحة */
export function normalizeMac(raw: string): string | null {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (hex.length !== 12) return null;
  const octets = hex.match(/.{2}/g) ?? [];
  return octets.join(":").toUpperCase();
}

/** تعريف المصنّع ونوع الجهاز من MAC */
export function lookupMac(raw: string): MacLookup {
  const mac = normalizeMac(raw);
  if (!mac) return { matched: false, vendor: null, suggestedType: "unknown", randomMac: false, prefix: "" };
  const prefix = mac.slice(0, 8).toLowerCase();
  const hit = OUI_DB[prefix];
  const firstOctet = parseInt(mac.slice(0, 2), 16);
  const randomMac = (firstOctet & 0x02) !== 0; // بت Locally Administered = MAC عشوائي للخصوصية
  return {
    matched: Boolean(hit),
    vendor: hit ? hit[0] : null,
    suggestedType: hit ? hit[1] : "unknown",
    randomMac,
    prefix: prefix.toUpperCase(),
  };
}

/* ---------------------- فحص الشبكة الفرعية من المتصفح ---------------------- */

export type HostState = "open" | "alive" | "silent";

export interface HostProbe {
  ip: string;
  state: HostState;
  ms: number;
}

/** أصلب 254 عنواناً في نفس /24 لعنوان معين */
export function subnetIps(ip: string): string[] {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return [];
  const base = `${p[0]}.${p[1]}.${p[2]}`;
  const out: string[] = [];
  for (let i = 1; i <= 254; i++) out.push(`${base}.${i}`);
  return out;
}

/** محاولة اتصال HTTP صامتة بعنوان واحد مع تصنيف زمني للنتيجة */
export async function probeHttpHost(ip: string, timeoutMs = 900): Promise<HostProbe> {
  const t0 = performance.now();
  try {
    await fetch(`http://${ip}/`, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ip, state: "open", ms: performance.now() - t0 };
  } catch (e) {
    const ms = performance.now() - t0;
    const name = e instanceof DOMException ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") return { ip, state: "silent", ms };
    // رفض فوري = الجهاز موجود والمنفذ مغلق؛ حجب أمني يظهر أيضاً رفضاً فورياً
    return { ip, state: ms < 150 ? "alive" : "silent", ms };
  }
}

/** هل يمنع المتصفح الاتصال المباشر بالشبكة المحلية؟ (صفحة HTTPS سحابية) */
export async function detectLanBlocked(gateway: string): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const r = await probeHttpHost(gateway, 1200);
    if (r.state === "open") return false;
    if (r.state === "silent") return false; // مهلة = المحاولة مرت فعلاً ولم يصبها حجب
    // alive = رفض سريع: قد يكون حجباً أو جهازاً بلا خدمة ويب — نكرر التحقق
    if (r.ms >= 60) return false;
  }
  return true; // ثلاث رفضات فورية أقل من 60ms = الحجب الأمني شبه مؤكد
}

/** مسح شبكة فرعية بجدولة متوازية مع تقدم حي */
export async function scanSubnet(
  ips: string[],
  onProgress?: (done: number, total: number, found: HostProbe[]) => void,
  concurrency = 24
): Promise<HostProbe[]> {
  const results: HostProbe[] = [];
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < ips.length) {
      const i = idx++;
      const r = await probeHttpHost(ips[i]);
      if (r.state !== "silent") results.push(r);
      done += 1;
      if (done % 6 === 0 || done === ips.length) onProgress?.(done, ips.length, [...results]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ips.length) }, () => worker()));
  results.sort(
    (a, b) =>
      a.ip.split(".").slice(3).map(Number)[0] - b.ip.split(".").slice(3).map(Number)[0]
  );
  return results;
}
