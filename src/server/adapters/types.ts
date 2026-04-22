import type { JobSearchInput, NormalizedJob } from "@/types";

export interface JobSourceAdapter {
  source: string;
  sourceType?: "live" | "mock";
  isEnabled(): boolean;
  searchJobs(input: JobSearchInput): Promise<NormalizedJob[]>;
}
