import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/formatters";

import {
  orderItemRowSchema,
  orderPayloadSchema,
  type OrderItemRowValues,
} from "@/schemas/order.schemas";

import { orderService } from "@/services/api/orderService";
import { productService } from "@/services/api/productService";
import { userService } from "@/services/api/userService";
import { useAuthStore } from "@/store/authStore";

import type { OrderItemPayload } from "@/types/order.types";
import type { Product } from "@/types/product.types";
import type { UserProfile } from "@/types/auth.types";

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}


export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const user = useAuthStore((state) => state.user);
  const isShopkeeper = user?.role === "SHOPKEEPER";

  const [products, setProducts] = useState<Product[]>([]);
  const [shopkeepers, setShopkeepers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [items, setItems] = useState<OrderItemPayload[]>([]);
  const [itemError, setItemError] = useState<string | null>(null);
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add-item row
  const rowForm = useForm<OrderItemRowValues>({
    resolver: zodResolver(orderItemRowSchema),
    defaultValues: { productId: 0, quantity: 1 },
  });

  // ---------------------------------------------------------
  // Load products + (for non-shopkeepers) the shopkeeper list
  // ---------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        const [productData, shopkeeperData] = await Promise.all([
          productService.getAllProducts(),
          isShopkeeper
            ? Promise.resolve([] as UserProfile[])
            : userService.getUsers({ role: "SHOPKEEPER" }),
        ]);

        // Only active products can be ordered.
        setProducts(productData.filter((product) => product.active));
        setShopkeepers(
          shopkeeperData.filter((shopkeeper) => shopkeeper.enabled),
        );
      } catch (error) {
        console.error(error);
        toast.error("Failed to load order data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isShopkeeper]);

  // ---------------------------------------------------------
  // Line item helpers
  // ---------------------------------------------------------
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const totalAmount = items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const handleAddItem = rowForm.handleSubmit((values) => {
    const alreadyAdded = items.some(
      (item) => item.productId === values.productId,
    );

    if (alreadyAdded) {
      setItemError("This product is already in the order");
      return;
    }

    setItems((prev) => [...prev, values]);
    setItemError(null);
    rowForm.reset({ productId: 0, quantity: 1 });
  });

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setItemError(null);
  };

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------
  const handleSubmitOrder = async () => {
    // SHOPKEEPER never picks a shopkeeper: send their own id, which the
    // backend ignores and replaces with the JWT principal anyway.
    const payloadResult = orderPayloadSchema.safeParse({
      shopkeeperId: isShopkeeper ? user?.id : selectedShopkeeperId,
      items,
    });

    if (!payloadResult.success) {
      // Zod v4 exposes issues; fall back for older typings.
      const firstIssue =
        payloadResult.error.issues?.[0] ??
        (payloadResult.error as { errors?: { message?: string }[] }).errors?.[0];
      setItemError(firstIssue?.message ?? "Invalid order");
      return;
    }

    try {
      setIsSubmitting(true);

      await orderService.createOrder(payloadResult.data);

      toast.success("Order created successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =====================================================
          Shopkeeper (business roles only)
      ====================================================== */}
      {!isShopkeeper && (
        <div className="space-y-2">
          <label htmlFor="shopkeeperId" className="text-sm font-medium">
            Shopkeeper / Customer *
          </label>

          <select
            id="shopkeeperId"
            value={selectedShopkeeperId}
            onChange={(event) =>
              setSelectedShopkeeperId(Number(event.target.value))
            }
            disabled={isLoadingData}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value={0}>
              {isLoadingData
                ? "Loading shopkeepers..."
                : "Select a shopkeeper"}
            </option>

            {shopkeepers.map((shopkeeper) => (
              <option key={shopkeeper.id} value={shopkeeper.id}>
                {shopkeeper.fullName} — {shopkeeper.email}
              </option>
            ))}
          </select>

          {shopkeepers.length === 0 && !isLoadingData && (
            <p className="text-xs text-muted-foreground">
              No shopkeeper accounts found. Create one in Customer
              management first.
            </p>
          )}
        </div>
      )}

      {isShopkeeper && (
        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Ordering as <span className="font-medium">{user?.fullName}</span> —
          the order will be placed on your account.
        </p>
      )}

      {/* =====================================================
          Add Item Row
      ====================================================== */}
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium">Add Products</p>

        <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
          {/* Product */}
          <div className="space-y-2">
            <label htmlFor="productId" className="text-sm font-medium">
              Product *
            </label>

            <select
              id="productId"
              {...rowForm.register("productId", { valueAsNumber: true })}
              disabled={isLoadingData}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={0}>
                {isLoadingData ? "Loading products..." : "Select a product"}
              </option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.productName} — {formatINR(product.price)}
                </option>
              ))}
            </select>

            {rowForm.formState.errors.productId && (
              <p className="text-sm text-destructive">
                {rowForm.formState.errors.productId.message}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity *
            </label>

            <Input
              id="quantity"
              type="number"
              min="1"
              {...rowForm.register("quantity", { valueAsNumber: true })}
            />

            {rowForm.formState.errors.quantity && (
              <p className="text-sm text-destructive">
                {rowForm.formState.errors.quantity.message}
              </p>
            )}
          </div>

          {/* Add button */}
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={isLoadingData || isSubmitting}
              className="w-full lg:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {itemError && <p className="mt-3 text-sm text-destructive">{itemError}</p>}
      </div>

      {/* =====================================================
          Items Summary
      ====================================================== */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr className="border-b last:border-0">
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No items added yet. Select a product and quantity above.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const product = productById.get(item.productId);

                  return (
                    <tr key={`${item.productId}-${index}`} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {product?.productName ?? `Product #${item.productId}`}
                        </span>
                      </td>

                      <td className="px-4 py-3">{item.quantity}</td>

                      <td className="px-4 py-3">
                        {product ? formatINR(product.price) : "—"}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {product
                          ? formatINR(product.price * item.quantity)
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm font-medium">Total</p>
          <p className="text-lg font-semibold">{formatINR(totalAmount)}</p>
        </div>
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

        <Button
          type="button"
          onClick={handleSubmitOrder}
          disabled={isSubmitting || isLoadingData}
        >
          {isSubmitting ? "Placing order..." : "Place Order"}
        </Button>
      </div>
    </div>
  );
}
