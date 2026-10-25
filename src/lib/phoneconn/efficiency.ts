// مكتبة القياس الحقيقي لكفاءة الاتصال عبر الراوتر — تعمل في متصفح الهاتف
// جميع القياسات فعلية: زمن استجابة، اهتزاز، فقد، سرعة تحميل/رفع، ازدحام المخازن.

export interface LatencyResult {
  samples: number[];
  min: number;
  max: number;
  median: number;
  avg: number;
  jitter: number;
  loss: number; // 0..1
}

export interface SpeedResult {
  mbps: number;
  bytes: number;
  seconds: number;
  endpoint: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/** سلسلة قياسات زمن استجابة حقيقية (fetch إلى 204 بلا تخزين مؤقت) */
export async function latencySuite(
  url: string,
  count: number,
  onSample?: (ms: number | null) => void,
  timeoutMs = 3000
): Promise<LatencyResult> {
  const samples: number[] = [];
  let failures = 0;

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}-${i}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const ms = performance.now() - t0;
      if (!res.ok && res.status !== 204) throw new Error(String(res.status));
      samples.push(ms);
      onSample?.(ms);
    } catch {
      failures += 1;
      onSample?.(null);
    }
    // فاصل صغير حتى لا تتراكم الطلبات
    await new Promise((r) => setTimeout(r, 40));
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0;
  let jitter = 0;
  if (sorted.length > 1) {
    const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / sorted.length;
    jitter = Math.sqrt(variance);
  }

  return {
    samples,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: percentile(sorted, 50),
    avg,
    jitter,
    loss: count ? failures / count : 0,
  };
}

/** اختبار سرعة التحميل الحقيقي — Cloudflare أولاً ثم خادم التطبيق كبديل */
export async function downloadTest(
  onProgress?: (mbps: number) => void
): Promise<SpeedResult> {
  const endpoints: { url: string; name: string }[] = [
    { url: "https://speed.cloudflare.com/__down?bytes=8000000", name: "Cloudflare" },
    { url: "/api/speedtest/down?bytes=8000000", name: "خادم التطبيق" },
  ];

  for (const ep of endpoints) {
    try {
      const t0 = performance.now();
      const res = await fetch(ep.url, {
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value?.length ?? 0;
        const sec = (performance.now() - t0) / 1000;
        if (sec > 0.3 && onProgress) onProgress((bytes * 8) / 1e6 / sec);
      }
      const seconds = (performance.now() - t0) / 1000;
      if (seconds < 0.05 || bytes < 100_000) throw new Error("too small");
      return { mbps: (bytes * 8) / 1e6 / seconds, bytes, seconds, endpoint: ep.name };
    } catch {
      /* جرّب البديل */
    }
  }
  throw new Error("فشل قياس التحميل من جميع المصادر — تحقق من اتصالك");
}

/** اختبار سرعة الرفع الحقيقي — إرسال بيانات فعلية وقياس الزمن */
export async function uploadTest(onProgress?: (mbps: number) => void): Promise<SpeedResult> {
  const bytes = 2_000_000;
  const payload = new Uint8Array(bytes).fill(0x42);

  const endpoints: { url: string; name: string }[] = [
    { url: "https://speed.cloudflare.com/__up", name: "Cloudflare" },
    { url: "/api/speedtest/up", name: "خادم التطبيق" },
  ];

  for (const ep of endpoints) {
    try {
      const t0 = performance.now();
      const res = await fetch(ep.url, {
        method: "POST",
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok && res.status !== 204) throw new Error("bad response");
      const seconds = (performance.now() - t0) / 1000;
      if (seconds < 0.02) throw new Error("too fast to be real");
      onProgress?.((bytes * 8) / 1e6 / seconds);
      return { mbps: (bytes * 8) / 1e6 / seconds, bytes, seconds, endpoint: ep.name };
    } catch {
      /* جرّب البديل */
    }
  }
  throw new Error("فشل قياس الرفع من جميع المصادر — تحقق من اتصالك");
}

export interface BloatResult {
  idleMedian: number;
  loadedMedian: number;
  delta: number;
  grade: string;
  gradeLabel: string;
}

/** اختبار ازدحام المخازن (Bufferbloat): زمن الاستجابة أثناء تحميل ثقيل مقابل الخمول */
export async function bufferbloatTest(): Promise<BloatResult> {
  const idle = await latencySuite("/api/ping", 10);
  const loadPromise = downloadTest().catch(() => null);
  await new Promise((r) => setTimeout(r, 400));
  const loaded = await latencySuite("/api/ping", 12, undefined, 8000);
  await loadPromise;

  const delta = Math.max(0, loaded.median - idle.median);
  let grade = "F";
  let gradeLabel = "ازدحام شديد جداً — المخازن تُخنق الشبكة";
  if (delta < 5) { grade = "A+"; gradeLabel = "ممتاز — لا ازدحام يُذكر"; }
  else if (delta < 20) { grade = "A"; gradeLabel = "جيد جداً — ازدحام طفيف"; }
  else if (delta < 50) { grade = "B"; gradeLabel = "مقبول — ازدحام ملحوظ تحت الحمل"; }
  else if (delta < 100) { grade = "C"; gradeLabel = "ضعيف — الشبكة تتعثر أثناء التحميل"; }
  else if (delta < 200) { grade = "D"; gradeLabel = "سيئ — مكالماتك تتقطع عند التحميل"; }

  return { idleMedian: idle.median, loadedMedian: loaded.median, delta, grade, gradeLabel };
}

export interface EfficiencyReport {
  latency: LatencyResult;
  download: SpeedResult;
  upload: SpeedResult;
  bloat: BloatResult;
  at: string;
}

/** تقييمات مختصرة لكل مقياس */
export function latencyVerdict(ms: number): { label: string; cls: string } {
  if (ms < 15) return { label: "ممتاز", cls: "text-emerald-300" };
  if (ms < 35) return { label: "جيد جداً", cls: "text-emerald-300" };
  if (ms < 70) return { label: "مقبول", cls: "text-amber-300" };
  return { label: "بطيء", cls: "text-red-300" };
}

export function jitterVerdict(ms: number): { label: string; cls: string } {
  if (ms < 3) return { label: "مستقر تماماً", cls: "text-emerald-300" };
  if (ms < 8) return { label: "مستقر", cls: "text-emerald-300" };
  if (ms < 20) return { label: "متذبذب", cls: "text-amber-300" };
  return { label: "غير مستقر", cls: "text-red-300" };
}

export function speedVerdict(mbps: number): { label: string; cls: string } {
  if (mbps >= 50) return { label: "ممتازة", cls: "text-emerald-300" };
  if (mbps >= 20) return { label: "جيدة", cls: "text-emerald-300" };
  if (mbps >= 5) return { label: "مقبولة", cls: "text-amber-300" };
  return { label: "ضعيفة", cls: "text-red-300" };
}

export function lossVerdict(loss: number): { label: string; cls: string } {
  if (loss === 0) return { label: "صفر فقد — ممتاز", cls: "text-emerald-300" };
  if (loss <= 0.02) return { label: "فقد طفيف", cls: "text-amber-300" };
  return { label: "فقد مؤثر — مشكلة إشارة أو ازدحام", cls: "text-red-300" };
}
