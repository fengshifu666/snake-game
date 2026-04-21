import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { createUser, validateCredentials } from "@/lib/data";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };
  const username = body.username ?? "";
  const password = body.password ?? "";
  const validation = validateCredentials(username, password);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const result = await createUser(validation.username, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  await createSession(result.user.username);
  return NextResponse.json({ user: result.user });
}
