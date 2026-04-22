import type { SubscriptionTier } from "@prisma/client";
import { FREE_DAILY_SEARCH_LIMIT } from "@/lib/constants";
import type { PlanSnapshot } from "@/types";

const PLAN_DEFINITIONS: Record<SubscriptionTier, PlanSnapshot> = {
  FREE: {
    tier: "FREE",
    label: "Free",
    dailySearchLimit: FREE_DAILY_SEARCH_LIMIT,
    features: {
      canUseAlerts: false,
      canUseResumeInsights: false,
      hasUnlimitedSearches: false
    }
  },
  PRO: {
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

export function getPlanDefinition(tier: SubscriptionTier): PlanSnapshot {
  return PLAN_DEFINITIONS[tier];
}

export function canUseAlerts(tier: SubscriptionTier) {
  return getPlanDefinition(tier).features.canUseAlerts;
}

export function canUseResumeInsights(tier: SubscriptionTier) {
  return getPlanDefinition(tier).features.canUseResumeInsights;
}

export function hasUnlimitedSearches(tier: SubscriptionTier) {
  return getPlanDefinition(tier).features.hasUnlimitedSearches;
}

export function getDailySearchLimitForTier(tier: SubscriptionTier) {
  return getPlanDefinition(tier).dailySearchLimit;
}
