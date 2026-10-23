"use client";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { useProgress } from "@/lib/progress";

function MotionSettings({ children }: { children: React.ReactNode }) {
  const reduce = useProgress((s) => s.reduceMotion);
  const sketch = useProgress((s) => s.sketch);
  useEffect(() => {
    if (sketch) document.documentElement.dataset.sketch = "on";
    else delete document.documentElement.dataset.sketch;
  }, [sketch]);
  useEffect(() => {
    if (reduce) document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, [reduce]);
  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LazyMotion features={domAnimation}>
        <MotionSettings>{children}</MotionSettings>
      </LazyMotion>
    </ThemeProvider>
  );
}
