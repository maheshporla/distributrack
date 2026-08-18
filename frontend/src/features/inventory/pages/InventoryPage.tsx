import { useEffect, useState } from "react";
import { Plus, Search, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

import { inventoryService } from "@/services/api/inventoryService";
import type { Inventory } from "@/types/inventory.types";

import { InventoryForm } from "@/features/inventory/components/InventoryForm";

export function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const [warehouse, setWarehouse] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingInventory, setEditingInventory] =
    useState<Inventory | null>(null);

  const [deletingInventoryId, setDeletingInventoryId] =
    useState<number | null>(null);

  // =========================================================
  // Load All Inventory
  // =========================================================

  const loadInventory = async () => {
    try {
      setIsLoading(true);

      const data = await inventoryService.getAllInventory();

      setInventory(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // =========================================================
  // Search
  // =========================================================

  const handleSearch = async () => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      await loadInventory();
      return;
    }

    /*
     * Inventory backend currently does not provide a
     * search endpoint.
     *
     * Therefore we search the already available inventory
     * data on the client.
     */
    try {
      setIsLoading(true);

      const data = await inventoryService.getAllInventory();

      const filtered = data.filter(
        (item) =>
          item.productName
            ?.toLowerCase()
            .includes(keyword) ||
          item.warehouseLocation
            ?.toLowerCase()
            .includes(keyword) ||
          String(item.productId).includes(keyword),
      );

      setInventory(filtered);
    } catch (error) {
      console.error(error);
      toast.error("Failed to search inventory");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Low Stock
  // =========================================================

  const handleLowStock = async () => {
    try {
      setIsLoading(true);

      if (showLowStock) {
        await loadInventory();
        setShowLowStock(false);
        return;
      }

      const data =
        await inventoryService.getLowStockProducts();

      setInventory(data);
      setShowLowStock(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load low stock inventory");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Warehouse Filter
  // =========================================================

  const handleWarehouseSearch = async () => {
    const location = warehouse.trim();

    if (!location) {
      await loadInventory();
      return;
    }

    try {
      setIsLoading(true);

      const data =
        await inventoryService.getInventoryByWarehouse(
          location,
        );

      setInventory(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to filter warehouse inventory");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Add Inventory
  // =========================================================

  const handleAddInventory = () => {
    setEditingInventory(null);
    setShowForm(true);
  };

  // =========================================================
  // Edit Inventory
  // =========================================================

  const handleEditInventory = (
    item: Inventory,
  ) => {
    setEditingInventory(item);
    setShowForm(true);
  };

  // =========================================================
  // Form Success
  // =========================================================

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingInventory(null);

    await loadInventory();
  };

  // =========================================================
  // Form Cancel
  // =========================================================

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingInventory(null);
  };

  // =========================================================
  // Delete Inventory
  // =========================================================

  const handleDeleteInventory = async (
    item: Inventory,
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete inventory for "${item.productName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingInventoryId(item.id);

      await inventoryService.deleteInventory(
        item.id,
      );

      toast.success(
        "Inventory deleted successfully",
      );

      await loadInventory();
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to delete inventory",
      );
    } finally {
      setDeletingInventoryId(null);
    }
  };

  // =========================================================
  // Inventory Form
  // =========================================================

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            editingInventory
              ? "Edit Inventory"
              : "Add Inventory"
          }
          description={
            editingInventory
              ? "Update inventory information."
              : "Add inventory for a product."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <InventoryForm
            inventory={editingInventory}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Inventory Page
  // =========================================================

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Inventory"
        description="Track stock levels across your warehouses."
        actions={
          <Button onClick={handleAddInventory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Inventory
          </Button>
        }
      />

      {/* Search */}
      <div className="flex flex-col gap-3 lg:flex-row">

        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2
            h-4 w-4 -translate-y-1/2
            text-muted-foreground"
          />

          <Input
            value={searchKeyword}
            onChange={(event) =>
              setSearchKeyword(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Search product, warehouse or product ID..."
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          onClick={handleSearch}
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>

        <Button
          variant={
            showLowStock
              ? "default"
              : "outline"
          }
          onClick={handleLowStock}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />

          {showLowStock
            ? "All Inventory"
            : "Low Stock"}
        </Button>

        {searchKeyword && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchKeyword("");
              loadInventory();
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Warehouse Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">

        <Input
          value={warehouse}
          onChange={(event) =>
            setWarehouse(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleWarehouseSearch();
            }
          }}
          placeholder="Warehouse location..."
          className="sm:max-w-sm"
        />

        <Button
          variant="outline"
          onClick={handleWarehouseSearch}
        >
          Filter Warehouse
        </Button>

        {warehouse && (
          <Button
            variant="ghost"
            onClick={() => {
              setWarehouse("");
              loadInventory();
            }}
          >
            Clear Warehouse
          </Button>
        )}
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border bg-card p-6">

        {/* Loading */}
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading inventory...
            </p>
          </div>

        ) : inventory.length === 0 ? (

          /* Empty */
          <div className="flex min-h-40 flex-col items-center justify-center text-center">

            <p className="font-medium">
              No inventory found
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add inventory for your products to get started.
            </p>

            <Button
              className="mt-4"
              onClick={handleAddInventory}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Inventory
            </Button>
          </div>

        ) : (

          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b text-left">

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    Quantity
                  </th>

                  <th className="px-4 py-3">
                    Min Stock
                  </th>

                  <th className="px-4 py-3">
                    Max Stock
                  </th>

                  <th className="px-4 py-3">
                    Warehouse
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {inventory.map((item) => {
                  const isLowStock =
                    item.quantity <=
                    item.minimumStock;

                  return (
                    <tr
                      key={item.id}
                      className="border-b last:border-0"
                    >

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div>

                          <p className="font-medium">
                            {item.productName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Product ID:{" "}
                            {item.productId}
                          </p>

                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3">

                        <span
                          className={
                            isLowStock
                              ? "font-semibold text-destructive"
                              : "font-medium"
                          }
                        >
                          {item.quantity}
                        </span>

                        {isLowStock && (
                          <span className="ml-2 text-xs text-destructive">
                            Low
                          </span>
                        )}

                      </td>

                      {/* Minimum */}
                      <td className="px-4 py-3">
                        {item.minimumStock}
                      </td>

                      {/* Maximum */}
                      <td className="px-4 py-3">
                        {item.maximumStock}
                      </td>

                      {/* Warehouse */}
                      <td className="px-4 py-3">
                        {item.warehouseLocation}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">

                        {item.active ? (
                          <span className="font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="font-medium text-muted-foreground">
                            Inactive
                          </span>
                        )}

                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEditInventory(
                                item,
                              )
                            }
                            disabled={
                              deletingInventoryId ===
                              item.id
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteInventory(
                                item,
                              )
                            }
                            disabled={
                              deletingInventoryId ===
                              item.id
                            }
                          >
                            <Trash2 className="mr-1 h-4 w-4" />

                            {deletingInventoryId ===
                            item.id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>

                        </div>
                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}