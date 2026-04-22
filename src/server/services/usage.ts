import { startOfDay } from "date-fns";
import { SubscriptionTier } from "@prisma/client";
import { getDailySearchLimitForTier, getPlanDefinition, hasUnlimitedSearches } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import type { SearchUsageSnapshot } from "@/types";

export class SearchLimitExceededError extends Error {
  constructor(public usage: SearchUsageSnapshot) {
    super("FREE_SEARCH_LIMIT_REACHED");
  }
}

export async function getSearchUsageForUser(userId: string): Promise<SearchUsageSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  const tier = user?.subscriptionTier ?? SubscriptionTier.FREE;
  const plan = getPlanDefinition(tier);
  const dailyUsed = await prisma.searchHistory.count({
    where: {
      userId,
      createdAt: {
        gte: startOfDay(new Date())
      }
    }
  });

  if (hasUnlimitedSearches(tier)) {
    return {
      dailyUsed,
      dailyLimit: null,
      remaining: null,
      tier,
      plan
    };
  }

  const dailyLimit = getDailySearchLimitForTier(tier);

  return {
    dailyUsed,
    dailyLimit,
    remaining: dailyLimit === null ? null : Math.max(0, dailyLimit - dailyUsed),
    tier,
    plan
  };
}

export async function assertUserCanSearch(userId: string) {
  const usage = await getSearchUsageForUser(userId);

  if (usage.dailyLimit !== null && usage.dailyUsed >= usage.dailyLimit) {
    throw new SearchLimitExceededError(usage);
  }

  return usage;
}
