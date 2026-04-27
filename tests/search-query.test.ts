import { describe, expect, it } from "vitest";
import { buildSearchQueryAssist, getPreferredProviderQuery, getSuggestedQueryReplacement, matchesSearchQuery } from "@/lib/search-query";

describe("search query helpers", () => {
  it("corrects shorthand nurse queries for provider searching", () => {
    expect(getPreferredProviderQuery("nurs")).toBe("nurse");
    expect(getSuggestedQueryReplacement("nurs")).toBe("nurse");
    expect(buildSearchQueryAssist("nurs")).toEqual(
      expect.objectContaining({
        corrected: "nurse",
        hasCorrections: true
      })
    );
  });

  it("matches corrected and expanded role intent against live job text", () => {
    expect(matchesSearchQuery("Registered nurse needed for clinical support", "nurs")).toBe(true);
    expect(matchesSearchQuery("Busy kitchen needs an experienced line cook", "cheff")).toBe(true);
    expect(matchesSearchQuery("Senior backend engineer building APIs", "nurs")).toBe(false);
  });
});
