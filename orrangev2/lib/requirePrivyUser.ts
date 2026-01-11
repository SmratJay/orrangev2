import { PrivyClient } from "@privy-io/server-auth"

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

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

  console.log('[requirePrivyUser] Token found:', token ? 'yes' : 'no')

  if (!token) {
    throw new Error("Missing Privy token")
  }

  // ✅ Cryptographically verifies token
  const claims = await privy.verifyAuthToken(token)
  console.log('[requirePrivyUser] Claims:', claims.userId)

  return {
    privyId: claims.userId, // ✅ ONLY guaranteed field
  }
}
