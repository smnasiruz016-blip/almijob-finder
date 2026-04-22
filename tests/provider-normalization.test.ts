import { describe, expect, it } from "vitest";
import { normalizeAdzunaJob, normalizeRemoteOkJob, normalizeRemotiveJob } from "@/server/adapters/provider-registry";
import type { JobSearchInput } from "@/types";

describe("provider normalization", () => {
  it("normalizes RemoteOK jobs into the internal format", () => {
    const job = normalizeRemoteOkJob({
      id: 42,
      position: "Frontend Engineer",
      company: "Remote Co",
      location: "Remote",
      url: "https://example.com/job",
      salary_min: 100000,
      salary_max: 130000,
      description: "<p>Build React interfaces</p>",
      tags: ["react", "typescript"],
      date: "2026-04-21T00:00:00.000Z"
    });

    expect(job).toEqual(
      expect.objectContaining({
        externalJobId: "42",
        source: "RemoteOK",
        sourceType: "live",
        title: "Frontend Engineer",
        company: "Remote Co",
        remoteStatus: "REMOTE",
        salaryMin: 100000,
        salaryMax: 130000
      })
    );
    expect(job.descriptionSnippet).toContain("Build React interfaces");
    expect(job.keywords).toContain("react");
  });

  it("normalizes Adzuna jobs into the internal format", () => {
    const input: JobSearchInput = {
      desiredTitle: "Data Analyst",
      keyword: "SQL",
      country: "United States",
      remoteMode: "REMOTE"
    };

    const job = normalizeAdzunaJob(
      {
        id: "adzuna-1",
        title: "Data Analyst",
        company: { display_name: "Insight Labs" },
        location: { display_name: "Austin, Texas, United States" },
        redirect_url: "https://example.com/adzuna",
        salary_min: 70000,
        salary_max: 95000,
        description: "Analyze SQL and reporting workflows",
        created: "2026-04-21T00:00:00.000Z",
        contract_time: "full_time"
      },
      input
    );

    expect(job).toEqual(
      expect.objectContaining({
        externalJobId: "adzuna-1",
        source: "Adzuna",
        sourceType: "live",
        title: "Data Analyst",
        company: "Insight Labs",
        location: "Austin, Texas, United States",
        remoteStatus: "REMOTE",
        jobType: "FULL_TIME"
      })
    );
    expect(job.keywords.join(" ")).toContain("SQL");
  });

  it("normalizes Remotive jobs into the internal format with attribution metadata", () => {
    const job = normalizeRemotiveJob({
      id: 77,
      title: "Senior Backend Engineer",
      company_name: "Remotive Labs",
      candidate_required_location: "Worldwide",
      url: "https://remotive.com/remote-jobs/software-dev/senior-backend-engineer-77",
      publication_date: "2026-04-21T00:00:00.000Z",
      job_type: "full_time",
      salary: "$120k - $150k",
      description: "<p>Build APIs and distributed systems</p>",
      tags: ["Python", "PostgreSQL"]
    });

    expect(job).toEqual(
      expect.objectContaining({
        externalJobId: "77",
        source: "Remotive",
        sourceType: "live",
        title: "Senior Backend Engineer",
        company: "Remotive Labs",
        location: "Worldwide",
        remoteStatus: "REMOTE",
        salary: "$120k - $150k",
        jobType: "FULL_TIME",
        providerMetadata: {
          attributionLabel: "Source: Remotive",
          attributionUrl: "https://remotive.com/remote-jobs/software-dev/senior-backend-engineer-77"
        }
      })
    );
    expect(job.descriptionSnippet).toContain("Build APIs and distributed systems");
    expect(job.keywords).toContain("Python");
  });
});
