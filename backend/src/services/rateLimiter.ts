import { redis } from '../config/redis';
import { env } from '../config/env';

/**
 * Redis-backed Rate Limiter Service.
 * Tracks and limits email sending concurrency per user on an hourly window basis.
 */
export class RateLimiterService {
  /**
   * Generates a UTC hourly window string (YYYY-MM-DD-HH)
   */
  private static getHourString(): string {
    const d = new Date();
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hour = String(d.getUTCHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * Returns the Redis key for rate limiting
   */
  public static getKey(userId: string): string {
    return `rate-limit:${userId}:${this.getHourString()}`;
  }

  /**
   * Increments the count for the current hour and checks if it exceeds the limit.
   * Runs atomically.
   */
  public static async checkAndIncrement(
    userId: string,
    hourlyLimit?: number
  ): Promise<{ limited: boolean; count: number; limit: number }> {
    const key = this.getKey(userId);
    const count = await redis.incr(key);

    if (count === 1) {
      // Set key to expire after 2 hours (7200 seconds) to save space and cleanup
      await redis.expire(key, 7200);
    }

    const limit = hourlyLimit && hourlyLimit > 0 ? hourlyLimit : env.MAX_EMAILS_PER_HOUR;

    if (count > limit) {
      return { limited: true, count, limit };
    }

    return { limited: false, count, limit };
  }

  /**
   * Decrements the rate limiter count (used to revert increment if job is skipped/failed before sending)
   */
  public static async decrement(userId: string): Promise<number> {
    const key = this.getKey(userId);
    return await redis.decr(key);
  }

  /**
   * Returns milliseconds remaining until the next UTC hour window
   */
  public static getMsUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours() + 1,
        0,
        0,
        0
      )
    );
    return nextHour.getTime() - now.getTime();
  }
}
