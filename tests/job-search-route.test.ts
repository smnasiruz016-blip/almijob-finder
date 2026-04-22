import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class SearchLimitExceededError extends Error {
    constructor(public usage: unknown) {
      super("FREE_SEARCH_LIMIT_REACHED");
    }
  }

  return {
    getRequiredUser: vi.fn(),
    getLatestParsedResume: vi.fn(),
    runJobSearch: vi.fn(),
    assertUserCanSearch: vi.fn(),
    getSearchUsageForUser: vi.fn(),
    trackProductEvent: vi.fn(),
    SearchLimitExceededError
  };
});

vi.mock("@/lib/auth", () => ({
  getRequiredUser: mocks.getRequiredUser
}));

vi.mock("@/server/services/resume-service", () => ({
  getLatestParsedResume: mocks.getLatestParsedResume
}));

vi.mock("@/server/services/job-search", () => ({
  runJobSearch: mocks.runJobSearch
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: mocks.trackProductEvent
}));

vi.mock("@/server/services/usage", () => {
  return {
    SearchLimitExceededError: mocks.SearchLimitExceededError,
    assertUserCanSearch: mocks.assertUserCanSearch,
    getSearchUsageForUser: mocks.getSearchUsageForUser
  };
});

describe("POST /api/jobs/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation errors for invalid search payloads", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });

    const { POST } = await import("@/app/api/jobs/search/route");
    const response = await POST(
      new Request("http://localhost/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredTitle: "",
          country: ""
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.any(String)
      })
    );
    expect(mocks.runJobSearch).not.toHaveBeenCalled();
  });

  it("returns the daily plan limit error when free usage is exhausted", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    mocks.assertUserCanSearch.mockRejectedValue(
      new mocks.SearchLimitExceededError({
        dailyUsed: 5,
        dailyLimit: 5,
        remaining: 0,
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
      })
    );

    const { POST } = await import("@/app/api/jobs/search/route");
    const response = await POST(
      new Request("http://localhost/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredTitle: "Frontend Engineer",
          country: "United States"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: "SEARCH_LIMIT_REACHED",
        error: "You have used all 5 searches for today on the Free plan. Try again tomorrow or upgrade for unlimited searches.",
        usage: expect.objectContaining({
          dailyUsed: 5,
          dailyLimit: 5,
          remaining: 0,
          tier: "FREE"
        })
      })
    );
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "plan_limit_hit",
        userId: "user_1"
      })
    );
  });

  it("tracks successful searches for analytics readiness", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    mocks.assertUserCanSearch.mockResolvedValue(undefined);
    mocks.getLatestParsedResume.mockResolvedValue({
      name: "Demo User",
      skills: ["React"],
      experienceKeywords: ["frontend"],
      educationKeywords: [],
      preferredRoles: ["Frontend Engineer"],
      rawText: "demo"
    });
    mocks.runJobSearch.mockResolvedValue({
      searchId: "search_1",
      results: [
        {
          externalJobId: "job_1",
          source: "Remotive",
          title: "Frontend Engineer",
          company: "Acme",
          location: "Worldwide",
          descriptionSnippet: "Build product UI",
          applyUrl: "https://example.com/jobs/1",
          keywords: [],
          matchScore: 90,
          matchReasons: ["Strong title match"],
          missingKeywords: []
        }
      ],
      meta: {
        usedFallback: false,
        providerStatuses: [
          {
            source: "Remotive",
            sourceType: "live",
            status: "success",
            results: 1
          }
        ]
      }
    });
    mocks.getSearchUsageForUser.mockResolvedValue({
      dailyUsed: 1,
      dailyLimit: 5,
      remaining: 4,
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
    });

    const { POST } = await import("@/app/api/jobs/search/route");
    const response = await POST(
      new Request("http://localhost/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredTitle: "Frontend Engineer",
          country: "Worldwide"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "job_search_performed",
        userId: "user_1",
        properties: expect.objectContaining({
          desiredTitle: "Frontend Engineer",
          hasResume: true,
          resultCount: 1,
          usedFallback: false,
          country: "Worldwide"
        })
      })
    );
  });
});
