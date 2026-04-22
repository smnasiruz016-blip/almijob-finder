import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { signUpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid signup payload.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (existing) {
    return jsonError("An account with that email already exists.");
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password)
    }
  });

  await createSession(user.id);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}
