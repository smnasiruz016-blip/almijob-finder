import { afterEach, describe, expect, it, vi } from "vitest";

const log = vi.fn();

vi.mock("@/lib/logger", () => ({
  log
}));

describe("analytics tracking", () => {
  const originalEnabled = process.env.ANALYTICS_ENABLED;
  const originalProvider = process.env.ANALYTICS_PROVIDER;

  afterEach(() => {
    process.env.ANALYTICS_ENABLED = originalEnabled;
    process.env.ANALYTICS_PROVIDER = originalProvider;
    vi.clearAllMocks();
  });

  it("logs product events when analytics is enabled", async () => {
    process.env.ANALYTICS_ENABLED = "true";
    process.env.ANALYTICS_PROVIDER = "log";

    const { trackProductEvent } = await import("@/lib/analytics");
    await trackProductEvent({
      name: "job_saved",
      userId: "user_1",
      properties: {
        source: "Remotive",
        title: "Frontend Engineer",
        ignored: undefined
      }
    });

    expect(log).toHaveBeenCalledWith(
      "info",
      "Product analytics event",
      expect.objectContaining({
        event: "job_saved",
        userId: "user_1",
        properties: {
          source: "Remotive",
          title: "Frontend Engineer"
        }
      })
    );
  });

  it("does not emit events when analytics is disabled", async () => {
    process.env.ANALYTICS_ENABLED = "false";

    const { trackProductEvent } = await import("@/lib/analytics");
    await trackProductEvent({
      name: "plan_limit_hit",
      userId: "user_1",
      properties: {
        dailyLimit: 5
      }
    });

    expect(log).not.toHaveBeenCalled();
  });
});
