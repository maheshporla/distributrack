import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  productSchema,
  type ProductFormValues,
} from "@/schemas/product.schemas";
import type {
  Product,
  ProductPayload,
} from "@/types/product.types";
import { productService } from "@/services/api/productService";

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const isEditing = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productName: "",
      description: "",
      category: "",
      brand: "",
      sku: "",
      price: 0,
      stockQuantity: 0,
      unit: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        productName: product.productName,
        description: product.description ?? "",
        category: product.category,
        brand: product.brand ?? "",
        sku: product.sku,
        price: product.price,
        stockQuantity: product.stockQuantity,
        unit: product.unit,
        imageUrl: product.imageUrl ?? "",
      });
    }
  }, [product, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload: ProductPayload = {
        productName: values.productName,
        description: values.description || undefined,
        category: values.category,
        brand: values.brand || undefined,
        sku: values.sku,
        price: values.price,
        stockQuantity: values.stockQuantity,
        unit: values.unit,
        imageUrl: values.imageUrl || undefined,
      };

      if (product) {
        await productService.updateProduct(product.id, payload);
        toast.success("Product updated successfully");
      } else {
        await productService.createProduct(payload);
        toast.success("Product created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        isEditing
          ? "Failed to update product"
          : "Failed to create product",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="productName">Product Name *</Label>
          <Input
            id="productName"
            {...form.register("productName")}
            placeholder="Enter product name"
          />
          {form.formState.errors.productName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.productName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            {...form.register("sku")}
            placeholder="SKU-001"
          />
          {form.formState.errors.sku && (
            <p className="text-sm text-destructive">
              {form.formState.errors.sku.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            {...form.register("category")}
            placeholder="Beverages"
          />
          {form.formState.errors.category && (
            <p className="text-sm text-destructive">
              {form.formState.errors.category.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            {...form.register("brand")}
            placeholder="Brand name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0.01"
            {...form.register("price", {
              valueAsNumber: true,
            })}
            placeholder="0.00"
          />
          {form.formState.errors.price && (
            <p className="text-sm text-destructive">
              {form.formState.errors.price.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stockQuantity">Stock Quantity *</Label>
          <Input
            id="stockQuantity"
            type="number"
            min="0"
            step="1"
            {...form.register("stockQuantity", {
              valueAsNumber: true,
            })}
            placeholder="0"
          />
          {form.formState.errors.stockQuantity && (
            <p className="text-sm text-destructive">
              {form.formState.errors.stockQuantity.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Input
            id="unit"
            {...form.register("unit")}
            placeholder="pcs / kg / box"
          />
          {form.formState.errors.unit && (
            <p className="text-sm text-destructive">
              {form.formState.errors.unit.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            {...form.register("imageUrl")}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...form.register("description")}
          placeholder="Product description"
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex justify-end gap-3">
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
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Product"
              : "Create Product"}
        </Button>
      </div>
    </form>
  );
}