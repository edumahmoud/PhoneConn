// تقييم بيانات خط الإنترنت (DSL/VDSL/فايبر) — يعمل بالكامل في المتصفح
// الأرقام المرجعية مستندة إلى الممارسات القياسية لخطوط النحاس (هامش الإشارة والتوهين)
// والتقديرات هنا «تقريبية» لتثقيف المستخدم لا لقياس هندسي دقيق.

import type { DslEvaluation, DslInput, Verdict } from "./types";

const CLS = {
  good: "text-emerald-300",
  ok: "text-teal-300",
  fair: "text-amber-300",
  weak: "text-orange-300",
  bad: "text-red-400",
} as const;

export const DSL_MEDIUMS: { id: DslInput["medium"]; label: string; copper: boolean }[] = [
  { id: "adsl", label: "ADSL (خط هاتفي نحاسي)", copper: true },
  { id: "adsl2plus", label: "ADSL2+ (الشائع في مصر)", copper: true },
  { id: "vdsl2", label: "VDSL2 (نحاسي محسّن)", copper: true },
  { id: "fiber", label: "فايبر GPON (FTTH)", copper: false },
  { id: "lte", label: "راوتر 4G / 5G (لاسلكي)", copper: false },
];

/** تقييم هامش الإشارة SNR — الأعلى أفضل (حتى حد معقول) */
export function evaluateSnr(snr: number): Verdict {
  if (snr >= 30) return { label: "ممتاز — هامش مريح جداً", cls: CLS.good, score: 40 };
  if (snr >= 20) return { label: "جيد — اتصال مستقر", cls: CLS.ok, score: 32 };
  if (snr >= 11) return { label: "مقبول — خطر تقطّع عند الازدحام", cls: CLS.fair, score: 22 };
  if (snr >= 6) return { label: "ضعيف — انقطاعات متوقعة", cls: CLS.weak, score: 10 };
  return { label: "حرج — الخط في حالة سيئة", cls: CLS.bad, score: 0 };
}

/** تقييم التوهين — الأقل أفضل (يعني كابلاً أقصر/أفضل) */
export function evaluateAtt(att: number): Verdict {
  if (att < 20) return { label: "ممتاز — خط قصير وسليم", cls: CLS.good, score: 30 };
  if (att < 30) return { label: "جيد", cls: CLS.ok, score: 24 };
  if (att < 40) return { label: "مقبول — بُعد متوسط عن المركز", cls: CLS.fair, score: 17 };
  if (att < 50) return { label: "ضعيف — خط طويل أو متآكل", cls: CLS.weak, score: 8 };
  return { label: "سيء — جودة الخط تحد السرعة بقوة", cls: CLS.bad, score: 0 };
}

/** أقصى سرعة تقديرية للخط النحاسي من هامش الإشارة — تقريب تعليمي */
export function estimateMaxRate(medium: DslInput["medium"], snr: number): number {
  const raw = Math.max(0, (snr - 6) * 1.4);
  if (medium === "adsl") return Math.min(raw, 8);
  if (medium === "adsl2plus") return Math.min(raw, 24);
  if (medium === "vdsl2") return Math.min(Math.max(0, (snr - 6) * 8), 100);
  return raw;
}

/** طول الخط النحاسي التقديري من التوهين (≈9dB لكل كيلومتر) */
export function estimateLineKm(att: number): number {
  return att / 9;
}

function grade(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: "صحة الخط ممتازة", cls: CLS.good };
  if (score >= 65) return { label: "صحة الخط جيدة", cls: CLS.ok };
  if (score >= 45) return { label: "صحة الخط مقبولة — راقبه", cls: CLS.fair };
  return { label: "الخط يحتاج تدخل المزوّد", cls: CLS.bad };
}

/** التقييم الكامل لبيانات الخط المدخلة */
export function evaluateDsl(input: DslInput): DslEvaluation {
  const medium = DSL_MEDIUMS.find((m) => m.id === input.medium) ?? DSL_MEDIUMS[1];
  const copper = medium.copper;

  const snrVerdict = copper && input.snr != null ? evaluateSnr(input.snr) : null;
  const attVerdict = copper && input.attenuation != null ? evaluateAtt(input.attenuation) : null;
  const estMaxRate = copper && input.snr != null ? estimateMaxRate(input.medium, input.snr) : null;
  const estLineKm = copper && input.attenuation != null ? estimateLineKm(input.attenuation) : null;

  /* حكم المزامنة: مقارنة بالخطة إن وُجدت وإلا بمقارنة تقديرية بقدرة الخط */
  let syncVerdict: Verdict | null = null;
  let utilization: number | null = null;
  if (input.syncDown != null && input.syncDown > 0) {
    if (input.planDown != null && input.planDown > 0) {
      utilization = Math.min(1, input.syncDown / input.planDown);
      if (utilization >= 0.9) syncVerdict = { label: "المزامنة تحقق خطتك بالكامل", cls: CLS.good, score: 30 };
      else if (utilization >= 0.75) syncVerdict = { label: "قريبة من خطتك", cls: CLS.ok, score: 24 };
      else if (utilization >= 0.55) syncVerdict = { label: "أقل من خطتك بوضوح", cls: CLS.fair, score: 16 };
      else if (utilization >= 0.35) syncVerdict = { label: "منخفضة جداً عن خطتك", cls: CLS.weak, score: 8 };
      else syncVerdict = { label: "تحذير: جزء صغير من خطتك فقط", cls: CLS.bad, score: 0 };
    } else if (estMaxRate != null) {
      const r = Math.min(1, input.syncDown / estMaxRate);
      utilization = r;
      if (r >= 0.8) syncVerdict = { label: "الخط يعمل بقرب طاقته التقديرية", cls: CLS.good, score: 30 };
      else if (r >= 0.5) syncVerdict = { label: "تحقق معقول لقدرة الخط", cls: CLS.ok, score: 24 };
      else syncVerdict = { label: "أقل من قدرة الخط التقديرية — راجع المزوّد", cls: CLS.fair, score: 12 };
    } else {
      utilization = null;
      syncVerdict = { label: "سُجّلت المزامنة (أضف الخطة لتقييم أدق)", cls: CLS.ok, score: 20 };
    }
  }

  /* الدرجة الكلية: SNR 40 + التوهين 30 + المزامنة 30 — للفايبر/4G تعتمد على المزامنة فقط */
  let score = 0;
  let maxScore = 0;
  if (copper) {
    if (snrVerdict) { score += snrVerdict.score; maxScore += 40; }
    if (attVerdict) { score += attVerdict.score; maxScore += 30; }
    if (syncVerdict) { score += syncVerdict.score; maxScore += 30; }
    if (maxScore === 0) maxScore = 100;
  } else {
    if (syncVerdict) { score += Math.round((syncVerdict.score / 30) * 100); maxScore = 100; }
    else maxScore = 100;
  }
  const normalized = Math.round((score / maxScore) * 100);
  const health = { score: normalized, ...grade(normalized) };

  /* التوصيات */
  const tips: string[] = [];
  if (copper && input.snr != null && input.snr < 11) {
    tips.push("هامش الإشارة منخفض: ابتعد كابل الهاتف عن الكهرباء والمصابيح الموفرة، واحذف الفواصل/الامتدادات القديمة، ثم اطلب من المزوّد فحص الزوج النحاسي عندك.");
  }
  if (copper && input.attenuation != null && input.attenuation >= 40) {
    tips.push("توهين عالٍ يعني بُعداً كبيراً عن المركز أو كابلاً متآكلاً — سرعتك محدودة فيزيائياً؛ الحل الجذري هو الترقية للفايبر إن وُفر في منطقتك.");
  }
  if (input.planDown != null && input.syncDown != null && input.planDown > 0 && input.syncDown / input.planDown < 0.7) {
    tips.push("مزامنة أقل بكثير من خطتك: اطلب من المزوّد «إعادة ضبط البروفايل» على سرعة خطتك بعد التأكد من سلامة الفواصل داخل المنزل.");
  }
  if (copper && input.snr != null && input.snr >= 30 && input.planDown != null && input.syncDown != null && input.syncDown / input.planDown < 0.8) {
    tips.push("إشارتك ممتازة لكن المزامنة أقل من خطتك — المشكلة إعدادية لدى المزوّد وليست في السلك؛ الدعم يستطيع رفع البروفايل فوراً غالباً.");
  }
  if (!copper && input.medium === "fiber") {
    tips.push("في الفايبر لا يُقاس SNR/التوهين النحاسي — انظر في لوحة الراوتر صفحة PON إلى «Rx Power»؛ القيم بين ‎-8 و ‎-27 dBm طبيعية غالباً، وما دون ‎-28 dBm يستحق شكوى.");
  }
  if (!copper && input.medium === "lte") {
    tips.push("لراوترات 4G/5G: راقب «RSRP/SINR» من لوحة الجهاز — تحسين موضع الراوتر قرب نافذة مواجهة للبرج قد يضاعف السرعة.");
  }
  if (input.syncDown == null) {
    tips.push("أدخل سرعة المزامنة من صفحة Status في لوحة الراوتر — هي الرقم الذي يحدد سقف سرعتك الحقيقية بغض النظر عن خطتك.");
  }
  tips.push("اربط هذه الأرقام بالواقع الملموس: شغّل «فحص الكفاءة» في الخطوة 5 وقارن الاستجابة والسرعة الفعلية بأرقام الخط هنا.");

  return {
    snrVerdict,
    attVerdict,
    syncVerdict,
    estMaxRate,
    estLineKm,
    utilization,
    health,
    tips,
  };
}
