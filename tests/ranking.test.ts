import { rankJobs } from "@/server/services/ranking";
import type { JobSearchInput, ParsedResume } from "@/types";

describe("rankJobs", () => {
  it("prioritizes jobs that fit title, skills, and remote preference", () => {
    const search: JobSearchInput = {
      desiredTitle: "Frontend Engineer",
      country: "United States",
      remoteMode: "REMOTE"
    };

    const resume: ParsedResume = {
      name: "Jordan Rivera",
      email: "jordan@example.com",
      phone: "555",
      skills: ["TypeScript", "Next.js", "Prisma"],
      experienceKeywords: ["dashboards", "performance"],
      educationKeywords: ["Computer Science"],
      preferredRoles: ["Frontend Engineer"],
      rawText: "resume"
    };

    const ranked = rankJobs(
      [
        {
          externalJobId: "best",
          source: "mock",
          title: "Frontend Engineer",
          company: "Northstar",
          location: "Remote, United States",
          salaryMin: 100000,
          salaryMax: 120000,
          jobType: "FULL_TIME",
          remoteStatus: "REMOTE",
          descriptionSnippet: "Build performance-focused dashboards in TypeScript and Next.js.",
          applyUrl: "https://example.com",
          keywords: ["typescript", "next.js", "performance"]
        },
        {
          externalJobId: "weaker",
          source: "mock",
          title: "Product Designer",
          company: "Atlas",
          location: "Austin, Texas, United States",
          salaryMin: 100000,
          salaryMax: 120000,
          jobType: "FULL_TIME",
          remoteStatus: "HYBRID",
          descriptionSnippet: "Lead user research and Figma delivery.",
          applyUrl: "https://example.com",
          keywords: ["figma", "user research"]
        }
      ],
      search,
      resume
    );

    expect(ranked[0].externalJobId).toBe("best");
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
    expect(ranked[0].matchReasons).toEqual(
      expect.arrayContaining([
        "Strong title match",
        expect.stringContaining("Skills match"),
        "Location preference matched"
      ])
    );
  });

  it("rewards company preference and fresher postings when scores are otherwise close", () => {
    const search: JobSearchInput = {
      desiredTitle: "Product Engineer",
      keyword: "TypeScript",
      company: "Northstar",
      country: "Worldwide",
      postedWithinDays: 7
    };

    const ranked = rankJobs(
      [
        {
          externalJobId: "fresh-preferred",
          source: "RemoteOK",
          title: "Product Engineer",
          company: "Northstar Labs",
          location: "Remote",
          remoteStatus: "REMOTE",
          descriptionSnippet: "Build product surfaces with TypeScript and experimentation tooling.",
          applyUrl: "https://example.com/a",
          postedDate: new Date().toISOString(),
          keywords: ["typescript", "experimentation", "product"]
        },
        {
          externalJobId: "older-other",
          source: "RemoteOK",
          title: "Product Engineer",
          company: "Atlas",
          location: "Remote",
          remoteStatus: "REMOTE",
          descriptionSnippet: "Build product surfaces with TypeScript and experimentation tooling.",
          applyUrl: "https://example.com/b",
          postedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          keywords: ["typescript", "experimentation", "product"]
        }
      ],
      search,
      null
    );

    expect(ranked[0].externalJobId).toBe("fresh-preferred");
    expect(ranked[0].matchReasons.join(" ")).toContain("Company preference matched");
    expect(ranked[0].matchReasons.join(" ")).toContain("Posted within your timeframe");
  });

  it("includes readable explanation reasons for skills, location, remote preference, and resume keywords", () => {
    const search: JobSearchInput = {
      desiredTitle: "Data Analyst",
      keyword: "SQL",
      country: "United States",
      remoteMode: "REMOTE"
    };

    const resume: ParsedResume = {
      name: "Morgan",
      email: "morgan@example.com",
      phone: "555",
      skills: ["SQL", "Python", "Tableau"],
      experienceKeywords: ["analytics", "experimentation"],
      educationKeywords: ["Statistics"],
      preferredRoles: ["Data Analyst"],
      rawText: "resume"
    };

    const ranked = rankJobs(
      [
        {
          externalJobId: "analyst",
          source: "Adzuna",
          title: "Data Analyst",
          company: "Insight Labs",
          location: "Remote, United States",
          remoteStatus: "REMOTE",
          descriptionSnippet: "Own analytics reporting and SQL-driven experimentation insights.",
          applyUrl: "https://example.com",
          keywords: ["sql", "python", "analytics", "tableau"]
        }
      ],
      search,
      resume
    );

    expect(ranked[0].matchReasons).toEqual(
      expect.arrayContaining([
        "Strong title match",
        expect.stringContaining("Keyword match"),
        expect.stringContaining("Skills match"),
        "Location preference matched",
        expect.stringContaining("Resume keywords aligned")
      ])
    );
  });

  it("adds a seniority aligned reason when role level matches the search or preferred role", () => {
    const search: JobSearchInput = {
      desiredTitle: "Senior Product Manager",
      country: "Worldwide"
    };

    const resume: ParsedResume = {
      name: "Avery",
      email: "avery@example.com",
      phone: "555",
      skills: ["Roadmapping", "Analytics"],
      experienceKeywords: ["stakeholder management"],
      educationKeywords: ["Business"],
      preferredRoles: ["Senior Product Manager"],
      rawText: "resume"
    };

    const ranked = rankJobs(
      [
        {
          externalJobId: "senior-role",
          source: "RemoteOK",
          title: "Senior Product Manager",
          company: "Northstar",
          location: "Remote",
          remoteStatus: "REMOTE",
          descriptionSnippet: "Lead roadmap planning and stakeholder management across product lines.",
          applyUrl: "https://example.com/senior-role",
          keywords: ["roadmapping", "analytics", "stakeholder management"]
        }
      ],
      search,
      resume
    );

    expect(ranked[0].matchReasons).toEqual(expect.arrayContaining(["Seniority aligned"]));
  });
});
