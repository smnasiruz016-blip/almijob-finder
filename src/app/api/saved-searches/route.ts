import { getRequiredUser } from "@/lib/auth";
import { trackProductEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { canUseAlerts } from "@/lib/plans";
import { saveSearchSchema, updateSavedSearchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = saveSearchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid saved search payload.");
  }

  const desiredTitle =
    typeof parsed.data.querySnapshot?.desiredTitle === "string"
      ? parsed.data.querySnapshot.desiredTitle.trim()
      : "";

  if (!desiredTitle) {
    return jsonError("Add a job title before saving this search.");
  }

  const alertsEnabled = canUseAlerts(user.subscriptionTier) ? parsed.data.alertsEnabled : false;

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      querySnapshot: parsed.data.querySnapshot,
      alertsEnabled,
      alertFrequency: parsed.data.alertFrequency
    }
  });

  await trackProductEvent({
    name: "search_saved",
    userId: user.id,
    properties: {
      savedSearchId: savedSearch.id,
      alertsEnabled: savedSearch.alertsEnabled,
      alertFrequency: savedSearch.alertFrequency,
      desiredTitle
    }
  });

  return Response.json({
    savedSearch,
    message: canUseAlerts(user.subscriptionTier)
      ? "Search saved. Daily alert checks will follow your current preference."
      : "Search saved. You can turn on alerts later with Pro."
  });
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
    return jsonError("Saved search id is required.");
  }

  await prisma.savedSearch.deleteMany({
    where: {
      id,
      userId: user.id
    }
  });

  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const body = await request.json();
  const parsed = updateSavedSearchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid saved search update.");
  }

  const existing = await prisma.savedSearch.findFirst({
    where: {
      id: parsed.data.id,
      userId: user.id
    }
  });

  if (!existing) {
    return jsonError("Saved search not found.", 404);
  }

  const alertsAllowed = canUseAlerts(user.subscriptionTier);
  const alertsEnabled = alertsAllowed ? parsed.data.alertsEnabled ?? existing.alertsEnabled : false;
  const alertFrequency = alertsAllowed ? parsed.data.alertFrequency ?? existing.alertFrequency : existing.alertFrequency;

  const savedSearch = await prisma.savedSearch.update({
    where: { id: existing.id },
    data: {
      alertsEnabled,
      alertFrequency
    }
  });

  await trackProductEvent({
    name: "alert_toggled",
    userId: user.id,
    properties: {
      savedSearchId: savedSearch.id,
      alertsEnabled: savedSearch.alertsEnabled,
      alertFrequency: savedSearch.alertFrequency
    }
  });

  return Response.json({
    savedSearch,
    message: alertsAllowed
      ? alertsEnabled
        ? `${alertFrequency === "WEEKLY" ? "Weekly" : "Daily"} alerts are now active for this search.`
        : "Alerts are now paused for this search."
      : "Alerts are available on Pro. Your saved search is still available any time."
  });
}
