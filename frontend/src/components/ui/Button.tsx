"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "sage";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[#123D2B] text-white hover:bg-[#0E2F21] active:bg-[#0A2319] shadow-sm hover:shadow transition-all disabled:bg-[#123D2B]/50",
  secondary:
    "bg-[#E8F1D5] text-[#123D2B] hover:bg-[#DBE8C3] active:bg-[#CFDEB4] font-semibold transition-all disabled:bg-[#E8F1D5]/50",
  outline:
    "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D5D2C7] active:bg-[#F3F4F6] transition-all disabled:opacity-50",
  ghost:
    "bg-transparent text-[#111827] hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-all disabled:opacity-50",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all disabled:bg-rose-600/50",
  sage:
    "bg-[#1E543C] text-white hover:bg-[#123D2B] shadow-sm transition-all disabled:bg-[#1E543C]/50",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "h-7 px-2.5 text-xs rounded-sm gap-1.5",
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-md gap-2",
  lg: "h-12 px-5 text-base rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123D2B] focus-visible:ring-offset-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        )}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

