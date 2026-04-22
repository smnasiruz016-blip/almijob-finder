import { EmploymentType, RemoteMode } from "@prisma/client";
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must include one uppercase letter")
    .regex(/[a-z]/, "Must include one lowercase letter")
    .regex(/[0-9]/, "Must include one number")
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const jobSearchSchema = z.object({
  desiredTitle: z.string().trim().min(2).max(120),
  keyword: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  remoteMode: z.preprocess((value) => (value === "" ? undefined : value), z.nativeEnum(RemoteMode).optional()),
  employmentType: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.nativeEnum(EmploymentType).optional()
  ),
  postedWithinDays: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(1).max(60).optional()
  ),
  salaryMin: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().min(0).optional()),
  salaryMax: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().int().min(0).optional())
}).refine((data) => !data.salaryMin || !data.salaryMax || data.salaryMax >= data.salaryMin, {
  message: "Salary max must be greater than or equal to salary min.",
  path: ["salaryMax"]
});

export const saveSearchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  alertsEnabled: z.boolean().default(false),
  alertFrequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  querySnapshot: z.record(z.any())
});

export const updateSavedSearchSchema = z.object({
  id: z.string().trim().min(1),
  alertsEnabled: z.boolean().optional(),
  alertFrequency: z.enum(["DAILY", "WEEKLY"]).optional()
});

export const savedJobSchema = z.object({
  externalJobId: z.string().trim().min(1),
  source: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(160),
  company: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(160),
  applyUrl: z.string().trim().url(),
  descriptionSnippet: z.string().trim().min(1).max(500).optional(),
  keywords: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  sourceType: z.enum(["live", "mock"]).optional(),
  providerMetadata: z
    .object({
      attributionLabel: z.string().trim().min(1).max(120),
      attributionUrl: z.string().trim().url().optional()
    })
    .optional(),
  salary: z.string().trim().max(120).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  jobType: z.string().trim().max(80).optional(),
  remoteStatus: z.string().trim().max(80).optional(),
  postedDate: z.string().datetime().optional(),
  matchScore: z.number().int().min(0).max(100).optional(),
  matchReasons: z.array(z.string().trim().min(1).max(160)).max(12).optional(),
  missingKeywords: z.array(z.string().trim().min(1).max(120)).max(20).optional()
}).refine((data) => !data.salaryMin || !data.salaryMax || data.salaryMax >= data.salaryMin, {
  message: "Salary max must be greater than or equal to salary min.",
  path: ["salaryMax"]
});
