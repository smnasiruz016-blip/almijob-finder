import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequiredUser: vi.fn(),
  createCompanyForUser: vi.fn()
}));

const prisma = {
  companyUser: {
    findFirst: vi.fn()
  }
};

vi.mock("@/lib/auth", () => ({
  getRequiredUser: mocks.getRequiredUser
}));

vi.mock("@/server/services/company-vacancies", () => ({
  createCompanyForUser: mocks.createCompanyForUser
}));

vi.mock("@/lib/prisma", () => ({
  prisma
}));

describe("POST /api/employer/company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 when the database unique constraint is hit", async () => {
    mocks.getRequiredUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      name: "Demo User",
      role: "USER",
      subscriptionTier: "FREE"
    });
    mocks.createCompanyForUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3"
      })
    );

    const { POST } = await import("@/app/api/employer/company/route");
    const response = await POST(
      new Request("http://localhost/api/employer/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Acme",
          website: "https://acme.example",
          country: "Iceland",
          city: "Reykjavik",
          description: "Test company"
        })
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "You already have a company workspace linked to this account."
    });
    expect(prisma.companyUser.findFirst).not.toHaveBeenCalled();
  });
});
