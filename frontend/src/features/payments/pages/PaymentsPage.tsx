import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { paymentService } from "@/services/api/paymentService";
import { useAuthStore } from "@/store/authStore";

import { PAYMENT_STATUS_META } from "@/features/payments/paymentStatus";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import { PaymentDetails } from "@/features/payments/components/PaymentDetails";

import {
  PAYMENT_CHANNEL_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  type Payment,
  type PaymentStatus,
} from "@/types/payment.types";
import { formatDateTime, formatINR } from "@/lib/formatters";


type PageView = "list" | "details" | "form";

export function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? "SHOPKEEPER";

  // Matches SecurityConfig: writes (POST/PUT /api/payments) are
  // SA/OWNER/MANAGER only; SHOPKEEPER/SALESMAN are read-only.
  const canManage =
    role === "SUPER_ADMIN" || role === "OWNER" || role === "MANAGER";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const [view, setView] = useState<PageView>("list");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // =========================================================
  // Load payments — the backend scopes the list by role
  // (SHOPKEEPER: own orders only)
  // =========================================================

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await paymentService.getAllPayments();
      setPayments(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // =========================================================
  // Search + status/method filters (client-side over loaded list)
  // =========================================================

  const displayedPayments = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.paymentStatus !== statusFilter) {
        return false;
      }

      if (methodFilter !== "all" && payment.paymentMethod !== methodFilter) {
        return false;
      }

      if (!keyword) return true;

      return (
        payment.orderNumber.toLowerCase().includes(keyword) ||
        payment.shopkeeperName.toLowerCase().includes(keyword) ||
        payment.transactionId.toLowerCase().includes(keyword) ||
        payment.paymentMethod.toLowerCase().includes(keyword)
      );
    });
  }, [payments, searchKeyword, statusFilter, methodFilter]);

  // =========================================================
  // Status update (SA/OWNER/MANAGER only)
  // =========================================================

  const handleStatusChange = async (next: PaymentStatus) => {
    if (!selectedPayment) return;

    try {
      setUpdatingStatusId(selectedPayment.id);

      const updated = await paymentService.updatePaymentStatus(
        selectedPayment.id,
        next,
      );

      toast.success(
        next === "SUCCESS"
          ? "Payment marked as paid"
          : `Payment marked as ${next.toLowerCase()}`,
      );

      setPayments((prev) =>
        prev.map((payment) =>
          payment.id === updated.id ? updated : payment,
        ),
      );
      setSelectedPayment(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update payment status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // =========================================================
  // View switching
  // =========================================================

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setView("details");
  };

  const handleRecordPayment = () => {
    setView("form");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setSelectedPayment(null);
    await loadPayments();
  };

  const handleFormCancel = () => {
    setView("list");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedPayment(null);
  };

  const handleClearFilters = () => {
    setSearchKeyword("");
    setStatusFilter("all");
    setMethodFilter("all");
  };

  // =========================================================
  // Record Payment Screen (SA/OWNER/MANAGER)
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Record Payment"
          description="Record a payment against a delivered order."
        />

        <div className="rounded-lg border bg-card p-6">
          <PaymentForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Payment Details Screen
  // =========================================================

  if (view === "details" && selectedPayment) {
    return (
      <PaymentDetails
        payment={selectedPayment}
        canManageStatus={canManage}
        updatingStatusId={updatingStatusId}
        onBack={handleBackToList}
        onStatusChange={handleStatusChange}
      />
    );
  }

  // =========================================================
  // Payments List
  // =========================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={
          role === "SHOPKEEPER"
            ? "Payments recorded against your orders."
            : "Record and track customer payments."
        }
        actions={
          canManage ? (
            <Button onClick={handleRecordPayment}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          ) : undefined
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Search order, customer, method or transaction..."
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as PaymentStatus | "all")
          }
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>

          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_META[status].label}
            </option>
          ))}
        </select>

        <select
          value={methodFilter}
          onChange={(event) => setMethodFilter(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Methods</option>

          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>

        {(searchKeyword || statusFilter !== "all" || methodFilter !== "all") && (
          <Button variant="ghost" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Payments List */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load payments"
            description={loadError}
            onRetry={loadPayments}
          />

        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading payments...
            </p>
          </div>

        ) : displayedPayments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={
              payments.length === 0
                ? "No payments yet"
                : "No payments match your filters"
            }
            description={
              payments.length === 0
                ? canManage
                  ? "Record a payment against a delivered order to get started."
                  : "You have no payments right now."
                : "Try clearing the search or choosing a different filter."
            }
            action={
              payments.length === 0 && canManage ? (
                <Button onClick={handleRecordPayment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              ) : payments.length > 0 ? (
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
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedPayments.map((payment) => {
                  const statusMeta = PAYMENT_STATUS_META[payment.paymentStatus];

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {payment.orderNumber}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Txn {payment.transactionId.slice(0, 8)}…
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {payment.shopkeeperName}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {formatINR(payment.amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span>{payment.paymentMethod}</span>
                        {payment.paymentChannel && (
                          <p className="text-xs text-muted-foreground">
                            {PAYMENT_CHANNEL_LABELS[payment.paymentChannel]}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(payment.paymentDate)}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={statusMeta.badgeVariant}>
                          {statusMeta.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
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
