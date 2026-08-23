import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
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
  otpSchema,
  type OtpFormValues,
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/schemas/auth.schemas";
import { Mail, CheckCircle, AlertTriangle, MailCheck } from "lucide-react";

type Step = "email" | "otp" | "password" | "success";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * /forgot-password
 *
 * Three-step password reset flow:
 * 1. Enter email → OTP sent to registered phone via Twilio SMS
 * 2. Enter 6-digit OTP → verified server-side → reset token issued
 * 3. Set new password → password reset complete → redirect to login
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Resend cooldown
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OTP attempt feedback
  const [otpError, setOtpError] = useState("");

  // ---- Step 1: Email form ----
  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // ---- Step 2: OTP form ----
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  // ---- Step 3: New password form ----
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setCanResend(false);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ---- Step 1: Send OTP ----
  const onEmailSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const message = await authService.forgotPassword(values.email);
      setEmail(values.email);
      setStep("otp");
      setOtpError("");
      startCooldown();
      toast.success(message);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Step 2: Verify OTP ----
  const onOtpSubmit = async (values: OtpFormValues) => {
    setIsSubmitting(true);
    setOtpError("");
    try {
      const response = await authService.verifyResetOtp({
        email,
        otp: values.otp,
      });
      setResetToken(response.resetToken);
      toast.success(response.message);
      setStep("password");
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError.message || "Invalid OTP. Please try again.";
      setOtpError(errorMessage);
      toast.error(errorMessage);
      otpForm.resetField("otp");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Resend OTP ----
  const handleResendOtp = async () => {
    setIsSubmitting(true);
    setOtpError("");
    try {
      const message = await authService.forgotPassword(email);
      startCooldown();
      otpForm.reset();
      toast.success(message);
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError.message || "Failed to resend OTP. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Step 3: Reset password ----
  const onPasswordSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authService.resetPassword(resetToken, values.password);
      setStep("success");
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

  // ---- Render: Success ----
  if (step === "success") {
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
            Your password has been changed successfully. Your old password is
            no longer valid.
          </p>
          <Button className="w-full" onClick={() => navigate(ROUTES.LOGIN)}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  // ---- Render: Set New Password ----
  if (step === "password") {
    return (
      <AuthCard
        title="Create new password"
        description="Enter your new password below."
        footer={
          <p className="text-sm text-muted-foreground">
            <button
              onClick={() => {
                setStep("email");
                setResetToken("");
                setEmail("");
                passwordForm.reset();
              }}
              className="font-medium text-primary hover:underline"
            >
              Start over
            </button>
          </p>
        }
      >
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              placeholder="Enter new password"
              invalid={!!passwordForm.formState.errors.password}
              disabled={isSubmitting}
              {...passwordForm.register("password")}
            />
            {passwordForm.formState.errors.password && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm new password"
              invalid={!!passwordForm.formState.errors.confirmPassword}
              disabled={isSubmitting}
              {...passwordForm.register("confirmPassword")}
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.confirmPassword.message}
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

  // ---- Render: Verify OTP ----
  if (step === "otp") {
    return (
      <AuthCard
        title="Verify OTP"
        description="Enter the 6-digit OTP sent to your registered email address."
        footer={
          <p className="text-sm text-muted-foreground">
            <button
              onClick={() => {
                setStep("email");
                setEmail("");
                setCooldown(0);
                setCanResend(true);
                if (cooldownTimerRef.current)
                  clearInterval(cooldownTimerRef.current);
                otpForm.reset();
              }}
              className="font-medium text-primary hover:underline"
            >
              Use a different email
            </button>
          </p>
        }
      >
        <div className="space-y-4">
          {/* Masked email info */}
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <MailCheck className="h-4 w-4 shrink-0" />
            <span>OTP sent to <strong className="text-foreground">{email}</strong></span>
          </div>

          {/* OTP Error */}
          {otpError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          <form
            onSubmit={otpForm.handleSubmit(onOtpSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="otp">6-digit OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                invalid={!!otpForm.formState.errors.otp}
                disabled={isSubmitting}
                {...otpForm.register("otp")}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-destructive">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Verify OTP
            </Button>
          </form>

          {/* Resend OTP */}
          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Resend OTP in {cooldown}s
              </p>
            )}
          </div>
        </div>
      </AuthCard>
    );
  }

  // ---- Render: Email Entry (default) ----
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your registered email address and we'll send you a verification code."
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
      <form
        onSubmit={emailForm.handleSubmit(onEmailSubmit)}
        noValidate
        className="space-y-4"
      >
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
              invalid={!!emailForm.formState.errors.email}
              disabled={isSubmitting}
              {...emailForm.register("email")}
            />
          </div>
          {emailForm.formState.errors.email && (
            <p className="text-xs text-destructive">
              {emailForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Send OTP
        </Button>
      </form>
    </AuthCard>
  );
}
