import { Link } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";

/**
 * /register
 *
 * Purely presentational: renders the form and wires it up to the state
 * and submit handler exposed by `useRegister()`. No API calls and no
 * navigation logic live in this file.
 */
export function RegisterPage() {
  const { form, onSubmit, isSubmitting } = useRegister();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <AuthCard
      title="Create your account"
      description="Set up your DistribuTrack account to get started"
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Jane Doe"
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
            placeholder="you@company.com"
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
          <Label htmlFor="shopName">Shop / Business Name</Label>
          <Input
            id="shopName"
            type="text"
            placeholder="ABC General Store"
            invalid={!!errors.shopName}
            disabled={isSubmitting}
            {...register("shopName")}
          />
          {errors.shopName && (
            <p className="text-xs text-destructive">{errors.shopName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Shop Address</Label>
          <Input
            id="address"
            type="text"
            placeholder="Shop number, street, city"
            invalid={!!errors.address}
            disabled={isSubmitting}
            {...register("address")}
          />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
            Shopkeeper
          </div>
          <p className="text-xs text-muted-foreground">
            Public registration creates a Shopkeeper account. Staff accounts
            (Owner, Manager, Salesman, Delivery Boy) are created by an
            administrator after login.
          </p>
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
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
