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
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardService } from "@/services/api/dashboardService";
import { useAuthStore } from "@/store/authStore";
import type { DashboardResponse } from "@/types/dashboard.types";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

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

  const greeting = getGreeting();
  const userName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">{greeting}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, <span className="text-primary">{userName}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">Here's what's happening with your distribution business today.</p>
        </div>
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatINR(dashboard?.totalRevenue)} icon={DollarSign} accent="primary" isLoading={isLoading} />
        <StatCard label="Total Orders" value={dashboard?.totalOrders?.toLocaleString() ?? "0"} icon={ShoppingCart} accent="info" isLoading={isLoading} />
        <StatCard label="Pending Orders" value={dashboard?.pendingOrders?.toLocaleString() ?? "0"} icon={ClipboardList} accent="warning" isLoading={isLoading} />
        <StatCard label="Delivered Orders" value={dashboard?.deliveredOrders?.toLocaleString() ?? "0"} icon={CheckCircle2} accent="success" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid Amount" value={formatINR(dashboard?.paidAmount)} icon={CreditCard} accent="success" isLoading={isLoading} />
        <StatCard label="Outstanding" value={formatINR(dashboard?.outstandingAmount)} icon={Activity} accent="warning" isLoading={isLoading} />
        <StatCard label="Active Deliveries" value={dashboard?.activeDeliveries?.toLocaleString() ?? "0"} icon={Truck} accent="info" isLoading={isLoading} />
        <StatCard label="Low Stock Items" value={dashboard?.lowStockProducts?.toLocaleString() ?? "0"} icon={AlertTriangle} accent={Number(dashboard?.lowStockProducts) > 0 ? "destructive" : "success"} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Warehouses" value={dashboard?.totalWarehouses?.toLocaleString() ?? "0"} icon={Warehouse} accent="primary" isLoading={isLoading} />
        <StatCard label="Total Products" value={dashboard?.totalProducts?.toLocaleString() ?? "0"} icon={Package} accent="primary" isLoading={isLoading} />
        <StatCard label="Inventory Items" value={dashboard?.totalInventoryItems?.toLocaleString() ?? "0"} icon={Boxes} accent="info" isLoading={isLoading} />
        <StatCard label="Total Users" value={dashboard?.totalUsers?.toLocaleString() ?? "0"} icon={Users} accent="primary" isLoading={isLoading} />
        <StatCard label="Completed" value={dashboard?.completedOrders?.toLocaleString() ?? "0"} icon={CheckCircle2} accent="success" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-hover"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="size-4 text-primary" /> Orders Overview</CardTitle></CardHeader><CardContent className="space-y-3">{isLoading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : <><OrderStatusRow label="Approved" value={dashboard?.approvedOrders} total={dashboard?.totalOrders} color="bg-success" /><OrderStatusRow label="Cancelled" value={dashboard?.cancelledOrders} total={dashboard?.totalOrders} color="bg-destructive" /><OrderStatusRow label="Completed" value={dashboard?.completedOrders} total={dashboard?.totalOrders} color="bg-primary" /><OrderStatusRow label="Pending" value={dashboard?.pendingOrders} total={dashboard?.totalOrders} color="bg-warning" /></>}</CardContent></Card>
        <Card className="card-hover"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-primary" /> Financial Summary</CardTitle></CardHeader><CardContent className="space-y-4">{isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : <><FinanceRow label="Total Revenue" value={formatINR(dashboard?.totalRevenue)} /><FinanceRow label="Paid Amount" value={formatINR(dashboard?.paidAmount)} /><FinanceRow label="Outstanding" value={formatINR(dashboard?.outstandingAmount)} highlight /></>}</CardContent></Card>
        <Card className="card-hover"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" /> Business Health</CardTitle></CardHeader><CardContent className="space-y-3">{isLoading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : <><HealthIndicator label="Active Deliveries" value={dashboard?.activeDeliveries ?? 0} status={Number(dashboard?.activeDeliveries) > 0 ? "active" : "idle"} /><HealthIndicator label="Low Stock Alert" value={dashboard?.lowStockProducts ?? 0} status={Number(dashboard?.lowStockProducts) > 0 ? "warning" : "healthy"} /><HealthIndicator label="Pending Orders" value={dashboard?.pendingOrders ?? 0} status={Number(dashboard?.pendingOrders) > 5 ? "warning" : "healthy"} /><HealthIndicator label="Total Warehouses" value={dashboard?.totalWarehouses ?? 0} status="active" /></>}</CardContent></Card>
      </div>
    </div>
  );
}

function OrderStatusRow({ label, value = 0, total = 0, color }: { label: string; value?: number; total?: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FinanceRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-warning" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function HealthIndicator({ label, value, status }: { label: string; value: number; status: "healthy" | "active" | "warning" | "idle" }) {
  const config = {
    healthy: { color: "bg-success", badge: "bg-success/10 text-success border-success/20" },
    active: { color: "bg-primary", badge: "bg-primary/10 text-primary border-primary/20" },
    warning: { color: "bg-warning", badge: "bg-warning/10 text-warning border-warning/20" },
    idle: { color: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" },
  };
  const c = config[status];
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`size-2 rounded-full ${c.color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <Badge variant="outline" className={`text-[11px] font-semibold ${c.badge}`}>{value}</Badge>
    </div>
  );
}

function formatINR(amount: number | undefined): string {
  return amount != null
    ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₹0.00";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}