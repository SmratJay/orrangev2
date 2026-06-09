import * as Sentry from '@sentry/nextjs';

export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Replay for session debugging (only sample in production)
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Don't send PII
      sendDefaultPii: false,
      
      // Ignore common non-actionable errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        'Network Error',
        'Failed to fetch',
      ],
      
      beforeSend(event) {
        // Sanitize sensitive data from URLs
        if (event.request?.url) {
          event.request.url = event.request.url.replace(
            /(privy_token|authorization|api_key)=([^&]+)/gi,
            '$1=[REDACTED]'
          );
        }
        return event;
      },
    });
  }
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    console.error('[Sentry] Error captured:', error, context);
  }
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[Sentry] ${level}:`, message);
  }
};
