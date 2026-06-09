import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { captureException } from './sentry';
import { apiSecurityHeaders } from './security';

interface APIContext {
  params: Promise<{ [key: string]: string }>;
}

type APIHandler = (request: Request, context: APIContext) => Promise<Response>;

interface HandlerOptions {
  rateLimit?: {
    type: 'general' | 'auth' | 'orderCreate' | 'orderAction' | 'sensitive';
    getKey?: (request: Request) => string;
  };
  requireAuth?: boolean;
}

/**
 * Standardized API route handler with:
 * - Automatic error handling
 * - Sentry error tracking
 * - Security headers
 * - Rate limiting (optional)
 * - Structured logging
 */
export function createAPIHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): APIHandler {
  return async (request: Request, context: APIContext) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Apply rate limiting if configured
      if (options.rateLimit) {
        const { checkRateLimit, createRateLimitKey } = await import('./rate-limit');
        const key = options.rateLimit.getKey 
          ? options.rateLimit.getKey(request)
          : createRateLimitKey(request);
        
        const result = await checkRateLimit(options.rateLimit.type, key);
        
        if (!result.success) {
          console.warn(`[API:${requestId}] Rate limit exceeded`, {
            path: request.url,
            key: key.slice(0, 20),
          });
          
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { 
              status: 429,
              headers: {
                ...apiSecurityHeaders,
                'X-Request-ID': requestId,
                'Retry-After': result.resetTime 
                  ? Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString()
                  : '60',
              },
            }
          );
        }
      }

      // Execute handler
      const response = await handler(request, context);
      
      // Add security headers and request ID
      const newResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      Object.entries(apiSecurityHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });
      newResponse.headers.set('X-Request-ID', requestId);
      
      // Log successful request
      const duration = Date.now() - startTime;
      console.log(`[API:${requestId}] Success`, {
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        duration: `${duration}ms`,
      });
      
      return newResponse;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error details
      console.error(`[API:${requestId}] Error`, {
        method: request.method,
        path: new URL(request.url).pathname,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Send to Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        path: request.url,
        method: request.method,
      });
      
      // Handle specific error types
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { 
            status: 400,
            headers: {
              ...apiSecurityHeaders,
              'X-Request-ID': requestId,
            },
          }
        );
      }
      
      // Generic error response (don't leak internal details)
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          requestId,
          ...(isDevelopment && error instanceof Error && {
            debug: error.message,
            stack: error.stack,
          }),
        },
        { 
          status: 500,
          headers: {
            ...apiSecurityHeaders,
            'X-Request-ID': requestId,
          },
        }
      );
    }
  };
}

/**
 * Helper to create standardized success response
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return NextResponse.json(data, { status });
}

/**
 * Helper to create standardized error response
 */
export function errorResponse(
  message: string, 
  status: number = 400, 
  details?: any
): Response {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}
