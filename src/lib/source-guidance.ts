import type { ProviderStatus } from "@/types";

type TrustedSourcePanelInput = {
  country: string;
  resultsCount: number;
  averageMatchScore?: number;
  providerStatuses?: ProviderStatus[];
  selectedCategory?: string | null;
};

export function shouldShowTrustedSourcePanel({
  country,
  resultsCount,
  averageMatchScore,
  providerStatuses,
  selectedCategory
}: TrustedSourcePanelInput) {
  if (selectedCategory) {
    return false;
  }

  const normalizedCountry = country.trim();
  const liveStatuses = providerStatuses?.filter((provider) => provider.sourceType === "live") ?? [];
  const liveErrors = liveStatuses.filter((provider) => provider.status === "error").length;
  const liveNoMatches = liveStatuses.filter((provider) => provider.status === "no_matches").length;
  const providerCoverageLooksThin = liveStatuses.length > 0 && liveStatuses.every((provider) => provider.results <= 1);

  if (resultsCount === 0) {
    return true;
  }

  if (normalizedCountry !== "Worldwide" && resultsCount <= 3) {
    return true;
  }

  if (typeof averageMatchScore === "number" && averageMatchScore < 60 && resultsCount <= 5) {
    return true;
  }

  if (liveErrors > 0 && resultsCount <= 5) {
    return true;
  }

  if (liveNoMatches > 1 && providerCoverageLooksThin) {
    return true;
  }

  return false;
}
