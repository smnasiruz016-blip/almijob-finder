import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequiredUser: vi.fn(),
  trackProductEvent: vi.fn()
}));

const prisma = {
  savedJob: {
    upsert: vi.fn(),
    deleteMany: vi.fn()
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

describe("POST /api/saved-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects incomplete saved-job payloads", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });

    const { POST } = await import("@/app/api/saved-jobs/route");
    const response = await POST(
      new Request("http://localhost/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalJobId: "job_1",
          source: "Remotive"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.any(String)
      })
    );
    expect(prisma.savedJob.upsert).not.toHaveBeenCalled();
    expect(mocks.trackProductEvent).not.toHaveBeenCalled();
  });

  it("saves valid jobs and tracks the save event", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    prisma.savedJob.upsert.mockResolvedValue({
      id: "saved_job_1",
      externalJobId: "job_1",
      source: "Remotive",
      title: "Frontend Engineer",
      company: "Acme",
      location: "Worldwide",
      applyUrl: "https://example.com/jobs/1"
    });

    const { POST } = await import("@/app/api/saved-jobs/route");
    const response = await POST(
      new Request("http://localhost/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalJobId: "job_1",
          source: "Remotive",
          title: "Frontend Engineer",
          company: "Acme",
          location: "Worldwide",
          applyUrl: "https://example.com/jobs/1",
          descriptionSnippet: "Build product UI",
          keywords: ["react", "typescript"],
          matchScore: 92,
          matchReasons: ["Strong title match"],
          missingKeywords: []
        })
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.savedJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          externalJobId: "job_1",
          source: "Remotive",
          title: "Frontend Engineer"
        })
      })
    );
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "job_saved",
        userId: "user_1",
        properties: expect.objectContaining({
          source: "Remotive",
          externalJobId: "job_1"
        })
      })
    );
  });
});
