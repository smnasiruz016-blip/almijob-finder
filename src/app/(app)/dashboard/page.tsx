import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getLatestParsedResume } from "@/server/services/resume-service";
import { getSearchUsageForUser } from "@/server/services/usage";

export default async function DashboardPage() {
  const user = await requireUser();
  const [resume, savedJobs, savedSearches, history, usage] = await Promise.all([
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
    getSearchUsageForUser(user.id)
  ]);

  return (
    <DashboardShell
      user={user}
      resume={resume}
      usage={usage}
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
