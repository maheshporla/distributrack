import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Lock, Shield, Calendar, KeyRound, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";

import { authService } from "@/services/api/authService";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/features/auth/hooks/useLogout";
import type { UserProfile } from "@/types/auth.types";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security";

export function SettingsPage() {
  const logout = useLogout();
  const updateStoreUser = useAuthStore((state) => state.updateUser);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Password Form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Load User Details
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getMe();
      setProfile(data);
      setFullName(data.fullName);
      setPhone(data.phone);
      setEmailNotificationsEnabled(data.emailNotificationsEnabled ?? true);
      setSmsNotificationsEnabled(data.smsNotificationsEnabled ?? true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load user profile information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Update profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("All fields are required.");
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
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Change password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required.");
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
      await authService.changePassword({
        oldPassword,
        newPassword,
      });
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to change password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "profile", label: "Profile & Account", icon: User },
    { id: "security", label: "Change Password", icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account profile, credentials, and settings."
      />

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading account settings...</p>
        </div>
      ) : !profile ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load profile details.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Profile Card */}
          <div className="space-y-6 md:col-span-1">
            <div className="rounded-lg border bg-card p-6 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{profile.fullName}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="capitalize">
                  Role: {profile.role.replace("_", " ").toLowerCase()}
                </Badge>
                <Badge variant={profile.enabled ? "success" : "secondary"}>
                  {profile.enabled ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="w-full mt-6 border-t pt-4 space-y-3 text-left text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>User ID</span>
                  </div>
                  <span className="font-mono text-foreground">#{profile.id}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Member Since</span>
                  </div>
                  <span className="text-foreground">{formatDate(profile.createdAt)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Right Column: Content Tabs & Forms */}
          <div className="space-y-6 md:col-span-2">
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
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="rounded-lg border bg-card p-6">
              {/* Profile Details Update */}
              {activeTab === "profile" && (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <h4 className="text-md font-bold mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Edit Profile Details
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="settings-fullName" className="text-sm font-medium">
                        Full Name *
                      </label>
                      <Input
                        id="settings-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="settings-phone" className="text-sm font-medium">
                        Phone Number *
                      </label>
                      <Input
                        id="settings-phone"
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed directly for account security purposes.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Account Role (Read-only)
                      </label>
                      <Input
                        value={profile.role}
                        disabled
                        className="bg-muted text-muted-foreground capitalize"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your role determines your system clearance level.
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Notification Preferences
                    </h5>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          id="settings-emailNotif"
                          type="checkbox"
                          checked={emailNotificationsEnabled}
                          onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="settings-emailNotif" className="text-sm font-medium text-foreground cursor-pointer">
                          Enable Email Notifications
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          id="settings-smsNotif"
                          type="checkbox"
                          checked={smsNotificationsEnabled}
                          onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="settings-smsNotif" className="text-sm font-medium text-foreground cursor-pointer">
                          Enable SMS Notifications
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={isSubmittingProfile}>
                      {isSubmittingProfile ? "Saving Details..." : "Save Profile Details"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Password Change */}
              {activeTab === "security" && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h4 className="text-md font-bold mb-4 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Change Account Password
                  </h4>

                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label htmlFor="settings-oldPassword" className="text-sm font-medium">
                        Current Password *
                      </label>
                      <Input
                        id="settings-oldPassword"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="settings-newPassword" className="text-sm font-medium">
                        New Password *
                      </label>
                      <Input
                        id="settings-newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="settings-confirmPassword" className="text-sm font-medium">
                        Confirm New Password *
                      </label>
                      <Input
                        id="settings-confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={isSubmittingPassword}>
                      {isSubmittingPassword ? "Updating Password..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
