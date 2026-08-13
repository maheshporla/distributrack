import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/api/authService";
import { useAuthStore } from "@/store/authStore";
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schemas";
import { ROUTES } from "@/constants/routes.constants";
import type { ApiError } from "@/types/common.types";

/**
 * Encapsulates the Login form: validation, submission, session storage,
 * and navigation. `LoginPage` only needs to render inputs bound to
 * `form.register(...)` and call `onSubmit`.
 */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await authService.login(values);
      setSession(response.token);
      toast.success(response.message);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      // axiosInstance's response interceptor already normalizes every
      // rejection to ApiError — see services/api/axiosInstance.ts.
      const apiError = error as ApiError;
      toast.error(apiError.message);
      // Deliberately not calling form.reset() — the user should be able
      // to correct and resubmit without retyping everything.
    }
  });

  return { form, onSubmit, isSubmitting: form.formState.isSubmitting };
}
