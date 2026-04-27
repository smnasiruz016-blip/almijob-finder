import { headers } from "next/headers";
import { COUNTRY_OPTIONS } from "@/lib/location-data";

export async function getDetectedCountry() {
  const requestHeaders = await headers();
  const countryCode = requestHeaders.get("x-vercel-ip-country")?.trim().toUpperCase();

  if (!countryCode) {
    return "Worldwide";
  }

  try {
    const displayName = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode);
    return displayName && COUNTRY_OPTIONS.includes(displayName) ? displayName : "Worldwide";
  } catch {
    return "Worldwide";
  }
}
