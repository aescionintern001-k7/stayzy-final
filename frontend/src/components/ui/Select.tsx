import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      options,
      children,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
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
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            required={required}
            className={cn(
              "w-full h-10 px-3.5 pr-9 bg-white text-[#111827] text-sm border rounded-md transition-all appearance-none cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123D2B] focus-visible:border-transparent",
              leftIcon && "pl-10",
              error
                ? "border-rose-400 focus-visible:ring-rose-500 bg-rose-50/20"
                : "border-[#E5E7EB] hover:border-[#D5D2C7]",
              disabled && "opacity-50 cursor-not-allowed bg-gray-50",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="w-4 h-4 text-[#4B5563] absolute right-3 pointer-events-none" />
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

Select.displayName = "Select";

