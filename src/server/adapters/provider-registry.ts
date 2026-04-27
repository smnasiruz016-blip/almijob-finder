import { mapCountryToAdzunaCode } from "@/lib/location";
import { log } from "@/lib/logger";
import { getPreferredProviderQuery, matchesSearchQuery } from "@/lib/search-query";
import { getProviderRuntimeConfig } from "@/server/adapters/provider-config";
import type { JobSourceAdapter } from "@/server/adapters/types";
import { mockAdapters } from "@/server/adapters/mock-jobs";
import type { JobSearchInput, NormalizedJob, ProviderStatus } from "@/types";

function sanitizeRemoteOkJobs(payload: unknown): RemoteOkApiJob[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((item): item is RemoteOkApiJob => typeof item === "object" && item !== null && "id" in item);
}

type RemoteOkApiJob = {
  id: number | string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  tags?: string[];
  date?: string;
};

type AdzunaApiJob = {
  id: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  created?: string;
  contract_time?: string;
};

type RemotiveApiResponse = {
  jobs?: RemotiveApiJob[];
};

type RemotiveApiJob = {
  id: number | string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  url?: string;
  publication_date?: string;
  job_type?: string;
  salary?: string;
  description?: string;
  tags?: string[];
};

type JoobleApiResponse = {
  jobs?: JoobleApiJob[];
};

type JoobleApiJob = {
  id?: number | string;
  title?: string;
  company?: string;
  location?: string;
  link?: string;
  salary?: string;
  type?: string;
  snippet?: string;
  source?: string;
  updated?: string;
};

function sanitizeRemotiveJobs(payload: unknown): RemotiveApiJob[] {
  if (!payload || typeof payload !== "object" || !("jobs" in payload)) {
    return [];
  }

  const jobs = (payload as RemotiveApiResponse).jobs;
  if (!Array.isArray(jobs)) {
    return [];
  }

  return jobs.filter((item): item is RemotiveApiJob => typeof item === "object" && item !== null && "id" in item);
}

function buildDescriptionSnippet(value: string | undefined, fallback: string) {
  const snippet = (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return snippet || fallback;
}

function getLocationNeedles(input: JobSearchInput) {
  return [input.city, input.state, input.country]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value !== "worldwide");
}

function sanitizeJoobleJobs(payload: unknown): JoobleApiJob[] {
  if (!payload || typeof payload !== "object" || !("jobs" in payload)) {
    return [];
  }

  const jobs = (payload as JoobleApiResponse).jobs;
  if (!Array.isArray(jobs)) {
    return [];
  }

  return jobs.filter((item): item is JoobleApiJob => typeof item === "object" && item !== null);
}

function matchesLocationNeedles(location: string, description: string, needles: string[]) {
  if (!needles.length) {
    return true;
  }

  const haystack = `${location} ${description}`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function matchesPostedWithin(postedDate: string | undefined, postedWithinDays?: number) {
  if (!postedWithinDays) {
    return true;
  }

  if (!postedDate) {
    return false;
  }

  return Date.now() - new Date(postedDate).getTime() <= postedWithinDays * 24 * 60 * 60 * 1000;
}

export function normalizeRemoteOkJob(job: RemoteOkApiJob): NormalizedJob {
  const keywords = job.tags ?? [];

  return {
    externalJobId: String(job.id),
    source: "RemoteOK",
    sourceType: "live",
    title: job.position ?? "Remote role",
    company: job.company ?? "Unknown company",
    location: job.location ?? "Remote",
    salaryMin: typeof job.salary_min === "number" ? job.salary_min : undefined,
    salaryMax: typeof job.salary_max === "number" ? job.salary_max : undefined,
    salary:
      typeof job.salary_min === "number" || typeof job.salary_max === "number"
        ? `$${job.salary_min ?? "?"} - $${job.salary_max ?? "?"}`
        : undefined,
    jobType: "FULL_TIME",
    remoteStatus: "REMOTE",
    descriptionSnippet: buildDescriptionSnippet(job.description, "Remote opportunity from Remote OK."),
    applyUrl: job.url ?? "https://remoteok.com",
    postedDate: job.date,
    keywords,
    providerMetadata: {
      attributionLabel: "Source: Remote OK",
      attributionUrl: job.url ?? "https://remoteok.com"
    }
  };
}

export function normalizeAdzunaJob(job: AdzunaApiJob, input: JobSearchInput): NormalizedJob {
  return {
    externalJobId: job.id,
    source: "Adzuna",
    sourceType: "live",
    title: job.title ?? input.desiredTitle,
    company: job.company?.display_name ?? "Unknown company",
    location: job.location?.display_name ?? input.country ?? "Worldwide",
    salaryMin: typeof job.salary_min === "number" ? Math.round(job.salary_min) : undefined,
    salaryMax: typeof job.salary_max === "number" ? Math.round(job.salary_max) : undefined,
    salary:
      typeof job.salary_min === "number" || typeof job.salary_max === "number"
        ? `$${Math.round(job.salary_min ?? 0)} - $${Math.round(job.salary_max ?? 0)}`
        : undefined,
    jobType: job.contract_time?.toUpperCase().replace("-", "_"),
    remoteStatus: input.remoteMode,
    descriptionSnippet: buildDescriptionSnippet(job.description, "Role supplied by Adzuna."),
    applyUrl: job.redirect_url ?? "",
    postedDate: job.created,
    keywords: [input.desiredTitle, input.keyword, job.title ?? "", job.company?.display_name ?? ""].filter(Boolean) as string[],
    providerMetadata: {
      attributionLabel: "Source: Adzuna",
      attributionUrl: job.redirect_url
    }
  };
}

export function normalizeRemotiveJob(job: RemotiveApiJob): NormalizedJob {
  const keywords = [...(job.tags ?? []), job.company_name ?? "", job.title ?? ""].filter(Boolean) as string[];

  return {
    externalJobId: String(job.id),
    source: "Remotive",
    sourceType: "live",
    title: job.title ?? "Remote role",
    company: job.company_name ?? "Unknown company",
    location: job.candidate_required_location ?? "Remote",
    salary: job.salary?.trim() || undefined,
    jobType: job.job_type?.toUpperCase().replace(/[-\s]+/g, "_"),
    remoteStatus: "REMOTE",
    descriptionSnippet: buildDescriptionSnippet(job.description, "Remote opportunity sourced from Remotive."),
    applyUrl: job.url ?? "https://remotive.com/jobs",
    postedDate: job.publication_date,
    keywords,
    providerMetadata: {
      attributionLabel: "Source: Remotive",
      attributionUrl: job.url ?? "https://remotive.com/jobs"
    }
  };
}

export function normalizeJoobleJob(job: JoobleApiJob, input: JobSearchInput): NormalizedJob {
  return {
    externalJobId: String(job.id ?? `${job.title ?? "job"}-${job.company ?? "company"}-${job.location ?? "location"}`),
    source: "Jooble",
    sourceType: "live",
    title: job.title ?? input.desiredTitle,
    company: job.company ?? "Unknown company",
    location: job.location ?? input.country ?? "Worldwide",
    salary: job.salary?.trim() || undefined,
    jobType: job.type?.toUpperCase().replace(/[-\s]+/g, "_"),
    remoteStatus: input.remoteMode,
    descriptionSnippet: buildDescriptionSnippet(job.snippet, "Role supplied by Jooble."),
    applyUrl: job.link ?? "",
    postedDate: job.updated,
    keywords: [input.desiredTitle, input.keyword, job.title ?? "", job.company ?? "", job.source ?? ""].filter(Boolean) as string[],
    providerMetadata: {
      attributionLabel: "Source: Jooble",
      attributionUrl: job.link
    }
  };
}

class RemoteOkAdapter implements JobSourceAdapter {
  source = "RemoteOK";
  sourceType = "live" as const;

  isEnabled() {
    return getProviderRuntimeConfig().remoteOkEnabled;
  }

  async searchJobs(input: JobSearchInput): Promise<NormalizedJob[]> {
    const config = getProviderRuntimeConfig();
    const endpoint = config.remoteOkApiUrl;
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: config.remoteOkRevalidateSeconds }
    });

    if (!response.ok) {
      throw new Error(`Remote OK request failed with status ${response.status}`);
    }

    const data = sanitizeRemoteOkJobs(await response.json());
    const titleNeedle = getPreferredProviderQuery(input.desiredTitle);
    const keywordNeedle = getPreferredProviderQuery(input.keyword);
    const locationNeedles = getLocationNeedles(input);

    return data
      .map((job) => normalizeRemoteOkJob(job))
      .filter((job) => {
        const haystack = `${job.title} ${job.descriptionSnippet} ${job.keywords.join(" ")}`.toLowerCase();
        const locationMatch = matchesLocationNeedles(job.location, job.descriptionSnippet, locationNeedles);
        const titleMatch = matchesSearchQuery(haystack, titleNeedle);
        const keywordMatch = matchesSearchQuery(haystack, keywordNeedle);
        const companyMatch = input.company ? job.company.toLowerCase().includes(input.company.toLowerCase()) : true;
        const salaryMatch = input.salaryMin ? (job.salaryMax ?? 0) >= input.salaryMin : true;
        const postedMatch = input.postedWithinDays
          ? Boolean(job.postedDate) &&
            Date.now() - new Date(job.postedDate!).getTime() <= input.postedWithinDays * 24 * 60 * 60 * 1000
          : true;

        return titleMatch && keywordMatch && companyMatch && salaryMatch && postedMatch && locationMatch;
      });
  }
}

class RemotiveAdapter implements JobSourceAdapter {
  source = "Remotive";
  sourceType = "live" as const;

  isEnabled() {
    return getProviderRuntimeConfig().remotiveEnabled;
  }

  async searchJobs(input: JobSearchInput): Promise<NormalizedJob[]> {
    const config = getProviderRuntimeConfig();
    const url = new URL(config.remotiveApiUrl);
    const query = [getPreferredProviderQuery(input.desiredTitle), getPreferredProviderQuery(input.keyword)]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (query) {
      url.searchParams.set("search", query);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: config.remotiveRevalidateSeconds }
    });

    if (!response.ok) {
      throw new Error(`Remotive request failed with status ${response.status}`);
    }

    const jobs = sanitizeRemotiveJobs(await response.json()).map((job) => normalizeRemotiveJob(job));
    const locationNeedles = getLocationNeedles(input);
    const titleNeedle = getPreferredProviderQuery(input.desiredTitle);
    const keywordNeedle = getPreferredProviderQuery(input.keyword);

    return jobs.filter((job) => {
      const haystack = `${job.title} ${job.descriptionSnippet} ${job.keywords.join(" ")}`.toLowerCase();
      const titleMatch = matchesSearchQuery(haystack, titleNeedle);
      const keywordMatch = matchesSearchQuery(haystack, keywordNeedle);
      const companyMatch = input.company ? job.company.toLowerCase().includes(input.company.toLowerCase()) : true;
      const locationMatch = matchesLocationNeedles(job.location, job.descriptionSnippet, locationNeedles);
      const postedMatch = matchesPostedWithin(job.postedDate, input.postedWithinDays);

      return titleMatch && keywordMatch && companyMatch && locationMatch && postedMatch;
    });
  }
}

class JoobleAdapter implements JobSourceAdapter {
  source = "Jooble";
  sourceType = "live" as const;

  isEnabled() {
    const config = getProviderRuntimeConfig();
    return config.joobleEnabled && Boolean(config.joobleApiKey);
  }

  async searchJobs(input: JobSearchInput): Promise<NormalizedJob[]> {
    const config = getProviderRuntimeConfig();
    const endpoint = `${config.joobleApiUrl.replace(/\/+$/, "")}/${config.joobleApiKey}`;
    const locationNeedles = getLocationNeedles(input);
    const titleNeedle = getPreferredProviderQuery(input.desiredTitle);
    const keywordNeedle = getPreferredProviderQuery(input.keyword);
    const locationQuery = [input.city, input.state, input.country].filter(Boolean).join(", ");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keywords: [titleNeedle, keywordNeedle].filter(Boolean).join(" ").trim(),
        location: locationQuery || undefined,
        page: 1
      }),
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`Jooble request failed with status ${response.status}`);
    }

    const jobs = sanitizeJoobleJobs(await response.json()).map((job) => normalizeJoobleJob(job, input));

    return jobs.filter((job) => {
      const haystack = `${job.title} ${job.descriptionSnippet} ${job.keywords.join(" ")}`.toLowerCase();
      const titleMatch = matchesSearchQuery(haystack, titleNeedle);
      const keywordMatch = matchesSearchQuery(haystack, keywordNeedle);
      const companyMatch = input.company ? job.company.toLowerCase().includes(input.company.toLowerCase()) : true;
      const locationMatch = matchesLocationNeedles(job.location, job.descriptionSnippet, locationNeedles);
      const salaryMatch = input.salaryMin
        ? (() => {
            const numericSalary = Number((job.salary ?? "").replace(/[^0-9]/g, ""));
            return Number.isFinite(numericSalary) ? numericSalary >= input.salaryMin : true;
          })()
        : true;
      const postedMatch = matchesPostedWithin(job.postedDate, input.postedWithinDays);

      return titleMatch && keywordMatch && companyMatch && locationMatch && salaryMatch && postedMatch;
    });
  }
}

class AdzunaAdapter implements JobSourceAdapter {
  source = "Adzuna";
  sourceType = "live" as const;

  isEnabled() {
    const config = getProviderRuntimeConfig();
    return config.adzunaEnabled && Boolean(config.adzunaAppId && config.adzunaAppKey);
  }

  async searchJobs(input: JobSearchInput): Promise<NormalizedJob[]> {
    const config = getProviderRuntimeConfig();
    const countryCode = mapCountryToAdzunaCode(input.country);

    if (!countryCode) {
      return [];
    }

    const url = new URL(`${config.adzunaApiUrl}/${countryCode}/search/1`);
    url.searchParams.set("app_id", config.adzunaAppId!);
    url.searchParams.set("app_key", config.adzunaAppKey!);
    url.searchParams.set("results_per_page", "20");
    url.searchParams.set(
      "what",
      [getPreferredProviderQuery(input.desiredTitle), getPreferredProviderQuery(input.keyword)].filter(Boolean).join(" ")
    );

    const where = [input.city, input.state, input.country].filter(Boolean).join(", ");
    if (where) {
      url.searchParams.set("where", where);
    }

    if (input.salaryMin) {
      url.searchParams.set("salary_min", String(input.salaryMin));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`Adzuna request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { results?: AdzunaApiJob[] };
    const results = Array.isArray(payload.results) ? payload.results : [];

    return results
      .map((job) => normalizeAdzunaJob(job, input))
      .filter((job) => {
        const companyMatch = input.company ? job.company.toLowerCase().includes(input.company.toLowerCase()) : true;
        const postedMatch = matchesPostedWithin(job.postedDate, input.postedWithinDays);

        return companyMatch && postedMatch;
      });
  }
}

export function getJobAdapters() {
  return [new RemoteOkAdapter(), new RemotiveAdapter(), new JoobleAdapter(), new AdzunaAdapter(), ...mockAdapters].filter((adapter) =>
    adapter.isEnabled()
  );
}

export async function fetchFromAdapters(input: JobSearchInput) {
  const adapters = getJobAdapters();
  const config = getProviderRuntimeConfig();
  const liveAdapters = adapters.filter((adapter) => adapter.sourceType === "live");
  const mockOnlyAdapters = adapters.filter((adapter) => adapter.sourceType !== "live");

  const providerStatuses: ProviderStatus[] = [];
  const liveResults: NormalizedJob[] = [];

  for (const adapter of liveAdapters) {
    try {
      const jobs = await adapter.searchJobs(input);
      liveResults.push(...jobs);
      providerStatuses.push({
        source: adapter.source,
        sourceType: "live",
        status: jobs.length ? "success" : "no_matches",
        results: jobs.length,
        message: jobs.length
          ? "Live provider is active and returned matching jobs."
          : "Live provider is active, but this search did not match anything yet."
      });
      log("info", "Live provider search completed", {
        source: adapter.source,
        results: jobs.length,
        status: jobs.length ? "success" : "no_matches"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log("warn", "Live job adapter failed, continuing with other providers", {
        source: adapter.source,
        error: message
      });
      providerStatuses.push({
        source: adapter.source,
        sourceType: "live",
        status: "error",
        results: 0,
        message: "This provider is temporarily unavailable. You can try again shortly."
      });
    }
  }

  const shouldUseFallback = liveResults.length === 0 && config.mockFallbackEnabled;
  const fallbackJobs = shouldUseFallback ? (await Promise.all(mockOnlyAdapters.map((adapter) => adapter.searchJobs(input)))).flat() : [];

  if (shouldUseFallback) {
    for (const adapter of mockOnlyAdapters) {
      providerStatuses.push({
        source: adapter.source,
        sourceType: "mock",
        status: "fallback",
        results: fallbackJobs.filter((job) => job.source === adapter.source).length,
        message: "Fallback coverage was used so you still have jobs to review."
      });
      log("info", "Fallback provider supplied jobs", {
        source: adapter.source,
        results: fallbackJobs.filter((job) => job.source === adapter.source).length
      });
    }
  } else {
    for (const adapter of mockOnlyAdapters) {
      providerStatuses.push({
        source: adapter.source,
        sourceType: "mock",
        status: "disabled",
        results: 0,
        message:
          liveResults.length > 0
            ? "Sample fallback stayed on standby because live providers returned results."
            : config.mockFallbackEnabled
              ? "Sample fallback stayed on standby because it was not needed."
              : "Sample fallback is turned off for this environment so only live jobs are shown."
      });
    }
  }

  return {
    jobs: shouldUseFallback ? fallbackJobs : liveResults,
    usedFallback: shouldUseFallback,
    sources: [...new Set((shouldUseFallback ? fallbackJobs : liveResults).map((job) => job.source))],
    providerStatuses
  };
}
