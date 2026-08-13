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
  className?: string;
}

const trendConfig: Record<StatTrend, { icon: typeof ArrowUpRight; className: string }> = {
  up: { icon: ArrowUpRight, className: "text-success" },
  down: { icon: ArrowDownRight, className: "text-destructive" },
  neutral: { icon: ArrowRight, className: "text-muted-foreground" },
};

/**
 * Compact KPI card: label, big value, optional icon, optional trend delta.
 * Used in grids on the Dashboard and Analytics pages.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  trend = "neutral",
  isLoading = false,
  className,
}: StatCardProps) {
  const TrendIcon = trendConfig[trend].icon;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-3 h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4.5 text-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>

        {change && (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trendConfig[trend].className,
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {change}
            <span className="font-normal text-muted-foreground">vs last period</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
