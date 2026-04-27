#!/usr/bin/env node
// Converts the curated global job-sites xlsx into the JSON shape consumed by
// src/server/services/source-directory.ts and the Prisma JobSourceDirectory model.
//
// Usage:
//   node scripts/convert-job-sites-xlsx.mjs [xlsxPath] [outputJsonPath]
// Defaults:
//   xlsxPath        = scripts/data/global_job_sites_complete_expanded.xlsx
//   outputJsonPath  = src/server/data/job-source-directory.json
//
// Requires `unzip` on PATH (xlsx is just a zip of XML files).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const inputXlsx = path.resolve(process.argv[2] ?? "scripts/data/global_job_sites_complete_expanded.xlsx");
const outputJson = path.resolve(process.argv[3] ?? "src/server/data/job-source-directory.json");

if (!fs.existsSync(inputXlsx)) {
  console.error(`Input xlsx not found: ${inputXlsx}`);
  process.exit(1);
}

const SITE_TYPE_MAP = {
  "Global":            { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 10 },
  "Global aggregator": { category: "aggregator",   isAggregator: true,  isEmployerBoard: false, sourcePriority: 20 },
  "Local":             { category: "general",      isAggregator: false, isEmployerBoard: false, sourcePriority: 30 },
  "Global directory":  { category: "general",      isAggregator: false, isEmployerBoard: false, sourcePriority: 80 },
  "Government":        { category: "government",   isAggregator: false, isEmployerBoard: true,  sourcePriority: 80 },
  "Regional":          { category: "general",      isAggregator: false, isEmployerBoard: false, sourcePriority: 50 },
  "Remote":            { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 20 },
  "Freelance":         { category: "professional", isAggregator: false, isEmployerBoard: true,  sourcePriority: 30 },
  "Professional":      { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 20 },
  "International":     { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 20 },
  "Local/Niche":       { category: "general",      isAggregator: false, isEmployerBoard: false, sourcePriority: 30 },
  "Local aggregator":  { category: "aggregator",   isAggregator: true,  isEmployerBoard: false, sourcePriority: 30 },
  "Visa sponsorship":  { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 30 },
  "Tech/startup":      { category: "professional", isAggregator: false, isEmployerBoard: false, sourcePriority: 20 }
};

const HAS_API_ALLOWLIST = new Set(["jooble", "remoteok", "remote ok", "adzuna", "usajobs", "reed"]);
const GLOBAL_REGION_PREFIXES = new Set(["Global / Remote", "Global / Tech", "Global / Freelance"]);

function hasApiFor(website) {
  return HAS_API_ALLOWLIST.has(website.trim().toLowerCase());
}

function normalizeRegionCountry(region, country) {
  const r = (region ?? "").trim();
  const c = (country ?? "").trim();
  if (GLOBAL_REGION_PREFIXES.has(r)) {
    return { region: "Worldwide", country: "Worldwide" };
  }
  return { region: r, country: c };
}

function extractXlsxToTmp(xlsxPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xlsx-"));
  execFileSync("unzip", ["-o", "-q", xlsxPath, "-d", tmpDir]);
  return tmpDir;
}

function parseSheet(xml) {
  const rowRe = /<x:row[^>]*>([\s\S]*?)<\/x:row>/g;
  const cellRe = /<x:c r="([A-Z]+)\d+"[^>]*?(?:t="(\w+)")?[^>]*>(?:<x:v>([\s\S]*?)<\/x:v>)?<\/x:c>/g;
  const rows = [];
  let m;
  while ((m = rowRe.exec(xml)) !== null) {
    const cells = {};
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells[c[1]] = (c[3] ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    }
    rows.push(cells);
  }
  return rows;
}

function transform(rows) {
  const out = [];
  const skipped = [];
  const unknownTypes = new Map();

  for (const row of rows) {
    const region = (row.A ?? "").trim();
    const countryRaw = (row.B ?? "").trim();
    const website = (row.C ?? "").trim();
    const url = (row.D ?? "").trim();
    const siteType = (row.E ?? "").trim();
    const notes = (row.F ?? "").trim();

    if (!website || !url || !countryRaw) {
      skipped.push({ reason: "missing required field", row: { region, country: countryRaw, website, url } });
      continue;
    }

    const mapping = SITE_TYPE_MAP[siteType];
    if (!mapping) {
      unknownTypes.set(siteType, (unknownTypes.get(siteType) ?? 0) + 1);
      skipped.push({ reason: `unknown site type "${siteType}"`, row: { region, country: countryRaw, website, url } });
      continue;
    }

    const { region: normRegion, country: normCountry } = normalizeRegionCountry(region, countryRaw);

    out.push({
      region: normRegion,
      country: normCountry,
      website,
      url,
      category: mapping.category,
      notes,
      sourcePriority: mapping.sourcePriority,
      hasApi: hasApiFor(website),
      isAggregator: mapping.isAggregator,
      isEmployerBoard: mapping.isEmployerBoard,
      isTrusted: true,
      active: true
    });
  }

  return { out, skipped, unknownTypes };
}

function summarize(records) {
  const byCategory = new Map();
  const countries = new Set();
  for (const r of records) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
    countries.add(r.country);
  }
  return { total: records.length, countries: countries.size, categoryBreakdown: Object.fromEntries([...byCategory.entries()].sort()) };
}

let tmpDir;
try {
  tmpDir = extractXlsxToTmp(inputXlsx);
  const sheetPath = path.join(tmpDir, "xl", "worksheets", "sheet1.xml");
  if (!fs.existsSync(sheetPath)) {
    throw new Error(`sheet1.xml not found in extracted xlsx: ${inputXlsx}`);
  }
  const xml = fs.readFileSync(sheetPath, "utf8");
  const allRows = parseSheet(xml);
  const dataRows = allRows.slice(1);

  const { out, skipped, unknownTypes } = transform(dataRows);

  fs.writeFileSync(outputJson, JSON.stringify(out, null, 2) + "\n", "utf8");

  const summary = summarize(out);
  console.log("=".repeat(60));
  console.log(`Wrote ${outputJson}`);
  console.log("=".repeat(60));
  console.log(`Input rows (excl header): ${dataRows.length}`);
  console.log(`Output rows:              ${out.length}`);
  console.log(`Skipped:                  ${skipped.length}`);
  console.log(`Distinct countries:       ${summary.countries}`);
  console.log(`\nCategory breakdown:`);
  for (const [cat, n] of Object.entries(summary.categoryBreakdown)) {
    console.log(`  ${cat.padEnd(14)} ${n}`);
  }
  if (unknownTypes.size > 0) {
    console.log(`\nUnknown Site Types encountered:`);
    for (const [t, n] of unknownTypes) console.log(`  "${t}": ${n}`);
  }
  if (skipped.length > 0 && skipped.length <= 10) {
    console.log(`\nSkipped rows (showing all):`);
    for (const s of skipped) console.log(`  - ${s.reason}: ${JSON.stringify(s.row)}`);
  } else if (skipped.length > 10) {
    console.log(`\nFirst 10 skipped rows:`);
    for (const s of skipped.slice(0, 10)) console.log(`  - ${s.reason}: ${JSON.stringify(s.row)}`);
  }
} finally {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
}
