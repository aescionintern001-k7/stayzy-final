"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
  cursorClassName?: string;
  startWhenVisible?: boolean;
}

/**
 * Renders animated typewriter text with configurable typing speed, loop,
 * delete speed, delay, and optional viewport-triggered reveal.
 */
export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
  cursorClassName,
  startWhenVisible = false,
}: TypewriterProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startWhenVisible);

  // Stabilize text array identity so inline array literals in parents never reset timers.
  const serializedKey = Array.isArray(text) ? text.join("\u0000") : text;
  const textArray = useMemo(
    () => (Array.isArray(text) ? text : [text]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serializedKey]
  );
  const currentText = textArray[textArrayIndex] || "";

  useEffect(() => {
    if (!startWhenVisible || hasStarted) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startWhenVisible, hasStarted]);

  useEffect(() => {
    if (!currentText || !hasStarted) return;

    if (!isDeleting) {
      if (currentIndex < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, currentIndex + 1));
          setCurrentIndex((prev) => prev + 1);
        }, speed);
        return () => clearTimeout(timeout);
      }

      if (loop) {
        const pauseTimeout = setTimeout(() => {
          setIsDeleting(true);
        }, delay);
        return () => clearTimeout(pauseTimeout);
      }
      return;
    }

    if (displayText.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
      }, deleteSpeed);
      return () => clearTimeout(timeout);
    }

    setIsDeleting(false);
    setCurrentIndex(0);
    setTextArrayIndex((prev) => (prev + 1) % textArray.length);
  }, [
    currentIndex,
    isDeleting,
    currentText,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText.length,
    textArray.length,
    hasStarted,
  ]);

  return (
    <span ref={containerRef} data-slot="typewriter-text" className={cn("inline", className)}>
      <span className="sr-only">{currentText}</span>
      <span aria-hidden="true">
        {displayText}
        <span className={cn("animate-pulse ml-0.5 font-normal", cursorClassName)}>
          {cursor}
        </span>
      </span>
    </span>
  );
}

export default Typewriter;
