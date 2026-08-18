import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Общий каркас API-роута: непойманная ошибка уходит в лог,
 * клиенту — единый ответ 500 с понятным русским текстом.
 */
export function withErrorHandling<Ctx>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>,
  message = "Ошибка сервера"
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(err);
      return jsonError(message, 500);
    }
  };
}
