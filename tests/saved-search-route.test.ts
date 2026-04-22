import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequiredUser: vi.fn(),
  trackProductEvent: vi.fn()
}));

const prisma = {
  savedSearch: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("@/lib/auth", () => ({
  getRequiredUser: mocks.getRequiredUser
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: mocks.trackProductEvent
}));

vi.mock("@/lib/prisma", () => ({
  prisma
}));

describe("PATCH /api/saved-searches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates alerts for Pro users", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_pro",
      email: "pro@example.com",
      name: "Pro User",
      role: "USER",
      subscriptionTier: "PRO"
    });
    prisma.savedSearch.findFirst.mockResolvedValue({
      id: "search_1",
      userId: "user_pro",
      alertsEnabled: false,
      alertFrequency: "DAILY"
    });
    prisma.savedSearch.update.mockResolvedValue({
      id: "search_1",
      alertsEnabled: true,
      alertFrequency: "WEEKLY",
      lastAlertedAt: null
    });

    const { PATCH } = await import("@/app/api/saved-searches/route");
    const response = await PATCH(
      new Request("http://localhost/api/saved-searches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "search_1",
          alertsEnabled: true,
          alertFrequency: "WEEKLY"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.savedSearch.update).toHaveBeenCalledWith({
      where: { id: "search_1" },
      data: {
        alertsEnabled: true,
        alertFrequency: "WEEKLY"
      }
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: "Weekly alerts are now active for this search.",
        savedSearch: expect.objectContaining({
          alertsEnabled: true,
          alertFrequency: "WEEKLY"
        })
      })
    );
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "alert_toggled",
        userId: "user_pro",
        properties: expect.objectContaining({
          savedSearchId: "search_1",
          alertsEnabled: true,
          alertFrequency: "WEEKLY"
        })
      })
    );
  });

  it("keeps alerts disabled for free users even if enabled is requested", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_free",
      email: "free@example.com",
      name: "Free User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    prisma.savedSearch.findFirst.mockResolvedValue({
      id: "search_2",
      userId: "user_free",
      alertsEnabled: false,
      alertFrequency: "DAILY"
    });
    prisma.savedSearch.update.mockResolvedValue({
      id: "search_2",
      alertsEnabled: false,
      alertFrequency: "DAILY",
      lastAlertedAt: null
    });

    const { PATCH } = await import("@/app/api/saved-searches/route");
    const response = await PATCH(
      new Request("http://localhost/api/saved-searches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "search_2",
          alertsEnabled: true,
          alertFrequency: "WEEKLY"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.savedSearch.update).toHaveBeenCalledWith({
      where: { id: "search_2" },
      data: {
        alertsEnabled: false,
        alertFrequency: "DAILY"
      }
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: "Alerts are available on Pro. Your saved search is still available any time.",
        savedSearch: expect.objectContaining({
          alertsEnabled: false,
          alertFrequency: "DAILY"
        })
      })
    );
  });

  it("tracks newly created saved searches", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_pro",
      email: "pro@example.com",
      name: "Pro User",
      role: "USER",
      subscriptionTier: "PRO"
    });
    prisma.savedSearch.create = vi.fn().mockResolvedValue({
      id: "search_created",
      name: "Frontend Engineer - Worldwide",
      alertsEnabled: true,
      alertFrequency: "DAILY"
    });

    const { POST } = await import("@/app/api/saved-searches/route");
    const response = await POST(
      new Request("http://localhost/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Frontend Engineer - Worldwide",
          alertsEnabled: true,
          alertFrequency: "DAILY",
          querySnapshot: {
            desiredTitle: "Frontend Engineer",
            country: "Worldwide"
          }
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "search_saved",
        userId: "user_pro",
        properties: expect.objectContaining({
          savedSearchId: "search_created",
          alertsEnabled: true,
          alertFrequency: "DAILY",
          desiredTitle: "Frontend Engineer"
        })
      })
    );
  });
});
