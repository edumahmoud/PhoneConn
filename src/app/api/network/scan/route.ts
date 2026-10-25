import { NextRequest, NextResponse } from "next/server";
import { scanNetwork } from "@/lib/scanner/network";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    const result = await scanNetwork(force);
    return NextResponse.json(result);
  } catch (err) {
    console.error("network/scan error:", err);
    return NextResponse.json(
      { error: "فشل تنفيذ فحص الشبكة — تحقق من سجل الخادم" },
      { status: 500 }
    );
  }
}
