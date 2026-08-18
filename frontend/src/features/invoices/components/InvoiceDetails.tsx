import { ArrowLeft, CreditCard, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatINR } from "@/lib/formatters";

import { ORDER_STATUS_META } from "@/features/orders/orderStatus";
import { PAYMENT_STATUS_META } from "@/features/payments/paymentStatus";

import { INVOICE_STATUS_LABELS } from "@/types/payment.types";
import type { Invoice } from "@/types/invoice.types";

interface InvoiceDetailsProps {
  invoice: Invoice;
  onBack: () => void;
  /** Whether to show "Pay Now" (shopkeeper with a payable order). */
  canPay?: boolean;
  onPayNow?: () => void;
}

export function InvoiceDetails({ invoice, onBack, canPay, onPayNow }: InvoiceDetailsProps) {
  const orderMeta = ORDER_STATUS_META[invoice.orderStatus];
  const paymentMeta = invoice.paymentStatus
    ? PAYMENT_STATUS_META[invoice.paymentStatus]
    : null;

  const paid = invoice.invoiceStatus === "PAID";
  const payable = Boolean(canPay) && !paid && invoice.outstandingAmount > 0;

  const invoiceStatusVariant =
    invoice.invoiceStatus === "PAID"
      ? ("success" as const)
      : invoice.invoiceStatus === "PARTIALLY_PAID"
        ? ("warning" as const)
        : ("secondary" as const);

  return (
    <div className="space-y-6">
      {/* Toolbar (hidden when printing) */}
      <div className="print-hide flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to invoices
        </Button>

        <div className="flex gap-2">
          {payable && (
            <Button size="sm" onClick={onPayNow}>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now — {formatINR(invoice.outstandingAmount)}
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              DistribuTrack
            </h1>
            <p className="text-sm text-muted-foreground">
              Distribution &amp; Delivery Management
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">
              Issued {formatDate(invoice.orderDate)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
              <Badge variant={orderMeta.badgeVariant}>
                Order {orderMeta.label}
              </Badge>
              <Badge variant={invoiceStatusVariant}>
                {INVOICE_STATUS_LABELS[invoice.invoiceStatus]}
              </Badge>
              {paymentMeta && (
                <Badge variant={paymentMeta.badgeVariant}>
                  Payment {paymentMeta.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid gap-4 border-b p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bill To
            </p>
            <p className="mt-1 font-medium">{invoice.shopkeeperName}</p>
            <p className="text-sm text-muted-foreground">
              {invoice.shopkeeperPhone}
            </p>
            <p className="text-xs text-muted-foreground">
              Customer ID: {invoice.shopkeeperId}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Order Reference
            </p>
            <p className="mt-1 font-medium">{invoice.orderNumber}</p>
            <p className="text-sm text-muted-foreground">
              Placed {formatDateTime(invoice.orderDate)}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3 text-right">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.productId} className="border-b last:border-0">
                  <td className="px-6 py-3 font-medium">{item.productName}</td>
                  <td className="px-6 py-3">{item.quantity}</td>
                  <td className="px-6 py-3">{formatINR(item.price)}</td>
                  <td className="px-6 py-3 text-right font-medium">
                    {formatINR(item.subtotal)}
                  </td>
                </tr>
              ))}

              {invoice.items.length === 0 && (
                <tr className="border-b last:border-0">
                  <td colSpan={4} className="px-6 py-6 text-center text-sm text-muted-foreground">
                    No line items on this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals + payment */}
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payment
            </p>

            <div className="mt-1 space-y-1 text-sm">
              <div className="flex justify-between sm:justify-start sm:gap-8">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-emerald-600">
                  {formatINR(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-8">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-medium text-warning">
                  {formatINR(invoice.outstandingAmount)}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-8">
                <span className="text-muted-foreground">Payments</span>
                <span>{invoice.paymentCount}</span>
              </div>
            </div>

            {invoice.paymentStatus ? (
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <p className="font-medium">{paymentMeta?.label}</p>
                <p className="text-muted-foreground">
                  {formatINR(invoice.paymentAmount ?? 0)} via{" "}
                  {invoice.paymentMethod}
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {invoice.transactionId}
                </p>
                {invoice.paymentDate && (
                  <p className="text-xs text-muted-foreground">
                    Paid {formatDateTime(invoice.paymentDate)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                No payment recorded yet.
              </p>
            )}
          </div>

          <div className="space-y-2 sm:text-right">
            <div className="flex justify-between text-sm sm:justify-end sm:gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(invoice.subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm sm:justify-end sm:gap-8">
              <span className="text-muted-foreground">Taxes</span>
              <span>₹0.00</span>
            </div>

            <div className="flex justify-between border-t pt-2 text-lg font-semibold sm:justify-end sm:gap-8">
              <span>Total</span>
              <span>{formatINR(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
