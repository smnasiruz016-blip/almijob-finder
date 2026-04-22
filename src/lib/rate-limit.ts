type Entry = {
  count: number;
  expiresAt: number;
};

const store = new Map<string, Entry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.expiresAt < now) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs
    });

    return {
      success: true,
      remaining: limit - 1
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    success: true,
    remaining: limit - entry.count
  };
}
