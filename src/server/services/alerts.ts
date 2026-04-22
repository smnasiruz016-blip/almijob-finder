import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { canUseAlerts } from "@/lib/plans";
import { getEmailProvider } from "@/server/services/email";
import { executeJobSearch } from "@/server/services/job-search";
import { getLatestParsedResume } from "@/server/services/resume-service";
import type { JobSearchInput } from "@/types";

function getAlertIntervalMs(frequency: "DAILY" | "WEEKLY") {
  return frequency === "WEEKLY" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

function isAlertDue(lastAlertedAt: Date | null, frequency: "DAILY" | "WEEKLY") {
  if (!lastAlertedAt) {
    return true;
  }

  return Date.now() - lastAlertedAt.getTime() >= getAlertIntervalMs(frequency);
}

export async function processDailyAlerts() {
  const searches = await prisma.savedSearch.findMany({
    where: {
      alertsEnabled: true
    },
    include: {
      user: true
    }
  });

  const email = getEmailProvider();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const search of searches) {
    try {
      if (!canUseAlerts(search.user.subscriptionTier)) {
        log("warn", "Saved search alert skipped because plan does not allow alerts", {
          savedSearchId: search.id,
          userId: search.userId,
          subscriptionTier: search.user.subscriptionTier
        });
        skipped += 1;
        continue;
      }

      if (!isAlertDue(search.lastAlertedAt, search.alertFrequency)) {
        log("info", "Saved search alert skipped because it is not due yet", {
          savedSearchId: search.id,
          userId: search.userId,
          alertFrequency: search.alertFrequency,
          lastAlertedAt: search.lastAlertedAt?.toISOString()
        });
        skipped += 1;
        continue;
      }

      const resume = await getLatestParsedResume(search.userId);
      const { results } = await executeJobSearch(search.querySnapshot as JobSearchInput, resume);
      const topMatches = results.slice(0, 3);
      const resultsMarkup = topMatches.length
        ? topMatches.map((job) => `${job.title} at ${job.company} (${job.matchScore}/100)`).join("<br/>")
        : "No fresh matches surfaced during this alert run. Keep your saved search active and we will check again.";

      await email.sendEmail(
        search.user.email,
        `AlmiJob Finder alert: ${search.name}`,
        `<h1>${search.name}</h1><p>${resultsMarkup}</p><p>Delivery mode: ${process.env.ALERT_DELIVERY_MODE ?? "stub/log only"}</p>`
      );

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastAlertedAt: new Date() }
      });

      log("info", "Saved search alert processed", {
        savedSearchId: search.id,
        userId: search.userId,
        matchesSent: topMatches.length,
        alertFrequency: search.alertFrequency
      });

      processed += 1;
    } catch (error) {
      log("error", "Saved search alert failed", {
        savedSearchId: search.id,
        userId: search.userId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      failed += 1;
    }
  }

  return {
    processed,
    skipped,
    failed
  };
}
