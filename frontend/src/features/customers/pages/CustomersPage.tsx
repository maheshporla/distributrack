import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Users, UserX, UserCheck, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { userService } from "@/services/api/userService";
import { useAuthStore } from "@/store/authStore";

import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { CustomerDetails } from "@/features/customers/components/CustomerDetails";

import type { UserProfile } from "@/types/auth.types";
import { formatDate } from "@/lib/formatters";

type PageView = "list" | "form" | "details";

export function CustomersPage() {
  const user = useAuthStore((state) => state.user);
  const isManagerOrAdmin = user && ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(user.role);

  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [view, setView] = useState<PageView>("list");
  const [editingCustomer, setEditingCustomer] = useState<UserProfile | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // =========================================================
  // Load Customers (role: SHOPKEEPER)
  // =========================================================

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await userService.getUsers({ role: "SHOPKEEPER" });
      setCustomers(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // =========================================================
  // Memoized client-side filtering and searching
  // =========================================================

  const displayedCustomers = useMemo(() => {
    let list = customers;

    // Filter by status
    if (statusFilter === "active") {
      list = list.filter((c) => c.enabled);
    } else if (statusFilter === "inactive") {
      list = list.filter((c) => !c.enabled);
    }

    // Filter by keyword
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return list;

    return list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(keyword) ||
        c.email.toLowerCase().includes(keyword) ||
        c.phone.toLowerCase().includes(keyword),
    );
  }, [customers, searchKeyword, statusFilter]);

  // =========================================================
  // Enable / disable customer status
  // =========================================================

  const handleToggleEnabled = async (target: UserProfile) => {
    try {
      setTogglingId(target.id);

      await userService.updateUser(target.id, {
        fullName: target.fullName,
        email: target.email,
        phone: target.phone,
        role: "SHOPKEEPER",
        enabled: !target.enabled,
      });

      toast.success(
        target.enabled
          ? `Customer account for ${target.fullName} disabled`
          : `Customer account for ${target.fullName} enabled`,
      );

      setCustomers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, enabled: !target.enabled }
            : item,
        ),
      );

      // Sync selected customer if open in details
      if (selectedCustomer?.id === target.id) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, enabled: !target.enabled } : null,
        );
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update customer status.");
    } finally {
      setTogglingId(null);
    }
  };

  // =========================================================
  // Actions
  // =========================================================

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setSelectedCustomer(null);
    setView("form");
  };

  const handleEditCustomer = (target: UserProfile) => {
    setEditingCustomer(target);
    setSelectedCustomer(null);
    setView("form");
  };

  const handleViewDetails = (target: UserProfile) => {
    setSelectedCustomer(target);
    setEditingCustomer(null);
    setView("details");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setEditingCustomer(null);
    await loadCustomers();
  };

  const handleFormCancel = () => {
    setView("list");
    setEditingCustomer(null);
  };

  const handleDetailsBack = () => {
    setView("list");
    setSelectedCustomer(null);
  };

  // =========================================================
  // Conditional rendering
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingCustomer ? "Edit Customer" : "Add Customer"}
          description={
            editingCustomer
              ? `Update details for ${editingCustomer.fullName}.`
              : "Create a customer / shopkeeper account (role: SHOPKEEPER)."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <CustomerForm
            customer={editingCustomer}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  if (view === "details" && selectedCustomer) {
    return (
      <CustomerDetails
        customer={selectedCustomer}
        onBack={handleDetailsBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="View and manage shopkeeper/customer accounts and their historical trade operations."
        actions={
          isManagerOrAdmin ? (
            <Button onClick={handleAddCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          ) : undefined
        }
      />

      {/* Filters and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Search by name, email or phone..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load customers"
            description={loadError}
            onRetry={loadCustomers}
          />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading customer directory...</p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={customers.length === 0 ? "No customers registered yet" : "No customers match filters"}
            description={
              customers.length === 0
                ? "Once customers register or staff onboard them, they will appear here."
                : "Try adjusting your search query or filter settings."
            }
            action={
              customers.length === 0 && isManagerOrAdmin ? (
                <Button onClick={handleAddCustomer}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setSearchKeyword(""); setStatusFilter("all"); }}>
                  Reset Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Customer / Shop Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{customer.id}</td>
                    <td className="px-4 py-3 font-medium">{customer.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                    <td className="px-4 py-3">{customer.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={customer.enabled ? "success" : "secondary"}>
                        {customer.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(customer)}>
                          <Eye className="mr-1 h-4 w-4" />
                          Details
                        </Button>

                        {isManagerOrAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditCustomer(customer)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleEnabled(customer)}
                              disabled={togglingId === customer.id}
                            >
                              {customer.enabled ? (
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
                          </>
                        )}
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
