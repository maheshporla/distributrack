import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, FileText, ShoppingCart, Truck, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";
import { invoiceService } from "@/services/api/invoiceService";
import { deliveryService } from "@/services/api/deliveryService";

import type { UserProfile } from "@/types/auth.types";
import type { Order } from "@/types/order.types";
import type { Payment } from "@/types/payment.types";
import type { Invoice } from "@/types/invoice.types";
import type { Delivery } from "@/types/delivery.types";

import { formatDate, formatINR } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface CustomerDetailsProps {
  customer: UserProfile;
  onBack: () => void;
}

type DetailTab = "orders" | "payments" | "invoices" | "deliveries";

export function CustomerDetails({ customer, onBack }: CustomerDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("orders");

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        // Fetch all data points in parallel. If one fails, we catch it locally or let the whole chain fail.
        // Since we scoped security, if the logged-in user is allowed to view customers,
        // they are allowed to query these endpoints too.
        const [ordersData, paymentsData, invoicesData, deliveriesData] = await Promise.all([
          orderService.getOrdersByShopkeeper(customer.id),
          paymentService.getAllPayments(),
          invoiceService.getAllInvoices(),
          deliveryService.getAllDeliveries(),
        ]);

        setOrders(ordersData);
        setPayments(paymentsData.filter((p) => p.shopkeeperId === customer.id));
        setInvoices(invoicesData.filter((i) => i.shopkeeperId === customer.id));
        setDeliveries(deliveriesData.filter((d) => d.shopkeeperId === customer.id));
      } catch (error: any) {
        console.error(error);
        setErrorMsg("Failed to load customer transactional history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customer.id]);

  const tabs: { id: DetailTab; label: string; icon: any; count: number }[] = [
    { id: "orders", label: "Orders", icon: ShoppingCart, count: orders.length },
    { id: "payments", label: "Payments", icon: CreditCard, count: payments.length },
    { id: "invoices", label: "Invoices", icon: FileText, count: invoices.length },
    { id: "deliveries", label: "Deliveries", icon: Truck, count: deliveries.length },
  ];

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      {/* Customer Profile Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{customer.fullName}</h2>
            <p className="text-muted-foreground mt-1">ID: #{customer.id}</p>
          </div>
          <Badge variant={customer.enabled ? "success" : "secondary"} className="text-sm px-3 py-1">
            {customer.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid gap-4 mt-6 sm:grid-cols-2 md:grid-cols-3 border-t pt-6 text-sm">
          <div>
            <span className="text-muted-foreground block">Email Address</span>
            <span className="font-medium text-foreground">{customer.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Phone Number</span>
            <span className="font-medium text-foreground">{customer.phone}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Created Date</span>
            <span className="font-medium text-foreground">{formatDate(customer.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  activeTab === tab.id
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="rounded-lg border bg-card p-6">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading history data...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          </div>
        ) : (
          <div>
            {/* Orders Panel */}
            {activeTab === "orders" && (
              <div className="overflow-x-auto">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No orders placed by this customer.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4">Order Number</th>
                        <th className="pb-3 px-4">Date</th>
                        <th className="pb-3 px-4">Total Amount</th>
                        <th className="pb-3 pl-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-medium">{o.orderNumber}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(o.orderDate)}</td>
                          <td className="py-3 px-4 font-semibold">{formatINR(o.totalAmount)}</td>
                          <td className="py-3 pl-4 text-right">
                            <Badge variant={o.status === "COMPLETED" ? "success" : o.status === "PENDING" ? "warning" : "secondary"}>
                              {o.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Payments Panel */}
            {activeTab === "payments" && (
              <div className="overflow-x-auto">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No payments recorded for this customer.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4">Transaction ID</th>
                        <th className="pb-3 px-4">Order Number</th>
                        <th className="pb-3 px-4">Date</th>
                        <th className="pb-3 px-4">Amount</th>
                        <th className="pb-3 px-4">Method</th>
                        <th className="pb-3 pl-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-mono font-medium text-xs">{p.transactionId}</td>
                          <td className="py-3 px-4 text-muted-foreground">{p.orderNumber}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                          <td className="py-3 px-4 font-semibold">{formatINR(p.amount)}</td>
                          <td className="py-3 px-4 text-xs capitalize">{p.paymentMethod}</td>
                          <td className="py-3 pl-4 text-right">
                            <Badge variant={p.paymentStatus === "SUCCESS" ? "success" : "secondary"}>
                              {p.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Invoices Panel */}
            {activeTab === "invoices" && (
              <div className="overflow-x-auto">
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No invoices generated for this customer.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4">Invoice Number</th>
                        <th className="pb-3 px-4">Date</th>
                        <th className="pb-3 px-4">Total Amount</th>
                        <th className="pb-3 px-4">Payment Method</th>
                        <th className="pb-3 pl-4 text-right">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.orderId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-medium">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(inv.orderDate)}</td>
                          <td className="py-3 px-4 font-semibold">{formatINR(inv.totalAmount)}</td>
                          <td className="py-3 px-4 text-muted-foreground capitalize">{inv.paymentMethod ?? "—"}</td>
                          <td className="py-3 pl-4 text-right">
                            <Badge variant={inv.paymentStatus === "SUCCESS" ? "success" : "secondary"}>
                              {inv.paymentStatus ?? "UNPAID"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Deliveries Panel */}
            {activeTab === "deliveries" && (
              <div className="overflow-x-auto">
                {deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No deliveries assigned for this customer.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4">Order Number</th>
                        <th className="pb-3 px-4">Delivery Person</th>
                        <th className="pb-3 px-4">Date Assigned</th>
                        <th className="pb-3 px-4">Vehicle</th>
                        <th className="pb-3 px-4">Address</th>
                        <th className="pb-3 pl-4 text-right">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((d) => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-medium">{d.orderNumber}</td>
                          <td className="py-3 px-4 text-muted-foreground">{d.deliveryBoyName}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(d.assignedAt)}</td>
                          <td className="py-3 px-4 text-xs font-mono">{d.vehicleNumber ?? "—"}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-muted-foreground" title={d.deliveryAddress}>
                            {d.deliveryAddress}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Badge variant={d.deliveryStatus === "DELIVERED" ? "success" : d.deliveryStatus === "CANCELLED" ? "destructive" : "secondary"}>
                              {d.deliveryStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
