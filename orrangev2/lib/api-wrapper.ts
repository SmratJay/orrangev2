import { NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitKey, getClientIP } from './rate-limit';

interface APIHandler {
  (request: Request, context?: { params: Promise<{ [key: string]: string }> }): Promise<Response>;
}

interface RateLimitConfig {
  type: 'general' | 'auth' | 'orderCreate' | 'orderAction' | 'sensitive';
  getKey?: (request: Request) => string;
}

/**
 * Wrap API handler with rate limiting
 */
export function withRateLimit(
  handler: APIHandler,
  config: RateLimitConfig
): APIHandler {
  return async (request: Request, context?: { params: Promise<{ [key: string]: string }> }) => {
    // Skip rate limiting for non-production environments
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_RATE_LIMIT) {
      return handler(request, context);
    }

    const key = config.getKey 
      ? config.getKey(request)
      : createRateLimitKey(request);

    const result = await checkRateLimit(config.type, key);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: result.resetTime?.toISOString(),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            ...(result.resetTime && {
              'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
            }),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(request, context);
    
    // Clone response to add headers
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    
    return newResponse;
  };
}

/**
 * Standard API error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): Response {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Standard API success response
 */
export function createSuccessResponse<T>(data: T): Response {
  return NextResponse.json(data);
}
