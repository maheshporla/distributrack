import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Single composition root for every context provider the app needs.
 * Order matters: Theme must wrap everything that reads theme (Toaster),
 * Router must wrap everything that uses navigation.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          {children}
          <ToastProvider />
        </TooltipProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
