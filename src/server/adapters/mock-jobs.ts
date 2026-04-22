import { subDays } from "date-fns";
import { isWorldwideFilter } from "@/lib/location";
import type { JobSearchInput, NormalizedJob } from "@/types";
import type { JobSourceAdapter } from "@/server/adapters/types";

const mockJobs: NormalizedJob[] = [
  {
    externalJobId: "atlas-1",
    source: "MockGreenhouse",
    sourceType: "mock",
    title: "Senior Product Designer",
    company: "Atlas Commerce",
    location: "Austin, Texas, United States",
    salary: "$130,000 - $155,000",
    salaryMin: 130000,
    salaryMax: 155000,
    jobType: "FULL_TIME",
    remoteStatus: "HYBRID",
    descriptionSnippet:
      "Lead design systems, Figma workflows, user research, experimentation, and close partnership with product managers.",
    applyUrl: "https://example.com/jobs/atlas-1",
    postedDate: subDays(new Date(), 1).toISOString(),
    keywords: ["product design", "figma", "design systems", "user research", "experimentation"]
  },
  {
    externalJobId: "northstar-2",
    source: "MockLever",
    sourceType: "mock",
    title: "Frontend Engineer",
    company: "Northstar Health",
    location: "Remote, United States",
    salary: "$120,000 - $145,000",
    salaryMin: 120000,
    salaryMax: 145000,
    jobType: "FULL_TIME",
    remoteStatus: "REMOTE",
    descriptionSnippet:
      "Build Next.js dashboards, collaborate with design, own TypeScript and Prisma features, and improve product performance.",
    applyUrl: "https://example.com/jobs/northstar-2",
    postedDate: subDays(new Date(), 2).toISOString(),
    keywords: ["next.js", "typescript", "prisma", "dashboards", "performance"]
  },
  {
    externalJobId: "harbor-3",
    source: "MockWorkable",
    sourceType: "mock",
    title: "Product Engineer",
    company: "Harbor Metrics",
    location: "New York, New York, United States",
    salary: "$110,000 - $140,000",
    salaryMin: 110000,
    salaryMax: 140000,
    jobType: "FULL_TIME",
    remoteStatus: "ONSITE",
    descriptionSnippet:
      "Blend product thinking, SQL analytics, frontend delivery, and stakeholder collaboration to ship internal tools.",
    applyUrl: "https://example.com/jobs/harbor-3",
    postedDate: subDays(new Date(), 4).toISOString(),
    keywords: ["product thinking", "sql", "frontend", "analytics", "stakeholder management"]
  },
  {
    externalJobId: "lumen-4",
    source: "MockGreenhouse",
    sourceType: "mock",
    title: "UX Designer",
    company: "Lumen Finance",
    location: "London, England, United Kingdom",
    salary: "$95,000 - $120,000",
    salaryMin: 95000,
    salaryMax: 120000,
    jobType: "CONTRACT",
    remoteStatus: "HYBRID",
    descriptionSnippet:
      "Own user interviews, wireframes, accessibility reviews, and polished design delivery across a small SaaS team.",
    applyUrl: "https://example.com/jobs/lumen-4",
    postedDate: subDays(new Date(), 3).toISOString(),
    keywords: ["ux", "wireframes", "accessibility", "user research", "saas"]
  }
];

function includesCaseInsensitive(left: string, right: string) {
  return left.toLowerCase().includes(right.toLowerCase());
}

export class MockJobAdapter implements JobSourceAdapter {
  sourceType = "mock" as const;

  constructor(public source: string) {}

  isEnabled() {
    return true;
  }

  async searchJobs(input: JobSearchInput): Promise<NormalizedJob[]> {
    return mockJobs.filter((job) => {
      if (job.source !== this.source) {
        return false;
      }

      const titleMatch = includesCaseInsensitive(job.title, input.desiredTitle);
      const keywordMatch = input.keyword
        ? includesCaseInsensitive(job.descriptionSnippet, input.keyword) ||
          job.keywords.some((keyword) => includesCaseInsensitive(keyword, input.keyword!))
        : true;
      const companyMatch = input.company ? includesCaseInsensitive(job.company, input.company) : true;
      const countryMatch = isWorldwideFilter(input.country) ? true : includesCaseInsensitive(job.location, input.country ?? "");
      const stateMatch = input.state ? includesCaseInsensitive(job.location, input.state) : true;
      const cityMatch = input.city ? includesCaseInsensitive(job.location, input.city) : true;
      const remoteMatch = input.remoteMode ? job.remoteStatus === input.remoteMode : true;
      const employmentMatch = input.employmentType ? job.jobType === input.employmentType : true;
      const salaryMatch = input.salaryMin ? (job.salaryMax ?? 0) >= input.salaryMin : true;
      const postedMatch = input.postedWithinDays
        ? Boolean(job.postedDate) &&
          Date.now() - new Date(job.postedDate!).getTime() <= input.postedWithinDays * 24 * 60 * 60 * 1000
        : true;

      return (
        titleMatch &&
        keywordMatch &&
        companyMatch &&
        countryMatch &&
        stateMatch &&
        cityMatch &&
        remoteMatch &&
        employmentMatch &&
        salaryMatch &&
        postedMatch
      );
    });
  }
}

export const mockAdapters = [
  new MockJobAdapter("MockGreenhouse"),
  new MockJobAdapter("MockLever"),
  new MockJobAdapter("MockWorkable")
];
