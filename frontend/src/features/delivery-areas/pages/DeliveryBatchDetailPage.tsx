import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Package,
  Store,
  ShoppingCart,
  BadgeIndianRupee,
  CheckCircle2,
  AlertTriangle,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";

import { deliveryBatchService } from "@/services/api/deliveryBatchService";
import { ROUTES } from "@/constants/routes.constants";
import type {
  DeliveryBatchResponse,
  DeliveryBatchShopSummary,
} from "@/types/deliveryBatch.types";
import { formatINR } from "@/lib/formatters";

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

export function DeliveryBatchDetailPage() {
  const [batch, setBatch] = useState<DeliveryBatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [expandedShopId, setExpandedShopId] = useState<number | null>(null);

  const loadActiveBatch = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryBatchService.getMyActiveBatch();
      setBatch(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load your delivery batch");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveBatch();
  }, [loadActiveBatch]);

  const handleStartBatch = async () => {
    if (!batch) return;
    try {
      setIsStarting(true);
      const updated = await deliveryBatchService.startBatch(batch.id);
      setBatch(updated);
      toast.success("Route started! Begin delivering to shops.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start batch";
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Route" description="Your assigned delivery area." />
        <LoadingSpinner fullHeight label="Loading your batch..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Route" description="Your assigned delivery area." />
        <ErrorState title="Failed to load batch" description={loadError} onRetry={loadActiveBatch} />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Route" description="Your assigned delivery area." />
        <EmptyState
          icon={MapPin}
          title="No active delivery batch"
          description="You don't have any assigned delivery areas. Check back later or contact your admin."
          action={
            <Button asChild>
              <Link to={ROUTES.DELIVERY_WORKER_DASHBOARD}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const statusMeta = BATCH_STATUS_META[batch.status] ?? BATCH_STATUS_META.PENDING;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Route: ${batch.areaName}`}
        description={`${batch.batchNumber} · ${batch.totalOrders} orders across ${batch.totalShops} shops`}
        actions={
          <div className="flex gap-2">
            {batch.status === "PENDING" && (
              <Button onClick={handleStartBatch} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Route
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={ROUTES.DELIVERY_WORKER_DASHBOARD}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          icon={ShoppingCart}
          label="Orders"
          value={batch.totalOrders}
        />
        <SummaryCard
          icon={Store}
          label="Shops"
          value={batch.totalShops}
        />
        <SummaryCard
          icon={Package}
          label="Products"
          value={batch.totalProducts}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Delivered"
          value={batch.deliveredProducts}
          valueClassName="text-green-600"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Failed"
          value={batch.failedProducts}
          valueClassName="text-red-600"
        />
      </div>

      {/* Bill Summary */}
      <Card>
        <CardContent className="flex items-center gap-6 p-4">
          <div className="flex items-center gap-2">
            <BadgeIndianRupee className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Bill:</span>
            <span className="text-lg font-semibold">{formatINR(batch.totalBill)}</span>
          </div>
          {batch.deliveredAmount > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Delivered:</span>
              <span className="font-medium text-green-600">{formatINR(batch.deliveredAmount)}</span>
            </div>
          )}
          {batch.failedAmount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Failed:</span>
              <span className="font-medium text-red-600">{formatINR(batch.failedAmount)}</span>
            </div>
          )}
          <div className="ml-auto">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Shop-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Shop-wise Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batch.shopSummaries && batch.shopSummaries.length > 0 ? (
            <div className="space-y-3">
              {batch.shopSummaries.map((shop: DeliveryBatchShopSummary) => {
                const shopMeta = SHOP_STATUS_META[shop.status] ?? SHOP_STATUS_META.PENDING;
                const isExpanded = expandedShopId === shop.shopkeeperId;

                return (
                  <div key={shop.shopkeeperId} className="rounded-lg border">
                    {/* Shop Header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50"
                      onClick={() => setExpandedShopId(isExpanded ? null : shop.shopkeeperId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{shop.shopName || shop.shopkeeperName}</p>
                          <p className="text-xs text-muted-foreground">
                            {shop.orderCount} order{shop.orderCount !== 1 ? "s" : ""} · {shop.totalProducts} products · {formatINR(shop.totalBill)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={shopMeta.variant}>{shopMeta.label}</Badge>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            <span className="text-green-600">{shop.deliveredProducts} ✓</span>
                            {" / "}
                            <span className="text-red-600">{shop.failedProducts} ✗</span>
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded: Delivery/Order Details */}
                    {isExpanded && shop.deliveries && (
                      <div className="border-t p-4">
                        {shop.deliveries.map((delivery) => (
                          <div key={delivery.deliveryId} className="mb-3 rounded-lg border bg-card p-3 last:mb-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{delivery.orderNumber}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {delivery.totalProducts} products · {formatINR(delivery.billAmount)}
                                </span>
                              </div>
                              <Badge variant={
                                delivery.deliveryStatus === "DELIVERED" ? "success" :
                                delivery.deliveryStatus === "FAILED" ? "destructive" :
                                delivery.deliveryStatus === "OUT_FOR_DELIVERY" ? "warning" :
                                "info"
                              }>
                                {delivery.deliveryStatus.replace(/_/g, " ")}
                              </Badge>
                            </div>

                            {/* Product Items */}
                            {delivery.items && delivery.items.length > 0 && (
                              <table className="mt-3 w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="py-1 text-left">Product</th>
                                    <th className="py-1 text-center">Ordered</th>
                                    <th className="py-1 text-center">Delivered</th>
                                    <th className="py-1 text-center">Failed</th>
                                    <th className="py-1 text-right">Unit Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {delivery.items.map((item) => (
                                    <tr key={item.productId} className="border-t">
                                      <td className="py-1">
                                        {item.productName}
                                        <span className="ml-1 text-muted-foreground">({item.category})</span>
                                      </td>
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title="No shops in this batch"
              description="This batch has no shops assigned."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =========================================================
// Sub-components
// =========================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
        <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClassName ?? ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
