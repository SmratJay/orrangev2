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
    const { email, embedded_wallet_address, privy_wallet_id: clientWalletId, full_name } = body

    // If client didn't send privy_wallet_id, fetch it from Privy API using the embedded wallet address
    let privy_wallet_id = clientWalletId || null;
    if (!privy_wallet_id && embedded_wallet_address) {
      try {
        const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
        const appSecret = process.env.PRIVY_APP_SECRET;
        if (appId && appSecret) {
          const privyRes = await fetch(`https://auth.privy.io/api/v1/users/${privyId}`, {
            headers: {
              'Content-Type': 'application/json',
              'privy-app-id': appId,
              'Authorization': `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
            },
          });
          if (privyRes.ok) {
            const privyUser = await privyRes.json();
            const embeddedWallet = privyUser.linked_accounts?.find(
              (a: any) => a.type === 'wallet' && a.wallet_client === 'privy'
            );
            if (embeddedWallet?.id) {
              privy_wallet_id = embeddedWallet.id;
              console.log('[Setup] Fetched privy_wallet_id from API:', privy_wallet_id);
            }
          }
        }
      } catch (err) {
        console.error('[Setup] Failed to fetch privy_wallet_id from Privy API:', err);
      }
    }

    console.log('[Setup] Syncing user:', { privyId, email, embedded_wallet_address, privy_wallet_id, full_name })

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
      if (full_name) updateData.full_name = full_name
      
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
          full_name: full_name || null,
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
