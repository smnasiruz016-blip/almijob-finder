import { getRequiredUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { vacancyCreateSchema, vacancyUpdateSchema } from "@/lib/validation";
import { createVacancyForUser, updateVacancyForUser } from "@/server/services/company-vacancies";

async function findRecoveredVacancy(
  userId: string,
  input: {
    companyId: string;
    title: string;
    description: string;
    country: string;
    state: string | null;
    city: string | null;
    remoteMode: "REMOTE" | "HYBRID" | "ONSITE" | "FLEXIBLE" | null;
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY" | null;
    salaryMin: number | null;
    salaryMax: number | null;
    applyUrl: string | null;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
  }
) {
  return prisma.vacancy.findFirst({
    where: {
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      country: input.country,
      state: input.state,
      city: input.city,
      remoteMode: input.remoteMode,
      employmentType: input.employmentType,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      applyUrl: input.applyUrl,
      status: input.status,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000)
      },
      company: {
        users: {
          some: {
            userId
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = vacancyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid vacancy payload.");
  }

  const vacancyInput = {
    companyId: parsed.data.companyId,
    title: parsed.data.title,
    description: parsed.data.description,
    country: parsed.data.country,
    state: parsed.data.state || null,
    city: parsed.data.city || null,
    remoteMode: parsed.data.remoteMode ?? null,
    employmentType: parsed.data.employmentType ?? null,
    salaryMin: parsed.data.salaryMin ?? null,
    salaryMax: parsed.data.salaryMax ?? null,
    applyUrl: parsed.data.applyUrl || null,
    status: parsed.data.status
  };

  try {
    const vacancy = await createVacancyForUser(user.id, vacancyInput);

    return Response.json({
      vacancy,
      message: vacancy.status === "ACTIVE" ? "Vacancy posted live." : "Vacancy saved as draft."
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMPLOYER_SCHEMA_NOT_READY") {
        return jsonError("Employer posting is being activated right now. Try again shortly.", 503);
      }

      if (error.message === "COMPANY_ACCESS_DENIED") {
        return jsonError("You do not have access to post vacancies for that company.", 403);
      }
    }

    const recoveredVacancy = await findRecoveredVacancy(user.id, vacancyInput);
    if (recoveredVacancy) {
      return Response.json({
        vacancy: recoveredVacancy,
        message: recoveredVacancy.status === "ACTIVE" ? "Vacancy posted live." : "Vacancy saved as draft."
      });
    }

    return jsonError("We could not save that vacancy right now.", 500);
  }
}

export async function PATCH(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = vacancyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid vacancy payload.");
  }

  const vacancyInput = {
    vacancyId: parsed.data.vacancyId,
    companyId: parsed.data.companyId,
    title: parsed.data.title,
    description: parsed.data.description,
    country: parsed.data.country,
    state: parsed.data.state || null,
    city: parsed.data.city || null,
    remoteMode: parsed.data.remoteMode ?? null,
    employmentType: parsed.data.employmentType ?? null,
    salaryMin: parsed.data.salaryMin ?? null,
    salaryMax: parsed.data.salaryMax ?? null,
    applyUrl: parsed.data.applyUrl || null,
    status: parsed.data.status
  };

  try {
    const vacancy = await updateVacancyForUser(user.id, vacancyInput);

    return Response.json({
      vacancy,
      message:
        vacancy.status === "ACTIVE"
          ? "Vacancy updated and live in search."
          : vacancy.status === "CLOSED"
            ? "Vacancy closed."
            : "Vacancy saved as draft."
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMPLOYER_SCHEMA_NOT_READY") {
        return jsonError("Employer posting is being activated right now. Try again shortly.", 503);
      }

      if (error.message === "COMPANY_ACCESS_DENIED") {
        return jsonError("You do not have access to edit vacancies for that company.", 403);
      }

      if (error.message === "VACANCY_NOT_FOUND") {
        return jsonError("We could not find that vacancy.", 404);
      }
    }

    return jsonError("We could not update that vacancy right now.", 500);
  }
}
