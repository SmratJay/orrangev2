import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { privy_id, email, user_type, full_name } = await request.json()
    const supabase = await createClient()

    // Get the authenticated user from Supabase session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create user record
    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      email: email || user.email,
      user_type,
      full_name,
    })

    if (userError && userError.code !== "23505") {
      // 23505 is duplicate key error, user might already exist
      throw userError
    }

    // Create user profile
    const { error: profileError } = await supabase.from("user_profiles").insert({
      user_id: user.id,
    })

    if (profileError && profileError.code !== "23505") {
      throw profileError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Setup error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Setup failed" }, { status: 500 })
  }
}
