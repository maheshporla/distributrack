import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { authService } from "@/services/api/authService";
import { toast } from "sonner";
import type { ApiError } from "@/types/common.types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/schemas/auth.schemas";
import { CheckCircle, AlertTriangle } from "lucide-react";

/**
 * /reset-password
 *
 * Accepts a reset token from the OTP verification step (via navigation state).
 * Validates the token on submit and sets the new password.
 *
 * If no resetToken is in state, the user sees an invalid-link page and is
 * directed back to the forgot-password flow.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string } | null)
    ?.resetToken;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // No resetToken in state — invalid access
  if (!resetToken) {
    return (
      <AuthCard
        title="Invalid reset link"
        description="This password reset link is invalid or has expired."
        footer={
          <p className="text-sm text-muted-foreground">
            Need a new link?{" "}
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="font-medium text-primary hover:underline"
            >
              Request a new one
            </Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            No reset token found. Please complete the OTP verification flow
            first.
          </p>
        </div>
      </AuthCard>
    );
  }

  if (resetComplete) {
    return (
      <AuthCard
        title="Password reset successful"
        description="Your password has been updated."
        footer={
          <p className="text-sm text-muted-foreground">
            <Link
              to={ROUTES.LOGIN}
              className="font-medium text-primary hover:underline"
            >
              Sign in with your new password
            </Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            You can now sign in with your new password. Your old password is
            no longer valid.
          </p>
          <Button className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authService.resetPassword(resetToken, values.password);
      setResetComplete(true);
      toast.success("Password reset successfully");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError.message || "Reset failed. The token may have expired.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Set new password"
      description="Enter your new password below."
      footer={
        <p className="text-sm text-muted-foreground">
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none"
          >
            New Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Enter new password"
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
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Confirm new password"
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
          Reset password
        </Button>
      </form>
    </AuthCard>
  );
}
