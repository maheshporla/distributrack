import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Package,
  Store,
  Truck,
  ShoppingCart,
  BadgeIndianRupee,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";

import { deliveryBatchService } from "@/services/api/deliveryBatchService";
import { userService } from "@/services/api/userService";
import { warehouseService } from "@/services/api/warehouseService";

import type {
  DeliveryBatchResponse,
  EligibleOrdersResponse,
  DeliveryBatchShopSummary,
} from "@/types/deliveryBatch.types";
import type { UserProfile } from "@/types/auth.types";
import type { Warehouse } from "@/types/warehouse.types";
import { formatINR } from "@/lib/formatters";

type PageView = "list" | "create";

const BATCH_STATUS_META: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary" }
> = {
  PENDING: { label: "Pending", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const SHOP_STATUS_META: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary" }> = {
  PENDING: { label: "Pending", variant: "info" },
  PARTIAL: { label: "Partial", variant: "warning" },
  DELIVERED: { label: "Delivered", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function DeliveryAreasPage() {
  const [view, setView] = useState<PageView>("list");
  const [batches, setBatches] = useState<DeliveryBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Create form state ---
  const [areaName, setAreaName] = useState("");
  const [centerLatitude, setCenterLatitude] = useState("");
  const [centerLongitude, setCenterLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("5");
  const [deliveryBoyId, setDeliveryBoyId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  const [preview, setPreview] = useState<EligibleOrdersResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState<UserProfile[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // --- Expanded batch state ---
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [batchDetails, setBatchDetails] = useState<Map<number, DeliveryBatchResponse>>(new Map());
  const [loadingBatchId, setLoadingBatchId] = useState<number | null>(null);

  // =========================================================
  // Load batches
  // =========================================================

  const loadBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryBatchService.getAllBatches();
      setBatches(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load delivery batches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Load delivery boys for assignment
  useEffect(() => {
    userService
      .getUsers({ role: "DELIVERY_BOY" })
      .then((data) => setDeliveryBoys(data))
      .catch(console.error);
    warehouseService
      .getAllWarehouses()
      .then((data) => setWarehouses(data))
      .catch(console.error);
  }, []);

  // =========================================================
  // Preview eligible orders
  // =========================================================

  const handlePreview = async () => {
    if (!areaName.trim()) {
      toast.error("Area name is required");
      return;
    }
    if (!centerLatitude || !centerLongitude) {
      toast.error("Center coordinates are required");
      return;
    }
    if (!radiusKm || parseFloat(radiusKm) <= 0) {
      toast.error("Radius must be greater than 0");
      return;
    }

    try {
      setIsPreviewing(true);
      const data = await deliveryBatchService.previewEligibleOrders(
        areaName.trim(),
        parseFloat(centerLatitude),
        parseFloat(centerLongitude),
        parseFloat(radiusKm),
      );
      setPreview(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to preview eligible orders");
    } finally {
      setIsPreviewing(false);
    }
  };

  // =========================================================
  // Create batch
  // =========================================================

  const handleCreateBatch = async () => {
    if (!deliveryBoyId) {
      toast.error("Please select a delivery boy");
      return;
    }
    if (!preview || preview.totalEligibleOrders === 0) {
      toast.error("No eligible orders to assign");
      return;
    }

    try {
      setIsCreating(true);
      await deliveryBatchService.createDeliveryBatch({
        areaName: areaName.trim(),
        centerLatitude: parseFloat(centerLatitude),
        centerLongitude: parseFloat(centerLongitude),
        radiusKm: parseFloat(radiusKm),
        deliveryBoyId,
        warehouseId: warehouseId ?? undefined,
      });
      toast.success("Delivery batch created successfully");
      setView("list");
      resetForm();
      await loadBatches();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to create delivery batch";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setAreaName("");
    setCenterLatitude("");
    setCenterLongitude("");
    setRadiusKm("5");
    setDeliveryBoyId(null);
    setWarehouseId(null);
    setPreview(null);
  };

  // =========================================================
  // Expand/collapse batch details
  // =========================================================

  const toggleBatchDetails = async (batchId: number) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }

    setExpandedBatchId(batchId);

    if (!batchDetails.has(batchId)) {
      try {
        setLoadingBatchId(batchId);
        const detail = await deliveryBatchService.getBatchById(batchId);
        setBatchDetails((prev) => new Map(prev).set(batchId, detail));
      } catch (error) {
        console.error(error);
        toast.error("Failed to load batch details");
      } finally {
        setLoadingBatchId(null);
      }
    }
  };

  // =========================================================
  // Set warehouse coordinates
  // =========================================================

  const handleWarehouseChange = (whId: number) => {
    setWarehouseId(whId);
    const warehouse = warehouses.find((w) => w.id === whId);
    if (warehouse) {
      setCenterLatitude(warehouse.latitude.toString());
      setCenterLongitude(warehouse.longitude.toString());
      setAreaName(warehouse.city || warehouse.warehouseName);
    }
  };

  // =========================================================
  // Create View
  // =========================================================

  if (view === "create") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Create Delivery Area"
          description="Select an area and assign eligible orders to a delivery boy."
          breadcrumbs={[
            { label: "Delivery Areas", href: "#" },
            { label: "Create New" },
          ]}
          actions={
            <Button variant="outline" onClick={() => { setView("list"); resetForm(); }}>
              Cancel
            </Button>
          }
        />

        {/* Area Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Area Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse (optional — fills coordinates)</Label>
                <select
                  id="warehouse"
                  value={warehouseId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) handleWarehouseChange(Number(val));
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.warehouseName} — {wh.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaName">Area Name *</Label>
                <Input
                  id="areaName"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g. LB Nagar, Jubilee Hills"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="centerLat">Center Latitude *</Label>
                <Input
                  id="centerLat"
                  type="number"
                  step="any"
                  value={centerLatitude}
                  onChange={(e) => setCenterLatitude(e.target.value)}
                  placeholder="e.g. 17.3457"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="centerLng">Center Longitude *</Label>
                <Input
                  id="centerLng"
                  type="number"
                  step="any"
                  value={centerLongitude}
                  onChange={(e) => setCenterLongitude(e.target.value)}
                  placeholder="e.g. 78.5473"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Radius (km) *</Label>
                <Input
                  id="radius"
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="100"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <Button onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Previewing...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Eligible Orders
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Results */}
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Eligible Orders Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.totalEligibleOrders === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No eligible orders"
                  description="No pending orders found in the specified area. Try adjusting the radius or area."
                />
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatBox icon={ShoppingCart} label="Orders" value={preview.totalEligibleOrders} />
                    <StatBox icon={Store} label="Shops" value={preview.totalShops} />
                    <StatBox icon={Package} label="Products" value={preview.totalProducts} />
                    <StatBox icon={BadgeIndianRupee} label="Total Bill" value={formatINR(preview.totalBill)} />
                  </div>

                  {/* Shop List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Shops in {preview.areaName} ({preview.totalShops})
                    </h4>
                    {preview.shops.map((shop) => (
                      <div
                        key={shop.shopkeeperId}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{shop.shopName || shop.shopkeeperName}</p>
                          <p className="text-xs text-muted-foreground">
                            {shop.orders.length} order{shop.orders.length !== 1 ? "s" : ""} · {shop.totalProducts} products · {shop.distanceFromCenterKm} km away
                          </p>
                        </div>
                        <span className="text-sm font-medium">{formatINR(shop.totalBill)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Boy Selection & Create */}
                  <div className="border-t pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="deliveryBoy">Assign to Delivery Boy *</Label>
                        <select
                          id="deliveryBoy"
                          value={deliveryBoyId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDeliveryBoyId(val ? Number(val) : null);
                          }}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select delivery boy...</option>
                          {deliveryBoys.map((db) => (
                            <option key={db.id} value={db.id}>
                              {db.fullName} {db.vehicleType ? `(${db.vehicleType})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button
                      className="mt-4"
                      onClick={handleCreateBatch}
                      disabled={isCreating || !deliveryBoyId}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Truck className="mr-2 h-4 w-4" />
                          Assign Area to Delivery Boy
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // =========================================================
  // List View
  // =========================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Areas"
        description="Manage area-based delivery assignments and track route progress."
        actions={
          <Button onClick={() => setView("create")}>
            <MapPin className="mr-2 h-4 w-4" />
            Create Delivery Area
          </Button>
        }
      />

      {/* Batch List */}
      <div className="space-y-4">
        {isLoading ? (
          <LoadingSpinner fullHeight label="Loading batches..." />
        ) : loadError ? (
          <ErrorState
            title="Couldn't load delivery batches"
            description={loadError}
            onRetry={loadBatches}
          />
        ) : batches.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No delivery areas yet"
            description="Create your first delivery area to start assigning orders to delivery boys."
            action={
              <Button onClick={() => setView("create")}>
                <MapPin className="mr-2 h-4 w-4" />
                Create Delivery Area
              </Button>
            }
          />
        ) : (
          batches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            const isLoadingDetails = loadingBatchId === batch.id;
            const details = batchDetails.get(batch.id);
            const statusMeta = BATCH_STATUS_META[batch.status] ?? BATCH_STATUS_META.PENDING;

            return (
              <Card key={batch.id}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleBatchDetails(batch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{batch.areaName}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {batch.batchNumber} · Assigned to {batch.deliveryBoyName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <StatBox icon={ShoppingCart} label="Orders" value={batch.totalOrders} />
                    <StatBox icon={Store} label="Shops" value={batch.totalShops} />
                    <StatBox icon={Package} label="Products" value={batch.totalProducts} />
                    <StatBox
                      icon={CheckCircle2}
                      label="Delivered"
                      value={`${batch.deliveredProducts}`}
                      valueClassName="text-green-600"
                    />
                    <StatBox
                      icon={AlertTriangle}
                      label="Failed"
                      value={`${batch.failedProducts}`}
                      valueClassName="text-red-600"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <BadgeIndianRupee className="h-4 w-4" />
                    Total Bill: {formatINR(batch.totalBill)}
                    {batch.deliveredAmount > 0 && (
                      <span className="ml-2">
                        · Delivered: {formatINR(batch.deliveredAmount)}
                      </span>
                    )}
                    {batch.failedAmount > 0 && (
                      <span className="ml-2">
                        · Failed: {formatINR(batch.failedAmount)}
                      </span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      {isLoadingDetails ? (
                        <LoadingSpinner label="Loading details..." />
                      ) : details ? (
                        <BatchDetails batch={details} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Failed to load details.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// =========================================================
// Sub-components
// =========================================================

function StatBox({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${valueClassName ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}

function BatchDetails({ batch }: { batch: DeliveryBatchResponse }) {
  const [expandedShopId, setExpandedShopId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Batch Info */}
      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <span className="text-muted-foreground">Delivery Boy: </span>
          <span className="font-medium">{batch.deliveryBoyName}</span>
          {batch.deliveryBoyPhone && (
            <span className="text-muted-foreground ml-1">({batch.deliveryBoyPhone})</span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Radius: </span>
          <span className="font-medium">{batch.radiusKm} km</span>
        </div>
        <div>
          <span className="text-muted-foreground">Assigned: </span>
          <span className="font-medium">
            {new Date(batch.assignedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Shop-wise Breakdown */}
      {batch.shopSummaries && batch.shopSummaries.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Shop-wise Breakdown
          </h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2">Shop</th>
                  <th className="px-4 py-2 text-center">Orders</th>
                  <th className="px-4 py-2 text-center">Products</th>
                  <th className="px-4 py-2 text-center">Delivered</th>
                  <th className="px-4 py-2 text-center">Failed</th>
                  <th className="px-4 py-2 text-right">Bill</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {batch.shopSummaries.map((shop: DeliveryBatchShopSummary) => {
                  const shopStatusMeta = SHOP_STATUS_META[shop.status] ?? SHOP_STATUS_META.PENDING;
                  const isExpanded = expandedShopId === shop.shopkeeperId;

                  return (
                    <>
                      <tr key={shop.shopkeeperId} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          <p className="font-medium">{shop.shopName || shop.shopkeeperName}</p>
                          {shop.deliveryAddress && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {shop.deliveryAddress}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">{shop.orderCount}</td>
                        <td className="px-4 py-2 text-center">{shop.totalProducts}</td>
                        <td className="px-4 py-2 text-center text-green-600">{shop.deliveredProducts}</td>
                        <td className="px-4 py-2 text-center text-red-600">{shop.failedProducts}</td>
                        <td className="px-4 py-2 text-right">{formatINR(shop.totalBill)}</td>
                        <td className="px-4 py-2">
                          <Badge variant={shopStatusMeta.variant}>{shopStatusMeta.label}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedShopId(isExpanded ? null : shop.shopkeeperId)}
                          >
                            {isExpanded ? "Hide" : "View"}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && shop.deliveries && (
                        <tr key={`${shop.shopkeeperId}-detail`}>
                          <td colSpan={8} className="bg-muted/30 px-4 py-3">
                            {shop.deliveries.map((delivery) => (
                              <div key={delivery.deliveryId} className="mb-2 rounded border bg-card p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{delivery.orderNumber}</span>
                                  <Badge variant={
                                    delivery.deliveryStatus === "DELIVERED" ? "success" :
                                    delivery.deliveryStatus === "FAILED" ? "destructive" :
                                    delivery.deliveryStatus === "OUT_FOR_DELIVERY" ? "warning" :
                                    "info"
                                  }>
                                    {delivery.deliveryStatus.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                {delivery.items && (
                                  <table className="mt-2 w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="py-1 text-left">Product</th>
                                        <th className="py-1 text-center">Ordered</th>
                                        <th className="py-1 text-center">Delivered</th>
                                        <th className="py-1 text-center">Failed</th>
                                        <th className="py-1 text-right">Price</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {delivery.items.map((item) => (
                                        <tr key={item.productId} className="border-t">
                                          <td className="py-1">{item.productName}</td>
                                          <td className="py-1 text-center">{item.orderedQuantity}</td>
                                          <td className="py-1 text-center text-green-600">{item.deliveredQuantity}</td>
                                          <td className="py-1 text-center text-red-600">{item.failedQuantity}</td>
                                          <td className="py-1 text-right">{formatINR(item.unitPrice)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
