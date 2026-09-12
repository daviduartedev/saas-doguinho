const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

/** ASVS V2.4 / V6.3: rate-limit login by e-mail. In-process; fine for a single Node instance. */
export function loginAllowed(email: string): boolean {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

export function loginSucceeded(email: string) {
  attempts.delete(email.trim().toLowerCase());
}
