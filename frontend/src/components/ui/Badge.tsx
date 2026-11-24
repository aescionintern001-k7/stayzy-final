import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "error"
    | "neutral"
    | "hourly"
    | "daily"
    | "monthly";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-[#123D2B] text-white border-transparent",
  secondary: "bg-[#E8F1D5] text-[#123D2B] border-transparent font-semibold",
  outline: "bg-white text-[#111827] border-[#E5E7EB]",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  hourly: "bg-sky-50 text-sky-800 border-sky-200 font-semibold",
  daily: "bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold",
  monthly: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-white",
  secondary: "bg-[#123D2B]",
  outline: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  neutral: "bg-slate-400",
  hourly: "bg-sky-500",
  daily: "bg-indigo-500",
  monthly: "bg-emerald-500",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border transition-colors select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px] rounded" : "px-2.5 py-1 text-xs rounded-md",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotColors[variant]
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

