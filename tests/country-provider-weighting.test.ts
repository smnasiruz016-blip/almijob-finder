import { describe, expect, it } from "vitest";
import { getCountryProviderWeight } from "@/lib/country-provider-weighting";

describe("getCountryProviderWeight", () => {
  it("prefers local-friendly sources for Iceland", () => {
    const weight = getCountryProviderWeight(
      { desiredTitle: "Staff Nurse", country: "Iceland" },
      { source: "Jooble", location: "Reykjavik, Iceland", remoteStatus: undefined }
    );

    expect(weight).toBeGreaterThan(0);
  });

  it("penalizes remote-first US-style sources for strict local searches", () => {
    const weight = getCountryProviderWeight(
      { desiredTitle: "Staff Nurse", country: "Iceland" },
      { source: "RemoteOK", location: "Remote (US-Only)", remoteStatus: "REMOTE" }
    );

    expect(weight).toBeLessThan(0);
  });

  it("keeps employer-posted jobs strongly preferred in local markets", () => {
    const weight = getCountryProviderWeight(
      { desiredTitle: "Account Manager", country: "Pakistan" },
      { source: "Almiworld Employers", location: "Lahore, Pakistan", remoteStatus: undefined }
    );

    expect(weight).toBeGreaterThanOrEqual(14);
  });
});
