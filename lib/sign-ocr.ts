import "server-only";

/**
 * 간판 사진에서 상호 읽기 (F29) — Claude Haiku 사진 인식.
 *
 * 왜 무료 OCR(tesseract.js)이 아닌가: 2026-09-26 실제 간판 사진 4장(태평한우·삼성화재·K-water·대전무역회관)으로
 * 시험했더니 **네 장 다 의미 없는 글자**(`"Fo 1 : ㅣ i= {|"` 류)가 나왔습니다. 간판 사진은 비스듬하고
 * 조명·배경이 섞여 문서용 OCR 이 못 읽습니다.
 *
 * 🔴 **돈이 나가는 경로입니다** — 대시보드 Secret `ANTHROPIC_API_KEY` 가 없으면 꺼져 있고 버튼이 «설정 필요»를 띄웁니다.
 *    사진마다 사람이 «상호 읽기»를 누를 때만 부릅니다(자동으로 전부 돌리지 않습니다). 웹용 사진(긴 변 1600px)을 보냅니다.
 * 🔴 결과는 **추정**입니다 — 화면에 «AI 인식 · 확인 필요»로 띄우고, 상호 칸을 사람이 확정합니다.
 */

export const OCR_MODEL = "claude-haiku-4-5-20251001";

export function ocrReady(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export type SignReading = { name: string; signType: string; text: string };

export async function readSign(image: ArrayBuffer, mime = "image/webp"): Promise<SignReading> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("상호 읽기가 꺼져 있습니다 — ANTHROPIC_API_KEY 를 넣어야 합니다.");
  const b64 = Buffer.from(image).toString("base64");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: OCR_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
            {
              type: "text",
              text:
                "간판 시공 현장 사진입니다. 간판에 보이는 글자를 읽어 주세요. JSON 한 줄로만 답하세요: " +
                '{"name":"가게·기관 상호(가장 크게 보이는 이름, 모르면 빈 문자열)","signType":"간판 종류 추정(채널간판·돌출간판·스카시·현수막·실내사인 등, 모르면 빈 문자열)","text":"보이는 글자 전부(줄바꿈은 / 로)"}. ' +
                "글자가 안 보이거나 확실하지 않으면 지어내지 말고 빈 문자열로 두세요.",
            },
          ],
        },
      ],
    }),
  });
  const j = (await r.json()) as { content?: { type: string; text?: string }[]; error?: { message: string } };
  if (!r.ok) throw new Error(`상호 읽기 실패: ${j.error?.message ?? r.status}`);
  const raw = j.content?.find((c) => c.type === "text")?.text ?? "";
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    const o = JSON.parse(m ? m[0] : raw) as Partial<SignReading>;
    return { name: String(o.name ?? "").slice(0, 80), signType: String(o.signType ?? "").slice(0, 40), text: String(o.text ?? "").slice(0, 900) };
  } catch {
    return { name: "", signType: "", text: raw.slice(0, 900) };
  }
}
