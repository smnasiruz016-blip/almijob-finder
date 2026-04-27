import { describe, expect, it } from "vitest";
import { collectAdvertisedSkills, getRoleSuggestions, getSuggestedSkillOptions } from "@/lib/job-taxonomy";
import type { RankedJob } from "@/types";

function createJob(overrides: Partial<RankedJob>): RankedJob {
  return {
    externalJobId: "job-1",
    source: "RemoteOK",
    title: "Staff Nurse",
    company: "North Clinic",
    location: "Reykjavik, Iceland",
    descriptionSnippet: "Clinical nursing role",
    applyUrl: "https://example.com/apply",
    keywords: ["Patient care", "Clinical support", "Team", "Iceland"],
    matchScore: 72,
    matchReasons: ["Strong title match"],
    missingKeywords: [],
    ...overrides
  };
}

describe("job taxonomy helpers", () => {
  it("suggests role titles from aliases and shorthand", () => {
    expect(getRoleSuggestions("nurs")).toContain("Staff Nurse");
    expect(getRoleSuggestions("frontend")).toContain("Frontend Engineer");
  });

  it("collects advertised skills from live job keywords", () => {
    const jobs = [
      createJob({ keywords: ["Patient care", "Clinical support", "Medication administration"] }),
      createJob({ externalJobId: "job-2", keywords: ["Patient care", "Ward coordination", "Clinical support"] })
    ];

    expect(collectAdvertisedSkills(jobs)).toEqual(
      expect.arrayContaining(["Patient care", "Clinical support", "Medication administration", "Ward coordination"])
    );
  });

  it("combines role skills and advertised skills into a guided picker list", () => {
    const jobs = [
      createJob({ keywords: ["Patient care", "Triage", "Clinical support"] }),
      createJob({ externalJobId: "job-3", keywords: ["Electronic medical records", "Compassion", "Patient care"] })
    ];

    const options = getSuggestedSkillOptions("nurse", jobs);

    expect(options).toEqual(
      expect.arrayContaining(["Patient care", "Clinical support", "Medication administration", "Electronic medical records"])
    );
  });
});
