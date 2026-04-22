import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4",
        variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800 focus:ring-teal-200",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 focus:ring-slate-100",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800 focus:ring-red-200",
        className
      )}
      {...props}
    />
  );
}
