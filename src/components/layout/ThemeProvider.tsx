"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * ThemeProvider — Wraps the application with next-themes for dark/light/system mode.
 *
 * - Default: respects prefers-color-scheme from the OS
 * - User toggle persists to localStorage
 * - Uses class strategy (.dark on <html>) for Tailwind CSS 4 compatibility
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
