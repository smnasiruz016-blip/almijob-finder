import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getClientIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for") ?? "local-user";
}
