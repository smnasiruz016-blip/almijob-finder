import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyRange(min?: number, max?: number) {
  if (!min && !max) {
    return "Not listed";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }

  if (min) {
    return `From ${formatter.format(min)}`;
  }

  return `Up to ${formatter.format(max!)}`;
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
