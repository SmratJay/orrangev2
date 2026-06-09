import { z } from 'zod';

export type ParsedResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.ZodError<T> };

export async function parseRequestJson<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  fallback?: unknown
): Promise<ParsedResult<T>> {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = fallback ?? null;
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

export function formatZodError(error: z.ZodError) {
  return {
    message: 'Invalid request',
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
