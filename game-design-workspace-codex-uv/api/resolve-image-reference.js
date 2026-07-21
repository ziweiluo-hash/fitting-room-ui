const MAX_REFERENCE_IMAGE_BYTES = 20 * 1024 * 1024;

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = parseBody(request.body);
    const imageUrl = body.imageUrl || body.url || "";
    const token = process.env.BABYLON_JWT_TOKEN || process.env.BABYLON_TOKEN || process.env.JWT_TOKEN || "";
    const dataUrl = await resolveImageReferenceDataUrl(imageUrl, token);
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({ dataUrl });
  } catch (error) {
    return response.status(500).json({ error: error.message || "Image reference conversion failed" });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

async function resolveImageReferenceDataUrl(url, token) {
  if (!url || typeof url !== "string") {
    throw new Error("Missing image URL.");
  }
  if (url.startsWith("data:image/")) return url;
  if (!isTrustedBabylonResourceUrl(url)) {
    throw new Error("Only Babylon resource image URLs can be converted automatically.");
  }
  return fetchImageAsDataUrl(url, token);
}

function isTrustedBabylonResourceUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname === "babylon.garenanow.com"
      && (parsed.pathname.startsWith("/resources/") || parsed.pathname.startsWith("/ai/babylon/resources/"));
  } catch (error) {
    return false;
  }
}

async function fetchImageAsDataUrl(url, token) {
  const headers = { "User-Agent": "game-ux-board/1.0" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const result = await fetch(url, { headers });
  if (!result.ok) {
    throw new Error(`UI资产图无法转为可用参考图：${result.status}`);
  }
  const contentType = (result.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`参考图链接返回的不是图片数据：${contentType || "unknown"}`);
  }
  const buffer = Buffer.from(await result.arrayBuffer());
  if (!buffer.length) {
    throw new Error("参考图为空");
  }
  if (buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("参考图超过 20MB，无法作为生图参考");
  }
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
