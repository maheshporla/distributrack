import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  inventorySchema,
  type InventoryFormValues,
} from "@/schemas/inventory.schemas";

import { inventoryService } from "@/services/api/inventoryService";
import { productService } from "@/services/api/productService";

import type {
  Inventory,
  InventoryPayload,
} from "@/types/inventory.types";

import type { Product } from "@/types/product.types";

interface InventoryFormProps {
  inventory?: Inventory | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InventoryForm({
  inventory,
  onSuccess,
  onCancel,
}: InventoryFormProps) {
  const isEditing = Boolean(inventory);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] =
    useState(true);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      productId: inventory?.productId ?? 0,
      quantity: inventory?.quantity ?? 0,
      minimumStock: inventory?.minimumStock ?? 0,
      maximumStock: inventory?.maximumStock ?? 100,
      warehouseLocation:
        inventory?.warehouseLocation ?? "",
      active: inventory?.active ?? true,
    },
  });

  // ---------------------------------------------------------
  // Load products
  // ---------------------------------------------------------
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);

        const data =
          await productService.getAllProducts();

        setProducts(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // ---------------------------------------------------------
  // Reset form when editing inventory
  // ---------------------------------------------------------
  useEffect(() => {
    if (inventory) {
      form.reset({
        productId: inventory.productId,
        quantity: inventory.quantity,
        minimumStock: inventory.minimumStock,
        maximumStock: inventory.maximumStock,
        warehouseLocation:
          inventory.warehouseLocation,
        active: inventory.active,
      });
    }
  }, [inventory, form]);

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------
  const onSubmit = form.handleSubmit(async (values) => {
    const payload: InventoryPayload = {
      productId: values.productId,
      quantity: values.quantity,
      minimumStock: values.minimumStock,
      maximumStock: values.maximumStock,
      warehouseLocation:
        values.warehouseLocation.trim(),
      active: values.active,
    };

    try {
      if (isEditing && inventory) {
        await inventoryService.updateInventory(
          inventory.id,
          payload,
        );

        toast.success(
          "Inventory updated successfully",
        );
      } else {
        await inventoryService.createInventory(
          payload,
        );

        toast.success(
          "Inventory created successfully",
        );
      }

      onSuccess();
    } catch (error) {
      console.error(error);

      toast.error(
        isEditing
          ? "Failed to update inventory"
          : "Failed to create inventory",
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
    >
      {/* =====================================================
          Product
      ====================================================== */}
      <div className="space-y-2">
        <label
          htmlFor="productId"
          className="text-sm font-medium"
        >
          Product *
        </label>

        <select
          id="productId"
          {...form.register("productId", {
            valueAsNumber: true,
          })}
          disabled={
            isEditing || isLoadingProducts
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value={0}>
            {isLoadingProducts
              ? "Loading products..."
              : "Select a product"}
          </option>

          {products.map((product) => (
            <option
              key={product.id}
              value={product.id}
            >
              {product.productName}
              {product.sku
                ? ` - ${product.sku}`
                : ""}
            </option>
          ))}
        </select>

        {form.formState.errors.productId && (
          <p className="text-sm text-destructive">
            {form.formState.errors.productId.message}
          </p>
        )}

        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Product cannot be changed while editing
            inventory.
          </p>
        )}
      </div>

      {/* =====================================================
          Quantity
      ====================================================== */}
      <div className="space-y-2">
        <label
          htmlFor="quantity"
          className="text-sm font-medium"
        >
          Quantity *
        </label>

        <Input
          id="quantity"
          type="number"
          min="0"
          {...form.register("quantity", {
            valueAsNumber: true,
          })}
        />

        {form.formState.errors.quantity && (
          <p className="text-sm text-destructive">
            {form.formState.errors.quantity.message}
          </p>
        )}
      </div>

      {/* =====================================================
          Minimum Stock
      ====================================================== */}
      <div className="space-y-2">
        <label
          htmlFor="minimumStock"
          className="text-sm font-medium"
        >
          Minimum Stock *
        </label>

        <Input
          id="minimumStock"
          type="number"
          min="0"
          {...form.register("minimumStock", {
            valueAsNumber: true,
          })}
        />

        {form.formState.errors.minimumStock && (
          <p className="text-sm text-destructive">
            {
              form.formState.errors.minimumStock
                .message
            }
          </p>
        )}
      </div>

      {/* =====================================================
          Maximum Stock
      ====================================================== */}
      <div className="space-y-2">
        <label
          htmlFor="maximumStock"
          className="text-sm font-medium"
        >
          Maximum Stock *
        </label>

        <Input
          id="maximumStock"
          type="number"
          min="1"
          {...form.register("maximumStock", {
            valueAsNumber: true,
          })}
        />

        {form.formState.errors.maximumStock && (
          <p className="text-sm text-destructive">
            {
              form.formState.errors.maximumStock
                .message
            }
          </p>
        )}
      </div>

      {/* =====================================================
          Warehouse
      ====================================================== */}
      <div className="space-y-2">
        <label
          htmlFor="warehouseLocation"
          className="text-sm font-medium"
        >
          Warehouse Location *
        </label>

        <Input
          id="warehouseLocation"
          placeholder="e.g. Hyderabad Warehouse"
          {...form.register("warehouseLocation")}
        />

        {form.formState.errors
          .warehouseLocation && (
          <p className="text-sm text-destructive">
            {
              form.formState.errors
                .warehouseLocation.message
            }
          </p>
        )}
      </div>

      {/* =====================================================
          Active
      ====================================================== */}
      <div className="flex items-center gap-3">
        <input
          id="active"
          type="checkbox"
          {...form.register("active")}
          className="h-4 w-4 rounded border"
        />

        <label
          htmlFor="active"
          className="text-sm font-medium"
        >
          Active Inventory
        </label>
      </div>

      {/* =====================================================
          Buttons
      ====================================================== */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={form.formState.isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={
            form.formState.isSubmitting ||
            isLoadingProducts
          }
        >
          {form.formState.isSubmitting
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : isEditing
              ? "Update Inventory"
              : "Create Inventory"}
        </Button>
      </div>
    </form>
  );
}