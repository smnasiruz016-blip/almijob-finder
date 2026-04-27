"use client";

import { FormEvent, useMemo, useState } from "react";
import { Building2, BriefcaseBusiness, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_OPTIONS } from "@/lib/location-data";
import type { EmployerWorkspace } from "@/types";

type EmployerShellProps = {
  workspace: EmployerWorkspace;
};

type InlineStatus =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function EmployerShell({ workspace }: EmployerShellProps) {
  const [localWorkspace, setLocalWorkspace] = useState(workspace);
  const [companyStatus, setCompanyStatus] = useState<InlineStatus>({ type: "idle" });
  const [vacancyStatus, setVacancyStatus] = useState<InlineStatus>({ type: "idle" });
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null);
  const primaryCompany = localWorkspace.companies[0] ?? null;
  const editingVacancy = primaryCompany?.vacancies.find((vacancy) => vacancy.id === editingVacancyId) ?? null;

  const employerSummary = useMemo(() => {
    const companies = localWorkspace.companies.length;
    const vacancies = localWorkspace.companies.flatMap((company) => company.vacancies).length;
    return { companies, vacancies };
  }, [localWorkspace]);

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyStatus({ type: "idle" });
    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/employer/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const data = await response.json();

    if (!response.ok) {
      setCompanyStatus({ type: "error", message: data.error ?? "We could not create your company workspace right now." });
      return;
    }

    setLocalWorkspace((current) => ({
      ready: true,
      canCreateCompany: false,
      source: current.source,
      companies: [
        {
          ...data.company,
          vacancies: data.company.vacancies ?? []
        }
      ]
    }));
    setCompanyStatus({ type: "success", message: data.message ?? "Company workspace created." });
    event.currentTarget.reset();
  }

  async function handleCreateVacancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVacancyStatus({ type: "idle" });
    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/employer/vacancies", {
      method: editingVacancy ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(formData.entries()),
        ...(editingVacancy ? { vacancyId: editingVacancy.id } : {})
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setVacancyStatus({ type: "error", message: data.error ?? "We could not save that vacancy right now." });
      return;
    }

    setLocalWorkspace((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === data.vacancy.companyId
          ? {
              ...company,
              vacancies: editingVacancy
                ? company.vacancies.map((vacancy) =>
                    vacancy.id === data.vacancy.id
                      ? {
                          ...vacancy,
                          ...data.vacancy
                        }
                      : vacancy
                  )
                : [
                    {
                      id: data.vacancy.id,
                      companyId: data.vacancy.companyId,
                      title: data.vacancy.title,
                      description: data.vacancy.description,
                      status: data.vacancy.status,
                      country: data.vacancy.country,
                      state: data.vacancy.state,
                      city: data.vacancy.city,
                      remoteMode: data.vacancy.remoteMode,
                      employmentType: data.vacancy.employmentType,
                      salaryMin: data.vacancy.salaryMin,
                      salaryMax: data.vacancy.salaryMax,
                      applyUrl: data.vacancy.applyUrl,
                      createdAt: data.vacancy.createdAt,
                      updatedAt: data.vacancy.updatedAt
                    },
                    ...company.vacancies
                  ]
            }
          : company
      )
    }));
    setVacancyStatus({ type: "success", message: data.message ?? (editingVacancy ? "Vacancy updated." : "Vacancy saved.") });
    setEditingVacancyId(null);
    event.currentTarget.reset();
  }

  async function handleQuickStatusChange(vacancyId: string, status: "DRAFT" | "ACTIVE" | "CLOSED") {
    if (!primaryCompany) {
      return;
    }

    const target = primaryCompany.vacancies.find((vacancy) => vacancy.id === vacancyId);
    if (!target) {
      return;
    }

    setVacancyStatus({ type: "idle" });

    const response = await fetch("/api/employer/vacancies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vacancyId: target.id,
        companyId: target.companyId,
        title: target.title,
        description: target.description,
        country: target.country,
        state: target.state ?? "",
        city: target.city ?? "",
        remoteMode: target.remoteMode ?? "",
        employmentType: target.employmentType ?? "",
        salaryMin: target.salaryMin ?? "",
        salaryMax: target.salaryMax ?? "",
        applyUrl: target.applyUrl ?? "",
        status
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setVacancyStatus({ type: "error", message: data.error ?? "We could not update that vacancy right now." });
      return;
    }

    setLocalWorkspace((current) => ({
      ...current,
      companies: current.companies.map((company) =>
        company.id === data.vacancy.companyId
          ? {
              ...company,
              vacancies: company.vacancies.map((vacancy) =>
                vacancy.id === data.vacancy.id
                  ? {
                      ...vacancy,
                      ...data.vacancy
                    }
                  : vacancy
              )
            }
          : company
      )
    }));
    setVacancyStatus({ type: "success", message: data.message ?? "Vacancy updated." });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="eyebrow">Employer workspace</span>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
                Post vacancies directly on Almiworld
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                This is the first direct-employer layer for Job Finder. Create your company workspace, post roles, and start building owned job inventory inside the platform.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Company workspaces</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{employerSummary.companies}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Posted vacancies</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{employerSummary.vacancies}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">What this unlocks</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>- Direct employer jobs on Almiworld, not only third-party provider inventory.</li>
              <li>- Stronger local country coverage as companies add their own vacancies.</li>
              <li>- A cleaner path to future verified employers, paid vacancy promotion, and hiring pages.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Activation status</p>
                <p className="text-sm text-slate-500">
                  {localWorkspace.ready
                    ? "Employer database support is active."
                    : "Employer database support is being activated. Create/post actions may be temporarily limited."}
                </p>
              </div>
            </div>
          </div>

          {localWorkspace.canCreateCompany ? (
            <form onSubmit={handleCreateCompany} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-semibold text-slate-900">Create your company workspace</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start with one company profile. You can add verified employer workflows and more advanced team management later.
              </p>
              <div className="mt-5 grid gap-4">
                <Input name="name" placeholder="Company name" required />
                <Input name="website" placeholder="Company website (optional)" />
                <Select name="country" defaultValue="Worldwide">
                  {COUNTRY_OPTIONS.filter((country) => country !== "Worldwide").map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
                <Input name="city" placeholder="City (optional)" />
                <Textarea name="description" placeholder="Short company description (optional)" rows={4} />
              </div>
              {companyStatus.type !== "idle" ? (
                <div className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${companyStatus.type === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                  {companyStatus.message}
                </div>
              ) : null}
              <Button type="submit" className="mt-5">
                Create company workspace
              </Button>
            </form>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-semibold text-slate-900">Primary company</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{primaryCompany?.name ?? "No company yet"}</p>
              <p className="mt-2 text-sm text-slate-500">
                {[primaryCompany?.city, primaryCompany?.country].filter(Boolean).join(", ")}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Membership role: {primaryCompany?.membershipRole ?? "N/A"}{primaryCompany?.verified ? " - verified employer" : ""}
              </p>
            </div>
          )}
        </div>
      </section>

      {primaryCompany ? (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleCreateVacancy} className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{editingVacancy ? "Edit vacancy" : "Post a vacancy"}</p>
                <p className="text-sm text-slate-500">
                  {editingVacancy
                    ? "Update the role details and control whether it stays active, returns to draft, or closes cleanly."
                    : "Create a direct employer role that can become part of Almiworld&apos;s owned inventory. Active vacancies appear in search, while drafts stay private."}
                </p>
              </div>
            </div>

            <input type="hidden" name="companyId" value={primaryCompany.id} />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input name="title" placeholder="Job title" required defaultValue={editingVacancy?.title ?? ""} />
              <Select name="status" defaultValue={editingVacancy?.status ?? "ACTIVE"}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </Select>
              <Select name="country" defaultValue={editingVacancy?.country ?? primaryCompany.country}>
                {COUNTRY_OPTIONS.filter((country) => country !== "Worldwide").map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Select>
              <Input name="state" placeholder="State / region (optional)" defaultValue={editingVacancy?.state ?? ""} />
              <Input name="city" placeholder="City (optional)" defaultValue={editingVacancy?.city ?? primaryCompany.city ?? ""} />
              <Select name="remoteMode" defaultValue={editingVacancy?.remoteMode ?? ""}>
                <option value="">Remote preference</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
                <option value="FLEXIBLE">Flexible</option>
              </Select>
              <Select name="employmentType" defaultValue={editingVacancy?.employmentType ?? ""}>
                <option value="">Employment type</option>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="TEMPORARY">Temporary</option>
              </Select>
              <Input name="salaryMin" placeholder="Salary min (optional)" defaultValue={editingVacancy?.salaryMin ?? ""} />
              <Input name="salaryMax" placeholder="Salary max (optional)" defaultValue={editingVacancy?.salaryMax ?? ""} />
              <Input name="applyUrl" placeholder="Apply URL (optional)" className="md:col-span-2" defaultValue={editingVacancy?.applyUrl ?? ""} />
              <Textarea
                name="description"
                placeholder="Describe the vacancy, responsibilities, and key requirements."
                rows={8}
                className="md:col-span-2"
                required
                defaultValue={editingVacancy?.description ?? ""}
              />
            </div>

            {vacancyStatus.type !== "idle" ? (
              <div className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${vacancyStatus.type === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
                {vacancyStatus.message}
              </div>
            ) : null}

            <div className="mt-4 rounded-[1.25rem] bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {editingVacancy ? (
                <>
                  You are editing a live employer role. Save it as <span className="font-semibold">Active</span> to keep it visible, or move it to Draft / Closed as needed.
                </>
              ) : (
                <>
                  New vacancies default to <span className="font-semibold">Active</span> so they can appear in search right away.
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit">{editingVacancy ? "Update vacancy" : "Post vacancy"}</Button>
              {editingVacancy ? (
                <Button type="button" variant="secondary" onClick={() => setEditingVacancyId(null)}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="font-semibold text-slate-900">Your posted roles</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              These are the vacancies currently attached to your company workspace.
            </p>

            <div className="mt-5 space-y-3">
              {primaryCompany.vacancies.length > 0 ? (
                primaryCompany.vacancies.map((vacancy) => (
                  <div key={vacancy.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{vacancy.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {[vacancy.city, vacancy.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {vacancy.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vacancy.remoteMode ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {vacancy.remoteMode}
                        </span>
                      ) : null}
                      {vacancy.employmentType ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {vacancy.employmentType}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setEditingVacancyId(vacancy.id)}>
                        Edit vacancy
                      </Button>
                      {vacancy.status !== "ACTIVE" ? (
                        <Button type="button" variant="secondary" onClick={() => void handleQuickStatusChange(vacancy.id, "ACTIVE")}>
                          Make active
                        </Button>
                      ) : null}
                      {vacancy.status !== "DRAFT" ? (
                        <Button type="button" variant="secondary" onClick={() => void handleQuickStatusChange(vacancy.id, "DRAFT")}>
                          Save as draft
                        </Button>
                      ) : null}
                      {vacancy.status !== "CLOSED" ? (
                        <Button type="button" variant="secondary" onClick={() => void handleQuickStatusChange(vacancy.id, "CLOSED")}>
                          Close role
                        </Button>
                      ) : null}
                    </div>
                    {vacancy.status !== "ACTIVE" ? (
                      <p className="mt-3 text-xs leading-6 text-amber-700">
                        This vacancy is not live in search yet. Switch it to Active whenever you want it discoverable.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs leading-6 text-emerald-700">
                        This vacancy is live and eligible to appear in Almiworld search results.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  No vacancies posted yet. Start with one direct employer role and this panel will track it here.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
