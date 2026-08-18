import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

import { productService } from "@/services/api/productService";
import type { Product } from "@/types/product.types";

import { ProductForm } from "@/features/products/components/ProductForm";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [deletingProductId, setDeletingProductId] =
    useState<number | null>(null);

  // =========================================================
  // Load Products
  // =========================================================

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      const data = await productService.getAllProducts();

      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // Search Products
  // =========================================================

  const handleSearch = async () => {
    const keyword = searchKeyword.trim();

    if (!keyword) {
      await loadProducts();
      return;
    }

    try {
      setIsLoading(true);

      const data =
        await productService.searchProducts(keyword);

      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to search products");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Category Filter
  // =========================================================

  const handleCategoryChange = async (category: string) => {
    if (category === "all") {
      await loadProducts();
      return;
    }

    try {
      setIsLoading(true);

      const data =
        await productService.getProductsByCategory(category);

      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to filter products");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Add Product
  // =========================================================

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  // =========================================================
  // Edit Product
  // =========================================================

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  // =========================================================
  // Product Form Success
  // =========================================================

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingProduct(null);

    await loadProducts();
  };

  // =========================================================
  // Product Form Cancel
  // =========================================================

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  // =========================================================
  // Delete Product
  // =========================================================

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.productName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProductId(product.id);

      await productService.deleteProduct(product.id);

      toast.success("Product deleted successfully");

      await loadProducts();
    } catch (error) {
      console.error(error);

      toast.error("Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  };

  // =========================================================
  // Product Form Screen
  // =========================================================

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            editingProduct
              ? "Edit Product"
              : "Add Product"
          }
          description={
            editingProduct
              ? "Update product information."
              : "Add a new product to your catalog."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <ProductForm
            product={editingProduct}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Products List
  // =========================================================

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <PageHeader
        title="Products"
        description="Manage your product catalog."
        actions={
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 lg:flex-row">

        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
          />

          <Input
            value={searchKeyword}
            onChange={(event) =>
              setSearchKeyword(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>

        {/* Search Button */}
        <Button
          variant="outline"
          onClick={handleSearch}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>

        {/* Category Filter */}
        <select
          defaultValue="all"
          onChange={(event) =>
            handleCategoryChange(event.target.value)
          }
          className="h-10 rounded-md border
          bg-background px-3 text-sm outline-none
          focus:ring-2 focus:ring-ring"
        >
          <option value="all">
            All Categories
          </option>

          <option value="Beverages">
            Beverages
          </option>

          <option value="Snacks">
            Snacks
          </option>

          <option value="Dairy">
            Dairy
          </option>

          <option value="Groceries">
            Groceries
          </option>

          <option value="Household">
            Household
          </option>
        </select>

        {/* Clear Search */}
        {searchKeyword && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchKeyword("");
              loadProducts();
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Product List */}
      <div className="rounded-lg border bg-card p-6">

        {/* Loading */}
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading products...
            </p>
          </div>

        ) : products.length === 0 ? (

          /* Empty State */
          <div className="flex min-h-40 flex-col items-center justify-center text-center">

            <p className="font-medium">
              No products found
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first product to get started.
            </p>

            <Button
              className="mt-4"
              onClick={handleAddProduct}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>

        ) : (

          /* Product Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* Table Header */}
              <thead>
                <tr className="border-b text-left">

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    SKU
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Price
                  </th>

                  <th className="px-4 py-3">
                    Stock
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              {/* Table Body */}
              <tbody>

                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b last:border-0"
                  >

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div>

                        <p className="font-medium">
                          {product.productName}
                        </p>

                        {product.brand && (
                          <p className="text-xs text-muted-foreground">
                            {product.brand}
                          </p>
                        )}

                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      {product.sku}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {product.category}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      ₹
                      {product.price.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      {product.stockQuantity}{" "}
                      {product.unit}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {product.active ? (
                        <span className="text-sm font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">

                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleEditProduct(product)
                          }
                          disabled={
                            deletingProductId ===
                            product.id
                          }
                        >
                          Edit
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteProduct(product)
                          }
                          disabled={
                            deletingProductId ===
                            product.id
                          }
                        >
                          <Trash2 className="mr-1 h-4 w-4" />

                          {deletingProductId ===
                          product.id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}