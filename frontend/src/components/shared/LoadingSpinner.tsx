import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  /** Renders centered, filling the parent container - useful for full-page/section loading. */
  fullHeight?: boolean;
}

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function LoadingSpinner({
  size = "md",
  label = "Loading…",
  className,
  fullHeight = false,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 text-muted-foreground",
        fullHeight && "min-h-[240px] w-full",
        className,
      )}
    >
      <Loader2 className={cn("animate-spin", sizeMap[size])} aria-hidden="true" />
      <span className={size === "sm" ? "text-xs" : "text-sm"}>{label}</span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
