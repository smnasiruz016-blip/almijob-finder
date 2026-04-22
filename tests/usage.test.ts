import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  user: {
    findUnique: vi.fn()
  },
  searchHistory: {
    count: vi.fn()
  }
};

vi.mock("@/lib/prisma", () => ({
  prisma
}));

describe("usage limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unlimited usage for Pro users", async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: "PRO" });
    prisma.searchHistory.count.mockResolvedValue(12);

    const { getSearchUsageForUser } = await import("@/server/services/usage");
    const usage = await getSearchUsageForUser("user_pro");

    expect(usage).toEqual({
      dailyUsed: 12,
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
    });
  });

  it("blocks free users when the daily limit is reached", async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: "FREE" });
    prisma.searchHistory.count.mockResolvedValue(5);

    const { assertUserCanSearch, SearchLimitExceededError } = await import("@/server/services/usage");

    await expect(assertUserCanSearch("user_free")).rejects.toBeInstanceOf(SearchLimitExceededError);
  });

  it("returns remaining daily searches for free users under the limit", async () => {
    prisma.user.findUnique.mockResolvedValue({ subscriptionTier: "FREE" });
    prisma.searchHistory.count.mockResolvedValue(2);

    const { getSearchUsageForUser } = await import("@/server/services/usage");
    const usage = await getSearchUsageForUser("user_free");

    expect(usage).toEqual({
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
    });
  });
});
