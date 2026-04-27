"use client";

import { BriefcaseBusiness, Building2, ExternalLink, Globe2, MapPin } from "lucide-react";
import type { CountryBrowseJob, CountryHiringHighlights, CountryRoleSuggestion, JobSourceLink } from "@/types";

type CountryHiringPanelProps = {
  title: string;
  description: string;
  highlights: CountryHiringHighlights;
  trustedSources: JobSourceLink[];
  sampleJobs?: CountryBrowseJob[];
  roleSuggestions?: CountryRoleSuggestion[];
  onRoleSelect?: (role: CountryRoleSuggestion) => void;
  compact?: boolean;
};

function sourceBadges(source: JobSourceLink) {
  const badges = [source.category];

  if (source.hasApi) {
    badges.push("API");
  }

  if (source.isEmployerBoard) {
    badges.push("Employer board");
  } else if (source.isAggregator) {
    badges.push("Aggregator");
  } else if (source.isTrusted) {
    badges.push("Trusted");
  }

  return badges.slice(0, 3);
}

export function CountryHiringPanel({
  title,
  description,
  highlights,
  trustedSources,
  sampleJobs = [],
  roleSuggestions = [],
  onRoleSelect,
  compact = false
}: CountryHiringPanelProps) {
  const showEmployerVacancies = highlights.vacancies.length > 0;
  const showSampleJobs = sampleJobs.length > 0;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
          <Globe2 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Hiring companies</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{highlights.totalCompanies}</p>
        </div>
        <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active local vacancies</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{highlights.totalVacancies}</p>
        </div>
      </div>

      {roleSuggestions.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Popular searches in {highlights.country}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Start with a local role search instead of guessing the exact wording companies use.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {roleSuggestions.map((role) =>
              onRoleSelect ? (
                <button
                  key={`${highlights.country}-${role.desiredTitle}-${role.keyword ?? "base"}`}
                  type="button"
                  onClick={() => onRoleSelect(role)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                >
                  {role.label}
                </button>
              ) : role.href ? (
                <a
                  key={`${highlights.country}-${role.desiredTitle}-${role.keyword ?? "base"}`}
                  href={role.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                >
                  {role.label}
                </a>
              ) : null
            )}
          </div>
        </div>
      ) : null}

      {showEmployerVacancies ? (
        <div className={`mt-5 grid gap-3 ${compact ? "" : "xl:grid-cols-2"}`}>
          {highlights.vacancies.map((vacancy) => (
            <div key={vacancy.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{vacancy.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>{vacancy.company}</span>
                    {vacancy.verifiedCompany ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                        Verified
                      </span>
                    ) : null}
                  </div>
                </div>
                <a
                  href={vacancy.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  View role
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {vacancy.location}
                </span>
                {vacancy.remoteMode ? (
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{vacancy.remoteMode}</span>
                ) : null}
                {vacancy.employmentType ? (
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{vacancy.employmentType}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.25rem] bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
          We do not have direct employer roles live for {highlights.country} yet. Trusted country job websites are listed below while local employer inventory grows.
        </div>
      )}

      {showSampleJobs ? (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Live provider sample jobs in {highlights.country}</p>
          </div>
          <div className={`mt-3 grid gap-3 ${compact ? "" : "xl:grid-cols-2"}`}>
            {sampleJobs.slice(0, compact ? 3 : 4).map((job) => (
              <div key={`${job.source}-${job.externalJobId}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{job.company}</p>
                  </div>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    Open
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{job.source}</span>
                  {job.remoteStatus ? <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{job.remoteStatus}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {highlights.companies.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Featured hiring companies</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {highlights.companies.map((company) => (
              <span key={company.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                {company.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {trustedSources.length > 0 ? (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">Trusted job websites for {highlights.country}</p>
          </div>
          <div className={`mt-3 grid gap-3 ${compact ? "" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {trustedSources.slice(0, compact ? 3 : 6).map((source) => (
              <a
                key={`${highlights.country}-${source.name}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{source.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{source.note}</p>
                  </div>
                  <ExternalLink className="mt-1 h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sourceBadges(source).map((badge) => (
                    <span key={`${source.name}-${badge}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                      {badge}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
