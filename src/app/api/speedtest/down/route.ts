// بثّ بايتات لاختبار سرعة التحميل — يستهلكها المتصفح ويقيس الزمن
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = Number(url.searchParams.get("bytes") ?? 5_000_000);
  const bytes = Math.min(Math.max(Number.isFinite(requested) ? requested : 5_000_000, 1024), 25_000_000);

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const size = Math.min(65_536, bytes - sent);
      controller.enqueue(new Uint8Array(size).fill(0x61));
      sent += size;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
