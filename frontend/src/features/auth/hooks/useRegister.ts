import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/api/authService";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/schemas/auth.schemas";
import { ROUTES } from "@/constants/routes.constants";
import type { RegisterPayload } from "@/types/auth.types";
import type { ApiError } from "@/types/common.types";

/**
 * Encapsulates the Register form: validation, submission, and
 * post-registration navigation.
 *
 * Supports both Shopkeeper and Delivery Partner registration.
 * - Shopkeeper: redirects to /login after successful registration.
 * - Delivery Partner: shows a pending-approval success message.
 */
export function useRegister() {
  const navigate = useNavigate();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      registrationType: "shopkeeper",
      fullName: "",
      email: "",
      phone: "",
      role: "SHOPKEEPER",
      shopName: "",
      address: "",
      city: "",
      vehicleType: "",
      vehicleNumber: "",
      password: "",
      confirmPassword: "",
    } as any,
  });

  const registrationType = form.watch("registrationType" as any);

  const onSubmit = form.handleSubmit(async (values) => {
    // confirmPassword exists only for client-side validation — strip it.
    const { confirmPassword: _confirmPassword, registrationType: _regType, ...rest } =
      values as any;
    const registerPayload: RegisterPayload = {
      ...rest,
      role: registrationType === "delivery_partner" ? "DELIVERY_BOY" : "SHOPKEEPER",
    };

    try {
      const response = await authService.register(registerPayload);

      if (registrationType === "delivery_partner") {
        // Show success message — no tokens returned, user cannot log in yet.
        setSuccessMessage(
          response.message ||
            "Registration submitted successfully. Your account is waiting for admin approval."
        );
        setRegistrationSuccess(true);
      } else {
        toast.success(response.message);
        navigate(ROUTES.LOGIN, { replace: true });
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message);
    }
  });

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    registrationType: registrationType as string,
    registrationSuccess,
    successMessage,
  };
}
