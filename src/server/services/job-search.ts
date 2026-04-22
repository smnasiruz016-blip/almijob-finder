import { prisma } from "@/lib/prisma";
import { fetchFromAdapters } from "@/server/adapters/provider-registry";
import { rankJobs } from "@/server/services/ranking";
import type { JobSearchInput, NormalizedJob, ParsedResume, SearchInsights } from "@/types";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(value: string) {
  return normalizeText(value)
    .replace(/\b(remote|worldwide|global)\b/g, (match) => match)
    .trim();
}

function normalizeUrl(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.hostname.toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return value.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

function buildIdentityKeys(job: Pick<NormalizedJob, "source" | "externalJobId" | "applyUrl" | "title" | "company" | "location">) {
  const title = normalizeText(job.title);
  const company = normalizeText(job.company);
  const location = normalizeLocation(job.location);
  const keys = new Set<string>();

  if (job.source && job.externalJobId) {
    keys.add(`id:${normalizeText(job.source)}:${normalizeText(job.externalJobId)}`);
  }

  const normalizedUrl = normalizeUrl(job.applyUrl);
  if (normalizedUrl) {
    keys.add(`url:${normalizedUrl}`);
  }

  if (title && company && location) {
    keys.add(`tcl:${title}::${company}::${location}`);
  }

  return [...keys];
}

function scoreJobCompleteness(job: Pick<NormalizedJob, "sourceType" | "descriptionSnippet" | "salaryMin" | "salaryMax" | "postedDate" | "applyUrl" | "keywords">) {
  let score = 0;

  if (job.sourceType === "live") {
    score += 4;
  }

  if (job.applyUrl) {
    score += 2;
  }

  if (job.postedDate) {
    score += 2;
  }

  if (typeof job.salaryMin === "number" || typeof job.salaryMax === "number") {
    score += 2;
  }

  score += Math.min(3, Math.floor((job.descriptionSnippet?.length ?? 0) / 80));
  score += Math.min(2, job.keywords?.length ?? 0);

  return score;
}

function preferJob<T extends NormalizedJob>(current: T, candidate: T) {
  const currentScore = scoreJobCompleteness(current);
  const candidateScore = scoreJobCompleteness(candidate);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  return current.sourceType !== "live" && candidate.sourceType === "live" ? candidate : current;
}

export function dedupeJobs<T extends NormalizedJob>(jobs: T[]) {
  const seen = new Map<string, T>();

  for (const job of jobs) {
    const identityKeys = buildIdentityKeys(job);
    const current = identityKeys.map((key) => seen.get(key)).find(Boolean);
    const chosen = current ? preferJob(current, job) : job;

    if (current && chosen !== current) {
      for (const [key, value] of seen.entries()) {
        if (value === current) {
          seen.set(key, chosen);
        }
      }
    }

    for (const key of identityKeys) {
      seen.set(key, chosen);
    }
  }

  return [...new Set(seen.values())];
}

function buildSearchInsights<T extends { company: string; remoteStatus?: string; salaryMin?: number; salaryMax?: number; sourceType?: string }>(
  jobs: T[]
): SearchInsights {
  const companyCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.company] = (acc[job.company] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalResults: jobs.length,
    liveResults: jobs.filter((job) => job.sourceType === "live").length,
    remoteResults: jobs.filter((job) => job.remoteStatus === "REMOTE").length,
    salaryVisibleResults: jobs.filter((job) => typeof job.salaryMin === "number" || typeof job.salaryMax === "number").length,
    topCompanies: Object.entries(companyCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([company]) => company)
  };
}

export async function executeJobSearch(input: JobSearchInput, resume?: ParsedResume | null) {
  const normalizedCountry = input.country?.trim() || "Worldwide";
  const normalizedInput: JobSearchInput = {
    ...input,
    country: normalizedCountry
  };

  const { jobs, usedFallback, sources, providerStatuses } = await fetchFromAdapters(normalizedInput);
  const results = dedupeJobs(jobs);
  const ranked = rankJobs(results, normalizedInput, resume);
  const insights = buildSearchInsights(ranked);
  const quality = {
    averageMatchScore: ranked.length ? Math.round(ranked.reduce((sum, job) => sum + job.matchScore, 0) / ranked.length) : 0,
    topMatchScore: ranked[0]?.matchScore ?? 0,
    highFitCount: ranked.filter((job) => job.matchScore >= 80).length
  };
  const sourceBreakdown = ranked.reduce<Record<string, number>>((acc, job) => {
    acc[job.source] = (acc[job.source] ?? 0) + 1;
    return acc;
  }, {});

  return {
    normalizedInput,
    results: ranked,
    meta: {
      usedFallback,
      sources,
      sourceBreakdown,
      insights,
      quality,
      providerStatuses
    }
  };
}

export async function runJobSearch(userId: string, input: JobSearchInput, resume?: ParsedResume | null) {
  const { normalizedInput, results: ranked, meta } = await executeJobSearch(input, resume);

  const search = await prisma.jobSearch.create({
    data: {
      userId,
      desiredTitle: normalizedInput.desiredTitle,
      keyword: normalizedInput.keyword,
      company: normalizedInput.company,
      country: normalizedInput.country ?? "Worldwide",
      state: normalizedInput.state,
      city: normalizedInput.city,
      remoteMode: normalizedInput.remoteMode,
      employmentType: normalizedInput.employmentType,
      postedWithinDays: normalizedInput.postedWithinDays,
      salaryMin: normalizedInput.salaryMin,
      salaryMax: normalizedInput.salaryMax,
      latestResults: ranked
    }
  });

  await prisma.searchHistory.create({
    data: {
      userId,
      searchId: search.id,
      snapshot: normalizedInput,
      resultsCount: ranked.length
    }
  });

  for (const job of ranked) {
    await prisma.jobResultCache.upsert({
      where: {
        externalJobId_source: {
          externalJobId: job.externalJobId,
          source: job.source
        }
      },
      update: {
        payload: job,
        title: job.title,
        company: job.company,
        location: job.location,
        postedDate: job.postedDate ? new Date(job.postedDate) : null
      },
      create: {
        externalJobId: job.externalJobId,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        postedDate: job.postedDate ? new Date(job.postedDate) : null,
        payload: job
      }
    });
  }

  return {
    searchId: search.id,
    results: ranked,
    meta
  };
}
