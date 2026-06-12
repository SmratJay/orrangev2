import { PrivyClient } from "@privy-io/server-auth"
import { captureException, captureMessage } from "./sentry";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export async function requirePrivyUser(request: Request) {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization")
  let token = authHeader?.replace("Bearer ", "")
  
  // Fallback to cookie
  if (!token) {
    const cookie = request.headers.get("cookie") ?? ""
    // Try multiple cookie names that Privy might use
    token = cookie
      .split("; ")
      .find(c => c.startsWith("privy-token=") || c.startsWith("privy-id-token="))
      ?.split("=")[1]
  }

  if (!token) {
    captureMessage('Auth failed: Missing Privy token', 'warning');
    throw new AuthenticationError("Authentication required", "MISSING_TOKEN");
  }

  try {
    // Cryptographically verifies token
    const claims = await privy.verifyAuthToken(token)
    
    return {
      privyId: claims.userId,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Track auth failures in Sentry
    captureException(error instanceof Error ? error : new Error(errorMsg), {
      context: 'requirePrivyUser',
      tokenPrefix: token.slice(0, 10) + '...',
    });
    
    console.error('[requirePrivyUser] Token verification failed:', errorMsg);
    throw new AuthenticationError("Invalid or expired token", "INVALID_TOKEN");
  }
}
