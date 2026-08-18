import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/images";

function bytes(...values: (number | string)[]): Uint8Array {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === "string") for (const ch of v) out.push(ch.charCodeAt(0));
    else out.push(v);
  }
  // добиваем до минимальной длины сниффера
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
}

describe("sniffImageType", () => {
  it("распознаёт JPEG", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("распознаёт PNG", () => {
    expect(
      sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    ).toBe("image/png");
  });

  it("распознаёт WebP", () => {
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe(
      "image/webp"
    );
  });

  it("отвергает HTML под видом картинки", () => {
    expect(sniffImageType(bytes("<script>alert(1)</script>"))).toBeNull();
  });

  it("отвергает слишком короткий файл", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
