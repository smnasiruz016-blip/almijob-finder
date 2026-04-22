export const COUNTRY_OPTIONS = [
  "Worldwide",
  "Australia",
  "Canada",
  "France",
  "Germany",
  "India",
  "Netherlands",
  "Singapore",
  "United Kingdom",
  "United States"
];

export const REGION_OPTIONS: Record<string, string[]> = {
  Australia: ["New South Wales", "Queensland", "Victoria", "Western Australia"],
  Canada: ["Alberta", "British Columbia", "Ontario", "Quebec"],
  Germany: ["Bavaria", "Berlin", "Hamburg", "Hesse"],
  India: ["Delhi", "Karnataka", "Maharashtra", "Tamil Nadu"],
  "United Kingdom": ["England", "Northern Ireland", "Scotland", "Wales"],
  "United States": ["California", "Florida", "Illinois", "New York", "Texas", "Washington"]
};

export const CITY_OPTIONS: Record<string, string[]> = {
  "Australia|New South Wales": ["Sydney", "Newcastle"],
  "Australia|Queensland": ["Brisbane", "Gold Coast"],
  "Australia|Victoria": ["Melbourne", "Geelong"],
  "Canada|Alberta": ["Calgary", "Edmonton"],
  "Canada|British Columbia": ["Vancouver", "Victoria"],
  "Canada|Ontario": ["Ottawa", "Toronto"],
  "Canada|Quebec": ["Montreal", "Quebec City"],
  "Germany|Berlin": ["Berlin"],
  "Germany|Bavaria": ["Munich", "Nuremberg"],
  "India|Delhi": ["New Delhi"],
  "India|Karnataka": ["Bengaluru", "Mysuru"],
  "India|Maharashtra": ["Mumbai", "Pune"],
  "India|Tamil Nadu": ["Chennai", "Coimbatore"],
  "United Kingdom|England": ["London", "Manchester"],
  "United Kingdom|Scotland": ["Edinburgh", "Glasgow"],
  "United States|California": ["Los Angeles", "San Francisco"],
  "United States|Florida": ["Miami", "Orlando"],
  "United States|Illinois": ["Chicago"],
  "United States|New York": ["New York City", "Buffalo"],
  "United States|Texas": ["Austin", "Dallas"],
  "United States|Washington": ["Seattle", "Spokane"]
};

export function getRegionOptions(country?: string) {
  return REGION_OPTIONS[country ?? ""] ?? [];
}

export function getCityOptions(country?: string, region?: string) {
  if (!country || !region) {
    return [];
  }

  return CITY_OPTIONS[`${country}|${region}`] ?? [];
}
