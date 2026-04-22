import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid login payload.");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (!user) {
    return jsonError("Invalid email or password.", 401);
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    return jsonError("Invalid email or password.", 401);
  }

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
