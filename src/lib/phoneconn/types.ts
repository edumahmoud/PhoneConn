// PhoneConn — Educational simulation lab types
// All entities here are VIRTUAL / SIMULATED. Nothing touches real networks or devices.

export type SecProto = "WEP" | "WPA" | "WPA2" | "WPA3" | "Open";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface VirtualClient {
  id: string;
  name: string;
  mac: string;
  ip: string;
  os: "Android" | "iOS";
  vendor: string;
  risk: "منخفض" | "متوسط" | "مرتفع";
}

export interface VirtualNetwork {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  band: "2.4GHz" | "5GHz";
  security: SecProto;
  signal: number; // dBm (negative)
  vendor: string;
  password: string | null;
  hidden?: boolean;
  clients: VirtualClient[];
  weaknesses: string[];
  defense: string[];
}

export interface VulnEntry {
  id: string;
  cve: string;
  name: string;
  severity: Severity;
  year: number;
  description: string;
  mitigation: string;
  patchState: "مرقّع" | "غير مرقّع" | "قابل للاستغلال نظرياً";
}

export interface VirtualResource {
  id: "camera" | "mic" | "screen" | "files" | "notifications" | "location";
  label: string;
  status: "آمن" | "مكشوف" | "مخترق (محاكاة)";
  detail: string;
}

export interface VirtualDevice {
  id: string;
  name: string;
  model: string;
  os: string;
  mac: string;
  ip: string;
  battery: number;
  storageUsed: string;
  storageTotal: string;
  apps: number;
  encrypted: boolean;
  screenLock: "PIN 4 خانات" | "بصمة + PIN 6" | "نمط بسيط" | "وجه + رمز";
  lastPatch: string;
  risk: "منخفض" | "متوسط" | "مرتفع";
  resources: VirtualResource[];
  vulns: VulnEntry[];
  files: string[];
}

export type DeviceScreenState =
  | "lock"
  | "home"
  | "phishing"
  | "app-perms"
  | "camera"
  | "mirror"
  | "files";

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

export interface AuditItem {
  id: string;
  group: string;
  label: string;
  value: string;
  exposure: "عام" | "يتطلب إذناً" | "بصمة تعريفية";
  tip: string;
  risk: Severity;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  points: string[];
  body: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explain: string;
}
