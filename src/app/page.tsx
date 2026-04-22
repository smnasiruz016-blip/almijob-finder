import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, SearchCode, UploadCloud } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your resume",
    description: "Import a PDF or DOCX resume and extract skills, roles, education, and experience keywords."
  },
  {
    icon: SearchCode,
    title: "Search smarter",
    description: "Combine role title, keywords, worldwide or country filters, remote preference, and salary filters in one search."
  },
  {
    icon: BarChart3,
    title: "Apply with confidence",
    description: "Review match scores, understand why a job fits, and improve your resume before you apply."
  }
];

const benefits = [
  "Resume-aware ranking that explains why jobs match",
  "Live-ready adapter system with a real provider and safe fallback data",
  "Saved jobs, saved searches, and alert-ready workflow",
  "Freemium-ready usage tracking and launch-minded product UX"
];

const capabilityList = [
  "Worldwide or country-based search flow",
  "Resume-guided ranking and fit explanations",
  "Saved jobs, saved searches, and alert prep",
  "Multiple providers with graceful fallback",
  "Mobile-friendly dashboard experience",
  "Freemium-ready usage and upgrade hooks"
];

const productSignals = [
  { label: "Search modes", value: "Worldwide + local" },
  { label: "Provider model", value: "Live + fallback adapters" },
  { label: "Ranking style", value: "Resume-aware and explainable" },
  { label: "Launch posture", value: "Freemium-ready" }
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/signup";
  const uploadHref = user ? "/dashboard#search" : "/signup";

  return (
    <main className="pb-20">
      <section className="page-shell pt-8 md:pt-12">
        <nav className="glass-panel flex flex-col gap-4 rounded-[2rem] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Image src="/brand/almi-latest.png" alt="Almiworld" width={170} height={60} className="h-auto w-[140px] md:w-[170px]" />
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-950">AlmiJob Finder</p>
                <p className="text-sm text-slate-500">almiworld&apos;s advanced job discovery product with resume-first matching.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {!user && (
              <Link href="/login" className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100">
                Log in
              </Link>
            )}
            <Link
              href={primaryHref}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-white transition hover:bg-slate-800"
            >
              {user ? "Open dashboard" : "Start free"}
            </Link>
          </div>
        </nav>

        <div className="grid gap-8 pb-16 pt-10 md:grid-cols-[1.08fr_0.92fr] md:items-center md:pt-16">
          <div className="space-y-6">
            <span className="eyebrow">Launch-ready job search</span>
            <div className="space-y-4">
              <h1 className="section-title max-w-4xl font-[family-name:var(--font-display)]">
                Find Jobs Faster Using Your Resume
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                AlmiJob Finder turns your resume into a job-search advantage with ranked matches, clear fit explanations,
                resume improvement suggestions, worldwide filtering, and alert-ready saved searches.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 font-medium text-white transition hover:bg-teal-800"
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={uploadHref}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Upload Resume
                <UploadCloud className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-teal-700" />
                  <p className="text-sm font-medium text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Best match preview</p>
                  <p className="mt-2 text-xl font-semibold">Senior Product Designer</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200">
                  92/100
                </span>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[92%] rounded-full bg-emerald-400" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] bg-white/8 p-4">
                  <p className="text-sm font-semibold text-white">Why it matched</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                    <li>- Title aligns with your target role</li>
                    <li>- Strong overlap in Figma, design systems, and research keywords</li>
                    <li>- Hybrid preference and location both fit</li>
                  </ul>
                </div>
                <div className="rounded-[1.25rem] bg-white/8 p-4">
                  <p className="text-sm font-semibold text-white">Resume tips</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                    <li>- Highlight design system ownership earlier</li>
                    <li>- Add measurable outcomes to product work</li>
                    <li>- Mirror the role&apos;s collaboration language</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-panel rounded-[2rem] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell pt-2">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {productSignals.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] bg-white/85 px-5 py-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell pt-2">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilityList.map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-white/80 px-5 py-4">
              <p className="text-sm font-medium text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-shell pt-6">
        <div className="grid gap-6 rounded-[2rem] bg-slate-950 px-6 py-8 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Why teams choose it</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">
              A cleaner path from resume to relevant roles
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Built for launch readiness with safer provider integration, explainable ranking, freemium hooks, and a UI
              that helps users recover when searches or uploads fail.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-medium text-slate-950 transition hover:bg-slate-100"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={uploadHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Upload Resume
              <BriefcaseBusiness className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
