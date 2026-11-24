import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[#111827] flex items-center gap-1 select-none"
          >
            {label}
            {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[#4B5563] pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            required={required}
            className={cn(
              "w-full h-10 px-3.5 bg-white text-[#111827] text-sm border rounded-md transition-all placeholder:text-[#9CA3AF]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123D2B] focus-visible:border-transparent",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-rose-400 focus-visible:ring-rose-500 bg-rose-50/20"
                : "border-[#E5E7EB] hover:border-[#D5D2C7]",
              disabled && "opacity-50 cursor-not-allowed bg-gray-50",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-[#4B5563] flex items-center justify-center shrink-0">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#4B5563]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

