import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatINR } from "@/lib/formatters";

import { analyticsService } from "@/services/api/analyticsService";
import { DateRangeFilter } from "@/features/reports/components/DateRangeFilter";
import { ORDER_STATUS_META } from "@/features/orders/orderStatus";
import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import { PAYMENT_STATUS_META } from "@/features/payments/paymentStatus";

import {
  dateRangeForPreset,
  type DateRangePreset,
} from "@/lib/dateRange";
import type {
  AnalyticsResponse,
  DeliveryAnalyticsResponse,
  InventoryAnalyticsResponse,
  PaymentAnalyticsResponse,
  SalesAnalyticsResponse,
} from "@/types/analytics.types";

const CHART_COLORS = [
  "#0e8a7d",
  "#3b82f6",
  "#f59e0b",
  "#16a34a",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
];

function statusLabel(status: string, meta: Record<string, { label: string }>): string {
  return meta[status]?.label ?? status.replace(/_/g, " ").toLowerCase();
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsResponse | null>(null);
  const [sales, setSales] = useState<SalesAnalyticsResponse | null>(null);
  const [payments, setPayments] = useState<PaymentAnalyticsResponse | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryAnalyticsResponse | null>(null);
  const [inventory, setInventory] = useState<InventoryAnalyticsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const range = dateRangeForPreset(preset, customFrom, customTo);

      const [overviewData, salesData, paymentsData, deliveriesData, inventoryData] =
        await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getSales(
            range.from && range.to ? { from: range.from, to: range.to } : undefined,
          ),
          analyticsService.getPayments(),
          analyticsService.getDeliveries(),
          analyticsService.getInventory(),
        ]);

      setOverview(overviewData);
      setSales(salesData);
      setPayments(paymentsData);
      setDeliveries(deliveriesData);
      setInventory(inventoryData);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const salesTrendData = sales?.salesTrend ?? [];
  const orderStatusData = (sales?.orderStatusDistribution ?? []).map((item) => ({
    ...item,
    label: statusLabel(item.name, ORDER_STATUS_META),
  }));
  const paymentStatusData = (sales?.paymentStatusDistribution ?? []).map((item) => ({
    ...item,
    label: statusLabel(item.name, PAYMENT_STATUS_META),
  }));
  const deliveryStatusData = (deliveries?.deliveryStatusDistribution ?? []).map(
    (item) => ({
      ...item,
      label: statusLabel(item.name, DELIVERY_STATUS_META),
    }),
  );
  const paymentByMethodData = (payments?.byMethod ?? []).map((item) => ({
    ...item,
    label: item.method,
  }));
  const inventoryByWarehouse = (inventory?.byWarehouse ?? []).map((item) => ({
    ...item,
    label: item.warehouseLocation,
  }));

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Business performance at a glance." />
        <ErrorState
          title="Couldn't load analytics"
          description={loadError}
          onRetry={loadAll}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Business-wide analytics from live order, payment, inventory and delivery data."
      />

      {/* Date range (applies to the sales trend chart) */}
      <div className="rounded-lg border bg-card p-4">
        <DateRangeFilter
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={overview ? formatINR(overview.totalRevenue) : "₹0.00"}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Orders"
          value={overview?.totalOrders?.toLocaleString() ?? "0"}
          icon={ShoppingCart}
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Orders"
          value={overview?.pendingOrders?.toLocaleString() ?? "0"}
          icon={ClipboardList}
          isLoading={isLoading}
        />
        <StatCard
          label="Delivered Orders"
          value={overview?.deliveredOrders?.toLocaleString() ?? "0"}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Paid Amount"
          value={overview ? formatINR(overview.paidAmount) : "₹0.00"}
          icon={CreditCard}
          isLoading={isLoading}
        />
        <StatCard
          label="Outstanding"
          value={overview ? formatINR(overview.outstandingAmount) : "₹0.00"}
          icon={Activity}
          isLoading={isLoading}
        />
        <StatCard
          label="Low Stock Products"
          value={overview?.lowStockProducts?.toLocaleString() ?? "0"}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <StatCard
          label="Active Deliveries"
          value={overview?.activeDeliveries?.toLocaleString() ?? "0"}
          icon={Truck}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Approved Orders"
          value={overview?.approvedOrders?.toLocaleString() ?? "0"}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <StatCard
          label="Cancelled Orders"
          value={overview?.cancelledOrders?.toLocaleString() ?? "0"}
          icon={XCircle}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Products"
          value={overview?.totalProducts?.toLocaleString() ?? "0"}
          icon={Package}
          isLoading={isLoading}
        />
        <StatCard
          label="Warehouses"
          value={overview?.totalWarehouses?.toLocaleString() ?? "0"}
          icon={Warehouse}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      ) : salesTrendData.length === 0 &&
        orderStatusData.length === 0 &&
        deliveryStatusData.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No analytics data yet"
          description="Charts will populate as orders, payments and deliveries are recorded."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sales over time */}
          {salesTrendData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Sales over time</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Revenue (completed orders) and order volume in the selected range.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={70} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue" ? formatINR(Number(value ?? 0)) : value
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#0e8a7d"
                    fill="#0e8a7d"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Order status */}
          {orderStatusData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Order status</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Distribution of orders by lifecycle state.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top products */}
          {(sales?.topProducts.length ?? 0) > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Top products</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Best-selling products by quantity.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sales!.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="productName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" name="Quantity" fill="#0e8a7d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top shops */}
          {(sales?.topShops.length ?? 0) > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Top customers</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Shops by completed-order revenue.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sales!.topShops}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="shopkeeperName" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatINR(Number(value))}
                    width={80}
                  />
                  <Tooltip formatter={(value) => formatINR(Number(value ?? 0))} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment status */}
          {paymentStatusData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Payment status</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Payments by status.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Delivery status */}
          {deliveryStatusData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Delivery status</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Deliveries by status.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deliveryStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Deliveries" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Inventory by warehouse */}
          {inventoryByWarehouse.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Stock by warehouse</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Inventory quantity per warehouse location.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={inventoryByWarehouse}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" name="Quantity" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment by method */}
          {paymentByMethodData.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 text-sm font-semibold">Payments by method</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Payment volume per method.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={paymentByMethodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatINR(Number(value))}
                    width={80}
                  />
                  <Tooltip formatter={(value) => formatINR(Number(value ?? 0))} />
                  <Bar dataKey="amount" name="Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Out-of-stock / low-stock summary from inventory analytics */}
          {inventory && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Boxes className="h-4 w-4 text-primary" />
                Inventory health
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-semibold">
                    {inventory.totalQuantity.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total units in stock</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {inventory.lowStockProducts.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Low-stock products</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {inventory.outOfStockProducts.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Out-of-stock products</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {overview?.totalWarehouses?.toLocaleString() ?? "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Warehouse locations</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
