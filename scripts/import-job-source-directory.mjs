import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(process.cwd(), "src/server/data/job-source-directory.json");

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  if (!Array.isArray(payload)) {
    throw new Error("Source directory payload must be an array.");
  }

  let imported = 0;

  for (const row of payload) {
    if (!row.country || !row.website || !row.url) {
      continue;
    }

    await prisma.jobSourceDirectory.upsert({
      where: {
        country_website: {
          country: row.country,
          website: row.website
        }
      },
      update: {
        region: row.region ?? "Global",
        url: row.url,
        category: row.category ?? "general",
        notes: row.notes ?? "",
        sourcePriority: row.sourcePriority ?? 100,
        hasApi: Boolean(row.hasApi),
        isAggregator: Boolean(row.isAggregator),
        isEmployerBoard: Boolean(row.isEmployerBoard),
        isTrusted: row.isTrusted !== false,
        active: row.active !== false
      },
      create: {
        region: row.region ?? "Global",
        country: row.country,
        website: row.website,
        url: row.url,
        category: row.category ?? "general",
        notes: row.notes ?? "",
        sourcePriority: row.sourcePriority ?? 100,
        hasApi: Boolean(row.hasApi),
        isAggregator: Boolean(row.isAggregator),
        isEmployerBoard: Boolean(row.isEmployerBoard),
        isTrusted: row.isTrusted !== false,
        active: row.active !== false
      }
    });

    imported += 1;
  }

  console.log(`Imported ${imported} job source records from ${inputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
