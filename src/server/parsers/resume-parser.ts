import { KNOWN_SKILLS, ROLE_KEYWORDS } from "@/lib/constants";
import { dedupe } from "@/lib/utils";
import type { ParsedResume } from "@/types";

const CANONICAL_SKILL_NAMES = new Map(
  KNOWN_SKILLS.map((skill) => [
    skill,
    skill
      .split(" ")
      .map((part) => {
        if (part === "typescript") return "TypeScript";
        if (part === "javascript") return "JavaScript";
        if (part === "next.js") return "Next.js";
        if (part === "node.js") return "Node.js";
        if (part === "postgresql") return "PostgreSQL";
        if (part === "sql") return "SQL";
        if (part === "aws") return "AWS";
        if (part === "graphql") return "GraphQL";
        if (part === "ux") return "UX";
        return part.replace(/\b\w/g, (c) => c.toUpperCase());
      })
      .join(" ")
  ])
);

function extractFirstMatch(pattern: RegExp, input: string) {
  return input.match(pattern)?.[0];
}

function collectKeywordMatches(input: string, terms: string[]) {
  const normalized = input.toLowerCase();

  return dedupe(
    terms
      .filter((term) => normalized.includes(term.toLowerCase()))
      .map((term) => CANONICAL_SKILL_NAMES.get(term.toLowerCase()) ?? term.replace(/\b\w/g, (c) => c.toUpperCase()))
  );
}

function collectSectionKeywords(input: string, sectionName: string) {
  const pattern = new RegExp(`${sectionName}:?([\\s\\S]{0,220})`, "i");
  const section = input.match(pattern)?.[1] ?? "";

  return dedupe(
    section
      .split(/[\n,|]/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 2)
      .map((value) => value.replace(/\b\w/g, (char) => char.toUpperCase()))
  ).slice(0, 12);
}

export function parseResumeText(rawText: string): ParsedResume {
  const cleaned = rawText.replace(/\r/g, "").trim();
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);

  const email = extractFirstMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, cleaned);
  const phone = extractFirstMatch(/(?:\+\d{1,2}\s?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/, cleaned);
  const name = lines.find((line) => /^[A-Za-z][A-Za-z\s.'-]{2,60}$/.test(line) && !line.includes("@"));

  const skills = dedupe([
    ...collectKeywordMatches(cleaned, KNOWN_SKILLS),
    ...collectSectionKeywords(cleaned, "Skills")
  ]).slice(0, 20);

  const experienceKeywords = dedupe([
    ...collectSectionKeywords(cleaned, "Experience"),
    ...collectKeywordMatches(cleaned, [
      "leadership",
      "analytics",
      "stakeholder management",
      "experimentation",
      "roadmap",
      "design system",
      "accessibility",
      "performance",
      "api integration"
    ])
  ]).slice(0, 20);

  const educationKeywords = dedupe([
    ...collectSectionKeywords(cleaned, "Education"),
    ...collectKeywordMatches(cleaned, ["bachelor", "master", "computer science", "bootcamp", "mba", "certification"])
  ]).slice(0, 12);

  const preferredRoles = collectKeywordMatches(cleaned, ROLE_KEYWORDS).slice(0, 8);

  return {
    name,
    email,
    phone,
    skills,
    experienceKeywords,
    educationKeywords,
    preferredRoles,
    rawText: cleaned
  };
}
