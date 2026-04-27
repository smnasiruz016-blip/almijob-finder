import { Prisma } from "@prisma/client";
import { getRequiredUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { companyCreateSchema } from "@/lib/validation";
import { createCompanyForUser } from "@/server/services/company-vacancies";

async function findRecoveredCompany(
  userId: string,
  input: {
    name: string;
    website: string | null;
    country: string;
    city: string | null;
  }
) {
  const membership = await prisma.companyUser.findFirst({
    where: {
      userId,
      company: {
        name: input.name,
        website: input.website,
        country: input.country,
        city: input.city
      }
    },
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
      createdAt: "desc"
    }
  });

  if (!membership) {
    return null;
  }

  return {
    id: membership.company.id,
    name: membership.company.name,
    slug: membership.company.slug,
    website: membership.company.website,
    country: membership.company.country,
    city: membership.company.city,
    verified: membership.company.verified,
    membershipRole: membership.role,
    vacancies: membership.company.vacancies.map((vacancy) => ({
      id: vacancy.id,
      title: vacancy.title,
      status: vacancy.status,
      country: vacancy.country,
      city: vacancy.city,
      remoteMode: vacancy.remoteMode,
      employmentType: vacancy.employmentType,
      createdAt: vacancy.createdAt.toISOString()
    }))
  };
}

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = companyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid company payload.");
  }

  const companyInput = {
    name: parsed.data.name,
    website: parsed.data.website || null,
    country: parsed.data.country,
    city: parsed.data.city || null,
    description: parsed.data.description || null
  };

  try {
    const company = await createCompanyForUser(user.id, companyInput);

    return Response.json({
      company,
      message: "Company workspace created. You can start posting vacancies now."
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("You already have a company workspace linked to this account.", 409);
    }

    if (error instanceof Error) {
      if (error.message === "EMPLOYER_SCHEMA_NOT_READY") {
        return jsonError("Employer posting is being activated right now. Try again shortly.", 503);
      }

      if (error.message === "COMPANY_ALREADY_EXISTS") {
        return jsonError("You already have a company workspace linked to this account.", 409);
      }
    }

    const recoveredCompany = await findRecoveredCompany(user.id, companyInput);
    if (recoveredCompany) {
      return Response.json({
        company: recoveredCompany,
        message: "Company workspace created. You can start posting vacancies now."
      });
    }

    return jsonError("We could not create your company workspace right now.", 500);
  }
}
