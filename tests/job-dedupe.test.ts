import { describe, expect, it } from "vitest";
import { dedupeJobs } from "@/server/services/job-search";
import type { NormalizedJob } from "@/types";

function createJob(overrides: Partial<NormalizedJob>): NormalizedJob {
  return {
    externalJobId: "job-1",
    source: "MockSource",
    sourceType: "mock",
    title: "Frontend Engineer",
    company: "Northstar Health",
    location: "Remote, United States",
    descriptionSnippet: "Build product experiences with React and TypeScript.",
    applyUrl: "https://example.com/jobs/frontend-engineer",
    keywords: ["React", "TypeScript"],
    ...overrides
  };
}

describe("dedupeJobs", () => {
  it("collapses duplicates when title, company, and location normalize to the same listing", () => {
    const deduped = dedupeJobs([
      createJob({
        externalJobId: "mock-1",
        source: "MockLever",
        title: "Frontend Engineer",
        company: "Northstar Health",
        location: "Remote, United States"
      }),
      createJob({
        externalJobId: "remote-ok-22",
        source: "RemoteOK",
        sourceType: "live",
        title: "frontend engineer",
        company: "Northstar Health ",
        location: "Remote United States",
        applyUrl: "https://jobs.northstar.com/frontend-engineer?ref=remoteok",
        postedDate: "2026-04-21T00:00:00.000Z",
        salaryMin: 120000
      })
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe("RemoteOK");
  });

  it("collapses duplicates that share the same canonical apply URL across providers", () => {
    const deduped = dedupeJobs([
      createJob({
        externalJobId: "remote-ok-1",
        source: "RemoteOK",
        sourceType: "live",
        applyUrl: "https://jobs.example.com/roles/123?utm_source=remoteok"
      }),
      createJob({
        externalJobId: "adzuna-9",
        source: "Adzuna",
        sourceType: "live",
        applyUrl: "https://jobs.example.com/roles/123"
      })
    ]);

    expect(deduped).toHaveLength(1);
  });

  it("does not merge similar jobs when the normalized location is different", () => {
    const deduped = dedupeJobs([
      createJob({
        externalJobId: "job-remote",
        location: "Remote, United States"
      }),
      createJob({
        externalJobId: "job-london",
        location: "London, United Kingdom",
        applyUrl: "https://example.com/jobs/frontend-engineer-london"
      })
    ]);

    expect(deduped).toHaveLength(2);
  });
});
