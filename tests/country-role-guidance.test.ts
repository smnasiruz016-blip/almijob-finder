import { describe, expect, it } from "vitest";
import { buildCountryRoleLinks, getCountryRoleSuggestions, normalizeCountryRoleSuggestion } from "@/lib/country-role-guidance";

describe("country role guidance", () => {
  it("returns country-specific role suggestions when configured", () => {
    const suggestions = getCountryRoleSuggestions("Iceland");
    expect(suggestions.map((item) => item.label)).toContain("Nurse");
    expect(suggestions.map((item) => item.label)).toContain("Reception");
  });

  it("builds dashboard links with role and country query params", () => {
    const [first] = buildCountryRoleLinks("Pakistan", "/dashboard");
    expect(first?.href).toContain("/dashboard?");
    expect(first?.href).toContain("country=Pakistan");
    expect(first?.href).toContain("desiredTitle=");
  });

  it("normalizes rough role wording to the canonical title", () => {
    const normalized = normalizeCountryRoleSuggestion({ desiredTitle: "nurse", keyword: "patient care" });
    expect(normalized.desiredTitle).toBe("Staff Nurse");
    expect(normalized.keyword).toBe("patient care");
  });
});
