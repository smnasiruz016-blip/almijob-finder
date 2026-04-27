import { CompanyUserRole, VacancyStatus } from "@prisma/client";
import { isWorldwideFilter, normalizeLocationFilter } from "@/lib/location";
import { getPreferredProviderQuery, matchesSearchQuery } from "@/lib/search-query";
import { trackProductEvent } from "@/lib/analytics";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type {
  CountryHiringHighlights,
  EmployerCompanyWorkspace,
  EmployerInventoryOverview,
  EmployerWorkspace,
  HiringCompanyPreview,
  JobSearchInput,
  NormalizedJob
} from "@/types";

const FALLBACK_COMPANY_OVERVIEW: EmployerInventoryOverview = {
  totalHiringCompanies: 0,
  totalOpenVacancies: 0,
  featuredCompanies: [],
  source: "fallback"
};

const FALLBACK_WORKSPACE: EmployerWorkspace = {
  ready: false,
  canCreateCompany: false,
  companies: [],
  source: "fallback"
};

const FALLBACK_COUNTRY_HIRING: CountryHiringHighlights = {
  country: "Worldwide",
  vacancies: [],
  companies: [],
  totalVacancies: 0,
  totalCompanies: 0,
  source: "fallback"
};

type FeaturedCompanyRow = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  country: string;
  city: string | null;
  verified: boolean;
  openRoles: number;
  roleTitles: string[] | null;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

type SlugLookupClient = Pick<typeof prisma, "company">;

async function ensureUniqueCompanySlug(baseName: string, tx: SlugLookupClient = prisma) {
  const baseSlug = slugify(baseName) || "company";
  let candidate = baseSlug;
  let suffix = 2;

  while (await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function isEmployerSchemaReady() {
  try {
    const [companyTable] = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Company'
      ) AS "exists"`
    );
    const [vacancyTable] = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Vacancy'
      ) AS "exists"`
    );

    return Boolean(companyTable?.exists && vacancyTable?.exists);
  } catch (error) {
    log("warn", "Employer schema readiness check failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return false;
  }
}

function toPreview(row: FeaturedCompanyRow): HiringCompanyPreview {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    website: row.website,
    country: row.country,
    city: row.city,
    verified: row.verified,
    openRoles: Number(row.openRoles ?? 0),
    roleTitles: (row.roleTitles ?? []).filter(Boolean).slice(0, 3)
  };
}

function mapVacancyToPreview(vacancy: {
  id: string;
  companyId: string;
  title: string;
  description: string;
  status: VacancyStatus;
  country: string;
  state: string | null;
  city: string | null;
  remoteMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  applyUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: vacancy.id,
    companyId: vacancy.companyId,
    title: vacancy.title,
    description: vacancy.description,
    status: vacancy.status,
    country: vacancy.country,
    state: vacancy.state,
    city: vacancy.city,
    remoteMode: vacancy.remoteMode,
    employmentType: vacancy.employmentType,
    salaryMin: vacancy.salaryMin,
    salaryMax: vacancy.salaryMax,
    applyUrl: vacancy.applyUrl,
    createdAt: vacancy.createdAt.toISOString(),
    updatedAt: vacancy.updatedAt.toISOString()
  };
}

function mapVacancyToPublicPreview(vacancy: {
  id: string;
  title: string;
  country: string;
  state?: string | null;
  city?: string | null;
  employmentType?: string | null;
  remoteMode?: string | null;
  applyUrl?: string | null;
  createdAt: Date;
  company: {
    name: string;
    slug: string;
    website?: string | null;
    verified: boolean;
  };
}) {
  return {
    id: vacancy.id,
    title: vacancy.title,
    company: vacancy.company.name,
    companySlug: vacancy.company.slug,
    country: vacancy.country,
    state: vacancy.state,
    city: vacancy.city,
    location: buildVacancyLocation(vacancy),
    employmentType: vacancy.employmentType,
    remoteMode: vacancy.remoteMode,
    applyUrl: vacancy.applyUrl || vacancy.company.website || "https://www.almiworld.com",
    postedAt: vacancy.createdAt.toISOString(),
    verifiedCompany: vacancy.company.verified
  };
}

export async function getEmployerInventoryOverview(): Promise<EmployerInventoryOverview> {
  const schemaReady = await isEmployerSchemaReady();

  if (!schemaReady) {
    return FALLBACK_COMPANY_OVERVIEW;
  }

  try {
    const [totalHiringCompanies, totalOpenVacancies, companies] = await Promise.all([
      prisma.company.count(),
      prisma.vacancy.count({
        where: {
          status: VacancyStatus.ACTIVE
        }
      }),
      prisma.company.findMany({
        include: {
          vacancies: {
            orderBy: {
              createdAt: "desc"
            },
            take: 6
          }
        },
        orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
        take: 6
      })
    ]);

    const featured = companies.map<FeaturedCompanyRow>((company) => {
      const activeVacancies = company.vacancies.filter((vacancy) => vacancy.status === VacancyStatus.ACTIVE);
      const roleSource = activeVacancies.length > 0 ? activeVacancies : company.vacancies;

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        website: company.website,
        country: company.country,
        city: company.city,
        verified: company.verified,
        openRoles: activeVacancies.length,
        roleTitles: roleSource.map((vacancy) => vacancy.title).filter(Boolean).slice(0, 3)
      };
    });

    return {
      totalHiringCompanies,
      totalOpenVacancies,
      featuredCompanies: featured.map(toPreview),
      source: "database"
    };
  } catch (error) {
    log("warn", "Employer inventory overview fallback activated", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      ...FALLBACK_COMPANY_OVERVIEW,
      source: "unavailable"
    };
  }
}

export async function getEmployerWorkspace(userId: string): Promise<EmployerWorkspace> {
  const schemaReady = await isEmployerSchemaReady();

  if (!schemaReady) {
    return FALLBACK_WORKSPACE;
  }

  try {
    const memberships = await prisma.companyUser.findMany({
      where: { userId },
      include: {
        company: {
          include: {
            vacancies: {
              orderBy: { createdAt: "desc" }
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const companies: EmployerCompanyWorkspace[] = memberships.map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      slug: membership.company.slug,
      website: membership.company.website,
      country: membership.company.country,
      city: membership.company.city,
      verified: membership.company.verified,
      membershipRole: membership.role,
            vacancies: membership.company.vacancies.map((vacancy) => ({
              ...mapVacancyToPreview(vacancy)
            }))
    }));

    return {
      ready: true,
      canCreateCompany: companies.length === 0,
      companies,
      source: "database"
    };
  } catch (error) {
    log("warn", "Employer workspace fallback activated", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      ...FALLBACK_WORKSPACE,
      source: "unavailable"
    };
  }
}

export async function createCompanyForUser(
  userId: string,
  input: {
    name: string;
    website?: string | null;
    country: string;
    city?: string | null;
    description?: string | null;
  }
): Promise<EmployerCompanyWorkspace> {
  if (!(await isEmployerSchemaReady())) {
    throw new Error("EMPLOYER_SCHEMA_NOT_READY");
  }

  const company = await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.companyUser.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (existingMembership) {
      throw new Error("COMPANY_ALREADY_EXISTS");
    }

    const slug = await ensureUniqueCompanySlug(input.name, tx);

    return tx.company.create({
      data: {
        name: input.name,
        slug,
        website: input.website || null,
        country: input.country,
        city: input.city || null,
        description: input.description || null,
        users: {
          create: {
            userId,
            role: CompanyUserRole.OWNER
          }
        }
      },
      include: {
        users: {
          where: { userId }
        },
        vacancies: true
      }
    });
  });

  await trackProductEvent({
    name: "company_created",
    userId,
    properties: {
      companyId: company.id,
      companyName: company.name,
      country: company.country
    }
  });

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    website: company.website,
    country: company.country,
    city: company.city,
    verified: company.verified,
    membershipRole: company.users[0]?.role ?? CompanyUserRole.OWNER,
    vacancies: []
  };
}

export async function createVacancyForUser(
  userId: string,
  input: {
    companyId: string;
    title: string;
    description: string;
    country: string;
    state?: string | null;
    city?: string | null;
    remoteMode?: "REMOTE" | "HYBRID" | "ONSITE" | "FLEXIBLE" | null;
    employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY" | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    applyUrl?: string | null;
    status?: "DRAFT" | "ACTIVE" | "CLOSED";
  }
) {
  if (!(await isEmployerSchemaReady())) {
    throw new Error("EMPLOYER_SCHEMA_NOT_READY");
  }

  const membership = await prisma.companyUser.findFirst({
    where: {
      userId,
      companyId: input.companyId
    }
  });

  if (!membership) {
    throw new Error("COMPANY_ACCESS_DENIED");
  }

  const vacancy = await prisma.vacancy.create({
    data: {
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      country: input.country,
      state: input.state || null,
      city: input.city || null,
      remoteMode: input.remoteMode ?? null,
      employmentType: input.employmentType ?? null,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      applyUrl: input.applyUrl || null,
      status: (input.status as VacancyStatus | undefined) ?? VacancyStatus.ACTIVE
    }
  });

  await trackProductEvent({
    name: "vacancy_posted",
    userId,
    properties: {
      vacancyId: vacancy.id,
      companyId: vacancy.companyId,
      country: vacancy.country,
      status: vacancy.status
    }
  });

  return vacancy;
}

export async function updateVacancyForUser(
  userId: string,
  input: {
    vacancyId: string;
    companyId: string;
    title: string;
    description: string;
    country: string;
    state?: string | null;
    city?: string | null;
    remoteMode?: "REMOTE" | "HYBRID" | "ONSITE" | "FLEXIBLE" | null;
    employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY" | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    applyUrl?: string | null;
    status?: "DRAFT" | "ACTIVE" | "CLOSED";
  }
) {
  if (!(await isEmployerSchemaReady())) {
    throw new Error("EMPLOYER_SCHEMA_NOT_READY");
  }

  const membership = await prisma.companyUser.findFirst({
    where: {
      userId,
      companyId: input.companyId
    }
  });

  if (!membership) {
    throw new Error("COMPANY_ACCESS_DENIED");
  }

  const existingVacancy = await prisma.vacancy.findUnique({
    where: { id: input.vacancyId },
    select: { id: true, companyId: true }
  });

  if (!existingVacancy || existingVacancy.companyId !== input.companyId) {
    throw new Error("VACANCY_NOT_FOUND");
  }

  const vacancy = await prisma.vacancy.update({
    where: { id: input.vacancyId },
    data: {
      title: input.title,
      description: input.description,
      country: input.country,
      state: input.state || null,
      city: input.city || null,
      remoteMode: input.remoteMode ?? null,
      employmentType: input.employmentType ?? null,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      applyUrl: input.applyUrl || null,
      status: (input.status as VacancyStatus | undefined) ?? VacancyStatus.ACTIVE
    }
  });

  await trackProductEvent({
    name: "vacancy_updated",
    userId,
    properties: {
      vacancyId: vacancy.id,
      companyId: vacancy.companyId,
      country: vacancy.country,
      status: vacancy.status
    }
  });

  return vacancy;
}

function matchesExactOrWorldwide(filterValue?: string | null, targetValue?: string | null) {
  if (!filterValue || isWorldwideFilter(filterValue)) {
    return true;
  }

  const normalizedFilter = normalizeLocationFilter(filterValue);
  const normalizedTarget = normalizeLocationFilter(targetValue ?? "");

  return Boolean(normalizedFilter && normalizedTarget && normalizedTarget.includes(normalizedFilter));
}

function matchesVacancyLocation(input: JobSearchInput, vacancy: { country: string; state?: string | null; city?: string | null; remoteMode?: string | null }) {
  if (!matchesExactOrWorldwide(input.country, vacancy.country)) {
    return false;
  }

  if (input.state && !matchesExactOrWorldwide(input.state, vacancy.state)) {
    return false;
  }

  if (input.city && !matchesExactOrWorldwide(input.city, vacancy.city)) {
    return false;
  }

  if (input.remoteMode && vacancy.remoteMode && input.remoteMode !== vacancy.remoteMode) {
    return false;
  }

  return true;
}

function buildVacancyLocation(vacancy: { city?: string | null; state?: string | null; country: string }) {
  return [vacancy.city, vacancy.state, vacancy.country].filter(Boolean).join(", ");
}

function buildVacancyKeywords(vacancy: {
  title: string;
  description: string;
  company: { name: string };
  country: string;
  city?: string | null;
  state?: string | null;
}) {
  return [
    vacancy.title,
    vacancy.company.name,
    vacancy.country,
    vacancy.state ?? "",
    vacancy.city ?? "",
    ...vacancy.description
      .split(/[^a-zA-Z0-9+#/]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .slice(0, 20)
  ].filter(Boolean);
}

export async function searchEmployerVacancies(input: JobSearchInput): Promise<NormalizedJob[]> {
  if (!(await isEmployerSchemaReady())) {
    return [];
  }

  const titleNeedle = getPreferredProviderQuery(input.desiredTitle);
  const keywordNeedle = getPreferredProviderQuery(input.keyword);

  try {
    const vacancies = await prisma.vacancy.findMany({
      where: {
        status: VacancyStatus.ACTIVE
      },
      include: {
        company: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return vacancies
      .filter((vacancy) => {
        if (!matchesVacancyLocation(input, vacancy)) {
          return false;
        }

        if (input.employmentType && vacancy.employmentType && input.employmentType !== vacancy.employmentType) {
          return false;
        }

        if (input.company && !vacancy.company.name.toLowerCase().includes(input.company.toLowerCase())) {
          return false;
        }

        if (input.salaryMin && typeof vacancy.salaryMax === "number" && vacancy.salaryMax < input.salaryMin) {
          return false;
        }

        if (input.postedWithinDays) {
          const maxAgeMs = input.postedWithinDays * 24 * 60 * 60 * 1000;
          if (Date.now() - vacancy.createdAt.getTime() > maxAgeMs) {
            return false;
          }
        }

        const haystack = `${vacancy.title} ${vacancy.description} ${vacancy.company.name}`.toLowerCase();
        return matchesSearchQuery(haystack, titleNeedle) && matchesSearchQuery(haystack, keywordNeedle);
      })
      .map((vacancy) => ({
        externalJobId: vacancy.id,
        source: "Almiworld Employers",
        sourceType: "live" as const,
        title: vacancy.title,
        company: vacancy.company.name,
        location: buildVacancyLocation(vacancy),
        salaryMin: vacancy.salaryMin ?? undefined,
        salaryMax: vacancy.salaryMax ?? undefined,
        salary:
          typeof vacancy.salaryMin === "number" || typeof vacancy.salaryMax === "number"
            ? `$${vacancy.salaryMin ?? "?"} - $${vacancy.salaryMax ?? "?"}`
            : undefined,
        jobType: vacancy.employmentType ?? undefined,
        remoteStatus: vacancy.remoteMode ?? undefined,
        descriptionSnippet: vacancy.description.replace(/\s+/g, " ").trim().slice(0, 240),
        applyUrl: vacancy.applyUrl || vacancy.company.website || "https://www.almiworld.com",
        postedDate: vacancy.createdAt.toISOString(),
        keywords: buildVacancyKeywords(vacancy),
        providerMetadata: {
          attributionLabel: "Source: Almiworld Employers",
          attributionUrl: vacancy.company.website || "https://www.almiworld.com"
        }
      }));
  } catch (error) {
    log("warn", "Employer vacancy search fallback activated", {
      desiredTitle: input.desiredTitle,
      country: input.country,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return [];
  }
}

export async function getCountryHiringHighlights(country?: string, limit = 4): Promise<CountryHiringHighlights> {
  const targetCountry = (country ?? "").trim() || "Worldwide";

  if (!(await isEmployerSchemaReady())) {
    return {
      ...FALLBACK_COUNTRY_HIRING,
      country: targetCountry
    };
  }

  try {
    const baseWhere =
      targetCountry === "Worldwide"
        ? {
            status: VacancyStatus.ACTIVE
          }
        : {
            status: VacancyStatus.ACTIVE,
            country: targetCountry
          };

    const vacancies = await prisma.vacancy.findMany({
      where: baseWhere,
      include: {
        company: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: Math.max(limit, 1) * 3
    });

    const visibleVacancies = vacancies.slice(0, limit);
    const companyMap = new Map<string, HiringCompanyPreview>();

    for (const vacancy of vacancies) {
      const openRolesForCompany = vacancies.filter(
        (candidate) => candidate.companyId === vacancy.companyId && candidate.status === VacancyStatus.ACTIVE
      );

      if (!companyMap.has(vacancy.companyId)) {
        companyMap.set(vacancy.companyId, {
          id: vacancy.company.id,
          name: vacancy.company.name,
          slug: vacancy.company.slug,
          website: vacancy.company.website,
          country: vacancy.company.country,
          city: vacancy.company.city,
          verified: vacancy.company.verified,
          openRoles: openRolesForCompany.length,
          roleTitles: openRolesForCompany.map((candidate) => candidate.title).filter(Boolean).slice(0, 3)
        });
      }
    }

    return {
      country: targetCountry,
      vacancies: visibleVacancies.map(mapVacancyToPublicPreview),
      companies: Array.from(companyMap.values()).slice(0, limit),
      totalVacancies: vacancies.length,
      totalCompanies: companyMap.size,
      source: "database"
    };
  } catch (error) {
    log("warn", "Country hiring highlights fallback activated", {
      country: targetCountry,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      ...FALLBACK_COUNTRY_HIRING,
      country: targetCountry,
      source: "unavailable"
    };
  }
}
