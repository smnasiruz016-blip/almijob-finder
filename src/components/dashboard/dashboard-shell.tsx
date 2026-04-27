"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BellRing, Bookmark, BriefcaseBusiness, Building2, ExternalLink, Globe2, Search, Sparkles, Star, UploadCloud } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CountryHiringPanel } from "@/components/dashboard/country-hiring-panel";
import { JobCard } from "@/components/dashboard/job-card";
import { MatchScore } from "@/components/dashboard/match-score";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ResultSkeleton } from "@/components/dashboard/result-skeleton";
import { buildSavedSearchSectionCopy, buildSearchFeedbackState, buildUploadErrorState } from "@/lib/dashboard-copy";
import { buildAlertOverview, buildSetupChecklist } from "@/lib/dashboard-insights";
import { collectAdvertisedSkills, getRoleProfile, getRoleSuggestions, getSuggestedSkillOptions, ROLE_OPTIONS } from "@/lib/job-taxonomy";
import { buildProfileInsights } from "@/lib/profile-insights";
import { buildResumeSuggestions } from "@/lib/resume-suggestions";
import { shouldShowTrustedSourcePanel } from "@/lib/source-guidance";
import { buildResultsSummary, buildUsageSupportCopy } from "@/lib/search-trust";
import { COUNTRY_OPTIONS, getCityOptions, getRegionOptions } from "@/lib/location-data";
import { getTrustedSourcesForCountry } from "@/lib/source-directory";
import { canUseAlerts, canUseResumeInsights } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyRange } from "@/lib/utils";
import type { CountryBrowseJob, CountryHiringHighlights, CountryRoleSuggestion, EmployerInventoryOverview, JobSourceLink, ParsedResume, ProviderStatus, RankedJob, SearchInsights, SearchUsageSnapshot, SessionUser } from "@/types";

type HistorySnapshot = {
  desiredTitle: string;
  keyword: string | null;
  company: string | null;
  country: string;
  state: string | null;
  city: string | null;
  remoteMode: string | null;
  employmentType: string | null;
  postedWithinDays: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
};

type DashboardShellProps = {
  user: SessionUser;
  resume: ParsedResume | null;
  usage: SearchUsageSnapshot;
  employerInventory: EmployerInventoryOverview;
  countryHighlights: CountryHiringHighlights;
  trustedCountrySources: JobSourceLink[];
  countrySampleJobs: CountryBrowseJob[];
  countryRoleSuggestions: CountryRoleSuggestion[];
  initialFormState: SearchFormState;
  initialResults: RankedJob[];
  initialSavedJobs: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    source: string;
    applyUrl: string;
  }>;
  initialSavedSearches: Array<{
    id: string;
    name: string;
    alertsEnabled: boolean;
    alertFrequency: string;
    lastAlertedAt: string | null;
  }>;
  initialHistory: Array<{
    id: string;
    createdAt: string;
    resultsCount: number;
    desiredTitle: string;
    keyword: string;
    country: string;
    snapshot: HistorySnapshot;
  }>;
};

type SearchMeta = {
  usedFallback?: boolean;
  sources?: string[];
  sourceBreakdown?: Record<string, number>;
  insights?: SearchInsights;
  quality?: {
    averageMatchScore: number;
    topMatchScore: number;
    highFitCount: number;
  };
  providerStatuses?: ProviderStatus[];
};

type SearchStatus =
  | { type: "idle" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "empty"; message: string; code?: string }
  | { type: "error"; message: string; code?: string };

type UploadStatus =
  | { type: "idle" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string; code?: "MISSING_FILE" | "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "UPLOAD_FAILED" | "PARSING_FAILED" };

type InlineStatus =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type SearchFormState = {
  desiredTitle: string;
  keyword: string;
  company: string;
  country: string;
  state: string;
  city: string;
  remoteMode: string;
  employmentType: string;
  postedWithinDays: string;
  salaryMin: string;
  salaryMax: string;
};

const presetSearches: Array<{ label: string; description: string; values: Partial<SearchFormState> }> = [
  {
    label: "Global product roles",
    description: "Worldwide product design discovery with remote-first bias.",
    values: { desiredTitle: "Product Designer", keyword: "design systems", country: "Worldwide", remoteMode: "REMOTE" }
  },
  {
    label: "Frontend remote",
    description: "Remote frontend engineering roles with strong TypeScript overlap.",
    values: { desiredTitle: "Frontend Engineer", keyword: "React TypeScript", country: "Worldwide", remoteMode: "REMOTE" }
  },
  {
    label: "US growth companies",
    description: "Recent US roles with visible salary bands and strong engineering scope.",
    values: { desiredTitle: "Product Engineer", country: "United States", postedWithinDays: "14", salaryMin: "100000" }
  }
];

function createSnapshotFromForm(state: SearchFormState): HistorySnapshot {
  return {
    desiredTitle: state.desiredTitle.trim(),
    keyword: state.keyword.trim() || null,
    company: state.company.trim() || null,
    country: state.country.trim() || "Worldwide",
    state: state.state.trim() || null,
    city: state.city.trim() || null,
    remoteMode: state.remoteMode || null,
    employmentType: state.employmentType || null,
    postedWithinDays: state.postedWithinDays ? Number(state.postedWithinDays) : null,
    salaryMin: state.salaryMin ? Number(state.salaryMin) : null,
    salaryMax: state.salaryMax ? Number(state.salaryMax) : null
  };
}

function buildSavedSearchName(snapshot: HistorySnapshot) {
  const parts = [snapshot.desiredTitle];

  if (snapshot.country && snapshot.country !== "Worldwide") {
    parts.push(snapshot.country);
  } else {
    parts.push("Worldwide");
  }

  if (snapshot.keyword) {
    parts.push(snapshot.keyword);
  }

  return parts.join(" - ");
}

function getProviderTone(status: ProviderStatus["status"]) {
  if (status === "success") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "no_matches") {
    return "bg-blue-50 text-blue-800";
  }

  if (status === "fallback") {
    return "bg-amber-50 text-amber-900";
  }

  if (status === "error") {
    return "bg-rose-50 text-rose-800";
  }

  return "bg-slate-100 text-slate-600";
}

function getProviderLabel(status: ProviderStatus["status"]) {
  if (status === "success") {
    return "Live active";
  }

  if (status === "no_matches") {
    return "Live active";
  }

  if (status === "fallback") {
    return "Fallback used";
  }

  if (status === "error") {
    return "Temporarily unavailable";
  }

  return "Standby";
}

function getSourceBadges(source: JobSourceLink) {
  const badges = [source.category];

  if (source.hasApi) {
    badges.push("API");
  }

  if (source.isEmployerBoard) {
    badges.push("Employer board");
  } else if (source.isAggregator) {
    badges.push("Aggregator");
  } else if (source.isTrusted) {
    badges.push("Trusted");
  }

  return badges.slice(0, 3);
}

function getAlertFrequencyLabel(frequency: string) {
  return frequency === "WEEKLY" ? "Weekly" : "Daily";
}

function getNextAlertLabel(lastAlertedAt: string | null, frequency: string, alertsEnabled: boolean) {
  if (!alertsEnabled) {
    return "Alerts are paused";
  }

  if (!lastAlertedAt) {
    return "Next run: ready on the next alert cycle";
  }

  const nextRun = new Date(lastAlertedAt);
  nextRun.setDate(nextRun.getDate() + (frequency === "WEEKLY" ? 7 : 1));
  return `Next run: ${nextRun.toLocaleString()}`;
}

export function DashboardShell({
  user,
  resume,
  usage,
  employerInventory,
  countryHighlights,
  trustedCountrySources,
  countrySampleJobs,
  countryRoleSuggestions,
  initialFormState,
  initialResults,
  initialSavedJobs,
  initialSavedSearches,
  initialHistory
}: DashboardShellProps) {
  const [resumeSnapshot, setResumeSnapshot] = useState(resume);
  const [results, setResults] = useState<RankedJob[]>(initialResults);
  const [savedJobs, setSavedJobs] = useState(initialSavedJobs);
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [history, setHistory] = useState(initialHistory);
  const [lastSearchPayload, setLastSearchPayload] = useState<Record<string, FormDataEntryValue>>({});
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sortBy, setSortBy] = useState<"best-match" | "newest" | "salary">("best-match");
  const [selectedJob, setSelectedJob] = useState<RankedJob | null>(initialResults[0] ?? null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({ type: "idle" });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: "idle" });
  const [searchUsage, setSearchUsage] = useState<SearchUsageSnapshot>(usage);
  const [saveSearchStatus, setSaveSearchStatus] = useState<InlineStatus>({ type: "idle" });
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [trustedSources, setTrustedSources] = useState<JobSourceLink[]>([]);
  const [formState, setFormState] = useState<SearchFormState>(initialFormState);
  const alertsEnabledOnPlan = canUseAlerts(user.subscriptionTier);
  const resumeInsightsEnabledOnPlan = canUseResumeInsights(user.subscriptionTier);
  const resultsSectionRef = useRef<HTMLElement | null>(null);

  const availableRegions = useMemo(() => getRegionOptions(formState.country), [formState.country]);
  const availableCities = useMemo(() => getCityOptions(formState.country, formState.state), [formState.country, formState.state]);
  const useRegionSelect = formState.country !== "Worldwide" && availableRegions.length > 0;
  const useCitySelect = formState.country !== "Worldwide" && availableCities.length > 0;
  const citySelectDisabled = formState.country === "Worldwide" || (useRegionSelect && !formState.state);
  const cityPlaceholder = formState.country === "Worldwide"
    ? "No city needed"
    : !formState.state && useRegionSelect
      ? "Select a region first"
      : useCitySelect
        ? "Select city"
        : "Type a city if you want";
  const cityHelpText = formState.country === "Worldwide"
    ? "Worldwide search does not need a city filter."
    : !formState.state && useRegionSelect
      ? "Choose a state or region first to unlock city options."
      : !useCitySelect
        ? "You can type a city manually when we do not have mapped city options yet."
        : "Optional: narrow your results further by city.";

  const sortedResults = useMemo(() => {
    const next = [...results];

    if (sortBy === "newest") {
      return next.sort((a, b) => new Date(b.postedDate ?? "").getTime() - new Date(a.postedDate ?? "").getTime());
    }

    if (sortBy === "salary") {
      return next.sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0));
    }

    return next.sort((a, b) => b.matchScore - a.matchScore);
  }, [results, sortBy]);

  const profileInsights = useMemo(() => buildProfileInsights(resumeSnapshot), [resumeSnapshot]);
  const alertOverview = useMemo(() => buildAlertOverview(savedSearches, alertsEnabledOnPlan), [savedSearches, alertsEnabledOnPlan]);
  const setupChecklist = useMemo(
    () =>
      buildSetupChecklist({
        resume: resumeSnapshot,
        searchesUsedToday: searchUsage.dailyUsed,
        savedSearchCount: savedSearches.length,
        hasResults: results.length > 0,
        canUseResumeInsights: resumeInsightsEnabledOnPlan
      }),
    [resumeSnapshot, searchUsage.dailyUsed, savedSearches.length, results.length, resumeInsightsEnabledOnPlan]
  );
  const providerHealth = useMemo(() => {
    const statuses = searchMeta?.providerStatuses ?? [];
    const active = statuses.filter((item) => item.status === "success" || item.status === "fallback" || item.status === "no_matches");
    return {
      activeCount: active.length,
      liveCount: statuses.filter((item) => (item.status === "success" || item.status === "no_matches") && item.sourceType === "live").length,
      fallbackCount: statuses.filter((item) => item.status === "fallback").length
    };
  }, [searchMeta]);
  const resultsSummary = useMemo(
    () =>
      buildResultsSummary({
        results,
        providerStatuses: searchMeta?.providerStatuses,
        usedFallback: searchMeta?.usedFallback,
        hasResume: Boolean(resumeSnapshot)
      }),
    [results, resumeSnapshot, searchMeta]
  );
  const activeFilterPills = useMemo(
    () =>
      [
        lastSearchPayload.desiredTitle ? `Role: ${String(lastSearchPayload.desiredTitle)}` : null,
        lastSearchPayload.keyword ? `Keyword: ${String(lastSearchPayload.keyword)}` : null,
        lastSearchPayload.company ? `Company: ${String(lastSearchPayload.company)}` : null,
        lastSearchPayload.country ? `Country: ${String(lastSearchPayload.country)}` : null,
        lastSearchPayload.state ? `Region: ${String(lastSearchPayload.state)}` : null,
        lastSearchPayload.city ? `City: ${String(lastSearchPayload.city)}` : null,
        lastSearchPayload.remoteMode ? `Remote: ${String(lastSearchPayload.remoteMode)}` : null,
        lastSearchPayload.employmentType ? `Type: ${String(lastSearchPayload.employmentType)}` : null,
        lastSearchPayload.postedWithinDays ? `Posted: ${String(lastSearchPayload.postedWithinDays)}d` : null
      ].filter(Boolean) as string[],
    [lastSearchPayload]
  );
  const searchFeedbackState =
    searchStatus.type === "error" || searchStatus.type === "empty" ? buildSearchFeedbackState(searchStatus) : null;
  const uploadErrorState = uploadStatus.type === "error" ? buildUploadErrorState(uploadStatus) : null;
  const selectedRoleProfile = useMemo(() => getRoleProfile(formState.desiredTitle), [formState.desiredTitle]);
  const roleSuggestions = useMemo(() => getRoleSuggestions(formState.desiredTitle), [formState.desiredTitle]);
  const advertisedSkills = useMemo(() => collectAdvertisedSkills(results), [results]);
  const suggestedSkills = useMemo(() => getSuggestedSkillOptions(formState.desiredTitle, results), [formState.desiredTitle, results]);
  const liveCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const job of results) {
      const category = getRoleProfile(job.title)?.category ?? "Other";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category))
      .slice(0, 6);
  }, [results]);
  const filteredResults = useMemo(() => {
    if (!selectedCategory) {
      return sortedResults;
    }

    return sortedResults.filter((job) => (getRoleProfile(job.title)?.category ?? "Other") === selectedCategory);
  }, [selectedCategory, sortedResults]);
  const visibleSelectedJob = useMemo(() => {
    if (filteredResults.length === 0) {
      return null;
    }

    if (!selectedJob) {
      return filteredResults[0] ?? null;
    }

    return (
      filteredResults.find((job) => `${job.source}-${job.externalJobId}` === `${selectedJob.source}-${selectedJob.externalJobId}`) ??
      filteredResults[0] ??
      null
    );
  }, [filteredResults, selectedJob]);
  const resumeSuggestions = useMemo(() => buildResumeSuggestions(resumeSnapshot, visibleSelectedJob), [resumeSnapshot, visibleSelectedJob]);
  const showTrustedSourcePanel = useMemo(
    () =>
      shouldShowTrustedSourcePanel({
        country: formState.country,
        resultsCount: filteredResults.length,
        averageMatchScore: searchMeta?.quality?.averageMatchScore,
        providerStatuses: searchMeta?.providerStatuses,
        selectedCategory
      }),
    [filteredResults.length, formState.country, searchMeta?.providerStatuses, searchMeta?.quality?.averageMatchScore, selectedCategory]
  );

  useEffect(() => {
    if (!showTrustedSourcePanel) {
      return;
    }

    let cancelled = false;
    const fallbackSources = getTrustedSourcesForCountry(formState.country);

    async function loadTrustedSources() {
      try {
        const response = await fetch(`/api/source-directory?country=${encodeURIComponent(formState.country)}`);
        if (!response.ok) {
          throw new Error("SOURCE_DIRECTORY_REQUEST_FAILED");
        }

        const data = (await response.json()) as { sources?: JobSourceLink[] };
        if (!cancelled) {
          setTrustedSources(data.sources?.length ? data.sources : fallbackSources);
        }
      } catch {
        if (!cancelled) {
          setTrustedSources(fallbackSources);
        }
      }
    }

    void loadTrustedSources();

    return () => {
      cancelled = true;
    };
  }, [formState.country, showTrustedSourcePanel]);

  const trustedSourcePanel =
    showTrustedSourcePanel && trustedSources.length > 0 ? (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {filteredResults.length === 0
                ? `Trusted job websites for ${formState.country === "Worldwide" ? "worldwide search" : formState.country}`
                : `Expand this search with trusted job websites in ${formState.country === "Worldwide" ? "global markets" : formState.country}`}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {filteredResults.length === 0
                ? "Live provider coverage is still thin for this search. These trusted external job websites are a good next step while we keep expanding worldwide provider coverage."
                : "You have some live results, but this search still looks thin or low-confidence. These trusted job sites are a good next step for deeper local coverage."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trustedSources.map((source) => (
            <a
              key={`${formState.country}-${source.name}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{source.name}</p>
                  {source.region && source.region !== "Worldwide" && (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{source.region}</p>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {getSourceBadges(source).map((badge) => (
                    <span
                      key={`${source.name}-${badge}`}
                      className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{source.note}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                Open source
                <ExternalLink className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      </div>
    ) : null;

  function updateForm<K extends keyof SearchFormState>(key: K, value: SearchFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function applySuggestedSkill(skill: string) {
    const currentKeywords = formState.keyword
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (currentKeywords.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      return;
    }

    updateForm("keyword", [...currentKeywords, skill].join(", "));
  }

  function applyPreset(values: Partial<SearchFormState>) {
    setFormState((current) => ({
      ...current,
      ...values,
      country: values.country ?? current.country,
      state: values.state ?? (values.country && values.country !== current.country ? "" : current.state),
      city: values.city ?? ""
    }));
  }

  function handleCategoryFilter(category: string) {
    const nextCategory = selectedCategory === category ? null : category;
    const nextResults = nextCategory
      ? sortedResults.filter((job) => (getRoleProfile(job.title)?.category ?? "Other") === nextCategory)
      : sortedResults;

    setSelectedCategory(nextCategory);
    setView("cards");
    setSelectedJob(nextResults[0] ?? null);

    window.requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function runSearch(payload: Record<string, string>, options?: { scrollToResults?: boolean }) {
    setSearchStatus({ type: "loading", message: "Searching live job providers..." });
    setSaveSearchStatus({ type: "idle" });
    setLastSearchPayload(payload);

    const response = await fetch("/api/jobs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.usage) {
        setSearchUsage(data.usage);
      }
      setResults([]);
      setSelectedJob(null);
      setSelectedCategory(null);
      setSearchMeta(null);
      setSearchStatus({
        type: "error",
        message: data.error ?? "Search failed. Try broadening your title or removing a filter.",
        code: data.code
      });
      return;
    }

    if (data.usage) {
      setSearchUsage(data.usage);
    }
    setResults(data.results);
    setSelectedJob(data.results[0] ?? null);
    setSelectedCategory(null);
    setSearchMeta(data.meta ?? null);
    if (data.searchId) {
      setHistory((current) => [
        {
          id: data.searchId,
          createdAt: new Date().toISOString(),
          resultsCount: data.results.length,
          desiredTitle: String(payload.desiredTitle ?? ""),
          keyword: String(payload.keyword ?? ""),
          country: String(payload.country ?? "Worldwide") || "Worldwide",
          snapshot: createSnapshotFromForm(formState)
        },
        ...current.filter((entry) => entry.id !== data.searchId)
      ].slice(0, 6));
    }

    if (data.results.length === 0) {
      const liveUnavailable = (data.meta?.providerStatuses ?? []).some(
        (provider: ProviderStatus) => provider.sourceType === "live" && provider.status === "error"
      );
      const liveNoMatches = (data.meta?.providerStatuses ?? []).some(
        (provider: ProviderStatus) => provider.sourceType === "live" && provider.status === "no_matches"
      );
      const suggestedQueryReplacement = data.meta?.insights?.suggestedQueryReplacement as string | null | undefined;
      const queryHint =
        suggestedQueryReplacement && suggestedQueryReplacement.toLowerCase() !== formState.desiredTitle.trim().toLowerCase()
          ? ` Try "${suggestedQueryReplacement}" as the role title next.`
          : "";
      setSearchStatus({
        type: "empty",
        message: liveUnavailable
          ? "Live job providers are temporarily unavailable right now. Try again shortly or broaden your search."
          : liveNoMatches
            ? `No live jobs matched this search yet. Try a broader title, country, or remote search.${queryHint}`
            : "No jobs found - try a broader search, add a keyword, or remove a strict location filter."
      });
      if (options?.scrollToResults !== false) {
        window.requestAnimationFrame(() => {
          resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return;
    }

    const fallbackNote = data.meta?.usedFallback ? " Sample fallback data was used for this internal search." : "";
    const highFitNote = data.meta?.quality?.highFitCount ? ` ${data.meta.quality.highFitCount} high-fit roles surfaced.` : "";
    const liveNoMatchNote =
      !data.meta?.usedFallback &&
      (data.meta?.providerStatuses ?? []).some((provider: ProviderStatus) => provider.sourceType === "live" && provider.status === "no_matches")
        ? " Live providers are active, but this search is still narrow."
        : "";
    setSearchStatus({
      type: "success",
      message: `Found ${data.results.length} jobs from ${data.meta?.sources?.join(", ") ?? "available sources"}.${fallbackNote}${liveNoMatchNote}${highFitNote}`
    });

    if (options?.scrollToResults !== false) {
      window.requestAnimationFrame(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
    ) as Record<string, string>;
    await runSearch(payload);
  }

  async function handleCountryRoleSearch(role: CountryRoleSuggestion) {
    const nextFormState: SearchFormState = {
      ...formState,
      desiredTitle: role.desiredTitle,
      keyword: role.keyword ?? "",
      company: "",
      country: countryHighlights.country,
      state: "",
      city: "",
      remoteMode: "",
      employmentType: "",
      postedWithinDays: "",
      salaryMin: "",
      salaryMax: ""
    };

    setFormState(nextFormState);
    await runSearch({
      desiredTitle: nextFormState.desiredTitle,
      keyword: nextFormState.keyword,
      company: "",
      country: nextFormState.country,
      state: "",
      city: "",
      remoteMode: "",
      employmentType: "",
      postedWithinDays: "",
      salaryMin: "",
      salaryMax: ""
    });
  }

  async function handleResumeUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadStatus({ type: "loading", message: "Uploading and parsing your resume..." });
    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      setUploadStatus({
        type: "error",
        message: data.error ?? "We could not read your resume right now.",
        code: data.code
      });
      return;
    }

    setUploadStatus({
      type: "success",
      message: "Resume uploaded successfully. New matching signals and resume insights are ready."
    });
    setResumeSnapshot(data.parsed);
  }

  async function saveJob(job: RankedJob) {
    const response = await fetch("/api/saved-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });

    const data = await response.json();

    if (!response.ok) {
      setSearchStatus({ type: "error", message: data.error ?? "Unable to save job right now." });
      return;
    }

    setSavedJobs((current) =>
      current.some((item) => item.id === data.savedJob.id)
        ? current
        : [
            {
              id: data.savedJob.id,
              title: data.savedJob.title,
              company: data.savedJob.company,
              location: data.savedJob.location,
              source: data.savedJob.source,
              applyUrl: data.savedJob.applyUrl
            },
            ...current
          ]
    );
    setSearchStatus({ type: "success", message: "Job saved to your shortlist." });
  }

  async function removeSavedJob(id: string) {
    const response = await fetch(`/api/saved-jobs?id=${id}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setSavedJobs((current) => current.filter((job) => job.id !== id));
      setSearchStatus({ type: "success", message: "Saved job removed." });
    } else {
      setSearchStatus({ type: "error", message: "We could not remove that saved job right now. Please try again." });
    }
  }

  async function saveSearch() {
    const snapshot = createSnapshotFromForm(formState);

    if (!snapshot.desiredTitle) {
      setSaveSearchStatus({ type: "error", message: "Add a job title before saving this search." });
      return;
    }

    const payload = {
      name: buildSavedSearchName(snapshot),
      alertsEnabled: alertsEnabledOnPlan,
      alertFrequency: "DAILY",
      querySnapshot: snapshot
    };

    const response = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setSaveSearchStatus({ type: "error", message: data.error ?? "We could not save this search right now." });
      return;
    }

    setSavedSearches((current) => [
      {
        id: data.savedSearch.id,
        name: data.savedSearch.name,
        alertsEnabled: data.savedSearch.alertsEnabled,
        alertFrequency: data.savedSearch.alertFrequency,
        lastAlertedAt: data.savedSearch.lastAlertedAt ?? null
      },
      ...current.filter((item) => item.id !== data.savedSearch.id)
    ]);
    setSaveSearchStatus({ type: "success", message: data.message ?? "Search saved." });
  }

  async function updateSavedSearch(searchId: string, updates: { alertsEnabled?: boolean; alertFrequency?: "DAILY" | "WEEKLY" }) {
    const response = await fetch("/api/saved-searches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: searchId,
        ...updates
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setSaveSearchStatus({ type: "error", message: data.error ?? "We could not update that saved search right now." });
      return;
    }

    setSavedSearches((current) =>
      current.map((item) =>
        item.id === searchId
          ? {
              ...item,
              alertsEnabled: data.savedSearch.alertsEnabled,
              alertFrequency: data.savedSearch.alertFrequency,
              lastAlertedAt: data.savedSearch.lastAlertedAt ?? item.lastAlertedAt
            }
          : item
      )
    );
    setSaveSearchStatus({ type: "success", message: data.message ?? "Saved search updated." });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Search smarter</span>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
                Find jobs faster using your resume
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Combine structured filters, keyword search, and resume-aware ranking so the best-fit jobs rise to the top immediately.
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Saved jobs</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{savedJobs.length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Today&apos;s searches</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {searchUsage.dailyUsed}
                  {searchUsage.dailyLimit !== null ? `/${searchUsage.dailyLimit}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {["Worldwide-ready", "Resume-ranked", "Reliable fallback", "Saved search workflow"].map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {presetSearches.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="rounded-[1.25rem] bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <p className="font-semibold text-slate-900">{preset.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Resume status</p>
              <p className="mt-3 text-3xl font-semibold">{resumeSnapshot ? "Ready" : "Missing"}</p>
              <p className="mt-2 text-sm text-slate-300">
                {resumeSnapshot ? "Resume signals are available for ranking and fit explanations." : "Upload a resume to unlock stronger matching."}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Saved searches</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{savedSearches.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                {savedSearches.length ? `${alertOverview.activeCount} alert${alertOverview.activeCount === 1 ? "" : "s"} active right now.` : "Save one search to make your workflow repeatable."}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Latest search results</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{results.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                {results.length ? `${resultsSummary.strongMatches} strong match${resultsSummary.strongMatches === 1 ? "" : "es"} surfaced.` : "Run a search to populate ranked results."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Available jobs by category</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  These counts come from your current live result set, not fixed examples.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {results.length} total
              </span>
            </div>

            {liveCategoryCounts.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {liveCategoryCounts.map((entry) => (
                  <button
                    key={entry.category}
                    type="button"
                    onClick={() => handleCategoryFilter(entry.category)}
                    className={`rounded-[1.25rem] px-4 py-3 text-left transition ${
                      selectedCategory === entry.category
                        ? "bg-teal-50 ring-2 ring-teal-200"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{entry.category}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {entry.count} job{entry.count === 1 ? "" : "s"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                Run a search to see real category counts such as Finance, Hospitality, Healthcare, and Technology.
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Setup checklist</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Finish the essentials so search quality, saved searches, and resume guidance all work together.
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {setupChecklist.completed}/{setupChecklist.total}
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${setupChecklist.progress}%` }} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {setupChecklist.items.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          item.done ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.done ? "OK" : "TO"}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.25rem] bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
                Next best step: {setupChecklist.nextStep}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Alert coverage</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep important searches visible without rerunning the same filters from scratch.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{alertOverview.activeCount}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Paused</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{alertOverview.pausedCount}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Waiting</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{alertOverview.waitingCount}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-900">{alertOverview.summary}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{alertOverview.nextRunLabel}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <PlanCard usage={searchUsage} />

          <CountryHiringPanel
            title={`Jobs visitors can browse in ${countryHighlights.country}`}
            description="This gives visitors and signed-in users a cleaner country entry point before they narrow into a specific role search."
            highlights={countryHighlights}
            trustedSources={trustedCountrySources}
            sampleJobs={countrySampleJobs}
            roleSuggestions={countryRoleSuggestions}
            onRoleSelect={handleCountryRoleSearch}
            compact
          />

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Companies hiring on Almiworld</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This is the direct-employer inventory layer. It will grow as companies start advertising vacancies inside Job Finder.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Hiring companies</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{employerInventory.totalHiringCompanies}</p>
              </div>
              <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Open vacancies</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{employerInventory.totalOpenVacancies}</p>
              </div>
            </div>

            {employerInventory.featuredCompanies.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {employerInventory.featuredCompanies.map((company) => (
                  <div key={company.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{company.name}</p>
                          {company.verified ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                              Verified
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {[company.city, company.country].filter(Boolean).join(", ")}{company.website ? " • direct employer" : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {company.openRoles} open role{company.openRoles === 1 ? "" : "s"}
                      </span>
                    </div>
                    {company.roleTitles.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {company.roleTitles.map((role) => (
                          <span key={`${company.id}-${role}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                            {role}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.25rem] bg-blue-50 px-4 py-4 text-sm leading-7 text-blue-900">
                Direct employer vacancies are being prepared now. Once companies start posting inside Job Finder, this section will show verified hiring companies and their open roles here.
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Inventory source: {employerInventory.source === "database" ? "live company database" : employerInventory.source === "fallback" ? "groundwork ready - waiting for first company posts" : "temporary fallback mode"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]" id="search">
        <form onSubmit={handleSearch} className="glass-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Search jobs</p>
              <p className="text-sm text-slate-500">Use title, keyword, location, company, freshness, and salary filters together.</p>
              <p className="mt-1 text-xs text-slate-400">Jobs are ranked based on your resume, title, skills, and preferences.</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-slate-900">{buildUsageSupportCopy(searchUsage)}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {searchUsage.dailyUsed}
                {searchUsage.dailyLimit !== null ? ` / ${searchUsage.dailyLimit}` : ""} used today
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">Role and skill picker</p>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a target role and add the skills companies are commonly asking for in that path.
                </p>
              </div>
              {selectedRoleProfile ? (
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                  {selectedRoleProfile.category}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select
                value={selectedRoleProfile?.title ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) {
                    updateForm("desiredTitle", value);
                  }
                }}
              >
                <option value="">Choose a common role</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>

              <Select
                value=""
                onChange={(event) => {
                  const value = event.target.value;
                  if (value) {
                    applySuggestedSkill(value);
                  }
                }}
                disabled={!suggestedSkills.length}
              >
                <option value="">{suggestedSkills.length ? "Add a role-based skill" : "Choose a role first"}</option>
                {suggestedSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </Select>
            </div>

            {selectedRoleProfile ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Popular skills for this role</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedRoleProfile.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => applySuggestedSkill(skill)}
                      className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-800"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {advertisedSkills.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Skills seen in live openings</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {advertisedSkills.slice(0, 10).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => applySuggestedSkill(skill)}
                      className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  These come from the current live result set, so they reflect what employers are advertising right now.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Input
                name="desiredTitle"
                placeholder="Desired job title"
                required
                list="desired-role-options"
                value={formState.desiredTitle}
                onChange={(event) => updateForm("desiredTitle", event.target.value)}
              />
              <datalist id="desired-role-options">
                {(roleSuggestions.length ? roleSuggestions : ROLE_OPTIONS.slice(0, 12)).map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
              <p className="px-1 text-xs text-slate-500">
                Choose from common roles or type your own target job title. The role picker helps the app match your CV against the right opening family.
              </p>
            </div>
            <div className="space-y-2">
              <Input
                name="keyword"
                placeholder="Keyword or skill (optional)"
                list="skill-options"
                value={formState.keyword}
                onChange={(event) => updateForm("keyword", event.target.value)}
              />
              <datalist id="skill-options">
                {suggestedSkills.map((skill) => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>
              <p className="px-1 text-xs text-slate-500">
                Add one or more skills to help the app compare your CV against the role more accurately. Skills are suggested from role patterns and live company demand.
              </p>
            </div>
            <Input name="company" placeholder="Company (optional)" value={formState.company} onChange={(event) => updateForm("company", event.target.value)} />
            <Select
              name="country"
              value={formState.country}
              onChange={(event) => {
                updateForm("country", event.target.value);
                updateForm("state", "");
                updateForm("city", "");
              }}
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
              {useRegionSelect ? (
                <Select
                  name="state"
                  value={formState.state}
                  onChange={(event) => {
                    updateForm("state", event.target.value);
                    updateForm("city", "");
                  }}
                >
                  <option value="">{formState.country === "Worldwide" ? "No region needed" : "Select state / region"}</option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  name="state"
                  placeholder={formState.country === "Worldwide" ? "No region needed" : "State / region optional"}
                  value={formState.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  disabled={formState.country === "Worldwide"}
                />
              )}
              {useCitySelect ? (
                <Select name="city" value={formState.city} onChange={(event) => updateForm("city", event.target.value)} disabled={citySelectDisabled}>
                  <option value="">
                    {cityPlaceholder}
                  </option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  name="city"
                  placeholder={cityPlaceholder}
                  value={formState.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  disabled={formState.country === "Worldwide"}
                />
              )}
              <p className="px-1 text-xs text-slate-500">{cityHelpText}</p>
            <Select name="remoteMode" value={formState.remoteMode} onChange={(event) => updateForm("remoteMode", event.target.value)}>
              <option value="">Remote preference</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">Onsite</option>
              <option value="FLEXIBLE">Flexible</option>
            </Select>
            <Select name="employmentType" value={formState.employmentType} onChange={(event) => updateForm("employmentType", event.target.value)}>
              <option value="">Employment type</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </Select>
            <Select name="postedWithinDays" value={formState.postedWithinDays} onChange={(event) => updateForm("postedWithinDays", event.target.value)}>
              <option value="">Posted anytime</option>
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </Select>
            <Input name="salaryMin" type="number" placeholder="Salary min" value={formState.salaryMin} onChange={(event) => updateForm("salaryMin", event.target.value)} />
            <Input name="salaryMax" type="number" placeholder="Salary max" value={formState.salaryMax} onChange={(event) => updateForm("salaryMax", event.target.value)} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={searchStatus.type === "loading"}>
              {searchStatus.type === "loading" ? "Searching..." : "Search jobs"}
            </Button>
            <Button type="button" variant="secondary" onClick={saveSearch}>
              Save current search
            </Button>
          </div>

          {saveSearchStatus.type !== "idle" && (
            <div className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${saveSearchStatus.type === "error" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
              {saveSearchStatus.message}
            </div>
          )}

          {activeFilterPills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilterPills.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {item}
                </span>
              ))}
            </div>
          )}

          {searchStatus.type === "success" && (
            <div
              className="mt-5 rounded-[1.5rem] bg-slate-100 px-4 py-3 text-sm text-slate-700"
            >
              {searchStatus.message}
            </div>
          )}
        </form>

        <form onSubmit={handleResumeUpload} className="glass-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Resume upload</p>
              <p className="text-sm text-slate-500">Upload PDF or DOCX and convert it into matching signals.</p>
              <p className="mt-1 text-xs text-slate-400">Upload your resume to get more relevant job matches.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <input
              name="resume"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="block w-full rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600"
              required
            />
            {resumeSnapshot ? (
              <Textarea
                readOnly
                rows={8}
                value={`Resume status: ready for stronger matching\nPreferred roles: ${resumeSnapshot.preferredRoles.join(", ") || "Not detected"}\nSkills: ${
                  resumeSnapshot.skills.join(", ") || "Not detected"
                }\nExperience keywords: ${resumeSnapshot.experienceKeywords.join(", ") || "Not detected"}`}
              />
            ) : (
              <EmptyState
                title="No resume uploaded yet"
                description="A resume is optional, but uploading one gives you more relevant job matches and stronger explanations."
                nextStep="Upload your most recent PDF or DOCX resume."
                details={[
                  "Upload a PDF or DOCX resume with readable text.",
                  "Use your most recent version with clear skills and experience sections.",
                  "Run your search again after upload to improve match quality."
                ]}
              />
            )}
          </div>

          <Button type="submit" className="mt-5" disabled={uploadStatus.type === "loading"}>
            {uploadStatus.type === "loading" ? "Uploading..." : "Upload and parse"}
          </Button>

          {uploadStatus.type === "success" && (
            <div className="mt-5 rounded-[1.5rem] bg-slate-100 px-4 py-3 text-sm text-slate-700">{uploadStatus.message}</div>
          )}
          {uploadErrorState && (
            <div className="mt-5">
              <EmptyState
                title={uploadErrorState.title}
                description={uploadErrorState.description}
                nextStep={uploadErrorState.nextStep}
                details={uploadErrorState.details}
                variant={uploadErrorState.variant}
              />
            </div>
          )}
        </form>
      </section>

      <section ref={resultsSectionRef} className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Ranked job matches</p>
              <p className="text-sm text-slate-500">Match score is front and center so you can triage opportunities faster.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={view === "cards" ? "primary" : "secondary"} onClick={() => setView("cards")}>
                Cards
              </Button>
              <Button variant={view === "table" ? "primary" : "secondary"} onClick={() => setView("table")}>
                Table
              </Button>
              <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                <option value="best-match">Best match</option>
                <option value="newest">Newest</option>
                <option value="salary">Salary</option>
              </Select>
            </div>
          </div>

          <div className="mt-5">
            {sortedResults.length > 0 && (
              <div className="mb-5 space-y-3">
                {selectedCategory ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] bg-teal-50 px-4 py-3">
                    <p className="text-sm font-medium text-teal-900">
                      Filtering this result set by <span className="font-semibold">{selectedCategory}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-teal-800 ring-1 ring-teal-200 transition hover:bg-teal-100"
                    >
                      Clear filter
                    </button>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Jobs found</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredResults.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Strong matches</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {filteredResults.filter((job) => job.matchScore >= 80).length}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resume use</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{resultsSummary.resumeLabel}</p>
                </div>
                <div className="rounded-[1.25rem] bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Provider source</p>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      resultsSummary.providerTone === "fallback"
                        ? "text-amber-900"
                        : resultsSummary.providerTone === "unavailable"
                          ? "text-rose-800"
                          : "text-slate-700"
                    }`}
                  >
                    {resultsSummary.providerLabel}
                  </p>
                </div>
              </div>
              </div>
            )}

            {searchMeta?.sourceBreakdown && sortedResults.length > 0 && (
              <div className="mb-5 grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(searchMeta.sourceBreakdown).map(([source, count]) => (
                    <span key={source} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {source}: {count}
                    </span>
                  ))}
                </div>
                {searchMeta.quality && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.25rem] bg-slate-950 p-4 text-white">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Activity className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Average fit</p>
                      </div>
                      <p className="mt-2 text-3xl font-semibold">{searchMeta.quality.averageMatchScore}</p>
                      <p className="mt-2 text-xs text-slate-300">Average match quality across the visible result set.</p>
                    </div>
                    <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Star className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">Top score</p>
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-slate-950">{searchMeta.quality.topMatchScore}</p>
                      <p className="mt-2 text-xs text-slate-500">Highest fit score in this search.</p>
                    </div>
                    <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-slate-500">
                        <BriefcaseBusiness className="h-4 w-4" />
                        <p className="text-xs uppercase tracking-[0.18em]">High-fit roles</p>
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-slate-950">{searchMeta.quality.highFitCount}</p>
                      <p className="mt-2 text-xs text-slate-500">Roles scoring 80 or above and ready for shortlist review.</p>
                    </div>
                  </div>
                )}
                {searchMeta.insights && (
                  <>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{searchMeta.insights.totalResults}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Live</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{searchMeta.insights.liveResults}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Remote</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{searchMeta.insights.remoteResults}</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Salary visible</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{searchMeta.insights.salaryVisibleResults}</p>
                      </div>
                    </div>
                    {searchMeta.insights.topCompanies.length > 0 && (
                      <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-900">Top companies in this result set</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {searchMeta.insights.topCompanies.map((company) => (
                            <span key={company} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                              {company}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {searchMeta.providerStatuses && searchMeta.providerStatuses.length > 0 && (
                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Search network status</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {providerHealth.liveCount > 0
                            ? `${providerHealth.liveCount} live provider${providerHealth.liveCount > 1 ? "s are" : " is"} active for this search.`
                            : searchMeta?.usedFallback
                              ? "Sample fallback was used because live providers did not return usable jobs."
                              : "No live provider returned usable results for this search yet."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Active providers: {providerHealth.activeCount}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            providerHealth.fallbackCount > 0 ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {providerHealth.fallbackCount > 0 ? `Sample fallback used: ${providerHealth.fallbackCount}` : "Sample fallback off"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {searchMeta.providerStatuses.map((provider) => (
                        <div key={`${provider.source}-${provider.status}`} className="rounded-[1.25rem] border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                                <Globe2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{provider.source}</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{provider.sourceType}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getProviderTone(provider.status)}`}>
                              {getProviderLabel(provider.status)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            {provider.results} result{provider.results === 1 ? "" : "s"}
                          </p>
                          {provider.message && <p className="mt-2 text-xs leading-6 text-slate-500">{provider.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {trustedSourcePanel}
            {searchStatus.type === "loading" ? (
              <ResultSkeleton />
            ) : filteredResults.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  title={selectedCategory ? `No ${selectedCategory} jobs in this result set` : searchFeedbackState?.title ?? "No jobs found yet"}
                  description={
                    selectedCategory
                      ? `Your current search returned jobs, but none of them are in the ${selectedCategory} category.`
                      : searchFeedbackState?.description ?? "Try broadening your title, removing a strict filter, or searching again in a moment."
                  }
                  nextStep={selectedCategory ? "Clear the category filter or run a broader search." : searchFeedbackState?.nextStep ?? "Adjust one filter, then search again."}
                  details={selectedCategory ? ["Use Clear filter to return to the full result set.", "Try a broader role title if you want more category coverage."] : searchFeedbackState?.details}
                  variant={selectedCategory ? "warning" : searchFeedbackState?.variant ?? "warning"}
                />
              </div>
            ) : view === "cards" ? (
              <div className="grid gap-4">
                {filteredResults.map((job) => (
                  <JobCard
                    key={`${job.source}-${job.externalJobId}`}
                    job={job}
                    selected={visibleSelectedJob?.externalJobId === job.externalJobId}
                    onInspect={setSelectedJob}
                    onSave={saveJob}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                <table className="min-w-full bg-white text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Salary</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((job) => (
                      <tr key={job.externalJobId} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-500">{job.location}</p>
                        </td>
                        <td className="px-4 py-3">{job.company}</td>
                        <td className="px-4 py-3">
                          <div className="min-w-[130px]">
                            <MatchScore score={job.matchScore} reasons={job.matchReasons} compact />
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatCurrencyRange(job.salaryMin, job.salaryMax)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="secondary" type="button" onClick={() => setSelectedJob(job)}>
                              View
                            </Button>
                            <Button type="button" onClick={() => saveJob(job)}>
                              Save
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6" id="insights">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Improve Your Resume</p>
                <p className="text-sm text-slate-500">Use your selected job and current resume data to tighten the next version before applying.</p>
                <p className="mt-1 text-xs text-slate-400">Improve your resume to increase match quality.</p>
              </div>
            </div>

            {!resumeSnapshot ? (
              <div className="mt-5">
                <EmptyState
                  title="Resume insights start after upload"
                  description="Once you upload a resume, this section can highlight missing keywords, stronger wording, and the skills that matter most for your target role."
                  nextStep="Upload your resume before running your next search."
                  details={[
                    "Upload your current resume in PDF or DOCX format.",
                    "Search for a role after uploading so suggestions are tailored.",
                    "Use missing-keyword guidance before you apply."
                  ]}
                />
              </div>
            ) : !resumeInsightsEnabledOnPlan ? (
              <div className="mt-5 rounded-[1.5rem] bg-amber-50 p-5 text-amber-950">
                <p className="font-semibold">Advanced resume insights are part of Pro</p>
                <p className="mt-2 text-sm leading-7">
                  Free users can search and shortlist jobs, while Pro unlocks missing-skill analysis, keyword guidance, and alert-enabled workflows.
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-7">
                  <li>- Tailor your resume summary to the job title you want most.</li>
                  <li>- Move the strongest matching skills near the top of the page.</li>
                  <li>- Add measurable outcomes to experience bullets.</li>
                </ul>
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Profile readiness</p>
                      <p className="mt-1 text-sm text-slate-500">How complete your resume-derived profile looks right now.</p>
                    </div>
                    <div className="w-full max-w-[150px]">
                      <MatchScore score={profileInsights.completenessScore} reasons={profileInsights.strengths} compact />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Strengths</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                        {profileInsights.strengths.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Gaps to close</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                        {profileInsights.gaps.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                  <p className="font-semibold text-slate-900">Summary direction</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{resumeSuggestions.strongerSummary}</p>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-900">Missing keywords</p>
                    {resumeSuggestions.missingKeywords.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                        {resumeSuggestions.missingKeywords.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No high-priority keywords are missing from this target job yet.</p>
                    )}
                  </div>
                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-900">Suggested skills</p>
                    {resumeSuggestions.suggestedSkills.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                        {resumeSuggestions.suggestedSkills.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Search with a more specific role to surface skills worth adding or emphasizing.</p>
                    )}
                  </div>
                  <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-900">Wording improvements</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                      {resumeSuggestions.wordingUpgrades.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Selected job fit breakdown</p>
                <p className="text-sm text-slate-500">Make the score understandable, not mysterious.</p>
              </div>
            </div>

            {visibleSelectedJob ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-slate-950">{visibleSelectedJob.title}</p>
                    <p className="text-sm text-slate-500">{visibleSelectedJob.company}</p>
                  </div>
                  <div className="w-full max-w-[220px]">
                    <MatchScore score={visibleSelectedJob.matchScore} reasons={visibleSelectedJob.matchReasons} />
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                  <p className="font-semibold text-slate-900">Why this matched</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {visibleSelectedJob.matchReasons.map((reason) => (
                      <li key={reason}>- {reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Inspect a result to see fit details"
                description="Click any job card after searching to open its match explanation and resume suggestions."
                nextStep="Open one job card from the results list to see the fit breakdown."
                details={["Run a search with a resume uploaded for stronger signals.", "Use the score view to compare jobs quickly."]}
              />
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Premium search checklist</p>
                <p className="text-sm text-slate-500">Use this flow to get the highest-quality matches.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
              <li>- Start with a broad role title, then narrow with keyword and company filters.</li>
              <li>- Use Worldwide for discovery, then switch to country or city for precision.</li>
              <li>- Sort by best match first, then review newest and salary views.</li>
              <li>- Save only high-score roles and use resume suggestions before applying.</li>
            </ul>
          </div>

          <div className="glass-panel rounded-[2rem] p-6" id="saved">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Bookmark className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Saved jobs</p>
                <p className="text-sm text-slate-500">Shortlist promising roles and revisit them later.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {savedJobs.length ? (
                savedJobs.map((job) => (
                  <div key={job.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{job.company} / {job.location}</p>
                    <div className="mt-4 flex gap-3">
                      <a href={job.applyUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-teal-700">
                        Apply
                      </a>
                      <button type="button" onClick={() => removeSavedJob(job.id)} className="text-sm font-medium text-red-700">
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No saved jobs yet"
                  description="Save roles from the results list to build a shortlist you can apply through later."
                  nextStep="Save the first role you would realistically review again this week."
                  details={["Search broader titles to discover more roles.", "Use match score to decide what to save first."]}
                />
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6" id="alerts">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Saved searches and alerts</p>
                <p className="text-sm text-slate-500">Keep useful searches on hand and stay aware of new matches without rebuilding the same filters.</p>
              </div>
            </div>
            <div className="mt-5 space-y-5">
              <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">Alert status</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {alertsEnabledOnPlan
                    ? "Your saved searches can run on a daily or weekly cadence, and you can pause or resume alerts at any time."
                    : "Alerts are a Pro feature. You can still save searches now and turn notifications on later if you upgrade."}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Delivery today: {alertsEnabledOnPlan ? "alert checks are active, and email delivery is still being finished for beta" : "alerts are off on the Free plan"}.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">Saved searches</p>
                <p className="mt-1 text-sm text-slate-500">{buildSavedSearchSectionCopy(savedSearches.length, alertsEnabledOnPlan)}</p>
                <div className="mt-3 space-y-2">
                  {savedSearches.length ? (
                    savedSearches.map((search) => (
                      <div key={search.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-medium text-slate-900">{search.name}</p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              search.alertsEnabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {search.alertsEnabled ? `${getAlertFrequencyLabel(search.alertFrequency)} alert active` : alertsEnabledOnPlan ? "Saved search only" : "Upgrade for alerts"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {search.alertsEnabled
                            ? `${getAlertFrequencyLabel(search.alertFrequency)} alerts enabled${
                                search.lastAlertedAt ? ` / Last sent ${new Date(search.lastAlertedAt).toLocaleString()}` : " / Waiting for first alert run"
                              }`
                            : alertsEnabledOnPlan
                              ? "Saved, but alerts are currently off"
                              : "Saved now, alerts unlock on Pro"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {getNextAlertLabel(search.lastAlertedAt, search.alertFrequency, search.alertsEnabled)}
                        </p>
                        <div className="mt-3 flex gap-3">
                          {alertsEnabledOnPlan && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateSavedSearch(search.id, { alertsEnabled: !search.alertsEnabled })}
                                className="text-sm font-medium text-teal-700"
                              >
                                {search.alertsEnabled ? "Pause alerts" : "Enable alerts"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSavedSearch(search.id, {
                                    alertFrequency: search.alertFrequency === "WEEKLY" ? "DAILY" : "WEEKLY"
                                  })
                                }
                                className="text-sm font-medium text-slate-700"
                              >
                                Switch to {search.alertFrequency === "WEEKLY" ? "daily" : "weekly"}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const response = await fetch(`/api/saved-searches?id=${search.id}`, { method: "DELETE" });
                              if (response.ok) {
                                setSavedSearches((current) => current.filter((item) => item.id !== search.id));
                                setSaveSearchStatus({ type: "success", message: "Saved search removed." });
                              } else {
                                setSaveSearchStatus({ type: "error", message: "We could not remove that saved search right now. Please try again." });
                              }
                            }}
                            className="text-sm font-medium text-red-700"
                          >
                            Delete search
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No saved searches yet"
                      description="Save a search once you find a useful filter mix, then come back to it later without rebuilding the whole query."
                      nextStep="Run a search with your target role, then save the version that feels most useful."
                      details={[
                        "Run a search with your target role first.",
                        "Save one broad search and one narrower search for comparison.",
                        "Upgrade to Pro later if you want daily alert delivery."
                      ]}
                    />
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">Recent history</p>
                <div className="mt-3 space-y-2">
                  {history.length ? (
                    history.map((entry) => (
                      <div key={entry.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-200">
                        <p className="font-medium text-slate-900">{entry.desiredTitle} / {entry.country}</p>
                        <p className="text-xs text-slate-500">
                          {entry.keyword ? `Keyword: ${entry.keyword} / ` : ""}
                          {entry.resultsCount} results / {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFormState({
                                desiredTitle: entry.snapshot.desiredTitle ?? "",
                                keyword: entry.snapshot.keyword ?? "",
                                company: entry.snapshot.company ?? "",
                                country: entry.snapshot.country ?? "Worldwide",
                                state: entry.snapshot.state ?? "",
                                city: entry.snapshot.city ?? "",
                                remoteMode: entry.snapshot.remoteMode ?? "",
                                employmentType: entry.snapshot.employmentType ?? "",
                                postedWithinDays: entry.snapshot.postedWithinDays ? String(entry.snapshot.postedWithinDays) : "",
                                salaryMin: entry.snapshot.salaryMin ? String(entry.snapshot.salaryMin) : "",
                                salaryMax: entry.snapshot.salaryMax ? String(entry.snapshot.salaryMax) : ""
                              })
                            }
                            className="text-sm font-medium text-teal-700"
                          >
                            Load into search form
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No recent searches yet"
                      description="Your recent searches will show up here so you can quickly reload a filter set that worked well."
                      nextStep="Run one broad search to create your starting history."
                      details={["Reload a past search when you want to compare newer results.", "Save your best search once the filters feel right."]}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
