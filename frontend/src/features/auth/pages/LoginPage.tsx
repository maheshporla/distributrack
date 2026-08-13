import { Link } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";

/**
 * /login
 *
 * Purely presentational: renders the form and wires it up to the state
 * and submit handler exposed by `useLogin()`. No API calls, no session
 * handling, and no navigation logic live in this file.
 */
export function LoginPage() {
  const { form, onSubmit, isSubmitting } = useLogin();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your DistribuTrack account"
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
