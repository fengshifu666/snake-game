import { NextResponse } from "next/server";
import { getSessionUsername } from "@/lib/auth";
import { recordScore } from "@/lib/data";

export async function POST(request: Request) {
  const username = await getSessionUsername();

  if (!username) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json()) as { score?: number };
  const score = Number(body.score ?? 0);

  if (!Number.isFinite(score) || score <= 0) {
    return NextResponse.json({ error: "分数无效。" }, { status: 400 });
  }

  const result = await recordScore(username, Math.floor(score));
  return NextResponse.json(result);
}
