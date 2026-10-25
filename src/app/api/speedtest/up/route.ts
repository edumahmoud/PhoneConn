// استقبال بايتات اختبار سرعة الرفع — يقرأ الجسم ويهمله ويقيس الطول
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let received = 0;
  const reader = req.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.length ?? 0;
    }
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "X-Received": String(received) },
  });
}
