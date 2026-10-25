// PhoneConn — Router Communication Center types
// أداة حقيقية تعمل بالكامل داخل متصفح الهاتف — لا يوجد أي فحص من السيرفر.

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface ActivityEntry {
  id: string;
  time: string;
  section: string;
  action: string;
  severity: Severity;
}

export interface TerminalLine {
  id: number;
  text: string;
  level: "info" | "ok" | "warn" | "crit" | "dim";
}

/** بطاقة شركة مصنّعة للراوترات — بيانات عامة من أدلة الاستخدام الرسمية */
export interface RouterBrand {
  id: string;
  name: string;
  /** شائع في مصر / المنطقة العربية */
  popular: boolean;
  /** عنوان راوتر خلطوي بارز (مثل MiFi) */
  mobile?: boolean;
  /** عناوين الدخول الشائعة */
  gateways: string[];
  /** روابط إدارة بنطاق محلي إن وجدت */
  adminAliases?: string[];
  /** بيانات الدخول الافتراضية (مطبوعة على ملصق الجهاز — لتذكيرك بتغييرها) */
  defaultCreds: string[];
  /** ملاحظات أمنية خاصة بهذه الشركة */
  notes: string[];
}

/** بند في التدقيق الأمني التفاعلي للراوتر */
export interface AuditCheck {
  id: string;
  label: string;
  weight: number;
  critical?: boolean;
  help: string;
}

/** معلومات اتصال الهاتف الحقيقية من متصفحه */
export interface PhoneTelemetry {
  online: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
  connectionType: string | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  localIps: string[];
  mdnsHosts: string[];
  guessedGateways: string[];
  platform: string;
  language: string;
  timezone: string;
}

/* ------------------------- الأجهزة المتصلة بالشبكة ------------------------- */

/** أنواع الأجهزة التي يمكن تصنيف المتصلين بالشبكة إليها */
export type DeviceType =
  | "router"
  | "phone"
  | "computer"
  | "tv"
  | "camera"
  | "printer"
  | "iot"
  | "virtual"
  | "unknown";

/** جهاز سجّله المستخدم من قائمة الأجهزة في لوحة الراوتر */
export interface DeviceEntry {
  id: string;
  name: string;
  /** بصيغة XX:XX:XX:XX:XX:XX — فارغ إن لم يتوفر */
  mac: string;
  ip: string;
  type: DeviceType;
  /** الشركة المصنّعة المستنتجة من MAC (قاعدة OUI) أو ما أدخله المستخدم */
  vendor: string | null;
  addedAt: string;
}

/* ------------------------------- بيانات DSL ------------------------------- */

/** وسيلة الاتصال بالإنترنت في منزلك */
export type DslMedium = "adsl" | "adsl2plus" | "vdsl2" | "fiber" | "lte";

/** أرقام الخط كما تظهر في صفحة حالة الراوتر */
export interface DslInput {
  medium: DslMedium;
  /** هامش الإشارة بالديسيبل */
  snr: number | null;
  /** توهين الخط بالديسيبل */
  attenuation: number | null;
  /** سرعة المزامنة الفعلية للموبدم Mbps */
  syncDown: number | null;
  syncUp: number | null;
  /** سرعة الخطة المشتركة Mbps — لقياس الاستغلال */
  planDown: number | null;
}

/** حكم ملوّن على قيمة مقاسة */
export interface Verdict {
  label: string;
  cls: string;
  score: number;
}

/** نتيجة تقييم كاملة لبيانات الخط */
export interface DslEvaluation {
  snrVerdict: Verdict | null;
  attVerdict: Verdict | null;
  syncVerdict: Verdict | null;
  /** أقصى سرعة تقديرية يتحملها الخط Mbps */
  estMaxRate: number | null;
  /** طول الخط النحاسي التقديري كم */
  estLineKm: number | null;
  /** نسبة استغلال الخطة 0..1 */
  utilization: number | null;
  health: { score: number; label: string; cls: string };
  tips: string[];
}
