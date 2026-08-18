import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { orderService } from "@/services/api/orderService";
import { useAuthStore } from "@/store/authStore";

import {
  ORDER_STATUS_META,
} from "@/features/orders/orderStatus";
import { OrderForm } from "@/features/orders/components/OrderForm";
import { OrderDetails } from "@/features/orders/components/OrderDetails";

import { ORDER_STATUSES, type Order, type OrderStatus } from "@/types/order.types";
import { formatDateTime, formatINR } from "@/lib/formatters";


type PageView = "list" | "details" | "form";

export function OrdersPage() {
  const user = useAuthStore((state) => state.user);
  const isShopkeeper = user?.role === "SHOPKEEPER";

  // Backend SecurityConfig: status updates (PUT) are SA/OWNER/MANAGER only.
  const canManageStatus =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "OWNER" ||
    user?.role === "MANAGER";

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const [view, setView] = useState<PageView>("list");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // =========================================================
  // Load Orders — SHOPKEEPER always hits /my (own orders only)
  // =========================================================

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = isShopkeeper
        ? await orderService.getMyOrders()
        : await orderService.getAllOrders();

      setOrders(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // isShopkeeper is stable for the session; no need to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // Search + status filter (client-side over the loaded list —
  // composes instantly; backend /orders/status/{status} also exists)
  // =========================================================

  const displayedOrders = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (!keyword) return true;

      return (
        order.orderNumber.toLowerCase().includes(keyword) ||
        order.shopkeeperName.toLowerCase().includes(keyword) ||
        order.status.toLowerCase().includes(keyword)
      );
    });
  }, [orders, searchKeyword, statusFilter]);

  // =========================================================
  // Status update (SA/OWNER/MANAGER only — button hidden otherwise)
  // =========================================================

  const handleStatusChange = async (next: OrderStatus) => {
    if (!selectedOrder) return;

    try {
      setUpdatingStatusId(selectedOrder.id);

      const updated = await orderService.updateOrderStatus(
        selectedOrder.id,
        next,
      );

      toast.success(`Order marked as ${next.replace(/_/g, " ").toLowerCase()}`);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === updated.id ? updated : order,
        ),
      );
      setSelectedOrder(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // =========================================================
  // View switching
  // =========================================================

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setView("details");
  };

  const handleAddOrder = () => {
    setView("form");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setSelectedOrder(null);

    await loadOrders();
  };

  const handleFormCancel = () => {
    setView("list");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedOrder(null);
  };

  const handleClearFilters = () => {
    setSearchKeyword("");
    setStatusFilter("all");
  };

  // =========================================================
  // Create Order Screen
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Order"
          description="Build an order from your product catalog."
        />

        <div className="rounded-lg border bg-card p-6">
          <OrderForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Order Details Screen
  // =========================================================

  if (view === "details" && selectedOrder) {
    return (
      <OrderDetails
        order={selectedOrder}
        canManageStatus={canManageStatus}
        isShopkeeper={isShopkeeper}
        updatingStatusId={updatingStatusId}
        onBack={handleBackToList}
        onStatusChange={handleStatusChange}
      />
    );
  }

  // =========================================================
  // Orders List
  // =========================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Orders"
        description={
          isShopkeeper
            ? "Track the status of your orders."
            : "Review, approve and manage customer orders."
        }
        actions={
          <Button onClick={handleAddOrder}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        }
      />

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={searchKeyword}
            onChange={(event) =>
              setSearchKeyword(event.target.value)
            }
            placeholder="Search order number, shopkeeper or status..."
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as OrderStatus | "all")
          }
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>

          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_META[status].label}
            </option>
          ))}
        </select>

        {(searchKeyword || statusFilter !== "all") && (
          <Button variant="ghost" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Orders List */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load orders"
            description={loadError}
            onRetry={loadOrders}
          />

        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading orders...
            </p>
          </div>

        ) : displayedOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={
              orders.length === 0
                ? "No orders yet"
                : "No orders match your filters"
            }
            description={
              orders.length === 0
                ? isShopkeeper
                  ? "Place your first order to see it here."
                  : "Create an order to get started."
                : "Try clearing the search or choosing a different status."
            }
            action={
              orders.length === 0 ? (
                <Button onClick={handleAddOrder}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              ) : (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )
            }
          />

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Shopkeeper</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];

                  return (
                    <tr
                      key={order.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {order.orderNumber}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {order.shopkeeperName}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(order.orderDate)}
                      </td>

                      <td className="px-4 py-3">
                        {order.items.length}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {formatINR(order.totalAmount)}
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
                            onClick={() => handleViewOrder(order)}
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
