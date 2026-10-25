// نقطة قياس زمن الاستجابة — نفس المصدر (هاتف → خادم التطبيق) بدون تخزين مؤقت
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
