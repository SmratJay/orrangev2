import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { requirePrivyUser } from "@/lib/requirePrivyUser"
import { PrivyClient } from "@privy-io/server-auth"

export const runtime = "nodejs"

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(request: Request) {
  try {
    // 1️⃣ Identity (always required)
    const { privyId } = await requirePrivyUser(request)

    // 2️⃣ Fetch full Privy user ONLY if needed
    const privyUser = await privy.getUser(privyId)
    const email = privyUser.email?.address ?? null

    // 3️⃣ Supabase = data authority
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          privy_user_id: privyId,
          email,
        },
        { onConflict: "privy_user_id" }
      )
      .select("id")
      .single()

    if (error) {
      console.error("[setup] Supabase error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: data.id })
  } catch (error) {
    console.error("[setup] Fatal error:", error)
    return NextResponse.json({ error: "Setup failed" }, { status: 500 })
  }
}
