import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/formatters";

import {
  paymentPayloadSchema,
  type PaymentPayloadValues,
} from "@/schemas/payment.schemas";

import { paymentService } from "@/services/api/paymentService";
import { orderService } from "@/services/api/orderService";

import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from "@/types/payment.types";
import type { Order } from "@/types/order.types";

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}


export function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentPayloadValues>({
    resolver: zodResolver(paymentPayloadSchema),
    defaultValues: { orderId: 0, amount: 0, paymentMethod: "" },
  });

  const selectedOrderId = watch("orderId");

  // ---------------------------------------------------------
  // Load DELIVERED orders that don't have a payment yet
  // ---------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        const [allOrders, allPayments] = await Promise.all([
          orderService.getAllOrders(),
          paymentService.getAllPayments(),
        ]);

        // Payments are recorded against delivered orders only; the
        // backend rejects everything else. Orders are fully settled when
        // the sum of SUCCESS payments covers the total — partially paid
        // orders still appear so more can be collected.
        const paidByOrder = new Map<number, number>();
        for (const payment of allPayments) {
          if (payment.paymentStatus !== "SUCCESS") continue;
          paidByOrder.set(
            payment.orderId,
            (paidByOrder.get(payment.orderId) ?? 0) + payment.amount,
          );
        }

        setOrders(
          allOrders.filter((order) => {
            if (order.status !== "DELIVERED") return false;
            const paid = paidByOrder.get(order.id) ?? 0;
            return paid < order.totalAmount;
          }),
        );
      } catch (error) {
        console.error(error);
        toast.error("Failed to load payment data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // ---------------------------------------------------------
  // Default the amount to the selected order's OUTSTANDING balance
  // (an order may have several payments — reconciliation is server-side)
  // ---------------------------------------------------------
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const handleOrderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = Number(event.target.value);
    setValue("orderId", orderId, { shouldValidate: true });

    const order = orders.find((candidate) => candidate.id === orderId);
    if (order) {
      setValue("amount", order.totalAmount, { shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);

      await paymentService.createPayment(values);

      toast.success("Payment recorded successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  });

  const hasNoPayableOrders = !isLoadingData && orders.length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Order */}
      <div className="space-y-2">
        <label htmlFor="orderId" className="text-sm font-medium">
          Order *
        </label>

        <select
          id="orderId"
          value={selectedOrderId}
          onChange={handleOrderChange}
          disabled={isLoadingData}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={0}>
            {isLoadingData ? "Loading orders..." : "Select a delivered order"}
          </option>

          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNumber} — {order.shopkeeperName} (
              {formatINR(order.totalAmount)})
            </option>
          ))}
        </select>

        {errors.orderId && (
          <p className="text-sm text-destructive">{errors.orderId.message}</p>
        )}

        {hasNoPayableOrders && (
          <p className="text-xs text-muted-foreground">
            No delivered, unpaid orders found. Deliveries must be marked
            Delivered before a payment can be recorded.
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount *
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₹
          </span>

          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            className="pl-7"
            {...register("amount", { valueAsNumber: true })}
          />
        </div>

        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}

        {selectedOrder && (
          <p className="text-xs text-muted-foreground">
            Order total is {formatINR(selectedOrder.totalAmount)} — the
            backend rejects amounts above the outstanding balance (partial
            payments are supported).
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="space-y-2">
        <label htmlFor="paymentMethod" className="text-sm font-medium">
          Payment Method *
        </label>

        <select
          id="paymentMethod"
          {...register("paymentMethod")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a method</option>

          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>

        {errors.paymentMethod && (
          <p className="text-sm text-destructive">
            {errors.paymentMethod.message}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={isSubmitting || isLoadingData}>
          {isSubmitting ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}
