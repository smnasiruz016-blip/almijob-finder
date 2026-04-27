import type { JobSourceLink } from "@/types";

const GLOBAL_SOURCES: JobSourceLink[] = [
  {
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs/",
    category: "professional",
    note: "Good for professional roles and international employers.",
    region: "Worldwide",
    sourcePriority: 10,
    isTrusted: true
  },
  {
    name: "Jooble",
    url: "https://jooble.org/",
    category: "aggregator",
    note: "Broad worldwide search coverage across many countries.",
    region: "Worldwide",
    sourcePriority: 20,
    hasApi: true,
    isAggregator: true,
    isTrusted: true
  },
  {
    name: "Indeed",
    url: "https://www.indeed.com/",
    category: "aggregator",
    note: "Strong general job coverage and useful for broader searches.",
    region: "Worldwide",
    sourcePriority: 30,
    isAggregator: true,
    isTrusted: true
  }
];

const COUNTRY_SOURCE_DIRECTORY: Record<string, JobSourceLink[]> = {
  Pakistan: [
    { name: "Rozee.pk", url: "https://www.rozee.pk/", category: "local", note: "Popular for local private-sector hiring in Pakistan." },
    { name: "Mustakbil", url: "https://www.mustakbil.com/jobs/pakistan", category: "local", note: "Useful for operations, sales, and admin roles." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Best for multinational and white-collar roles." }
  ],
  Iceland: [
    { name: "Alfred", url: "https://www.alfred.is/", category: "local", note: "One of the best-known Iceland job portals." },
    { name: "Job.is", url: "https://www.job.is/", category: "local", note: "Useful for Iceland-based local roles." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for international employers hiring in Iceland." }
  ],
  Denmark: [
    { name: "Jobindex", url: "https://www.jobindex.dk/", category: "local", note: "Leading Danish job board with strong local coverage." },
    { name: "Ofir", url: "https://www.ofir.dk/", category: "local", note: "Helpful for local Danish vacancies." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for international and corporate roles." }
  ],
  "Saudi Arabia": [
    { name: "Bayt", url: "https://www.bayt.com/en/saudi-arabia/jobs/", category: "local", note: "Strong MENA coverage and useful for Saudi roles." },
    { name: "GulfTalent", url: "https://www.gulftalent.com/saudi-arabia/jobs", category: "local", note: "Good for mid-senior regional jobs." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for international companies hiring in Saudi Arabia." }
  ],
  "United Arab Emirates": [
    { name: "Bayt", url: "https://www.bayt.com/en/uae/jobs/", category: "local", note: "Strong UAE and MENA job coverage." },
    { name: "GulfTalent", url: "https://www.gulftalent.com/uae/jobs", category: "local", note: "Good for UAE private-sector and corporate jobs." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for international employers and startups." }
  ],
  Germany: [
    { name: "StepStone", url: "https://www.stepstone.de/", category: "local", note: "Large German job platform with strong local reach." },
    { name: "XING Jobs", url: "https://www.xing.com/jobs", category: "professional", note: "Useful for German-speaking professional hiring." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for global companies and English-language roles." }
  ],
  India: [
    { name: "Naukri", url: "https://www.naukri.com/", category: "local", note: "Very strong local India job inventory." },
    { name: "Foundit", url: "https://www.foundit.in/", category: "local", note: "Useful for Indian local and regional opportunities." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Good for startups and multinational companies." }
  ],
  "United Kingdom": [
    { name: "Reed", url: "https://www.reed.co.uk/jobs", category: "local", note: "Popular UK board for broad local hiring." },
    { name: "Totaljobs", url: "https://www.totaljobs.com/", category: "local", note: "Useful for UK-wide search coverage." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Helpful for corporate and international roles." }
  ],
  "United States": [
    { name: "Indeed", url: "https://www.indeed.com/", category: "aggregator", note: "Strong overall US job coverage." },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", category: "professional", note: "Useful for white-collar and corporate roles." },
    { name: "ZipRecruiter", url: "https://www.ziprecruiter.com/jobs", category: "aggregator", note: "Helpful for broader US role discovery." }
  ]
};

function uniqueByName(items: JobSourceLink[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}

export function getTrustedSourcesForCountry(country?: string) {
  const normalizedCountry = (country ?? "").trim();

  if (!normalizedCountry || normalizedCountry === "Worldwide") {
    return GLOBAL_SOURCES;
  }

  return uniqueByName([...(COUNTRY_SOURCE_DIRECTORY[normalizedCountry] ?? []), ...GLOBAL_SOURCES]).slice(0, 5);
}
