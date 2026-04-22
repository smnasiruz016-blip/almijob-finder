import type { ReactNode } from "react";
import { CircleAlert, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  nextStep: string;
  details?: string[];
  actionLabel?: string;
  onAction?: () => void;
  variant?: "neutral" | "warning" | "error";
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  nextStep,
  details,
  actionLabel,
  onAction,
  variant = "neutral",
  icon
}: EmptyStateProps) {
  const tone =
    variant === "error"
      ? {
          border: "border-rose-200",
          iconWrap: "bg-rose-100 text-rose-700",
          nextStep: "bg-rose-50 text-rose-800"
        }
      : variant === "warning"
        ? {
            border: "border-amber-200",
            iconWrap: "bg-amber-100 text-amber-700",
            nextStep: "bg-amber-50 text-amber-900"
          }
        : {
            border: "border-slate-300",
            iconWrap: "bg-slate-100 text-slate-600",
            nextStep: "bg-slate-100 text-slate-700"
          };

  return (
    <div className={`rounded-[1.75rem] border border-dashed bg-white/75 p-8 text-left ${tone.border}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.iconWrap}`}>
        {icon ?? (variant === "error" ? <CircleAlert className="h-5 w-5" /> : <SearchX className="h-5 w-5" />)}
      </div>
      <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
      <div className={`mt-5 rounded-[1.25rem] px-4 py-3 text-sm font-medium ${tone.nextStep}`}>
        Next step: {nextStep}
      </div>
      {details && details.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
          {details.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      )}
      {actionLabel && onAction && (
        <Button type="button" variant="secondary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
