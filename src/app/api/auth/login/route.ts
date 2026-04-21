import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getUser, markLogin, validateCredentials } from "@/lib/data";

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

  const user = await getUser(validation.username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "用户名或密码错误。" }, { status: 401 });
  }

  const updatedUser = await markLogin(validation.username);

  if (!updatedUser) {
    return NextResponse.json({ error: "账号不存在。" }, { status: 404 });
  }

  await createSession(updatedUser.username);
  return NextResponse.json({ user: updatedUser });
}
