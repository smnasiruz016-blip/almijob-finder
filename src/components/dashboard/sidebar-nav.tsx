import Image from "next/image";
import Link from "next/link";
import { BarChart3, BellRing, Bookmark, FileSearch2, Shield, Sparkles } from "lucide-react";
import { canUseAlerts, canUseResumeInsights, hasUnlimitedSearches } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

type SidebarNavProps = {
  user: SessionUser;
  className?: string;
};

const overviewItem = { href: "/dashboard", label: "Overview", icon: BarChart3 } as const;

const sectionItems = [
  { href: "#search", label: "Job Search", icon: FileSearch2 },
  { href: "#saved", label: "Saved Jobs", icon: Bookmark },
  { href: "#insights", label: "Resume Insights", icon: Sparkles },
  { href: "#alerts", label: "Alerts", icon: BellRing }
] as const;

export function SidebarNav({ user, className }: SidebarNavProps) {
  const OverviewIcon = overviewItem.icon;
  const unlimitedSearches = hasUnlimitedSearches(user.subscriptionTier);
  const alertsEnabled = canUseAlerts(user.subscriptionTier);
  const resumeInsightsEnabled = canUseResumeInsights(user.subscriptionTier);

  return (
    <aside className={cn("glass-panel rounded-[2rem] p-5", className)}>
      <div className="border-b border-slate-200 pb-5">
        <Image src="/brand/almi-latest.png" alt="Almiworld" width={180} height={70} className="h-auto w-[150px]" />
        <p className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold text-slate-950">AlmiJob Finder</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">almiworld&apos;s resume-first search, worldwide filtering, and launch-ready workflow.</p>
      </div>

      <nav className="mt-5 space-y-2">
        <Link
          href={overviewItem.href}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <OverviewIcon className="h-4 w-4" />
          {overviewItem.label}
        </Link>
        {sectionItems.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      <div className="mt-6 rounded-[1.5rem] bg-slate-950 p-4 text-white">
        <p className="text-sm text-slate-300">Current plan</p>
        <p className="mt-2 text-xl font-semibold">{user.subscriptionTier === "PRO" ? "Pro" : "Free"}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {unlimitedSearches
            ? "Unlimited searches are active, along with resume insights and daily alerts."
            : `Free plan includes 5 searches per day. Alerts are ${alertsEnabled ? "on" : "off"}, and resume insights are ${resumeInsightsEnabled ? "on" : "available on Pro"}.`}
        </p>
      </div>
    </aside>
  );
}
