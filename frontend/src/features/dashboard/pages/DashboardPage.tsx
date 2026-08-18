import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { dashboardService } from "@/services/api/dashboardService";
import type { DashboardResponse } from "@/types/dashboard.types";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      const data = await dashboardService.getSummary();

      setDashboard(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your DistribuTrack business."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatINR(dashboard?.totalRevenue)}
          icon={DollarSign}
          isLoading={isLoading}
        />

        <StatCard
          label="Total Orders"
          value={dashboard?.totalOrders?.toLocaleString() ?? "0"}
          icon={ShoppingCart}
          isLoading={isLoading}
        />

        <StatCard
          label="Pending Orders"
          value={dashboard?.pendingOrders?.toLocaleString() ?? "0"}
          icon={ClipboardList}
          isLoading={isLoading}
        />

        <StatCard
          label="Delivered Orders"
          value={dashboard?.deliveredOrders?.toLocaleString() ?? "0"}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Paid Amount"
          value={formatINR(dashboard?.paidAmount)}
          icon={CreditCard}
          isLoading={isLoading}
        />

        <StatCard
          label="Outstanding"
          value={formatINR(dashboard?.outstandingAmount)}
          icon={Activity}
          isLoading={isLoading}
        />

        <StatCard
          label="Low Stock Products"
          value={dashboard?.lowStockProducts?.toLocaleString() ?? "0"}
          icon={AlertTriangle}
          isLoading={isLoading}
        />

        <StatCard
          label="Active Deliveries"
          value={dashboard?.activeDeliveries?.toLocaleString() ?? "0"}
          icon={Truck}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Approved Orders"
          value={dashboard?.approvedOrders?.toLocaleString() ?? "0"}
          icon={CheckCircle2}
          isLoading={isLoading}
        />

        <StatCard
          label="Cancelled Orders"
          value={dashboard?.cancelledOrders?.toLocaleString() ?? "0"}
          icon={XCircle}
          isLoading={isLoading}
        />

        <StatCard
          label="Warehouses"
          value={dashboard?.totalWarehouses?.toLocaleString() ?? "0"}
          icon={Warehouse}
          isLoading={isLoading}
        />

        <StatCard
          label="Inventory Items"
          value={dashboard?.totalInventoryItems?.toLocaleString() ?? "0"}
          icon={Boxes}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Completed Orders"
          value={dashboard?.completedOrders?.toLocaleString() ?? "0"}
          icon={ShoppingCart}
          isLoading={isLoading}
        />

        <StatCard
          label="Total Products"
          value={dashboard?.totalProducts?.toLocaleString() ?? "0"}
          icon={Package}
          isLoading={isLoading}
        />

        <StatCard
          label="Total Users"
          value={dashboard?.totalUsers?.toLocaleString() ?? "0"}
          icon={Users}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

/** Currency formatting consistent with the rest of the app (₹, en-IN). */
function formatINR(amount: number | undefined): string {
  return amount != null
    ? `₹${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "₹0.00";
}