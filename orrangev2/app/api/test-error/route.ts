import { NextResponse } from 'next/server';
import { captureException } from '@/lib/sentry';

export const runtime = 'nodejs';

/**
 * GET /api/test-error
 * Test endpoint to verify Sentry error tracking is working
 */
export async function GET() {
  const testError = new Error('This is a test error for Sentry');
  
  // Log to console
  console.error('[Test Error] Sending to Sentry:', testError.message);
  
  // Send to Sentry
  captureException(testError, {
    test: true,
    timestamp: new Date().toISOString(),
  });
  
  // Also throw an unhandled error to test the error boundary
  if (Math.random() > 0.5) {
    throw new Error('Unhandled test error');
  }
  
  return NextResponse.json({ 
    message: 'Test error sent to Sentry',
    checkDashboard: 'https://orrange.sentry.io/issues/',
  });
}
