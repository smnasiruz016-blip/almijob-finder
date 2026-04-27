import { describe, expect, it } from "vitest";
import { buildResultsSummary, buildUsageSupportCopy } from "@/lib/search-trust";
import type { RankedJob, SearchUsageSnapshot } from "@/types";

function createRankedJob(overrides: Partial<RankedJob> = {}): RankedJob {
  return {
    externalJobId: "job-1",
    source: "Remotive",
    sourceType: "live",
    title: "Frontend Engineer",
    company: "Northstar Health",
    location: "Remote",
    descriptionSnippet: "Build product UI with React.",
    applyUrl: "https://example.com/jobs/1",
    keywords: ["React", "TypeScript"],
    matchScore: 85,
    matchReasons: ["Strong title match"],
    missingKeywords: [],
    ...overrides
  };
}

describe("buildResultsSummary", () => {
  it("reports live provider trust when live sources returned results", () => {
    const summary = buildResultsSummary({
      results: [createRankedJob()],
      providerStatuses: [
        {
          source: "Remotive",
          sourceType: "live",
          status: "success",
          results: 1
        }
      ],
      usedFallback: false,
      hasResume: true
    });

    expect(summary).toEqual(
      expect.objectContaining({
        totalJobs: 1,
        strongMatches: 1,
        resumeLabel: "Resume-based ranking is active.",
        providerTone: "live"
      })
    );
    expect(summary.providerLabel).toContain("Live providers supplied");
  });

  it("reports fallback coverage when live providers did not supply usable jobs", () => {
    const summary = buildResultsSummary({
      results: [createRankedJob({ source: "MockLever", sourceType: "mock", matchScore: 54 })],
      providerStatuses: [
        {
          source: "RemoteOK",
          sourceType: "live",
          status: "no_matches",
          results: 0
        },
        {
          source: "MockLever",
          sourceType: "mock",
          status: "fallback",
          results: 1
        }
      ],
      usedFallback: true,
      hasResume: false
    });

    expect(summary.providerTone).toBe("fallback");
    expect(summary.providerLabel).toContain("Sample fallback kept results visible");
    expect(summary.resumeLabel).toContain("Search filters");
  });

  it("reports live-only no-match state when fallback is disabled", () => {
    const summary = buildResultsSummary({
      results: [],
      providerStatuses: [
        {
          source: "RemoteOK",
          sourceType: "live",
          status: "no_matches",
          results: 0
        },
        {
          source: "MockLever",
          sourceType: "mock",
          status: "disabled",
          results: 0,
          message: "Sample fallback is turned off for this environment so only live jobs are shown."
        }
      ],
      usedFallback: false,
      hasResume: true
    });

    expect(summary.providerTone).toBe("live");
    expect(summary.providerLabel).toContain("no live jobs matched");
    expect(summary.resumeLabel).toBe("Resume-based ranking is active.");
  });
});

describe("buildUsageSupportCopy", () => {
  it("shows remaining searches for free users", () => {
    const usage: SearchUsageSnapshot = {
      dailyUsed: 2,
      dailyLimit: 5,
      remaining: 3,
      tier: "FREE",
      plan: {
        tier: "FREE",
        label: "Free",
        dailySearchLimit: 5,
        features: {
          canUseAlerts: false,
          canUseResumeInsights: false,
          hasUnlimitedSearches: false
        }
      }
    };

    expect(buildUsageSupportCopy(usage)).toBe("3 of 5 searches remain today on the Free plan.");
  });

  it("shows unlimited message for paid plans", () => {
    const usage: SearchUsageSnapshot = {
      dailyUsed: 8,
      dailyLimit: null,
      remaining: null,
      tier: "PRO",
      plan: {
        tier: "PRO",
        label: "Pro",
        dailySearchLimit: null,
        features: {
          canUseAlerts: true,
          canUseResumeInsights: true,
          hasUnlimitedSearches: true
        }
      }
    };

    expect(buildUsageSupportCopy(usage)).toBe("Unlimited searches are active on your plan.");
  });
});
