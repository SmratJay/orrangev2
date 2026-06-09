import { Redis } from '@upstash/redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Rate limit configurations
const RATE_LIMITS = {
  // General API: 100 requests per minute per IP
  general: {
    keyPrefix: 'rl_general',
    points: 100,
    duration: 60,
  },
  // Auth endpoints: 10 requests per minute per IP (login, signup)
  auth: {
    keyPrefix: 'rl_auth',
    points: 10,
    duration: 60,
  },
  // Order creation: 5 per minute per user
  orderCreate: {
    keyPrefix: 'rl_order_create',
    points: 5,
    duration: 60,
  },
  // Order actions (accept, confirm, etc): 20 per minute per user
  orderAction: {
    keyPrefix: 'rl_order_action',
    points: 20,
    duration: 60,
  },
  // Sensitive actions (USDC transfer): 5 per minute per user
  sensitive: {
    keyPrefix: 'rl_sensitive',
    points: 5,
    duration: 60,
  },
};

// Create rate limiter instances
function createLimiter(config: typeof RATE_LIMITS['general']) {
  if (!redis) {
    // Fallback: in-memory rate limiting (not shared across instances)
    console.warn('[RateLimit] Redis not configured, using in-memory fallback');
    const { RateLimiterMemory } = require('rate-limiter-flexible');
    return new RateLimiterMemory({
      keyPrefix: config.keyPrefix,
      points: config.points,
      duration: config.duration,
    });
  }

  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: config.keyPrefix,
    points: config.points,
    duration: config.duration,
  });
}

// Initialize limiters
const limiters = {
  general: createLimiter(RATE_LIMITS.general),
  auth: createLimiter(RATE_LIMITS.auth),
  orderCreate: createLimiter(RATE_LIMITS.orderCreate),
  orderAction: createLimiter(RATE_LIMITS.orderAction),
  sensitive: createLimiter(RATE_LIMITS.sensitive),
};

/**
 * Check rate limit for a key
 * @param type - Rate limit type
 * @param key - Unique identifier (IP, userId, etc.)
 * @returns Object with success flag and remaining points
 */
export async function checkRateLimit(
  type: keyof typeof RATE_LIMITS,
  key: string
): Promise<{ success: boolean; remaining: number; resetTime?: Date }> {
  try {
    const limiter = limiters[type];
    const result = await limiter.consume(key, 1);
    
    return {
      success: true,
      remaining: result.remainingPoints,
    };
  } catch (rejRes: any) {
    // Rate limit exceeded
    if (rejRes.remainingPoints !== undefined) {
      return {
        success: false,
        remaining: rejRes.remainingPoints,
        resetTime: new Date(Date.now() + rejRes.msBeforeNext),
      };
    }
    
    // Error in rate limiter (Redis down, etc) - allow request
    console.error('[RateLimit] Error:', rejRes);
    return { success: true, remaining: 0 };
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try X-Forwarded-For first (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback to other headers
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  // Last resort: return a default (should not happen in production)
  return 'unknown';
}

/**
 * Create rate limit key from request
 */
export function createRateLimitKey(
  request: Request,
  userId?: string,
  suffix?: string
): string {
  const ip = getClientIP(request);
  const base = userId ? `${ip}:${userId}` : ip;
  return suffix ? `${base}:${suffix}` : base;
}
