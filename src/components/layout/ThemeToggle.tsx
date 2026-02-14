"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * ThemeToggle — Sun/Moon icon toggle for dark mode.
 * Uses next-themes for persistence and system preference detection.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  if (!mounted) {
    // Render a placeholder button with same dimensions to avoid layout shift
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label="Cambia tema"
        disabled
      >
        <Sun className="size-[18px]" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      onClick={toggleTheme}
      aria-label={
        resolvedTheme === "dark"
          ? "Passa al tema chiaro"
          : "Passa al tema scuro"
      }
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </Button>
  );
}
