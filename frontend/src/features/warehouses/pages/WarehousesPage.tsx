import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

import { warehouseService } from "@/services/api/warehouseService";
import type { Warehouse } from "@/types/warehouse.types";

import { WarehouseForm } from "@/features/warehouses/components/WarehouseForm";

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    useState<Warehouse | null>(null);

  const [deletingWarehouseId, setDeletingWarehouseId] =
    useState<number | null>(null);

  // =========================================================
  // Load All Warehouses
  // =========================================================

  const loadWarehouses = async () => {
    try {
      setIsLoading(true);

      const data = await warehouseService.getAllWarehouses();

      setWarehouses(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  // =========================================================
  // Derived filter options (client-side, on the loaded list)
  // =========================================================
  // Search + Active toggle call the backend; state/city refine the
  // current result set client-side so the two can be combined freely.

  const states = useMemo(
    () =>
      Array.from(
        new Set(
          warehouses
            .map((warehouse) => warehouse.state)
            .filter(Boolean),
        ),
      ).sort(),
    [warehouses],
  );

  const cities = useMemo(() => {
    const pool =
      stateFilter === "all"
        ? warehouses
        : warehouses.filter(
            (warehouse) =>
              warehouse.state === stateFilter,
          );

    return Array.from(
      new Set(pool.map((warehouse) => warehouse.city).filter(Boolean)),
    ).sort();
  }, [warehouses, stateFilter]);

  const displayedWarehouses = useMemo(
    () =>
      warehouses.filter(
        (warehouse) =>
          (stateFilter === "all" ||
            warehouse.state === stateFilter) &&
          (cityFilter === "all" ||
            warehouse.city === cityFilter),
      ),
    [warehouses, stateFilter, cityFilter],
  );

  // =========================================================
  // Search
  // =========================================================

  const handleSearch = async () => {
    const keyword = searchKeyword.trim();

    if (!keyword) {
      await loadWarehouses();
      return;
    }

    try {
      setIsLoading(true);

      const data =
        await warehouseService.searchWarehouses(keyword);

      setWarehouses(data);
      setShowActiveOnly(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to search warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Active / Inactive Filter
  // =========================================================

  const handleActiveToggle = async () => {
    try {
      setIsLoading(true);

      if (showActiveOnly) {
        await loadWarehouses();
        setShowActiveOnly(false);
        return;
      }

      const data =
        await warehouseService.getActiveWarehouses();

      setWarehouses(data);
      setShowActiveOnly(true);
      setSearchKeyword("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to load active warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // Clear All Filters
  // =========================================================

  const handleClearFilters = () => {
    setSearchKeyword("");
    setShowActiveOnly(false);
    setStateFilter("all");
    setCityFilter("all");
    loadWarehouses();
  };

  // =========================================================
  // Add / Edit / Form Success / Cancel
  // =========================================================

  const handleAddWarehouse = () => {
    setEditingWarehouse(null);
    setShowForm(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setShowForm(true);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingWarehouse(null);

    await loadWarehouses();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingWarehouse(null);
  };

  // =========================================================
  // Delete Warehouse
  // =========================================================

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${warehouse.warehouseName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingWarehouseId(warehouse.id);

      await warehouseService.deleteWarehouse(warehouse.id);

      toast.success("Warehouse deleted successfully");

      await loadWarehouses();
    } catch (error) {
      console.error(error);

      toast.error("Failed to delete warehouse");
    } finally {
      setDeletingWarehouseId(null);
    }
  };

  // =========================================================
  // Warehouse Form Screen
  // =========================================================

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            editingWarehouse
              ? "Edit Warehouse"
              : "Add Warehouse"
          }
          description={
            editingWarehouse
              ? "Update warehouse information."
              : "Add a new warehouse location."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <WarehouseForm
            warehouse={editingWarehouse}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Warehouses List
  // =========================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations, contacts and GPS coordinates."
        actions={
          <Button onClick={handleAddWarehouse}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        }
      />

      {/* Search + Filters */}
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
            placeholder="Search by name, city, state or contact..."
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

        {/* Active Toggle */}
        <Button
          variant={showActiveOnly ? "default" : "outline"}
          onClick={handleActiveToggle}
        >
          {showActiveOnly ? "All Warehouses" : "Active Only"}
        </Button>
      </div>

      {/* City / State Refinement */}
      {(states.length > 0 || stateFilter !== "all") && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
              setCityFilter("all");
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All States</option>

            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {stateFilter !== "all" && (
            <select
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(event.target.value)
              }
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">
                All Cities{stateFilter !== "all" ? ` in ${stateFilter}` : ""}
              </option>

              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}

          {(stateFilter !== "all" ||
            cityFilter !== "all" ||
            searchKeyword ||
            showActiveOnly) && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Warehouse List */}
      <div className="rounded-lg border bg-card p-6">
        {/* Loading */}
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading warehouses...
            </p>
          </div>

        ) : displayedWarehouses.length === 0 ? (
          /* Empty State */
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <p className="font-medium">
              {warehouses.length === 0
                ? "No warehouses found"
                : "No warehouses match the selected filters"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {warehouses.length === 0
                ? "Add your first warehouse to get started."
                : "Try clearing the filters or search for something else."}
            </p>

            {warehouses.length === 0 ? (
              <Button
                className="mt-4"
                onClick={handleAddWarehouse}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Warehouse
              </Button>
            ) : (
              <Button
                className="mt-4"
                variant="outline"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>

        ) : (
          /* Warehouse Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Table Header */}
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Pincode</th>
                  <th className="px-4 py-3">Coordinates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {displayedWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="border-b last:border-0"
                  >
                    {/* Warehouse */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {warehouse.warehouseName}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          ID: {warehouse.id}
                        </p>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      <p>{warehouse.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {warehouse.state}
                      </p>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p>{warehouse.contactPerson}</p>
                      <p className="text-xs text-muted-foreground">
                        {warehouse.phone}
                      </p>
                    </td>

                    {/* Pincode */}
                    <td className="px-4 py-3">
                      {warehouse.pincode}
                    </td>

                    {/* Coordinates */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">
                        {warehouse.latitude.toFixed(6)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {warehouse.longitude.toFixed(6)}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {warehouse.active ? (
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
                            handleEditWarehouse(warehouse)
                          }
                          disabled={
                            deletingWarehouseId ===
                            warehouse.id
                          }
                        >
                          Edit
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDeleteWarehouse(warehouse)
                          }
                          disabled={
                            deletingWarehouseId ===
                            warehouse.id
                          }
                        >
                          <Trash2 className="mr-1 h-4 w-4" />

                          {deletingWarehouseId ===
                          warehouse.id
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

      {/* Footer hint */}
      {displayedWarehouses.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {displayedWarehouses.length} warehouse
          {displayedWarehouses.length === 1 ? "" : "s"} in view
        </p>
      )}
    </div>
  );
}
