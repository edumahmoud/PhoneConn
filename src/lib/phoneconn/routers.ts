// PhoneConn — قاعدة معرفة الراوترات
// بيانات عامة منوعة من أدلة الاستخدام الرسمية للشركات المصنّعة، هدفها:
// 1) مساعدتك على الوصول إلى لوحة تحكم راوترك الخاص.
// 2) تذكيرك بالتحقق من أنك غيّرت بيانات الدخول الافتراضية المطبوعة على ملصق جهازك.

import type { AuditCheck, RouterBrand } from "./types";

/** أكثر عناوين البوابات شيوعاً عالمياً */
export const COMMON_GATEWAYS: string[] = [
  "192.168.1.1",
  "192.168.0.1",
  "192.168.8.1",
  "192.168.100.1",
  "192.168.2.1",
  "192.168.31.1",
  "192.168.1.254",
  "10.0.0.1",
  "10.0.0.138",
  "172.16.0.1",
];

/** منافذ لوحات التحكم الشائعة بجانب 80 */
export const ADMIN_PORTS: { port: string; scheme: "http" | "https"; label: string }[] = [
  { port: "", scheme: "http", label: "HTTP القياسي" },
  { port: "", scheme: "https", label: "HTTPS القياسي" },
  { port: "8080", scheme: "http", label: "HTTP 8080" },
  { port: "8443", scheme: "https", label: "HTTPS 8443" },
];

export const ROUTER_BRANDS: RouterBrand[] = [
  {
    id: "tplink",
    name: "TP-Link",
    popular: true,
    gateways: ["192.168.0.1", "192.168.1.1"],
    adminAliases: ["tplinkwifi.net", "tplinkmodem.net"],
    defaultCreds: ["admin / admin", "admin / (حسب الملصق في الأجهزة الحديثة)"],
    notes: [
      "من داخل اللوحة: Advanced → System Tools → Firmware Upgrade لتحديث النظام.",
      "عطّل WPS من QSS/WPS إن لم تكن تستخدمه — ثغرة Pixie-Dust تستهدفه.",
      "فعّل «أحدث إصدار لتشفير WPA3» إن دعمه جهازك من Wireless → Security.",
    ],
  },
  {
    id: "huawei",
    name: "Huawei",
    popular: true,
    gateways: ["192.168.1.1", "192.168.100.1", "192.168.8.1"],
    adminAliases: [],
    defaultCreds: [
      "admin / admin (راوترات منزلية)",
      "admin / كلمة على الملصق (أجهزة الفايبر ONT مثل HG8245)",
      "admin / admin (MiFi مثل E5573/E5576)",
    ],
    notes: [
      "أجهزة الفايبر من مزوّدي الإنترنت: بيانات الدخول مطبوعة على ملصق الجهاز الخلفي.",
      "من WLAN → WLAN Basic Configuration تأكد من وضع التشفير WPA2-PSK أو أحدث.",
      "في أجهزة ONT: غيّر حساب admin AND المستخدم الثانوي (UserAdmin) — كلاهما يمنح صلاحيات.",
    ],
  },
  {
    id: "zte",
    name: "ZTE",
    popular: true,
    gateways: ["192.168.1.1", "192.168.2.1", "192.168.0.1"],
    adminAliases: [],
    defaultCreds: [
      "admin / admin",
      "أجهزة مزوّدي الخدمة (مثل F660/F670L): بيانات على الملصق أو يحددها المزوّد",
    ],
    notes: [
      "راوترات F660 الشائعة عند مزوّدي الفايبر: سجّل بحساب «المستخدم العادي» ثم راقب الأجهزة المتصلة.",
      "من Local Network → WLAN: فعّل قائمة الأجهزة الموثوقة (MAC Filter) إن أمكن.",
      "تحقق دورياً من System → Firmware Upgrade مع مزوّد الخدمة.",
    ],
  },
  {
    id: "dlink",
    name: "D-Link",
    popular: true,
    gateways: ["192.168.0.1"],
    adminAliases: ["dlinkrouter.local"],
    defaultCreds: ["admin / (فارغة في القديم)", "admin / admin", "Admin / (حسب الملصق في الأحدث)"],
    notes: [
      "في الإعداد الأول يطلب منك الجهاز الحديث إنشاء كلمة مرور — لا تتركها قريبة من اسم الشبكة.",
      "عطّل «Remote Management» من Management → System Admin.",
      "فعّل «Automatic Firmware Update» إن توفرت.",
    ],
  },
  {
    id: "netgear",
    name: "Netgear",
    popular: false,
    gateways: ["192.168.0.1", "192.168.1.1"],
    adminAliases: ["routerlogin.net"],
    defaultCreds: ["admin / password", "admin / (حسب الملصق في الأحدث)"],
    notes: [
      "كلمة password الافتراضية من أشهر ما يُنسى تغييره — تحقق فوراً.",
      "فعّل Auto Update من Settings → Firmware Update.",
      "استخدم تطبيق Nighthawk/Orbi لمراقبة الأجهزة المتصلة أولاً بأول.",
    ],
  },
  {
    id: "linksys",
    name: "Linksys",
    popular: false,
    gateways: ["192.168.1.1"],
    adminAliases: ["linksyssmartwifi.com"],
    defaultCreds: ["admin / admin (الأقدم)", "يُنشأ أثناء الإعداد (الأحدث)"],
    notes: [
      "لوحة Smart Wi-Fi تسمح بمراقبة الأجهزة وتحديد أولوية الاتصال.",
      "فعّل Network Map لرؤية كل المتصلين وتعطيل أجهزة غير معروفة.",
    ],
  },
  {
    id: "asus",
    name: "Asus",
    popular: false,
    gateways: ["192.168.1.1", "192.168.50.1"],
    adminAliases: ["router.asus.com"],
    defaultCreds: ["admin / admin (يُطلب تغييره فوراً في الأحدث)"],
    notes: [
      "فعّل «Protect against WAN attacks» من Firewall — مفعّل افتراضياً في أغلب الموديلات.",
      "استخدم AiProtection إن توفرت لفحص حركة الشبكة.",
      "من الأجهزة الحديثة: سيُطلب منك إنشاء كلمة مرور إدارة مختلفة عن كلمة WiFi.",
    ],
  },
  {
    id: "sagemcom",
    name: "Sagemcom",
    popular: true,
    gateways: ["192.168.1.1", "192.168.254.254"],
    adminAliases: [],
    defaultCreds: ["admin / admin", "بيانات مزوّد الخدمة على الملصق"],
    notes: [
      "شائع في راوترات مزوّدي الخدمة في مصر والخليج — راجع ملصق الجهاز أولاً.",
      "من WLAN: عطّل WPS وقم بتغيير SSID الافتراضي الذي يكشف نوع الجهاز.",
    ],
  },
  {
    id: "we",
    name: "WE (المصرية للاتصالات)",
    popular: true,
    gateways: ["192.168.1.1"],
    adminAliases: [],
    defaultCreds: [
      "admin / admin (أغلب أجهزة ZTE/Sagemcom/TP-Link المزوّدة)",
      "بيانات مطبوعة على ملصق أسفل الراوتر",
    ],
    notes: [
      "راوترات الفايبر المنزّلة: كلمة مرور WiFi الافتراضية مطبوعة على الملصق — غيّرها بعد أول اتصال.",
      "استخدم خدمة WE للاستعلام عن الأجهزة المتصلة من التطبيق الرسمي إن توفرت.",
      "لا تشارك صورة الملصق (يحتوي WPS PIN وكلمات الدخول) في أي مكان عام.",
    ],
  },
  {
    id: "vodafone",
    name: "Vodafone",
    popular: true,
    gateways: ["192.168.1.1"],
    adminAliases: [],
    defaultCreds: [
      "admin / admin (Vodafone HG6245D وغيره)",
      "المفتاح اللاسلكي مطبوع على الملصق — غيّره",
    ],
    notes: [
      "راوتر Vodafone Fiber المنزلي يعرض الأجهزة المتصلة من لوحة Device Management.",
      "عطّل WPS من إعدادات WLAN — بعض أجهزة Vodafone تفعّله افتراضياً.",
    ],
  },
  {
    id: "etisalat",
    name: "Etisalat (اتصالات)",
    popular: true,
    mobile: true,
    gateways: ["192.168.1.1", "192.168.8.1"],
    adminAliases: [],
    defaultCreds: ["admin / admin", "MiFi: admin / admin أو حسب الملصق"],
    notes: [
      "أجهزة MiFi (مودم الجيب): 192.168.8.1 هي العنوان المعتاد — غيّر كلمة SSID الافتراضية فوراً.",
      "راجع حصة البيانات والأجهزة المتصلة من داخل لوحة الجهاز أو تطبيق المزوّد.",
    ],
  },
  {
    id: "orange",
    name: "Orange",
    popular: true,
    gateways: ["192.168.1.1", "192.168.0.1"],
    adminAliases: [],
    defaultCreds: ["admin / admin", "حسب الملصق في أجهزة Fiber"],
    notes: [
      "بعض أجهزة Orange تُدار عبر تطبيق Orange Router — فعّل التحديث التلقائي منه.",
      "افصل شبكة الضيوف عن شبكتك الرئيسية إن لم تكن تستخدمها.",
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi / Redmi",
    popular: false,
    gateways: ["192.168.31.1"],
    adminAliases: [],
    defaultCreds: ["(لا توجد كلمة مرور افتراضية — تُنشأ أثناء الإعداد عبر تطبيق Mi Home)"],
    notes: [
      "العنوان 192.168.31.1 فريد لهذه الشركة — احفظه.",
      "اربط الراوتر بتطبيق Mi Home لتحديث تلقائي ومراقبة الأجهزة.",
    ],
  },
  {
    id: "tenda",
    name: "Tenda",
    popular: false,
    gateways: ["192.168.0.1"],
    adminAliases: ["tendawifi.com"],
    defaultCreds: ["(كلمة مرور الإدارة تُنشأ أثناء الإعداد الأول)"],
    notes: [
      "لا تضع كلمة مرور الإدارة نفسها كلمة WiFi — افصل بينهما.",
      "من Internet Settings راجع DNS دورياً — تغيّره برمجيات خبيثة يوجّهك لمواقع مزيفة.",
    ],
  },
  {
    id: "mikrotik",
    name: "MikroTik",
    popular: false,
    gateways: ["192.168.88.1"],
    adminAliases: [],
    defaultCreds: ["admin / (فارغة في الإصدارات القديمة — Winbox/WebFig)"],
    notes: [
      "أشهر ثغرة تاريخية: Mermaid/FTP القديمة — حدّث RouterOS فوراً بعد أول دخول.",
      "عطّل خدمات Winbox/IP من WAN، واسمح بها من LAN فقط.",
      "أنشئ مستخدماً جديداً وعطّل حساب admin الافتراضي.",
    ],
  },
];

/** بنود التدقيق الأمني التفاعلي — الأوزان تجمع 100 */
export const AUDIT_CHECKS: AuditCheck[] = [
  {
    id: "admin-pass",
    label: "غيّرت كلمة مرور لوحة تحكم الراوتر عن الافتراضية",
    weight: 20,
    critical: true,
    help: "ادخل لوحة التحكم → إعدادات النظام / Administration → كلمة مرور المدير. إن كانت لا تزال admin/admin أو كما على الملصق فهذه أخطر نقطة: أي شخص متصل بشبكتك يتحكم بجهازك كاملاً.",
  },
  {
    id: "wpa",
    label: "التشفير WPA2 أو WPA3 (وليس WEP أو شبكة مفتوحة)",
    weight: 20,
    critical: true,
    help: "من إعدادات Wireless/Security اختر WPA2-PSK (AES) أو WPA2/WPA3 Transition. شبكات WEP تُكسر في دقائق بشبكة لابتوب عادية، والشبكات المفتوحة تعني مشاركة كل حركة بياناتك مع الجالسين.",
  },
  {
    id: "wifi-pass",
    label: "كلمة مرور WiFi قوية (12+ خانة، ليست كلمة قاموس)",
    weight: 10,
    critical: false,
    help: "الشائع اختراق شبكات المنازل في مصر هو تخمين كلمات مثل 12345678 أو رقم الهاتف. استخدم عبارة طويلة عشوائية. راوترات WPA3 تمنع هجمات القاموس Offline تلقائياً.",
  },
  {
    id: "wps",
    label: "WPS معطّل (زر الاتصال السريع)",
    weight: 10,
    critical: false,
    help: "من إعدادات Wireless → WPS عطّله. ثغرات Pixie-Dust تستخرج رمز WPS وتعيد كلمة مرور WiFi كاملة في ثوانٍ على أجهزة كثيرة — من دون معرفة أي كلمة.",
  },
  {
    id: "firmware",
    label: "نظام الراوتر (Firmware) على آخر إصدار",
    weight: 10,
    critical: false,
    help: "من System Tools / Administration → Firmware Upgrade. ثغرات مسجلة على راوترات شهيرة تتيح اختراقاً كاملاً من دون كلمة مرور، والتحديث يغلقها. راوترات المزوّد قد تحتاج التواصل مع خدمة العملاء.",
  },
  {
    id: "remote",
    label: "الإدارة عن بُعد (Remote Management) معطّلة",
    weight: 10,
    critical: true,
    help: "ابحث عن خيار Remote Management / WAN Access وتأكد أنه Disabled. تفعيله يفتح لوحة تحكمك على الإنترنت العام، وتُفحص هذه المنافذ آلياً آلاف المرات يومياً.",
  },
  {
    id: "upnp",
    label: "UPnP معطّل أو مُراجَع (قائمة فتحات المنافذ فارغة)",
    weight: 5,
    critical: false,
    help: "من Advanced Routing / NAT → UPnP. هو يفتح منافذ على الإنترنت تلقائياً لأي برنامج يطلبه — راجع قائمة Virtual Servers / Port Forwarding واحذف ما لا تعرفه.",
  },
  {
    id: "guest",
    label: "شبكة الضيوف منفصلة عن أجهزتي الشخصية",
    weight: 5,
    critical: false,
    help: "فعّل Guest Network للزوار. تمنع جهاز الزائر من رؤية طابعه وكاميرات مراقبتك وأجهزتك عبر الشبكة المحلية (Client Isolation).",
  },
  {
    id: "devices",
    label: "راجعت قائمة الأجهزة المتصلة ولم أجد جهازاً غريباً",
    weight: 5,
    critical: false,
    help: "من Status / Attached Devices / Device Management: قارن كل جهاز بأجهزتك المعروفة. جهاز غير معروف يعني تسريب كلمة المرور — غيّرها فوراً وفعّل MAC Filter.",
  },
  {
    id: "dns",
    label: "DNS مضبوط على قيمة موثوقة (لم يتغير دون علمي)",
    weight: 5,
    critical: false,
    help: "من Network/WAN → DNS: إن وجدت عنوان DNS غريباً لم تضعه (مثل 8.8.8.8 استُبدل بعنوان مجهول) فهذه علامة اختراق تحوّلك لمواقع مزيفة حتى مع كتابة العنوان صحيحاً.",
  },
];

/** دروس مصغرة: كيف أجد عنوان راوتري من كل نظام */
export const GATEWAY_GUIDES: { platform: string; icon: string; steps: string[] }[] = [
  {
    platform: "أندرويد",
    icon: "smartphone",
    steps: [
      "افتح الإعدادات ثم «الشبكة والإنترنت» (أو «اتصالات») ثم Wi-Fi.",
      "اضغط مطوّلاً على اسم شبكتك المتصلة واختر «تفاصيل» أو اضغط على علامة الترس ⚙.",
      "وسّع «الخيارات المتقدمة» — ستجد «بوابة» (Gateway) مثل 192.168.1.1.",
      "في بعض الهواتف: الإعدادات → About phone → Status → Gateway.",
    ],
  },
  {
    platform: "iPhone / iPad",
    icon: "apple",
    steps: [
      "الإعدادات ← Wi-Fi ← اضغط على علامة ⓘ بجانب اسم شبكتك.",
      "في قسم IPv4 ابحث عن «الموجّه / Router» — هذا هو عنوان راوترك.",
      "مثال شائع: 192.168.1.1 أو 10.0.0.1.",
    ],
  },
  {
    platform: "Windows",
    icon: "laptop",
    steps: [
      "افتح CMD واكتب: ipconfig",
      "ابحث عن Default Gateway أمام محوّل Wi-Fi.",
      "أو من الإعدادات ← الشبكة ← الخصائص ← بوابة IPv4 الافتراضية.",
    ],
  },
];

/** بحث نطاق خاص في سلسلة ICE candidate */
export function extractPrivateIp(candidate: string): string | null {
  const m = candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  if (!m) return null;
  const ip = m[1];
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  const [a, b] = parts;
  const isPrivate =
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254);
  return isPrivate ? ip : null;
}

/** خمّن عناوين بوابة محتملة من IP محلي للهاتف */
export function guessGateways(localIp: string): string[] {
  const p = localIp.split(".");
  if (p.length !== 4) return [];
  const base = `${p[0]}.${p[1]}.${p[2]}`;
  return [`${base}.1`, `${base}.254`];
}
