import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers configuration
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.vercel-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://auth.privy.io https://*.privy.systems https://*.supabase.co wss://*.supabase.co https://*.etherscan.io https://api.coingecko.com https://*.ingest.sentry.io https://*.drpc.org https://*.publicnode.com https://1rpc.io https://rpc.sepolia.org https://rpc2.sepolia.org",
    "frame-src 'self' https://auth.privy.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS protection for older browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),

  // HSTS (only in production)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),

  // Prevent information leakage
  'X-Powered-By': undefined,
  'Server': undefined,
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value !== undefined) {
      response.headers.set(key, value);
    } else {
      response.headers.delete(key);
    }
  });

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
