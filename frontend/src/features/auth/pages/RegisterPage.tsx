import { Link } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { CheckCircle2, Truck } from "lucide-react";

/**
 * /register
 *
 * Allows registration as either Shopkeeper or Delivery Partner.
 * Delivery Partner registrations require admin approval before login.
 */
export function RegisterPage() {
  const {
    form,
    onSubmit,
    isSubmitting,
    registrationType,
    registrationSuccess,
    successMessage,
  } = useRegister();
  const {
    register,
    formState: { errors },
    setValue,
  } = form;

  // Show success page for delivery partner registration
  if (registrationSuccess) {
    return (
      <AuthCard
        title="Registration Submitted"
        description="Your delivery partner application has been received"
        footer={
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="font-medium text-primary hover:underline"
            >
              Login
            </Link>
          </p>
        }
      >
        <div className="flex flex-col items-center space-y-4 py-6 text-center">
          <div className="rounded-full bg-green-500/10 p-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Thank you for registering!
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {successMessage}
            </p>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">
            Once approved by an administrator, you will be able to log in and
            access the delivery portal to start accepting deliveries.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description="Set up your DistribuTrack account to get started"
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-primary hover:underline"
          >
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {/* Registration type selector */}
        <div className="space-y-2">
          <Label>Register as</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setValue("registrationType", "shopkeeper");
                setValue("role", "SHOPKEEPER");
              }}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                registrationType === "shopkeeper"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
              disabled={isSubmitting}
            >
              🏪 Shopkeeper
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("registrationType", "delivery_partner");
                setValue("role", "DELIVERY_BOY");
              }}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                registrationType === "delivery_partner"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
              disabled={isSubmitting}
            >
              <Truck className="h-4 w-4" />
              Delivery Partner
            </button>
          </div>
        </div>

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

        {/* Shopkeeper-specific fields */}
        {registrationType === "shopkeeper" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop / Business Name</Label>
              <Input
                id="shopName"
                type="text"
                placeholder="ABC General Store"
                invalid={!!(errors as any).shopName}
                disabled={isSubmitting}
                {...register("shopName")}
              />
              {(errors as any).shopName && (
                <p className="text-xs text-destructive">
                  {(errors as any).shopName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Shop Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="Shop number, street, city"
                invalid={!!(errors as any).address}
                disabled={isSubmitting}
                {...register("address")}
              />
              {(errors as any).address && (
                <p className="text-xs text-destructive">
                  {(errors as any).address.message}
                </p>
              )}
            </div>
          </>
        )}

        {/* Delivery Partner-specific fields */}
        {registrationType === "delivery_partner" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                placeholder="Hyderabad"
                invalid={!!(errors as any).city}
                disabled={isSubmitting}
                {...register("city")}
              />
              {(errors as any).city && (
                <p className="text-xs text-destructive">
                  {(errors as any).city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dp-address">Address</Label>
              <Input
                id="dp-address"
                type="text"
                placeholder="Your delivery area address"
                invalid={!!(errors as any).address}
                disabled={isSubmitting}
                {...register("address")}
              />
              {(errors as any).address && (
                <p className="text-xs text-destructive">
                  {(errors as any).address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type (optional)</Label>
                <Input
                  id="vehicleType"
                  type="text"
                  placeholder="Bike, Scooter..."
                  invalid={!!(errors as any).vehicleType}
                  disabled={isSubmitting}
                  {...register("vehicleType")}
                />
                {(errors as any).vehicleType && (
                  <p className="text-xs text-destructive">
                    {(errors as any).vehicleType.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number (optional)</Label>
                <Input
                  id="vehicleNumber"
                  type="text"
                  placeholder="TS 09 AB 1234"
                  invalid={!!(errors as any).vehicleNumber}
                  disabled={isSubmitting}
                  {...register("vehicleNumber")}
                />
                {(errors as any).vehicleNumber && (
                  <p className="text-xs text-destructive">
                    {(errors as any).vehicleNumber.message}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Your account will be reviewed by an administrator. You will be
              able to log in once approved.
            </p>
          </>
        )}

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
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
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
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {registrationType === "delivery_partner"
            ? "Submit Application"
            : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
