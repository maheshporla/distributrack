import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/api/authService";
import { useAuthStore } from "@/store/authStore";
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schemas";
import { defaultRouteForRole } from "@/lib/roleRoutes";
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
      setSession(response.accessToken);
      toast.success(response.message);

      // Land the user on the page matching their role — the dashboard is
      // business-role only (see lib/roleRoutes.ts).
      const nextUser = useAuthStore.getState().user;
      navigate(defaultRouteForRole(nextUser?.role), { replace: true });
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
