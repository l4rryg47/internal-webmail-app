const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxPerWindow: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (current.count >= maxPerWindow) {
    return true;
  }

  current.count += 1;
  buckets.set(key, current);
  return false;
}
