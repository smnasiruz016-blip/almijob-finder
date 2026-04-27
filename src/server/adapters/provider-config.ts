export type ProviderRuntimeConfig = {
  remoteOkEnabled: boolean;
  remoteOkApiUrl: string;
  remoteOkRevalidateSeconds: number;
  remotiveEnabled: boolean;
  remotiveApiUrl: string;
  remotiveRevalidateSeconds: number;
  joobleEnabled: boolean;
  joobleApiUrl: string;
  joobleApiKey?: string;
  adzunaEnabled: boolean;
  adzunaApiUrl: string;
  adzunaAppId?: string;
  adzunaAppKey?: string;
  mockFallbackEnabled: boolean;
};

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() !== "false";
}

function parseNumber(value: string | undefined, defaultValue: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function getProviderRuntimeConfig(): ProviderRuntimeConfig {
  return {
    remoteOkEnabled: parseBoolean(process.env.REMOTE_OK_ENABLED, true),
    remoteOkApiUrl: process.env.REMOTE_OK_API_URL ?? "https://remoteok.com/api",
    remoteOkRevalidateSeconds: parseNumber(process.env.REMOTE_OK_REVALIDATE_SECONDS, 1800),
    remotiveEnabled: parseBoolean(process.env.REMOTIVE_ENABLED, true),
    remotiveApiUrl: process.env.REMOTIVE_API_URL ?? "https://remotive.com/api/remote-jobs",
    remotiveRevalidateSeconds: parseNumber(process.env.REMOTIVE_REVALIDATE_SECONDS, 21600),
    joobleEnabled: parseBoolean(process.env.JOOBLE_ENABLED, true),
    joobleApiUrl: process.env.JOOBLE_API_URL ?? "https://jooble.org/api",
    joobleApiKey: process.env.JOOBLE_API_KEY || undefined,
    adzunaEnabled: parseBoolean(process.env.ADZUNA_ENABLED, true),
    adzunaApiUrl: process.env.ADZUNA_API_URL ?? "https://api.adzuna.com/v1/api/jobs",
    adzunaAppId: process.env.ADZUNA_APP_ID || undefined,
    adzunaAppKey: process.env.ADZUNA_APP_KEY || undefined,
    mockFallbackEnabled: parseBoolean(process.env.MOCK_FALLBACK_ENABLED, process.env.NODE_ENV !== "production")
  };
}
