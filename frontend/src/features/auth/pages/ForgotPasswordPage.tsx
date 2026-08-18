import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { authService } from "@/services/api/authService";
import { toast } from "sonner";
import type { ApiError } from "@/types/common.types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/schemas/auth.schemas";
import { Mail, CheckCircle } from "lucide-react";

/**
 * /forgot-password
 *
 * Lets a user request a password-reset email. After submission, always
 * shows the same success message regardless of whether the email exists
 * — prevents user enumeration.
 */
export function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const message = await authService.forgotPassword(values.email);
      setSentEmail(values.email);
      setEmailSent(true);
      toast.success(message);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <AuthCard
        title="Check your email"
        description={`We've sent a password reset link to ${sentEmail}`}
        footer={
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email?{" "}
            <button
              onClick={() => {
                setEmailSent(false);
                setSentEmail("");
              }}
              className="font-medium text-primary hover:underline"
            >
              Try again
            </button>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              If an account with that email exists, we&apos;ve sent a link to
              reset your password. The link expires in 15 minutes.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your inbox (and spam folder) for an email from DistribuTrack.
            </p>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email address and we'll send you a link to reset your password."
      footer={
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className="pl-10"
              invalid={!!errors.email}
              disabled={isSubmitting}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
