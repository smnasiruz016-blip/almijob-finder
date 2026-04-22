import { BookmarkPlus, ExternalLink, MapPin, TimerReset, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchScore } from "@/components/dashboard/match-score";
import { formatCurrencyRange } from "@/lib/utils";
import type { RankedJob } from "@/types";

type JobCardProps = {
  job: RankedJob;
  selected: boolean;
  onInspect: (job: RankedJob) => void;
  onSave: (job: RankedJob) => void;
};

function getFreshnessLabel(postedDate?: string) {
  if (!postedDate) {
    return "Posting date unavailable";
  }

  const ageInDays = Math.floor((Date.now() - new Date(postedDate).getTime()) / (24 * 60 * 60 * 1000));

  if (ageInDays <= 7) {
    return "Posted recently";
  }

  return "Older posting";
}

function getSourceLabel(sourceType?: RankedJob["sourceType"]) {
  return sourceType === "live" ? "Source: Remote provider" : "Source: Fallback provider";
}

export function JobCard({ job, selected, onInspect, onSave }: JobCardProps) {
  const metadataPills = [
    job.providerMetadata?.attributionLabel ?? getSourceLabel(job.sourceType),
    getFreshnessLabel(job.postedDate),
    typeof job.salaryMin === "number" || typeof job.salaryMax === "number" ? "Salary listed" : "No salary listed"
  ];

  return (
    <article
      className={`rounded-[1.75rem] border bg-white p-5 shadow-sm transition ${
        selected ? "border-teal-400 ring-4 ring-teal-100" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.source}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.remoteStatus ?? "Flexible"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.jobType ?? "Open"}</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{job.title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-700">{job.company}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {formatCurrencyRange(job.salaryMin, job.salaryMax)}
            </span>
            {job.postedDate && (
              <span className="inline-flex items-center gap-2">
                <TimerReset className="h-4 w-4" />
                {new Date(job.postedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="w-full max-w-[220px]">
          <MatchScore score={job.matchScore} reasons={job.matchReasons} />
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-600">{job.descriptionSnippet}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {metadataPills.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Why it matched</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {job.matchReasons.map((reason) => (
          <span key={reason} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
            {reason}
          </span>
        ))}
        {job.missingKeywords.slice(0, 2).map((keyword) => (
          <span key={keyword} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            Missing: {keyword}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => onInspect(job)}>
          Inspect fit
        </Button>
        <Button type="button" onClick={() => onSave(job)}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Save job
        </Button>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Open listing
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
