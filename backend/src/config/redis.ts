import Redis from 'ioredis';
import { env } from './env';

// BullMQ workers require maxRetriesPerRequest to be null
export const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const getRedisConnection = () => {
  return new Redis(env.REDIS_URL, redisConfig);
};

// General-purpose Redis client (e.g. for rate limiting)
export const redis = new Redis(env.REDIS_URL);
