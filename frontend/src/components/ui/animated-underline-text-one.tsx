"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  textClassName?: string;
  underlineClassName?: string;
  underlinePath?: string;
  underlineHoverPath?: string;
  underlineDuration?: number;
  underlineStrokeWidth?: number;
  as?: "h1" | "h2" | "h3" | "span";
}

export const AnimatedText = React.forwardRef<HTMLDivElement, AnimatedTextProps>(
  (
    {
      text,
      textClassName,
      underlineClassName,
      underlinePath = "M 0,10 Q 75,0 150,10 Q 225,20 300,10",
      underlineDuration = 1.2,
      underlineStrokeWidth = 3,
      as: Component = "h1",
      ...props
    },
    ref
  ) => {
    const [hovered, setHovered] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-2", props.className)}
      >
        <div
          className="relative inline-block cursor-pointer select-none transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.02)" : "scale(1)" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Component
            className={cn("text-4xl font-bold text-center", textClassName)}
          >
            {text}
          </Component>

          <svg
            width="100%"
            height="22"
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className={cn(
              "absolute -bottom-3 sm:-bottom-4 left-0 pointer-events-none overflow-visible",
              underlineClassName
            )}
          >
            <path
              d={underlinePath}
              stroke="currentColor"
              strokeWidth={underlineStrokeWidth}
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: 320,
                strokeDashoffset: 0,
                transition: `all ${underlineDuration}s ease-in-out`,
              }}
            />
          </svg>
        </div>
      </div>
    );
  }
);

AnimatedText.displayName = "AnimatedText";

export default AnimatedText;
