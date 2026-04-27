import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  $queryRawUnsafe: vi.fn(),
  $transaction: vi.fn(),
  companyUser: {
    findFirst: vi.fn()
  },
  company: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  vacancy: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

const log = vi.fn();
const trackProductEvent = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma
}));

vi.mock("@/lib/logger", () => ({
  log
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent
}));

describe("getEmployerInventoryOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it("counts only companies with at least one active vacancy in the hiring total query", async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ totalHiringCompanies: 1, totalOpenVacancies: 1 }])
      .mockResolvedValueOnce([]);

    const { getEmployerInventoryOverview } = await import("@/server/services/company-vacancies");
    const result = await getEmployerInventoryOverview();

    expect(result.totalHiringCompanies).toBe(1);
    expect(result.totalOpenVacancies).toBe(1);

    expect(prisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN c.id END)::int AS "totalHiringCompanies"')
    );
  });

  it("blocks creating a second company when the user already has a membership", async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }]);
    prisma.companyUser.findFirst.mockResolvedValue({ id: "membership_1" });

    const { createCompanyForUser } = await import("@/server/services/company-vacancies");

    await expect(
      createCompanyForUser("user_1", {
        name: "Acme",
        website: "https://acme.example",
        country: "Iceland",
        city: "Reykjavik",
        description: "Test company"
      })
    ).rejects.toThrow("COMPANY_ALREADY_EXISTS");

    expect(prisma.company.create).not.toHaveBeenCalled();
    expect(trackProductEvent).not.toHaveBeenCalled();
  });

  it("blocks vacancy creation when the user is not a member of the company", async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }]);
    prisma.companyUser.findFirst.mockResolvedValue(null);

    const { createVacancyForUser } = await import("@/server/services/company-vacancies");

    await expect(
      createVacancyForUser("user_1", {
        companyId: "company_1",
        title: "Frontend Engineer",
        description: "Build and ship frontend product features for customers.",
        country: "Iceland",
        city: "Reykjavik",
        status: "ACTIVE"
      })
    ).rejects.toThrow("COMPANY_ACCESS_DENIED");

    expect(prisma.vacancy.create).not.toHaveBeenCalled();
    expect(trackProductEvent).not.toHaveBeenCalled();
  });

  it("returns direct employer vacancies as searchable live jobs", async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }]);
    prisma.vacancy.findMany.mockResolvedValue([
      {
        id: "vacancy_1",
        title: "Staff Nurse",
        description: "Provide ward nursing care and coordinate patient follow-up.",
        country: "Iceland",
        state: null,
        city: "Reykjavik",
        remoteMode: null,
        employmentType: "FULL_TIME",
        salaryMin: 5000,
        salaryMax: 7000,
        applyUrl: "https://clinic.example/jobs/staff-nurse",
        status: "ACTIVE",
        createdAt: new Date("2026-04-25T00:00:00.000Z"),
        company: {
          name: "Harbor Clinic",
          website: "https://clinic.example"
        }
      }
    ]);

    const { searchEmployerVacancies } = await import("@/server/services/company-vacancies");
    const jobs = await searchEmployerVacancies({
      desiredTitle: "staff nurse",
      country: "Iceland",
      city: "Reykjavik"
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        source: "Almiworld Employers",
        title: "Staff Nurse",
        company: "Harbor Clinic",
        sourceType: "live",
        location: "Reykjavik, Iceland",
        applyUrl: "https://clinic.example/jobs/staff-nurse"
      })
    );
  });

  it("updates a vacancy when the user belongs to the company", async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }]);
    prisma.companyUser.findFirst.mockResolvedValue({ id: "membership_1" });
    prisma.vacancy.findUnique.mockResolvedValue({ id: "vacancy_1", companyId: "company_1" });
    prisma.vacancy.update.mockResolvedValue({
      id: "vacancy_1",
      companyId: "company_1",
      title: "Staff Nurse",
      description: "Updated vacancy description for a clinical ward role.",
      country: "Iceland",
      state: null,
      city: "Reykjavik",
      remoteMode: null,
      employmentType: "FULL_TIME",
      salaryMin: 5000,
      salaryMax: 7000,
      applyUrl: "https://clinic.example/jobs/staff-nurse",
      status: "ACTIVE",
      createdAt: new Date("2026-04-25T00:00:00.000Z"),
      updatedAt: new Date("2026-04-25T01:00:00.000Z")
    });

    const { updateVacancyForUser } = await import("@/server/services/company-vacancies");
    const vacancy = await updateVacancyForUser("user_1", {
      vacancyId: "vacancy_1",
      companyId: "company_1",
      title: "Staff Nurse",
      description: "Updated vacancy description for a clinical ward role.",
      country: "Iceland",
      city: "Reykjavik",
      status: "ACTIVE"
    });

    expect(prisma.vacancy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vacancy_1" }
      })
    );
    expect(vacancy.status).toBe("ACTIVE");
    expect(trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "vacancy_updated"
      })
    );
  });
});
