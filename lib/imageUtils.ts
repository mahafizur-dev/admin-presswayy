export function looksLikeImageUrl(value: string): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!/^https?:\/\/\S+$/.test(v)) return false;
  return (
    /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(v) ||
    v.includes("cloudinary.com") ||
    v.includes("res.cloudinary")
  );
}

function stripUrlSeparators(value: string): string {
  return value
    .trim()
    .replace(/[,;\s]+$/, "")
    .trim();
}

export function extractImageUrlsFromText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const protocolCount = (trimmed.match(/https?:\/\//g) || []).length;
  if (protocolCount === 0) return [];

  if (protocolCount === 1) {
    const clean = stripUrlSeparators(trimmed);
    return looksLikeImageUrl(clean) ? [clean] : [];
  }

  return trimmed
    .split(/(?=https?:\/\/)/)
    .map(stripUrlSeparators)
    .filter(looksLikeImageUrl);
}

export function normalizeImageList(images?: string[]): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((src) => typeof src === "string" && src.trim());
}
