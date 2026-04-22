import { describe, expect, it } from "vitest";
import { buildAlertOverview, buildSetupChecklist } from "@/lib/dashboard-insights";

describe("buildAlertOverview", () => {
  it("summarizes active, paused, and waiting alerts from saved searches", () => {
    const overview = buildAlertOverview(
      [
        {
          alertsEnabled: true,
          alertFrequency: "DAILY",
          lastAlertedAt: null
        },
        {
          alertsEnabled: true,
          alertFrequency: "WEEKLY",
          lastAlertedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          alertsEnabled: false,
          alertFrequency: "DAILY",
          lastAlertedAt: null
        }
      ],
      true
    );

    expect(overview.activeCount).toBe(2);
    expect(overview.pausedCount).toBe(1);
    expect(overview.waitingCount).toBe(1);
    expect(overview.summary).toContain("2 alerts active");
  });
});

describe("buildSetupChecklist", () => {
  it("reports setup progress and next step from real dashboard state", () => {
    const checklist = buildSetupChecklist({
      resume: null,
      searchesUsedToday: 1,
      savedSearchCount: 0,
      hasResults: true,
      canUseResumeInsights: true
    });

    expect(checklist.completed).toBe(1);
    expect(checklist.total).toBe(4);
    expect(checklist.progress).toBe(25);
    expect(checklist.items.find((item) => item.id === "resume")?.done).toBe(false);
    expect(checklist.nextStep).toContain("resume");
  });
});
