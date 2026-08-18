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

import { PageHeader } from "@/components/shared/PageHeader";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Shopkeeper"}`}
        description="Your shop overview and recent activity."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          icon={ShoppingCart}
          isLoading={isLoading}
        />

        <StatCard
          label="Pending Orders"
          value={pendingOrders.toLocaleString()}
          icon={ClipboardList}
          isLoading={isLoading}
        />

        <StatCard
          label="Delivered"
          value={deliveredOrders.toLocaleString()}
          icon={Truck}
          isLoading={isLoading}
        />

        <StatCard
          label="Completed"
          value={completedOrders.toLocaleString()}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Spent"
          value={formatINR(totalSpent)}
          icon={DollarSign}
          isLoading={isLoading}
        />

        <StatCard
          label="Total Paid"
          value={formatINR(totalPaid)}
          icon={CreditCard}
          isLoading={isLoading}
        />

        <StatCard
          label="Outstanding"
          value={formatINR(outstandingAmount)}
          icon={DollarSign}
          isLoading={isLoading}
        />

        <StatCard
          label="Approved"
          value={approvedOrders.toLocaleString()}
          icon={Package}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
