import { describe, expect, it } from "vitest";
import { buildResumeSuggestions } from "@/lib/resume-suggestions";

describe("buildResumeSuggestions", () => {
  it("uses parsed resume data and selected job data to produce grounded suggestions", () => {
    const suggestions = buildResumeSuggestions(
      {
        name: "Jordan Doe",
        email: "jordan@example.com",
        phone: "555-555-5555",
        skills: ["React", "Figma"],
        experienceKeywords: ["design systems", "analytics"],
        educationKeywords: ["bachelor"],
        preferredRoles: ["Product Designer"],
        rawText: "resume text"
      },
      {
        externalJobId: "job_1",
        source: "Remotive",
        sourceType: "live",
        title: "Senior Product Designer",
        company: "Northstar Health",
        location: "Remote",
        descriptionSnippet: "Lead design systems, experimentation, and collaboration with product and engineering.",
        applyUrl: "https://example.com/jobs/1",
        postedDate: "2026-04-20T00:00:00.000Z",
        keywords: ["Figma", "Design Systems", "Experimentation", "Product Strategy"],
        matchScore: 82,
        matchReasons: ["Strong title match"],
        missingKeywords: ["Experimentation", "Product Strategy"]
      }
    );

    expect(suggestions.strongerSummary).toContain("Senior Product Designer");
    expect(suggestions.strongerSummary).toContain("Product Designer");
    expect(suggestions.missingKeywords).toEqual(["Experimentation", "Product Strategy"]);
    expect(suggestions.suggestedSkills).toContain("Product Strategy");
    expect(suggestions.wordingUpgrades.some((item) => item.includes("Experimentation"))).toBe(true);
    expect(suggestions.wordingUpgrades.some((item) => item.includes("Figma"))).toBe(true);
  });

  it("falls back to default guidance when resume or selected job is missing", () => {
    const suggestions = buildResumeSuggestions(null, null);

    expect(suggestions.missingKeywords).toEqual([]);
    expect(suggestions.suggestedSkills).toEqual([]);
    expect(suggestions.wordingUpgrades.length).toBeGreaterThan(0);
  });
});
