import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { requirePrivyUser } from "@/lib/requirePrivyUser"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    // 1️⃣ Identity (always required)
    const { privyId } = await requirePrivyUser(request)

    // 2️⃣ Get request body
    const body = await request.json()
    const { email, embedded_wallet_address, privy_wallet_id } = body

    console.log('[Setup] Syncing user:', { privyId, email, embedded_wallet_address, privy_wallet_id })

    // 3️⃣ Supabase = data authority
    const supabase = await createClient()

    // First, check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, user_type")
      .eq("privy_user_id", privyId)
      .single()

    if (existingUser) {
      // User exists - only update wallet address, NEVER overwrite user_type
      console.log('[Setup] Existing user found, user_type:', existingUser.user_type)
      
      const updateData: any = {}
      if (email) updateData.email = email
      if (embedded_wallet_address) updateData.embedded_wallet_address = embedded_wallet_address
      if (privy_wallet_id) updateData.privy_wallet_id = privy_wallet_id
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("privy_user_id", privyId)
        
        if (updateError) {
          console.error("[setup] Update error:", updateError)
        }
      }
      
      return NextResponse.json({ success: true, userId: existingUser.id, user_type: existingUser.user_type })
    } else {
      // New user - create with default user_type
      console.log('[Setup] Creating new user')
      const { data, error } = await supabase
        .from("users")
        .insert({
          privy_user_id: privyId,
          email: email || null,
          embedded_wallet_address: embedded_wallet_address || null,
          privy_wallet_id: privy_wallet_id || null,
          user_type: 'user', // New users default to 'user'
        })
        .select("id, user_type")
        .single()

      if (error) {
        console.error("[setup] Insert error:", error)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }

      return NextResponse.json({ success: true, userId: data.id, user_type: data.user_type })
    }
  } catch (error) {
    console.error("[setup] Fatal error:", error)
    return NextResponse.json({ error: "Setup failed" }, { status: 500 })
  }
}
