import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store, private" } }
    );
  }

  return NextResponse.json(
    {
      error: "Role switching is disabled. Please sign in with the target account credentials.",
    },
    { status: 403, headers: { "Cache-Control": "no-store, private" } }
  );
}
