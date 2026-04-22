import type { ParsedResume } from "@/types";

type SavedSearchAlertState = {
  alertsEnabled: boolean;
  alertFrequency: string;
  lastAlertedAt: string | null;
};

export type AlertOverview = {
  activeCount: number;
  pausedCount: number;
  waitingCount: number;
  nextRunLabel: string;
  summary: string;
};

export type SetupChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
};

export type SetupChecklist = {
  completed: number;
  total: number;
  progress: number;
  nextStep: string;
  items: SetupChecklistItem[];
};

function formatRelativeRunTime(nextRunAt: Date) {
  const diffMs = nextRunAt.getTime() - Date.now();

  if (diffMs <= 0) {
    return "ready on the next alert cycle";
  }

  const diffHours = Math.round(diffMs / (60 * 60 * 1000));

  if (diffHours < 24) {
    return `due in about ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `due in about ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function buildAlertOverview(savedSearches: SavedSearchAlertState[], alertsEnabledOnPlan: boolean): AlertOverview {
  if (!savedSearches.length) {
    return {
      activeCount: 0,
      pausedCount: 0,
      waitingCount: 0,
      nextRunLabel: alertsEnabledOnPlan ? "Create your first saved search to start alert coverage." : "Save a search now and unlock alerts with Pro.",
      summary: alertsEnabledOnPlan
        ? "No alerts are active yet."
        : "Saved searches are available now. Alerts unlock on Pro."
    };
  }

  const active = savedSearches.filter((search) => search.alertsEnabled);
  const paused = savedSearches.filter((search) => !search.alertsEnabled);
  const waiting = active.filter((search) => !search.lastAlertedAt);
  const datedActive = active.filter((search) => search.lastAlertedAt);

  let nextRunLabel = alertsEnabledOnPlan ? "Enable alerts on a saved search to begin daily or weekly checks." : "Upgrade to Pro to turn saved searches into alerts.";

  if (datedActive.length) {
    const nextRunAt = datedActive
      .map((search) => {
        const next = new Date(search.lastAlertedAt!);
        next.setDate(next.getDate() + (search.alertFrequency === "WEEKLY" ? 7 : 1));
        return next;
      })
      .sort((left, right) => left.getTime() - right.getTime())[0];

    nextRunLabel = `Next scheduled alert is ${formatRelativeRunTime(nextRunAt)}.`;
  } else if (waiting.length) {
    nextRunLabel = "Some saved searches are waiting for their first alert run.";
  }

  const summary =
    active.length > 0
      ? `${active.length} alert${active.length === 1 ? "" : "s"} active, ${paused.length} paused.`
      : alertsEnabledOnPlan
        ? "Saved searches are on file, but alerts are currently paused."
        : "Saved searches are on file, but alerts are only available on Pro.";

  return {
    activeCount: active.length,
    pausedCount: paused.length,
    waitingCount: waiting.length,
    nextRunLabel,
    summary
  };
}

export function buildSetupChecklist({
  resume,
  searchesUsedToday,
  savedSearchCount,
  hasResults,
  canUseResumeInsights
}: {
  resume: ParsedResume | null;
  searchesUsedToday: number;
  savedSearchCount: number;
  hasResults: boolean;
  canUseResumeInsights: boolean;
}): SetupChecklist {
  const items: SetupChecklistItem[] = [
    {
      id: "resume",
      label: "Upload a resume",
      description: "Unlock stronger matching and resume-based ranking.",
      done: Boolean(resume)
    },
    {
      id: "search",
      label: "Run a targeted search",
      description: "Search once with your preferred title to generate ranked matches.",
      done: searchesUsedToday > 0
    },
    {
      id: "saved-search",
      label: "Save a search",
      description: "Keep one useful search ready for repeat checking and alerts.",
      done: savedSearchCount > 0
    },
    {
      id: "resume-insights",
      label: "Review resume improvements",
      description: canUseResumeInsights
        ? "Use missing keywords and wording guidance before you apply."
        : "Upgrade to Pro later if you want full resume improvement guidance.",
      done: !canUseResumeInsights || (Boolean(resume) && hasResults)
    }
  ];

  const completed = items.filter((item) => item.done).length;
  const total = items.length;
  const nextUndone = items.find((item) => !item.done);

  return {
    completed,
    total,
    progress: Math.round((completed / total) * 100),
    nextStep: nextUndone?.description ?? "Your core job-search workflow is in place. Keep refining searches and saving the best ones.",
    items
  };
}
