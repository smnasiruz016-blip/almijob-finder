import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchScoreProps = {
  score: number;
  reasons: string[];
  compact?: boolean;
};

function getScoreTheme(score: number) {
  if (score >= 80) {
    return {
      badge: "bg-emerald-100 text-emerald-800",
      bar: "bg-emerald-500"
    };
  }

  if (score >= 60) {
    return {
      badge: "bg-amber-100 text-amber-800",
      bar: "bg-amber-500"
    };
  }

  return {
    badge: "bg-rose-100 text-rose-800",
    bar: "bg-rose-500"
  };
}

export function MatchScore({ score, reasons, compact = false }: MatchScoreProps) {
  const theme = getScoreTheme(score);
  const tooltip = reasons.length ? reasons.join(" | ") : "Ranking explanation unavailable.";

  return (
    <div className={cn("space-y-2", compact && "min-w-[120px]")}>
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
            theme.badge
          )}
          title={tooltip}
          aria-label={tooltip}
        >
          {score}/100
          <Info className="h-3.5 w-3.5" />
        </div>
        {!compact && <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Match score</p>}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", theme.bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
