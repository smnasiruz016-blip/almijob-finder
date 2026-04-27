import { isWorldwideFilter } from "@/lib/location";
import type { JobSearchInput, NormalizedJob } from "@/types";

type ProviderWeightConfig = {
  preferredSources: string[];
  neutralSources?: string[];
  remoteFirstSources?: string[];
};

const DEFAULT_LOCAL_CONFIG: ProviderWeightConfig = {
  preferredSources: ["Almiworld Employers", "Jooble", "Adzuna"],
  neutralSources: ["LinkedIn Jobs", "Indeed"],
  remoteFirstSources: ["RemoteOK", "Remotive"]
};

const COUNTRY_PROVIDER_WEIGHTS: Record<string, ProviderWeightConfig> = {
  Iceland: {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  Denmark: {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed", "Adzuna"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  Pakistan: {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  Germany: {
    preferredSources: ["Almiworld Employers", "Adzuna", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  India: {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed", "Adzuna"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  "Saudi Arabia": {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  "United Arab Emirates": {
    preferredSources: ["Almiworld Employers", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  "United Kingdom": {
    preferredSources: ["Almiworld Employers", "Adzuna", "Jooble", "LinkedIn Jobs"],
    neutralSources: ["Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  },
  "United States": {
    preferredSources: ["Almiworld Employers", "Jooble", "Adzuna", "LinkedIn Jobs", "Indeed"],
    remoteFirstSources: ["RemoteOK", "Remotive"]
  }
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesSource(source: string, candidates?: string[]) {
  if (!candidates?.length) {
    return false;
  }

  const normalizedSource = normalize(source);
  return candidates.some((candidate) => normalize(candidate) === normalizedSource);
}

export function getCountryProviderWeight(search: JobSearchInput, job: Pick<NormalizedJob, "source" | "remoteStatus" | "location">) {
  const country = search.country?.trim();

  if (!country || isWorldwideFilter(country)) {
    if (job.source === "Almiworld Employers") {
      return 8;
    }

    if (job.source === "Jooble" || job.source === "Adzuna") {
      return 5;
    }

    if (job.source === "RemoteOK" || job.source === "Remotive") {
      return 4;
    }

    return 2;
  }

  const config = COUNTRY_PROVIDER_WEIGHTS[country] ?? DEFAULT_LOCAL_CONFIG;
  const locationText = `${job.location} ${job.remoteStatus ?? ""}`.toLowerCase();
  const mentionsCountry = locationText.includes(country.toLowerCase());
  const isRemoteOnly = job.remoteStatus === "REMOTE" && !mentionsCountry;

  if (matchesSource(job.source, config.preferredSources)) {
    return 14;
  }

  if (matchesSource(job.source, config.neutralSources)) {
    return 8;
  }

  if (matchesSource(job.source, config.remoteFirstSources)) {
    return isRemoteOnly ? -8 : 2;
  }

  if (job.source === "Almiworld Employers") {
    return 16;
  }

  return mentionsCountry ? 6 : 0;
}
