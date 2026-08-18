import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(aiStatus());
}
