import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatTrend } from "@/types/ui.types";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** e.g. "+12.4%" — paired with `trend` to color and pick an arrow. */
  change?: string;
  trend?: StatTrend;
  isLoading?: boolean;
  /** Visual accent: applies a subtle tinted left border or icon background. */
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

const trendConfig: Record<StatTrend, { icon: typeof ArrowUpRight; className: string }> = {
  up: { icon: ArrowUpRight, className: "text-success" },
  down: { icon: ArrowDownRight, className: "text-destructive" },
  neutral: { icon: ArrowRight, className: "text-muted-foreground" },
};

const accentConfig: Record<string, { iconBg: string; border: string }> = {
  primary: { iconBg: "bg-primary/10 text-primary", border: "border-l-primary" },
  success: { iconBg: "bg-success/10 text-success", border: "border-l-success" },
  warning: { iconBg: "bg-warning/10 text-warning", border: "border-l-warning" },
  destructive: { iconBg: "bg-destructive/10 text-destructive", border: "border-l-destructive" },
  info: { iconBg: "bg-info/10 text-info", border: "border-l-info" },
};

/**
 * Premium KPI card: label, big value, optional icon, optional trend delta.
 * Supports accent tinting for visual hierarchy in KPI grids.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  trend = "neutral",
  accent = "primary",
  isLoading = false,
  className,
}: StatCardProps) {
  const TrendIcon = trendConfig[trend].icon;
  const accentStyle = accentConfig[accent] ?? accentConfig.primary;

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5">
          <Skeleton className="h-3.5 w-24 mb-3" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-2 card-hover",
        accentStyle.border,
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          {Icon && (
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                accentStyle.iconBg,
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>

        {change && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                trend === "up" && "bg-success/10 text-success",
                trend === "down" && "bg-destructive/10 text-destructive",
                trend === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              <TrendIcon className="size-3" aria-hidden="true" />
              {change}
            </span>
            <span className="text-[11px] text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
