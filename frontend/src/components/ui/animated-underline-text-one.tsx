"use client";

import * as React from "react";
import { motion, Variants } from "framer-motion";
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

const AnimatedText = React.forwardRef<HTMLDivElement, AnimatedTextProps>(
  (
    {
      text,
      textClassName,
      underlineClassName,
      underlinePath = "M 0,10 Q 75,0 150,10 Q 225,20 300,10",
      underlineHoverPath = "M 0,10 Q 75,20 150,10 Q 225,0 300,10",
      underlineDuration = 1.2,
      underlineStrokeWidth = 3,
      as = "h1",
      ...props
    },
    ref
  ) => {
    const pathVariants: Variants = {
      hidden: {
        pathLength: 0,
        opacity: 0,
      },
      visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: underlineDuration,
          ease: "easeInOut",
        },
      },
      hover: {
        d: underlineHoverPath,
        transition: { duration: 0.8, ease: "easeInOut" },
      },
    };

    const headingVariants: Variants = {
      hidden: { y: -16, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
      hover: { scale: 1.02, transition: { duration: 0.3 } },
    };

    const MotionHeading = as === "h2" ? motion.h2 : as === "h3" ? motion.h3 : as === "span" ? motion.span : motion.h1;

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-2", props.className)}
      >
        <motion.div
          className="relative inline-block cursor-pointer select-none"
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <MotionHeading
            className={cn("text-4xl font-bold text-center", textClassName)}
            variants={headingVariants}
          >
            {text}
          </MotionHeading>

          <motion.svg
            width="100%"
            height="22"
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className={cn("absolute -bottom-3 sm:-bottom-4 left-0 pointer-events-none overflow-visible", underlineClassName)}
          >
            <motion.path
              d={underlinePath}
              stroke="currentColor"
              strokeWidth={underlineStrokeWidth}
              strokeLinecap="round"
              fill="none"
              variants={pathVariants}
              whileHover={{
                d: underlineHoverPath,
                transition: { duration: 0.8 },
              }}
            />
          </motion.svg>
        </motion.div>
      </div>
    );
  }
);

AnimatedText.displayName = "AnimatedText";

export { AnimatedText };
