import type { ComponentType } from "react";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * Temporary stand-in for every feature page (Products, Orders, Invoices,
 * ...) that hasn't been built yet. Confirms routing + layout work end to
 * end without pretending to be a finished business feature.
 * Delete usages of this component as each feature phase is implemented.
 */
export function PlaceholderPage({
  title,
  description,
  icon = Construction,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title="This feature is being built"
        description="This page will be implemented in an upcoming phase of the DistribuTrack build-out."
      />
    </div>
  );
}
