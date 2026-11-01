const hits = new Map<string, number[]>();
/** Tiny per-instance sliding window. Good enough for a demo; use a shared store in production. */
export function limit(req: Request, bucket: string, perMin: number) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const k = `${bucket}:${ip}`, now = Date.now();
  const a = (hits.get(k) || []).filter((t) => now - t < 60_000);
  if (a.length >= perMin) { hits.set(k, a); return false; }
  a.push(now); hits.set(k, a); return true;
}
