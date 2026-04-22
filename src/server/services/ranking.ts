import type { JobSearchInput, NormalizedJob, ParsedResume, RankedJob } from "@/types";
import { isWorldwideFilter } from "@/lib/location";
import { dedupe } from "@/lib/utils";

function normalize(text: string) {
  return text.toLowerCase().trim();
}

const SENIORITY_MARKERS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "staff",
  "principal",
  "manager",
  "director",
  "head"
] as const;

function tokenize(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9+.#/ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildKeywordHaystack(job: NormalizedJob) {
  return `${job.title} ${job.descriptionSnippet} ${job.keywords.join(" ")}`.toLowerCase();
}

function uniqueMatches(candidates: string[], target: string[]) {
  return dedupe(
    candidates.filter((item) =>
      target.some((other) => item.includes(other) || other.includes(item))
    )
  );
}

function getSeniority(text: string) {
  const tokens = tokenize(text);
  return SENIORITY_MARKERS.find((marker) => tokens.includes(marker)) ?? null;
}

function getLocationMatch(search: JobSearchInput, location: string) {
  const reasons: string[] = [];

  if (search.country && !isWorldwideFilter(search.country) && location.includes(normalize(search.country))) {
    reasons.push(search.country);
  }

  if (search.state && location.includes(normalize(search.state))) {
    reasons.push(search.state);
  }

  if (search.city && location.includes(normalize(search.city))) {
    reasons.push(search.city);
  }

  return dedupe(reasons);
}

export function rankJobs(
  jobs: NormalizedJob[],
  search: JobSearchInput,
  resume?: ParsedResume | null
): RankedJob[] {
  const desiredTitle = normalize(search.desiredTitle);
  const desiredKeyword = normalize(search.keyword ?? "");
  const resumeSkills = resume?.skills.map(normalize) ?? [];
  const resumeExperience = resume?.experienceKeywords.map(normalize) ?? [];
  const preferredRoles = resume?.preferredRoles.map(normalize) ?? [];
  const desiredSeniority = getSeniority(search.desiredTitle);

  return jobs
    .map((job) => {
      let score = 25;
      const reasons: string[] = [];
      const missingKeywords: string[] = [];
      const title = normalize(job.title);
      const location = normalize(job.location);
      const jobKeywords = job.keywords.map(normalize);
      const keywordHaystack = buildKeywordHaystack(job);
      const titleTokens = tokenize(search.desiredTitle);
      const titleCoverage = titleTokens.filter((token) => title.includes(token)).length;
      const seniority = getSeniority(job.title);

      if (title.includes(desiredTitle)) {
        score += 26;
        reasons.push("Strong title match");
      } else if (titleCoverage >= Math.max(1, Math.ceil(titleTokens.length / 2))) {
        score += 14;
        reasons.push("Partial title match");
      }

      if (desiredKeyword && keywordHaystack.includes(desiredKeyword)) {
        score += 10;
        reasons.push(`Keyword match: ${search.keyword}`);
      }

      if (search.company && job.company.toLowerCase().includes(search.company.toLowerCase())) {
        score += 8;
        reasons.push(`Company preference matched: ${search.company}`);
      }

      const skillMatches = uniqueMatches(resumeSkills, jobKeywords);
      if (skillMatches.length) {
        score += Math.min(24, skillMatches.length * 6);
        reasons.push(`Skills match: ${skillMatches.slice(0, 3).join(", ")}`);
      }

      const locationMatches = getLocationMatch(search, location);
      if (locationMatches.length) {
        score += Math.min(10, locationMatches.length * 4);
        reasons.push("Location preference matched");
      }

      if (search.remoteMode && job.remoteStatus === search.remoteMode) {
        score += 10;
        reasons.push(`Remote preference matched: ${search.remoteMode.toLowerCase()}`);
      }

      const experienceMatches = uniqueMatches(resumeExperience, [...jobKeywords, ...tokenize(job.descriptionSnippet)]);
      if (experienceMatches.length) {
        score += Math.min(18, experienceMatches.length * 4);
        reasons.push(`Resume keywords aligned: ${experienceMatches.slice(0, 3).join(", ")}`);
      }

      if (search.employmentType && job.jobType === search.employmentType) {
        score += 6;
      }

      if (search.salaryMin && (job.salaryMax ?? 0) >= search.salaryMin) {
        score += 4;
      }

      if (search.postedWithinDays && job.postedDate) {
        const ageDays = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays <= search.postedWithinDays) {
          score += 5;
          reasons.push("Posted within your timeframe");
        }
      }

      if (
        (desiredSeniority && seniority && desiredSeniority === seniority) ||
        preferredRoles.some((role) => getSeniority(role) && getSeniority(role) === seniority)
      ) {
        score += 8;
        reasons.push("Seniority aligned");
      }

      if (resumeSkills.length) {
        const unmatched = jobKeywords.filter((keyword) => !resumeSkills.some((skill) => skill.includes(keyword) || keyword.includes(skill)));
        missingKeywords.push(...unmatched.slice(0, 4));
      }

      return {
        ...job,
        matchScore: Math.max(0, Math.min(100, score)),
        matchReasons: dedupe(reasons).slice(0, 6),
        missingKeywords: dedupe(missingKeywords).slice(0, 6)
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);
}
