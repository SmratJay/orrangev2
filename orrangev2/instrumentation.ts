import { initSentry } from '@/lib/sentry';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initSentry();
  }
}
