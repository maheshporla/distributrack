import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  Shield,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Edit3,
  KeyRound,
  PackageCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { PasswordInput } from "@/components/shared/PasswordInput";

import { authService } from "@/services/api/authService";
import { deliveryService } from "@/services/api/deliveryService";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/features/auth/hooks/useLogout";
import type { UserProfile } from "@/types/auth.types";
import type { Delivery } from "@/types/delivery.types";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/formatters";

type ProfileTab = "overview" | "edit" | "security";

/**
 * Delivery Worker Profile page.
 * Shows the worker's profile information, delivery statistics, and
 * provides actions for editing profile and changing password.
 *
 * Security: The profile data comes from GET /api/auth/me which returns
 * the JWT-authenticated user — no ID parameter is used, so a worker
 * cannot access another worker's profile by changing a URL.
 */
export function WorkerProfilePage() {
  const logout = useLogout();
  const updateStoreUser = useAuthStore((state) => state.updateUser);

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // --- Data fetching ---

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      setError(null);
      const data = await authService.getMe();
      setProfile(data);
      setFullName(data.fullName);
      setPhone(data.phone);
      setEmailNotificationsEnabled(data.emailNotificationsEnabled ?? true);
      setSmsNotificationsEnabled(data.smsNotificationsEnabled ?? true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load profile information.");
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoadingDeliveries(true);
      const data = await deliveryService.getAllDeliveries();
      setDeliveries(data);
    } catch (err: any) {
      console.error(err);
      // Delivery fetch failure is non-critical for the profile page
    } finally {
      setIsLoadingDeliveries(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchDeliveries();
  }, [fetchProfile, fetchDeliveries]);

  // --- Delivery statistics ---

  const deliveryStats = useMemo(() => {
    const total = deliveries.length;
    const completed = deliveries.filter(
      (d) => d.deliveryStatus === "DELIVERED",
    ).length;
    const pending = deliveries.filter(
      (d) =>
        d.deliveryStatus === "ASSIGNED" ||
        d.deliveryStatus === "OUT_FOR_DELIVERY",
    ).length;
    const failed = deliveries.filter(
      (d) => d.deliveryStatus === "FAILED",
    ).length;
    const current = deliveries.filter(
      (d) => d.deliveryStatus === "OUT_FOR_DELIVERY",
    ).length;

    return { total, completed, pending, failed, current };
  }, [deliveries]);

  // --- Handlers ---

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Full name and phone number are required.");
      return;
    }

    if (phone.trim().length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    try {
      setIsSubmittingProfile(true);
      const updated = await authService.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        emailNotificationsEnabled,
        smsNotificationsEnabled,
      });
      setProfile(updated);
      updateStoreUser({ fullName: updated.fullName });
      toast.success("Profile updated successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setIsSubmittingPassword(true);
      await authService.changePassword({ oldPassword, newPassword });
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to change password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // --- Loading / Error states ---

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View and manage your delivery worker profile."
        />
        <LoadingSpinner fullHeight label="Loading profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View and manage your delivery worker profile."
        />
        <ErrorState
          title="Failed to load profile"
          description={error || "Could not load your profile information."}
          onRetry={fetchProfile}
        />
      </div>
    );
  }

  const initials = getInitials(profile.fullName);

  // --- Tab config ---

  const tabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "edit", label: "Edit Profile", icon: Edit3 },
    { id: "security", label: "Change Password", icon: Lock },
  ];

  // --- Stat card config ---

  const statCards = [
    {
      label: "Total Deliveries",
      value: deliveryStats.total,
      icon: Truck,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Completed",
      value: deliveryStats.completed,
      icon: CheckCircle2,
      color: "text-green-500 bg-green-500/10",
    },
    {
      label: "Pending",
      value: deliveryStats.pending,
      icon: Clock,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Failed",
      value: deliveryStats.failed,
      icon: XCircle,
      color: "text-red-500 bg-red-500/10",
    },
    {
      label: "In Progress",
      value: deliveryStats.current,
      icon: PackageCheck,
      color: "text-purple-500 bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View and manage your delivery worker profile."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <h3 className="mt-4 text-lg font-bold">{profile.fullName}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <Truck className="mr-1 h-3 w-3" />
                  Delivery Worker
                </Badge>
                <Badge variant={profile.enabled ? "success" : "destructive"}>
                  {profile.enabled ? "Active" : "Inactive"}
                </Badge>
              </div>

              <Separator className="my-4" />

              <div className="w-full space-y-3 text-left text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </div>
                  <span className="max-w-[140px] truncate font-medium text-foreground">
                    {profile.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Phone</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {profile.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Worker ID</span>
                  </div>
                  <span className="font-mono text-foreground">
                    #{profile.id}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Member Since</span>
                  </div>
                  <span className="text-foreground">
                    {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-6 w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs & Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tab Selectors */}
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ---- Overview Tab ---- */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Delivery Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Delivery Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingDeliveries ? (
                    <div className="flex min-h-24 items-center justify-center">
                      <LoadingSpinner label="Loading delivery stats..." />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {statCards.map((stat) => (
                        <div
                          key={stat.label}
                          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-shadow hover:shadow-md"
                        >
                          <div
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg",
                              stat.color,
                            )}
                          >
                            <stat.icon className="h-5 w-5" />
                          </div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </p>
                      <p className="text-sm font-medium">{profile.fullName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </p>
                      <p className="text-sm font-medium">{profile.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Phone Number
                      </p>
                      <p className="text-sm font-medium">{profile.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Role
                      </p>
                      <p className="text-sm font-medium capitalize">
                        Delivery Worker
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Account Created
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(profile.createdAt)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Account Status
                      </p>
                      <Badge
                        variant={profile.enabled ? "success" : "destructive"}
                      >
                        {profile.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email Notifications
                      </p>
                      <Badge
                        variant={
                          profile.emailNotificationsEnabled
                            ? "success"
                            : "secondary"
                        }
                      >
                        {profile.emailNotificationsEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        SMS Notifications
                      </p>
                      <Badge
                        variant={
                          profile.smsNotificationsEnabled
                            ? "success"
                            : "secondary"
                        }
                      >
                        {profile.smsNotificationsEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("edit")}
                      className="gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("security")}
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ---- Edit Profile Tab ---- */}
          {activeTab === "edit" && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <h4 className="mb-4 flex items-center gap-2 text-md font-bold">
                    <Edit3 className="h-4 w-4 text-primary" />
                    Edit Profile Details
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="worker-fullName"
                        className="text-sm font-medium"
                      >
                        Full Name *
                      </label>
                      <Input
                        id="worker-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="worker-phone"
                        className="text-sm font-medium"
                      >
                        Phone Number *
                      </label>
                      <Input
                        id="worker-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Email Address (Read-only)
                      </label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-muted text-muted-foreground"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Email cannot be changed directly for account security
                        purposes.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Account Role (Read-only)
                      </label>
                      <Input
                        value="DELIVERY_BOY"
                        disabled
                        className="bg-muted text-muted-foreground"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Your role determines your system access level.
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Notification Preferences
                    </h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          id="worker-emailNotif"
                          type="checkbox"
                          checked={emailNotificationsEnabled}
                          onChange={(e) =>
                            setEmailNotificationsEnabled(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="worker-emailNotif"
                          className="cursor-pointer text-sm font-medium text-foreground"
                        >
                          Enable Email Notifications
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          id="worker-smsNotif"
                          type="checkbox"
                          checked={smsNotificationsEnabled}
                          onChange={(e) =>
                            setSmsNotificationsEnabled(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="worker-smsNotif"
                          className="cursor-pointer text-sm font-medium text-foreground"
                        >
                          Enable SMS Notifications
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={isSubmittingProfile}>
                      {isSubmittingProfile
                        ? "Saving Details..."
                        : "Save Profile Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ---- Change Password Tab ---- */}
          {activeTab === "security" && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h4 className="mb-4 flex items-center gap-2 text-md font-bold">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Change Account Password
                  </h4>

                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="worker-oldPassword"
                        className="text-sm font-medium"
                      >
                        Current Password *
                      </label>
                      <PasswordInput
                        id="worker-oldPassword"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="worker-newPassword"
                        className="text-sm font-medium"
                      >
                        New Password *
                      </label>
                      <PasswordInput
                        id="worker-newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="worker-confirmPassword"
                        className="text-sm font-medium"
                      >
                        Confirm New Password *
                      </label>
                      <PasswordInput
                        id="worker-confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={isSubmittingPassword}>
                      {isSubmittingPassword
                        ? "Updating Password..."
                        : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
