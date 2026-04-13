// 인메모리 슬라이딩 윈도우 Rate Limiter
// 주의: 서버리스 환경(Vercel)에서는 인스턴스별로 독립 동작합니다.
// 엄격한 제한이 필요하다면 Redis 기반(Upstash) 전환을 권장합니다.

const store = new Map<string, { count: number; resetAt: number }>();

/**
 * @param key     식별 키 (예: `userId:endpoint`)
 * @param limit   윈도우 내 최대 허용 횟수
 * @param windowMs 윈도우 크기 (밀리초)
 * @returns true → 허용, false → 초과
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
