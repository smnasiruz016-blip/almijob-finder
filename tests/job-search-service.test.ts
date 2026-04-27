import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobSearchInput } from "@/types";

const mocks = vi.hoisted(() => ({
  fetchFromAdapters: vi.fn(),
  searchEmployerVacancies: vi.fn(),
  rankJobs: vi.fn(),
  prisma: {
    jobSearch: {
      create: vi.fn()
    },
    searchHistory: {
      create: vi.fn()
    },
    jobResultCache: {
      upsert: vi.fn()
    }
  }
}));

vi.mock("@/server/adapters/provider-registry", () => ({
  fetchFromAdapters: mocks.fetchFromAdapters
}));

vi.mock("@/server/services/company-vacancies", () => ({
  searchEmployerVacancies: mocks.searchEmployerVacancies
}));

vi.mock("@/server/services/ranking", () => ({
  rankJobs: mocks.rankJobs
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("runJobSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchEmployerVacancies.mockResolvedValue([]);
  });

  it("still returns results when search persistence fails", async () => {
    const input: JobSearchInput = {
      desiredTitle: "Sales",
      country: "Pakistan",
      state: "Punjab",
      city: "Lahore"
    };

    const rankedResults = [
      {
        externalJobId: "job_1",
        source: "Remotive",
        sourceType: "live" as const,
        title: "Sales Manager",
        company: "Example Co",
        location: "Lahore, Punjab, Pakistan",
        descriptionSnippet: "Lead regional sales operations.",
        applyUrl: "https://example.com/jobs/1",
        keywords: ["sales", "lahore"],
        matchScore: 88,
        matchReasons: ["Strong title match"],
        missingKeywords: []
      }
    ];

    mocks.fetchFromAdapters.mockResolvedValue({
      jobs: rankedResults,
      usedFallback: false,
      sources: ["Remotive"],
      providerStatuses: [
        {
          source: "Remotive",
          sourceType: "live",
          status: "success",
          results: 1
        }
      ]
    });
    mocks.rankJobs.mockReturnValue(rankedResults);
    mocks.prisma.jobSearch.create.mockRejectedValue(new Error("DB temporarily unavailable"));

    const { runJobSearch } = await import("@/server/services/job-search");
    const result = await runJobSearch("user_1", input, null);

    expect(result.searchId).toBeNull();
    expect(result.results).toEqual(rankedResults);
    expect(result.meta).toEqual(
      expect.objectContaining({
        usedFallback: false,
        sources: ["Remotive"]
      })
    );
    expect(mocks.prisma.searchHistory.create).not.toHaveBeenCalled();
  });

  it("merges direct employer vacancies into ranked search results", async () => {
    const input: JobSearchInput = {
      desiredTitle: "Sales Manager",
      country: "Pakistan",
      state: "Punjab",
      city: "Lahore"
    };

    const providerResults = [
      {
        externalJobId: "provider_job_1",
        source: "Remotive",
        sourceType: "live" as const,
        title: "Regional Sales Manager",
        company: "Example Co",
        location: "Lahore, Punjab, Pakistan",
        descriptionSnippet: "Lead regional sales operations.",
        applyUrl: "https://example.com/jobs/1",
        keywords: ["sales", "lahore"]
      }
    ];

    const employerResults = [
      {
        externalJobId: "vacancy_1",
        source: "Almiworld Employers",
        sourceType: "live" as const,
        title: "Sales Manager",
        company: "Local Pharma",
        location: "Lahore, Punjab, Pakistan",
        descriptionSnippet: "Drive direct employer sales growth in Lahore.",
        applyUrl: "https://localpharma.example/careers/sales-manager",
        keywords: ["sales", "manager", "lahore"],
        providerMetadata: {
          attributionLabel: "Source: Almiworld Employers"
        }
      }
    ];

    const rankedResults = [
      {
        ...employerResults[0],
        matchScore: 91,
        matchReasons: ["Strong title match", "Direct employer vacancy"],
        missingKeywords: []
      },
      {
        ...providerResults[0],
        matchScore: 78,
        matchReasons: ["Good regional title match"],
        missingKeywords: []
      }
    ];

    mocks.fetchFromAdapters.mockResolvedValue({
      jobs: providerResults,
      usedFallback: false,
      sources: ["Remotive"],
      providerStatuses: [
        {
          source: "Remotive",
          sourceType: "live",
          status: "success",
          results: 1
        }
      ]
    });
    mocks.searchEmployerVacancies.mockResolvedValue(employerResults);
    mocks.rankJobs.mockReturnValue(rankedResults);
    mocks.prisma.jobSearch.create.mockResolvedValue({ id: "search_1" });
    mocks.prisma.searchHistory.create.mockResolvedValue({ id: "history_1" });
    mocks.prisma.jobResultCache.upsert.mockResolvedValue({});

    const { runJobSearch } = await import("@/server/services/job-search");
    const result = await runJobSearch("user_1", input, null);

    expect(mocks.searchEmployerVacancies).toHaveBeenCalledWith(input);
    expect(result.results).toEqual(rankedResults);
    expect(result.meta.sources).toContain("Almiworld Employers");
    expect(result.meta.providerStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "Almiworld Employers",
          sourceType: "live",
          status: "success",
          results: 1
        })
      ])
    );
  });
});
