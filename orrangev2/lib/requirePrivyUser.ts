import { PrivyClient } from "@privy-io/server-auth"

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function requirePrivyUser(request: Request) {
  const cookie = request.headers.get("cookie") ?? ""
  const token = cookie
    .split("; ")
    .find(c => c.startsWith("privy-token="))
    ?.split("=")[1]

  if (!token) {
    throw new Error("Missing Privy token")
  }

  // ✅ Cryptographically verifies token
  const claims = await privy.verifyAuthToken(token)

  return {
    privyId: claims.userId, // ✅ ONLY guaranteed field
  }
}
