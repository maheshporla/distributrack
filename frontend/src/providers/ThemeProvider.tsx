import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { STORAGE_KEYS } from "@/constants/app.constants";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Wraps next-themes to drive Tailwind's class-based dark mode
 * (`@custom-variant dark (&:is(.dark *))` in globals.css).
 * Defaults to the user's OS preference, remembers explicit choices.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEYS.THEME}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
