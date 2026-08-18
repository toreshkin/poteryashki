import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { CONTACT_FIELDS } from "@/lib/report-fields";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

// Контакты не входят в массовую выдачу /api/reports, чтобы список телефонов
// нельзя было выкачать одним запросом. Здесь — по одной заявке и под лимитом.
export const GET = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const ip = getClientIp(req);
    if (!rateLimit(`contacts:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reports")
      .select(CONTACT_FIELDS)
      .eq("id", id)
      .neq("status", "hidden")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    return NextResponse.json(data);
  }
);
