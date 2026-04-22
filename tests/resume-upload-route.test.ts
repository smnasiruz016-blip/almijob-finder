import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequiredUser: vi.fn(),
  handleResumeUpload: vi.fn(),
  trackProductEvent: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  getRequiredUser: mocks.getRequiredUser
}));

vi.mock("@/server/services/resume-service", () => ({
  handleResumeUpload: mocks.handleResumeUpload
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: mocks.trackProductEvent
}));

describe("POST /api/resumes/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friendly error when no file is provided", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });

    const formData = new FormData();
    const { POST } = await import("@/app/api/resumes/upload/route");
    const response = await POST(
      new Request("http://localhost/api/resumes/upload", {
        method: "POST",
        body: formData
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Choose a resume file before uploading.",
      code: "MISSING_FILE"
    });
  });

  it("maps parser failures to a friendly parsing error", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    mocks.handleResumeUpload.mockRejectedValue(new Error("Could not extract readable text"));

    const formData = new FormData();
    formData.set(
      "resume",
      new File(["resume"], "resume.pdf", {
        type: "application/pdf"
      })
    );

    const { POST } = await import("@/app/api/resumes/upload/route");
    const response = await POST(
      new Request("http://localhost/api/resumes/upload", {
        method: "POST",
        body: formData
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: "PARSING_FAILED",
        error: expect.stringContaining("could not read the text")
      })
    );
    expect(mocks.trackProductEvent).not.toHaveBeenCalled();
  });

  it("tracks successful uploads", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    mocks.handleResumeUpload.mockResolvedValue({
      resume: { id: "resume_1" },
      parsed: {
        name: "Demo User",
        email: "demo@example.com",
        phone: "555-1234",
        skills: ["React", "TypeScript"],
        experienceKeywords: ["frontend"],
        educationKeywords: ["computer science"],
        preferredRoles: ["Frontend Engineer"],
        rawText: "resume text"
      }
    });

    const formData = new FormData();
    formData.set(
      "resume",
      new File(["resume"], "resume.pdf", {
        type: "application/pdf"
      })
    );

    const { POST } = await import("@/app/api/resumes/upload/route");
    const response = await POST(
      new Request("http://localhost/api/resumes/upload", {
        method: "POST",
        body: formData
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "resume_uploaded",
        userId: "user_1",
        properties: expect.objectContaining({
          mimeType: "application/pdf",
          skillCount: 2,
          preferredRoleCount: 1
        })
      })
    );
  });
});
