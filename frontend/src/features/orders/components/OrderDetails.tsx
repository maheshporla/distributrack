import { useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatINR } from "@/lib/formatters";

import {
  ORDER_STATUS_ACTIONS,
  ORDER_STATUS_META,
} from "@/features/orders/orderStatus";
import { PaymentCheckout } from "@/features/payments/components/PaymentCheckout";

import type { Order, OrderStatus } from "@/types/order.types";
import type { Payment } from "@/types/payment.types";

interface OrderDetailsProps {
  order: Order;
  /** Whether the authenticated role may change status (SA/OWNER/MANAGER). */
  canManageStatus: boolean;
  /** Whether the current user is a shopkeeper (shows Pay Now button). */
  isShopkeeper?: boolean;
  /** Order id currently having its status updated. */
  updatingStatusId: number | null;
  onBack: () => void;
  onStatusChange: (next: OrderStatus) => void;
  /** Called when a payment succeeds so the parent can refresh order data. */
  onPaymentSuccess?: (payment: Payment) => void;
}


export function OrderDetails({
  order,
  canManageStatus,
  isShopkeeper = false,
  updatingStatusId,
  onBack,
  onStatusChange,
  onPaymentSuccess,
}: OrderDetailsProps) {
  const statusMeta = ORDER_STATUS_META[order.status];
  const actions = canManageStatus
    ? ORDER_STATUS_ACTIONS[order.status]
    : [];

  const [showCheckout, setShowCheckout] = useState(false);
  const isUpdating = updatingStatusId === order.id;

  const canPay = isShopkeeper && order.status === "DELIVERED";

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
            Back to orders
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {order.orderNumber}
            </h1>
            <Badge variant={statusMeta.badgeVariant}>
              {statusMeta.label}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.orderDate)}
          </p>
        </div>

        {/* Status actions + Pay Now */}
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
          {canPay && (
            <Button
              onClick={() => setShowCheckout(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now — {formatINR(order.totalAmount)}
            </Button>
          )}
        </div>
      </div>

      {/* Order meta */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Shopkeeper
          </p>
          <p className="mt-1 font-medium">{order.shopkeeperName}</p>
          <p className="text-xs text-muted-foreground">
            Customer ID: {order.shopkeeperId}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Amount
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatINR(order.totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Payment checkout dialog */}
      {showCheckout && (
        <PaymentCheckout
          orderId={order.id}
          orderNumber={order.orderNumber}
          amount={order.totalAmount}
          onSuccess={(payment) => {
            setShowCheckout(false);
            onPaymentSuccess?.(payment);
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* Items */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{item.productName}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatINR(item.price)}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatINR(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm font-medium">Total</p>
          <p className="text-lg font-semibold">{formatINR(order.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
}
