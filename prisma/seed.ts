import { PrismaClient, SubscriptionTier, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@almijobfinder.dev" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@almijobfinder.dev",
      passwordHash,
      role: UserRole.ADMIN,
      subscriptionTier: SubscriptionTier.PRO
    }
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@almijobfinder.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@almijobfinder.dev",
      passwordHash,
      subscriptionTier: SubscriptionTier.FREE
    }
  });

  await prisma.resume.create({
    data: {
      userId: demo.id,
      originalFilename: "demo-resume.pdf",
      storagePath: "seed/demo-resume.pdf",
      mimeType: "application/pdf",
      extractedText:
        "Taylor Morgan\nEmail: demo@almijobfinder.dev\nPhone: 555-010-2001\nSkills: TypeScript, React, Node.js, Prisma, Product Design, Figma, User Research\nExperience: built dashboards, led design system rollout, collaborated with product managers, shipped analytics features\nEducation: BS Computer Science",
      parsedName: "Taylor Morgan",
      parsedEmail: "demo@almijobfinder.dev",
      parsedPhone: "555-010-2001",
      skills: ["TypeScript", "React", "Node.js", "Prisma", "Figma", "User Research"],
      experienceKeywords: ["dashboard", "design system", "analytics", "collaboration"],
      educationKeywords: ["computer science"],
      preferredRoles: ["Product Designer", "Frontend Engineer", "Product Engineer"]
    }
  });

  await prisma.savedSearch.create({
    data: {
      userId: demo.id,
      name: "Remote product roles",
      querySnapshot: {
        desiredTitle: "Product Designer",
        keyword: "figma design systems remote",
        company: "Atlas",
        country: "United States",
        remoteMode: "REMOTE"
      },
      alertsEnabled: true
    }
  });

  console.log(`Seeded admin ${admin.email} and demo ${demo.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
