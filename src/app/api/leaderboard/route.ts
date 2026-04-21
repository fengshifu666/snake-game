import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getLeaderboard } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  const leaderboard = await getLeaderboard();
  return NextResponse.json({ leaderboard });
}
