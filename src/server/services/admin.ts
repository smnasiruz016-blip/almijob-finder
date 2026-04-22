import { prisma } from "@/lib/prisma";

export async function getAdminStats() {
  const [users, resumes, searches, savedJobs, savedSearches, freeUsers, proUsers] = await Promise.all([
    prisma.user.count(),
    prisma.resume.count(),
    prisma.jobSearch.count(),
    prisma.savedJob.count(),
    prisma.savedSearch.count(),
    prisma.user.count({ where: { subscriptionTier: "FREE" } }),
    prisma.user.count({ where: { subscriptionTier: "PRO" } })
  ]);

  return {
    users,
    resumes,
    searches,
    savedJobs,
    savedSearches,
    freeUsers,
    proUsers
  };
}

export async function getAdminRecentActivity() {
  const [recentUsers, recentSearches] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        createdAt: true
      }
    }),
    prisma.jobSearch.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        desiredTitle: true,
        country: true,
        company: true,
        keyword: true,
        createdAt: true
      }
    })
  ]);

  return {
    recentUsers,
    recentSearches
  };
}
