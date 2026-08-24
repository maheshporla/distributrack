import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/shared/StatCard";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";
import type { Order } from "@/types/order.types";
import type { Payment } from "@/types/payment.types";
import { formatINR } from "@/lib/formatters";

/**
 * Dedicated Shopkeeper dashboard showing only the shopkeeper's own data.
 * No distributor-wide statistics — only orders, payments, and invoices
 * that belong to the authenticated shopkeeper.
 */
export function ShopkeeperDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [ordersData, paymentsData] = await Promise.all([
          orderService.getMyOrders(),
          paymentService.getAllPayments(),
        ]);
        setOrders(ordersData);
        setPayments(paymentsData);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute shopkeeper-specific stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const approvedOrders = orders.filter((o) => o.status === "APPROVED").length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;

  const totalSpent = orders
    .filter((o) => o.status === "COMPLETED" || o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const successfulPayments = payments.filter(
    (p) => p.paymentStatus === "SUCCESS"
  );
  const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingAmount = totalSpent - totalPaid;

  const userName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">Your Shop Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, <span className="text-primary">{userName}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">Here's your shop overview and recent activity.</p>
        </div>
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={totalOrders.toLocaleString()} icon={ShoppingCart} accent="primary" isLoading={isLoading} />
        <StatCard label="Pending Orders" value={pendingOrders.toLocaleString()} icon={ClipboardList} accent="warning" isLoading={isLoading} />
        <StatCard label="Delivered" value={deliveredOrders.toLocaleString()} icon={Truck} accent="info" isLoading={isLoading} />
        <StatCard label="Completed" value={completedOrders.toLocaleString()} icon={CheckCircle2} accent="success" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Spent" value={formatINR(totalSpent)} icon={DollarSign} accent="primary" isLoading={isLoading} />
        <StatCard label="Total Paid" value={formatINR(totalPaid)} icon={CreditCard} accent="success" isLoading={isLoading} />
        <StatCard label="Outstanding" value={formatINR(outstandingAmount)} icon={DollarSign} accent="warning" isLoading={isLoading} />
        <StatCard label="Approved" value={approvedOrders.toLocaleString()} icon={Package} accent="info" isLoading={isLoading} />
      </div>
    </div>
  );
}
