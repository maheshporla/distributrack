import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  deliveryPayloadSchema,
  type DeliveryPayloadValues,
} from "@/schemas/delivery.schemas";

import { deliveryService } from "@/services/api/deliveryService";
import { orderService } from "@/services/api/orderService";
import { userService } from "@/services/api/userService";

import type { Order } from "@/types/order.types";
import type { UserProfile } from "@/types/auth.types";

interface DeliveryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function DeliveryForm({ onSuccess, onCancel }: DeliveryFormProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryPayloadValues>({
    resolver: zodResolver(deliveryPayloadSchema),
    defaultValues: {
      orderId: 0,
      deliveryBoyId: 0,
      deliveryAddress: "",
      vehicleNumber: "",
    },
  });

  // ---------------------------------------------------------
  // Load assignable orders + delivery boys
  // ---------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        const [allOrders, allDeliveries, allBoys] = await Promise.all([
          orderService.getAllOrders(),
          deliveryService.getAllDeliveries(),
          userService.getUsers({ role: "DELIVERY_BOY" }),
        ]);

        // An order is assignable when it has been approved (the backend
        // only allows the APPROVED -> ASSIGNED order transition) and does
        // not already have a delivery (the backend rejects duplicates).
        const deliveredOrderIds = new Set(
          allDeliveries.map((delivery) => delivery.orderId),
        );

        setOrders(
          allOrders.filter(
            (order) =>
              order.status === "APPROVED" &&
              !deliveredOrderIds.has(order.id),
          ),
        );

        // Only enabled accounts can take a delivery.
        setDeliveryBoys(allBoys.filter((boy) => boy.enabled));
      } catch (error) {
        console.error(error);
        toast.error("Failed to load delivery data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true);

      await deliveryService.createDelivery({
        orderId: values.orderId,
        deliveryBoyId: values.deliveryBoyId,
        deliveryAddress: values.deliveryAddress,
        vehicleNumber: values.vehicleNumber || undefined,
      });

      toast.success("Delivery assigned successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign delivery");
    } finally {
      setIsSubmitting(false);
    }
  });

  const hasNoAssignableOrders = useMemo(
    () => !isLoadingData && orders.length === 0,
    [isLoadingData, orders.length],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* =====================================================
          Order
      ====================================================== */}
      <div className="space-y-2">
        <label htmlFor="orderId" className="text-sm font-medium">
          Order *
        </label>

        <select
          id="orderId"
          {...register("orderId", { valueAsNumber: true })}
          disabled={isLoadingData}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={0}>
            {isLoadingData ? "Loading orders..." : "Select an order"}
          </option>

          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNumber} — {order.shopkeeperName}
            </option>
          ))}
        </select>

        {errors.orderId && (
          <p className="text-sm text-destructive">{errors.orderId.message}</p>
        )}

        {hasNoAssignableOrders && (
          <p className="text-xs text-muted-foreground">
            No approved orders awaiting delivery. Approve an order first, or
            the order may already be assigned.
          </p>
        )}
      </div>

      {/* =====================================================
          Delivery Boy
      ====================================================== */}
      <div className="space-y-2">
        <label htmlFor="deliveryBoyId" className="text-sm font-medium">
          Delivery Boy *
        </label>

        <select
          id="deliveryBoyId"
          {...register("deliveryBoyId", { valueAsNumber: true })}
          disabled={isLoadingData}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={0}>
            {isLoadingData
              ? "Loading delivery boys..."
              : "Select a delivery boy"}
          </option>

          {deliveryBoys.map((boy) => (
            <option key={boy.id} value={boy.id}>
              {boy.fullName} — {boy.phone}
            </option>
          ))}
        </select>

        {errors.deliveryBoyId && (
          <p className="text-sm text-destructive">
            {errors.deliveryBoyId.message}
          </p>
        )}

        {!isLoadingData && deliveryBoys.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No enabled delivery workers found. Create one under Delivery
            Workers first.
          </p>
        )}
      </div>

      {/* =====================================================
          Delivery Address
      ====================================================== */}
      <div className="space-y-2">
        <label htmlFor="deliveryAddress" className="text-sm font-medium">
          Delivery Address *
        </label>

        <textarea
          id="deliveryAddress"
          rows={3}
          {...register("deliveryAddress")}
          placeholder="Full delivery address for the shop"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {errors.deliveryAddress && (
          <p className="text-sm text-destructive">
            {errors.deliveryAddress.message}
          </p>
        )}
      </div>

      {/* =====================================================
          Vehicle
      ====================================================== */}
      <div className="space-y-2">
        <label htmlFor="vehicleNumber" className="text-sm font-medium">
          Vehicle Number <span className="text-muted-foreground">(optional)</span>
        </label>

        <Input
          id="vehicleNumber"
          placeholder="e.g. MH 12 AB 1234"
          {...register("vehicleNumber")}
        />
      </div>

      {/* =====================================================
          Buttons
      ====================================================== */}
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
          {isSubmitting ? "Assigning..." : "Assign Delivery"}
        </Button>
      </div>
    </form>
  );
}
