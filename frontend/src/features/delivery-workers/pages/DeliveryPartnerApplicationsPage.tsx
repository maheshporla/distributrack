import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  MapPin,
  Calendar,
  Car,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { deliveryApplicationService } from "@/services/api/deliveryApplicationService";
import type { DeliveryApplication } from "@/types/deliveryApplication.types";


/**
 * Admin-only page to view, approve, and reject delivery partner applications.
 * Accessible at /users (as part of user management) or as a dedicated section.
 */
export function DeliveryPartnerApplicationsPage() {
  const [applications, setApplications] = useState<DeliveryApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deliveryApplicationService.getPending();
      setApplications(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (app: DeliveryApplication) => {
    setActionLoading(app.id);
    try {
      await deliveryApplicationService.approve(app.id);
      toast.success(`${app.fullName} has been approved as a delivery partner`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (error: any) {
      toast.error(error.message || "Failed to approve application");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app: DeliveryApplication) => {
    setActionLoading(app.id);
    try {
      await deliveryApplicationService.reject(app.id);
      toast.success(`${app.fullName}'s application has been rejected`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (error: any) {
      toast.error(error.message || "Failed to reject application");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Delivery Partner Applications
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending delivery partner registrations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchApplications}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">
              No pending applications
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When delivery partners register, their applications will appear
              here for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {applications.map((app) => (
            <Card key={app.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{app.fullName}</CardTitle>
                    <CardDescription>{app.email}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{app.phone}</span>
                  </div>
                  {app.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {app.address}
                        {app.address && app.city ? ", " : ""}
                        {app.city}
                      </span>
                    </div>
                  )}
                  {!app.city && app.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{app.address}</span>
                    </div>
                  )}
                  {app.vehicleType && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="h-3.5 w-3.5" />
                      <span>
                        {app.vehicleType}
                        {app.vehicleNumber ? ` — ${app.vehicleNumber}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Applied {new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(app)}
                    disabled={actionLoading === app.id}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(app)}
                    disabled={actionLoading === app.id}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
