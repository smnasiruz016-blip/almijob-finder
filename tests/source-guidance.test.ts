import { describe, expect, it } from "vitest";
import { shouldShowTrustedSourcePanel } from "@/lib/source-guidance";

describe("source guidance", () => {
  it("shows the source panel when no jobs matched", () => {
    expect(
      shouldShowTrustedSourcePanel({
        country: "Iceland",
        resultsCount: 0
      })
    ).toBe(true);
  });

  it("shows the source panel for thin local result sets", () => {
    expect(
      shouldShowTrustedSourcePanel({
        country: "Pakistan",
        resultsCount: 2,
        averageMatchScore: 51
      })
    ).toBe(true);
  });

  it("does not show the source panel for healthy worldwide result sets", () => {
    expect(
      shouldShowTrustedSourcePanel({
        country: "Worldwide",
        resultsCount: 12,
        averageMatchScore: 78
      })
    ).toBe(false);
  });

  it("does not show the source panel while a category drill-down is active", () => {
    expect(
      shouldShowTrustedSourcePanel({
        country: "Denmark",
        resultsCount: 0,
        selectedCategory: "Sales"
      })
    ).toBe(false);
  });
});
