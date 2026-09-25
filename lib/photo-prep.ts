/**
 * 현장 사진 준비 — **브라우저에서** 돕니다 (F29).
 *
 * ① 사진 속 촬영 시각(EXIF DateTimeOriginal)을 읽고 ② 긴 변 1600px 웹용 · 480px 썸네일로 다시 그립니다.
 * 🔴 캔버스로 «다시 그린» 사진에는 **EXIF 가 하나도 따라가지 않습니다** — GPS(손님 가게 좌표)·촬영기기 정보가
 *    웹용에서 자동으로 빠집니다. 공개 전에 따로 지울 필요가 없는 이유입니다. 원본(GPS 포함)은 비공개 드라이브로만 갑니다.
 * ⚠️ 아이폰 HEIC 는 크롬이 못 그립니다. 사파리·아이폰에서 올리면 브라우저가 JPEG 로 바꿔 넘겨 줍니다(추정 — 기기마다 다를 수 있음).
 */

export type Prepared = {
  web: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt: string | null;
};

async function takenAtOf(file: File): Promise<string | null> {
  try {
    const exifr = (await import("exifr")).default;
    const o = (await exifr.parse(file, ["DateTimeOriginal", "OffsetTimeOriginal", "CreateDate"])) as
      | { DateTimeOriginal?: Date; CreateDate?: Date; OffsetTimeOriginal?: string }
      | undefined;
    const d = o?.DateTimeOriginal ?? o?.CreateDate;
    if (!d || Number.isNaN(d.getTime())) return null;
    // exifr 는 시간대 없는 EXIF 시각을 «이 브라우저의 시간대»로 읽습니다. 사진에 오프셋이 있으면 그걸로 바로잡습니다
    if (o?.OffsetTimeOriginal && /^[+-]\d{2}:\d{2}$/.test(o.OffsetTimeOriginal)) {
      const [hh, mm] = o.OffsetTimeOriginal.slice(1).split(":").map(Number);
      const sign = o.OffsetTimeOriginal[0] === "-" ? -1 : 1;
      const wall = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
      return new Date(wall - sign * (hh * 60 + mm) * 60000).toISOString();
    }
    return d.toISOString();
  } catch {
    return null;
  }
}

async function encode(bmp: ImageBitmap, maxSide: number, quality: number, only?: string): Promise<{ blob: Blob; w: number; h: number }> {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  const toBlob = (type: string) => new Promise<Blob | null>((res) => c.toBlob(res, type, quality));
  let blob = only ? await toBlob(only) : await toBlob("image/webp");
  // WebP 로 못 굽는 브라우저는 PNG 를 돌려줍니다 — 그땐 JPEG 로
  if (!blob || (blob.type !== "image/webp" && blob.type !== "image/jpeg")) blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("사진을 변환하지 못했습니다.");
  return { blob, w, h };
}

export async function preparePhoto(file: File): Promise<Prepared> {
  const takenAt = await takenAtOf(file);
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const web = await encode(bmp, 1600, 0.82);
    // 썸네일은 웹용과 같은 형식으로 — 둘이 다르면 서버가 거절합니다
    const thumb = await encode(bmp, 480, 0.75, web.blob.type);
    return { web: web.blob, thumb: thumb.blob, width: web.w, height: web.h, takenAt };
  } finally {
    bmp.close();
  }
}
