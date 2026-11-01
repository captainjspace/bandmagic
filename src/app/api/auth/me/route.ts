import { type NextRequest, NextResponse } from "next/server";
import { roleFor } from "@/lib/auth/roleFor";
import { userEmail } from "@/lib/identity";

/**
 * GET /api/auth/me — returns the current caller's identity + derived role.
 *
 * Scaffolding endpoint for the auth-platform Phase A rollout. Every other route
 * eventually adopts the same `verifyAuth(req)` pattern; this one is the cheapest
 * thing to test the wiring against.
 */
export async function GET(req: NextRequest) {
  const email = userEmail(req.headers);

  const role = await roleFor(email);

  return NextResponse.json({ email, role });
}
