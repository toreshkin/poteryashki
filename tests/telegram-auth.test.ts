import { createHmac } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyInitData } from "@/lib/telegram-auth";

const TOKEN = "1234567:TEST_TOKEN";

/** Собирает initData, подписанный так, как это делает Telegram. */
function signedInitData(
  fields: Record<string, string>,
  token = TOKEN
): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}

const user = JSON.stringify({ id: 42, username: "test_user" });
const freshAuthDate = String(Math.floor(Date.now() / 1000) - 60);

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe("verifyInitData", () => {
  it("принимает корректную подпись", () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    const initData = signedInitData({ auth_date: freshAuthDate, user });
    expect(verifyInitData(initData)).toEqual({
      userId: 42,
      chatId: 42,
      username: "test_user",
    });
  });

  it("отклоняет подпись чужим токеном", () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    const initData = signedInitData(
      { auth_date: freshAuthDate, user },
      "999:OTHER_TOKEN"
    );
    expect(verifyInitData(initData)).toBeNull();
  });

  it("отклоняет подделанные данные при валидном hash от других полей", () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    const initData = signedInitData({ auth_date: freshAuthDate, user });
    const tampered = initData.replace("test_user", "evil_user");
    expect(verifyInitData(tampered)).toBeNull();
  });

  it("отклоняет устаревший auth_date", () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    const old = String(Math.floor(Date.now() / 1000) - 25 * 60 * 60);
    const initData = signedInitData({ auth_date: old, user });
    expect(verifyInitData(initData)).toBeNull();
  });

  it("возвращает null без TELEGRAM_BOT_TOKEN", () => {
    const initData = signedInitData({ auth_date: freshAuthDate, user });
    expect(verifyInitData(initData)).toBeNull();
  });

  it("возвращает null на мусор", () => {
    process.env.TELEGRAM_BOT_TOKEN = TOKEN;
    expect(verifyInitData("мусор")).toBeNull();
    expect(verifyInitData("")).toBeNull();
    expect(verifyInitData(null)).toBeNull();
  });
});
