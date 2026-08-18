import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Truck, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { userService } from "@/services/api/userService";

import { DeliveryWorkerForm } from "@/features/delivery-workers/components/DeliveryWorkerForm";

import type { UserProfile } from "@/types/auth.types";
import { formatDate } from "@/lib/formatters";

type PageView = "list" | "form";

export function DeliveryWorkersPage() {
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");

  const [view, setView] = useState<PageView>("list");
  const [editingWorker, setEditingWorker] = useState<UserProfile | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // =========================================================
  // Load delivery workers (DELIVERY_BOY accounts)
  // =========================================================

  const loadWorkers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await userService.getUsers({ role: "DELIVERY_BOY" });
      setWorkers(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load delivery workers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  // =========================================================
  // Client-side search over the loaded list
  // =========================================================

  const displayedWorkers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return workers;

    return workers.filter(
      (worker) =>
        worker.fullName.toLowerCase().includes(keyword) ||
        worker.email.toLowerCase().includes(keyword) ||
        worker.phone.toLowerCase().includes(keyword),
    );
  }, [workers, searchKeyword]);

  // =========================================================
  // Enable / disable (soft toggle via PUT)
  // =========================================================

  const handleToggleEnabled = async (worker: UserProfile) => {
    try {
      setTogglingId(worker.id);

      await userService.updateUser(worker.id, {
        fullName: worker.fullName,
        phone: worker.phone,
        role: "DELIVERY_BOY",
        enabled: !worker.enabled,
      });

      toast.success(
        worker.enabled
          ? `${worker.fullName} disabled`
          : `${worker.fullName} enabled`,
      );

      setWorkers((prev) =>
        prev.map((item) =>
          item.id === worker.id
            ? { ...item, enabled: !worker.enabled }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update delivery worker");
    } finally {
      setTogglingId(null);
    }
  };

  // =========================================================
  // View switching
  // =========================================================

  const handleAddWorker = () => {
    setEditingWorker(null);
    setView("form");
  };

  const handleEditWorker = (worker: UserProfile) => {
    setEditingWorker(worker);
    setView("form");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setEditingWorker(null);
    await loadWorkers();
  };

  const handleFormCancel = () => {
    setView("list");
    setEditingWorker(null);
  };

  // =========================================================
  // Form Screen
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingWorker ? "Edit Delivery Worker" : "Add Delivery Worker"}
          description={
            editingWorker
              ? `Update details for ${editingWorker.fullName}.`
              : "Create a delivery worker account (role: DELIVERY_BOY)."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <DeliveryWorkerForm
            worker={editingWorker}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  // =========================================================
  // Workers List
  // =========================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Workers"
        description="Manage the delivery staff assigned to your orders."
        actions={
          <Button onClick={handleAddWorker}>
            <Plus className="mr-2 h-4 w-4" />
            Add Worker
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
        />

        <Input
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="Search by name, email or phone..."
          className="pl-9"
        />
      </div>

      {/* Workers List */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load delivery workers"
            description={loadError}
            onRetry={loadWorkers}
          />

        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading delivery workers...
            </p>
          </div>

        ) : displayedWorkers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={
              workers.length === 0
                ? "No delivery workers yet"
                : "No workers match your search"
            }
            description={
              workers.length === 0
                ? "Create a delivery worker to start assigning deliveries."
                : "Try a different name, email or phone."
            }
            action={
              workers.length === 0 ? (
                <Button onClick={handleAddWorker}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Worker
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setSearchKeyword("")}
                >
                  Clear Search
                </Button>
              )
            }
          />

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedWorkers.map((worker) => (
                  <tr key={worker.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {worker.fullName}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {worker.email}
                    </td>

                    <td className="px-4 py-3">{worker.phone}</td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(worker.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={worker.enabled ? "success" : "secondary"}
                      >
                        {worker.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditWorker(worker)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleEnabled(worker)}
                          disabled={togglingId === worker.id}
                        >
                          {worker.enabled ? (
                            <>
                              <UserX className="mr-1 h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-4 w-4" />
                              Enable
                            </>
                          )}
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
