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

export type CountryBrowseJob = Pick<
  RankedJob,
  "externalJobId" | "source" | "sourceType" | "title" | "company" | "location" | "applyUrl" | "postedDate" | "remoteStatus" | "jobType"
>;

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
  suggestedQueryReplacement?: string | null;
};

export type ProviderStatus = {
  source: string;
  sourceType: "live" | "mock";
  status: "success" | "fallback" | "error" | "disabled" | "no_matches";
  results: number;
  message?: string;
};

export type HiringCompanyPreview = {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  country: string;
  city?: string | null;
  verified: boolean;
  openRoles: number;
  roleTitles: string[];
};

export type EmployerInventoryOverview = {
  totalHiringCompanies: number;
  totalOpenVacancies: number;
  featuredCompanies: HiringCompanyPreview[];
  source: "database" | "fallback" | "unavailable";
};

export type PublicHiringVacancy = {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  country: string;
  state?: string | null;
  city?: string | null;
  location: string;
  employmentType?: string | null;
  remoteMode?: string | null;
  applyUrl: string;
  postedAt: string;
  verifiedCompany: boolean;
};

export type CountryHiringHighlights = {
  country: string;
  vacancies: PublicHiringVacancy[];
  companies: HiringCompanyPreview[];
  totalVacancies: number;
  totalCompanies: number;
  source: "database" | "fallback" | "unavailable";
};

export type EmployerVacancyPreview = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  status: string;
  country: string;
  state?: string | null;
  city?: string | null;
  remoteMode?: string | null;
  employmentType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  applyUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployerCompanyWorkspace = {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  country: string;
  city?: string | null;
  verified: boolean;
  membershipRole: string;
  vacancies: EmployerVacancyPreview[];
};

export type EmployerWorkspace = {
  ready: boolean;
  canCreateCompany: boolean;
  companies: EmployerCompanyWorkspace[];
  source: "database" | "fallback" | "unavailable";
};

export type JobSourceLink = {
  name: string;
  url: string;
  category: string;
  note: string;
  region?: string;
  sourcePriority?: number;
  hasApi?: boolean;
  isAggregator?: boolean;
  isEmployerBoard?: boolean;
  isTrusted?: boolean;
};

export type CountryRoleSuggestion = {
  label: string;
  desiredTitle: string;
  keyword?: string;
  href?: string;
};
