const WORLDWIDE_FILTERS = new Set(["", "worldwide", "global", "remote"]);

export function normalizeLocationFilter(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export function isWorldwideFilter(value?: string) {
  return WORLDWIDE_FILTERS.has(normalizeLocationFilter(value));
}

const ADZUNA_COUNTRY_CODES: Record<string, string> = {
  australia: "au",
  austria: "at",
  belgium: "be",
  brazil: "br",
  canada: "ca",
  france: "fr",
  germany: "de",
  india: "in",
  italy: "it",
  mexico: "mx",
  netherlands: "nl",
  newzealand: "nz",
  poland: "pl",
  singapore: "sg",
  southafrica: "za",
  spain: "es",
  unitedkingdom: "gb",
  uk: "gb",
  greatbritain: "gb",
  unitedstates: "us",
  usa: "us"
};

export function mapCountryToAdzunaCode(country?: string) {
  const key = normalizeLocationFilter(country).replace(/[^a-z]/g, "");
  return ADZUNA_COUNTRY_CODES[key];
}
