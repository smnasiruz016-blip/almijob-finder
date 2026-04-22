import { jsonError } from "@/lib/http";
import { processDailyAlerts } from "@/server/services/alerts";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (expected && provided !== expected) {
    return jsonError("Unauthorized.", 401);
  }

  const result = await processDailyAlerts();
  return Response.json(result);
}
