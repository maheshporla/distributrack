import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatINR } from "@/lib/formatters";

import {
  PAYMENT_STATUS_ACTIONS,
  PAYMENT_STATUS_META,
} from "@/features/payments/paymentStatus";

import type { Payment, PaymentStatus } from "@/types/payment.types";

interface PaymentDetailsProps {
  payment: Payment;
  /** Whether the authenticated role may change payment status. */
  canManageStatus: boolean;
  /** Payment id currently having its status updated. */
  updatingStatusId: number | null;
  onBack: () => void;
  onStatusChange: (next: PaymentStatus) => void;
}


export function PaymentDetails({
  payment,
  canManageStatus,
  updatingStatusId,
  onBack,
  onStatusChange,
}: PaymentDetailsProps) {
  const statusMeta = PAYMENT_STATUS_META[payment.paymentStatus];
  const actions = canManageStatus
    ? PAYMENT_STATUS_ACTIONS[payment.paymentStatus]
    : [];

  const isUpdating = updatingStatusId === payment.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to payments
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              Payment #{payment.id}
            </h1>
            <Badge variant={statusMeta.badgeVariant}>
              {statusMeta.label}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {payment.orderNumber} ·{" "}
            {formatDateTime(payment.paymentDate)}
          </p>
        </div>

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.to}
                variant={action.buttonVariant}
                onClick={() => onStatusChange(action.to)}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Customer / Shop
          </p>
          <p className="mt-1 font-medium">{payment.shopkeeperName}</p>
          <p className="text-xs text-muted-foreground">
            Customer ID: {payment.shopkeeperId}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Amount
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatINR(payment.amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            of {formatINR(payment.orderTotalAmount)} order total
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Payment Method
          </p>
          <p className="mt-1 font-medium">{payment.paymentMethod}</p>
        </div>
      </div>

      {/* Transaction info */}
      <div className="rounded-lg border bg-card">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Transaction ID
            </p>
            <p className="mt-1 break-all font-mono text-sm">
              {payment.transactionId}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order Reference
            </p>
            <p className="mt-1 text-sm font-medium">{payment.orderNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
