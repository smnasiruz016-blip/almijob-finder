import { log } from "@/lib/logger";

export type ProductEventName =
  | "resume_uploaded"
  | "job_search_performed"
  | "job_saved"
  | "search_saved"
  | "alert_toggled"
  | "plan_limit_hit";

export type ProductEvent = {
  name: ProductEventName;
  userId?: string;
  properties?: Record<string, unknown>;
};

export interface AnalyticsProvider {
  track(event: ProductEvent): void | Promise<void>;
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() !== "false";
}

function cleanProperties(properties?: Record<string, unknown>) {
  if (!properties) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

class LogAnalyticsProvider implements AnalyticsProvider {
  track(event: ProductEvent) {
    log("info", "Product analytics event", {
      event: event.name,
      userId: event.userId,
      properties: cleanProperties(event.properties)
    });
  }
}

class NoopAnalyticsProvider implements AnalyticsProvider {
  track() {}
}

export function getAnalyticsProvider(): AnalyticsProvider {
  const enabled = parseBoolean(process.env.ANALYTICS_ENABLED, true);
  if (!enabled) {
    return new NoopAnalyticsProvider();
  }

  const provider = (process.env.ANALYTICS_PROVIDER ?? "log").toLowerCase();

  if (provider === "log") {
    return new LogAnalyticsProvider();
  }

  return new NoopAnalyticsProvider();
}

export async function trackProductEvent(event: ProductEvent) {
  const provider = getAnalyticsProvider();
  await provider.track({
    ...event,
    properties: cleanProperties(event.properties)
  });
}
