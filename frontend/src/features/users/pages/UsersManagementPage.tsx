import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, UserCog, UserX, UserCheck, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { userService } from "@/services/api/userService";
import { useAuthStore } from "@/store/authStore";

import { UserForm } from "@/features/users/components/UserForm";
import { UserDetails } from "@/features/users/components/UserDetails";

import type { UserProfile } from "@/types/auth.types";
import type { RoleName } from "@/types/auth.types";
import { formatDate } from "@/lib/formatters";

type PageView = "list" | "form" | "details";

const ALL_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "SALESMAN",
  "DELIVERY_BOY",
  "SHOPKEEPER",
];

const roleBadgeVariant: Record<RoleName, "default" | "success" | "warning" | "secondary" | "info" | "destructive"> = {
  SUPER_ADMIN: "destructive",
  OWNER: "default",
  MANAGER: "warning",
  SALESMAN: "info",
  DELIVERY_BOY: "secondary",
  SHOPKEEPER: "success",
};

export function UsersManagementPage() {
  const currentUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleName | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [view, setView] = useState<PageView>("list");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // =========================================================
  // Load all users (backend scopes the list to the caller's role)
  // =========================================================

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const data = await userService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================================================
  // Memoized client-side filtering and searching
  // =========================================================

  const displayedUsers = useMemo(() => {
    let list = users;

    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === "active") {
      list = list.filter((u) => u.enabled);
    } else if (statusFilter === "inactive") {
      list = list.filter((u) => !u.enabled);
    }

    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return list;

    return list.filter(
      (u) =>
        u.fullName.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.phone.toLowerCase().includes(keyword),
    );
  }, [users, searchKeyword, roleFilter, statusFilter]);

  // =========================================================
  // Enable / disable (soft toggle via PUT)
  // =========================================================

  const handleToggleEnabled = async (target: UserProfile) => {
    try {
      setTogglingId(target.id);

      await userService.updateUser(target.id, {
        fullName: target.fullName,
        phone: target.phone,
        role: target.role,
        enabled: !target.enabled,
      });

      toast.success(
        target.enabled
          ? `${target.fullName} disabled`
          : `${target.fullName} enabled`,
      );

      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, enabled: !target.enabled }
            : item,
        ),
      );

      if (selectedUser?.id === target.id) {
        setSelectedUser((prev) =>
          prev ? { ...prev, enabled: !target.enabled } : null,
        );
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update user status");
    } finally {
      setTogglingId(null);
    }
  };

  // =========================================================
  // View switching
  // =========================================================

  const handleAddUser = () => {
    setEditingUser(null);
    setSelectedUser(null);
    setView("form");
  };

  const handleEditUser = (target: UserProfile) => {
    setEditingUser(target);
    setSelectedUser(null);
    setView("form");
  };

  const handleViewDetails = (target: UserProfile) => {
    setSelectedUser(target);
    setEditingUser(null);
    setView("details");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setEditingUser(null);
    await loadUsers();
  };

  const handleFormCancel = () => {
    setView("list");
    setEditingUser(null);
  };

  const handleDetailsBack = () => {
    setView("list");
    setSelectedUser(null);
  };

  // =========================================================
  // Conditional rendering
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingUser ? "Edit User" : "Create User"}
          description={
            editingUser
              ? `Update details for ${editingUser.fullName}.`
              : "Create an OWNER, MANAGER, SALESMAN, DELIVERY_BOY or SHOPKEEPER account."
          }
        />

        <div className="rounded-lg border bg-card p-6">
          <UserForm
            user={editingUser}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  if (view === "details" && selectedUser) {
    return <UserDetails user={selectedUser} onBack={handleDetailsBack} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="View and manage every account in DistribuTrack — create staff, assign roles, reset passwords and enable/disable access."
        actions={
          <Button onClick={handleAddUser}>
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
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

        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleName | "all")}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main list table */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load users"
            description={loadError}
            onRetry={loadUsers}
          />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading user directory...
            </p>
          </div>
        ) : displayedUsers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={
              users.length === 0
                ? "No users yet"
                : "No users match your filters"
            }
            description={
              users.length === 0
                ? "Create the first staff account to get started."
                : "Try adjusting your search query or filter settings."
            }
            action={
              users.length === 0 ? (
                <Button onClick={handleAddUser}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchKeyword("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                >
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
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">#{u.id}</td>
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">{u.phone}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant[u.role]}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={u.enabled ? "success" : "secondary"}
                        >
                          {u.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(u)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Details
                          </Button>

                          {!isSelf && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(u)}
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleEnabled(u)}
                                disabled={togglingId === u.id}
                              >
                                {u.enabled ? (
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
