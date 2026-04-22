import type { EmploymentType, RemoteMode, SubscriptionTier, UserRole } from "@prisma/client";

export type PlanFeatures = {
  canUseAlerts: boolean;
  canUseResumeInsights: boolean;
  hasUnlimitedSearches: boolean;
};

export type PlanSnapshot = {
  tier: SubscriptionTier;
  label: string;
  dailySearchLimit: number | null;
  features: PlanFeatures;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
};

export type ParsedResume = {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experienceKeywords: string[];
  educationKeywords: string[];
  preferredRoles: string[];
  rawText: string;
};

export type JobSearchInput = {
  desiredTitle: string;
  keyword?: string;
  company?: string;
  country?: string;
  state?: string;
  city?: string;
  remoteMode?: RemoteMode;
  employmentType?: EmploymentType;
  postedWithinDays?: number;
  salaryMin?: number;
  salaryMax?: number;
};

export type NormalizedJob = {
  externalJobId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  remoteStatus?: string;
  descriptionSnippet: string;
  applyUrl: string;
  postedDate?: string;
  keywords: string[];
  sourceType?: "live" | "mock";
  providerMetadata?: {
    attributionLabel: string;
    attributionUrl?: string;
  };
};

export type RankedJob = NormalizedJob & {
  matchScore: number;
  matchReasons: string[];
  missingKeywords: string[];
};

export type SearchUsageSnapshot = {
  dailyUsed: number;
  dailyLimit: number | null;
  remaining: number | null;
  tier: SubscriptionTier;
  plan: PlanSnapshot;
};

export type SearchInsights = {
  totalResults: number;
  liveResults: number;
  remoteResults: number;
  salaryVisibleResults: number;
  topCompanies: string[];
};

export type ProviderStatus = {
  source: string;
  sourceType: "live" | "mock";
  status: "success" | "fallback" | "error" | "disabled" | "no_matches";
  results: number;
  message?: string;
};
