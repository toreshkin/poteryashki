import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("sightings")
      .select("id, lat, lng, comment, seen_at, created_at")
      .eq("report_id", id)
      .order("seen_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(req);
  if (!rateLimit(`sighting:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много отметок. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      lat?: number;
      lng?: number;
      comment?: string;
      seen_at?: string;
    };
    if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
      return NextResponse.json(
        { error: "Отметьте место на карте" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data: report } = await supabase
      .from("reports")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (!report || report.status !== "active") {
      return NextResponse.json(
        { error: "Заявка не найдена или уже закрыта" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("sightings")
      .insert({
        report_id: id,
        lat: body.lat,
        lng: body.lng,
        comment: body.comment?.trim().slice(0, 300) || null,
        seen_at:
          body.seen_at && /^\d{4}-\d{2}-\d{2}$/.test(body.seen_at)
            ? body.seen_at
            : new Date().toISOString().slice(0, 10),
      })
      .select("id, lat, lng, comment, seen_at, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
