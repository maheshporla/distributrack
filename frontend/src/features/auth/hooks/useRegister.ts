import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/api/authService";
import { registerSchema, type RegisterFormValues } from "@/schemas/auth.schemas";
import { ROUTES } from "@/constants/routes.constants";
import type { RegisterPayload } from "@/types/auth.types";
import type { ApiError } from "@/types/common.types";

/**
 * Encapsulates the Register form: validation, submission, and
 * post-registration navigation.
 *
 * Registration does NOT return a token (see RegisterApiResponse in
 * auth.types.ts) — the backend only confirms the account was created.
 * This hook therefore never touches authStore; it sends the user to
 * /login to sign in with their new credentials.
 */
export function useRegister() {
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: undefined,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    // confirmPassword exists only for client-side validation (see
    // auth.schemas.ts) — the backend's RegisterRequest has no such field.
    const { confirmPassword: _confirmPassword, ...payload } = values;
    const registerPayload: RegisterPayload = payload;

    try {
      const response = await authService.register(registerPayload);
      toast.success(response.message);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      // axiosInstance's response interceptor already normalizes every
      // rejection to ApiError — see services/api/axiosInstance.ts.
      const apiError = error as ApiError;
      toast.error(apiError.message);
      // Deliberately not calling form.reset() — preserve everything the
      // user entered so they can fix one field and resubmit.
    }
  });

  return { form, onSubmit, isSubmitting: form.formState.isSubmitting };
}
