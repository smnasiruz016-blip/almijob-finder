import { describe, expect, it } from "vitest";
import { getTrustedSourcesForCountry } from "@/lib/source-directory";

describe("source directory", () => {
  it("returns country-specific trusted sources before global ones", () => {
    const pakistan = getTrustedSourcesForCountry("Pakistan");

    expect(pakistan.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Rozee.pk", "Mustakbil", "LinkedIn Jobs"])
    );
  });

  it("falls back to global trusted sources for worldwide searches", () => {
    const worldwide = getTrustedSourcesForCountry("Worldwide");

    expect(worldwide.map((item) => item.name)).toEqual(["LinkedIn Jobs", "Jooble", "Indeed"]);
  });
});
