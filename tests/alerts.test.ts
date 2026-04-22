import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  savedSearch: {
    findMany: vi.fn(),
    update: vi.fn()
  }
};

const mocks = {
  sendEmail: vi.fn(),
  executeJobSearch: vi.fn(),
  getLatestParsedResume: vi.fn()
};

vi.mock("@/lib/prisma", () => ({
  prisma
}));

vi.mock("@/server/services/email", () => ({
  getEmailProvider: () => ({
    sendEmail: mocks.sendEmail
  })
}));

vi.mock("@/server/services/job-search", () => ({
  executeJobSearch: mocks.executeJobSearch
}));

vi.mock("@/server/services/resume-service", () => ({
  getLatestParsedResume: mocks.getLatestParsedResume
}));

describe("processDailyAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes only due alerts and skips weekly searches that are not due", async () => {
    prisma.savedSearch.findMany.mockResolvedValue([
      {
        id: "daily_due",
        userId: "user_pro",
        name: "Daily frontend",
        querySnapshot: { desiredTitle: "Frontend Engineer", country: "Worldwide" },
        alertsEnabled: true,
        alertFrequency: "DAILY",
        lastAlertedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        user: {
          id: "user_pro",
          email: "pro@example.com",
          subscriptionTier: "PRO"
        }
      },
      {
        id: "weekly_not_due",
        userId: "user_pro",
        name: "Weekly backend",
        querySnapshot: { desiredTitle: "Backend Engineer", country: "Worldwide" },
        alertsEnabled: true,
        alertFrequency: "WEEKLY",
        lastAlertedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        user: {
          id: "user_pro",
          email: "pro@example.com",
          subscriptionTier: "PRO"
        }
      }
    ]);

    mocks.getLatestParsedResume.mockResolvedValue(null);
    mocks.executeJobSearch.mockResolvedValue({
      results: [
        {
          externalJobId: "job_1",
          source: "Remotive",
          title: "Frontend Engineer",
          company: "Acme",
          location: "Worldwide",
          descriptionSnippet: "Build product UI",
          applyUrl: "https://example.com/jobs/1",
          keywords: [],
          matchScore: 88,
          matchReasons: ["Strong title match"],
          missingKeywords: []
        }
      ]
    });
    prisma.savedSearch.update.mockResolvedValue({});

    const { processDailyAlerts } = await import("@/server/services/alerts");
    const result = await processDailyAlerts();

    expect(result).toEqual({ processed: 1, skipped: 1, failed: 0 });
    expect(mocks.executeJobSearch).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.savedSearch.update).toHaveBeenCalledTimes(1);
    expect(prisma.savedSearch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "daily_due" }
      })
    );
  });

  it("skips alerts for users who do not have alert access on their plan", async () => {
    prisma.savedSearch.findMany.mockResolvedValue([
      {
        id: "free_saved_search",
        userId: "user_free",
        name: "Free plan saved search",
        querySnapshot: { desiredTitle: "Designer", country: "Worldwide" },
        alertsEnabled: true,
        alertFrequency: "DAILY",
        lastAlertedAt: null,
        user: {
          id: "user_free",
          email: "free@example.com",
          subscriptionTier: "FREE"
        }
      }
    ]);

    const { processDailyAlerts } = await import("@/server/services/alerts");
    const result = await processDailyAlerts();

    expect(result).toEqual({ processed: 0, skipped: 1, failed: 0 });
    expect(mocks.executeJobSearch).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(prisma.savedSearch.update).not.toHaveBeenCalled();
  });

  it("continues processing when one alert fails", async () => {
    prisma.savedSearch.findMany.mockResolvedValue([
      {
        id: "first_fails",
        userId: "user_pro",
        name: "First search",
        querySnapshot: { desiredTitle: "Frontend Engineer", country: "Worldwide" },
        alertsEnabled: true,
        alertFrequency: "DAILY",
        lastAlertedAt: null,
        user: {
          id: "user_pro",
          email: "pro@example.com",
          subscriptionTier: "PRO"
        }
      },
      {
        id: "second_succeeds",
        userId: "user_pro",
        name: "Second search",
        querySnapshot: { desiredTitle: "Backend Engineer", country: "Worldwide" },
        alertsEnabled: true,
        alertFrequency: "DAILY",
        lastAlertedAt: null,
        user: {
          id: "user_pro",
          email: "pro@example.com",
          subscriptionTier: "PRO"
        }
      }
    ]);

    mocks.getLatestParsedResume.mockResolvedValue(null);
    mocks.executeJobSearch
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce({
        results: [
          {
            externalJobId: "job_2",
            source: "Remotive",
            title: "Backend Engineer",
            company: "Acme",
            location: "Worldwide",
            descriptionSnippet: "Build APIs",
            applyUrl: "https://example.com/jobs/2",
            keywords: [],
            matchScore: 85,
            matchReasons: ["Strong title match"],
            missingKeywords: []
          }
        ]
      });
    prisma.savedSearch.update.mockResolvedValue({});

    const { processDailyAlerts } = await import("@/server/services/alerts");
    const result = await processDailyAlerts();

    expect(result).toEqual({ processed: 1, skipped: 0, failed: 1 });
    expect(mocks.executeJobSearch).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.savedSearch.update).toHaveBeenCalledTimes(1);
    expect(prisma.savedSearch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "second_succeeds" }
      })
    );
  });
});
