import { getRequiredUser } from "@/lib/auth";
import { trackProductEvent } from "@/lib/analytics";
import { getClientIdentifier, jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { jobSearchSchema } from "@/lib/validation";
import { runJobSearch } from "@/server/services/job-search";
import { getLatestParsedResume } from "@/server/services/resume-service";
import { assertUserCanSearch, getSearchUsageForUser, SearchLimitExceededError } from "@/server/services/usage";

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const limiter = checkRateLimit(`search:${user.id}:${getClientIdentifier(request)}`, 15, 60_000);

  if (!limiter.success) {
    return jsonError("Too many searches. Please wait a minute and try again.", 429);
  }

  const body = await request.json();
  const parsed = jobSearchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid job search payload.");
  }

  try {
    await assertUserCanSearch(user.id);
    const resume = await getLatestParsedResume(user.id);
    const result = await runJobSearch(user.id, parsed.data, resume);
    const usage = await getSearchUsageForUser(user.id);
    await trackProductEvent({
      name: "job_search_performed",
      userId: user.id,
      properties: {
        desiredTitle: parsed.data.desiredTitle,
        hasResume: Boolean(resume),
        resultCount: result.results.length,
        usedFallback: result.meta.usedFallback,
        liveSourceCount: result.meta.providerStatuses?.filter((provider) => provider.sourceType === "live" && provider.status === "success").length ?? 0,
        country: parsed.data.country?.trim() || "Worldwide",
        hasKeyword: Boolean(parsed.data.keyword)
      }
    });
    return Response.json({
      ...result,
      usage
    });
  } catch (error) {
    if (error instanceof SearchLimitExceededError) {
      log("warn", "Search blocked by free plan limit", {
        userId: user.id,
        dailyUsed: error.usage.dailyUsed,
        dailyLimit: error.usage.dailyLimit
      });
      await trackProductEvent({
        name: "plan_limit_hit",
        userId: user.id,
        properties: {
          dailyUsed: error.usage.dailyUsed,
          dailyLimit: error.usage.dailyLimit,
          tier: error.usage.tier
        }
      });
      return Response.json(
        {
          error: `You have used all ${error.usage.dailyLimit ?? 0} searches for today on the ${error.usage.plan.label} plan. Try again tomorrow or upgrade for unlimited searches.`,
          code: "SEARCH_LIMIT_REACHED",
          usage: error.usage
        },
        { status: 403 }
      );
    }
    log("error", "Job search failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown"
    });
    return jsonError("Search failed. Please try again.");
  }
}
