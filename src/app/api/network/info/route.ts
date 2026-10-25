import { NextResponse } from "next/server";
import { getNetworkInfo } from "@/lib/scanner/network";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const info = await getNetworkInfo();
    return NextResponse.json(info);
  } catch (err) {
    console.error("network/info error:", err);
    return NextResponse.json({ error: "فشل جمع معلومات الشبكة" }, { status: 500 });
  }
}
