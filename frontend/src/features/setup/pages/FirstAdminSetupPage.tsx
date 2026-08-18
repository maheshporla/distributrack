import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { useFirstAdminSetup } from "@/features/setup/hooks/useFirstAdminSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";

/**
 * /setup/first-admin
 *
 * One-time bootstrap for a fresh DistribuTrack installation. Creates the
 * very first SUPER_ADMIN — the role is fixed server-side and cannot be
 * changed from this form. The page redirects to /login when the system
 * is already initialized, and the backend rejects the request anyway
 * once any user exists.
 */
export function FirstAdminSetupPage() {
  const { form, onSubmit, isSubmitting, isCheckingStatus } = useFirstAdminSetup();
  const {
    register,
    formState: { errors },
  } = form;

  if (isCheckingStatus) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthCard
      title="Create the first administrator"
      description="Bootstrap your DistribuTrack system. This account gets the SUPER_ADMIN role and full access to every module."
      footer={
        <p className="text-sm text-muted-foreground">
          Already set up?{" "}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-md border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          This setup screen is only available while no administrator account exists.
          Once the first SUPER_ADMIN is created it is permanently closed —
          further admin/staff accounts are created from{" "}
          <span className="font-medium text-foreground">Administration → User Management</span>.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="System Administrator"
            invalid={!!errors.fullName}
            disabled={isSubmitting}
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@yourcompany.com"
            invalid={!!errors.email}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            invalid={!!errors.phone}
            disabled={isSubmitting}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create administrator
        </Button>
      </form>
    </AuthCard>
  );
}
