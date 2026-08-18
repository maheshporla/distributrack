import { useEffect, useMemo, useState } from "react";
import { CreditCard, Eye, FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { invoiceService } from "@/services/api/invoiceService";
import { useAuthStore } from "@/store/authStore";

import { InvoiceDetails } from "@/features/invoices/components/InvoiceDetails";
import { PaymentCheckout } from "@/features/payments/components/PaymentCheckout";

import { isInvoicePaid } from "@/types/invoice.types";
import type { Invoice } from "@/types/invoice.types";
import {
  INVOICE_STATUS_LABELS,
  type Payment,
  type PaymentStatus,
} from "@/types/payment.types";
import { formatDate, formatINR } from "@/lib/formatters";

type PageView = "list" | "details";

const PAYMENT_FILTERS: ("all" | "paid" | "unpaid" | PaymentStatus)[] = [
  "all",
  "paid",
  "unpaid",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
];

const PAYMENT_FILTER_LABELS: Record<string, string> = {
  all: "All Invoices",
  paid: "Paid",
  unpaid: "Unpaid",
  PENDING: "Payment Pending",
  SUCCESS: "Payment Paid",
  FAILED: "Payment Failed",
  REFUNDED: "Payment Refunded",
};

export function InvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const isShopkeeper = user?.role === "SHOPKEEPER";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const [view, setView] = useState<PageView>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // =========================================================
  // Load invoices — derived server-side from orders + payments;
  // SHOPKEEPER gets their own orders' invoices only
  // =========================================================

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await invoiceService.getAllInvoices();
      setInvoices(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // =========================================================
  // Search + payment filter (client-side over the loaded list)
  // =========================================================

  const displayedInvoices = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (paymentFilter === "paid" && !isInvoicePaid(invoice)) {
        return false;
      }
      if (paymentFilter === "unpaid" && isInvoicePaid(invoice)) {
        return false;
      }
      if (
        paymentFilter !== "all" &&
        paymentFilter !== "paid" &&
        paymentFilter !== "unpaid" &&
        invoice.paymentStatus !== paymentFilter
      ) {
        return false;
      }

      if (!keyword) return true;

      return (
        invoice.invoiceNumber.toLowerCase().includes(keyword) ||
        invoice.orderNumber.toLowerCase().includes(keyword) ||
        invoice.shopkeeperName.toLowerCase().includes(keyword)
      );
    });
  }, [invoices, searchKeyword, paymentFilter]);

  // =========================================================
  // View switching
  // =========================================================

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setView("details");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedInvoice(null);
  };

  const handleClearFilters = () => {
    setSearchKeyword("");
    setPaymentFilter("all");
  };

  // =========================================================
  // Pay Now (SHOPKEEPER only, DELIVERED + outstanding)
  // =========================================================

  const isPayable = (invoice: Invoice) =>
    isShopkeeper &&
    invoice.orderStatus === "DELIVERED" &&
    invoice.outstandingAmount > 0;

  const handlePaymentSuccess = async (_payment: Payment) => {
    setPayingInvoice(null);
    await loadInvoices();
  };

  // =========================================================
  // Invoice Details Screen
  // =========================================================

  if (view === "details" && selectedInvoice) {
    return (
      <InvoiceDetails
        invoice={selectedInvoice}
        onBack={handleBackToList}
        canPay={isPayable(selectedInvoice)}
        onPayNow={() => setPayingInvoice(selectedInvoice)}
      />
    );
  }

  // =========================================================
  // Invoices List
  // =========================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={
          isShopkeeper
            ? "Invoices for your orders."
            : "View and print customer invoices."
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Search invoice, order or customer..."
            className="pl-9"
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {PAYMENT_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {PAYMENT_FILTER_LABELS[filter]}
            </option>
          ))}
        </select>

        {(searchKeyword || paymentFilter !== "all") && (
          <Button variant="ghost" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Online payment dialog */}
      {payingInvoice && (
        <PaymentCheckout
          orderId={payingInvoice.orderId}
          orderNumber={payingInvoice.orderNumber}
          amount={payingInvoice.outstandingAmount}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayingInvoice(null)}
        />
      )}

      {/* Invoices List */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load invoices"
            description={loadError}
            onRetry={loadInvoices}
          />

        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading invoices...
            </p>
          </div>

        ) : displayedInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              invoices.length === 0
                ? "No invoices yet"
                : "No invoices match your filters"
            }
            description={
              invoices.length === 0
                ? "Invoices are generated automatically from orders and payments."
                : "Try clearing the search or choosing a different filter."
            }
            action={
              invoices.length > 0 ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedInvoices.map((invoice) => {
                  return (
                    <tr key={invoice.orderId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {invoice.invoiceNumber}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {invoice.orderNumber}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {invoice.shopkeeperName}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(invoice.orderDate)}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {formatINR(invoice.totalAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            invoice.invoiceStatus === "PAID"
                              ? "success"
                              : invoice.invoiceStatus === "PARTIALLY_PAID"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {INVOICE_STATUS_LABELS[invoice.invoiceStatus]}
                        </Badge>
                        {invoice.outstandingAmount > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatINR(invoice.outstandingAmount)} outstanding
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isPayable(invoice) && (
                            <Button
                              size="sm"
                              onClick={() => setPayingInvoice(invoice)}
                            >
                              <CreditCard className="mr-1 h-4 w-4" />
                              Pay Now
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
