import { Crown, Zap } from "lucide-react";
import type { SearchUsageSnapshot } from "@/types";

type PlanCardProps = {
  usage: SearchUsageSnapshot;
};

export function PlanCard({ usage }: PlanCardProps) {
  const isPro = usage.plan.features.hasUnlimitedSearches;

  return (
    <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          {isPro ? <Crown className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm text-slate-300">{isPro ? "Pro unlocked" : `${usage.plan.label} plan`}</p>
          <p className="text-xl font-semibold">{isPro ? "Unlimited search access" : "Free plan overview"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        {isPro
          ? "Resume insights, alerts, and unlimited searches are active for this account."
          : `You have used ${usage.dailyUsed} of ${usage.dailyLimit ?? 0} daily searches today, with ${usage.remaining ?? 0} remaining. Upgrade unlocks unlimited searches, alerts, and detailed resume insights.`}
      </p>
      <div className="mt-4 rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm text-slate-300">
        {isPro
          ? "Plan changes are handled outside this beta environment."
          : "Upgrade access is handled manually during beta."}
      </div>
    </div>
  );
}
