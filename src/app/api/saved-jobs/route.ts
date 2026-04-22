import { getRequiredUser } from "@/lib/auth";
import { trackProductEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { savedJobSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = savedJobSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Job payload is incomplete.");
  }

  const job = parsed.data;

  const savedJob = await prisma.savedJob.upsert({
    where: {
      userId_externalJobId_source: {
        userId: user.id,
        externalJobId: job.externalJobId,
        source: job.source
      }
    },
    update: {
      payload: job
    },
    create: {
      userId: user.id,
      externalJobId: job.externalJobId,
      source: job.source,
      title: job.title,
      company: job.company,
      location: job.location,
      applyUrl: job.applyUrl,
      payload: job
    }
  });

  await trackProductEvent({
    name: "job_saved",
    userId: user.id,
    properties: {
      source: job.source,
      externalJobId: job.externalJobId,
      title: job.title,
      company: job.company
    }
  });

  return Response.json({ savedJob });
}

export async function DELETE(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return jsonError("Saved job id is required.");
  }

  await prisma.savedJob.deleteMany({
    where: {
      id,
      userId: user.id
    }
  });

  return Response.json({ ok: true });
}
