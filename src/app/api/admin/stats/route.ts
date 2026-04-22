import { getRequiredUser } from "@/lib/auth";
import { getAdminStats } from "@/server/services/admin";

export async function GET() {
  try {
    const user = await getRequiredUser();
    if (user.role !== "ADMIN") {
      return Response.json({ error: "Forbidden." }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stats = await getAdminStats();
  return Response.json(stats);
}
