import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getCountryRoleSuggestions, normalizeCountryRoleSuggestion } from "@/lib/country-role-guidance";
import { log } from "@/lib/logger";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getLatestParsedResume } from "@/server/services/resume-service";
import { getCountryHiringHighlights, getEmployerInventoryOverview } from "@/server/services/company-vacancies";
import { getDetectedCountry } from "@/server/services/country-detection";
import { executeJobSearch } from "@/server/services/job-search";
import { getTrustedSourcesForCountry } from "@/server/services/source-directory";
import { getSearchUsageForUser } from "@/server/services/usage";
import type { RankedJob } from "@/types";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const detectedCountry = await getDetectedCountry();
  const requestedCountry = getSingleValue(resolvedSearchParams.country)?.trim() || detectedCountry;
  const normalizedQuery = normalizeCountryRoleSuggestion({
    desiredTitle: getSingleValue(resolvedSearchParams.desiredTitle),
    keyword: getSingleValue(resolvedSearchParams.keyword)
  });
  const initialFormState = {
    desiredTitle: normalizedQuery.desiredTitle,
    keyword: normalizedQuery.keyword,
    company: "",
    country: requestedCountry || "Worldwide",
    state: "",
    city: "",
    remoteMode: "",
    employmentType: "",
    postedWithinDays: "",
    salaryMin: "",
    salaryMax: ""
  };
  let resume = null;
  let savedJobs: Awaited<ReturnType<typeof prisma.savedJob.findMany>> = [];
  let savedSearches: Awaited<ReturnType<typeof prisma.savedSearch.findMany>> = [];
  let history: Awaited<ReturnType<typeof prisma.jobSearch.findMany>> = [];
  let employerInventory = await getEmployerInventoryOverview();
  let countryHighlights = await getCountryHiringHighlights(requestedCountry || detectedCountry);
  let trustedCountrySources = await getTrustedSourcesForCountry(requestedCountry || detectedCountry);
  let countrySampleJobs: RankedJob[] = [];
  let initialResults: RankedJob[] = [];
  const countryRoleSuggestions = getCountryRoleSuggestions(requestedCountry || detectedCountry);
  const usage = await getSearchUsageForUser(user.id);

  try {
    [resume, savedJobs, savedSearches, history, employerInventory, countryHighlights, trustedCountrySources] = await Promise.all([
      getLatestParsedResume(user.id),
      prisma.savedJob.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.savedSearch.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.jobSearch.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      getEmployerInventoryOverview(),
      getCountryHiringHighlights(requestedCountry || detectedCountry),
      getTrustedSourcesForCountry(requestedCountry || detectedCountry)
    ]);

    try {
      const seededTitle =
        normalizedQuery.desiredTitle ||
        history[0]?.desiredTitle ||
        resume?.preferredRoles?.[0] ||
        "";
      const seededKeyword = normalizedQuery.keyword || "";
      const seededCountry = requestedCountry || detectedCountry;
      if (seededTitle) {
        const initialSearch = await executeJobSearch(
          {
            desiredTitle: seededTitle,
            keyword: seededKeyword,
            country: seededCountry
          },
          resume
        );
        initialResults = initialSearch.results.slice(0, 12);
      }

      const countrySampleSearch = await executeJobSearch(
        {
          desiredTitle: "",
          country: seededCountry
        },
        null
      );

      countrySampleJobs = countrySampleSearch.results
        .filter((job) => job.sourceType === "live" && job.source !== "Almiworld Employers")
        .slice(0, 4);

      if (initialResults.length === 0) {
        initialResults = countrySampleJobs.slice(0, 12);
      }
    } catch (error) {
      log("warn", "Dashboard initial job preload failed", {
        userId: user.id,
        country: detectedCountry,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  } catch (error) {
    log("error", "Dashboard data fallback activated", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }

  return (
    <DashboardShell
      user={user}
      resume={resume}
      usage={usage}
      employerInventory={employerInventory}
      countryHighlights={countryHighlights}
      trustedCountrySources={trustedCountrySources}
      countrySampleJobs={countrySampleJobs}
      countryRoleSuggestions={countryRoleSuggestions}
      initialFormState={initialFormState}
      initialResults={initialResults}
      initialSavedJobs={savedJobs}
      initialSavedSearches={savedSearches.map((search) => ({
        id: search.id,
        name: search.name,
        alertsEnabled: search.alertsEnabled,
        alertFrequency: search.alertFrequency,
        lastAlertedAt: search.lastAlertedAt?.toISOString() ?? null
      }))}
      initialHistory={history.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        resultsCount: Array.isArray(entry.latestResults) ? entry.latestResults.length : 0,
        desiredTitle: entry.desiredTitle,
        keyword: entry.keyword ?? "",
        country: entry.country,
        snapshot: {
          desiredTitle: entry.desiredTitle,
          keyword: entry.keyword ?? null,
          company: entry.company ?? null,
          country: entry.country,
          state: entry.state ?? null,
          city: entry.city ?? null,
          remoteMode: entry.remoteMode ?? null,
          employmentType: entry.employmentType ?? null,
          postedWithinDays: entry.postedWithinDays ?? null,
          salaryMin: entry.salaryMin ?? null,
          salaryMax: entry.salaryMax ?? null
        }
      }))}
    />
  );
}
