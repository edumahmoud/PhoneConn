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
