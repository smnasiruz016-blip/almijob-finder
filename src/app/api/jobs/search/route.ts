import { getRequiredUser } from "@/lib/auth";
import { trackProductEvent } from "@/lib/analytics";
import { getClientIdentifier, jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { jobSearchSchema } from "@/lib/validation";
import { getProviderRuntimeConfig } from "@/server/adapters/provider-config";
import { executeJobSearch, runJobSearch } from "@/server/services/job-search";
import { getLatestParsedResume } from "@/server/services/resume-service";
import { assertUserCanSearch, getSearchUsageForUser, SearchLimitExceededError } from "@/server/services/usage";

function buildProviderUnavailableResult() {
  const config = getProviderRuntimeConfig();
  const providerStatuses = [];

  if (config.remoteOkEnabled) {
    providerStatuses.push({
      source: "RemoteOK",
      sourceType: "live" as const,
      status: "error" as const,
      results: 0,
      message: "Remote OK is temporarily unavailable."
    });
  }

  if (config.remotiveEnabled) {
    providerStatuses.push({
      source: "Remotive",
      sourceType: "live" as const,
      status: "error" as const,
      results: 0,
      message: "Remotive is temporarily unavailable."
    });
  }

  if (config.adzunaEnabled) {
    providerStatuses.push({
      source: "Adzuna",
      sourceType: "live" as const,
      status: "error" as const,
      results: 0,
      message: "Adzuna is temporarily unavailable."
    });
  }

  return {
    searchId: null,
    results: [],
    meta: {
      usedFallback: false,
      sources: [] as string[],
      sourceBreakdown: {} as Record<string, number>,
      insights: {
        totalResults: 0,
        liveResults: 0,
        remoteResults: 0,
        salaryVisibleResults: 0,
        topCompanies: [] as string[],
        suggestedQueryReplacement: null as string | null
      },
      quality: {
        averageMatchScore: 0,
        topMatchScore: 0,
        highFitCount: 0
      },
      providerStatuses
    }
  };
}

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
    try {
      await assertUserCanSearch(user.id);
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

      log("error", "Search usage enforcement failed, continuing search", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown"
      });
    }

    let resume = null;
    try {
      resume = await getLatestParsedResume(user.id);
    } catch (error) {
      log("error", "Resume lookup failed for search, continuing without resume", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown"
      });
    }

    let result;
    try {
      result = await runJobSearch(user.id, parsed.data, resume);
    } catch (error) {
      log("error", "Job search execution failed, retrying without persistence", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown"
      });

      try {
        const fallbackResult = await executeJobSearch(parsed.data, resume);
        result = {
          searchId: null,
          results: fallbackResult.results,
          meta: fallbackResult.meta
        };
      } catch (retryError) {
        log("error", "Non-persisted job search execution failed, returning provider-unavailable empty state", {
          userId: user.id,
          error: retryError instanceof Error ? retryError.message : "Unknown"
        });
        result = buildProviderUnavailableResult();
      }
    }

    let usage = null;
    try {
      usage = await getSearchUsageForUser(user.id);
    } catch (error) {
      log("error", "Search usage refresh failed after search", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown"
      });
    }

    try {
      const liveSourceCount = (result.meta.providerStatuses ?? []).filter((provider) => provider.sourceType === "live" && provider.status === "success")
        .length;

      await trackProductEvent({
        name: "job_search_performed",
        userId: user.id,
        properties: {
          desiredTitle: parsed.data.desiredTitle,
          hasResume: Boolean(resume),
          resultCount: result.results.length,
          usedFallback: result.meta.usedFallback,
          liveSourceCount,
          country: parsed.data.country?.trim() || "Worldwide",
          hasKeyword: Boolean(parsed.data.keyword)
        }
      });
    } catch (error) {
      log("error", "Search analytics tracking failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown"
      });
    }

    return Response.json({
      ...result,
      usage
    });
  } catch (error) {
    log("error", "Job search failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown"
    });
    return jsonError("Search failed. Please try again.");
  }
}
