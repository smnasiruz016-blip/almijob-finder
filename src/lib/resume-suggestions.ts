import type { ParsedResume, RankedJob } from "@/types";

const STOPWORDS = new Set([
  "and",
  "the",
  "with",
  "for",
  "your",
  "team",
  "role",
  "roles",
  "using",
  "build",
  "product",
  "remote",
  "full",
  "time"
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

function looksUsefulKeyword(value: string) {
  const normalized = normalize(value);
  return normalized.length >= 3 && !STOPWORDS.has(normalized);
}

export function buildResumeSuggestions(resume: ParsedResume | null, selectedJob?: RankedJob | null) {
  if (!resume || !selectedJob) {
    return {
      strongerSummary:
        "Add a top-of-resume summary that targets your preferred role, years of experience, and the outcomes you drive.",
      missingKeywords: [],
      suggestedSkills: [],
      wordingUpgrades: [
        "Replace passive bullets with action + impact phrasing.",
        "Include measurable outcomes where possible."
      ]
    };
  }

  const resumeTerms = dedupe(
    [...resume.skills, ...resume.experienceKeywords, ...resume.educationKeywords, ...resume.preferredRoles].map(normalize)
  );
  const missingKeywords = dedupe(selectedJob.missingKeywords.filter(looksUsefulKeyword));
  const selectedJobTerms = dedupe(
    [...selectedJob.keywords, selectedJob.title, selectedJob.company]
      .map((value) => value.trim())
      .filter(looksUsefulKeyword)
  );
  const suggestedSkills = selectedJobTerms.filter((keyword) => !resumeTerms.some((term) => term.includes(normalize(keyword)) || normalize(keyword).includes(term))).slice(0, 5);
  const matchingSkills = resume.skills.filter((skill) =>
    selectedJob.keywords.some((keyword) => normalize(skill).includes(normalize(keyword)) || normalize(keyword).includes(normalize(skill)))
  );
  const preferredRole = resume.preferredRoles[0] ?? selectedJob.title;
  const summarySignals = dedupe(
    [preferredRole, ...matchingSkills.slice(0, 2), ...resume.experienceKeywords.slice(0, 2)].filter(Boolean)
  );
  const wordingUpgrades = dedupe(
    [
      missingKeywords.length ? `Mirror the job language for ${missingKeywords.slice(0, 2).join(" and ")} where it is accurate.` : null,
      matchingSkills.length
        ? `Move ${matchingSkills.slice(0, 2).join(" and ")} closer to the top of your summary or skills section.`
        : "Lead with the tools and skills you use most often in relevant work.",
      resume.experienceKeywords.length < 4
        ? "Turn broad experience bullets into specific outcomes with domain keywords."
        : "Add measurable outcomes to the experience bullets most related to this role.",
      resume.preferredRoles.length === 0 ? "Name your target role directly in the opening summary." : null
    ].filter(Boolean) as string[]
  );

  return {
    strongerSummary: `Tailor your summary toward ${selectedJob.title} roles. Lead with ${summarySignals.join(", ") || "your strongest relevant experience"} and show how that background fits ${selectedJob.company}.`,
    missingKeywords,
    suggestedSkills,
    wordingUpgrades
  };
}
