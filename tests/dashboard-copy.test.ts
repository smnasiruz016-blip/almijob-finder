import { describe, expect, it } from "vitest";
import { buildSavedSearchSectionCopy, buildSearchFeedbackState, buildUploadErrorState } from "@/lib/dashboard-copy";

describe("buildSearchFeedbackState", () => {
  it("returns a clear free-plan limit state", () => {
    const state = buildSearchFeedbackState({
      type: "error",
      code: "SEARCH_LIMIT_REACHED",
      message: "You have used all 5 searches for today on the Free plan."
    });

    expect(state.title).toBe("Today's search limit has been reached");
    expect(state.nextStep).toContain("saved jobs");
    expect(state.variant).toBe("warning");
  });

  it("returns a provider-unavailable empty state when live providers are down", () => {
    const state = buildSearchFeedbackState({
      type: "empty",
      message: "Live job providers are temporarily unavailable right now. Try again shortly or broaden your search."
    });

    expect(state.title).toBe("Live providers are temporarily unavailable");
    expect(state.variant).toBe("warning");
  });
});

describe("buildUploadErrorState", () => {
  it("returns parsing guidance for unreadable resumes", () => {
    const state = buildUploadErrorState({
      code: "PARSING_FAILED",
      message: "We could not read your resume."
    });

    expect(state.title).toBe("We could not read the resume text");
    expect(state.nextStep).toContain("text-based PDF or DOCX");
  });
});

describe("buildSavedSearchSectionCopy", () => {
  it("keeps saved-search copy honest for free users", () => {
    expect(buildSavedSearchSectionCopy(0, false)).toContain("unlock alert delivery later");
    expect(buildSavedSearchSectionCopy(2, false)).toContain("Alerts unlock later on Pro");
  });
});
