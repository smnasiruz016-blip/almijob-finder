import type { ProviderStatus, RankedJob, SearchUsageSnapshot } from "@/types";

export type ResultsSummary = {
  totalJobs: number;
  strongMatches: number;
  resumeLabel: string;
  providerLabel: string;
  providerTone: "live" | "fallback" | "unavailable" | "idle";
};

export function buildResultsSummary({
  results,
  providerStatuses,
  usedFallback,
  hasResume
}: {
  results: RankedJob[];
  providerStatuses?: ProviderStatus[];
  usedFallback?: boolean;
  hasResume: boolean;
}): ResultsSummary {
  const statuses = providerStatuses ?? [];
  const totalJobs = results.length;
  const strongMatches = results.filter((job) => job.matchScore >= 80).length;
  const hasLiveSuccess = statuses.some((provider) => provider.sourceType === "live" && provider.status === "success");
  const hasLiveOnlyErrors = statuses.some((provider) => provider.sourceType === "live" && provider.status === "error") && !hasLiveSuccess;

  let providerLabel = "Provider source will appear after your next search.";
  let providerTone: ResultsSummary["providerTone"] = "idle";

  if (usedFallback) {
    providerLabel = "Fallback providers kept results available for this search.";
    providerTone = "fallback";
  } else if (hasLiveSuccess) {
    providerLabel = "Live providers supplied this result set.";
    providerTone = "live";
  } else if (hasLiveOnlyErrors) {
    providerLabel = "Live providers are temporarily unavailable right now.";
    providerTone = "unavailable";
  } else if (statuses.some((provider) => provider.sourceType === "live" && provider.status === "no_matches")) {
    providerLabel = "Live providers are active, but this search is still narrow.";
    providerTone = "live";
  }

  return {
    totalJobs,
    strongMatches,
    resumeLabel: hasResume ? "Resume-based ranking is active." : "Search filters are driving this ranking for now.",
    providerLabel,
    providerTone
  };
}

export function buildUsageSupportCopy(usage: SearchUsageSnapshot) {
  if (usage.plan.features.hasUnlimitedSearches) {
    return "Unlimited searches are active on your plan.";
  }

  if (usage.remaining === 0) {
    return `You have reached today's ${usage.dailyLimit} search limit on the Free plan.`;
  }

  return `${usage.remaining} of ${usage.dailyLimit} searches remain today on the Free plan.`;
}
