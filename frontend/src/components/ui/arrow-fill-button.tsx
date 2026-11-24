// Built using Hyperiux Vault: https://vault.hyperiux.com
// Adapted for Stayzy Premium Green Theme with standard and responsive sizing

"use client";

import React, {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ArrowRight } from "lucide-react";

const DEFAULT_HREF = "#";
const COMPACT_LAYOUT_BREAKPOINT = 1280;
const ANIMATION_DURATION_MS = 450;

export interface ArrowFillButtonOwnProps {
  as?: ElementType;
  btnText?: string;
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "vw";
  variant?: "primary" | "secondary" | "outline" | "emerald";
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  hoverFillBgColor?: string;
  hoverFillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
  animationDuration?: number;
  fillOnHover?: boolean;
  leftIcon?: ReactNode;
  children?: ReactNode;
}

export type ArrowFillButtonProps = ArrowFillButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof ArrowFillButtonOwnProps>;

const sizeClassMap = {
  sm: "h-9 px-3.5 pr-[calc(var(--icon-circle)+var(--icon-right)+10px)] text-xs font-semibold [--icon-circle:24px] [--icon-right:5px] [--circle-inset-y:calc((100%-var(--icon-circle))/2)]",
  md: "h-[42px] px-4.5 pr-[calc(var(--icon-circle)+var(--icon-right)+14px)] text-[13px] font-bold [--icon-circle:28px] [--icon-right:6px] [--circle-inset-y:calc((100%-var(--icon-circle))/2)]",
  lg: "h-12 px-6 pr-[calc(var(--icon-circle)+var(--icon-right)+18px)] text-sm font-extrabold [--icon-circle:34px] [--icon-right:7px] [--circle-inset-y:calc((100%-var(--icon-circle))/2)]",
  vw: "h-[4.2vw] px-[3vw] pr-[calc(var(--icon-circle)+var(--icon-right)+2vw)] text-[1.155vw] leading-none [--icon-circle:3.1vw] [--icon-right:0.55vw] [--circle-inset-y:calc((100%-var(--icon-circle))/2)] max-[1025px]:h-[11vw] max-[1025px]:px-[5vw] max-[1025px]:pr-[calc(var(--icon-circle)+var(--icon-right)+4vw)] max-[1025px]:text-[3.15vw] max-[1025px]:[--icon-circle:8vw] max-[1025px]:[--icon-right:1.5vw] max-md:h-[15vw] max-md:px-[7vw] max-md:pr-[calc(var(--icon-circle)+var(--icon-right)+5vw)] max-md:text-[4.41vw] max-md:[--icon-circle:11vw] max-md:[--icon-right:2vw]",
};

const iconSizeMap = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
  vw: "size-[1.5vw] max-[1025px]:size-[4vw] max-md:size-[5vw]",
};

export function ArrowFillButton({
  as: Component = "a",
  btnText = "Hover Me",
  href = DEFAULT_HREF,
  className = "",
  size = "md",
  variant = "primary",

  // Stayzy Green Defaults (customizable)
  bgColor: userBgColor,
  textColor: userTextColor,
  fillBgColor: userFillBgColor,
  fillTextColor: userFillTextColor,
  hoverFillBgColor: userHoverFillBgColor,
  hoverFillTextColor: userHoverFillTextColor,
  arrowColor: userArrowColor,
  hoverArrowColor: userHoverArrowColor,

  leftIcon,
  children,
  ...props
}: ArrowFillButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimeoutRef = useRef<number | null>(null);

  // Variant color definitions suited to Stayzy brand
  let defaultBg = "#009B62";
  let defaultText = "#ffffff";
  let defaultFillBg = "#ffffff";
  let defaultFillText = "#00834F";
  let defaultHoverFillBg = "#ffffff";
  let defaultHoverFillText = "#00834F";
  let defaultArrow = "#00834F";
  let defaultHoverArrow = "#00834F";

  if (variant === "emerald") {
    defaultBg = "#00B86B";
    defaultText = "#ffffff";
    defaultFillBg = "#ffffff";
    defaultFillText = "#00834F";
    defaultHoverFillBg = "#ffffff";
    defaultHoverFillText = "#00834F";
    defaultArrow = "#00834F";
    defaultHoverArrow = "#00834F";
  } else if (variant === "outline") {
    defaultBg = "#ffffff";
    defaultText = "#009B62";
    defaultFillBg = "#009B62";
    defaultFillText = "#ffffff";
    defaultHoverFillBg = "#00834F";
    defaultHoverFillText = "#ffffff";
    defaultArrow = "#ffffff";
    defaultHoverArrow = "#ffffff";
  } else if (variant === "secondary") {
    defaultBg = "#F0FDF4";
    defaultText = "#00834F";
    defaultFillBg = "#009B62";
    defaultFillText = "#ffffff";
    defaultHoverFillBg = "#00834F";
    defaultHoverFillText = "#ffffff";
    defaultArrow = "#ffffff";
    defaultHoverArrow = "#ffffff";
  }

  const bgColor = userBgColor || defaultBg;
  const textColor = userTextColor || defaultText;
  const fillBgColor = userFillBgColor || defaultFillBg;
  const fillTextColor = userFillTextColor || defaultFillText;
  const hoverFillBgColor = userHoverFillBgColor || defaultHoverFillBg;
  const hoverFillTextColor = userHoverFillTextColor || defaultHoverFillText;
  const arrowColor = userArrowColor || defaultArrow;
  const hoverArrowColor = userHoverArrowColor || defaultHoverArrow;

  const displayContent = children || btnText;

  const usesUtilityBackground =
    className.includes("bg-") ||
    className.includes("from-") ||
    className.includes("via-") ||
    className.includes("to-");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${COMPACT_LAYOUT_BREAKPOINT - 1}px)`
    );

    const syncCompactLayout = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches =
        "matches" in event
          ? event.matches
          : ((event as any).currentTarget as MediaQueryList).matches;
      setIsCompactLayout(matches);

      if (!matches) {
        setIsPressed(false);
      }
    };

    syncCompactLayout(mediaQuery);
    mediaQuery.addEventListener("change", syncCompactLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncCompactLayout);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) {
        window.clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, []);

  const clearPressedState = () => {
    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current);
    }

    releaseTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
      releaseTimeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  };

  const handlePointerDown = (event: PointerEvent<any>) => {
    (props as any).onPointerDown?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }

    setIsPressed(true);
  };

  const handlePointerUp = (event: PointerEvent<any>) => {
    (props as any).onPointerUp?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    clearPressedState();
  };

  const handlePointerCancel = (event: PointerEvent<any>) => {
    (props as any).onPointerCancel?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    clearPressedState();
  };

  const componentProps: any = {
    ...props,
    href: href || DEFAULT_HREF,
    "data-pressed": isPressed ? "true" : "false",
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    style: {
      "--btn-bg": bgColor,
      "--btn-text": textColor,
      "--btn-fill-bg": fillBgColor,
      "--btn-fill-text": fillTextColor,
      "--btn-fill-bg-hover": hoverFillBgColor,
      "--btn-fill-text-hover": hoverFillTextColor,
      "--btn-arrow": arrowColor || fillTextColor,
      "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
      visibility: isReady ? "visible" : "hidden",
      ...props.style,
    } as CSSProperties & Record<string, string | number>,
  };

  if (Component === "button") {
    delete componentProps.href;
    if (componentProps.type === undefined) {
      componentProps.type = "button";
    }
  }

  const sizeClass = sizeClassMap[size] || sizeClassMap.md;
  const iconSizeClass = iconSizeMap[size] || iconSizeMap.md;

  return (
    <Component
      {...componentProps}
      className={`group relative inline-flex w-fit min-w-fit max-w-none cursor-pointer items-center justify-center overflow-hidden rounded-full border border-(--btn-bg) shadow-xs transition-shadow duration-200 hover:shadow-md active:scale-98 whitespace-nowrap [text-rendering:geometricPrecision] ${sizeClass} ${
        usesUtilityBackground ? "" : "bg-(--btn-bg)"
      } text-(--btn-text) ${className}`}
    >
      {/* Background Resting Layer */}
      <span className="relative z-1 flex items-center gap-2 pb-px select-none">
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{displayContent}</span>
      </span>

      {/* Expanding Circular Fill Background Layer */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute z-2 rounded-full bg-(--btn-fill-bg) inset-[var(--circle-inset-y)_var(--icon-right)_var(--circle-inset-y)_calc(100%-var(--icon-right)-var(--icon-circle))] ${
          isReady
            ? "transition-all duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover:bg-(--btn-fill-bg-hover) group-hover:inset-0 group-data-[pressed=true]:bg-(--btn-fill-bg-hover) group-data-[pressed=true]:inset-0"
            : ""
        }`}
      />

      {/* Foreground Layer Visible When Filled */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-2 flex items-center ${sizeClass} text-(--btn-fill-text) [clip-path:inset(var(--circle-inset-y)_var(--icon-right)_var(--circle-inset-y)_calc(100%-var(--icon-right)-var(--icon-circle)))] ${
          isReady
            ? "transition-all duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover:text-(--btn-fill-text-hover) group-hover:[clip-path:inset(0_0_0_0)] group-data-[pressed=true]:text-(--btn-fill-text-hover) group-data-[pressed=true]:[clip-path:inset(0_0_0_0)]"
            : ""
        }`}
      >
        <span className="relative z-1 flex items-center gap-2 pb-px whitespace-nowrap select-none">
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{displayContent}</span>
        </span>
      </div>

      {/* Circular Arrow Badge with Dual Sliding Arrow Micro-Animation */}
      <span
        className={`pointer-events-none absolute right-[var(--icon-right)] top-1/2 z-3 inline-flex h-[var(--icon-circle)] w-[var(--icon-circle)] shrink-0 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-(--btn-fill-bg) text-(--btn-arrow) shadow-xs ${
          isReady
            ? "transition-colors duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover:bg-(--btn-fill-bg-hover) group-hover:text-(--btn-arrow-hover) group-data-[pressed=true]:bg-(--btn-fill-bg-hover) group-data-[pressed=true]:text-(--btn-arrow-hover)"
            : ""
        }`}
        style={{
          WebkitMaskImage: "-webkit-radial-gradient(white, black)",
          maskImage: "radial-gradient(white, black)",
        }}
        aria-hidden="true"
      >
        <ArrowRight
          className={`absolute left-1/2 top-1/2 ${iconSizeClass} translate-x-[-170%] -translate-y-1/2 origin-center scale-0 text-current ${
            isReady
              ? "transition-transform duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover:-translate-x-1/2 group-hover:-translate-y-1/2 group-hover:scale-100 group-data-[pressed=true]:-translate-x-1/2 group-data-[pressed=true]:-translate-y-1/2 group-data-[pressed=true]:scale-100"
              : ""
          }`}
          strokeWidth={2.2}
        />

        <ArrowRight
          className={`absolute left-1/2 top-1/2 ${iconSizeClass} -translate-x-1/2 -translate-y-1/2 origin-center text-current ${
            isReady
              ? "transition-transform duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover:translate-x-[70%] group-hover:-translate-y-1/2 group-hover:scale-0 group-data-[pressed=true]:translate-x-[70%] group-data-[pressed=true]:-translate-y-1/2 group-data-[pressed=true]:scale-0"
              : ""
          }`}
          strokeWidth={2.2}
        />
      </span>
    </Component>
  );
}

export default ArrowFillButton;
