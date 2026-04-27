import { afterEach, describe, expect, it, vi } from "vitest";
import type { JobSearchInput } from "@/types";

const originalEnv = {
  REMOTE_OK_ENABLED: process.env.REMOTE_OK_ENABLED,
  REMOTIVE_ENABLED: process.env.REMOTIVE_ENABLED,
  ADZUNA_ENABLED: process.env.ADZUNA_ENABLED,
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
  MOCK_FALLBACK_ENABLED: process.env.MOCK_FALLBACK_ENABLED
};

describe("provider fallback", () => {
  afterEach(() => {
    process.env.REMOTE_OK_ENABLED = originalEnv.REMOTE_OK_ENABLED;
    process.env.REMOTIVE_ENABLED = originalEnv.REMOTIVE_ENABLED;
    process.env.ADZUNA_ENABLED = originalEnv.ADZUNA_ENABLED;
    process.env.ADZUNA_APP_ID = originalEnv.ADZUNA_APP_ID;
    process.env.ADZUNA_APP_KEY = originalEnv.ADZUNA_APP_KEY;
    process.env.MOCK_FALLBACK_ENABLED = originalEnv.MOCK_FALLBACK_ENABLED;
    vi.restoreAllMocks();
  });

  it("falls back to mock providers when live providers return no usable jobs", async () => {
    process.env.REMOTE_OK_ENABLED = "true";
    process.env.REMOTIVE_ENABLED = "true";
    process.env.ADZUNA_ENABLED = "false";

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const { fetchFromAdapters } = await import("@/server/adapters/provider-registry");
    const input: JobSearchInput = {
      desiredTitle: "Frontend Engineer",
      country: "Worldwide"
    };

    const result = await fetchFromAdapters(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.jobs.every((job) => job.sourceType === "mock")).toBe(true);
    expect(result.providerStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "RemoteOK",
          sourceType: "live",
          status: "no_matches"
        }),
        expect.objectContaining({
          source: "Remotive",
          sourceType: "live",
          status: "no_matches"
        }),
        expect.objectContaining({
          sourceType: "mock",
          status: "fallback"
        })
      ])
    );
  });

  it("returns no mock jobs when fallback is disabled", async () => {
    process.env.REMOTE_OK_ENABLED = "true";
    process.env.REMOTIVE_ENABLED = "true";
    process.env.ADZUNA_ENABLED = "false";
    process.env.MOCK_FALLBACK_ENABLED = "false";

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobs: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const { fetchFromAdapters } = await import("@/server/adapters/provider-registry");
    const input: JobSearchInput = {
      desiredTitle: "Frontend Engineer",
      country: "Worldwide"
    };

    const result = await fetchFromAdapters(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(false);
    expect(result.jobs).toEqual([]);
    expect(result.providerStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "RemoteOK",
          sourceType: "live",
          status: "no_matches"
        }),
        expect.objectContaining({
          sourceType: "mock",
          status: "disabled",
          message: expect.stringContaining("turned off")
        })
      ])
    );
  });

  it("filters RemoteOK jobs by strict location filters", async () => {
    process.env.REMOTE_OK_ENABLED = "true";
    process.env.REMOTIVE_ENABLED = "false";
    process.env.ADZUNA_ENABLED = "false";
    process.env.MOCK_FALLBACK_ENABLED = "false";

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 1,
            position: "Nurse",
            company: "Evergreen Nephrology",
            location: "Reykjavik, Iceland",
            url: "https://remoteok.com/1",
            description: "Clinical support role in Reykjavik, Iceland",
            tags: ["nurse"]
          },
          {
            id: 2,
            position: "Nurse",
            company: "US Remote Health",
            location: "Remote (US only)",
            url: "https://remoteok.com/2",
            description: "Remote nursing role for candidates in the United States only",
            tags: ["nurse"]
          }
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    const { fetchFromAdapters } = await import("@/server/adapters/provider-registry");
    const input: JobSearchInput = {
      desiredTitle: "nurs",
      country: "Iceland",
      city: "Reykjavik"
    };

    const result = await fetchFromAdapters(input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toEqual(
      expect.objectContaining({
        company: "Evergreen Nephrology",
        location: "Reykjavik, Iceland"
      })
    );
  });
});
